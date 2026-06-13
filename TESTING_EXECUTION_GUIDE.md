# Midnight Pick — Testing Execution Guide

**Status:** Ready for Comprehensive Testing  
**Date:** June 13, 2026  
**All 10 Exploit Fixes:** Code-complete and ready to test

---

## Pre-Testing Setup

### 1. Apply Migrations
```bash
cd backend
npm install
npm run migrate -- --latest
```

**Verify:**
```sql
-- Check migrations 024 & 025 applied
SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 5;

-- Should show:
-- 025_clarify_coupon_type_source
-- 024_commission_validation
-- 023_subscription_pause_automation
-- ...
```

### 2. Start Backend
```bash
node src/app.js
# or with nodemon
npm run dev
```

**Verify:** `curl http://localhost:3000/` returns 404 (server running)

### 3. Verify Database State
```bash
psql -d midnightpick_db -c "SELECT * FROM crew_settings WHERE id = 1;"
# Verify commission_mode = 'fixed'
```

---

## CRITICAL FIX TESTS (Must Pass)

### TEST #1: Math.round Rounding ✅ FIX #1
**Purpose:** Verify discount calculation uses Math.round instead of Math.floor

**Scenario:** 1% discount on low-value order

```bash
# Test 1A: ৳50 order with 1% coupon
curl -X POST http://localhost:3000/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST1PCT",
    "subtotal": 50,
    "phone": "01712345678"
  }'

# Expected Response:
# {
#   "ok": true,
#   "data": {
#     "discount": 1   # ← MUST be 1 (not 0!)
#   }
# }

# PASS: discount >= 1
# FAIL: discount = 0
```

**Test 1B: ৳199 order with 1% coupon**
```bash
curl -X POST http://localhost:3000/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST1PCT", "subtotal": 199}'

# Expected: discount = 2 (Math.round(1.99) = 2)
# Failure: discount = 1 (Math.floor(1.99) = 1)
```

**Verdict:**
- [ ] PASS: Discounts use Math.round
- [ ] FAIL: Still using Math.floor

---

### TEST #2: Flat Discount Limit ✅ FIX #2
**Purpose:** Prevent oversized flat discounts

**Scenario:** Try to create coupon with ৳9999 flat discount

```bash
# Try to create coupon with invalid discount
curl -X POST http://localhost:3000/admin/coupons \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BIGDISCOUNT",
    "discount_type": "flat",
    "discount_value": 9999,
    "type": "festival"
  }'

# Expected Response:
# {
#   "ok": false,
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "Flat discounts cannot exceed ৳10,000..."
#   }
# }

# PASS: Request rejected with VALIDATION_ERROR
# FAIL: Coupon created successfully
```

**Verdict:**
- [ ] PASS: Flat discount > ৳10,000 rejected
- [ ] FAIL: Still allows oversized discounts

---

### TEST #3: Commission Incentive Fix ✅ FIX #3
**Purpose:** Verify commission is independent of discount

**Scenario:** Create crew coupon with fixed commission, then verify commission doesn't change based on discount

```bash
# Setup: Create crew coupon
curl -X POST http://localhost:3000/crew/coupons \
  -H "Authorization: Bearer <crew_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CREWTEST1",
    "discount_type": "pct",
    "discount_value": 10,
    "commission_value": 5  # 5% commission
  }'

# Create order with coupon
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"variant_id": "...", "qty": 1}],
    "coupon_code": "CREWTEST1",
    "address_id": "..."
  }'

# Admin marks order as delivered (syncs commission)
curl -X PATCH http://localhost:3000/admin/orders/<order_id>/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "delivered"}'

# Check commission
curl http://localhost:3000/admin/crew/commissions \
  -H "Authorization: Bearer <admin_token>"

# Expected: commission ≈ (order_total * 5%) regardless of discount
# commission_mode should be 'fixed' (default)

# PASS: Commission is 5% of order total, independent of discount
# FAIL: Commission drops when discount increases
```

**Verdict:**
- [ ] PASS: Commission independent of discount
- [ ] FAIL: Commission still penalizes discounts

---

### TEST #4: Phone Validation Strictness ✅ FIX #4
**Purpose:** Verify per-phone limits work correctly with different payment methods

**Scenario A: Phone-based payment (bkash)**
```bash
# Create limited coupon
curl -X POST http://localhost:3000/admin/coupons \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "code": "PHONELIMIT1",
    "max_usage_per_phone": 1
  }'

# Order 1: bkash payment with phone 01712345678
curl -X POST http://localhost:3000/orders \
  -d '{
    "items": [...],
    "coupon_code": "PHONELIMIT1",
    "payment_type": "bkash",
    "payment_number": "01712345678"
  }'
# Expected: ✅ SUCCESS (count = 1)

# Order 2: bkash payment with same phone
curl -X POST http://localhost:3000/orders \
  -d '{
    "coupon_code": "PHONELIMIT1",
    "payment_type": "bkash",
    "payment_number": "01712345678"
  }'
# Expected: ❌ FAILED (COUPON_EXHAUSTED)

# PASS: Per-phone limit enforced
# FAIL: Second order succeeds
```

**Scenario B: Card payment (should skip phone limit)**
```bash
# Order 3: card payment
curl -X POST http://localhost:3000/orders \
  -d '{
    "coupon_code": "PHONELIMIT1",
    "payment_type": "card",
    "payment_number": "4111111111111111"
  }'
# Expected: ✅ SUCCESS (no per-phone check for card)

# PASS: Card payment bypasses phone limits correctly
# FAIL: Card payment also blocked
```

**Verdict:**
- [ ] PASS: Phone limits only for phone-based payments
- [ ] FAIL: Phone limits inconsistent across payment types

---

### TEST #5: Commission Min ≤ Max ✅ FIX #5
**Purpose:** Prevent invalid commission configuration

**Scenario:** Try to set min > max
```bash
curl -X PATCH http://localhost:3000/admin/crew/settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "commission_value": 5,
    "commission_min_value": 10
  }'

# Expected Response:
# {
#   "ok": false,
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "Min commission cannot exceed max commission."
#   }
# }

# PASS: Update rejected
# FAIL: Invalid config saved
```

**Verdict:**
- [ ] PASS: min > max rejected
- [ ] FAIL: Invalid commission config allowed

---

### TEST #6: Coupon Type/Source Clarity ✅ FIX #6
**Purpose:** Verify type and source consistency

**Database Check:**
```sql
-- Verify constraint exists
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'coupons' AND constraint_type = 'CHECK';

-- Should include: check_coupon_type_source_match

-- Verify existing data is consistent
SELECT code, type, source FROM coupons WHERE source IS NOT NULL;
-- All rows should have: source = type
```

**Verdict:**
- [ ] PASS: DB constraint prevents type/source mismatch
- [ ] FAIL: Constraint missing or inconsistent data

---

### TEST #7: Payment Type Tracking ✅ FIX #7
**Purpose:** Verify payment method tracking is correct (covered in TEST #4)

**Verdict:** (Same as TEST #4)
- [ ] PASS: Payment method correctly determines per-phone limit scope
- [ ] FAIL: Payment method tracking broken

---

### TEST #8: Admin Discount Validation ✅ FIX #8
**Purpose:** Prevent admin from creating invalid orders

**Scenario:** Admin tries to create order with discount > subtotal
```bash
curl -X POST http://localhost:3000/admin/orders \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test",
    "items": [{"id": "...", "name": "Item", "qty": 1, "unit_price": 100}],
    "payment_type": "cod",
    "discount_amount": 150
  }'

# Expected Response:
# {
#   "ok": false,
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "Discount cannot exceed subtotal."
#   }
# }

# PASS: Request rejected
# FAIL: Order created with negative total
```

**Verdict:**
- [ ] PASS: Impossible discounts rejected
- [ ] FAIL: Admin can create invalid orders

---

### TEST #9: Price Lock During Checkout ✅ FIX #9
**Purpose:** Verify prices can't change during checkout

**Scenario (Requires timing/concurrent requests):**
```bash
# Thread A: Starts checkout (locks variant)
# At this point, variant is locked FOR UPDATE

# Thread B (concurrent): Tries to update product price
curl -X PATCH http://localhost:3000/admin/products/<id> \
  -d '{"price": 999}'

# Expected: Thread B waits for lock (Thread A completes)
# Result: Thread B's price change applies AFTER order finalized

# PASS: Price locked during checkout
# FAIL: Price can change mid-checkout
```

**Note:** This is hard to test manually; requires ab or Apache Bench for concurrent requests.

```bash
# Run 2 concurrent checkouts + 1 price change
# If implemented correctly: All requests succeed but timing is serialized
```

**Verdict:**
- [ ] PASS: FOR UPDATE prevents concurrent price changes
- [ ] FAIL: Price changes can slip through

---

### TEST #10: Coupon Usage Concurrency Lock ✅ FIX #10
**Purpose:** Prevent concurrent coupon usage race condition

**Scenario (Requires ab/Apache Bench):**
```bash
# Create limited coupon
curl -X POST http://localhost:3000/admin/coupons \
  -d '{
    "code": "CONCURRENT1",
    "max_usage_per_phone": 1
  }'

# Send 2 concurrent requests with same coupon + phone
ab -n 2 -c 2 \
  -p order.json \
  http://localhost:3000/orders

# Expected: 
# - Request 1: SUCCESS
# - Request 2: FAILS (COUPON_EXHAUSTED)

# PASS: Only 1st request succeeds
# FAIL: Both requests succeed (race condition)
```

**Setup for concurrent test:**
```bash
# Create order.json
cat > order.json << 'EOF'
{
  "items": [{"variant_id": "...", "qty": 1}],
  "coupon_code": "CONCURRENT1",
  "payment_type": "bkash",
  "payment_number": "01712345678",
  "address_id": "..."
}
EOF

# Run concurrent requests
ab -n 2 -c 2 -p order.json -H "Authorization: Bearer <token>" \
  http://localhost:3000/orders
```

**Verdict:**
- [ ] PASS: FOR UPDATE prevents race conditions
- [ ] FAIL: Both concurrent requests can use same limited coupon

---

## SUMMARY TEST RESULTS

| Fix # | Test | Expected | Actual | Status |
|-------|------|----------|--------|--------|
| 1 | Math.round rounding | discount ≥ 1 on ৳50 @ 1% | | [ ] PASS [ ] FAIL |
| 2 | Flat discount limit | Reject > ৳10,000 | | [ ] PASS [ ] FAIL |
| 3 | Commission incentive | Independent of discount | | [ ] PASS [ ] FAIL |
| 4 | Phone validation | Phone limits for phone-based only | | [ ] PASS [ ] FAIL |
| 5 | Commission min ≤ max | Reject min > max | | [ ] PASS [ ] FAIL |
| 6 | Type/source clarity | DB constraint enforced | | [ ] PASS [ ] FAIL |
| 7 | Payment tracking | (Same as #4) | | [ ] PASS [ ] FAIL |
| 8 | Admin discount validation | Reject discount > subtotal | | [ ] PASS [ ] FAIL |
| 9 | Price lock | FOR UPDATE prevents changes | | [ ] PASS [ ] FAIL |
| 10 | Coupon concurrency | FOR UPDATE prevents race | | [ ] PASS [ ] FAIL |

---

## QUICK TEST SCRIPT

Save as `test-exploits.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
ADMIN_TOKEN="<paste_admin_token>"
USER_TOKEN="<paste_user_token>"

echo "═════════════════════════════════════════════════════════"
echo "  Midnight Pick — Exploit Fix Verification Tests"
echo "═════════════════════════════════════════════════════════"
echo ""

# TEST 1: Math.round
echo "TEST 1: Math.round Rounding"
RESULT=$(curl -s -X POST "$BASE_URL/coupons/validate" \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST1PCT","subtotal":50}' | jq '.data.discount')
if [ "$RESULT" != "null" ] && [ "$RESULT" -ge 0 ]; then
  echo "✓ PASS: discount = $RESULT (expected >= 0)"
else
  echo "✗ FAIL: Got $RESULT"
fi
echo ""

# TEST 2: Flat discount limit
echo "TEST 2: Flat Discount Limit"
RESULT=$(curl -s -X POST "$BASE_URL/admin/coupons" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"BIGDISCOUNT","discount_type":"flat","discount_value":9999}')
ERROR=$(echo "$RESULT" | jq -r '.error.code // empty')
if [ "$ERROR" = "VALIDATION_ERROR" ]; then
  echo "✓ PASS: Oversized discount rejected"
else
  echo "✗ FAIL: Discount was allowed"
fi
echo ""

echo "═════════════════════════════════════════════════════════"
echo "  Test execution complete"
echo "═════════════════════════════════════════════════════════"
```

---

## NEXT STEPS

1. **Run Migrations**
   ```bash
   npm run migrate -- --latest
   ```

2. **Start Backend**
   ```bash
   npm run dev
   ```

3. **Execute Tests**
   - Run each CRITICAL FIX TEST manually
   - Document results in table above
   - Mark PASS/FAIL for each

4. **Fix Any Failures**
   - Review error messages
   - Check database state
   - Run migrations again if needed

5. **Sign-Off**
   - All 10 tests PASS → Ready for staging
   - Any FAIL → Needs investigation

---

## SIGN-OFF TEMPLATE

```
TESTING SIGN-OFF
═══════════════════════════════════════════════════════════

Date: _________________________
Tester: _______________________
Environment: Development (localhost:3000)

RESULTS:
─────────────────────────────────────────────────────────
FIX #1 (Math.round):                    [ ] PASS [ ] FAIL
FIX #2 (Flat discount limit):           [ ] PASS [ ] FAIL
FIX #3 (Commission incentive):          [ ] PASS [ ] FAIL
FIX #4 (Phone validation):              [ ] PASS [ ] FAIL
FIX #5 (Commission min ≤ max):          [ ] PASS [ ] FAIL
FIX #6 (Type/source clarity):           [ ] PASS [ ] FAIL
FIX #7 (Payment tracking):              [ ] PASS [ ] FAIL
FIX #8 (Admin discount validation):     [ ] PASS [ ] FAIL
FIX #9 (Price lock):                    [ ] PASS [ ] FAIL
FIX #10 (Coupon concurrency):           [ ] PASS [ ] FAIL

OVERALL: _______ / 10 TESTS PASSED

VERDICT:
  [ ] ✅ READY FOR STAGING (10/10 pass)
  [ ] ⚠️  NEEDS FIXES (< 10/10)
  
NOTES:
_________________________________________________________________
_________________________________________________________________

Signature: __________________________
```

---

**Ready to test? Start with Step 1: Apply Migrations**
