'use strict'

const rateLimitConfig = {
  pointRedemption: {
    max: 10,
    timeWindow: '1 hour',
    message: 'You can redeem rewards a maximum of 10 times per hour. Please try again later.',
  },

  couponValidation: {
    max: 30,
    timeWindow: '1 minute',
    message: 'Too many coupon validation requests. Please slow down.',
  },

  orderCreation: {
    max: 20,
    timeWindow: '1 minute',
    message: 'Too many order creation requests. Please wait before placing another order.',
  },

  crewApplication: {
    max: 5,
    timeWindow: '1 day',
    message: 'You can submit crew applications once per day. Please try again tomorrow.',
  },

  adminOrderCreation: {
    max: 60,
    timeWindow: '1 minute',
    message: 'Too many admin order creations. Please slow down.',
  },

  passwordReset: {
    max: 3,
    timeWindow: '1 hour',
    message: 'Too many password reset attempts. Please try again in 1 hour.',
  },
}

function getRateLimitConfig(endpoint) {
  return rateLimitConfig[endpoint] || { max: 200, timeWindow: '1 minute' }
}

module.exports = { rateLimitConfig, getRateLimitConfig }
