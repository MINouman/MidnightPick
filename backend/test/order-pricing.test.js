'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { calculateProductSubtotal, calculateCheckoutDeliveryCharge } = require('../src/services/orders')

test('rounds discounted multi-quantity line items to integer BDT values', () => {
  const pricing = calculateProductSubtotal(
    {
      price: 699,
      discount_enabled: true,
      discount_type: 'flat',
      discount_value: 70,
      discount_max_qty: 1,
    },
    3
  )

  assert.equal(pricing.subtotal, 2027)
  assert.equal(pricing.unitPrice, 676)
  assert.equal(Number.isInteger(pricing.subtotal), true)
  assert.equal(Number.isInteger(pricing.unitPrice), true)
})

test('keeps full-price unit pricing integer when no discount applies', () => {
  const pricing = calculateProductSubtotal(
    {
      price: 699,
      discount_enabled: false,
      discount_type: 'flat',
      discount_value: 0,
      discount_max_qty: null,
    },
    2
  )

  assert.deepEqual(pricing, {
    subtotal: 1398,
    unitPrice: 699,
    discountPerUnit: 0,
  })
})

test('disables the product discount after the max order cap is reached', () => {
  const pricing = calculateProductSubtotal(
    {
      price: 699,
      discount_enabled: true,
      discount_type: 'flat',
      discount_value: 70,
      discount_max_qty: 1,
      discount_max_orders: 2,
      discount_orders_used: 2,
    },
    1
  )

  assert.deepEqual(pricing, {
    subtotal: 699,
    unitPrice: 699,
    discountPerUnit: 0,
  })
})

test('adds weight-based delivery and one percent COD fee to checkout bill', () => {
  const charges = calculateCheckoutDeliveryCharge('Badda', 285, 699)

  assert.deepEqual(charges, {
    shippingCost: 65,
    codFee: 7,
    totalDeliveryCharge: 72,
  })
})

test('uses suburban delivery fee when city or district is a Dhaka suburban area', () => {
  assert.deepEqual(calculateCheckoutDeliveryCharge({ city: 'Gazipur', district: 'Gazipur Sadar' }, 285, 2097), {
    shippingCost: 105,
    codFee: 21,
    totalDeliveryCharge: 126,
  })

  assert.deepEqual(calculateCheckoutDeliveryCharge({ city: 'Dhaka', district: 'Savar' }, 285, 2097), {
    shippingCost: 105,
    codFee: 21,
    totalDeliveryCharge: 126,
  })
})

test('keeps outside Dhaka delivery fee distinct from suburban fee', () => {
  const charges = calculateCheckoutDeliveryCharge({ city: 'Chattogram', district: 'Chattogram Sadar' }, 285, 2097)

  assert.deepEqual(charges, {
    shippingCost: 115,
    codFee: 21,
    totalDeliveryCharge: 136,
  })
})

test('does not add COD fee for prepaid cart checkout', () => {
  const charges = calculateCheckoutDeliveryCharge('Badda', 285, 699, false)

  assert.deepEqual(charges, {
    shippingCost: 65,
    codFee: 0,
    totalDeliveryCharge: 65,
  })
})
