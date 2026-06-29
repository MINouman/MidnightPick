import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { calculateDeliveryCost } from "../lib/delivery";

describe("calculateDeliveryCost", () => {
  test("charges ৳55 for a Dhaka parcel up to 150g", () => {
    assert.deepEqual(
      calculateDeliveryCost({
        location: "Dhanmondi",
        weightGrams: 95,
        orderSubtotal: 699,
        paymentMethod: "bkash",
      }),
      {
        zone: "dhaka",
        shippingCost: 55,
        codFee: 0,
        totalDeliveryCost: 55,
      },
    );
  });

  test("charges ৳65 for a Dhaka parcel from 151g through 500g", () => {
    const result = calculateDeliveryCost({
      location: "Banani",
      weightGrams: 500,
      orderSubtotal: 1_000,
      paymentMethod: "bkash",
    });

    assert.equal(result.shippingCost, 65);
  });

  test("charges ৳75 for a Dhaka parcel from 501g through 1000g", () => {
    const result = calculateDeliveryCost({
      location: "Mirpur",
      weightGrams: 1_000,
      orderSubtotal: 1_000,
      paymentMethod: "bkash",
    });

    assert.equal(result.shippingCost, 75);
  });

  test("rounds fractional excess kilograms up for Dhaka parcels", () => {
    const result = calculateDeliveryCost({
      location: "Uttara East",
      weightGrams: 2_100,
      orderSubtotal: 1_000,
      paymentMethod: "bkash",
    });

    assert.equal(result.shippingCost, 115);
  });

  test("charges ৳105 for a Suburban parcel up to 1000g", () => {
    const result = calculateDeliveryCost({
      location: "Savar",
      weightGrams: 1_000,
      orderSubtotal: 1_000,
      paymentMethod: "bkash",
    });

    assert.equal(result.zone, "suburban");
    assert.equal(result.shippingCost, 105);
  });

  test("charges one additional kilogram for a 1200g Suburban parcel", () => {
    assert.deepEqual(
      calculateDeliveryCost({
        location: "Gazipur",
        weightGrams: 1_200,
        orderSubtotal: 1_398,
        paymentMethod: "cod",
      }),
      {
        zone: "suburban",
        shippingCost: 125,
        codFee: 14,
        totalDeliveryCost: 139,
      },
    );
  });

  test("treats Narayanganj district as Suburban", () => {
    const result = calculateDeliveryCost({
      location: "Narayanganj",
      weightGrams: 95,
      orderSubtotal: 699,
      paymentMethod: "bkash",
    });

    assert.equal(result.zone, "suburban");
  });

  test("charges ৳115 for a District parcel up to 500g", () => {
    const result = calculateDeliveryCost({
      location: "Sylhet",
      weightGrams: 500,
      orderSubtotal: 699,
      paymentMethod: "bkash",
    });

    assert.equal(result.zone, "district");
    assert.equal(result.shippingCost, 115);
  });

  test("charges ৳135 for a District parcel from 501g through 1000g", () => {
    const result = calculateDeliveryCost({
      location: "Khulna",
      weightGrams: 501,
      orderSubtotal: 699,
      paymentMethod: "bkash",
    });

    assert.equal(result.shippingCost, 135);
  });

  test("charges exact additional kilograms correctly for District parcels", () => {
    const result = calculateDeliveryCost({
      location: "Rajshahi",
      weightGrams: 3_000,
      orderSubtotal: 699,
      paymentMethod: "bkash",
    });

    assert.equal(result.shippingCost, 175);
  });

  test("calculates COD fee from product subtotal only and rounds it", () => {
    assert.deepEqual(
      calculateDeliveryCost({
        location: "Sylhet",
        weightGrams: 95,
        orderSubtotal: 699,
        paymentMethod: "cod",
      }),
      {
        zone: "district",
        shippingCost: 115,
        codFee: 7,
        totalDeliveryCost: 122,
      },
    );
  });

  test("does not charge a COD fee for bKash", () => {
    const result = calculateDeliveryCost({
      location: "Sylhet",
      weightGrams: 95,
      orderSubtotal: 10_000,
      paymentMethod: "bkash",
    });

    assert.equal(result.codFee, 0);
  });

  test("matches locations case-insensitively after trimming whitespace", () => {
    const result = calculateDeliveryCost({
      location: "  tEjGaOn InDuStRiAl ArEa  ",
      weightGrams: 95,
      orderSubtotal: 699,
      paymentMethod: "bkash",
    });

    assert.equal(result.zone, "dhaka");
  });

  test("defaults unknown locations to the District zone", () => {
    const result = calculateDeliveryCost({
      location: "Unknown Place",
      weightGrams: 95,
      orderSubtotal: 699,
      paymentMethod: "bkash",
    });

    assert.equal(result.zone, "district");
    assert.equal(result.shippingCost, 115);
  });

  test("classifies Dhamrai as District according to the supplied zone list", () => {
    const result = calculateDeliveryCost({
      location: "Dhamrai",
      weightGrams: 95,
      orderSubtotal: 699,
      paymentMethod: "bkash",
    });

    assert.equal(result.zone, "district");
  });
});
