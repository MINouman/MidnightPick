# SMS Messages — Quick Edit Guide

## Where to Edit

**Admin Dashboard → SMS → SMS Message Templates** (at the bottom)

## Default Messages

### OTP Message
```
Your Midnight Pick OTP is: {OTP_CODE}. Valid for 5 minutes.
```
**Variables:** `{OTP_CODE}`

### Order Confirmation Message
```
Midnight Pick: Order #{ORDER_REF} placed! Total: ৳{TOTAL}. We'll call you shortly to confirm delivery. Thank you!
```
**Variables:** `{ORDER_REF}`, `{TOTAL}`

## How to Edit

1. Open Admin Dashboard
2. Click **SMS** in sidebar
3. Scroll down to **SMS Message Templates**
4. Click **Edit** on the message you want to change
5. Modify text (keep `{VARIABLES}` as-is)
6. Click **Save**
7. Test by requesting OTP or placing an order

## Examples

### OTP Variations
```
"Your OTP is: {OTP_CODE}"

"Verify with code: {OTP_CODE}"

"One-time password: {OTP_CODE} (5 min validity)"
```

### Order Confirmation Variations
```
"Order #{ORDER_REF} confirmed for ৳{TOTAL}"

"Thank you! Order {ORDER_REF} | Amount: ৳{TOTAL}"

"Order {ORDER_REF} received. Total: ৳{TOTAL}. We'll confirm delivery shortly."
```

## Rules

✓ Keep `{VARIABLES}` exactly as shown  
✓ Variables are case-sensitive  
✓ Keep messages short (160 chars max)  
✗ Don't delete/change variable names  

## Test It

After editing:
1. Go to login page → Request OTP → Check phone
2. Place an order → Check order confirmation SMS

Message will use your new custom text with variables filled in automatically.

---

**That's it!** Messages are now customizable without touching code.
