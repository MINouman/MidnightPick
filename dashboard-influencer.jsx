// Midnight Pick — Influencer Dashboard

const { useState, useRef, useEffect, useContext, createContext } = React;

const DashCtx = createContext(null);

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}
function fmtStatus(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
function orderSummary(items) { return (items || []).map(i => `${i.name} ×${i.qty}`).join(", "); }

// ── Helpers ────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { Processing: "badge-orange", Shipped: "badge-blue", Delivered: "badge-green", Cancelled: "badge-red", Active: "badge-green", paid: "badge-green", Pending: "badge-orange" };
  return <span className={`badge ${map[status] || "badge-gray"}`}>{status}</span>;
}

function Sheet({ title, body, onConfirm, confirmLabel = "Confirm", onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">{title}</div>
        <div className="sheet-body">{body}</div>
        <div className="col-gap">
          <button className="btn btn-primary btn-full" onClick={onConfirm}>{confirmLabel}</button>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── User Tabs ──────────────────────────────────────────
function HomeTab({ setTab }) {
  const { user, orders } = useContext(DashCtx);
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const lastOrder = orders[0];
  return (
    <div>
      <div className="greeting-card">
        <div className="greeting-name">{greeting}, {user?.name || "there"}.</div>
        <div className="greeting-date">{now.toLocaleDateString("en-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
      <div className="stat-row mb12">
        <div className="stat-card"><div className="stat-label">Orders</div><div className="stat-value">{orders.length}</div></div>
        <div className="stat-card"><div className="stat-label">Points</div><div className="stat-value">{(user?.points_balance || 0).toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Commission</div><div className="stat-value text-xs text-muted" style={{ fontSize: 12 }}>Coming soon</div></div>
      </div>
      {lastOrder ? (
        <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("orders")}>
          <div className="row-between mb8">
            <span className="text-xs text-muted">LAST ORDER</span>
            <StatusBadge status={fmtStatus(lastOrder.status)} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mb4">{orderSummary(lastOrder.items)}</div>
          <div className="row-between">
            <span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{lastOrder.total}</span>
            <button className="btn-link">View all →</button>
          </div>
        </div>
      ) : null}
      <div className="col-gap">
        <a href="shop.html" className="btn btn-primary btn-full"><i className="fa fa-coffee" /> Shop Now</a>
        <button className="btn btn-ghost btn-full" onClick={() => setTab("performance")}><i className="fa fa-chart-bar" /> View Performance</button>
      </div>
    </div>
  );
}

function OrdersTab() {
  const { orders } = useContext(DashCtx);
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div className="page-title">Your Orders</div>
      <div className="page-sub">{orders.length} orders</div>
      {orders.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><i className="fa fa-box-open" /></div><h3>No orders yet.</h3><a href="shop.html" className="btn btn-primary">Shop Now</a></div>
      ) : orders.map(order => (
        <div key={order.id} className="accordion">
          <div className="accordion-hd" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
            <div className="row-between mb8">
              <span className="mono text-muted text-xs">{order.order_ref}</span>
              <span className="text-xs text-muted">{fmtDate(order.created_at)}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orderSummary(order.items)}</div>
            <div className="row-between">
              <span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{order.total}</span>
              <div className="row" style={{ gap: 8 }}>
                <StatusBadge status={fmtStatus(order.status)} />
                <i className="fa fa-chevron-down text-muted" style={{ fontSize: 11, transform: expanded === order.id ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </div>
            </div>
          </div>
          {expanded === order.id && (
            <div className="accordion-bd" onClick={e => e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm"><i className="fab fa-whatsapp" style={{ fontSize: 13 }} /> Help</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubscriptionTab() {
  return (
    <div>
      <div className="page-title">Subscription</div>
      <div className="empty-state">
        <div className="empty-icon"><i className="fa fa-calendar-check" /></div>
        <h3>Subscribe &amp; Save.</h3>
        <p>Subscription management is coming soon.</p>
        <a href="shop.html" className="btn btn-primary">Shop Now</a>
      </div>
    </div>
  );
}

function AccountTab({ setTab }) {
  const { user, addresses } = useContext(DashCtx);
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [edited, setEdited] = useState(false);
  const [sheet, setSheet] = useState(null);
  useEffect(() => { setProfile({ name: user?.name || "", email: user?.email || "" }); }, [user]);

  async function handleLogout() {
    const token   = localStorage.getItem("mp_access_token");
    const refresh = localStorage.getItem("mp_refresh_token");
    await fetch("http://localhost:3000/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ refresh_token: refresh }),
    }).catch(() => {});
    localStorage.clear();
    window.location.href = "index.html";
  }

  return (
    <div>
      <div className="page-title">Account</div>
      <div className="card mb12">
        <div className="eyebrow mb12">Profile</div>
        <div className="input-group"><label className="input-label">Name</label><input className="input" value={profile.name} onChange={e => { setProfile(p => ({ ...p, name: e.target.value })); setEdited(true); }} /></div>
        <div className="input-group"><label className="input-label">Phone</label><input className="input" value={user?.phone || ""} readOnly style={{ opacity: .7 }} /><div className="input-note">Requires OTP to change.</div></div>
        <div className="input-group" style={{ marginBottom: 0 }}><label className="input-label">Email</label><input className="input" value={profile.email} onChange={e => { setProfile(p => ({ ...p, email: e.target.value })); setEdited(true); }} /></div>
        {edited && <button className="btn btn-primary btn-full mt16" onClick={() => setEdited(false)}>Save Changes</button>}
      </div>
      <div className="eyebrow mb8 mt16">Addresses</div>
      {addresses.length === 0 ? <div className="text-sm text-muted mb12" style={{ textAlign: "center" }}>No addresses saved.</div> : addresses.map(a => (
        <div key={a.id} className="addr-card">
          <div><div className="row mb4" style={{ gap: 8 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{a.label}</span>{a.is_default && <span className="badge badge-orange">Default</span>}</div><div className="text-sm text-muted">{a.line1}</div>{a.line2 && <div className="text-sm text-muted">{a.line2}</div>}</div>
        </div>
      ))}
      <div className="card mb16 mt8" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
        <div className="row mb8" style={{ gap: 10 }}><i className="fa fa-bolt text-orange" style={{ fontSize: 18 }} /><span style={{ fontWeight: 700, fontSize: 15 }}>Influencer Partner</span></div>
        <button className="btn btn-primary btn-sm" onClick={() => setTab("performance")}>View Performance</button>
      </div>
      <div className="divider" />
      <div className="col-gap">
        <button className="btn btn-ghost btn-full" onClick={() => setSheet("logout")}><i className="fa fa-sign-out-alt" style={{ fontSize: 13 }} /> Log Out</button>
      </div>
      {sheet === "logout" && <Sheet title="Log out?" body="You'll be signed out." confirmLabel="Log Out" onConfirm={handleLogout} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ── Performance Tab ────────────────────────────────────
function PerformanceTab() {
  const { user } = useContext(DashCtx);
  const [perfTab, setPerfTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [avail, setAvail] = useState(null);
  const codeRef = useRef(null);

  const influencerCode = user?.influencer_code || "—";
  const discountPct    = user?.influencer_discount || 20;

  function copy() {
    navigator.clipboard.writeText(influencerCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waText = encodeURIComponent(`☕ Try Midnight Pick — premium instant coffee. Use my code ${influencerCode} for ${discountPct}% off: https://midnightpick.com`);

  const subtabs = [
    { id: "overview",  label: "Overview" },
    { id: "breakdown", label: "Commission" },
    { id: "payouts",   label: "Payouts" },
    { id: "code",      label: "Code" },
  ];

  function handleCodeChange(val) {
    setNewCode(val.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    setAvail(null);
    if (codeRef.current) clearTimeout(codeRef.current);
    if (val.length >= 4) {
      codeRef.current = setTimeout(() => setAvail(val === "MIDNIGHT" ? "taken" : "available"), 400);
    }
  }

  const isCodeValid = newCode.length >= 4 && newCode.length <= 8 && avail === "available";

  return (
    <div>
      <div className="page-title">Performance</div>
      <div className="filter-row mb8">
        {subtabs.map(s => (
          <button key={s.id} className={`pill ${perfTab === s.id ? "active" : ""}`} onClick={() => setPerfTab(s.id)}>{s.label}</button>
        ))}
      </div>

      {perfTab === "overview" && (
        <div>
          <div className="card mb12">
            <div className="text-sm text-muted" style={{ textAlign: "center", padding: "12px 0" }}>Commission tracking coming soon.</div>
          </div>
          <div className="code-display-wrap">
            <div className="code-display">{influencerCode}</div>
            <div className="text-muted text-sm mt8">Customers get {discountPct}% off with your code</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={copy}>
              <i className={`fa ${copied ? "fa-check" : "fa-copy"}`} style={{ fontSize: 13 }} /> {copied ? "Copied ✓" : "Copy Code"}
            </button>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1 }}>
              <i className="fab fa-whatsapp" style={{ fontSize: 14 }} /> Share
            </a>
          </div>
        </div>
      )}

      {perfTab === "breakdown" && (
        <div className="card">
          <div className="text-sm text-muted" style={{ textAlign: "center", padding: "20px 0" }}>Commission breakdown coming soon.</div>
        </div>
      )}

      {perfTab === "payouts" && (
        <div className="card">
          <div className="text-sm text-muted" style={{ textAlign: "center", padding: "20px 0" }}>Payout history coming soon.</div>
        </div>
      )}

      {perfTab === "code" && (
        <div>
          <div className="code-display-wrap mb12">
            <div className="code-display">{influencerCode}</div>
            <div className="text-muted text-sm mt8">{discountPct}% off for customers</div>
          </div>
          <div className="row mb16" style={{ gap: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={copy}>
              <i className={`fa ${copied ? "fa-check" : "fa-copy"}`} style={{ fontSize: 13 }} /> {copied ? "Copied ✓" : "Copy"}
            </button>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1 }}>
              <i className="fab fa-whatsapp" /> Share
            </a>
          </div>
          <div className="card mb12">
            <div className="eyebrow mb12">Change Code</div>
            <div className="input-group">
              <label className="input-label">New Code</label>
              <div style={{ position: "relative" }}>
                <input className="input" value={newCode} onChange={e => handleCodeChange(e.target.value)} maxLength={8} style={{ paddingRight: 36 }} />
                {avail && (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }} className={avail === "available" ? "avail-ok" : "avail-err"}>
                    <i className={`fa ${avail === "available" ? "fa-check-circle" : "fa-times-circle"}`} />
                  </span>
                )}
              </div>
              <div className="input-note">4–8 characters, letters and numbers only.</div>
            </div>
            <button className="btn btn-primary btn-full" disabled={!isCodeValid}>Save New Code</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────
function Sidebar({ tab, setTab, onLogout }) {
  const { user } = useContext(DashCtx);
  const links = [
    { id: "home",         icon: "fa-home",          label: "Home" },
    { id: "orders",       icon: "fa-box",            label: "Orders" },
    { id: "subscription", icon: "fa-calendar-check", label: "Subscription" },
    { id: "account",      icon: "fa-user",           label: "Account" },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><img src="assets/logo.png" alt="Midnight Pick" /></div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <div key={l.id} className={`sidebar-link ${tab === l.id ? "active" : ""}`} onClick={() => setTab(l.id)}>
            <i className={`fa ${l.icon} s-icon`} /><span>{l.label}</span>
          </div>
        ))}
        <div className="sidebar-section-label">Influencer</div>
        <div className={`sidebar-link ${tab === "performance" ? "active" : ""}`} onClick={() => setTab("performance")}>
          <i className="fa fa-chart-bar s-icon" /><span>Performance</span>
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ marginBottom: 10 }}>
          <div className="sidebar-avatar" style={{ background: "rgba(90,165,232,.2)", color: "var(--blue)" }}>{(user?.name || "?")[0].toUpperCase()}</div>
          <div><div className="sidebar-user-name">{user?.name || "—"}</div><div className="sidebar-user-role">Influencer Partner</div></div>
        </div>
        <button className="sidebar-link" style={{ width: "100%", borderLeft: "3px solid transparent", color: "var(--cream-65)" }} onClick={onLogout}>
          <i className="fa fa-sign-out-alt s-icon" /><span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────
function InfluencerDashboard() {
  const [tab, setTab]       = useState("performance");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [data, setData]     = useState({ user: null, orders: [], addresses: [], paymentMethods: [], loading: true });

  useEffect(() => {
    if (!mpApi.guard(["influencer"])) return;
    Promise.all([
      mpApi.fetch("/me"),
      mpApi.fetch("/orders?limit=20"),
      mpApi.fetch("/me/addresses"),
      mpApi.fetch("/me/payment-methods"),
    ]).then(([me, ordersRes, addrsRes, pmsRes]) => {
      setData({
        user:           me?.data    || null,
        orders:         ordersRes?.data?.orders || [],
        addresses:      addrsRes?.data || [],
        paymentMethods: pmsRes?.data  || [],
        loading: false,
      });
    }).catch(() => setData(d => ({ ...d, loading: false })));
  }, []);

  if (data.loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <i className="fa fa-circle-notch fa-spin" style={{ fontSize: 28, color: "var(--orange)" }} />
    </div>
  );

  async function handleLogout() {
    const token   = localStorage.getItem("mp_access_token");
    const refresh = localStorage.getItem("mp_refresh_token");
    await fetch("http://localhost:3000/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ refresh_token: refresh }),
    }).catch(() => {});
    localStorage.clear();
    window.location.href = "index.html";
  }

  function render() {
    switch (tab) {
      case "home":        return <HomeTab setTab={setTab} />;
      case "orders":      return <OrdersTab />;
      case "subscription":return <SubscriptionTab />;
      case "account":     return <AccountTab setTab={setTab} />;
      case "performance": return <PerformanceTab />;
      default:            return null;
    }
  }

  return (
    <DashCtx.Provider value={data}>
      <div className="dash-layout">
        <Sidebar tab={tab} setTab={setTab} onLogout={() => setLogoutOpen(true)} />
        <div className="dash-main">
          <main className="dash-content"><div className="dash-inner">{render()}</div></main>
        </div>
      </div>
      {logoutOpen && (
        <Sheet
          title="Log out?"
          body="You'll be signed out of your Midnight Pick account on this device."
          confirmLabel="Log Out"
          onConfirm={handleLogout}
          onClose={() => setLogoutOpen(false)}
        />
      )}
    </DashCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<InfluencerDashboard />);
