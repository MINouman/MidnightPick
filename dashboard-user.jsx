// Midnight Pick — User Dashboard

const { useState, useRef, useEffect } = React;

// ── Mock Data ──────────────────────────────────────────
const USER = {
  name: "Rafi",
  phone: "01712-345678",
  email: "rafi@example.com",
  points: 3200,
  pointsThreshold: 4400,
  lifetimeEarned: 8750,
  lifetimeRedeemed: 5550,
  isCrew: true,
  crewCode: "RAFI15",
};

const SUBSCRIPTION = {
  plan: "Night Shift",
  price: 210,
  contents: "10× Midnight Black sachets",
  status: "active",
  nextDelivery: "May 23, 2026",
  nextCharge: "May 23, 2026",
  countdown: 7,
  cancelBefore: "May 20, 2026",
};

const ORDERS = [
  {
    id: "MP-1042", date: "May 14, 2026",
    items: "Midnight Black ×5, Midnight Blend 100g",
    total: 324, status: "Shipped",
    address: "Flat 3B, House 14, Road 7, Mirpur-10, Dhaka",
    payment: "bKash — 01712-345678",
    coupon: "RAFI15 (15% off — saved ৳57)",
    pointsEarned: 160,
    itemList: [
      { name: "Midnight Black Sachet", qty: 5, price: 25 },
      { name: "Midnight Blend 100g", qty: 1, price: 199 },
    ],
  },
  {
    id: "MP-1038", date: "May 3, 2026",
    items: "Midnight Black ×10",
    total: 250, status: "Delivered",
    address: "Flat 3B, House 14, Road 7, Mirpur-10, Dhaka",
    payment: "bKash — 01712-345678",
    coupon: null,
    pointsEarned: 125,
    itemList: [{ name: "Midnight Black Sachet", qty: 10, price: 25 }],
  },
  {
    id: "MP-1021", date: "Apr 20, 2026",
    items: "Trial Pack ×1",
    total: 99, status: "Delivered",
    address: "Flat 3B, House 14, Road 7, Mirpur-10, Dhaka",
    payment: "Nagad — 01712-345678",
    coupon: "WELCOME10 (10% off — saved ৳11)",
    pointsEarned: 50,
    itemList: [{ name: "Trial Pack", qty: 1, price: 99 }],
  },
  {
    id: "MP-1010", date: "Mar 31, 2026",
    items: "Midnight Black ×5",
    total: 125, status: "Cancelled",
    address: "Room 214, Hall A, University of Dhaka",
    payment: "bKash — 01712-345678",
    coupon: null,
    pointsEarned: 0,
    itemList: [{ name: "Midnight Black Sachet", qty: 5, price: 25 }],
  },
];

const ADDRESSES = [
  { id: 1, label: "Home", line1: "Flat 3B, House 14, Road 7", line2: "Mirpur-10, Dhaka", isDefault: true },
  { id: 2, label: "Hostel", line1: "Room 214, Hall A", line2: "University of Dhaka, Ramna", isDefault: false },
];

const POINTS_HISTORY = [
  { date: "May 14", desc: "Order #MP-1042", points: 160, type: "earned" },
  { date: "May 3",  desc: "Order #MP-1038", points: 125, type: "earned" },
  { date: "Apr 28", desc: "Referral: order placed", points: 500, type: "earned" },
  { date: "Apr 22", desc: "Redeemed for 1 sachet", points: 1000, type: "spent" },
  { date: "Apr 20", desc: "Order #MP-1021", points: 50, type: "earned" },
  { date: "Apr 15", desc: "Referral: subscription started", points: 2000, type: "earned" },
  { date: "Mar 31", desc: "Order #MP-1010 (cancelled — reversed)", points: 0, type: "neutral" },
  { date: "Mar 14", desc: "Referral: order placed", points: 500, type: "earned" },
];

const PAYMENT_METHODS = [
  { id: 1, type: "bKash", number: "01712-345678", isDefault: true },
  { id: 2, type: "Nagad", number: "01712-345678", isDefault: false },
];

// ── Status badge helper ──────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Processing: "badge-orange",
    Shipped:    "badge-blue",
    Delivered:  "badge-green",
    Cancelled:  "badge-red",
    Active:     "badge-green",
    Paused:     "badge-gray",
  };
  return <span className={`badge ${map[status] || "badge-gray"}`}>{status}</span>;
}

// ── Bottom Sheet ─────────────────────────────────────
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

// ── Tab: Home ────────────────────────────────────────
function HomeTab({ setTab }) {
  const pct = Math.min(100, Math.round((USER.points / USER.pointsThreshold) * 100));
  const toNext = USER.pointsThreshold - USER.points;
  const lastOrder = ORDERS[0];

  return (
    <div>
      <div className="greeting-card">
        <div className="greeting-name">Good evening, {USER.name}.</div>
        <div className="greeting-date">Friday, 16 May 2026</div>
      </div>

      {/* Points balance card */}
      <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("points")}>
        <div className="eyebrow">Midnight Points</div>
        <div className="row mb12" style={{ alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 38, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>
            {USER.points.toLocaleString()}
          </span>
          <span className="text-muted text-sm">pts</span>
        </div>
        <div className="progress-track mb8">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-muted text-xs">
          {toNext.toLocaleString()} pts to your next free sachet →
        </div>
      </div>

      {/* Active subscription strip */}
      <div className="card mb12 row-between" style={{ cursor: "pointer" }} onClick={() => setTab("subscription")}>
        <div>
          <div className="text-xs text-muted mb4">SUBSCRIPTION</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{SUBSCRIPTION.plan}</div>
          <div className="text-xs text-muted mt4">Next delivery: {SUBSCRIPTION.nextDelivery}</div>
        </div>
        <span className="badge badge-green">Active</span>
      </div>

      {/* Last order strip */}
      <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("orders")}>
        <div className="row-between mb8">
          <span className="text-xs text-muted">LAST ORDER</span>
          <StatusBadge status={lastOrder.status} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }} className="mb4">{lastOrder.items}</div>
        <div className="row-between">
          <span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{lastOrder.total}</span>
          <button className="btn-link" onClick={e => { e.stopPropagation(); setTab("orders"); }}>
            View all orders →
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="col-gap mb12">
        <a href="shop.html" className="btn btn-primary btn-full">
          <i className="fa fa-coffee" /> Shop Now
        </a>
        {USER.isCrew && (
          <a href="dashboard-crew.html" className="btn btn-ghost btn-full">
            <i className="fa fa-share-alt" /> Refer a Friend
          </a>
        )}
      </div>

      {/* Crew banner if not crew */}
      {!USER.isCrew && (
        <div className="card" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Earn points by spreading the word.
          </div>
          <div className="text-sm text-muted mb12">
            Apply to join the Midnight Crew and earn 500 pts for every order you refer.
          </div>
          <button className="btn btn-primary btn-sm">Apply to Join</button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Orders ──────────────────────────────────────
function OrdersTab() {
  const [filter, setFilter]   = useState("All");
  const [expanded, setExpanded] = useState(null);

  const filters = ["All", "Processing", "Shipped", "Delivered", "Cancelled"];

  const visible = filter === "All"
    ? ORDERS
    : ORDERS.filter(o => o.status === filter);

  function whatsAppLink(orderId) {
    const msg = encodeURIComponent(`Hi Midnight Pick! I need help with order ${orderId}.`);
    return `https://wa.me/8801XXXXXXXXX?text=${msg}`;
  }

  return (
    <div>
      <div className="page-title">Your Orders</div>
      <div className="page-sub">{ORDERS.length} orders total</div>

      <div className="filter-row">
        {filters.map(f => (
          <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><i className="fa fa-box-open" /></div>
          <h3>No orders yet.</h3>
          <p>Your first cup is waiting.</p>
          <a href="shop.html" className="btn btn-primary">Shop Now</a>
        </div>
      ) : visible.map(order => (
        <div key={order.id} className="accordion">
          <div className="accordion-hd" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
            <div className="row-between mb8">
              <span className="mono text-muted text-xs">{order.id}</span>
              <span className="text-xs text-muted">{order.date}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {order.items}
            </div>
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
              <div className="eyebrow mb12">Order Details</div>

              {/* Item list */}
              {order.itemList.map((item, i) => (
                <div key={i} className="row-between mb8" style={{ fontSize: 13 }}>
                  <span>{item.name} ×{item.qty}</span>
                  <span className="text-muted">৳{item.price * item.qty}</span>
                </div>
              ))}
              <div className="divider" />

              <div className="row-between mb8 text-sm">
                <span className="text-muted">Delivery</span>
                <span>{order.address}</span>
              </div>
              <div className="row-between mb8 text-sm">
                <span className="text-muted">Payment</span>
                <span>{order.payment}</span>
              </div>
              {order.coupon && (
                <div className="row-between mb8 text-sm">
                  <span className="text-muted">Coupon</span>
                  <span style={{ color: "var(--green)" }}>{order.coupon}</span>
                </div>
              )}
              {order.pointsEarned > 0 && (
                <div className="row-between mb12 text-sm">
                  <span className="text-muted">Points earned</span>
                  <span style={{ color: "var(--orange)" }}>+{order.pointsEarned} pts</span>
                </div>
              )}
              <div className="divider" />

              <div className="row" style={{ gap: 8 }}>
                {order.status !== "Cancelled" && (
                  <button className="btn btn-primary btn-sm">
                    <i className="fa fa-redo" style={{ fontSize: 11 }} /> Reorder
                  </button>
                )}
                <a href={whatsAppLink(order.id)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <i className="fab fa-whatsapp" style={{ fontSize: 13 }} /> Help
                </a>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab: Subscription ────────────────────────────────
function SubscriptionTab() {
  const [sheet, setSheet] = useState(null);
  const sub = SUBSCRIPTION;

  if (!sub) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><i className="fa fa-calendar-check" /></div>
        <h3>Subscribe &amp; Save.</h3>
        <p>Get your favourite Midnight Pick sachets on autopilot. Cancel any time.</p>
        <button className="btn btn-primary">Start a Subscription</button>
      </div>
    );
  }

  const actions = [
    { label: "Pause Next Delivery", icon: "fa-pause", sheet: "pause" },
    { label: "Skip This Month",     icon: "fa-forward", sheet: "skip" },
    { label: "Change Plan",         icon: "fa-exchange-alt", sheet: "change" },
    { label: "Update Delivery Address", icon: "fa-map-marker-alt", sheet: "address" },
  ];

  const sheetContent = {
    pause:   { title: "Pause next delivery?", body: "Your next delivery on " + sub.nextDelivery + " will be paused. You can resume at any time from this screen.", confirmLabel: "Yes, Pause" },
    skip:    { title: "Skip this month?",     body: "We'll skip your May delivery. Your subscription continues as normal next month. Points for this month won't be earned.", confirmLabel: "Yes, Skip" },
    change:  { title: "Change plan",          body: "You'll be taken to plan selection. Your billing date stays the same.", confirmLabel: "Change Plan" },
    address: { title: "Update address",       body: "We'll update the address for all future deliveries.", confirmLabel: "Update" },
    cancel:  { title: "Cancel subscription?", body: "We're sad to see you go. Your subscription will end after your current billing cycle. Points already earned won't be affected.", confirmLabel: "Yes, Cancel" },
  };

  return (
    <div>
      <div className="page-title">Subscription</div>

      {/* Status card */}
      <div className="card mb12">
        <div className="row-between mb12">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{sub.plan}</div>
            <div className="text-muted text-sm mt4">{sub.contents}</div>
          </div>
          <StatusBadge status="Active" />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--orange)" }}>৳{sub.price}<span className="text-muted text-sm" style={{ fontWeight: 400 }}>/mo</span></div>
      </div>

      {/* Next delivery */}
      <div className="card mb12">
        <div className="eyebrow">Next Delivery</div>
        <div style={{ fontSize: 17, fontWeight: 700 }} className="mb4">{sub.nextDelivery}</div>
        <div className="text-muted text-sm">In {sub.countdown} days</div>
      </div>

      {/* Billing */}
      <div className="card mb16">
        <div className="eyebrow">Billing</div>
        <div className="row-between mb8 text-sm">
          <span className="text-muted">Next charge</span>
          <span style={{ fontWeight: 600 }}>৳{sub.price} on {sub.nextCharge}</span>
        </div>
        <div className="text-xs text-muted" style={{ fontStyle: "italic" }}>
          Cancel before {sub.cancelBefore} to skip this charge.
        </div>
      </div>

      {/* Action buttons */}
      <div className="col-gap mb20">
        {actions.map(a => (
          <button key={a.sheet} className="btn btn-ghost btn-full" onClick={() => setSheet(a.sheet)}>
            <i className={`fa ${a.icon}`} style={{ fontSize: 13 }} /> {a.label}
          </button>
        ))}
      </div>

      {/* Cancel link */}
      <div style={{ textAlign: "center", paddingTop: 8 }}>
        <button className="btn-link" style={{ color: "var(--red)" }} onClick={() => setSheet("cancel")}>
          Cancel Subscription
        </button>
      </div>

      {sheet && sheetContent[sheet] && (
        <Sheet
          {...sheetContent[sheet]}
          onConfirm={() => setSheet(null)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

// ── Tab: Points ──────────────────────────────────────
function PointsTab() {
  const [sheet, setSheet] = useState(null);

  const rewards = [
    { id: "sachet", label: "1 Free Sachet", pts: 1000, worth: "৳25" },
    { id: "bkash",  label: "৳100 bKash Credit", pts: 5000, worth: "৳100" },
    { id: "month",  label: "One Free Month — Night Shift", pts: 10000, worth: "৳210" },
  ];

  const sheetBody = (r) =>
    `Redeem ${r.pts.toLocaleString()} points for "${r.label}"? This cannot be undone.`;

  return (
    <div>
      {/* Balance */}
      <div className="card mb16">
        <div className="eyebrow">Midnight Points</div>
        <div className="row mb8" style={{ alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>
            {USER.points.toLocaleString()}
          </span>
          <span className="text-muted">pts</span>
        </div>
        <div className="text-xs text-muted">
          Lifetime earned: <strong style={{ color: "var(--cream)" }}>{USER.lifetimeEarned.toLocaleString()}</strong>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          Redeemed: <strong style={{ color: "var(--cream)" }}>{USER.lifetimeRedeemed.toLocaleString()}</strong>
        </div>
      </div>

      {/* Redeem section */}
      <div className="eyebrow mb12">Redeem Points</div>
      {rewards.map(r => {
        const canRedeem = USER.points >= r.pts;
        return (
          <div key={r.id} className="redeem-card">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
              <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: 13 }}>{r.pts.toLocaleString()} pts</div>
              <div className="text-xs text-muted mt4">Worth {r.worth}</div>
            </div>
            <button
              className={`btn btn-sm ${canRedeem ? "btn-primary" : "btn-ghost"}`}
              disabled={!canRedeem}
              onClick={() => canRedeem && setSheet(r)}
              style={{ flexShrink: 0 }}
            >
              {canRedeem ? "Redeem" : "Locked"}
            </button>
          </div>
        );
      })}

      {/* History */}
      <div className="mt16 mb8 eyebrow">History</div>
      <div className="card">
        {POINTS_HISTORY.filter(p => p.points !== 0).map((p, i) => (
          <div key={i} className="pts-row">
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{p.desc}</div>
              <div className="text-xs text-muted mt4">{p.date}</div>
            </div>
            <span style={{
              fontWeight: 700, fontSize: 13,
              color: p.type === "earned" ? "var(--green)" : "var(--red)"
            }}>
              {p.type === "earned" ? "+" : "−"}{p.points} pts
            </span>
          </div>
        ))}
      </div>

      {sheet && (
        <Sheet
          title={`Redeem ${sheet.pts.toLocaleString()} points?`}
          body={sheetBody(sheet)}
          confirmLabel="Yes, Redeem"
          onConfirm={() => setSheet(null)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

// ── Tab: Account ─────────────────────────────────────
function AccountTab() {
  const [profile, setProfile] = useState({ name: USER.name, email: USER.email });
  const [edited, setEdited]   = useState(false);
  const [sheet, setSheet]     = useState(null);

  function handleChange(field, val) {
    setProfile(p => ({ ...p, [field]: val }));
    setEdited(true);
  }

  return (
    <div>
      <div className="page-title">Account</div>

      {/* Profile */}
      <div className="card mb12">
        <div className="eyebrow mb12">Profile</div>
        <div className="input-group">
          <label className="input-label">Name</label>
          <input className="input" value={profile.name} onChange={e => handleChange("name", e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Phone</label>
          <input className="input" value={USER.phone} readOnly style={{ opacity: .7 }} />
          <div className="input-note">Requires OTP to change — contact support.</div>
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Email</label>
          <input className="input" value={profile.email} onChange={e => handleChange("email", e.target.value)} />
        </div>
        {edited && (
          <button className="btn btn-primary btn-full mt16" onClick={() => setEdited(false)}>
            Save Changes
          </button>
        )}
      </div>

      {/* Addresses */}
      <div className="eyebrow mb8 mt16">Saved Addresses</div>
      {ADDRESSES.map(addr => (
        <div key={addr.id} className="addr-card">
          <div>
            <div className="row mb4" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{addr.label}</span>
              {addr.isDefault && <span className="badge badge-orange">Default</span>}
            </div>
            <div className="text-sm text-muted">{addr.line1}</div>
            <div className="text-sm text-muted">{addr.line2}</div>
          </div>
          <button className="text-xs text-muted" style={{ textDecoration: "underline", flexShrink: 0 }}>Edit</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-full btn-sm mb16">
        <i className="fa fa-plus" style={{ fontSize: 11 }} /> Add New Address
      </button>

      {/* Payment methods */}
      <div className="eyebrow mb8">Payment Methods</div>
      {PAYMENT_METHODS.map(pm => (
        <div key={pm.id} className="pay-card">
          <div className="row" style={{ gap: 10 }}>
            <div className="pay-icon">{pm.type === "bKash" ? "bK" : "NG"}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{pm.type}</div>
              <div className="text-xs text-muted">{pm.number}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {pm.isDefault && <span className="badge badge-orange">Default</span>}
            <button className="text-xs text-muted" style={{ textDecoration: "underline" }}>Remove</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-full btn-sm mb16">
        <i className="fa fa-plus" style={{ fontSize: 11 }} /> Add Payment Method
      </button>

      {/* Crew status */}
      {USER.isCrew && (
        <div className="card mb16" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
          <div className="row mb8" style={{ gap: 10 }}>
            <i className="fa fa-fire text-orange" style={{ fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Midnight Crew Member</span>
          </div>
          <div className="text-sm text-muted mb12">Your referral code: <strong style={{ color: "var(--orange)" }}>{USER.crewCode}</strong></div>
          <a href="dashboard-crew.html" className="btn btn-primary btn-sm">Go to Crew Dashboard</a>
        </div>
      )}

      {/* Danger zone */}
      <div className="divider" />
      <div className="col-gap" style={{ paddingTop: 4 }}>
        <button className="btn btn-ghost btn-full" onClick={() => setSheet("logout")}>
          <i className="fa fa-sign-out-alt" style={{ fontSize: 13 }} /> Log Out
        </button>
        <div style={{ textAlign: "center" }}>
          <button className="btn-link" style={{ color: "var(--red)", fontSize: 12 }} onClick={() => setSheet("delete")}>
            Delete Account
          </button>
        </div>
      </div>

      {sheet === "logout" && (
        <Sheet
          title="Log out?"
          body="You'll be signed out of your Midnight Pick account on this device."
          confirmLabel="Log Out"
          onConfirm={() => setSheet(null)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "delete" && (
        <Sheet
          title="Delete account?"
          body="This is permanent and cannot be undone. All your order history, points, and subscription will be removed."
          confirmLabel="Yes, Delete My Account"
          onConfirm={() => setSheet(null)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────
function Sidebar({ tab, setTab }) {
  const links = [
    { id: "home",         icon: "fa-home",          label: "Home" },
    { id: "orders",       icon: "fa-box",            label: "Orders" },
    { id: "subscription", icon: "fa-calendar-check", label: "Subscription" },
    { id: "points",       icon: "fa-star",           label: "Points" },
    { id: "account",      icon: "fa-user",           label: "Account" },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="assets/logo.png" alt="Midnight Pick" />
      </div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <div key={l.id} className={`sidebar-link ${tab === l.id ? "active" : ""}`} onClick={() => setTab(l.id)}>
            <i className={`fa ${l.icon} s-icon`} />
            <span>{l.label}</span>
          </div>
        ))}
        {USER.isCrew && (
          <>
            <div className="sidebar-section-label">Crew</div>
            <a href="dashboard-crew.html" className="sidebar-link">
              <i className="fa fa-fire s-icon" />
              <span>Crew Dashboard</span>
            </a>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{USER.name[0]}</div>
          <div>
            <div className="sidebar-user-name">{USER.name}</div>
            <div className="sidebar-user-role">{USER.isCrew ? "Midnight Crew" : "Member"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── App ──────────────────────────────────────────────
function UserDashboard() {
  const [tab, setTab] = useState("home");

  const tabs = [
    { id: "home",         icon: "fa-home",          label: "Home" },
    { id: "orders",       icon: "fa-box",            label: "Orders" },
    { id: "subscription", icon: "fa-calendar-check", label: "Sub" },
    { id: "points",       icon: "fa-star",           label: "Points" },
    { id: "account",      icon: "fa-user",           label: "Account" },
  ];

  const tabTitles = {
    home:         "Midnight Pick",
    orders:       "Orders",
    subscription: "Subscription",
    points:       "Points",
    account:      "Account",
  };

  function renderTab() {
    switch (tab) {
      case "home":         return <HomeTab setTab={setTab} />;
      case "orders":       return <OrdersTab />;
      case "subscription": return <SubscriptionTab />;
      case "points":       return <PointsTab />;
      case "account":      return <AccountTab />;
      default:             return null;
    }
  }

  return (
    <>
      <div className="dash-layout">
        <Sidebar tab={tab} setTab={setTab} />
        <div className="dash-main">
          <header className="topbar">
            <img src="assets/logo.png" alt="Midnight Pick" className="topbar-logo" />
            <span className="topbar-title">{tabTitles[tab]}</span>
            <div className="topbar-right">
              <button className="icon-btn">
                <i className="fa fa-bell" />
                <span className="notif-dot" />
              </button>
            </div>
          </header>
          <main className="dash-content">
            <div className="dash-inner">{renderTab()}</div>
          </main>
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

ReactDOM.createRoot(document.getElementById("root")).render(<UserDashboard />);
