'use strict'

process.env.NODE_ENV = 'test'

const test = require('node:test')
const assert = require('node:assert/strict')
const { getFinancialSummary } = require('../src/services/financials')

function inMonth(iso, monthStart) {
  const start = new Date(`${monthStart}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)
  const value = new Date(iso)
  return value >= start && value < end
}

test('delivered-only financial revenue is counted by delivered month, not order-created month', async () => {
  const orders = [
    {
      total: 1200,
      discount_amount: 100,
      status: 'delivered',
      created_at: '2026-01-30T10:00:00.000Z',
      delivered_at: '2026-02-03T12:00:00.000Z',
    },
  ]

  async function fakeQuery(sql, params = []) {
    const monthStart = params[0]
    const compact = sql.replace(/\s+/g, ' ')

    if (compact.includes('status !=') && compact.includes('created_at')) {
      const matching = orders.filter(o => o.status !== 'cancelled' && inMonth(o.created_at, monthStart))
      return { rows: [{ revenue: matching.reduce((s, o) => s + o.total, 0), discounts: matching.reduce((s, o) => s + o.discount_amount, 0) }] }
    }

    if (compact.includes('revenue_delivered') && compact.includes('delivered_at')) {
      const matching = orders.filter(o => o.status === 'delivered' && inMonth(o.delivered_at, monthStart))
      return { rows: [{ revenue_delivered: matching.reduce((s, o) => s + o.total, 0) }] }
    }

    if (compact.includes('influencer_commission') && compact.includes('delivered_at')) {
      return { rows: [{ influencer_commission: 0, crew_commission: 0 }] }
    }

    if (compact.includes('points_spent')) return { rows: [{ points_spent: 0 }] }
    if (compact.includes('point_redemption_value')) return { rows: [{ point_redemption_value: 0.5 }] }
    if (compact.includes('pending_redemption_points')) {
      return { rows: [{ influencer_unpaid: 0, crew_unpaid: 0, pending_redemption_points: 0 }] }
    }

    throw new Error(`Unhandled query: ${compact}`)
  }

  const january = await getFinancialSummary(fakeQuery, '2026-01', new Date('2026-02-10T00:00:00.000Z'))
  const february = await getFinancialSummary(fakeQuery, '2026-02', new Date('2026-02-10T00:00:00.000Z'))

  assert.equal(january.revenue, 1200)
  assert.equal(january.revenue_delivered, 0)
  assert.equal(february.revenue, 0)
  assert.equal(february.revenue_delivered, 1200)
})
