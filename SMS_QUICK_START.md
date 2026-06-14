# SMS Integration — Quick Start Guide

## What Was Built

A production-ready SMS API integration with:
- **Balance tracking** (real-time API calls + 5-min cache)
- **Rate limiting** (per-phone and per-device OTP limits)
- **Admin dashboard** (config, balance, usage stats, logs)
- **Full audit logging** (every SMS tracked)

## Setup Steps

### 1. Add Environment Variables

```bash
# In your .env file:
SMS_API_URL=https://bulksmsbd.net/api/smsapi
SMS_API_KEY=your_actual_api_key_from_bulksmsbd
SMS_SENDER_ID=MidnightPick
SMS_BALANCE_API_URL=https://bulksmsbd.net/api/getBalanceApi
```

### 2. Restart Backend

Database migration `027_sms_configuration.sql` runs automatically:
```
$ npm run dev  # or your start command
[migrate] apply 027_sms_configuration.sql …
[migrate] done  027_sms_configuration.sql
```

### 3. Configure in Admin Dashboard

1. Open admin dashboard → **SMS** (new sidebar section)
2. Click **Edit** button
3. Enter your BulkSMSBD credentials (from above)
4. Click **Save**

Done! SMS is ready.

## How It Works

### OTP Flow
1. User requests OTP → Backend generates 6-digit code
2. Rate limit check: max 3 per 10 minutes per phone
3. In dev: OTP printed to console
4. In production: SMS sent via gateway
5. User enters OTP to verify

### Rate Limiting
```
OTP (per phone): 3 requests / 10 minutes
OTP (per device): 5 requests / hour  
General SMS: 10 requests / hour
```

Gets 429 error if exceeded with remaining wait time.

### Balance Tracking
- Dashboard shows real-time balance
- Auto-refreshes every 5 minutes
- Manual refresh button available
- All SMS logged for audit

## Admin Dashboard Features

### Balance Card
- Current balance display
- "Refresh" button (forces API call)
- Shows last update timestamp

### Configuration
- Edit API endpoint, key, sender ID
- Save/cancel buttons
- View current settings (key hidden)

### Usage Statistics
- Last 7 days SMS volume
- Daily breakdown by type
- Total SMS sent count

### SMS Logs
- Browse all SMS with filters
- By type: OTP, order_confirmation, general
- By status: sent, failed, pending
- Phone number, timestamp, message preview

## Testing

### Development Mode
```bash
# Request OTP in auth flow
# Check terminal output:
╔════════════════════════════╗
║  OTP for 01700000000: 123456  ║
╚════════════════════════════╝
```

SMS send is simulated (not actually sent).

### Production Mode
1. Ensure SMS_API_KEY is set
2. Navigate to SMS dashboard
3. Enter real credentials and save
4. Test: request OTP → check SMS logs
5. Should see "sent" status with timestamp

## Common Issues

| Issue | Solution |
|-------|----------|
| "SMS gateway not configured" | Click SMS → Edit → Save credentials |
| "Balance Validity Not Available" | SMS balance is 0, recharge account |
| Rate limit errors | Check Redis is running |
| SMS not received | Check phone number format (017XXXXXXXX) |

## API Examples

### Get Balance
```bash
curl -X GET \
  http://localhost:3000/api/v1/admin/sms/balance?refresh=true \
  -H "Cookie: mp_access_token=YOUR_TOKEN"

# Response:
{
  "ok": true,
  "data": {
    "balance": 250.50,
    "cached": false,
    "cachedAt": "2026-06-13T14:30:00Z"
  }
}
```

### Get Usage Stats
```bash
curl -X GET \
  "http://localhost:3000/api/v1/admin/sms/usage?days=7" \
  -H "Cookie: mp_access_token=YOUR_TOKEN"

# Response:
{
  "ok": true,
  "data": {
    "period": "7 days",
    "totalSms": 145,
    "byDate": [
      {
        "date": "2026-06-13",
        "total": 28,
        "byType": {"otp": 20, "order_confirmation": 8},
        "byStatus": {"sent": 28, "failed": 0}
      }
    ]
  }
}
```

## Rate Limits in Detail

### OTP Protection
- **Global**: 3 OTP per 10 minutes per phone
  - Prevents brute force on single number
- **Device**: 5 OTP per hour per device
  - Prevents rapid device-based attacks
  - Uses device fingerprint (IP + User-Agent)

### When Rate Limit Hits
```bash
# HTTP 429 response
{
  "ok": false,
  "error": {
    "code": "SMS_RATE_LIMIT",
    "message": "Too many OTP requests. Please wait before trying again."
  }
}
```

## Files Changed

**New:**
- `backend/src/services/sms-config.js` (balance tracking)
- `backend/src/services/sms-rate-limit.js` (rate limiting)
- `backend/src/db/migrations/027_sms_configuration.sql` (schema)
- `SMS_IMPLEMENTATION.md` (detailed docs)

**Modified:**
- `backend/src/services/sms.js` (rate limiting + logging)
- `backend/src/services/otp.js` (production SMS sending)
- `backend/src/routes/admin.js` (5 new SMS endpoints)
- `backend/src/app.js` (error codes)
- `backend/src/config/env.js` (SMS env vars)
- `dashboard-admin.jsx` (SMS management UI)

## Architecture

```
┌─ Frontend (dashboard-admin.jsx)
│  └─ SMS Management section
│     ├─ Balance display + refresh
│     ├─ Config editor
│     ├─ Usage stats
│     └─ Log viewer
│
├─ Backend Routes (/admin/sms/*)
│  ├─ GET /balance
│  ├─ GET /settings
│  ├─ PATCH /settings
│  ├─ GET /usage
│  └─ GET /logs
│
├─ SMS Services
│  ├─ sms.js
│  │  ├─ checkRateLimit()
│  │  └─ sendSms()
│  ├─ sms-config.js
│  │  ├─ getBalance()
│  │  ├─ saveConfig()
│  │  └─ logSms()
│  └─ sms-rate-limit.js
│     └─ Redis-based rate limit
│
├─ Database
│  ├─ sms_config (credentials + balance)
│  ├─ sms_log (audit trail)
│  └─ sms_rate_limits (future use)
│
└─ External (BulkSMSBD)
   ├─ Send API
   └─ Balance API
```

## Next Steps (Optional Enhancements)

- [ ] Queue SMS using BullMQ for reliability
- [ ] Webhook for delivery status
- [ ] SMS templates
- [ ] Multi-gateway fallback
- [ ] Cost tracking/budget alerts
- [ ] WhatsApp alongside SMS

## Support

See `SMS_IMPLEMENTATION.md` for:
- Detailed error codes
- Security considerations
- Multi-gateway setup
- Testing procedures
- Monitoring tips
