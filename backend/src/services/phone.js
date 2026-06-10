'use strict'

const BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/

function normalizeBdMobile(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  let phone = digits

  if (/^008801[3-9]\d{8}$/.test(digits)) {
    phone = digits.slice(4)
  } else if (/^8801[3-9]\d{8}$/.test(digits)) {
    phone = `0${digits.slice(3)}`
  } else if (/^1[3-9]\d{8}$/.test(digits)) {
    phone = `0${digits}`
  }

  if (!BD_MOBILE_PATTERN.test(phone)) {
    throw {
      code: 'INVALID_PHONE',
      message: 'Enter a valid Bangladesh mobile number, e.g. 017XXXXXXXX or +88017XXXXXXXX.',
    }
  }

  return phone
}

module.exports = { BD_MOBILE_PATTERN, normalizeBdMobile }
