'use strict'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test'
process.env.REDIS_URL ||= 'redis://localhost:6379'
process.env.JWT_SECRET ||= 'test-secret-with-enough-length-for-jwt'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-enough-length'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  awardPointsForDeliveredOrder,
  reversePoints,
  refundPoints,
  adjustPoints,
} = require('../src/services/points')

class FakePointsClient {
  constructor() {
    this.users = new Map()
    this.orders = new Map()
    this.redemptions = new Map()
    this.settings = { points_per_100_taka: 10, min_order_amount: 0 }
    this.tiers = []
    this.transactions = []
    this.claims = []
  }

  async query(sql, params = []) {
    const compact = sql.replace(/\s+/g, ' ').trim()

    if (compact.startsWith('SELECT points_per_100_taka')) return { rows: [this.settings] }

    if (compact.startsWith('SELECT id, order_ref, status, user_id, total, points_earned FROM orders')) {
      const order = this.orders.get(params[0])
      return { rows: order ? [{ ...order }] : [] }
    }

    if (compact.startsWith('UPDATE users') && compact.includes('points_balance  = points_balance  +')) {
      const user = this.users.get(params[0])
      user.points_balance += params[1]
      const previous = user.points_lifetime
      user.points_lifetime += params[1]
      return { rows: [{ points_balance: user.points_balance, previous_lifetime: previous, new_lifetime: user.points_lifetime }] }
    }

    if (compact.startsWith('UPDATE users') && compact.includes('points_balance = points_balance +') && !compact.includes('points_lifetime')) {
      const user = this.users.get(params[0])
      user.points_balance += params[1]
      return { rows: [{ points_balance: user.points_balance }] }
    }

    if (compact.startsWith('UPDATE users') && compact.includes('points_balance = points_balance +') && compact.includes('points_lifetime = points_lifetime +')) {
      const user = this.users.get(params[0])
      if (!user) return { rows: [] }
      user.points_balance += params[1]
      const previous = user.points_lifetime
      user.points_lifetime += params[1]
      return { rows: [{ points_balance: user.points_balance, previous_lifetime: previous, new_lifetime: user.points_lifetime }] }
    }

    if (compact.startsWith('SELECT points_balance FROM users WHERE id =')) {
      const user = this.users.get(params[0])
      return { rows: user ? [{ points_balance: user.points_balance }] : [] }
    }

    if (compact.startsWith('UPDATE users') && compact.includes('GREATEST(0, points_balance -')) {
      const user = this.users.get(params[0])
      if (!user) return { rows: [] }
      user.points_balance = Math.max(0, user.points_balance - params[1])
      return { rows: [{ points_balance: user.points_balance, points_lifetime: user.points_lifetime }] }
    }

    if (compact.startsWith('INSERT INTO points_transactions')) {
      const metadataParam = compact.includes('metadata') ? params.at(-1) : null
      this.transactions.push({
        user_id: params[0],
        points: params[1],
        balance_after: params[2],
        description: params[3],
        reference_id: params[4],
        reference_type: compact.includes("'order'") ? 'order' : compact.includes("'redemption'") ? 'redemption' : 'admin_adjustment',
        metadata: metadataParam ? JSON.parse(metadataParam) : {},
        type: compact.includes("'earned'") ? 'earned' : compact.includes("'reversed'") ? 'reversed' : compact.includes("'spent'") ? 'spent' : 'bonus',
      })
      return { rows: [] }
    }

    if (compact.startsWith('UPDATE orders SET points_earned')) {
      const order = this.orders.get(params[0])
      order.points_earned = params[1]
      return { rows: [] }
    }

    if (compact.startsWith('SELECT points_lifetime, current_tier_id FROM users')) {
      const user = this.users.get(params[0])
      return { rows: user ? [{ points_lifetime: user.points_lifetime, current_tier_id: user.current_tier_id || null }] : [] }
    }

    if (compact.startsWith('SELECT lt.*, p.name AS product_name')) {
      return { rows: this.tiers.map(t => ({ ...t })) }
    }

    if (compact.startsWith('UPDATE users SET current_tier_id')) {
      const user = this.users.get(params[1])
      user.current_tier_id = params[0]
      return { rows: [] }
    }

    if (compact.startsWith('INSERT INTO tier_reward_claims')) {
      if (!this.claims.some(c => c.user_id === params[0] && c.tier_id === params[1] && !['cancelled', 'expired'].includes(c.status))) {
        this.claims.push({ user_id: params[0], tier_id: params[1], status: 'pending' })
      }
      return { rows: [] }
    }

    if (compact.startsWith("UPDATE point_redemptions SET status = 'cancelled'")) {
      const redemption = this.redemptions.get(params[0])
      redemption.status = 'cancelled'
      return { rows: [] }
    }

    throw new Error(`Unhandled query: ${compact}`)
  }
}

test('delivered order points are awarded once and min order amount is enforced', async () => {
  const client = new FakePointsClient()
  client.settings = { points_per_100_taka: 10, min_order_amount: 100 }
  client.users.set('user-1', { points_balance: 0, points_lifetime: 0 })
  client.orders.set('order-1', { id: 'order-1', order_ref: 'MP1', status: 'delivered', user_id: 'user-1', total: 100, points_earned: 0 })

  const first = await awardPointsForDeliveredOrder(client, 'order-1')
  const second = await awardPointsForDeliveredOrder(client, 'order-1')

  assert.equal(first.awarded, 10)
  assert.equal(second.awarded, 0)
  assert.equal(client.users.get('user-1').points_balance, 10)
  assert.equal(client.users.get('user-1').points_lifetime, 10)
  assert.equal(client.transactions.filter(tx => tx.type === 'earned').length, 1)

  client.orders.set('order-2', { id: 'order-2', order_ref: 'MP2', status: 'delivered', user_id: 'user-1', total: 80, points_earned: 0 })
  const belowMin = await awardPointsForDeliveredOrder(client, 'order-2')
  assert.equal(belowMin.awarded, 0)
  assert.equal(client.orders.get('order-2').points_earned, 0)
  assert.equal(client.transactions.filter(tx => tx.reference_id === 'order-2').length, 0)
})

test('reversal clamps balance at zero and records shortfall metadata', async () => {
  const client = new FakePointsClient()
  client.users.set('user-1', { points_balance: 20, points_lifetime: 100 })

  const result = await reversePoints(client, 'user-1', 100, 'Order cancelled', 'order-1')

  assert.equal(client.users.get('user-1').points_balance, 0)
  assert.equal(client.users.get('user-1').points_lifetime, 100)
  assert.equal(result.shortfallAmount, 80)
  assert.equal(client.transactions.at(-1).metadata.shortfall_amount, 80)
})

test('redemption refund restores balance without increasing lifetime and cancels redemption', async () => {
  const client = new FakePointsClient()
  client.users.set('user-1', { points_balance: 20, points_lifetime: 100 })
  client.redemptions.set('redemption-1', { id: 'redemption-1', status: 'pending' })

  await refundPoints(client, 'user-1', 'redemption-1', 80)

  assert.equal(client.users.get('user-1').points_balance, 100)
  assert.equal(client.users.get('user-1').points_lifetime, 100)
  assert.equal(client.redemptions.get('redemption-1').status, 'cancelled')
  assert.equal(client.transactions.at(-1).type, 'bonus')
  assert.match(client.transactions.at(-1).description, /Refund: cancelled redemption/)
})

test('tier claims are created only for newly crossed thresholds', async () => {
  const client = new FakePointsClient()
  client.settings = { points_per_100_taka: 100, min_order_amount: 0 }
  client.users.set('user-1', { points_balance: 0, points_lifetime: 95 })
  client.tiers = [
    { id: 'tier-1', min_lifetime_pts: 0, reward_product_id: null },
    { id: 'tier-2', min_lifetime_pts: 100, reward_product_id: 'product-1', reward_variant_id: null, product_name: 'Reward' },
  ]
  client.orders.set('order-1', { id: 'order-1', order_ref: 'MP1', status: 'delivered', user_id: 'user-1', total: 20, points_earned: 0 })
  client.orders.set('order-2', { id: 'order-2', order_ref: 'MP2', status: 'delivered', user_id: 'user-1', total: 20, points_earned: 0 })

  await awardPointsForDeliveredOrder(client, 'order-1')
  await awardPointsForDeliveredOrder(client, 'order-2')

  assert.equal(client.users.get('user-1').points_lifetime, 135)
  assert.equal(client.claims.filter(c => c.tier_id === 'tier-2').length, 1)
})

test('manual admin adjustments update lifetime only for positive awards', async () => {
  const client = new FakePointsClient()
  client.users.set('user-1', { points_balance: 10, points_lifetime: 10 })

  await adjustPoints(client, 'user-1', 25, 'goodwill', 'admin-1')
  assert.equal(client.users.get('user-1').points_balance, 35)
  assert.equal(client.users.get('user-1').points_lifetime, 35)

  const deducted = await adjustPoints(client, 'user-1', -50, 'correction', 'admin-1')
  assert.equal(client.users.get('user-1').points_balance, 0)
  assert.equal(client.users.get('user-1').points_lifetime, 35)
  assert.equal(deducted.shortfallAmount, 15)
  assert.equal(client.transactions.at(-1).type, 'bonus')
  assert.equal(client.transactions.at(-1).metadata.shortfall_amount, 15)
})

test('guest order migration links orders without awarding points retroactively', async () => {
  const dbPath = require.resolve('../src/config/db')
  const usersPath = require.resolve('../src/services/users')
  const previousDb = require.cache[dbPath]
  delete require.cache[usersPath]

  const calls = []
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      query: async () => ({ rows: [] }),
      withTransaction: async (fn) => fn({
        query: async (sql, params = []) => {
          calls.push(sql)
          const compact = sql.replace(/\s+/g, ' ').trim()
          if (compact.startsWith('SELECT id, phone')) return { rows: [] }
          if (compact.startsWith('SELECT customer_name')) return { rows: [{ customer_name: 'Guest' }] }
          if (compact.startsWith('INSERT INTO users')) return { rows: [{ id: 'user-1', phone: params[0], name: params[1], role: 'user', points_balance: 0, is_active: true }] }
          if (compact.startsWith('UPDATE orders SET user_id')) return { rows: [] }
          throw new Error(`Unhandled query: ${compact}`)
        },
      }),
    },
  }

  try {
    const { findOrCreateUser } = require('../src/services/users')
    await findOrCreateUser('01700000000')
  } finally {
    delete require.cache[usersPath]
    if (previousDb) require.cache[dbPath] = previousDb
    else delete require.cache[dbPath]
  }

  assert.equal(calls.some(sql => /points_transactions|points_earned\s*=/.test(sql)), false)
})
