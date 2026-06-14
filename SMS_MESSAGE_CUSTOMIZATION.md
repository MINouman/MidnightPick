# SMS Message Customization Guide

## Where to Edit Messages

You can customize all SMS messages directly from the **Admin Dashboard** → **SMS** section.

## Available Message Templates

### 1. OTP Code
**When it's sent:** When user requests OTP during login  
**Current message:**
```
Your Midnight Pick OTP is: {OTP_CODE}. Valid for 5 minutes.
```

**Available variables:**
- `{OTP_CODE}` — The 6-digit OTP code

**Example customizations:**
```
Verify your account: {OTP_CODE} (expires in 5 minutes)
```
```
Your one-time password is {OTP_CODE}. Keep it private!
```

### 2. Order Confirmation
**When it's sent:** Immediately after customer places an order  
**Current message:**
```
Midnight Pick: Order #{ORDER_REF} placed! Total: ৳{TOTAL}. We'll call you shortly to confirm delivery. Thank you!
```

**Available variables:**
- `{ORDER_REF}` — Order reference number (e.g., ORD-ABC123)
- `{TOTAL}` — Order total in BDT (e.g., 2500)

**Example customizations:**
```
Thanks for your order! Ref: #{ORDER_REF} | Amount: ৳{TOTAL} | Our team will call within 2 hours.
```
```
Order confirmed! #ORD-{ORDER_REF} for ৳{TOTAL}. Delivery in 24-48 hours. Thank you!
```
```
[Midnight Pick] Your order {ORDER_REF} is confirmed (৳{TOTAL}). Delivery confirmation call incoming.
```

## How to Edit Messages

### Via Admin Dashboard (Easiest)

1. **Login** to admin dashboard
2. Go to **SMS** section in sidebar
3. Scroll to **SMS Message Templates** section
4. Find the message you want to edit
5. Click **Edit**
6. Modify the text using the available `{VARIABLES}`
7. Click **Save**

### Template Editor Features

- **Message preview** in fixed-width font for clarity
- **Available variables** shown below each template
- **Character count** (SMS providers may limit to 160 chars)
- **Real-time validation** when saving

### Important Rules

✓ Always keep `{VARIABLE_NAMES}` intact  
✓ Variables are case-sensitive: `{OTP_CODE}` not `{otp_code}`  
✗ Don't remove variables that users expect  
✓ Test by requesting an OTP or placing an order  
✓ Keep messages concise (SMS has character limit)

## Database Structure

Messages are stored in `sms_templates` table:

```sql
SELECT template_type, subject, message_template, is_active
FROM sms_templates;

-- order_confirmation | Order Confirmation  | Midnight Pick: Order #... | true
-- otp              | OTP Code            | Your Midnight Pick OTP... | true
```

### Edit via SQL (Advanced)

If you prefer, edit directly in database:

```sql
UPDATE sms_templates
SET message_template = 'Your OTP: {OTP_CODE} - Do not share!'
WHERE template_type = 'otp';

-- Verify it was updated:
SELECT message_template FROM sms_templates WHERE template_type = 'otp';
```

## Adding New Templates (Future)

Currently, 2 templates are available. To add more in the future:

1. Update the migration file to add new template type
2. Add handling in `sendXyz()` function in `backend/src/services/sms.js`
3. Update admin dashboard to show new template

Examples of templates you might add later:
- `order_shipped` — "Your order has been shipped"
- `delivery_reminder` — "Your order arrives tomorrow"
- `subscription_renewal` — "Your subscription has been renewed"

## Customization Examples

### Professional Business Tone
```
Order Confirmation:
Thank you for your order! Your reference is #{ORDER_REF} with total ৳{TOTAL}. 
Our team will contact you within 1-2 hours to confirm delivery details.
```

### Casual/Friendly Tone
```
Order Confirmation:
Yay! Order #{ORDER_REF} is on the way! Total: ৳{TOTAL}. 
We'll call soon to finalize. Thanks for shopping! 🎉
```

### Minimal/Concise
```
Order Confirmation:
Order #{ORDER_REF} confirmed. Total: ৳{TOTAL}. Delivery call coming.
```

### With Call-to-Action
```
Order Confirmation:
Order #{ORDER_REF} placed! Amount: ৳{TOTAL}. 
Reply CONFIRM to confirm delivery or call 01XXXXXXXXX.
```

## Character Limits

SMS providers typically limit messages:

- **Standard SMS**: 160 characters (7-bit encoding)
- **Unicode/Bengali**: 70 characters (if using special characters)

**Check your message length:**
- Go to SMS admin section
- Your message character count displays when editing

Current messages:
- OTP: ~70 chars ✓
- Order Confirmation: ~120 chars ✓

## Testing Custom Messages

After editing a template:

1. **Request OTP** (to test OTP message):
   - Go to login page
   - Enter phone number
   - Click "Send OTP"
   - Check your phone for the updated message

2. **Place Order** (to test order confirmation):
   - Login and browse products
   - Add to cart and checkout
   - Complete order
   - Check your phone for updated confirmation message

3. **Check Admin Logs**:
   - Admin Dashboard → SMS → Recent SMS Logs
   - Verify new template was used

## Troubleshooting

### Message Not Updated
- **Solution**: Refresh browser cache with `Ctrl+Shift+Delete`
- Then go back to SMS section

### Variables Show in Message
- **Problem**: `{OTP_CODE}` appears literally in SMS
- **Cause**: Variable name misspelled or missing
- **Solution**: Check variable spelling exactly (case-sensitive)

### Message Too Long
- **Problem**: SMS split into multiple messages (costs more)
- **Solution**: Shorten message, remove unnecessary words

### Can't Edit Template
- **Problem**: "Edit" button doesn't work
- **Solution**: Check if you're logged in as admin

## Message Templates in Code

If you need to see the code structure:

**Service location:** `backend/src/services/sms-templates.js`
- `getTemplate()` — Fetch template from DB
- `renderTemplate()` — Replace variables with actual values
- `updateTemplate()` — Save changes

**How it works:**
```javascript
const template = await getTemplate('order_confirmation');
// Returns: { message_template: "Midnight Pick: Order #{ORDER_REF}..." }

const message = renderTemplate(template, {
  ORDER_REF: 'ABC123',
  TOTAL: 2500
});
// Returns: "Midnight Pick: Order #ABC123 placed! Total: ৳2500..."

await sendSms(phone, message, 'order_confirmation');
```

## Best Practices

1. **Keep it brand-consistent**
   - Use your business name consistently
   - Maintain tone across messages

2. **Be clear and concise**
   - Users read on mobile, make it scannable
   - Put important info first

3. **Include action items when needed**
   - "Call us to confirm" 
   - "Reply to verify address"
   - "Track your order at..."

4. **Test after changes**
   - Always request OTP or place test order
   - Check exact wording and formatting

5. **Comply with regulations**
   - Keep brand name in SMS (some countries require it)
   - Provide opt-out options if applicable
   - Don't use misleading language

## Example: Multi-Language (Future)

While not currently supported, you could add templates in Bengali:

```
OTP (Bengali): আপনার OTP কোড: {OTP_CODE}। ৫ মিনিটের জন্য বৈধ।

Order (Bengali): আপনার অর্ডার #{ORDER_REF} নিশ্চিত! মোট: ৳{TOTAL}। আমরা শীঘ্রই কল করব।
```

To implement this, we'd:
1. Add `language` field to `sms_templates` table
2. Modify rendering to select based on user language
3. Update admin UI to show language selector

## Support

If message templates aren't working:

1. **Check backend logs** for error messages
2. **Verify templates exist** in database: `SELECT * FROM sms_templates;`
3. **Test variable replacement** — ensure variables exactly match
4. **Check SMS logs** in admin dashboard for actual messages sent

---

**Last Updated:** June 13, 2026  
**Current Templates:** 2 (OTP, Order Confirmation)  
**Customization Level:** Full control via Admin UI
