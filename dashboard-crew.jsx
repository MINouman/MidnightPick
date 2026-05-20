// Midnight Pick — Crew Dashboard

const { useState, useEffect, useRef, useContext, createContext } = React;

const DashCtx = createContext(null);

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}
function fmtStatus(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
function orderSummary(items) { return (items || []).map(i => `${i.name} ×${i.qty}`).join(", "); }
function addrString(snap) { return snap ? [snap.line1, snap.line2, snap.city].filter(Boolean).join(", ") : ""; }

// ── Helpers ────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { Processing: "badge-orange", Shipped: "badge-blue", Delivered: "badge-green", Cancelled: "badge-red", Active: "badge-green" };
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

// ── User Tabs (reused from User Dashboard) ─────────────

function HomeTab({ setTab }) {
  const { user, orders } = useContext(DashCtx);
  const pts      = user?.points_balance || 0;
  const pct      = Math.min(100, Math.round((pts / 4400) * 100));
  const lastOrder = orders[0];
  const now      = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  return (
    <div>
      <div className="greeting-card">
        <div className="greeting-name">{greeting}, {user?.name || "there"}.</div>
        <div className="greeting-date">{now.toLocaleDateString("en-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>
      <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("points")}>
        <div className="eyebrow">Midnight Points</div>
        <div className="row mb12" style={{ alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 38, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>{pts.toLocaleString()}</span>
          <span className="text-muted text-sm">pts</span>
        </div>
        <div className="progress-track mb8"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <div className="text-muted text-xs">{Math.max(0, 4400 - pts).toLocaleString()} pts to your next free sachet →</div>
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
            <button className="btn-link">View all orders →</button>
          </div>
        </div>
      ) : null}
      <div className="col-gap mb12">
        <a href="shop.html" className="btn btn-primary btn-full"><i className="fa fa-coffee" /> Shop Now</a>
        <button className="btn btn-ghost btn-full" onClick={() => setTab("crew")}><i className="fa fa-share-alt" /> Refer a Friend</button>
      </div>
    </div>
  );
}

function OrdersTab() {
  const { orders } = useContext(DashCtx);
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const filters = ["All", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
  const visible = filter === "All" ? orders : orders.filter(o => fmtStatus(o.status) === filter);
  return (
    <div>
      <div className="page-title">Your Orders</div>
      <div className="page-sub">{orders.length} orders total</div>
      <div className="filter-row">
        {filters.map(f => <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      {visible.length === 0 ? (
        <div className="empty-state"><div className="empty-icon"><i className="fa fa-box-open" /></div><h3>No orders yet.</h3><a href="shop.html" className="btn btn-primary">Shop Now</a></div>
      ) : visible.map(order => (
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
        <p>Subscription management is coming soon. Place a one-time order for now.</p>
        <a href="shop.html" className="btn btn-primary">Shop Now</a>
      </div>
    </div>
  );
}

function PointsTab() {
  const { user, pointsHistory } = useContext(DashCtx);
  const [sheet, setSheet] = useState(null);
  const pts = user?.points_balance || 0;
  const rewards = [
    { id: "sachet", label: "1 Free Sachet", pts: 1000, worth: "৳25" },
    { id: "bkash",  label: "৳100 bKash Credit", pts: 5000, worth: "৳100" },
    { id: "month",  label: "One Free Month — Night Shift", pts: 10000, worth: "৳210" },
  ];
  return (
    <div>
      <div className="card mb16">
        <div className="eyebrow">Midnight Points</div>
        <div className="row mb8" style={{ alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>{pts.toLocaleString()}</span>
          <span className="text-muted">pts</span>
        </div>
      </div>
      <div className="eyebrow mb12">Redeem Points</div>
      {rewards.map(r => {
        const can = pts >= r.pts;
        return (
          <div key={r.id} className="redeem-card">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
              <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: 13 }}>{r.pts.toLocaleString()} pts</div>
              <div className="text-xs text-muted mt4">Worth {r.worth}</div>
            </div>
            <button className={`btn btn-sm ${can ? "btn-primary" : "btn-ghost"}`} disabled={!can} onClick={() => can && setSheet(r)} style={{ flexShrink: 0 }}>
              {can ? "Redeem" : "Locked"}
            </button>
          </div>
        );
      })}
      <div className="mt16 mb8 eyebrow">History</div>
      <div className="card">
        {pointsHistory.length === 0 ? (
          <div className="text-sm text-muted" style={{ padding: "12px 0", textAlign: "center" }}>No points activity yet.</div>
        ) : pointsHistory.map((p, i) => (
          <div key={i} className="pts-row">
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{p.description}</div>
              <div className="text-xs text-muted mt4">{fmtDate(p.created_at)}</div>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: p.type === "earned" || p.type === "bonus" ? "var(--green)" : "var(--red)" }}>
              {p.type === "earned" || p.type === "bonus" ? "+" : "−"}{Math.abs(p.points)} pts
            </span>
          </div>
        ))}
      </div>
      {sheet && <Sheet title={`Redeem ${sheet.pts.toLocaleString()} points?`} body={`Redeem ${sheet.pts.toLocaleString()} points for "${sheet.label}"? This cannot be undone.`} confirmLabel="Yes, Redeem" onConfirm={() => setSheet(null)} onClose={() => setSheet(null)} />}
    </div>
  );
}

function AccountTab({ setTab }) {
  const { user, addresses, paymentMethods } = useContext(DashCtx);
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [edited, setEdited]   = useState(false);
  const [sheet, setSheet]     = useState(null);
  useEffect(() => { setProfile({ name: user?.name || "", email: user?.email || "" }); }, [user]);
  return (
    <div>
      <div className="page-title">Account</div>
      <div className="card mb12">
        <div className="eyebrow mb12">Profile</div>
        <div className="input-group">
          <label className="input-label">Name</label>
          <input className="input" value={profile.name} onChange={e => { setProfile(p => ({ ...p, name: e.target.value })); setEdited(true); }} />
        </div>
        <div className="input-group">
          <label className="input-label">Phone</label>
          <input className="input" value={user?.phone || ""} readOnly style={{ opacity: .7 }} />
          <div className="input-note">Requires OTP to change — contact support.</div>
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Email</label>
          <input className="input" value={profile.email} onChange={e => { setProfile(p => ({ ...p, email: e.target.value })); setEdited(true); }} />
        </div>
        {edited && <button className="btn btn-primary btn-full mt16" onClick={() => setEdited(false)}>Save Changes</button>}
      </div>
      <div className="eyebrow mb8 mt16">Saved Addresses</div>
      {addresses.length === 0 ? <div className="text-sm text-muted mb12" style={{ textAlign: "center" }}>No saved addresses.</div> : addresses.map(a => (
        <div key={a.id} className="addr-card">
          <div>
            <div className="row mb4" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{a.label}</span>
              {a.is_default && <span className="badge badge-orange">Default</span>}
            </div>
            <div className="text-sm text-muted">{a.line1}</div>
            {a.line2 && <div className="text-sm text-muted">{a.line2}</div>}
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-full btn-sm mb16"><i className="fa fa-plus" style={{ fontSize: 11 }} /> Add New Address</button>
      <div className="eyebrow mb8">Payment Methods</div>
      {paymentMethods.length === 0 ? <div className="text-sm text-muted mb12" style={{ textAlign: "center" }}>No payment methods saved.</div> : paymentMethods.map(pm => (
        <div key={pm.id} className="pay-card">
          <div className="row" style={{ gap: 10 }}>
            <div className="pay-icon" style={{ textTransform: "capitalize" }}>{pm.type?.slice(0,2)}</div>
            <div><div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{pm.type}</div><div className="text-xs text-muted">{pm.number}</div></div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {pm.is_default && <span className="badge badge-orange">Default</span>}
          </div>
        </div>
      ))}
      <div className="card mb16 mt8" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
        <div className="row mb8" style={{ gap: 10 }}>
          <i className="fa fa-fire text-orange" style={{ fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Midnight Crew Member</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setTab("crew")}>Go to Crew Section</button>
      </div>
      <div className="divider" />
      <div className="col-gap">
        <button className="btn btn-ghost btn-full" onClick={() => setSheet("logout")}><i className="fa fa-sign-out-alt" style={{ fontSize: 13 }} /> Log Out</button>
        <div style={{ textAlign: "center" }}>
          <button className="btn-link" style={{ color: "var(--red)", fontSize: 12 }} onClick={() => setSheet("delete")}>Delete Account</button>
        </div>
      </div>
      {sheet === "logout" && <Sheet title="Log out?" body="You'll be signed out of your account on this device." confirmLabel="Log Out" onConfirm={() => { window.location.href = "index.html"; }} onClose={() => setSheet(null)} />}
      {sheet === "delete" && <Sheet title="Delete account?" body="This is permanent and cannot be undone." confirmLabel="Yes, Delete My Account" onConfirm={() => setSheet(null)} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ── Crew Sub-tabs ──────────────────────────────────────

function CrewOverview({ setCrewTab }) {
  const { user } = useContext(DashCtx);
  const [copied, setCopied] = useState(false);
  const crewCode    = user?.crew_code || "—";
  const crewDiscount = user?.crew_discount || 15;

  function copy() {
    navigator.clipboard.writeText(crewCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waText = encodeURIComponent(`☕ Try Midnight Pick — premium instant coffee made for focus. Use my code ${crewCode} for ${crewDiscount}% off your first order: https://midnightpick.com`);

  return (
    <div>
      {/* Code card */}
      <div className="card mb12">
        <div className="eyebrow mb12">My Crew Code</div>
        <div className="code-display-wrap">
          <div className="code-display">{crewCode}</div>
          <div className="text-muted text-sm mt8">
            New customers get {crewDiscount}% off their first order
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={copy}>
            <i className={`fa ${copied ? "fa-check" : "fa-copy"}`} style={{ fontSize: 13 }} />
            {copied ? "Copied ✓" : "Copy Code"}
          </button>
          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1 }}>
            <i className="fab fa-whatsapp" style={{ fontSize: 14 }} /> Share on WhatsApp
          </a>
        </div>
      </div>
      <div className="card">
        <div className="text-sm text-muted" style={{ textAlign: "center", padding: "12px 0" }}>Referral activity tracking coming soon.</div>
      </div>
    </div>
  );
}

function CrewActivity() {
  const [period, setPeriod] = useState("This Month");
  const periods = ["This Month", "Last Month", "All Time"];
  const filtered = [];

  const totalPts = filtered.reduce((s, r) => s + r.pts, 0);

  return (
    <div>
      <div className="page-title">Referral Activity</div>
      <div className="toggle-group">
        {periods.map(p => (
          <button key={p} className={`toggle-btn ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>{p}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><i className="fa fa-chart-line" /></div>
          <h3>No activity yet.</h3>
          <p>Share your code and track referrals here.</p>
        </div>
      ) : (
        <div className="card">
          {filtered.map((r, i) => (
            <div key={i} className="pts-row">
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {r.type === "subscription"
                    ? "Subscription started using your code"
                    : "Order placed using your code"}
                </div>
                <div className="row mt4" style={{ gap: 8 }}>
                  <span className="text-xs text-muted">{r.date}</span>
                  <span className="text-xs text-muted">· ৳{r.value}</span>
                </div>
              </div>
              <span style={{
                fontWeight: 700, fontSize: 13,
                color: r.type === "subscription" ? "var(--green)" : "var(--orange)"
              }}>
                +{r.pts.toLocaleString()} pts
              </span>
            </div>
          ))}
          <div className="divider" />
          <div className="row-between" style={{ fontWeight: 700 }}>
            <span className="text-muted text-sm">Total points from referrals</span>
            <span style={{ color: "var(--orange)" }}>{totalPts.toLocaleString()} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CrewStatus() {
  const MILESTONES = [
    { pts: 1000,  icon: "fa-coffee",     desc: "First free sachet unlocked",       status: "locked" },
    { pts: 5000,  icon: "fa-money-bill", desc: "৳100 bKash credit available",      status: "locked" },
    { pts: 10000, icon: "fa-calendar",   desc: "Free subscription month",          status: "locked" },
    { pts: 25000, icon: "fa-crown",      desc: "Founding Crew — permanent 20% off + handwritten card", status: "locked" },
  ];
  return (
    <div>
      <div className="page-title">Status &amp; Milestones</div>
      <div className="eyebrow mb12">Milestones</div>
      {MILESTONES.map((m, i) => (
        <div key={i} className="milestone locked">
          <div className="milestone-icon"><i className={`fa ${m.icon}`} /></div>
          <div className="milestone-body">
            <div className="milestone-pts">{m.pts.toLocaleString()} pts</div>
            <div className="milestone-desc">{m.desc}</div>
          </div>
          <i className="fa fa-lock" style={{ color: "var(--text-35)", fontSize: 16, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

function CrewCodeSettings() {
  const { user } = useContext(DashCtx);
  const [code, setCode] = useState(user?.crew_code || "");
  const [avail, setAvail] = useState(null);
  const timerRef = useRef(null);

  function handleChange(val) {
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    setAvail(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length >= 4) {
      timerRef.current = setTimeout(() => {
        setAvail(val === "MIDNIGHT" ? "taken" : "available");
      }, 400);
    }
  }

  const isValid = code.length >= 4 && code.length <= 8 && avail === "available";

  return (
    <div>
      <div className="page-title">Code Settings</div>

      {/* Change code */}
      <div className="card mb12">
        <div className="eyebrow mb12">Change My Code</div>
        <div className="input-group">
          <label className="input-label">New Code</label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              value={code}
              onChange={e => handleChange(e.target.value)}
              maxLength={8}
              style={{ paddingRight: 36 }}
            />
            {avail && (
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}
                className={avail === "available" ? "avail-ok" : "avail-err"}>
                <i className={`fa ${avail === "available" ? "fa-check-circle" : "fa-times-circle"}`} />
              </span>
            )}
          </div>
          <div className="input-note">4–8 characters, letters and numbers only.</div>
        </div>
        <div className="card mb12" style={{ background: "rgba(229,92,92,.08)", borderColor: "rgba(229,92,92,.25)" }}>
          <div className="text-xs" style={{ color: "var(--red)", lineHeight: 1.55 }}>
            <i className="fa fa-exclamation-triangle" style={{ marginRight: 6 }} />
            Changing your code will not affect points already earned. Your old code stops working immediately.
          </div>
        </div>
        <button className="btn btn-primary btn-full" disabled={!isValid}>Save New Code</button>
      </div>

      {/* Code stats */}
      <div className="card">
        <div className="eyebrow mb12">Code Stats</div>
        <div className="row-between mb8 text-sm">
          <span className="text-muted">Created</span>
          <span>Jan 10, 2026</span>
        </div>
        <div className="row-between text-sm">
          <span className="text-muted">Stats available soon.</span>
        </div>
      </div>
    </div>
  );
}

// ── Crew Tab Wrapper ───────────────────────────────────
function CrewTab() {
  const [crewTab, setCrewTab] = useState("overview");
  const subtabs = [
    { id: "overview",  label: "Overview" },
    { id: "activity",  label: "Activity" },
    { id: "status",    label: "Status" },
    { id: "codesettings", label: "Code" },
  ];

  return (
    <div>
      <div className="page-title">Crew</div>
      <div className="filter-row mb16">
        {subtabs.map(s => (
          <button key={s.id} className={`pill ${crewTab === s.id ? "active" : ""}`} onClick={() => setCrewTab(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      {crewTab === "overview"     && <CrewOverview setCrewTab={setCrewTab} />}
      {crewTab === "activity"     && <CrewActivity />}
      {crewTab === "status"       && <CrewStatus />}
      {crewTab === "codesettings" && <CrewCodeSettings />}
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
    { id: "points",       icon: "fa-star",           label: "Points" },
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
        <div className="sidebar-section-label">Crew</div>
        <div className={`sidebar-link ${tab === "crew" ? "active" : ""}`} onClick={() => setTab("crew")}>
          <i className="fa fa-fire s-icon" /><span>Crew Dashboard</span>
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ marginBottom: 10 }}>
          <div className="sidebar-avatar">{(user?.name || "?")[0].toUpperCase()}</div>
          <div>
            <div className="sidebar-user-name">{user?.name || "—"}</div>
            <div className="sidebar-user-role">Midnight Crew</div>
          </div>
        </div>
        <button className="sidebar-link" style={{ width: "100%", borderLeft: "3px solid transparent", color: "var(--cream-65)" }} onClick={onLogout}>
          <i className="fa fa-sign-out-alt s-icon" /><span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────
function CrewDashboard() {
  const [tab, setTab]       = useState("crew");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [data, setData]     = useState({
    user: null, orders: [], addresses: [], paymentMethods: [], pointsHistory: [], loading: true,
  });

  async function loadData() {
    const [me, ordersRes, addrsRes, pmsRes, ptsRes] = await Promise.all([
      mpApi.fetch("/me"),
      mpApi.fetch("/orders?limit=20"),
      mpApi.fetch("/me/addresses"),
      mpApi.fetch("/me/payment-methods"),
      mpApi.fetch("/me/points/history?limit=30"),
    ]);
    setData({
      user:           me?.data    || null,
      orders:         ordersRes?.data?.orders || [],
      addresses:      addrsRes?.data || [],
      paymentMethods: pmsRes?.data  || [],
      pointsHistory:  ptsRes?.data?.transactions || [],
      loading: false,
    });
  }

  useEffect(() => {
    if (!mpApi.guard(["crew"])) return;
    loadData();
  }, []);

  if (data.loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <i className="fa fa-circle-notch fa-spin" style={{ fontSize: 28, color: "var(--orange)" }} />
    </div>
  );

  function render() {
    switch (tab) {
      case "home":         return <HomeTab setTab={setTab} />;
      case "orders":       return <OrdersTab />;
      case "subscription": return <SubscriptionTab />;
      case "points":       return <PointsTab />;
      case "account":      return <AccountTab setTab={setTab} />;
      case "crew":         return <CrewTab />;
      default:             return null;
    }
  }

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
    <DashCtx.Provider value={data}>
      <div className="dash-layout">
        <Sidebar tab={tab} setTab={setTab} onLogout={() => setLogoutOpen(true)} />
        <div className="dash-main">
          <main className="dash-content">
            <div className="dash-inner">{render()}</div>
          </main>
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

ReactDOM.createRoot(document.getElementById("root")).render(<CrewDashboard />);
