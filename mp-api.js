// Shared API helper for all Midnight Pick dashboard pages
(function (window) {
  'use strict';

  const BASE = 'http://localhost:3000/api/v1';

  async function mpFetch(path, options) {
    options = options || {};
    const token = localStorage.getItem('mp_access_token');
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      token ? { Authorization: 'Bearer ' + token } : {},
      options.headers || {}
    );

    let res = await fetch(BASE + path, Object.assign({}, options, { headers }));

    // Try token refresh once on 401
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('mp_refresh_token');
      if (!refreshToken) { _signOut(); return null; }

      const rRes = await fetch(BASE + '/auth/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!rRes.ok) { _signOut(); return null; }

      const rData = await rRes.json();
      localStorage.setItem('mp_access_token', rData.data.access_token);
      localStorage.setItem('mp_refresh_token', rData.data.refresh_token);

      // Retry with new token
      const newHeaders = Object.assign({}, headers, { Authorization: 'Bearer ' + rData.data.access_token });
      res = await fetch(BASE + path, Object.assign({}, options, { headers: newHeaders }));
    }

    return res.json();
  }

  function _signOut() {
    localStorage.removeItem('mp_access_token');
    localStorage.removeItem('mp_refresh_token');
    localStorage.removeItem('mp_user');
    window.location.replace('index.html');
  }

  // Call at the top of each dashboard. Redirects to index.html if not authenticated or wrong role.
  // allowedRoles: array like ['user'] or ['admin'] or null for any role.
  function mpGuard(allowedRoles) {
    const token = localStorage.getItem('mp_access_token');
    const raw   = localStorage.getItem('mp_user');
    if (!token || !raw) { _signOut(); return null; }

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
