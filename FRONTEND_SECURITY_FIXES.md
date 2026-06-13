# Frontend Security Fixes — Implementation Guide

**Priority:** HIGH  
**Time to Fix:** 2-4 hours  
**Impact:** Eliminates token theft vulnerability

---

## Issue: Auth Token Stored in localStorage

### Current Implementation (VULNERABLE)
```javascript
// shop-app.jsx:490
const token = localStorage.getItem("mp_access_token");

// Dashboard-admin.jsx uses:
window.mpApi.fetch(url, { method: 'POST', body: ... })
// which likely sends Authorization header with token
```

### Why It's Vulnerable
1. Accessible via console: `localStorage.getItem("mp_access_token")`
2. Vulnerable to XSS attacks
3. Can be stolen by malicious browser extensions
4. Not protected against CSRF

### Recommended Fix: Use httpOnly Cookies

#### Step 1: Backend Changes (Fastify)

**File:** `backend/src/routes/auth.js` (or login endpoint)

```javascript
// After successful authentication, set httpOnly cookie:
app.post('/auth/login', async (req, reply) => {
  // ... verify credentials ...
  
  const token = generateJWT(user);
  
  // Set httpOnly cookie (not accessible to JavaScript)
  reply.setCookie('mp_auth_token', token, {
    httpOnly: true,      // ← Can't access via JavaScript
    secure: true,        // ← HTTPS only
    sameSite: 'Strict',  // ← CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  });
  
  return { ok: true, data: { user } };
});

// On logout:
app.post('/auth/logout', async (req, reply) => {
  reply.clearCookie('mp_auth_token');
  return { ok: true };
});
```

#### Step 2: Frontend Changes

**File:** `shop-app.jsx` (and all API call locations)

```javascript
// BEFORE (vulnerable):
const token = localStorage.getItem("mp_access_token");
const res = await fetch(`${API_BASE}/orders/quick`, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`  // ← Token in header
  },
  body: JSON.stringify(data)
});

// AFTER (secure):
const res = await fetch(`${API_BASE}/orders/quick`, {
  method: "POST",
  credentials: "include",  // ← Auto-sends httpOnly cookie
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});
```

#### Step 3: Remove localStorage Token Usage

**Find and replace all:**
```javascript
// ❌ REMOVE ALL of these:
localStorage.getItem("mp_access_token")
localStorage.setItem("mp_access_token", token)
localStorage.removeItem("mp_access_token")

// ✅ KEEP ONLY if needed for non-sensitive state:
localStorage.getItem("mp_user")  // User name/email (non-sensitive)
```

#### Step 4: Update Dashboard API Wrapper

**File:** `dashboard-admin.jsx` uses `window.mpApi.fetch`

```javascript
// Check how window.mpApi is defined and ensure it:
window.mpApi.fetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: "include",  // ← Auto-send cookie
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
    // Remove: "Authorization": `Bearer ${token}` from here
  });
};
```

### Testing the Fix

```javascript
// Test 1: Token should NOT be accessible
localStorage.getItem("mp_access_token")
// Should return: null (or empty)

// Test 2: Cookie should be httpOnly
document.cookie
// Should NOT show mp_auth_token (httpOnly cookies aren't visible)

// Test 3: Fetch should still work with credentials
fetch("/api/v1/orders", {
  method: "POST",
  credentials: "include",  // ← Sends cookie automatically
  body: JSON.stringify({qty: 1})
})
// Should succeed (cookie sent automatically)

// Test 4: CSRF protection
// Request should include SameSite=Strict cookie
// Cross-site requests will not send the cookie
```

---

## Additional Frontend Security Hardening

### 1. Add Content Security Policy (CSP)

**File:** `index.html` (or server headers)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' http://localhost:3000;
  frame-ancestors 'none';
  form-action 'self'
">
```

**Or in backend (Fastify):**
```javascript
app.register(require('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000"],
    }
  }
});
```

### 2. Add CSRF Token Protection

For additional CSRF protection (beyond SameSite):

```javascript
// Backend generates CSRF token:
app.get('/csrf-token', (req, reply) => {
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  return { token };
});

// Frontend includes CSRF token in POST requests:
const csrfToken = await fetch('/csrf-token').then(r => r.json());

fetch('/api/v1/orders', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'X-CSRF-Token': csrfToken.token  // ← Add CSRF token
  },
  body: JSON.stringify(data)
});

// Backend validates CSRF token:
app.post('/orders', async (req, reply) => {
  const token = req.headers['x-csrf-token'];
  if (token !== req.session.csrfToken) {
    return reply.code(403).send({ error: 'CSRF token invalid' });
  }
  // ... process order ...
});
```

### 3. Remove API_BASE from window

**File:** `shop-app.jsx:39`

```javascript
// BEFORE (vulnerable):
const API_BASE = window.MIDNIGHT_API_BASE || "http://localhost:3000/api/v1";

// AFTER (secure):
// Define API_BASE only once, not on window object:
const API_BASE = "http://localhost:3000/api/v1";

// For different environments, use build-time variables:
// import { API_BASE } from './config';
// or environment variables in CI/CD
```

### 4. Use Subresource Integrity (SRI)

If loading libraries from CDN:

```html
<!-- BEFORE: -->
<script src="https://cdn.example.com/library.js"></script>

<!-- AFTER: -->
<script 
  src="https://cdn.example.com/library.js"
  integrity="sha384-abc123def456..."
  crossorigin="anonymous">
</script>
```

Calculate SRI hash:
```bash
cat file.js | openssl dgst -sha384 -binary | openssl enc -base64
```

---

## Implementation Checklist

### Phase 1: Backend Setup (30 mins)
- [ ] Add httpOnly cookie in login endpoint
- [ ] Update logout to clear cookie
- [ ] Add `credentials: "include"` validation middleware
- [ ] Test cookie is being set

### Phase 2: Frontend Updates (1 hour)
- [ ] Update `fetch()` calls to use `credentials: "include"`
- [ ] Remove localStorage token reads
- [ ] Update API wrapper (window.mpApi)
- [ ] Remove localStorage token writes

### Phase 3: Security Hardening (1 hour)
- [ ] Add CSP headers
- [ ] Add CSRF token protection
- [ ] Remove API_BASE from window
- [ ] Add SRI to CDN scripts

### Phase 4: Testing (1-2 hours)
- [ ] Test login still works
- [ ] Test API calls still work
- [ ] Verify token not in localStorage
- [ ] Verify token not in console
- [ ] Test XSS protection (CSP)
- [ ] Test CSRF protection

### Phase 5: Deployment
- [ ] Deploy to staging
- [ ] Full regression testing
- [ ] Deploy to production
- [ ] Monitor for issues

---

## Rollback Plan

If issues occur:

```javascript
// Temporary: Re-enable localStorage for token
// (while you debug httpOnly cookie issue)

const getToken = () => {
  // Try httpOnly first (via cookie in fetch)
  // Fallback to localStorage if needed
  return localStorage.getItem("mp_access_token") || null;
};
```

But **don't keep this fallback permanently**.

---

## Expected Results After Fix

### Security Improvements
- ✅ Token NO longer visible in localStorage
- ✅ Token NO longer accessible via JavaScript
- ✅ Token ONLY sent over HTTPS
- ✅ Token protected against CSRF attacks
- ✅ Token auto-cleared on logout
- ✅ XSS attacks cannot steal token

### User Experience
- ✅ Login still works
- ✅ API calls still work
- ✅ Logout still works
- ✅ Auto-login on page refresh works

### Performance
- ✅ No performance impact
- ✅ Slightly faster (no localStorage read)

---

## Questions & Answers

**Q: Will this break mobile apps?**  
A: Only if they use localStorage. Native apps should use secure storage.

**Q: What about CORS?**  
A: With `credentials: "include"`, server must set `Access-Control-Allow-Credentials: true` and `Access-Control-Allow-Origin: <specific-domain>` (not `*`).

**Q: What if user clears cookies?**  
A: They'll be logged out automatically. This is expected behavior.

**Q: Can I store other data in localStorage?**  
A: Yes, but only non-sensitive data (user name, preferences). Never tokens, passwords, or personal info.

---

## Estimated Timeline

| Phase | Time | Effort |
|-------|------|--------|
| Backend changes | 30 mins | Low |
| Frontend changes | 1 hour | Medium |
| Security hardening | 1 hour | Medium |
| Testing | 1-2 hours | High |
| **Total** | **4 hours** | **Medium** |

Can be split across sprints or done as one batch.

---

## References

- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [MDN: localStorage vs Cookies](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [OWASP: Cross-Site Request Forgery (CSRF)](https://owasp.org/www-community/attacks/csrf)

---

**Status:** Ready for Implementation  
**Priority:** HIGH (do after exploit fixes)  
**Impact:** Eliminates major attack vector
