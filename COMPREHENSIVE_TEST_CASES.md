# Midnight Pick — Comprehensive Testing Guide

**Environment:** Development (localhost:3000)  
**Date:** June 13, 2026  
**Status:** Ready for Manual & Automated Testing

---

## Part 1: Authentication & User Management

### Test 1.1: User Registration with Phone OTP
```
Steps:
1. POST /auth/register/request-otp
   Body: { phone: "01712345678" }
   Expected: { ok: true, message: "OTP sent" }

2. POST /auth/register/verify-otp
   Body: { phone: "01712345678", otp_token: "123456" }
   Expected: { ok: true, tokens: { access, refresh } }

Result: ✓ PASS / ✗ FAIL
Notes: 
```

### Test 1.2: User Login
```
Steps:
1. POST /auth/login/request-otp
   Body: { phone: "01712345678" }
   Expected: { ok: true }

2. POST /auth/login/verify-otp
   Body: { phone: "01712345678", otp_token: "123456" }
   Expected: Tokens returned

Result: ✓ PASS / ✗ FAIL
```

### Test 1.3: Get User Profile
```
Steps:
1. GET /me (with Bearer token)
   Expected: User object with id, name, email, phone, points_balance

Assertion:
- User name matches
- points_balance is a number >= 0
- Role is valid (user/crew/influencer/admin)

Result: ✓ PASS / ✗ FAIL
```

### Test 1.4: Update User Profile
```
Steps:
1. PATCH /me
   Body: { name: "Test User", email: "test@example.com" }
   Expected: { ok: true, data: updated_user }

Assertion:
- Name updated correctly
- Email updated correctly

Result: ✓ PASS / ✗ FAIL
```

### Test 1.5: Manage Addresses
```
Steps:
1. POST /me/addresses
   Body: {
     label: "Home",
     line1: "123 Main St",
     city: "Dhaka",
     district: "Dhaka"
   }
   Expected: { ok: true, data: address_with_id }

2. GET /me/addresses
   Expected: Array of addresses

3. PATCH /me/addresses/{id}
   Body: { label: "Work" }
   Expected: Updated address

4. DELETE /me/addresses/{id}
   Expected: { ok: true }

Result: ✓ PASS / ✗ FAIL
```

---

## Part 2: Product Browsing

### Test 2.1: Get Products List
```
Steps:
1. GET /products
   Expected: Array of products with id, name, price, stock, variants

Assertion:
- At least 3 default products exist (Midnight Blend, Midnight Black, Trial Pack)
- Each product has variants array
- Prices are > 0
- Stock values are >= 0

Result: ✓ PASS / ✗ FAIL
```

### Test 2.2: Get Product Details
```
Steps:
1. GET /products/{product_id}
   Expected: Full product details with all variants

Assertion:
- Product contains description, images, variants
- Variants have price, stock, is_default flag

Result: ✓ PASS / ✗ FAIL
```

---

## Part 3: Order Management (Critical Tests)

### Test 3.1: Place Order with Valid Coupon
```
Steps:
1. POST /orders
   Body: {
     items: [{
       variant_id: "b0000000-0000-0000-0000-000000000002",
       qty: 1
     }],
     address_id: "...",
     payment_type: "cod",
     payment_number: "01712345678",
     coupon_code: "WELCOME10"
   }
   Expected: { ok: true, data: order }

Assertion:
- Order ref created (MP-XXXX format)
- Discount applied correctly
- Total = subtotal - discount
- Status = "processing"
- Points earned calculated (0.5 per taka)

Result: ✓ PASS / ✗ FAIL
```

### Test 3.2: Coupon Per-Phone Limit Enforcement (Fix #2 Test)
```
Prerequisites:
- Coupon with max_usage_per_phone = 1
- Same phone number

Steps:
1. Place first order with coupon
   Expected: Success

2. Place second order immediately with same phone and coupon
   Expected: FAIL with COUPON_EXHAUSTED

Assertion:
- First order succeeds
- Second order gets proper error
- Coupon used_count = 1

Result: ✓ PASS / ✗ FAIL (Critical)
```

### Test 3.3: Invalid Phone Number Rejection (Fix #3 Test)
```
Steps:
1. POST /admin/orders
   Body: {
     customer_name: "Test",
     customer_phone: "invalid phone 123",
     items: [...],
     payment_type: "cod"
   }
   Expected: { error: { code: "INVALID_PHONE" } }

Assertion:
- Error code is INVALID_PHONE
- Order not created

Result: ✓ PASS / ✗ FAIL (Critical)
```

### Test 3.4: View Order History
```
Steps:
1. GET /orders?page=1&limit=10
   Expected: { orders: [], total, page, limit }

2. GET /orders?status=delivered&page=1
   Expected: Filtered orders by status

Assertion:
- Pagination works correctly
- Status filtering works
- All user's orders shown

Result: ✓ PASS / ✗ FAIL
```

### Test 3.5: Update Order Status (Admin)
```
Steps:
1. PATCH /admin/orders/{order_id}/status
   Body: { status: "delivered" }
   Expected: Order updated to delivered

Assertion:
- Status changed to "delivered"
- Points awarded (if first delivery)
- Commission created (if crew coupon)
- Points earned recorded

Result: ✓ PASS / ✗ FAIL
```

### Test 3.6: Cancel Order
```
Steps:
1. POST /orders/{order_id}/cancel
   Expected: Order cancelled

Assertion:
- Status = "cancelled"
- Stock returned
- Coupon usage freed
- Points reversed (if awarded)
- Commission reversed

Result: ✓ PASS / ✗ FAIL
```

---

## Part 4: Points & Rewards System

### Test 4.1: View Points Balance
```
Steps:
1. GET /me/points
   Expected: { ok: true, data: { balance: 123 } }

Assertion:
- Balance is a number >= 0
- Matches database value

Result: ✓ PASS / ✗ FAIL
```

### Test 4.2: View Points History
```
Steps:
1. GET /me/points/history?page=1&limit=20
   Expected: Paginated transaction history

Assertion:
- Transactions sorted by date DESC
- Types: earned, spent, reversed, bonus
- Balance_after values correct
- Pagination works

Result: ✓ PASS / ✗ FAIL
```

### Test 4.3: Get Available Rewards
```
Steps:
1. GET /me/point-rewards
   Expected: Array of active rewards

Assertion:
- Only is_active=true rewards shown
- Sorted by sort_order
- Each has id, label, pts_cost, worth

Result: ✓ PASS / ✗ FAIL
```

### Test 4.4: Redeem Points (Critical - Fix #1 Test)
```
Prerequisites:
- User has >= 100 points
- Reward costs 100 points

Steps:
1. POST /me/points/redeem
   Body: { reward_id: "..." }
   Expected: { ok: true, data: { balance, redemption } }

Assertion:
- Redemption created with status "pending"
- Points deducted from balance
- Transaction recorded
- Balance updated correctly

Result: ✓ PASS / ✗ FAIL
```

### Test 4.5: Concurrent Point Redemption (Fix #1 Race Condition Test)
```
Prerequisites:
- User has 1000 points
- Reward costs 600 points

Steps:
1. Send two concurrent POST /me/points/redeem requests
2. Both attempt to redeem same reward

Expected:
- First succeeds
- Second fails with INSUFFICIENT_POINTS
- User balance = 400 (not -200)
- Only 1 redemption created

Assertion:
- No race condition
- Atomic operation confirmed
- Only 1 redemption in database

Result: ✓ PASS / ✗ FAIL (Critical - Security Fix)
```

### Test 4.6: Admin Fulfil Redemption
```
Steps:
1. PATCH /admin/redemptions/{id}
   Body: { status: "fulfilled" }
   Expected: Redemption updated

Assertion:
- Status = "fulfilled"
- User notified (if SMS enabled)

Result: ✓ PASS / ✗ FAIL
```

---

## Part 5: Coupon & Discount Validation

### Test 5.1: Festival Coupon Validation
```
Steps:
1. GET /admin/coupons/validate?code=WELCOME10&subtotal=1000
   Expected: { ok: true, data: { code, discount, discount_type, discount_value } }

Assertion:
- Discount calculated correctly
- Code returned
- Type and value match

Result: ✓ PASS / ✗ FAIL
```

### Test 5.2: Expired Coupon Rejection
```
Prerequisites:
- Coupon with expires_at = 2026-06-01 (past)

Steps:
1. GET /admin/coupons/validate?code=EXPIRED&subtotal=1000
   Expected: { error: { code: "INVALID_COUPON" } }

Assertion:
- Expired coupon rejected
- Clear error message

Result: ✓ PASS / ✗ FAIL
```

### Test 5.3: Minimum Order Validation
```
Prerequisites:
- Coupon with min_order = 1000

Steps:
1. GET /admin/coupons/validate?code=MINORDER&subtotal=500
   Expected: Error (below minimum)

2. GET /admin/coupons/validate?code=MINORDER&subtotal=1000
   Expected: Success

Result: ✓ PASS / ✗ FAIL
```

### Test 5.4: Commission Calculation Precision (Fix #4 Test)
```
Prerequisites:
- Coupon with commission rate 5.5%
- Order total 1234 taka

Steps:
1. Place order and move to delivered
2. Check crew_commissions table

Expected Commission:
- 1234 * 5.5 / 100 = 67.87 taka
- NOT 68 (rounded)

Assertion:
- commission_amount = 67.87 (2 decimals exact)
- Calculated with Decimal.js precision

Result: ✓ PASS / ✗ FAIL (Critical - Fix #4)
```

---

## Part 6: Crew Program

### Test 6.1: Apply to Crew
```
Steps:
1. POST /me/crew/apply
   Body: {
     name: "John Doe",
     phone: "01712345678",
     email: "john@example.com",
     social_link: "https://facebook.com/...",
     reason: "I love this product"
   }
   Expected: Application created

Assertion:
- Application status = "pending"
- Can't apply twice (unless rejected)

Result: ✓ PASS / ✗ FAIL
```

### Test 6.2: View Crew Profile (After Approval)
```
Steps:
1. GET /me/crew (as crew member)
   Expected: Profile, application, settings, summary

Assertion:
- Profile.status = "active"
- Summary includes: referral_orders, total_sales, commissions

Result: ✓ PASS / ✗ FAIL
```

### Test 6.3: Create Crew Coupon
```
Steps:
1. POST /me/crew/coupons
   Body: {
     code: "CREW10",
     discount_type: "pct",
     discount_value: 10,
     max_uses: 50
   }
   Expected: Coupon created

Assertion:
- Status = "active" or "pending_approval" (depends on settings)
- Crew_profile_id set correctly

Result: ✓ PASS / ✗ FAIL
```

### Test 6.4: View Crew Activity
```
Steps:
1. GET /me/crew/activity
   Expected: Orders using crew's coupons

Assertion:
- Shows discount_amount for each order
- Commission amount calculated
- Linked to correct coupon

Result: ✓ PASS / ✗ FAIL
```

---

## Part 7: Admin Dashboard

### Test 7.1: View Dashboard Stats
```
Steps:
1. GET /admin/stats
   Expected: { orders, users, revenue }

Assertion:
- Total orders count correct
- Active orders count correct
- Total users including crew/influencer counts
- Revenue from delivered orders only

Result: ✓ PASS / ✗ FAIL
```

### Test 7.2: List Orders with Pagination
```
Steps:
1. GET /admin/orders?page=1&limit=20&status=delivered
   Expected: Paginated order list

Assertion:
- Total count correct
- Proper order of records
- All fields present (customer_name, phone, etc)

Result: ✓ PASS / ✗ FAIL
```

### Test 7.3: Search Orders
```
Steps:
1. GET /admin/orders?search=01712345678
   Expected: Orders for that phone

2. GET /admin/orders?search=MP-1234
   Expected: Orders with that ref

Assertion:
- Search case-insensitive
- Matches phone and name

Result: ✓ PASS / ✗ FAIL
```

### Test 7.4: List Subscriptions with Pagination (Fix #5 Test)
```
Steps:
1. GET /admin/subscriptions?page=1&limit=10
   Expected: { subscriptions: [], total, page, limit }

2. GET /admin/subscriptions?page=2&limit=10&status=active
   Expected: Correct pagination

Assertion:
- Pagination works
- Status filtering works
- Total count correct
- No timeout on large dataset

Result: ✓ PASS / ✗ FAIL (Critical - Fix #5)
```

### Test 7.5: Financial Report with Crew Commission (Fix #6 Test)
```
Steps:
1. GET /admin/financials?month=2026-06
   Expected: { revenue, discounts, commission, crew_commission, points_redeemed_taka }

Assertion:
- commission field = influencer commissions
- crew_commission field = crew commissions (NEW)
- Both are included
- Totals are correct

Result: ✓ PASS / ✗ FAIL (Critical - Fix #6)
```

### Test 7.6: Manage Products
```
Steps:
1. POST /admin/products
   Body: {
     name: "New Coffee",
     description: "...",
     price: 299,
     stock: 100,
     category: "Premium Coffee"
   }
   Expected: Product created

2. PATCH /admin/products/{id}
   Body: { stock: 50 }
   Expected: Updated

3. DELETE /admin/products/{id}
   Expected: Deleted

Result: ✓ PASS / ✗ FAIL
```

---

## Part 8: Security Tests

### Test 8.1: Unauthorized Access
```
Steps:
1. GET /me (without token)
   Expected: 401 Unauthorized

2. GET /admin/orders (as regular user)
   Expected: 403 Forbidden

Result: ✓ PASS / ✗ FAIL
```

### Test 8.2: Rate Limiting (Enhanced Security)
```
Steps:
1. Send 11 requests to POST /me/points/redeem in 1 minute
   Expected: 11th request gets 429 Too Many Requests

Assertion:
- Rate limit enforced
- Clear error message

Result: ✓ PASS / ✗ FAIL
```

### Test 8.3: CORS Validation
```
Steps:
1. Send request from unapproved origin
   Expected: CORS error

2. Send from http://localhost:5500
   Expected: Success

Result: ✓ PASS / ✗ FAIL
```

---

## Part 9: Performance Tests

### Test 9.1: Query Performance - Coupon List
```
Prerequisites:
- 1000+ coupons in database

Steps:
1. GET /admin/coupons?type=festival
   Measure: Response time

Expected: < 500ms
Actual: _____ms

Result: ✓ PASS (< 500ms) / ✗ FAIL (> 500ms)
```

### Test 9.2: Query Performance - Crew Members
```
Steps:
1. GET /admin/crew/members
   Measure: Response time

Expected: < 1000ms
Actual: _____ms

Result: ✓ PASS / ✗ FAIL
```

---

## Part 10: Mobile vs Desktop Consistency

### Test 10.1: Phone Validation Consistency
```
Both Mobile & Desktop should reject:
- "invalid phone"
- " 01712345678 " (with spaces)
- "987654321" (wrong format)

Both should accept:
- "01712345678"
- "+8801712345678"
- "8801712345678"

Result: ✓ PASS / ✗ FAIL
```

### Test 10.2: Error Messages Consistency
```
Test same invalid input on both platforms

Expected: Same error code and message

Result: ✓ PASS / ✗ FAIL
```

---

## Test Summary

### Critical Fixes Tested:
- [X] Fix #1: Point Redemption Race Condition
- [X] Fix #2: Coupon Per-Phone Usage Race Condition
- [X] Fix #3: Phone Number Normalization
- [X] Fix #4: Commission Calculation Precision
- [X] Fix #5: Subscriptions Pagination
- [X] Fix #6: Commission Query Include Crew

### Overall Results:
- Total Tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___
- Success Rate: ___%

### Critical Issues Found:
(List any bugs or issues discovered)

---

## Sign-Off

**Tester:** ___________________  
**Date:** ___________________  
**Status:** ✓ APPROVED / ✗ NEEDS FIXES

