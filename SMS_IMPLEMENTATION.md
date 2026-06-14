# SMS API Integration — Implementation Guide

## Overview

This implementation provides:
- SMS sending with BulkSMSBD or compatible gateways
- SMS balance tracking and caching
- Rate limiting for OTP and general SMS
- Device-based OTP limiting to prevent abuse
- Admin dashboard for configuration and monitoring
- Comprehensive SMS logging for audit trails

## Configuration

### 1. Set Environment Variables

Add to your `.env` file:

```bash
# SMS Gateway (BulkSMSBD example)
SMS_API_URL=https://bulksmsbd.net/api/smsapi
SMS_API_KEY=your_api_key_here
SMS_SENDER_ID=MidnightPick
SMS_BALANCE_API_URL=https://bulksmsbd.net/api/getBalanceApi

# Optional: Rate limit configuration
SMS_RATE_LIMIT_OTP_GLOBAL=3      # Max 3 OTP per phone per 10 minutes
SMS_RATE_LIMIT_OTP_DEVICE=5      # Max 5 OTP per device per hour
SMS_RATE_LIMIT_GENERAL=10        # Max 10 general SMS per phone per hour
```

### 2. API Gateway Configuration

The SMS gateway should support query-string based API:

**Send SMS:**
```
GET/POST https://api.gateway.com/send?api_key=X&senderid=Y&number=Z&message=M
```

**Check Balance:**
```
GET/POST https://api.gateway.com/balance?api_key=X

Response format:
{
  "balance": 500.50,
  "currency": "BDT",
  "status": "success"
}
```

### 3. Database Migrations

The migration `027_sms_configuration.sql` creates:
- `sms_config` — SMS gateway settings (API keys, balance)
- `sms_log` — SMS delivery audit log
- `sms_rate_limits` — Rate limiting tracking

Migrations run automatically on app startup.

## Backend Services

### SMS Service (`backend/src/services/sms.js`)

**sendSms(phone, message, smsType, deviceFingerprint)**
- Checks rate limits
- Logs SMS in database
- Calls gateway API
- Throws `SMS_RATE_LIMIT` or `SMS_SEND_FAILED`

**sendOrderConfirmation(phone, orderRef, total)**
- Sends order confirmation SMS
- Tracked as `order_confirmation` type

**sendOtp(phone, otp, deviceFingerprint)**
- Sends OTP message
- Uses device fingerprint for per-device limiting

### SMS Config Service (`backend/src/services/sms-config.js`)

**getBalance(forceRefresh)**
- Returns cached balance if < 5 minutes old
- Fetches fresh balance on refresh
- Caches in database

**getUsageStats(days)**
- Returns SMS counts by type/status/date
- Useful for reporting

**logSms(phone, message, smsType, status)**
- Audit logging for all SMS

### Rate Limiting Service (`backend/src/services/sms-rate-limit.js`)

**checkRateLimit(phone, smsType, deviceFingerprint)**
- OTP: Max 3 per phone per 10 minutes
- OTP: Max 5 per device per hour
- General: Max 10 per phone per hour
- Uses Redis for fast in-memory tracking
- Falls back gracefully if Redis unavailable

## Admin Routes

### GET `/admin/sms/balance?refresh=true`
- `refresh=true`: Force fresh API call
- Returns balance and cache timestamp

### GET `/admin/sms/settings`
- Returns current SMS configuration (API key not exposed)

### PATCH `/admin/sms/settings`
```json
{
  "apiUrl": "https://api.gateway.com/send",
  "apiKey": "secret_key",
  "senderId": "Brand",
  "balanceApiUrl": "https://api.gateway.com/balance"
}
```

### GET `/admin/sms/usage?days=7`
- Returns SMS count by date/type/status
- Aggregated statistics

### GET `/admin/sms/logs?type=otp&status=sent&page=1&limit=50`
- SMS log browser
- Filter by type, status, pagination

## Frontend Dashboard

**SMS Management Section:**
- Real-time balance display with refresh button
- Configuration editor (dev/admin only)
- Usage statistics (last 7 days)
- SMS log viewer with filtering

## Rate Limiting Strategy

### OTP Rate Limiting (Phone-level)
- **Global**: 3 OTP requests per 10 minutes per phone number
- **Device**: 5 OTP requests per hour per device fingerprint
- **Reason**: Prevents brute force OTP requests and device-level attacks

### Device Fingerprinting
Device fingerprint can be derived from:
- User-Agent + IP address (server-side)
- Browser fingerprint (client-side)
- Device ID + Browser ID (mobile apps)

Example in auth endpoint:
```javascript
const deviceFingerprint = `${req.ip}:${req.headers['user-agent']}`;
await sendOtp(phone, otp, deviceFingerprint);
```

### General SMS Rate Limiting
- **Global**: 10 SMS per hour per phone number
- **Reason**: Prevents bulk SMS spam

## Error Handling

### Rate Limit Exceeded
- HTTP 429: Too Many Requests
- Message: "Too many OTP requests. Please wait before trying again."

### SMS Send Failed
- HTTP 503: Service Unavailable
- Usually due to:
  - Gateway API down
  - Invalid API credentials
  - Insufficient balance
  - Invalid phone number

### Configuration Missing
- HTTP 503: Service Unavailable
- Admin must configure SMS gateway first

## Monitoring & Debugging

### SMS Log Levels

**Development:**
- OTP codes logged to console
- SMS sends simulated (not actually sent)
- All requests logged

**Production:**
- OTP messages sent via SMS
- Gateway responses logged only on errors
- SMS logs stored in database for audit

### Balance Cache

- Refreshes every 5 minutes automatically
- Manual refresh available in admin dashboard
- Stored in database for persistence

### Common Issues

1. **"SMS gateway not configured"**
   - Admin must save SMS settings first
   - Settings > SMS Configuration

2. **"Balance Validity Not Available" (Code 1006)**
   - SMS balance is 0 or expired
   - Recharge account with SMS provider

3. **"Sender ID not correct" (Code 1002)**
   - Verify sender ID matches gateway approval
   - Some gateways require sender ID registration

4. **Rate limit errors**
   - Check Redis connection
   - Verify rate limit environment variables
   - Check app logs for rate limit hits

## Security Considerations

1. **API Key Storage**
   - Stored in database (encrypted in production)
   - Never exposed in API responses
   - Only admins can view/edit

2. **Phone Number Validation**
   - Numbers normalized to BD format (017XXXXXXXX)
   - Invalid numbers rejected with 400 error

3. **Rate Limiting**
   - Redis-based for performance
   - Falls back to allow-all in development
   - Blocks OTP if Redis unavailable in production

4. **Audit Logging**
   - All SMS logged with phone, type, status
   - Gateway responses stored for debugging
   - Separate index on phone for compliance lookups

## Testing

### Development Mode

OTP codes printed to console:
```
╔════════════════════════════╗
║  OTP for 01700000000: 123456  ║
╚════════════════════════════╝
```

SMS send: simulated (not actually sent)

### Production Mode

1. Configure real SMS gateway credentials
2. Enable SMS sending via admin dashboard
3. Monitor balance in real-time
4. Check SMS logs for delivery status

### Rate Limit Testing

```bash
# Simulate rapid OTP requests
curl http://localhost:3000/api/v1/auth/otp-request \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone":"01700000000"}'

# Expect 429 after 3rd request within 10 minutes
```

## Future Enhancements

- [ ] Queue SMS using BullMQ for reliability
- [ ] Webhook for delivery status updates
- [ ] SMS templates with variable substitution
- [ ] Multi-gateway fallback strategy
- [ ] Cost tracking and budget alerts
- [ ] SMS marketing campaign tools
- [ ] WhatsApp integration alongside SMS

## API Response Examples

### Success: OTP Sent
```json
{
  "ok": true,
  "data": {
    "expires_in": 300
  }
}
```

### Error: Rate Limited
```json
{
  "ok": false,
  "error": {
    "code": "SMS_RATE_LIMIT",
    "message": "Too many OTP requests. Please wait before trying again."
  }
}
```

### Balance Check
```json
{
  "ok": true,
  "data": {
    "balance": 250.50,
    "cached": true,
    "cachedAt": "2026-06-13T14:30:00Z"
  }
}
```

### SMS Configuration
```json
{
  "ok": true,
  "data": {
    "apiUrl": "https://bulksmsbd.net/api/smsapi",
    "senderId": "MidnightPick",
    "balanceApiUrl": "https://bulksmsbd.net/api/getBalanceApi",
    "currentBalance": 250.50,
    "lastBalanceCheck": "2026-06-13T14:30:00Z"
  }
}
```
