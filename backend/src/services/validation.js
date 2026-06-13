'use strict'

const BD_PHONE_PATTERN = /^(?:\+?880|0)1[3-9]\d{8}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COUPON_CODE_PATTERN = /^[A-Z0-9]{2,20}$/
const NAME_PATTERN = /^[a-zA-Z\s'-]{1,100}$/

function validatePhone(phone) {
  if (!phone) return false
  const normalized = String(phone).trim()
  return BD_PHONE_PATTERN.test(normalized)
}

function validateEmail(email) {
  if (!email) return false
  const normalized = String(email).trim().toLowerCase()
  return EMAIL_PATTERN.test(normalized) && normalized.length <= 255
}

function validateCouponCode(code) {
  if (!code) return false
  const normalized = String(code).trim().toUpperCase()
  return COUPON_CODE_PATTERN.test(normalized)
}

function validateName(name) {
  if (!name) return false
  const trimmed = String(name).trim()
  return NAME_PATTERN.test(trimmed) && trimmed.length >= 1 && trimmed.length <= 100
}

function validateQuantity(qty, min = 1, max = 100) {
  const num = Number(qty)
  return Number.isInteger(num) && num >= min && num <= max
}

function validatePrice(price, min = 0) {
  const num = Number(price)
  return !isNaN(num) && num >= min
}

function validateAddress(address) {
  if (!address) return false
  const trimmed = String(address).trim()
  return trimmed.length >= 5 && trimmed.length <= 500
}

function validateDiscount(value, type = 'flat') {
  const num = Number(value)
  if (type === 'pct') {
    return !isNaN(num) && num >= 0 && num <= 100
  }
  if (type === 'flat') {
    return !isNaN(num) && num >= 0
  }
  return false
}

module.exports = {
  validatePhone,
  validateEmail,
  validateCouponCode,
  validateName,
  validateQuantity,
  validatePrice,
  validateAddress,
  validateDiscount,
  patterns: {
    PHONE: BD_PHONE_PATTERN,
    EMAIL: EMAIL_PATTERN,
    COUPON_CODE: COUPON_CODE_PATTERN,
    NAME: NAME_PATTERN,
  },
}
