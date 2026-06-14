# SMS Message Customization — Complete Summary

## Where to Edit SMS Messages

**Admin Dashboard → SMS → SMS Message Templates** (bottom section)

## Default Messages

### OTP Message
```
Your Midnight Pick OTP is: {OTP_CODE}. Valid for 5 minutes.
```
**Variables:** `{OTP_CODE}` (6-digit code)

### Order Confirmation Message
```
Midnight Pick: Order #{ORDER_REF} placed! Total: ৳{TOTAL}. 
We'll call you shortly to confirm delivery. Thank you!
```
**Variables:** 
- `{ORDER_REF}` = Order reference (e.g., ABC123)
- `{TOTAL}` = Order total in BDT

## How to Edit (3 Steps)

1. Admin Dashboard → Click **SMS** in sidebar
2. Scroll down to **SMS Message Templates** section
3. Click **Edit** on the message you want to change
4. Modify text (keep `{VARIABLES}` as-is)
5. Click **Save**

## Customization Examples

**OTP Options:**
- "Your OTP is: {OTP_CODE}"
- "Verify with code: {OTP_CODE}"
- "Security code: {OTP_CODE} (5 minutes)"

**Order Options:**
- "Order #{ORDER_REF} confirmed for ৳{TOTAL}"
- "Thank you! Order {ORDER_REF} | Total: ৳{TOTAL}"
- "Order {ORDER_REF} received (৳{TOTAL}). Delivery call coming."

## Testing

After editing, test immediately:
1. **OTP Test:** Go to login → Request OTP → Check phone
2. **Order Test:** Place an order → Check confirmation SMS

Your custom message will appear with variables filled in automatically.

## Important Rules

✓ Keep `{VARIABLE_NAMES}` exactly as shown  
✓ Variables are case-sensitive  
✓ Keep messages under 160 characters  
✗ Don't modify or remove variables  

## Locations

- **Edit UI:** Admin Dashboard SMS section
- **Database:** `sms_templates` table
- **Code:** `backend/src/services/sms-templates.js`
- **Routes:** `GET/PATCH /admin/sms/templates`

That's all you need to know to customize SMS messages!
