// Shared API helper for all Midnight Pick dashboard pages
(function (window) {
  'use strict';

  function resolveApiBase() {
    if (window.MIDNIGHT_API_BASE) return window.MIDNIGHT_API_BASE.replace(/\/$/, '');

    const { protocol, hostname, port } = window.location;
    // On standard ports (served via nginx/proxy) use same-origin relative path.
    // On non-standard ports (local dev file server on :5500) the backend is on :3000.
    if (!port || port === '80' || port === '443') {
      return `${protocol}//${hostname}/api/v1`;
    }
    return `${protocol}//${hostname}:3000/api/v1`;
  }

  const BASE = resolveApiBase();
  const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
  const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'mousedown', 'scroll', 'touchstart', 'wheel'];
  window.MIDNIGHT_API_BASE = BASE;
  let refreshPromise = null;
  let inactivityStarted = false;
  let inactivityTimer = null;
  let lastActivity = Date.now();

  async function refreshAuth() {
    if (!refreshPromise) {
      refreshPromise = fetch(BASE + '/auth/token/refresh', {
        method: 'POST',
        credentials: 'include',  // Send old refresh token cookie, get new tokens in new cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  }

  async function mpFetch(path, options) {
    options = options || {};
    const headers = Object.assign(
      options.body !== undefined ? { 'Content-Type': 'application/json' } : {},
      options.headers || {}
    );

    // Tokens are now in httpOnly cookies, sent automatically with credentials: "include"
    let res = await fetch(BASE + path, Object.assign({}, options, {
      credentials: 'include',  // Automatically send httpOnly cookies
      headers
    }));

    // Try token refresh once on 401
    if (res.status === 401) {
      const rRes = await refreshAuth();

      if (!rRes.ok) { _signOut(); return null; }

      // Backend sets new cookies automatically, no need to store them

      // Retry with new token (in cookie)
      res = await fetch(BASE + path, Object.assign({}, options, {
        credentials: 'include',
        headers
      }));
    }

    return res.json();
  }

  function notifyLogout() {
    return fetch(BASE + '/auth/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).catch(() => null);
  }

  function _signOut(redirectTo) {
    notifyLogout();
    localStorage.removeItem('mp_user');
    window.location.replace(redirectTo || 'index.html');
  }

  function markActivity() {
    lastActivity = Date.now();
  }

  function startInactivityTimer() {
    if (inactivityStarted || !localStorage.getItem('mp_user')) return;
    inactivityStarted = true;
    markActivity();

    ACTIVITY_EVENTS.forEach(eventName => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    inactivityTimer = window.setInterval(() => {
      if (!localStorage.getItem('mp_user')) {
        stopInactivityTimer();
        return;
      }
      if (Date.now() - lastActivity >= INACTIVITY_LIMIT_MS) {
        _signOut('index.html?session=inactive');
      }
    }, 1000);
  }

  function stopInactivityTimer() {
    if (!inactivityStarted) return;
    inactivityStarted = false;
    if (inactivityTimer) window.clearInterval(inactivityTimer);
    inactivityTimer = null;
    ACTIVITY_EVENTS.forEach(eventName => {
      window.removeEventListener(eventName, markActivity);
    });
  }

  // Call at the top of each dashboard. Redirects to index.html if not authenticated or wrong role.
  // allowedRoles: array like ['user'] or ['admin'] or null for any role.
  function mpGuard(allowedRoles) {
    // Token is in httpOnly cookie, cannot check from JavaScript
    // Use user info from localStorage to determine auth state
    const raw = localStorage.getItem('mp_user');
    if (!raw) { _signOut(); return null; }

    let user;
    try { user = JSON.parse(raw); } catch { _signOut(); return null; }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      _signOut();
      return null;
    }
    startInactivityTimer();
    return user;
  }

  function mpSignOut() { _signOut(); }

  startInactivityTimer();

  // Expose globally
  window.mpApi = { fetch: mpFetch, guard: mpGuard, signOut: mpSignOut, startInactivityTimer, base: BASE };
})(window);
