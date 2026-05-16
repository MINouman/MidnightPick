// Midnight Pick — Influencer Dashboard

const { useState, useRef } = React;

// ── Mock Data ──────────────────────────────────────────
const USER = {
  name: "Sadia",
  phone: "01811-567890",
  email: "sadia@example.com",
  influencerCode: "SADIA20",
  discountPct: 20,
  bkashNumber: "01811-567890",
};

const COMMISSION_HISTORY = [
  { date: "May 14, 2026", orderValue: 450,  rate: 10, commission: 45  },
  { date: "May 10, 2026", orderValue: 1260, rate: 10, commission: 126 },
  { date: "May 6, 2026",  orderValue: 324,  rate: 10, commission: 32  },
  { date: "May 2, 2026",  orderValue: 650,  rate: 10, commission: 65  },
  { date: "Apr 30, 2026", orderValue: 980,  rate: 10, commission: 98  },
  { date: "Apr 22, 2026", orderValue: 210,  rate: 10, commission: 21  },
  { date: "Apr 15, 2026", orderValue: 1440, rate: 10, commission: 144 },
  { date: "Apr 8, 2026",  orderValue: 374,  rate: 10, commission: 37  },
];

const PAYOUT_HISTORY = [
  { month: "April 2026", amount: 300, bkash: "01811-567890", status: "paid", date: "May 5, 2026" },
  { month: "March 2026", amount: 420, bkash: "01811-567890", status: "paid", date: "Apr 5, 2026" },
  { month: "February 2026", amount: 185, bkash: "01811-567890", status: "paid", date: "Mar 5, 2026" },
];

const THIS_MONTH = COMMISSION_HISTORY.filter(r => r.date.startsWith("May"));
const ordersThisMonth = THIS_MONTH.length;
const commissionThisMonth = THIS_MONTH.reduce((s, r) => s + r.commission, 0);
const pendingPayout = commissionThisMonth;

const ORDERS = [
  { id: "MP-1055", date: "May 14, 2026", items: "Midnight Blend 100g ×2, Midnight Black ×5", total: 573, status: "Delivered" },
  { id: "MP-1048", date: "May 6, 2026",  items: "Night Shift Subscription",               total: 210, status: "Delivered" },
];
const SUBSCRIPTION = { plan: "Night Shift", price: 210, contents: "10× Midnight Black sachets", status: "active", nextDelivery: "May 23, 2026", nextCharge: "May 23, 2026", countdown: 7, cancelBefore: "May 20, 2026" };
const POINTS_HISTORY = [
  { date: "May 14", desc: "Order #MP-1055", points: 280, type: "earned" },
  { date: "May 6",  desc: "Order #MP-1048", points: 105, type: "earned" },
];
const ADDRESSES = [{ id: 1, label: "Home", line1: "Flat 5A, Road 12", line2: "Gulshan-2, Dhaka", isDefault: true }];
const PAYMENT_METHODS = [{ id: 1, type: "bKash", number: USER.bkashNumber, isDefault: true }];

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
  return (
    <div>
      <div className="greeting-card">
        <div className="greeting-name">Good evening, {USER.name}.</div>
        <div className="greeting-date">Friday, 16 May 2026</div>
      </div>
      <div className="stat-row mb12">
        <div className="stat-card"><div className="stat-label">Orders This Month</div><div className="stat-value">{ordersThisMonth}</div></div>
        <div className="stat-card"><div className="stat-label">Commission (May)</div><div className="stat-value">৳{commissionThisMonth}</div></div>
        <div className="stat-card"><div className="stat-label">Pending Payout</div><div className="stat-value">৳{pendingPayout}</div></div>
      </div>
      <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("subscription")}>
        <div className="row-between">
          <div>
            <div className="text-xs text-muted mb4">SUBSCRIPTION</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{SUBSCRIPTION.plan}</div>
            <div className="text-xs text-muted mt4">Next: {SUBSCRIPTION.nextDelivery}</div>
          </div>
          <span className="badge badge-green">Active</span>
        </div>
      </div>
      <div className="col-gap">
        <a href="shop.html" className="btn btn-primary btn-full"><i className="fa fa-coffee" /> Shop Now</a>
        <button className="btn btn-ghost btn-full" onClick={() => setTab("performance")}><i className="fa fa-chart-bar" /> View Performance</button>
      </div>
    </div>
  );
}

function OrdersTab() {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div className="page-title">Your Orders</div>
      <div className="page-sub">{ORDERS.length} orders</div>
      {ORDERS.map(order => (
        <div key={order.id} className="accordion">
          <div className="accordion-hd" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
            <div className="row-between mb8">
              <span className="mono text-muted text-xs">{order.id}</span>
              <span className="text-xs text-muted">{order.date}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.items}</div>
            <div className="row-between">
              <span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{order.total}</span>
              <div className="row" style={{ gap: 8 }}>
                <StatusBadge status={order.status} />
                <i className="fa fa-chevron-down text-muted" style={{ fontSize: 11, transform: expanded === order.id ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </div>
            </div>
          </div>
          {expanded === order.id && (
            <div className="accordion-bd" onClick={e => e.stopPropagation()}>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary btn-sm"><i className="fa fa-redo" style={{ fontSize: 11 }} /> Reorder</button>
                <button className="btn btn-ghost btn-sm"><i className="fab fa-whatsapp" style={{ fontSize: 13 }} /> Help</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubscriptionTab() {
  const [sheet, setSheet] = useState(null);
  const sub = SUBSCRIPTION;
  return (
    <div>
      <div className="page-title">Subscription</div>
      <div className="card mb12">
        <div className="row-between mb12">
          <div><div style={{ fontSize: 18, fontWeight: 700 }}>{sub.plan}</div><div className="text-muted text-sm mt4">{sub.contents}</div></div>
          <span className="badge badge-green">Active</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--orange)" }}>৳{sub.price}<span className="text-muted text-sm" style={{ fontWeight: 400 }}>/mo</span></div>
      </div>
      <div className="card mb12">
        <div className="eyebrow">Next Delivery</div>
        <div style={{ fontSize: 17, fontWeight: 700 }} className="mb4">{sub.nextDelivery}</div>
        <div className="text-muted text-sm">In {sub.countdown} days</div>
      </div>
      <div className="card mb16">
        <div className="eyebrow">Billing</div>
        <div className="row-between mb8 text-sm"><span className="text-muted">Next charge</span><span style={{ fontWeight: 600 }}>৳{sub.price} on {sub.nextCharge}</span></div>
        <div className="text-xs text-muted" style={{ fontStyle: "italic" }}>Cancel before {sub.cancelBefore} to skip.</div>
      </div>
      <div className="col-gap mb20">
        {["Pause Next Delivery", "Skip This Month", "Change Plan", "Update Address"].map(a => (
          <button key={a} className="btn btn-ghost btn-full" onClick={() => setSheet(a)}>{a}</button>
        ))}
      </div>
      <div style={{ textAlign: "center" }}><button className="btn-link" style={{ color: "var(--red)" }} onClick={() => setSheet("cancel")}>Cancel Subscription</button></div>
      {sheet && <Sheet title="Confirm" body="Are you sure?" confirmLabel="Confirm" onConfirm={() => setSheet(null)} onClose={() => setSheet(null)} />}
    </div>
  );
}

function AccountTab({ setTab }) {
  const [profile, setProfile] = useState({ name: USER.name, email: USER.email });
  const [edited, setEdited] = useState(false);
  const [sheet, setSheet] = useState(null);
  return (
    <div>
      <div className="page-title">Account</div>
      <div className="card mb12">
        <div className="eyebrow mb12">Profile</div>
        <div className="input-group"><label className="input-label">Name</label><input className="input" value={profile.name} onChange={e => { setProfile(p => ({ ...p, name: e.target.value })); setEdited(true); }} /></div>
        <div className="input-group"><label className="input-label">Phone</label><input className="input" value={USER.phone} readOnly style={{ opacity: .7 }} /><div className="input-note">Requires OTP to change.</div></div>
        <div className="input-group" style={{ marginBottom: 0 }}><label className="input-label">Email</label><input className="input" value={profile.email} onChange={e => { setProfile(p => ({ ...p, email: e.target.value })); setEdited(true); }} /></div>
        {edited && <button className="btn btn-primary btn-full mt16" onClick={() => setEdited(false)}>Save Changes</button>}
      </div>
      <div className="eyebrow mb8 mt16">Addresses</div>
      {ADDRESSES.map(a => (
        <div key={a.id} className="addr-card">
          <div><div className="row mb4" style={{ gap: 8 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{a.label}</span>{a.isDefault && <span className="badge badge-orange">Default</span>}</div><div className="text-sm text-muted">{a.line1}</div><div className="text-sm text-muted">{a.line2}</div></div>
          <button className="text-xs text-muted" style={{ textDecoration: "underline", flexShrink: 0 }}>Edit</button>
        </div>
      ))}
      <div className="card mb16 mt8" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
        <div className="row mb8" style={{ gap: 10 }}><i className="fa fa-bolt text-orange" style={{ fontSize: 18 }} /><span style={{ fontWeight: 700, fontSize: 15 }}>Influencer Partner</span></div>
        <div className="text-sm text-muted mb12">Code: <strong style={{ color: "var(--orange)" }}>{USER.influencerCode}</strong></div>
        <button className="btn btn-primary btn-sm" onClick={() => setTab("performance")}>View Performance</button>
      </div>
      <div className="divider" />
      <div className="col-gap">
        <button className="btn btn-ghost btn-full" onClick={() => setSheet("logout")}><i className="fa fa-sign-out-alt" style={{ fontSize: 13 }} /> Log Out</button>
        <div style={{ textAlign: "center" }}><button className="btn-link" style={{ color: "var(--red)", fontSize: 12 }}>Delete Account</button></div>
      </div>
      {sheet && <Sheet title="Log out?" body="You'll be signed out." confirmLabel="Log Out" onConfirm={() => setSheet(null)} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ── Performance Tab ────────────────────────────────────
function PerformanceTab() {
  const [perfTab, setPerfTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const codeTimerRef = useRef(null);
  const [newCode, setNewCode] = useState(USER.influencerCode);
  const [avail, setAvail] = useState(null);
  const codeRef = useRef(null);

  function copy() {
    navigator.clipboard.writeText(USER.influencerCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waText = encodeURIComponent(`☕ Try Midnight Pick — premium instant coffee. Use my code ${USER.influencerCode} for ${USER.discountPct}% off: https://midnightpick.com`);

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
    if (val.length >= 4 && val !== USER.influencerCode) {
      codeRef.current = setTimeout(() => setAvail(val === "MIDNIGHT" ? "taken" : "available"), 400);
    }
  }

  const isCodeValid = newCode.length >= 4 && newCode.length <= 8 && newCode !== USER.influencerCode && avail === "available";

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
          <div className="stat-row mb12">
            <div className="stat-card"><div className="stat-label">Orders (May)</div><div className="stat-value">{ordersThisMonth}</div></div>
            <div className="stat-card"><div className="stat-label">Earned (May)</div><div className="stat-value">৳{commissionThisMonth}</div></div>
            <div className="stat-card"><div className="stat-label">Pending Payout</div><div className="stat-value">৳{pendingPayout}</div></div>
          </div>
          <div className="code-display-wrap">
            <div className="code-display">{USER.influencerCode}</div>
            <div className="text-muted text-sm mt8">Customers get {USER.discountPct}% off with your code</div>
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
        <div>
          <div className="card mb12">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order Value</th>
                    <th>Rate</th>
                    <th>Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMISSION_HISTORY.filter(r => r.date.startsWith("May")).map((r, i) => (
                    <tr key={i}>
                      <td className="muted">{r.date}</td>
                      <td>৳{r.orderValue}</td>
                      <td className="muted">{r.rate}%</td>
                      <td style={{ color: "var(--orange)", fontWeight: 700 }}>৳{r.commission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divider" />
            <div className="row-between" style={{ fontWeight: 700 }}>
              <span className="text-muted text-sm">This month's total</span>
              <span style={{ color: "var(--orange)" }}>৳{commissionThisMonth}</span>
            </div>
          </div>
        </div>
      )}

      {perfTab === "payouts" && (
        <div>
          {/* Pending row */}
          <div className="card mb12" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
            <div className="row-between mb6">
              <span style={{ fontWeight: 700, fontSize: 15 }}>May 2026</span>
              <span className="badge badge-orange">Pending</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--orange)" }}>৳{pendingPayout}</div>
            <div className="text-xs text-muted mt8">Estimated payment: June 5, 2026</div>
          </div>

          <div className="eyebrow mb10">Past Payouts</div>
          {PAYOUT_HISTORY.map((p, i) => (
            <div key={i} className="card mb8">
              <div className="row-between mb6">
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.month}</span>
                <span className="badge badge-green">Paid</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--orange)" }}>৳{p.amount}</div>
              <div className="text-xs text-muted mt6">Paid to bKash {p.bkash} · {p.date}</div>
            </div>
          ))}
        </div>
      )}

      {perfTab === "code" && (
        <div>
          <div className="code-display-wrap mb12">
            <div className="code-display">{USER.influencerCode}</div>
            <div className="text-muted text-sm mt8">{USER.discountPct}% off for customers</div>
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
            <div className="card mb12" style={{ background: "rgba(229,92,92,.08)", borderColor: "rgba(229,92,92,.25)" }}>
              <div className="text-xs" style={{ color: "var(--red)", lineHeight: 1.55 }}>
                <i className="fa fa-exclamation-triangle" style={{ marginRight: 6 }} />
                Changing your code will not affect commission already earned. Your old code stops working immediately.
              </div>
            </div>
            <button className="btn btn-primary btn-full" disabled={!isCodeValid}>Save New Code</button>
          </div>
          <div className="card">
            <div className="eyebrow mb12">Code Stats</div>
            <div className="row-between mb8 text-sm"><span className="text-muted">Total uses</span><span style={{ fontWeight: 700 }}>{COMMISSION_HISTORY.length}</span></div>
            <div className="row-between text-sm"><span className="text-muted">Uses this month</span><span style={{ fontWeight: 700 }}>{ordersThisMonth}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────
function Sidebar({ tab, setTab }) {
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
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ background: "rgba(90,165,232,.2)", color: "var(--blue)" }}>{USER.name[0]}</div>
          <div><div className="sidebar-user-name">{USER.name}</div><div className="sidebar-user-role">Influencer Partner</div></div>
        </div>
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────
function InfluencerDashboard() {
  const [tab, setTab] = useState("performance");

  const tabs = [
    { id: "home",        icon: "fa-home",     label: "Home" },
    { id: "orders",      icon: "fa-box",      label: "Orders" },
    { id: "account",     icon: "fa-user",     label: "Account" },
    { id: "subscription",icon: "fa-calendar-check", label: "Sub" },
    { id: "performance", icon: "fa-chart-bar",label: "Performance" },
  ];

  const titles = { home: "Midnight Pick", orders: "Orders", subscription: "Subscription", account: "Account", performance: "Performance" };

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
    <>
      <div className="dash-layout">
        <Sidebar tab={tab} setTab={setTab} />
        <div className="dash-main">
          <header className="topbar">
            <img src="assets/logo.png" alt="Midnight Pick" className="topbar-logo" />
            <span className="topbar-title">{titles[tab]}</span>
            <div className="topbar-right"><button className="icon-btn"><i className="fa fa-bell" /><span className="notif-dot" /></button></div>
          </header>
          <main className="dash-content"><div className="dash-inner">{render()}</div></main>
        </div>
      </div>
      <nav className="tabbar">
        <div className="tabbar-inner">
          {tabs.map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <span className="tab-icon"><i className={`fa ${t.icon}`} /></span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<InfluencerDashboard />);
