# Steadfast Integration — Testing Guide

## Prerequisites

1. **Environment variables** set in `backend/.env`:
   ```
   STEADFAST_API_KEY=your_api_key
   STEADFAST_SECRET_KEY=your_secret_key
   STEADFAST_WEBHOOK_BEARER_TOKEN=your_webhook_token
   ```

2. **Database migrations** applied:
   - `029_steadfast_integration.sql` — adds steadfast_consignment_id column and new statuses
   - `030_sms_steadfast_templates.sql` — adds SMS templates

3. **Webhook callback** configured in Steadfast merchant panel:
   - URL: `https://yourdomain.com/webhooks/steadfast`
   - Method: POST
   - Bearer Token: matches `STEADFAST_WEBHOOK_BEARER_TOKEN`

---

## Test Flow

### 1. Create a Test Order
- Go to Admin Dashboard → Orders
- Create a new order or use an existing one
- Ensure order has:
  - Valid customer phone (11 digits, starts with 01)
  - Valid delivery address
  - Status: `processing` → `packed` (mark as packaged first)

### 2. Handoff to Steadfast (Phase 1)
- Click on the order to open details panel
- Status should show `packed`
- Click **"Handoff to Steadfast"** button
- Expected outcomes:
  - ✅ Steadfast API called with order details
  - ✅ Order status changes to `shipped`
  - ✅ `steadfast_consignment_id` appears in the panel
  - ✅ SMS sent to customer: "Order #MP-XXXX has shipped via Steadfast..."
  - ✅ Tracking event logged: step=`shipped`, detail includes consignment ID

**Debugging if it fails:**
- Check browser console for error message
- Verify:
  - Phone number is valid BD format (01XXXXXXXXX)
  - Address is not empty
  - Steadfast API credentials are correct
  - Network connectivity to Steadfast API
- Check backend logs for details

### 3. Simulate Webhook Events (Phase 2)
Use `curl` or Postman to send test webhook payloads:

**Test: Parcel In-Transit**
```bash
curl -X POST http://localhost:3000/webhooks/steadfast \
  -H "Authorization: Bearer your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": "MP-1024",
    "consignment_id": 1424107,
    "status": "in_transit",
    "tracking_code": "15BAEB8A",
    "note": "Picked up and in transit"
  }'
```

Expected: Order stays `shipped`, tracking event logged

**Test: Parcel Delivered**
```bash
curl -X POST http://localhost:3000/webhooks/steadfast \
  -H "Authorization: Bearer your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": "MP-1024",
    "consignment_id": 1424107,
    "status": "delivered",
    "tracking_code": "15BAEB8A"
  }'
```

Expected:
- ✅ Order status changes to `delivered`
- ✅ SMS sent to customer: "Order #MP-1024 has been delivered. Thank you!"
- ✅ Points awarded (if user has account)
- ✅ Commission synced (if crew order)

**Test: Delivery Failed**
```bash
curl -X POST http://localhost:3000/webhooks/steadfast \
  -H "Authorization: Bearer your_webhook_token" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice": "MP-1024",
    "consignment_id": 1424107,
    "status": "undeliverable",
    "note": "Customer not available"
  }'
```

Expected:
- ✅ Order status changes to `delivery_failed`
- ✅ SMS sent to customer: "There was an issue delivering Order #MP-1024..."
- ✅ Tracking event logged

### 4. Test Refresh Status (Manual Polling)
- After handoff, order should show `shipped` status
- Click **"Refresh Steadfast Status"** button
- Expected: Queries Steadfast API and updates status if changed

### 5. Test Public Tracking Page
- Open `/track` on the frontend
- Enter order reference (e.g., MP-1024)
- Expected:
  - ✅ Shows all tracking steps
  - ✅ Displays Steadfast consignment ID (if handoff occurred)
  - ✅ Updates as webhooks come in

---

## Common Issues & Solutions

### "Order must be in 'packed' status"
- Ensure you marked the order as packaged first
- Flow: `processing` → `packed` → `shipped` (via handoff)

### "Phone number validation failed"
- Phone must be valid BD format: 11 digits starting with 01
- Example: 01712345678
- Check that phone is stored correctly in the order

### "Steadfast API connection error"
- Verify API credentials are correct in `.env`
- Check Steadfast API is accessible (not blocked by firewall)
- Test with Postman against Steadfast API directly

### Webhook not triggering order update
- Verify Bearer token in webhook matches `STEADFAST_WEBHOOK_BEARER_TOKEN`
- Check that invoice matches our order reference (MP-XXXX)
- Verify webhook URL is publicly accessible
- Check backend logs for webhook receipt and processing

### SMS not sending
- Verify SMS gateway is configured (see SMS_TEST_GUIDE.md)
- Check SMS rate limits not exceeded
- SMS failures don't block handoff or webhook — they log warnings

---

## Rollback Procedure

If issues occur, you can:

1. **Manually reset order status:**
   ```sql
   UPDATE orders SET status = 'packed', steadfast_consignment_id = NULL 
   WHERE order_ref = 'MP-XXXX';
   ```

2. **Clear tracking events:**
   ```sql
   DELETE FROM order_tracking WHERE order_id = (SELECT id FROM orders WHERE order_ref = 'MP-XXXX');
   ```

3. **Restart webhooks:**
   - Contact Steadfast support to resend webhook events

---

## Production Checklist

Before going live:

- [ ] API credentials validated
- [ ] Webhook token set and verified
- [ ] SMS gateway configured and tested
- [ ] Database migrations applied
- [ ] Test order flow end-to-end
- [ ] Monitor logs during initial usage
- [ ] Set up alerting for failed handoffs
- [ ] Document Steadfast support contact info
