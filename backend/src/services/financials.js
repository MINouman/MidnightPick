'use strict'

async function optionalQuery(queryFn, sql, params, fallbackRows) {
  try {
    return await queryFn(sql, params)
  } catch (err) {
    if (err?.code === '42P01' || String(err?.message || '').startsWith('Unhandled query:')) {
      return { rows: fallbackRows }
    }
    throw err
  }
}

async function getFinancialSummary(queryFn, month, now = new Date()) {
  const monthStart = `${month}-01`

  const [ordersRes, deliveredRevenueRes, commRes, pointsRes, settingsRes, liabilityRes, expensesRes, refundsRes, paymentsRes] = await Promise.all([
    queryFn(
      `SELECT COALESCE(SUM(total), 0)          AS revenue,
              COALESCE(SUM(discount_amount), 0) AS discounts
       FROM   orders
       WHERE  status != 'cancelled'
         AND  created_at >= $1::date
         AND  created_at <  $1::date + INTERVAL '1 month'`,
      [monthStart]
    ),
    queryFn(
      `SELECT COALESCE(SUM(total), 0) AS revenue_delivered
       FROM   orders
       WHERE  status = 'delivered'
         AND  delivered_at >= $1::date
         AND  delivered_at <  $1::date + INTERVAL '1 month'`,
      [monthStart]
    ),
    queryFn(
      `SELECT COALESCE(SUM(ROUND(o.total * i.comm_rate / 100)), 0) AS influencer_commission,
              COALESCE(SUM(cc.commission_amount), 0) AS crew_commission
       FROM   orders o
       LEFT JOIN coupons ic ON ic.code = o.coupon_code AND ic.type = 'influencer'
       LEFT JOIN influencers i ON i.code = ic.code
       LEFT JOIN crew_commissions cc ON cc.order_id = o.id AND cc.status != 'reversed'
       WHERE  o.status = 'delivered'
         AND  o.delivered_at >= $1::date
         AND  o.delivered_at <  $1::date + INTERVAL '1 month'`,
      [monthStart]
    ),
    queryFn(
      `SELECT COALESCE(SUM(pts_cost), 0) AS points_spent
       FROM   point_redemptions
       WHERE  status != 'cancelled'
         AND  created_at >= $1::date
         AND  created_at <  $1::date + INTERVAL '1 month'`,
      [monthStart]
    ),
    queryFn(`SELECT point_redemption_value FROM points_settings WHERE id = 1`),
    queryFn(
      `SELECT
         COALESCE((SELECT SUM(total_owed) FROM influencers), 0)::numeric AS influencer_unpaid,
         COALESCE((SELECT SUM(commission_amount) FROM crew_commissions WHERE status IN ('pending','approved')), 0)::numeric AS crew_unpaid,
         COALESCE((SELECT SUM(pts_cost) FROM point_redemptions WHERE status = 'pending'), 0)::numeric AS pending_redemption_points`
    ),
    optionalQuery(queryFn,
      `SELECT
         COALESCE(SUM(amount), 0)::int AS total_expenses,
         COALESCE(SUM(amount) FILTER (WHERE category = 'product_purchase'), 0)::int AS product_purchase,
         COALESCE(SUM(amount) FILTER (WHERE category = 'packaging'), 0)::int AS packaging,
         COALESCE(SUM(amount) FILTER (WHERE category = 'delivery_courier'), 0)::int AS delivery_courier,
         COALESCE(SUM(amount) FILTER (WHERE category = 'ads_marketing'), 0)::int AS ads_marketing,
         COALESCE(SUM(amount) FILTER (WHERE category = 'commission'), 0)::int AS commission_expense,
         COALESCE(SUM(amount) FILTER (WHERE category = 'refund'), 0)::int AS refund_expense,
         COALESCE(SUM(amount) FILTER (WHERE category = 'operational'), 0)::int AS operational,
         COALESCE(SUM(amount) FILTER (WHERE category = 'other'), 0)::int AS other
       FROM financial_expenses
       WHERE expense_date >= $1::date
         AND expense_date < $1::date + INTERVAL '1 month'`,
      [monthStart],
      [{ total_expenses: 0, product_purchase: 0, packaging: 0, delivery_courier: 0, ads_marketing: 0, commission_expense: 0, refund_expense: 0, operational: 0, other: 0 }]
    ),
    optionalQuery(queryFn,
      `SELECT COALESCE(SUM(amount), 0)::int AS refunds
       FROM order_refunds
       WHERE status = 'refunded'
         AND created_at >= $1::date
         AND created_at < $1::date + INTERVAL '1 month'`,
      [monthStart],
      [{ refunds: 0 }]
    ),
    optionalQuery(queryFn,
      `SELECT
         COALESCE(SUM(expected_amount), 0)::int AS expected,
         COALESCE(SUM(received_amount), 0)::int AS received,
         COALESCE(SUM(expected_amount - received_amount) FILTER (WHERE status IN ('pending','mismatch','failed')), 0)::int AS pending_amount,
         COUNT(*) FILTER (WHERE status IN ('pending','mismatch','failed'))::int AS pending_count
       FROM payment_reconciliations
       WHERE created_at >= $1::date
         AND created_at < $1::date + INTERVAL '1 month'`,
      [monthStart],
      [{ expected: 0, received: 0, pending_amount: 0, pending_count: 0 }]
    ),
  ])

  const redemptionValue = Number(settingsRes.rows[0]?.point_redemption_value ?? 0.5)
  const pointsRedeemedTaka = Math.round(Number(pointsRes.rows[0].points_spent || 0) * redemptionValue)
  const influencerUnpaid = Number(liabilityRes.rows[0].influencer_unpaid || 0)
  const crewUnpaid = Number(liabilityRes.rows[0].crew_unpaid || 0)
  const pendingRedemptionValue = Math.round(Number(liabilityRes.rows[0].pending_redemption_points || 0) * redemptionValue)
  const expenses = expensesRes.rows[0] || {}
  const refunds = Number(refundsRes.rows[0]?.refunds || 0)
  const paymentReconciliation = paymentsRes.rows[0] || {}
  const cogs = Number(expenses.product_purchase || 0)
  const packagingCost = Number(expenses.packaging || 0)
  const courierCost = Number(expenses.delivery_courier || 0)
  const marketingCost = Number(expenses.ads_marketing || 0)
  const commissionExpense = Number(expenses.commission_expense || 0)
  const operationalExpense = Number(expenses.operational || 0)
  const otherExpense = Number(expenses.other || 0)
  const totalExpenses = Number(expenses.total_expenses || 0)
  const netProfitEstimate =
    Number(deliveredRevenueRes.rows[0].revenue_delivered || 0) -
    Number(ordersRes.rows[0].discounts || 0) -
    cogs - packagingCost - courierCost - marketingCost - commissionExpense -
    Number(commRes.rows[0].crew_commission || 0) -
    Number(commRes.rows[0].influencer_commission || 0) -
    refunds - operationalExpense - otherExpense

  return {
    revenue: parseInt(ordersRes.rows[0].revenue, 10),
    revenue_delivered: parseInt(deliveredRevenueRes.rows[0].revenue_delivered, 10),
    discounts: parseInt(ordersRes.rows[0].discounts, 10),
    commission: parseInt(commRes.rows[0].influencer_commission, 10),
    crew_commission: parseFloat(commRes.rows[0].crew_commission || 0),
    points_redeemed_taka: pointsRedeemedTaka,
    point_redemption_value: redemptionValue,
    refunds,
    expenses: {
      total: totalExpenses,
      product_purchase: cogs,
      packaging: packagingCost,
      delivery_courier: courierCost,
      ads_marketing: marketingCost,
      commission: commissionExpense,
      refund: Number(expenses.refund_expense || 0),
      operational: operationalExpense,
      other: otherExpense,
    },
    payment_reconciliation: {
      expected: Number(paymentReconciliation.expected || 0),
      received: Number(paymentReconciliation.received || 0),
      pending_amount: Number(paymentReconciliation.pending_amount || 0),
      pending_count: Number(paymentReconciliation.pending_count || 0),
    },
    profit_summary: {
      revenue: Number(deliveredRevenueRes.rows[0].revenue_delivered || 0),
      discounts: Number(ordersRes.rows[0].discounts || 0),
      cogs,
      packaging_cost: packagingCost,
      courier_cost: courierCost,
      marketing_cost: marketingCost,
      commissions: Number(commRes.rows[0].influencer_commission || 0) + Number(commRes.rows[0].crew_commission || 0) + commissionExpense,
      refunds,
      operational_expense: operationalExpense,
      other_expense: otherExpense,
      net_profit_estimate: netProfitEstimate,
    },
    outstanding_liability: {
      as_of: now.toISOString(),
      influencer_unpaid: influencerUnpaid,
      crew_unpaid: crewUnpaid,
      pending_redemptions_taka: pendingRedemptionValue,
      total: influencerUnpaid + crewUnpaid + pendingRedemptionValue,
    },
  }
}

module.exports = { getFinancialSummary }
