'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { getWeightBasedFee } = require('../src/services/delivery')

test('treats inside-Dhaka thanas as dhaka pricing', () => {
  assert.equal(getWeightBasedFee('Badda', 285), 65)
  assert.equal(getWeightBasedFee('Dhanmondi', 120), 55)
  assert.equal(getWeightBasedFee('Uttara West', 980), 75)
})

test('treats suburban areas separately from district pricing', () => {
  assert.equal(getWeightBasedFee('Gazipur', 1200), 125)
  assert.equal(getWeightBasedFee('Savar', 1000), 105)
})

test('falls back to district pricing for non-zone locations', () => {
  assert.equal(getWeightBasedFee('Sylhet', 95), 115)
  assert.equal(getWeightBasedFee('Chattogram', 750), 135)
})
