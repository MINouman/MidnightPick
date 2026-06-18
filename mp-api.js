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
  window.MIDNIGHT_API_BASE = BASE;
  let refreshPromise = null;

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

  function _signOut() {
    // Tokens are in httpOnly cookies (backend will clear them)
    // Only clear user info from localStorage
    localStorage.removeItem('mp_user');
    window.location.replace('index.html');
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
    return user;
  }

  function mpSignOut() { _signOut(); }

  // Expose globally
  window.mpApi = { fetch: mpFetch, guard: mpGuard, signOut: mpSignOut, base: BASE };
})(window);
