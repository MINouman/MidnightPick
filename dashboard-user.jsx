// Midnight Pick — User Dashboard

const { useState, useRef, useEffect, useContext, createContext } = React;

const DashCtx = createContext(null);

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}

function fmtStatus(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function orderSummary(items) {
  if (!items || !items.length) return "";
  return items.map(i => `${i.name} ×${i.qty}`).join(", ");
}

function addrString(snap) {
  if (!snap) return "";
  return [snap.line1, snap.line2, snap.city, snap.district].filter(Boolean).join(", ");
}

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
  const { user, orders } = useContext(DashCtx);
  const pts      = user?.points_balance || 0;
  const threshold = 4400;
  const pct      = Math.min(100, Math.round((pts / threshold) * 100));
  const toNext   = Math.max(0, threshold - pts);
  const lastOrder = orders[0];
  const isCrew   = user?.role === "crew";
  const now      = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="greeting-card">
        <div className="greeting-name">{greeting}, {user?.name || "there"}.</div>
        <div className="greeting-date">{now.toLocaleDateString("en-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      {/* Points balance card */}
      <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("points")}>
        <div className="eyebrow">Midnight Points</div>
        <div className="row mb12" style={{ alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 38, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>
            {pts.toLocaleString()}
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

      {/* Last order strip */}
      {lastOrder ? (
        <div className="card mb12" style={{ cursor: "pointer" }} onClick={() => setTab("orders")}>
          <div className="row-between mb8">
            <span className="text-xs text-muted">LAST ORDER</span>
            <StatusBadge status={fmtStatus(lastOrder.status)} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }} className="mb4">{orderSummary(lastOrder.items)}</div>
          <div className="row-between">
            <span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{lastOrder.total}</span>
            <button className="btn-link" onClick={e => { e.stopPropagation(); setTab("orders"); }}>
              View all orders →
            </button>
          </div>
        </div>
      ) : (
        <div className="card mb12">
          <div className="text-sm text-muted" style={{ textAlign: "center", padding: "12px 0" }}>No orders yet. Place your first order!</div>
        </div>
      )}

      {/* Quick actions */}
      <div className="col-gap mb12">
        <a href="shop.html" className="btn btn-primary btn-full">
          <i className="fa fa-coffee" /> Shop Now
        </a>
        {isCrew && (
          <a href="dashboard-crew.html" className="btn btn-ghost btn-full">
            <i className="fa fa-share-alt" /> Refer a Friend
          </a>
        )}
      </div>

      {/* Crew banner if not crew */}
      {!isCrew && (
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
  const { orders } = useContext(DashCtx);
  const [filter, setFilter]     = useState("All");
  const [expanded, setExpanded] = useState(null);

  const filters = ["All", "Confirmed", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];

  const visible = filter === "All"
    ? orders
    : orders.filter(o => fmtStatus(o.status) === filter);

  function whatsAppLink(ref) {
    const msg = encodeURIComponent(`Hi Midnight Pick! I need help with order ${ref}.`);
    return `https://wa.me/8801XXXXXXXXX?text=${msg}`;
  }

  return (
    <div>
      <div className="page-title">Your Orders</div>
      <div className="page-sub">{orders.length} orders total</div>

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
              <span className="mono text-muted text-xs">{order.order_ref}</span>
              <span className="text-xs text-muted">{fmtDate(order.created_at)}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {orderSummary(order.items)}
            </div>
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
              <div className="eyebrow mb12">Order Details</div>

              {(order.items || []).map((item, i) => (
                <div key={i} className="row-between mb8" style={{ fontSize: 13 }}>
                  <span>{item.name} ×{item.qty}</span>
                  <span className="text-muted">৳{item.unit_price * item.qty}</span>
                </div>
              ))}
              <div className="divider" />

              <div className="row-between mb8 text-sm">
                <span className="text-muted">Delivery</span>
                <span>{addrString(order.address_snapshot)}</span>
              </div>
              <div className="row-between mb8 text-sm">
                <span className="text-muted">Payment</span>
                <span style={{ textTransform: "capitalize" }}>{order.payment_type}</span>
              </div>
              {order.coupon_code && (
                <div className="row-between mb8 text-sm">
                  <span className="text-muted">Coupon</span>
                  <span style={{ color: "var(--green)" }}>{order.coupon_code} (saved ৳{order.discount_amount})</span>
                </div>
              )}
              {order.points_earned > 0 && (
                <div className="row-between mb12 text-sm">
                  <span className="text-muted">Points earned</span>
                  <span style={{ color: "var(--orange)" }}>+{order.points_earned} pts</span>
                </div>
              )}
              <div className="divider" />

              <div className="row" style={{ gap: 8 }}>
                <a href={whatsAppLink(order.order_ref)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
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
  const sub = null; // subscriptions backend coming soon

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
      {/* Balance */}
      <div className="card mb16">
        <div className="eyebrow">Midnight Points</div>
        <div className="row mb8" style={{ alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: "var(--orange)", lineHeight: 1 }}>
            {pts.toLocaleString()}
          </span>
          <span className="text-muted">pts</span>
        </div>
      </div>

      {/* Redeem section */}
      <div className="eyebrow mb12">Redeem Points</div>
      {rewards.map(r => {
        const canRedeem = pts >= r.pts;
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
        {pointsHistory.length === 0 ? (
          <div className="text-sm text-muted" style={{ padding: "12px 0", textAlign: "center" }}>No points activity yet.</div>
        ) : pointsHistory.map((p, i) => (
          <div key={i} className="pts-row">
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{p.description}</div>
              <div className="text-xs text-muted mt4">{fmtDate(p.created_at)}</div>
            </div>
            <span style={{
              fontWeight: 700, fontSize: 13,
              color: p.type === "earned" || p.type === "bonus" ? "var(--green)" : "var(--red)"
            }}>
              {p.type === "earned" || p.type === "bonus" ? "+" : "−"}{Math.abs(p.points)} pts
            </span>
          </div>
        ))}
      </div>

      {sheet && (
        <Sheet
          title={`Redeem ${sheet.pts.toLocaleString()} points?`}
          body={`Redeem ${sheet.pts.toLocaleString()} points for "${sheet.label}"? This cannot be undone.`}
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
  const { user, addresses, paymentMethods, reload } = useContext(DashCtx);
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [edited, setEdited]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [sheet, setSheet]     = useState(null);

  useEffect(() => {
    setProfile({ name: user?.name || "", email: user?.email || "" });
  }, [user]);

  async function saveProfile() {
    setSaving(true);
    try {
      await mpApi.fetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ name: profile.name, email: profile.email || undefined }),
      });
      setEdited(false);
      reload();
    } finally {
      setSaving(false);
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

  const pmLabel = (type) => {
    const map = { bkash: "bK", nagad: "NG", rocket: "RK", card: "CRD", cod: "COD" };
    return map[type] || type?.slice(0,2).toUpperCase() || "?";
  };

  return (
    <div>
      <div className="page-title">Account</div>

      {/* Profile */}
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
        {edited && (
          <button className="btn btn-primary btn-full mt16" disabled={saving} onClick={saveProfile}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>

      {/* Addresses */}
      <div className="eyebrow mb8 mt16">Saved Addresses</div>
      {addresses.length === 0 ? (
        <div className="text-sm text-muted mb12" style={{ textAlign: "center" }}>No saved addresses yet.</div>
      ) : addresses.map(addr => (
        <div key={addr.id} className="addr-card">
          <div>
            <div className="row mb4" style={{ gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{addr.label}</span>
              {addr.is_default && <span className="badge badge-orange">Default</span>}
            </div>
            <div className="text-sm text-muted">{addr.line1}</div>
            {addr.line2 && <div className="text-sm text-muted">{addr.line2}</div>}
            {addr.city && <div className="text-sm text-muted">{addr.city}</div>}
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-full btn-sm mb16">
        <i className="fa fa-plus" style={{ fontSize: 11 }} /> Add New Address
      </button>

      {/* Payment methods */}
      <div className="eyebrow mb8">Payment Methods</div>
      {paymentMethods.length === 0 ? (
        <div className="text-sm text-muted mb12" style={{ textAlign: "center" }}>No payment methods saved.</div>
      ) : paymentMethods.map(pm => (
        <div key={pm.id} className="pay-card">
          <div className="row" style={{ gap: 10 }}>
            <div className="pay-icon">{pmLabel(pm.type)}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{pm.type}</div>
              <div className="text-xs text-muted">{pm.number}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {pm.is_default && <span className="badge badge-orange">Default</span>}
          </div>
        </div>
      ))}
      <button className="btn btn-ghost btn-full btn-sm mb16">
        <i className="fa fa-plus" style={{ fontSize: 11 }} /> Add Payment Method
      </button>

      {/* Crew status */}
      {user?.role === "crew" && (
        <div className="card mb16" style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)" }}>
          <div className="row mb8" style={{ gap: 10 }}>
            <i className="fa fa-fire text-orange" style={{ fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Midnight Crew Member</span>
          </div>
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
          onConfirm={handleLogout}
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
function Sidebar({ tab, setTab, onLogout }) {
  const { user } = useContext(DashCtx);
  const isCrew   = user?.role === "crew";
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
        {isCrew && (
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
        <div className="sidebar-user" style={{ marginBottom: 10 }}>
          <div className="sidebar-avatar">{(user?.name || "?")[0].toUpperCase()}</div>
          <div>
            <div className="sidebar-user-name">{user?.name || "—"}</div>
            <div className="sidebar-user-role">{isCrew ? "Midnight Crew" : "Member"}</div>
          </div>
        </div>
        <button className="sidebar-link" style={{ width: "100%", borderLeft: "3px solid transparent", color: "var(--cream-65)" }} onClick={onLogout}>
          <i className="fa fa-sign-out-alt s-icon" /><span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ── Loading screen ───────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <i className="fa fa-circle-notch fa-spin" style={{ fontSize: 28, color: "var(--orange)" }} />
        <div className="text-muted text-sm" style={{ marginTop: 12 }}>Loading…</div>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────
function UserDashboard() {
  const [tab, setTab]           = useState("home");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [data, setData]         = useState({
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
      reload: loadData,
    });
  }

  useEffect(() => {
    if (!mpApi.guard(["user", "crew", "influencer"])) return;
    loadData();
  }, []);

  if (data.loading) return <LoadingScreen />;

  const ctxValue = { ...data, reload: loadData };

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
    <DashCtx.Provider value={ctxValue}>
      <div className="dash-layout">
        <Sidebar tab={tab} setTab={setTab} onLogout={() => setLogoutOpen(true)} />
        <div className="dash-main">
          <main className="dash-content">
            <div className="dash-inner">{renderTab()}</div>
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

ReactDOM.createRoot(document.getElementById("root")).render(<UserDashboard />);
