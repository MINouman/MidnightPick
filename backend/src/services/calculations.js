'use strict'

const Decimal = require('decimal.js')

function calculateCommission(baseAmount, commissionRate) {
  const amount = new Decimal(baseAmount || 0)
    .times(new Decimal(commissionRate || 0))
    .dividedBy(100)
    .toDecimalPlaces(2)
  return amount.toNumber()
}

function calculateDiscount(baseAmount, discountRate) {
  const amount = new Decimal(baseAmount || 0)
    .times(new Decimal(discountRate || 0))
    .dividedBy(100)
    .toDecimalPlaces(2)
  return Math.floor(amount.toNumber())
}

module.exports = { calculateCommission, calculateDiscount }
