# OTP Manual Orders — Testing Checklist

## Pre-Testing Setup

- [ ] Database migrations applied: `npm run migrate`
- [ ] Backend running: `npm start` (port 3000)
- [ ] Admin dashboard accessible
- [ ] BulkSMSBD API configured in SMS config

## Unit Tests — API Endpoints

### Test 1: Create Manual Order
```bash
curl -X POST http://localhost:3000/api/v1/admin/orders \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "customer_phone": "01700000001",
    "address": "123 Test Road, Dhaka",
    "items": [{
      "id": "product-uuid-here",
      "name": "Midnight Blend",
      "qty": 1,
      "unit_price": 649
    }],
    "payment_type": "bKash",
    "status": "processing"
  }'
```

**Expected:**
- ✅ Status 200
- ✅ Returns order with `id`, `order_ref`, `status: "processing"`
- ✅ No `otp_code` field in response (security)

### Test 2: Send OTP
```bash
curl -X POST http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/send-otp \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected:**
- ✅ Status 200
- ✅ Response: `{ "ok": true, "data": { "otp_sent": true, "message": "OTP sent to 01700000001" } }`
- ✅ SMS appears in BulkSMSBD logs
- ✅ SMS text contains: "Your Midnight Pick order code is XXXX"

### Test 3: Check OTP Status (Before Verification)
```bash
curl -X GET http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/otp-status \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected:**
- ✅ Status 200
- ✅ `has_otp: true`
- ✅ `otp_verified: false`
- ✅ `otp_sent_at` is set
- ✅ `otp_verified_at` is null
- ✅ `otp_attempts: 0`
- ✅ `otp_expires_in_ms` shows remaining time (close to 1800000 = 30 min)

### Test 4: Verify OTP — Invalid Code (Should Fail)
```bash
curl -X POST http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/verify-otp \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"otp":"0000"}'
```

**Expected:**
- ✅ Status 400 or similar
- ✅ Error: `{ "code": "INVALID_OTP", "message": "Invalid OTP. 4 attempts remaining." }`
- ✅ Order status remains `processing`
- ✅ `otp_verified_at` stays null

### Test 5: Check OTP Status (After Failed Attempt)
```bash
curl -X GET http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/otp-status \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected:**
- ✅ `otp_attempts: 1` (incremented from the failed attempt)

### Test 6: Resend OTP (Too Soon - Should Fail)
```bash
curl -X POST http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/send-otp \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected:**
- ✅ Error: `{ "code": "OTP_SENT_RECENTLY", "message": "OTP already sent. Try again in X seconds." }`
- ✅ No SMS sent

### Test 7: Verify OTP — Correct Code (Should Succeed)
```bash
# First, get the actual OTP from the database or SMS logs
# Example: If SMS says "Your code is 1234"

curl -X POST http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/verify-otp \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"otp":"1234"}'  # Use actual OTP
```

**Expected:**
- ✅ Status 200
- ✅ Response: `{ "ok": true, "data": { "verified": true, "message": "Order confirmed!" } }`
- ✅ Order status changes to `confirmed` (check with GET /api/v1/admin/orders)
- ✅ Confirmation SMS sent to customer (should appear in BulkSMSBD logs)
- ✅ Confirmation SMS should be in Bangla

### Test 8: Check OTP Status (After Verification)
```bash
curl -X GET http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/otp-status \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected:**
- ✅ `otp_verified: true`
- ✅ `otp_verified_at` is set to a timestamp
- ✅ Order is now confirmed

### Test 9: Verify Already-Verified OTP (Should Fail)
```bash
curl -X POST http://localhost:3000/api/v1/admin/orders/<ORDER_ID>/verify-otp \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"otp":"1234"}'
```

**Expected:**
- ✅ Error: `{ "code": "ALREADY_VERIFIED", "message": "This order OTP has already been verified." }`

## UI Tests — Admin Dashboard

### Test 10: New Order Form
- [ ] Click "New Order" button
- [ ] Fill in customer name ✅
- [ ] Fill in customer phone (01700000001) ✅
- [ ] Fill in address ✅
- [ ] Select product(s) ✅
- [ ] Click "Create Order" ✅
- [ ] Order appears in list ✅
- [ ] Order status shows "Processing" ✅

### Test 11: OTP Section Visible in Order Details
- [ ] Click order to open details panel
- [ ] "Phone Verification" section visible ✅
- [ ] Blue button: "Send OTP to Customer" ✅
- [ ] Button is clickable ✅

### Test 12: Send OTP from Dashboard
- [ ] Click "Send OTP to Customer" button
- [ ] Button changes to loading state ("Sending OTP...") ✅
- [ ] After success: button changes to show OTP form
- [ ] Success message appears ✅
- [ ] Time stamp shown: "OTP sent to 01700000001 at XX:XX:XX" ✅

### Test 13: Verify OTP from Dashboard
- [ ] After OTP sent, OTP input field visible ✅
- [ ] Text field accepts input ✅
- [ ] User can type OTP code ✅
- [ ] "Verify" button available ✅
- [ ] Enter correct OTP (from SMS logs or database) ✅
- [ ] Click "Verify" ✅
- [ ] Button changes to "Verifying..." state ✅
- [ ] Success message: "Order confirmed!" ✅
- [ ] OTP section disappears ✅
- [ ] Order status changed to "Confirmed" ✅

### Test 14: Resend OTP from Dashboard
- [ ] Click "Resend OTP" button (appears after OTP sent)
- [ ] Wait 5+ minutes in test environment, or
- [ ] Check in database that timestamp is > 5 minutes old
- [ ] New OTP is generated and sent
- [ ] New SMS appears in BulkSMSBD logs

### Test 15: Order Workflow After Confirmation
- [ ] Order status: "Confirmed"
- [ ] Can mark as "Packaged" ✅
- [ ] Can handoff to Steadfast ✅
- [ ] Can track delivery status ✅
- [ ] OTP section hidden ✅

## Edge Cases

### Test 16: Order Without Phone Number
- [ ] Create order without phone number
- [ ] Open order details
- [ ] OTP section should NOT appear ✅
- [ ] Show error message if trying to send OTP

### Test 17: OTP Expiration
- [ ] Create order and send OTP
- [ ] Modify database to set `otp_sent_at` to 31 minutes ago
- [ ] Try to verify OTP
- [ ] Error: "OTP has expired. Request a new one." ✅
- [ ] Must resend OTP to continue

### Test 18: Max Failed Attempts
- [ ] Send OTP
- [ ] Try 5 times with wrong code
- [ ] On 5th attempt: "Too many failed attempts. Request a new OTP." ✅
- [ ] Cannot verify anymore until new OTP sent
- [ ] Resend button becomes available (after 5 min)

### Test 19: SMS Rate Limiting
- [ ] Create two orders with same phone number
- [ ] Send OTP to first order
- [ ] Immediately send OTP to second order
- [ ] Second request should either:
  - ✅ Queue in background, or
  - ✅ Be rate-limited by SMS service

### Test 20: Multiple Orders in Parallel
- [ ] Create 3 orders with different phone numbers
- [ ] Send OTP to each
- [ ] Verify OTP on each independently
- [ ] All should confirm successfully ✅

## Database Verification Tests

### Test 21: Check Orders Table
```sql
SELECT id, order_ref, status, customer_phone, otp_code, otp_sent_at, otp_verified_at, otp_attempts
FROM orders
ORDER BY created_at DESC
LIMIT 1;
```

**Expected after OTP sent:**
- [ ] `otp_code` populated with 4-digit code
- [ ] `otp_sent_at` has timestamp
- [ ] `otp_verified_at` is NULL
- [ ] `otp_attempts` is 0

**Expected after verification:**
- [ ] `otp_code` still populated
- [ ] `otp_verified_at` has timestamp
- [ ] `status` changed to 'confirmed'

### Test 22: Check SMS Logs
```sql
SELECT id, phone, message, sms_type, status, created_at
FROM sms_logs
WHERE sms_type IN ('order_otp', 'order_confirmation')
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- [ ] Two SMS entries per OTP flow: `order_otp` and `order_confirmation`
- [ ] Both marked as `status: 'sent'`
- [ ] OTP SMS contains code
- [ ] Confirmation SMS in Bangla

## Performance Tests

### Test 23: Load Test (10 simultaneous orders)
- [ ] Create 10 orders in quick succession
- [ ] Send OTP to all simultaneously
- [ ] All should receive SMS within 2-3 seconds
- [ ] Database should handle without errors
- [ ] No duplicate SMSs sent

### Test 24: Verify All Orders
- [ ] Verify all 10 orders with correct OTP
- [ ] All should confirm successfully
- [ ] Confirmation SMSs should be sent
- [ ] No timeouts or errors

## Security Tests

### Test 25: OTP Not in API Response
- [ ] Call GET /api/v1/admin/orders to list orders
- [ ] Check response does NOT contain `otp_code` field ✅
- [ ] OTP only stored in database, never exposed to frontend

### Test 26: Authorization Check
- [ ] Try to send OTP as non-admin user
- [ ] Should get 403 Forbidden ✅
- [ ] Try to verify OTP without admin token
- [ ] Should get 401 Unauthorized ✅

### Test 27: Phone Number Validation
- [ ] Try to send OTP with invalid phone format
- [ ] Should fail gracefully ✅
- [ ] Error message should be clear

## Cleanup & Final Steps

- [ ] All tests passed
- [ ] No errors in server logs
- [ ] All SMS successfully sent
- [ ] Database clean (no orphaned OTPs)
- [ ] Ready for deployment

## Test Environment Setup

```bash
# 1. Start fresh database
npm run migrate

# 2. Start backend
npm start

# 3. Open admin dashboard in browser
# http://localhost:3000 (or wherever frontend is served)

# 4. Create test account if needed
# Login as admin

# 5. Run tests in order
```

## Troubleshooting

**Issue:** OTP SMS not arriving
- [ ] Check SMS API credentials in `sms_config` table
- [ ] Check phone number format (should be 01XXXXXXXXX)
- [ ] Check SMS logs table for error messages
- [ ] Verify BulkSMSBD account has SMS balance

**Issue:** OTP verification fails
- [ ] Check OTP code from SMS logs matches input
- [ ] Verify timestamp is within 30 minutes
- [ ] Check failed attempts count (max 5)
- [ ] Check database for correct otp_code value

**Issue:** Order status not changing to confirmed
- [ ] Check order status in database after verify-otp call
- [ ] Check for errors in API response
- [ ] Check server logs for exceptions

**Issue:** Confirmation SMS not sent
- [ ] Verify order status is 'confirmed'
- [ ] Check SMS logs for failed confirmation SMSs
- [ ] Check if order has phone number
