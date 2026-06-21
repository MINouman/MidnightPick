'use strict'

async function getFinancialSummary(queryFn, month, now = new Date()) {
  const monthStart = `${month}-01`

  const [ordersRes, deliveredRevenueRes, commRes, pointsRes, settingsRes, liabilityRes] = await Promise.all([
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
  ])

  const redemptionValue = Number(settingsRes.rows[0]?.point_redemption_value ?? 0.5)
  const pointsRedeemedTaka = Math.round(Number(pointsRes.rows[0].points_spent || 0) * redemptionValue)
  const influencerUnpaid = Number(liabilityRes.rows[0].influencer_unpaid || 0)
  const crewUnpaid = Number(liabilityRes.rows[0].crew_unpaid || 0)
  const pendingRedemptionValue = Math.round(Number(liabilityRes.rows[0].pending_redemption_points || 0) * redemptionValue)

  return {
    revenue: parseInt(ordersRes.rows[0].revenue, 10),
    revenue_delivered: parseInt(deliveredRevenueRes.rows[0].revenue_delivered, 10),
    discounts: parseInt(ordersRes.rows[0].discounts, 10),
    commission: parseInt(commRes.rows[0].influencer_commission, 10),
    crew_commission: parseFloat(commRes.rows[0].crew_commission || 0),
    points_redeemed_taka: pointsRedeemedTaka,
    point_redemption_value: redemptionValue,
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
