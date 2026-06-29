'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { formatRecipientAddress } = require('../src/services/steadfast')

test('labels the area and city so Steadfast can derive the police station', () => {
  assert.equal(
    formatRecipientAddress({
      line1: 'House no 288 road 1/A, block B Bashundhara R/A',
      district: 'Bashundhara',
      city: 'Dhaka',
    }),
    'House no 288 road 1/A, block B Bashundhara R/A, Police Station: Bashundhara, District: Dhaka'
  )
})

test('retains line2 and ignores blank address parts', () => {
  assert.equal(
    formatRecipientAddress({
      line1: 'House 12',
      line2: 'Road 7',
      district: 'Banani',
      city: 'Dhaka',
    }),
    'House 12, Road 7, Police Station: Banani, District: Dhaka'
  )
})

test('supports legacy manual-order address snapshots', () => {
  assert.equal(
    formatRecipientAddress({ address: 'Nobigonj, Bandar' }),
    'Nobigonj, Bandar'
  )
})
