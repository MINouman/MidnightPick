# Manual Order Workflow — Quick Start

## Daily Workflow for Admin

### Step 1: Customer Orders Via Messenger/WhatsApp

Customer sends you:
```
নাম: রহিম
ফোন: 01712345678
ঠিকানা: ধানমন্ডি, ঢাকা
পণ্য: মিডনাইট ব্লেন্ড ১x
```

### Step 2: Create Order in Admin Dashboard

1. Open admin dashboard at `http://localhost:3000/admin`
2. Go to **Orders** section
3. Click **"+ New Order"** button
4. Fill in the form:
   - **Customer Name:** রহিম
   - **Phone Number:** 01712345678
   - **Address:** ধানমন্ডি, ঢাকা
   - **Products:** Select "Midnight Blend" from dropdown
   - Adjust quantity if needed
   - Set **Payment Method:** Cash (COD)
   - Leave initial status as **"Processing"**
5. Click **"Create Order"** button

**Result:** Order created with ref like `MP-2026-00234`

### Step 3: Send OTP to Customer

1. Click on the order to open details panel
2. Scroll to **"Phone Verification"** section
3. Click blue button: **"Send OTP to Customer"**
4. Button shows "Sending OTP..." then returns to normal
5. You'll see message: "OTP sent to 01712345678"

**Behind the scenes:**
- System generates random 4-digit code (e.g., `3847`)
- SMS sent to customer: 
  > "Your Midnight Pick order code is 3847. Reply with this code on Messenger/WhatsApp to confirm your order."

### Step 4: Customer Replies with Code

Customer sees SMS and replies on Messenger or WhatsApp:
```
Order code: 3847
```

(You'll see this message arrive in Messenger/WhatsApp)

### Step 5: Verify OTP in Dashboard

1. Customer's message shows code: `3847`
2. Back in order details panel, under **"Phone Verification"**
3. In the 4-digit input field, type: `3847`
4. Click **"Verify"** button
5. Button shows "Verifying..." then succeeds

**Result:**
- ✅ Order status changes from "Processing" → "**Confirmed**"
- ✅ Customer receives confirmation SMS in Bangla:
  > "ধন্যবাদ! আপনার অর্ডার MP-2026-00234 কনফার্ম হয়েছে। মূল্য: ৳649। ১–৩ দিনের মধ্যে Steadfast এর মাধ্যমে পাঠানো হবে।"

### Step 6: Process Order Normally

Now order is confirmed and you can:
1. Mark as **"Packaged"** when you pack it
2. Handoff to **Steadfast** for delivery
3. Track delivery status
4. Mark as **"Delivered"** when customer receives

---

## Common Situations

### Situation 1: Customer Doesn't Reply with Code

**Within 30 minutes:**
- OTP is still valid
- Wait for customer to send code
- Then verify as normal

**After 30 minutes:**
- OTP expires
- Click "Resend OTP" button
- New code sent to customer
- Start verification again

### Situation 2: Customer Sends Wrong Code 5 Times

- System stops accepting codes
- Manually resend OTP (after 5 minutes)
- Customer tries again with new code

### Situation 3: Multiple Orders in Queue

Just repeat steps 1-6 for each order independently. Each order gets its own OTP code.

### Situation 4: You Forgot the Code

Check BulkSMSBD SMS logs to see exactly what code was sent to which phone number.

---

## Technical Details (If Needed)

### OTP Rules
- Valid for: **30 minutes**
- Code format: **4 digits** (0000-9999)
- Max failed attempts: **5**
- Min time between resends: **5 minutes**
- SMS gateway: **BulkSMSBD**

### What Happens on Verification
1. OTP code is checked against stored code in database
2. If correct: order status → "confirmed"
3. Confirmation SMS sent automatically in Bangla
4. OTP code is cleared from UI
5. Order moves to next workflow step

### Data Logged
Everything is logged for audit:
- When OTP sent and to which phone
- When OTP verified (or failed attempts)
- Confirmation SMS sent
- All timestamps recorded

---

## Troubleshooting

### OTP SMS Not Arriving

**Check:**
1. Phone number format is correct (01XXXXXXXXX)
2. BulkSMSBD has SMS balance
3. SMS configuration is correct
4. Check SMS logs in admin dashboard

**If SMS arrives late:**
- Wait a bit longer (SMS can take 10-30 seconds)
- Check Messenger/WhatsApp first

### Customer Can't Get New OTP Code

**Reasons:**
- Less than 5 minutes since last send
- Wait a few minutes, then click "Resend OTP"

### Order Won't Confirm

**Check:**
1. OTP code matches exactly (no spaces)
2. Code not expired (30 min from send time)
3. Code matches SMS that was sent

**If stuck:**
- Check error message in dashboard
- Resend OTP (new code)
- Try again

---

## Dashboard Location

**Admin Dashboard URL:**
```
http://[your-server]:3000/admin
```

**Orders Section:**
- Left sidebar → "Orders"
- Shows all orders with status
- Click order to open details

---

## SMS Templates Used

### OTP Message (English)
```
Your Midnight Pick order code is {CODE}.
Reply with this code on Messenger/WhatsApp to confirm your order.
```

### Confirmation Message (Bangla)
```
ধন্যবাদ! আপনার অর্ডার {ORDER_REF} কনফার্ম হয়েছে।
মূল্য: ৳{TOTAL}।
১–৩ দিনের মধ্যে Steadfast এর মাধ্যমে পাঠানো হবে।
```

---

## Backup Process

If SMS doesn't arrive:
1. Get the OTP code from database or check if it was logged
2. Manually contact customer: "Your order confirmation code is: XXXX"
3. Customer sends it back
4. Verify in dashboard

---

## Summary

| Step | What You Do | What Customer Sees | Result |
|------|------------|-------------------|--------|
| 1 | Customer messages order details | - | You have order info |
| 2 | Create order in dashboard | - | Order ref assigned |
| 3 | Click "Send OTP" | SMS arrives with 4-digit code | OTP sent |
| 4 | (Wait for customer reply) | Customer sees code, replies on Messenger | Customer has code |
| 5 | Enter code, click Verify | SMS arrives with confirmation | Order confirmed |
| 6 | Pack & ship order | SMS updates on delivery | Order fulfilled |

**Time to verify one order:** ~2 minutes (waiting for customer reply)

**Total orders per day:** ∞ (do as many as you like)
