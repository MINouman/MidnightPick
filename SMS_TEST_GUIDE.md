# SMS Testing Guide — End-to-End

## Prerequisites

✅ SMS credentials configured in admin dashboard  
✅ BulkSMSBD account has balance (৳ 70.00)  
✅ Backend running (`npm run dev`)  
✅ Redis running  

## Test 1: OTP via SMS

### Steps

1. **Open Login Page**
   - Go to: http://localhost:5500/index.html

2. **Request OTP**
   - Enter phone number: `01700000000` (test number)
   - Click "Send OTP"

3. **Check Delivery**
   - **Terminal**: OTP printed to console
   - **SMS Dashboard**: Go to Admin → SMS → Recent SMS Logs
     - Should show SMS type: `otp`
     - Status: `sent`
     - Phone: `01700000000`
   - **Real Phone**: SMS received on actual device (if using real number)

4. **Verify in Database**
   ```bash
   # Backend terminal:
   [otp] Sending OTP via SMS gateway...
   [otp] SMS sent successfully
   ```

### Expected Result
- OTP message sent via SMS
- Entry in `sms_log` table with status: `sent`
- Balance decrements by SMS cost

---

## Test 2: Order Confirmation SMS

### Prerequisites
1. User account with saved address
2. Product in stock
3. Valid payment method

### Steps

1. **Login to Customer App**
   - Go to: http://localhost:5500/index.html
   - Use OTP login

2. **Place an Order**
   - Add product to cart
   - Enter delivery address
   - Select payment method (e.g., COD)
   - Click "Place Order"

3. **Check SMS Delivery**
   - **Terminal**: Look for success message
     ```
     [sms] send successful
     ```
   - **Admin Dashboard**: SMS section → Recent SMS Logs
     - Should see new entry with:
       - Type: `order_confirmation`
       - Status: `sent`
       - Phone: customer's number
   - **Real Phone**: Message like:
     ```
     Midnight Pick: Order #ORD-xxxxx placed! Total: ৳2500
     We'll call you shortly. Thank you!
     ```

4. **Check Database**
   ```bash
   # In psql:
   SELECT phone, sms_type, status, created_at 
   FROM sms_log 
   ORDER BY created_at DESC LIMIT 5;
   ```

---

## Test 3: Rate Limiting

### OTP Rate Limit Test (3 per 10 min per phone)

1. Request OTP for same number 3 times
2. On 4th request within 10 minutes → Get `429 Too Many Requests`
3. Wait 10 minutes, try again → Success

**Response:**
```json
{
  "ok": false,
  "error": {
    "code": "SMS_RATE_LIMIT",
    "message": "Too many OTP requests. Please wait before trying again."
  }
}
```

### Device Rate Limit Test (5 per hour per device)

1. Request OTP from same browser 5 times
2. 6th request → Get `429` error
3. Wait 1 hour, try again → Success

---

## Test 4: SMS Admin Dashboard

### Check Balance
1. Admin Dashboard → SMS → Balance Card
2. Click **Refresh**
3. Should show: `৳ 70.00` (or your account balance)
4. Time stamp updates

### View Usage Stats
1. Admin Dashboard → SMS → SMS Usage (Last 7 Days)
2. Shows:
   - Total SMS sent this week
   - Breakdown by date
   - Breakdown by type (OTP, order_confirmation)

### Browse SMS Logs
1. Admin Dashboard → SMS → Recent SMS Logs
2. Filter by:
   - Type: `otp`, `order_confirmation`, `general`
   - Status: `sent`, `failed`
3. Click pagination to see more

### Edit Configuration
1. Click **Edit** button in Configuration card
2. Verify current values
3. Can update API credentials here
4. Changes saved to database immediately

---

## Troubleshooting

### SMS Not Sending

**Check 1: Configuration**
```bash
# In admin dashboard SMS section:
- API URL should be: http://bulksmsbd.net/api/smsapi (no query params)
- Sender ID should be: 8809648908969 (full number)
- Balance API should be: http://bulksmsbd.net/api/getBalanceApi
```

**Check 2: Backend Logs**
```
# Should see:
[otp] Sending OTP via SMS gateway...
[sms-config] fetching balance from: http://bulksmsbd.net/api/getBalanceApi
[sms-config] gateway response: {"response_code":202,"balance":70}
```

**Check 3: Database**
```bash
# Check if SMS was logged:
SELECT * FROM sms_log ORDER BY created_at DESC LIMIT 1;

# Should have status: 'sent' or 'failed'
```

### Balance Shows 0

**Fix: Refresh Button**
1. Admin Dashboard → SMS
2. Click **Refresh** button on Balance card
3. Should fetch fresh balance from BulkSMSBD

### Rate Limit Not Working

**Check Redis:**
```bash
redis-cli ping
# Should return: PONG
```

**Manual reset (dev only):**
```bash
redis-cli
> KEYS sms:*
> DEL <key>
```

---

## Monitor in Real-Time

### Terminal Logging
```bash
npm run dev

# Watch for:
[otp] Sending OTP via SMS gateway...
[sms-config] fetching balance from: http://bulksmsbd.net/api/getBalanceApi
[sms-config] gateway response: ...
[otp] SMS sent successfully
```

### Database Monitoring
```bash
# Watch SMS logs (bash one-liner)
watch -n 5 'psql midnightpick_db -c "SELECT phone, sms_type, status, created_at FROM sms_log ORDER BY created_at DESC LIMIT 5;"'
```

### Admin Dashboard
- Real-time SMS logs viewer
- Usage statistics
- Balance tracking

---

## Expected Behavior Summary

| Action | SMS Type | Status | Where to See |
|--------|----------|--------|--------------|
| Request OTP | `otp` | `sent` | Admin logs, SMS_LOG table |
| Place order | `order_confirmation` | `sent` | Admin logs, SMS_LOG table |
| Rate limit hit | N/A | Error 429 | API response |
| Refresh balance | N/A | Shows ৳ 70.00 | Admin dashboard |

---

## Full End-to-End Flow

```
User → Request OTP
  ↓
OTP Service (checks rate limit)
  ↓
SMS Service (rate limit check passed)
  ↓
Gateway API (sends SMS)
  ↓
SMS Log (saved to database)
  ↓
User receives SMS
  ↓
Admin can see in dashboard
```

---

## Production Mode

When deploying to production:

1. **Set NODE_ENV=production**
   ```bash
   NODE_ENV=production npm start
   ```

2. **All SMS will be real**
   - OTP messages go to actual phone numbers
   - Order confirmations sent via SMS
   - Balance decrements on real account

3. **Rate limiting enforced**
   - Redis required (no in-memory fallback)
   - Real phone numbers only

4. **Monitoring**
   - Check admin dashboard regularly
   - Monitor balance to avoid running out
   - Set up alerts when balance low

---

## Cost Tracking

Each SMS costs money from your BulkSMSBD account:

- **OTP**: Usually ৳1-2 per SMS
- **Order Confirmation**: Usually ৳1-2 per SMS
- **Balance**: Track in admin dashboard

**Tip**: In development, SMS are logged but may not decrement balance (depends on BulkSMSBD settings). In production, balance WILL decrement.

---

## Support

If SMS not working:
1. Check backend logs for error messages
2. Verify BulkSMSBD account has balance
3. Check phone number format (017XXXXXXXX)
4. Review SMS_IMPLEMENTATION.md for detailed API info
