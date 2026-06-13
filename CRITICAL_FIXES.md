# Critical Fixes — Code Patches Required

## Fix #1: Point Redemption Race Condition (2.1)

**File:** `backend/src/routes/users.js` lines 195-226

**Change:** Move reward validation inside transaction

**Before:**
```javascript
app.post('/points/redeem', {
  schema: { /* ... */ },
}, async (req, reply) => {
  const result = await withTransaction(async (client) => {
    const { rows: rewardRows } = await client.query(
      `SELECT id, label, pts_cost, worth FROM point_rewards WHERE id = $1 AND is_active = true`,
      [req.body.reward_id]
    )
    if (!rewardRows.length) throw { code: 'NOT_FOUND', message: 'Reward not found.' }
    // ... rest
  })
})
```

**After:**
```javascript
app.post('/points/redeem', {
  schema: { /* ... */ },
}, async (req, reply) => {
  const result = await withTransaction(async (client) => {
    // Move SELECT inside transaction with FOR UPDATE to prevent changes during processing
    const { rows: rewardRows } = await client.query(
      `SELECT id, label, pts_cost, worth FROM point_rewards 
       WHERE id = $1 AND is_active = true 
       FOR UPDATE`,  // ← Add this lock
      [req.body.reward_id]
    )
    if (!rewardRows.length) throw { code: 'NOT_FOUND', message: 'Reward not found.' }
    const reward = rewardRows[0]

    const { rows: redRows } = await client.query(
      `INSERT INTO point_redemptions (user_id, reward_id, reward_label, pts_cost, worth)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, reward_label, pts_cost, worth, status, created_at`,
      [req.user.sub, reward.id, reward.label, reward.pts_cost, reward.worth]
    )
    const redemption = redRows[0]
    const balance = await spendPoints(
      client, req.user.sub, reward.pts_cost, `Redeemed: ${reward.label}`, redemption.id
    )
    return { balance, redemption }
  })
  return reply.code(201).send({ ok: true, data: result })
})
```

---

## Fix #2: Coupon Per-Phone Usage Race Condition (2.6)

**File:** `backend/src/services/crew.js` — recordCouponUsage function

**Change:** Use atomic INSERT with constraint check

**Before:**
```javascript
async function recordCouponUsage(client, { coupon, orderId, userId, customerPhone, discountAmount, orderTotal }) {
  // Check count
  const { rows: usageRows } = await client.query(
    `SELECT COUNT(*) as cnt FROM coupon_usages 
     WHERE coupon_id = $1 AND customer_phone = $2`,
    [coupon.id, customerPhone]
  )
  if (usageRows[0].cnt >= coupon.max_usage_per_phone) {
    throw { code: 'USAGE_LIMIT_REACHED', message: 'This coupon has reached its per-phone limit.' }
  }
  
  // Insert and increment
  await client.query(
    `INSERT INTO coupon_usages (coupon_id, coupon_code, order_id, user_id, customer_phone, discount_amount, order_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [coupon.id, coupon.code, orderId, userId, customerPhone, discountAmount, orderTotal]
  )
  
  await client.query(
    `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`,
    [coupon.id]
  )
}
```

**After:**
```javascript
async function recordCouponUsage(client, { coupon, orderId, userId, customerPhone, discountAmount, orderTotal }) {
  // Use SELECT FOR UPDATE to lock the coupon row during usage check
  const { rows: couponRows } = await client.query(
    `SELECT max_usage_per_phone, used_count, max_uses 
     FROM coupons 
     WHERE id = $1 
     FOR UPDATE`,  // ← Lock coupon row
    [coupon.id]
  )
  
  if (!couponRows.length) {
    throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
  }
  
  const currentCoupon = couponRows[0]
  
  // Check max uses
  if (currentCoupon.max_uses && currentCoupon.used_count >= currentCoupon.max_uses) {
    throw { code: 'COUPON_MAXED', message: 'This coupon has reached its usage limit.' }
  }
  
  // Check per-phone limit if phone is provided
  if (customerPhone && currentCoupon.max_usage_per_phone) {
    const { rows: phoneUsageRows } = await client.query(
      `SELECT COUNT(*) as cnt FROM coupon_usages 
       WHERE coupon_id = $1 AND customer_phone = $2`,
      [coupon.id, customerPhone]
    )
    if (phoneUsageRows[0].cnt >= currentCoupon.max_usage_per_phone) {
      throw { code: 'USAGE_LIMIT_REACHED', message: 'This coupon has reached its per-phone limit.' }
    }
  }
  
  // Now insert (protected by FOR UPDATE lock on coupon)
  await client.query(
    `INSERT INTO coupon_usages (coupon_id, coupon_code, order_id, user_id, customer_phone, discount_amount, order_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [coupon.id, coupon.code, orderId, userId, customerPhone, discountAmount, orderTotal]
  )
  
  // Atomically increment and verify we haven't exceeded max
  const { rows: updateRows } = await client.query(
    `UPDATE coupons 
     SET used_count = used_count + 1 
     WHERE id = $1 
     RETURNING used_count, max_uses`,
    [coupon.id]
  )
  
  if (updateRows[0].max_uses && updateRows[0].used_count > updateRows[0].max_uses) {
    throw { code: 'COUPON_MAXED', message: 'Coupon usage limit exceeded during processing.' }
  }
}
```

---

## Fix #3: Phone Number Normalization (2.7)

**File:** `backend/src/routes/admin.js` lines 308, 437-438

**Change:** Reject invalid phone numbers instead of falling back

**Before:**
```javascript
// Line 308 in GET /admin/coupons/validate
let customerPhone = null
if (phone) { 
  try { customerPhone = normalizeBdMobile(phone) } 
  catch { customerPhone = phone }  // ← Falls back to raw value
}

// Line 437-438 in POST /admin/orders
let couponPhone = customer_phone || null
if (couponPhone) { 
  try { couponPhone = normalizeBdMobile(couponPhone) } 
  catch { /* keep raw */ }  // ← Same fallback
}
```

**After:**
```javascript
// Line 308 in GET /admin/coupons/validate
let customerPhone = null
if (phone) { 
  try { 
    customerPhone = normalizeBdMobile(phone)
  } catch (e) { 
    throw { code: 'INVALID_PHONE', message: 'Phone number format is invalid.' }  // ← Reject instead
  }
}

// Line 437-438 in POST /admin/orders
let couponPhone = customer_phone || null
if (couponPhone) { 
  try { 
    couponPhone = normalizeBdMobile(couponPhone)
  } catch (e) { 
    throw { code: 'INVALID_PHONE', message: 'Phone number format is invalid.' }  // ← Reject instead
  }
}
```

---

## Fix #4: Commission Calculation Precision (2.3)

**File:** `backend/src/routes/admin.js` line 287 and related commission calculations

**Change:** Use proper decimal arithmetic

**Option A: Using Decimal.js library** (Recommended)

First, install:
```bash
npm install decimal.js
```

**Before:**
```javascript
const commission = Math.round(o.total * i.comm_rate / 100)
```

**After:**
```javascript
const Decimal = require('decimal.js')
const commission = new Decimal(o.total)
  .times(i.comm_rate)
  .dividedBy(100)
  .toDecimalPlaces(2)
  .toNumber()
```

**Option B: Using integer arithmetic (no library)**

Convert to smallest unit (paise = 1/100 taka):
```javascript
const commission = Math.round(order.total * 100 * comm_rate / 100 / 100)
// Simplifies to: Math.round(order.total * comm_rate) / 100
```

---

## Fix #5: Subscriptions Missing Pagination (4.4)

**File:** `backend/src/routes/admin.js` lines 206-235 (GET /admin/subscriptions)

**Before:**
```javascript
app.get('/subscriptions', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'paused', 'cancelled'] },
      },
    },
  },
}, async (req) => {
  const { status } = req.query
  const params = []
  const where  = status
    ? (params.push(status), `WHERE s.status = $1`)
    : `WHERE s.status != 'cancelled'`

  const { rows } = await query(
    `SELECT s.id, s.product_name, s.qty, s.unit_price, s.address,
            s.billing_day, s.status, s.pause_until, s.next_delivery_date,
            s.created_at, s.updated_at,
            u.name AS user_name, u.phone AS user_phone, u.email AS user_email
     FROM   subscriptions s
     JOIN   users u ON u.id = s.user_id
     ${where}
     ORDER  BY s.next_delivery_date ASC`,
    params
  )
  return { ok: true, data: { subscriptions: rows } }
})
```

**After:**
```javascript
app.get('/subscriptions', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'paused', 'cancelled'] },
        page:   { type: 'integer', minimum: 1, default: 1 },
        limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  },
}, async (req) => {
  const { status, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit
  const params = []
  const where  = status
    ? (params.push(status), `WHERE s.status = $1`)
    : `WHERE s.status != 'cancelled'`

  // Get total count
  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM subscriptions s ${where}`,
    params
  )
  const total = parseInt(countRows[0].count, 10)

  // Get paginated results
  const dataParams = [...params, limit, offset]
  const { rows } = await query(
    `SELECT s.id, s.product_name, s.qty, s.unit_price, s.address,
            s.billing_day, s.status, s.pause_until, s.next_delivery_date,
            s.created_at, s.updated_at,
            u.name AS user_name, u.phone AS user_phone, u.email AS user_email
     FROM   subscriptions s
     JOIN   users u ON u.id = s.user_id
     ${where}
     ORDER  BY s.next_delivery_date ASC
     LIMIT  $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  )
  return { ok: true, data: { subscriptions: rows, total, page, limit } }
})
```

---

## Fix #6: Commission Query Include Crew (3.3)

**File:** `backend/src/routes/admin.js` lines 251-269 (GET /admin/financials)

**Before:**
```javascript
const [ordersRes, commRes, pointsRes] = await Promise.all([
  // Orders
  query(`SELECT COALESCE(SUM(total), 0) AS revenue, ... FROM orders WHERE status != 'cancelled' ...`),
  // ONLY Influencer commission
  query(
    `SELECT COALESCE(SUM(ROUND(o.total * i.comm_rate / 100)), 0) AS commission
     FROM orders o
     JOIN coupons c ON c.code = o.coupon_code AND c.type = 'influencer'
     JOIN influencers i ON i.code = c.code
     WHERE o.status = 'delivered' ...`
  ),
  // Points
  query(`SELECT COALESCE(SUM(pts_cost), 0) AS points_spent FROM point_redemptions ...`),
])
```

**After:**
```javascript
const [ordersRes, commRes, pointsRes] = await Promise.all([
  // Orders
  query(`SELECT COALESCE(SUM(total), 0) AS revenue, ... FROM orders WHERE status != 'cancelled' ...`),
  // Influencer + Crew commission
  query(
    `SELECT 
       COALESCE(SUM(ROUND(o.total * i.comm_rate / 100)), 0) AS influencer_commission,
       COALESCE(SUM(cc.commission_amount), 0) AS crew_commission
     FROM orders o
     LEFT JOIN coupons ic ON ic.code = o.coupon_code AND ic.type = 'influencer'
     LEFT JOIN influencers i ON i.code = ic.code
     LEFT JOIN crew_commissions cc ON cc.order_id = o.id AND cc.status != 'reversed'
     WHERE o.status = 'delivered'
       AND o.created_at >= $1::date
       AND o.created_at < $1::date + INTERVAL '1 month'`,
    [monthStart]
  ),
  // Points
  query(`SELECT COALESCE(SUM(pts_cost), 0) AS points_spent FROM point_redemptions ...`),
])

// Update return value
return {
  ok: true,
  data: {
    revenue: parseInt(ordersRes.rows[0].revenue),
    discounts: parseInt(ordersRes.rows[0].discounts),
    commission: parseInt(commRes.rows[0].influencer_commission),
    crew_commission: parseFloat(commRes.rows[0].crew_commission),  // ← Add this
    points_redeemed_taka: Math.round(parseInt(pointsRes.rows[0].points_spent) * 2),
  },
}
```

---

## Implementation Priority

1. **Week 1 (Immediate):**
   - Fix #1: Point Redemption Race Condition
   - Fix #3: Phone Normalization
   - Migration: 022_performance_hardening.sql

2. **Week 2:**
   - Fix #2: Coupon Per-Phone Race Condition
   - Fix #5: Subscriptions Pagination
   - Fix #6: Commission Query

3. **Week 3:**
   - Fix #4: Commission Calculation Precision
   - Test all changes thoroughly
   - Deploy to production

---

## Testing Checklist

- [ ] Point redemption: Two concurrent redemptions of same reward by same user fail correctly
- [ ] Coupon per-phone: Two concurrent orders with same phone + limited coupon enforce limit
- [ ] Phone validation: Invalid phone formats are rejected with clear error
- [ ] Subscriptions: Pagination works correctly, doesn't timeout on large datasets
- [ ] Commission: Calculations are precise to 2 decimal places
- [ ] Indexes: Query performance improves by 50%+ on large tables
