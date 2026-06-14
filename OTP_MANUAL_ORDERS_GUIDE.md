# Manual Order OTP Verification — Implementation Guide

## Overview

This guide documents the **OTP-based manual order verification system** for Midnight Pick. When admins create orders via Messenger/WhatsApp, they can now:

1. Create the order in the admin dashboard
2. Send a 4-digit OTP to the customer's phone (via BulkSMSBD)
3. Customer replies with the OTP to confirm the order
4. Admin enters the OTP in the dashboard to verify
5. Order status becomes "confirmed" and confirmation SMS is sent

## Database Schema

### Orders Table Additions
```sql
-- New columns added to orders table (migration 031)
otp_code VARCHAR(10)           -- 4-digit OTP code
otp_sent_at TIMESTAMP          -- When OTP was sent
otp_verified_at TIMESTAMP      -- When OTP was verified
otp_attempts INTEGER DEFAULT 0 -- Failed verification attempts
```

### Indexes
- `idx_orders_phone_otp` — quick lookup of unverified orders by phone
- `idx_orders_unverified_otp` — quick lookup of orders with sent but unverified OTP

## API Endpoints

### 1. Send OTP to Customer
**POST** `/api/v1/admin/orders/{orderId}/send-otp`

Generates a 4-digit OTP, stores it in the database, and sends it via SMS.

**Response:**
```json
{
  "ok": true,
  "data": {
    "otp_sent": true,
    "message": "OTP sent to 01700000001",
    "order_ref": "MP-2026-001"
  }
}
```

**Rules:**
- OTP valid for 30 minutes
- Cannot send a new OTP within 5 minutes of the last send
- SMS uses template from `sms_templates` table with template name `order_otp`

### 2. Verify OTP
**POST** `/api/v1/admin/orders/{orderId}/verify-otp`

Verifies the OTP entered by the customer/admin.

**Request Body:**
```json
{
  "otp": "1234"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "verified": true,
    "message": "Order confirmed!",
    "order": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "order_ref": "MP-2026-001",
      "status": "confirmed"
    }
  }
}
```

**Rules:**
- OTP expires after 30 minutes
- Max 5 failed attempts before requiring a new OTP send
- Correct OTP automatically:
  - Updates order status to `confirmed`
  - Sends confirmation SMS in Bangla
  - Records `otp_verified_at` timestamp

### 3. Check OTP Status
**GET** `/api/v1/admin/orders/{orderId}/otp-status`

Returns the current OTP status for an order.

**Response:**
```json
{
  "ok": true,
  "data": {
    "has_otp": true,
    "otp_sent_at": "2026-06-14T06:20:00.000Z",
    "otp_verified_at": null,
    "otp_attempts": 0,
    "otp_verified": false,
    "otp_expires_in_ms": 1800000
  }
}
```

## Admin Dashboard UI

### Order Details Panel

When an order is opened in the admin dashboard:

1. **If no OTP sent yet:**
   - Shows "Send OTP to Customer" button
   - Only visible if customer has a phone number

2. **After OTP is sent:**
   - Shows when OTP was sent (with timestamp)
   - 4-digit input field for admin to enter the code
   - "Verify" button to submit the code
   - "Resend OTP" button (available after 5 minutes)

3. **After verification:**
   - Order status changes to `confirmed`
   - OTP section hidden
   - Order moves to next workflow step

## SMS Templates

The OTP system uses two SMS templates:

### 1. Order OTP Notification
**Template Name:** `order_otp`
```
Your Midnight Pick order code is {OTP_CODE}. Reply with this code on Messenger/WhatsApp to confirm your order.
```

### 2. Order Confirmation
**Template Name:** `order_confirmation`
```
ধন্যবাদ! আপনার অর্ডার {ORDER_REF} কনফার্ম হয়েছে। মূল্য: ৳{TOTAL}। ১-৩ দিনের মধ্যে Steadfast এর মাধ্যমে পাঠানো হবে।
```

## Testing the Workflow

### 1. Create a Manual Order
1. Open Admin Dashboard
2. Click "New Order" button
3. Fill in customer details:
   - Name
   - Phone number (Bengali format: 01XXXXXXXXX)
   - Address
   - Select product(s)
4. Click "Create Order"

### 2. Send OTP
1. Open the order details panel
2. Phone number should be visible
3. Click "Send OTP to Customer" button
4. You'll see confirmation that OTP was sent
5. Check BulkSMSBD panel to see the SMS in the logs

### 3. Verify OTP
1. In a real scenario, customer would reply via Messenger/WhatsApp with the code
2. Admin would see the code and enter it in the dashboard
3. Click "Verify" button
4. If correct:
   - Order status changes to "confirmed"
   - Confirmation SMS is sent to customer
   - OTP section disappears

### 4. What Happens on Verification
- Order status: `processing` → `confirmed`
- `otp_verified_at` is set to current timestamp
- Customer receives confirmation SMS in Bangla
- Admin can now proceed to pack/ship the order

## Error Handling

### Common Errors

1. **No phone number:**
   ```json
   {
     "code": "NO_PHONE",
     "message": "Customer phone number is required to send OTP."
   }
   ```

2. **OTP sent too recently:**
   ```json
   {
     "code": "OTP_SENT_RECENTLY",
     "message": "OTP already sent. Try again in 180 seconds."
   }
   ```

3. **OTP expired:**
   ```json
   {
     "code": "OTP_EXPIRED",
     "message": "OTP has expired. Request a new one."
   }
   ```

4. **Too many failed attempts:**
   ```json
   {
     "code": "TOO_MANY_ATTEMPTS",
     "message": "Too many failed attempts. Request a new OTP."
   }
   ```

5. **Invalid OTP:**
   ```json
   {
     "code": "INVALID_OTP",
     "message": "Invalid OTP. 4 attempts remaining."
   }
   ```

## SMS Configuration

OTP uses the existing SMS service configured in `sms_config.js`:

- **Gateway:** BulkSMSBD
- **Sender ID:** Configured in `sms_config` table
- **Rate Limiting:** Shared with other SMS types
- **Logging:** All OTP SMS are logged in `sms_logs` table

## Data Retention

- OTP codes are stored in the database for 30 minutes after sending
- OTP codes are cleared after successful verification
- `otp_verified_at` timestamp is retained permanently for audit trail

## Security Considerations

1. **4-digit OTP:** Not cryptographically secure, but sufficient for SMS delivery to known phone
2. **5-minute resend window:** Prevents SMS spam
3. **30-minute expiry:** Matches typical SMS OTP standards
4. **5 failed attempts:** Standard rate limiting for password attempts
5. **Phone number normalization:** Ensures consistent phone format for OTP delivery

## Integration with Existing Systems

- Uses existing SMS service (BulkSMSBD)
- Compatible with existing order status workflow
- Respects existing order validation (stock, coupons, etc.)
- Points and commission calculations work after confirmed status
- Steadfast integration works with confirmed orders

## Deployment Checklist

Before going live:

- [ ] Run migration 031: `npm run migrate`
- [ ] Verify SMS templates exist in `sms_templates` table
- [ ] Test OTP sending with a test phone number
- [ ] Verify SMS arrives at the phone number
- [ ] Test complete flow: create order → send OTP → verify → confirm
- [ ] Check SMS logs in admin dashboard
- [ ] Verify confirmation SMS is sent after OTP verification
- [ ] Test error cases (expired OTP, too many attempts, etc.)
