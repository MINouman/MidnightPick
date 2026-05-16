// Midnight Pick — Crew Dashboard

const { useState, useEffect, useRef } = React;

// ── Mock Data ──────────────────────────────────────────
const USER = {
  name: "Rafi",
  phone: "01712-345678",
  email: "rafi@example.com",
  points: 3200,
  pointsThreshold: 4400,
  lifetimeEarned: 8750,
  lifetimeRedeemed: 5550,
  crewCode: "RAFI15",
  crewDiscount: 15,
  crewTier: "Midnight Crew",
  crewLifetimePts: 16550,
  foundingPtsTarget: 25000,
};

const REFERRAL_ACTIVITY = [
  { date: "May 14, 2026", type: "order",        value: 324,  pts: 500 },
  { date: "May 10, 2026", type: "subscription", value: 210,  pts: 2000 },
  { date: "May 3, 2026",  type: "order",        value: 250,  pts: 500 },
  { date: "Apr 28, 2026", type: "order",        value: 99,   pts: 500 },
  { date: "Apr 15, 2026", type: "order",        value: 450,  pts: 500 },
  { date: "Apr 10, 2026", type: "subscription", value: 210,  pts: 2000 },
  { date: "Mar 20, 2026", type: "order",        value: 174,  pts: 500 },
];

const MILESTONES = [
  { pts: 1000,  icon: "fa-coffee",      desc: "First free sachet unlocked",       status: "done" },
  { pts: 5000,  icon: "fa-money-bill",  desc: "৳100 bKash credit available",      status: "done" },
  { pts: 10000, icon: "fa-calendar",    desc: "Free subscription month",          status: "inprogress" },
  { pts: 25000, icon: "fa-crown",       desc: "Founding Crew — permanent 20% off + handwritten card", status: "locked" },
];

const ORDERS = [
  { id: "MP-1042", date: "May 14, 2026", items: "Midnight Black ×5, Midnight Blend 100g", total: 324, status: "Shipped" },
  { id: "MP-1038", date: "May 3, 2026",  items: "Midnight Black ×10", total: 250, status: "Delivered" },
  { id: "MP-1021", date: "Apr 20, 2026", items: "Trial Pack ×1", total: 99, status: "Delivered" },
];

const SUBSCRIPTION = { plan: "Night Shift", price: 210, contents: "10× Midnight Black sachets", status: "active", nextDelivery: "May 23, 2026", nextCharge: "May 23, 2026", countdown: 7, cancelBefore: "May 20, 2026" };
const ADDRESSES = [
  { id: 1, label: "Home", line1: "Flat 3B, House 14, Road 7", line2: "Mirpur-10, Dhaka", isDefault: true },
  { id: 2, label: "Hostel", line1: "Room 214, Hall A", line2: "University of Dhaka, Ramna", isDefault: false },
];
const POINTS_HISTORY = [
  { date: "May 14", desc: "Order #MP-1042", points: 160, type: "earned" },
  { date: "Apr 28", desc: "Referral: order placed", points: 500, type: "earned" },
  { date: "Apr 22", desc: "Redeemed for 1 sachet", points: 1000, type: "spent" },
  { date: "Apr 15", desc: "Referral: subscription started", points: 2000, type: "earned" },
];
const PAYMENT_METHODS = [
  { id: 1, type: "bKash", number: "01712-345678", isDefault: true },
  { id: 2, type: "Nagad", number: "01712-345678", isDefault: false },
];

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
  const pct = Math.min(100, Math.round((USER.points / USER.pointsThreshold) * 100));
  return (
    <div>
      <div className="greeting-card">
        <div className="greeting-name">Good evening, {USER.name}.</div>
        <div className="greeting-date">Friday, 16 May 2026</div>
      </div>
      <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("points")}>
        <div className="eyebrow">Midnight Points</div>
        <div className="row mb12" style={{ alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 38, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>{USER.points.toLocaleString()}</span>
          <span className="text-muted text-sm">pts</span>
        </div>
        <div className="progress-track mb8"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <div className="text-muted text-xs">{(USER.pointsThreshold - USER.points).toLocaleString()} pts to your next free sachet →</div>
      </div>
      <div className="card mb12 row-between" style={{ cursor: "pointer" }} onClick={() => setTab("subscription")}>
        <div>
          <div className="text-xs text-muted mb4">SUBSCRIPTION</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{SUBSCRIPTION.plan}</div>
          <div className="text-xs text-muted mt4">Next: {SUBSCRIPTION.nextDelivery}</div>
        </div>
        <span className="badge badge-green">Active</span>
      </div>
      <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("orders")}>
        <div className="row-between mb8">
          <span className="text-xs text-muted">LAST ORDER</span>
          <StatusBadge status={ORDERS[0].status} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }} className="mb4">{ORDERS[0].items}</div>
        <div className="row-between">
          <span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{ORDERS[0].total}</span>
          <button className="btn-link">View all orders →</button>
        </div>
      </div>
      <div className="col-gap mb12">
        <a href="shop.html" className="btn btn-primary btn-full"><i className="fa fa-coffee" /> Shop Now</a>
        <button className="btn btn-ghost btn-full" onClick={() => setTab("crew")}><i className="fa fa-share-alt" /> Refer a Friend</button>
      </div>
    </div>
  );
}

function OrdersTab() {
  const [filter, setFilter] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const filters = ["All", "Processing", "Shipped", "Delivered", "Cancelled"];
  const visible = filter === "All" ? ORDERS : ORDERS.filter(o => o.status === filter);
  return (
    <div>
      <div className="page-title">Your Orders</div>
      <div className="page-sub">{ORDERS.length} orders total</div>
      <div className="filter-row">
        {filters.map(f => <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      {visible.map(order => (
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
  const actions = [
    { label: "Pause Next Delivery", icon: "fa-pause", sheet: "pause" },
    { label: "Skip This Month", icon: "fa-forward", sheet: "skip" },
    { label: "Change Plan", icon: "fa-exchange-alt", sheet: "change" },
    { label: "Update Delivery Address", icon: "fa-map-marker-alt", sheet: "address" },
  ];
  return (
    <div>
      <div className="page-title">Subscription</div>
      <div className="card mb12">
        <div className="row-between mb12">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{sub.plan}</div>
            <div className="text-muted text-sm mt4">{sub.contents}</div>
          </div>
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
        <div className="row-between mb8 text-sm">
          <span className="text-muted">Next charge</span>
          <span style={{ fontWeight: 600 }}>৳{sub.price} on {sub.nextCharge}</span>
        </div>
        <div className="text-xs text-muted" style={{ fontStyle: "italic" }}>Cancel before {sub.cancelBefore} to skip this charge.</div>
      </div>
      <div className="col-gap mb20">
        {actions.map(a => (
          <button key={a.sheet} className="btn btn-ghost btn-full" onClick={() => setSheet(a.sheet)}>
            <i className={`fa ${a.icon}`} style={{ fontSize: 13 }} /> {a.label}
          </button>
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <button className="btn-link" style={{ color: "var(--red)" }} onClick={() => setSheet("cancel")}>Cancel Subscription</button>
      </div>
      {sheet && <Sheet title="Confirm action" body="Are you sure?" confirmLabel="Confirm" onConfirm={() => setSheet(null)} onClose={() => setSheet(null)} />}
    </div>
  );
}

function PointsTab() {
  const [sheet, setSheet] = useState(null);
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
          <span style={{ fontSize: 44, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>{USER.points.toLocaleString()}</span>
          <span className="text-muted">pts</span>
        </div>
        <div className="text-xs text-muted">
          Lifetime earned: <strong style={{ color: "var(--text)" }}>{USER.lifetimeEarned.toLocaleString()}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;Redeemed: <strong style={{ color: "var(--text)" }}>{USER.lifetimeRedeemed.toLocaleString()}</strong>
        </div>
      </div>
      <div className="eyebrow mb12">Redeem Points</div>
      {rewards.map(r => {
        const can = USER.points >= r.pts;
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
        {POINTS_HISTORY.map((p, i) => (
          <div key={i} className="pts-row">
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{p.desc}</div>
              <div className="text-xs text-muted mt4">{p.date}</div>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: p.type === "earned" ? "var(--green)" : "var(--red)" }}>
              {p.type === "earned" ? "+" : "−"}{p.points} pts
            </span>
          </div>
        ))}
      </div>
      {sheet && <Sheet title={`Redeem ${sheet.pts.toLocaleString()} points?`} body={`Redeem ${sheet.pts.toLocaleString()} points for "${sheet.label}"? This cannot be undone.`} confirmLabel="Yes, Redeem" onConfirm={() => setSheet(null)} onClose={() => setSheet(null)} />}
    </div>
  );
}

function AccountTab({ setTab }) {
  const [profile, setProfile] = useState({ name: USER.name, email: USER.email });
  const [edited, setEdited]   = useState(false);
  const [sheet, setSheet]     = useState(null);
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
          <input className="input" value={USER.phone} readOnly style={{ opacity: .7 }} />
          <div className="input-note">Requires OTP to change — contact support.</div>
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Email</label>
          <input className="input" value={profile.email} onChange={e => { setProfile(p => ({ ...p, email: e.target.value })); setEdited(true); }} />
        </div>
        {edited && <button className="btn btn-primary btn-full mt16" onClick={() => setEdited(false)}>Save Changes</button>}
      </div>
      <div className="eyebrow mb8 mt16">Saved Addresses</div>
      {ADDRESSES.map(a => (
        <div key={a.id} className="addr-card">
          <div>
            <div className="row mb4" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{a.label}</span>
              {a.isDefault && <span className="badge badge-orange">Default</span>}
            </div>
            <div className="text-sm text-muted">{a.line1}</div>
            <div className="text-sm text-muted">{a.line2}</div>
          </div>
          <button className="text-xs text-muted" style={{ textDecoration: "underline", flexShrink: 0 }}>Edit</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-full btn-sm mb16"><i className="fa fa-plus" style={{ fontSize: 11 }} /> Add New Address</button>
      <div className="eyebrow mb8">Payment Methods</div>
      {PAYMENT_METHODS.map(pm => (
        <div key={pm.id} className="pay-card">
          <div className="row" style={{ gap: 10 }}>
            <div className="pay-icon">{pm.type === "bKash" ? "bK" : "NG"}</div>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{pm.type}</div><div className="text-xs text-muted">{pm.number}</div></div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {pm.isDefault && <span className="badge badge-orange">Default</span>}
            <button className="text-xs text-muted" style={{ textDecoration: "underline" }}>Remove</button>
          </div>
        </div>
      ))}
      <div className="card mb16 mt8" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
        <div className="row mb8" style={{ gap: 10 }}>
          <i className="fa fa-fire text-orange" style={{ fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Midnight Crew Member</span>
        </div>
        <div className="text-sm text-muted mb12">Code: <strong style={{ color: "var(--orange)" }}>{USER.crewCode}</strong></div>
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
  const [copied, setCopied] = useState(false);
  const thisMonthRefs = REFERRAL_ACTIVITY.filter(r => r.date.startsWith("May")).length;
  const thisMonthPts  = REFERRAL_ACTIVITY.filter(r => r.date.startsWith("May")).reduce((s, r) => s + r.pts, 0);
  const totalPts      = REFERRAL_ACTIVITY.reduce((s, r) => s + r.pts, 0);
  const ordersGenerated = REFERRAL_ACTIVITY.filter(r => r.type === "order").length;
  const totalValue      = REFERRAL_ACTIVITY.reduce((s, r) => s + r.value, 0);
  const convRate        = "64%";

  function copy() {
    navigator.clipboard.writeText(USER.crewCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const waText = encodeURIComponent(`☕ Try Midnight Pick — premium instant coffee made for focus. Use my code ${USER.crewCode} for ${USER.crewDiscount}% off your first order: https://midnightpick.com`);

  return (
    <div>
      {/* Stat row */}
      <div className="stat-row mb16">
        <div className="stat-card">
          <div className="stat-label">Referrals This Month</div>
          <div className="stat-value">{thisMonthRefs}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Points This Month</div>
          <div className="stat-value">{thisMonthPts.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Lifetime Referrals</div>
          <div className="stat-value">{REFERRAL_ACTIVITY.length}</div>
        </div>
      </div>

      {/* Code card */}
      <div className="card mb12">
        <div className="eyebrow mb12">My Code</div>
        <div className="code-display-wrap">
          <div className="code-display">{USER.crewCode}</div>
          <div className="text-muted text-sm mt8">
            New customers get {USER.crewDiscount}% off their first order
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={copy}>
            <i className={`fa ${copied ? "fa-check" : "fa-copy"}`} style={{ fontSize: 13 }} />
            {copied ? "Copied ✓" : "Copy Code"}
          </button>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank" rel="noreferrer"
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            <i className="fab fa-whatsapp" style={{ fontSize: 14 }} /> Share on WhatsApp
          </a>
        </div>
      </div>

      {/* Quick stats strip */}
      <div className="card">
        <div className="eyebrow mb10">Quick Stats</div>
        <div className="grid-3" style={{ textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--orange)" }}>{ordersGenerated}</div>
            <div className="text-xs text-muted mt4">Orders generated</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--orange)" }}>৳{totalValue}</div>
            <div className="text-xs text-muted mt4">৳ value</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--orange)" }}>{convRate}</div>
            <div className="text-xs text-muted mt4">Conversion</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CrewActivity() {
  const [period, setPeriod] = useState("This Month");
  const periods = ["This Month", "Last Month", "All Time"];

  const filtered = period === "This Month"
    ? REFERRAL_ACTIVITY.filter(r => r.date.startsWith("May"))
    : period === "Last Month"
    ? REFERRAL_ACTIVITY.filter(r => r.date.startsWith("Apr"))
    : REFERRAL_ACTIVITY;

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
  const progress = Math.min(100, Math.round((USER.crewLifetimePts / USER.foundingPtsTarget) * 100));
  const toFounding = USER.foundingPtsTarget - USER.crewLifetimePts;

  return (
    <div>
      <div className="page-title">Status &amp; Milestones</div>

      {/* Current tier card */}
      <div className="card mb16" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
        <div className="row mb12" style={{ gap: 10 }}>
          <i className="fa fa-fire text-orange" style={{ fontSize: 20 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{USER.crewTier}</div>
            <div className="text-xs text-muted mt4">{USER.crewLifetimePts.toLocaleString()} lifetime points</div>
          </div>
        </div>
        <div className="progress-track mb8"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="text-xs text-muted">
          {toFounding.toLocaleString()} pts to <strong style={{ color: "var(--orange)" }}>Founding Crew</strong>
        </div>
      </div>

      {/* Milestones */}
      <div className="eyebrow mb12">Milestones</div>
      {MILESTONES.map((m, i) => (
        <div key={i} className={`milestone ${m.status === "locked" ? "locked" : ""}`}>
          <div className="milestone-icon">
            {m.status === "done"
              ? <i className="fa fa-check" style={{ color: "var(--green)" }} />
              : <i className={`fa ${m.icon}`} />}
          </div>
          <div className="milestone-body">
            <div className="milestone-pts">{m.pts.toLocaleString()} pts</div>
            <div className="milestone-desc">{m.desc}</div>
          </div>
          {m.status === "done" && <i className="fa fa-check-circle" style={{ color: "var(--green)", fontSize: 18, flexShrink: 0 }} />}
          {m.status === "inprogress" && <i className="fa fa-spinner fa-spin" style={{ color: "var(--orange)", fontSize: 16, flexShrink: 0 }} />}
          {m.status === "locked" && <i className="fa fa-lock" style={{ color: "var(--text-35)", fontSize: 16, flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

function CrewCodeSettings() {
  const [code, setCode] = useState(USER.crewCode);
  const [avail, setAvail] = useState(null);
  const timerRef = useRef(null);

  function handleChange(val) {
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    setAvail(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.length >= 4 && val !== USER.crewCode) {
      timerRef.current = setTimeout(() => {
        // Simulate availability check
        setAvail(val === "MIDNIGHT" ? "taken" : "available");
      }, 400);
    }
  }

  const isValid = code.length >= 4 && code.length <= 8 && code !== USER.crewCode && avail === "available";

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
        <div className="row-between mb8 text-sm">
          <span className="text-muted">Total uses</span>
          <span style={{ fontWeight: 700 }}>{REFERRAL_ACTIVITY.length}</span>
        </div>
        <div className="row-between text-sm">
          <span className="text-muted">Uses this month</span>
          <span style={{ fontWeight: 700 }}>{REFERRAL_ACTIVITY.filter(r => r.date.startsWith("May")).length}</span>
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
          <div className="sidebar-avatar">{USER.name[0]}</div>
          <div>
            <div className="sidebar-user-name">{USER.name}</div>
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
  const [tab, setTab] = useState("crew");
  const [logoutOpen, setLogoutOpen] = useState(false);

  const tabs = [
    { id: "home",   icon: "fa-home",  label: "Home" },
    { id: "orders", icon: "fa-box",   label: "Orders" },
    { id: "points", icon: "fa-star",  label: "Points" },
    { id: "account",icon: "fa-user",  label: "Account" },
    { id: "crew",   icon: "fa-fire",  label: "Crew" },
  ];

  const titles = { home: "Midnight Pick", orders: "Orders", points: "Points", account: "Account", crew: "Crew" };

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

  return (
    <>
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
          onConfirm={() => { window.location.href = "index.html"; }}
          onClose={() => setLogoutOpen(false)}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CrewDashboard />);
