// Midnight Pick — Customer Dashboard

const { useState, useEffect, useContext, createContext } = React;

const BD_AREAS = {
  "Dhaka": [
    "Adabor","Airport","Azimpur","Badda","Banani","Bangshal","Baridhara","Bashundhara",
    "Cantonment","Chawkbazar","Demra","Dhanmondi","Farmgate","Gulshan","Hatirjheel",
    "Hazaribagh","Jatrabari","Kafrul","Kamrangirchar","Karwan Bazar","Khilgaon","Khilkhet",
    "Kotwali","Lalbagh","Lalmatia","Malibagh","Mirpur","Mohammadpur","Motijheel","Mugda",
    "Nakhalpara","Niketan","Old Dhaka","Pallabi","Paltan","Ramna","Rampura","Sabujbagh",
    "Shahbagh","Shantinagar","Shiddheswari","Shyampur","Sutrapur","Tejgaon","Turag",
    "Uttara","Wari",
  ],
  "Chattogram": [
    "Agrabad","Anwara","Bayazid Bostami","Chandgaon","Double Mooring","GEC Circle",
    "Halishahar","Khulshi","Kotwali","Nasirabad","Pahartali","Panchlaish","Patiya",
    "Patenga","Sadarghat",
  ],
  "Gazipur": [
    "Gazipur Sadar","Joydebpur","Kaliakair","Kapasia","Sreepur","Tongi",
  ],
  "Narayanganj": [
    "Araihazar","Fatullah","Narayanganj Sadar","Rupganj","Siddhirganj","Sonargaon",
  ],
  "Sylhet": [
    "Ambarkhana","Bianibazar","Golapganj","Jalalabad","Kumargaon","Shibganj","Sylhet Sadar","Zindabazar",
  ],
  "Rajshahi": [
    "Boalia","Motihar","Paba","Rajpara","Rajshahi Sadar","Shah Makhdum",
  ],
  "Khulna": [
    "Daulatpur","Khan Jahan Ali","Khalishpur","Khulna Sadar","Rupsha","Sonadanga",
  ],
  "Cumilla": [
    "Burichang","Chandina","Cumilla Sadar","Daudkandi","Kotwali","Laksam","Muradnagar",
  ],
  "Mymensingh": [
    "Mymensingh Sadar","Muktagacha","Phulbaria","Trishal",
  ],
  "Bogura": [
    "Bogura Sadar","Gabtali","Shahjahanpur","Shibganj","Sonatola",
  ],
  "Rangpur": [
    "Badarganj","Gangachara","Kaunia","Mithapukur","Pirganj","Rangpur Sadar",
  ],
  "Barishal": [
    "Agailjhara","Barishal Sadar","Babuganj","Bakerganj","Gaurnadi","Mehendiganj",
  ],
  "Jessore": [
    "Abhaynagar","Chaugachha","Jessore Sadar","Jhikargachha","Keshabpur","Manirampur",
  ],
  "Faridpur": [
    "Faridpur Sadar","Alfadanga","Boalmari","Bhanga","Charbhadrasan","Madhukhali",
  ],
  "Tangail": [
    "Tangail Sadar","Basail","Bhuapur","Delduar","Ghatail","Gopalpur","Kalihati","Madhupur",
  ],
};
const DashCtx = createContext(null);

// ── Helpers ───────────────────────────────────────────────────
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
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Processing: "badge-orange", Confirmed: "badge-orange", Packed: "badge-orange",
    Shipped: "badge-blue", Delivered: "badge-green", Cancelled: "badge-red",
    Active: "badge-green", Paused: "badge-gray",
  };
  return <span className={`badge ${map[status] || "badge-gray"}`}>{status}</span>;
}

// ── Sheet ─────────────────────────────────────────────────────
function Sheet({ title, body, onConfirm, confirmLabel = "Confirm", onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">{title}</div>
        {body && <div className="sheet-body">{body}</div>}
        {children}
        {!children && (
          <div className="col-gap">
            <button className="btn btn-primary btn-full" onClick={onConfirm}>{confirmLabel}</button>
            <button className="btn btn-ghost btn-full" onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HOME TAB ──────────────────────────────────────────────────
function HomeTab({ setTab }) {
  const { user, orders } = useContext(DashCtx);
  const pts       = user?.points_balance || 0;
  const lastOrder = orders[0];
  const isCrew    = user?.role === "crew";
  const threshold = 1000;
  const pct       = Math.min(100, Math.round((pts / threshold) * 100));
  const toNext    = Math.max(0, threshold - pts);

  return (
    <div>
      {/* Greeting Banner */}
      <div className="greeting-banner mb20">
        <div className="greeting-time">{getGreeting()}</div>
        <div className="greeting-name">{user?.name?.split(" ")[0] || "there"}</div>
        <div className="greeting-date">
          {new Date().toLocaleDateString("en-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* 2-column grid */}
      <div className="home-grid">

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Last order */}
          <div
            className="card"
            style={{ cursor: lastOrder ? "pointer" : "default" }}
            onClick={() => lastOrder && setTab("orders")}
          >
            <div className="eyebrow">Last Order</div>
            {lastOrder ? (
              <>
                <div className="row-between mb8">
                  <span className="mono text-xs text-muted">{lastOrder.order_ref}</span>
                  <StatusBadge status={fmtStatus(lastOrder.status)} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {orderSummary(lastOrder.items)}
                </div>
                <div className="row-between">
                  <span style={{ fontSize: 20, fontWeight: 700, color: "var(--orange)" }}>৳{lastOrder.total?.toLocaleString()}</span>
                  <span className="text-xs text-muted">{fmtDate(lastOrder.created_at)}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted" style={{ padding: "14px 0", textAlign: "center" }}>
                No orders yet.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="col-gap">
            <a href="shop.html" className="btn btn-primary btn-full">
              <i className="fa fa-coffee" /> Shop Now
            </a>
            <button className="btn btn-ghost btn-full" onClick={() => setTab("orders")}>
              View All Orders
            </button>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Points mini card */}
          <div className="pts-mini" onClick={() => setTab("points")}>
            <div className="pts-mini-eyebrow">Midnight Points</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, position: "relative", zIndex: 1 }}>
              <span className="pts-mini-val">{pts.toLocaleString()}</span>
              <span className="pts-mini-sub">pts</span>
            </div>
            <div className="pts-mini-progress">
              <div className="pts-mini-progress-labels">
                <span>{toNext.toLocaleString()} pts to first reward</span>
                <span>{pct}%</span>
              </div>
              <div className="pts-mini-track">
                <div className="pts-mini-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Subscription teaser */}
          <div className="card" style={{ cursor: "pointer" }} onClick={() => setTab("subscription")}>
            <div className="row-between">
              <div>
                <div className="eyebrow">Monthly Plan</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Coffee on autopilot</div>
                <div className="text-xs text-muted mt4">Skip or pause anytime →</div>
              </div>
              <i className="fa fa-calendar-check" style={{ fontSize: 28, color: "var(--orange)", opacity: .5 }} />
            </div>
          </div>

          {/* Crew CTA */}
          {!isCrew ? (
            <div className="crew-banner">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Join the Midnight Crew</div>
              <div className="text-sm text-muted mb12">Earn points for every friend you refer.</div>
              <button className="btn btn-primary btn-sm">Apply Now</button>
            </div>
          ) : (
            <div className="crew-banner">
              <div className="eyebrow">Midnight Crew</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>You're in.</div>
              <a href="dashboard-crew.html" className="btn btn-primary btn-sm">Crew Dashboard →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ORDERS TAB ────────────────────────────────────────────────
function OrdersTab() {
  const { orders } = useContext(DashCtx);
  const [filter, setFilter]     = useState("All");
  const [expanded, setExpanded] = useState(null);

  const filters = ["All", "Confirmed", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];
  const visible  = filter === "All" ? orders : orders.filter(o => fmtStatus(o.status) === filter);

  function waLink(ref) {
    return `https://wa.me/8801XXXXXXXXX?text=${encodeURIComponent(`Hi Midnight Pick! I need help with order ${ref}.`)}`;
  }

  return (
    <div>
      <div className="page-title">Your Orders</div>
      <div className="page-sub">{orders.length} order{orders.length !== 1 ? "s" : ""} total</div>

      <div className="filter-row">
        {filters.map(f => (
          <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><i className="fa fa-box-open" /></div>
          <h3>Nothing here yet.</h3>
          <p>Your orders will appear here once you've placed one.</p>
          <a href="shop.html" className="btn btn-primary">Shop Now</a>
        </div>
      ) : visible.map(order => (
        <div key={order.id} className="order-card">
          <div className="order-hd" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="order-ref">{order.order_ref}</div>
              <div className="order-summary">{orderSummary(order.items)}</div>
              <div className="order-meta">{fmtDate(order.created_at)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <StatusBadge status={fmtStatus(order.status)} />
              <span className="order-amt">৳{order.total?.toLocaleString()}</span>
            </div>
            <i
              className="fa fa-chevron-down text-muted"
              style={{ fontSize: 11, flexShrink: 0, transform: expanded === order.id ? "rotate(180deg)" : "none", transition: "transform .2s" }}
            />
          </div>

          {expanded === order.id && (
            <div className="order-bd" onClick={e => e.stopPropagation()}>
              <div className="eyebrow mb10">Items</div>
              {(order.items || []).map((item, i) => (
                <div key={i} className="order-item-row">
                  <span>{item.name} <span className="text-muted">×{item.qty}</span></span>
                  <span style={{ fontWeight: 600 }}>৳{(item.unit_price * item.qty)?.toLocaleString()}</span>
                </div>
              ))}

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--text-08)", display: "flex", flexDirection: "column", gap: 8 }}>
                {order.address_snapshot && (
                  <div className="row">
                    <i className="fa fa-map-marker-alt" style={{ width: 14, textAlign: "center", color: "var(--text-65)", flexShrink: 0, fontSize: 12 }} />
                    <span className="text-sm text-muted">{addrString(order.address_snapshot)}</span>
                  </div>
                )}
                <div className="row">
                  <i className="fa fa-credit-card" style={{ width: 14, textAlign: "center", color: "var(--text-65)", flexShrink: 0, fontSize: 12 }} />
                  <span className="text-sm text-muted" style={{ textTransform: "capitalize" }}>{order.payment_type}</span>
                </div>
                {order.coupon_code && (
                  <div className="row">
                    <i className="fa fa-tag" style={{ width: 14, textAlign: "center", color: "var(--green)", flexShrink: 0, fontSize: 12 }} />
                    <span className="text-sm text-green">{order.coupon_code} — saved ৳{order.discount_amount}</span>
                  </div>
                )}
                {order.points_earned > 0 && (
                  <div className="row">
                    <i className="fa fa-star" style={{ width: 14, textAlign: "center", color: "var(--orange)", flexShrink: 0, fontSize: 12 }} />
                    <span className="text-sm text-orange">+{order.points_earned} pts earned</span>
                  </div>
                )}
              </div>

              <div className="row mt12" style={{ gap: 8 }}>
                <a href={waLink(order.order_ref)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <i className="fab fa-whatsapp" /> Get Help
                </a>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── SUBSCRIPTION TAB ──────────────────────────────────────────
const PLAN_BLANK = { product_id: "", qty: 1, address: "", billing_day: 1 };

function SubscriptionTab() {
  const { addresses }           = useContext(DashCtx);
  const [sub, setSub]           = useState(undefined);
  const [products, setProducts] = useState([]);
  const [sheet, setSheet]       = useState(null);   // "plan" | "pause"
  const [form, setForm]         = useState(PLAN_BLANK);
  const [pauseMonths, setPauseMonths] = useState(1);
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    mpApi.fetch("/subscriptions")
      .then(res => setSub(res?.data ?? null))
      .catch(() => setSub(null));
    mpApi.fetch("/products")
      .then(res => setProducts((res?.data?.products || []).filter(p => (p.status || "").toLowerCase() === "active")))
      .catch(() => {});
  }, []);

  const sfx = n => ["st","nd","rd"][n-1] || "th";

  function apiError(res) {
    Swal.fire({
      title: "Something went wrong",
      text: res?.error?.message || "Please try again.",
      icon: "error",
      confirmButtonColor: "#FF9100",
    });
  }

  function defaultAddressString() {
    const a = addresses.find(x => x.is_default) || addresses[0];
    return a ? [a.line1, a.line2, a.district, a.city].filter(Boolean).join(", ") : "";
  }

  function openCreate() {
    setForm({ product_id: products[0]?.id || "", qty: 1, address: defaultAddressString(), billing_day: 1 });
    setSheet("plan");
  }
  function openEdit() {
    setForm({ product_id: sub.product_id || "", qty: sub.qty, address: sub.address, billing_day: sub.billing_day });
    setSheet("plan");
  }

  async function savePlan() {
    const address = form.address.trim();
    if (address.length < 5) return;
    setBusy(true);
    try {
      let res;
      if (!sub) {
        const body = { qty: form.qty, address, billing_day: form.billing_day };
        if (form.product_id) body.product_id = form.product_id;
        res = await mpApi.fetch("/subscriptions", { method: "POST", body: JSON.stringify(body) });
      } else {
        const body = {};
        if (form.product_id && form.product_id !== (sub.product_id || "")) body.product_id = form.product_id;
        if (form.qty !== sub.qty)                   body.qty = form.qty;
        if (address !== sub.address)                body.address = address;
        if (form.billing_day !== sub.billing_day)   body.billing_day = form.billing_day;
        if (!Object.keys(body).length) { setSheet(null); return; }
        res = await mpApi.fetch("/subscriptions", { method: "PATCH", body: JSON.stringify(body) });
      }
      if (res?.ok) { setSub(res.data); setSheet(null); }
      else apiError(res);
    } finally { setBusy(false); }
  }

  async function handlePause() {
    setBusy(true);
    try {
      const res = await mpApi.fetch("/subscriptions/pause", { method: "POST", body: JSON.stringify({ months: pauseMonths }) });
      if (res?.ok) { setSub(res.data); setSheet(null); }
      else apiError(res);
    } finally { setBusy(false); }
  }
  async function handleResume() {
    setBusy(true);
    try {
      const res = await mpApi.fetch("/subscriptions/resume", { method: "POST" });
      if (res?.ok) setSub(res.data);
      else apiError(res);
    } finally { setBusy(false); }
  }
  async function handleCancel() {
    const result = await Swal.fire({
      title: "Cancel subscription?",
      text: "This cannot be undone. Your plan will end immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Cancel Plan",
      cancelButtonText: "Keep Plan",
      confirmButtonColor: "#C93030",
      cancelButtonColor: "transparent",
      customClass: { cancelButton: "swal-cancel-dark" },
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setBusy(true);
    try {
      const res = await mpApi.fetch("/subscriptions", { method: "DELETE" });
      if (res?.ok) setSub(null);
      else apiError(res);
    } finally { setBusy(false); }
  }

  if (sub === undefined) {
    return (
      <div className="loading-screen">
        <i className="fa fa-circle-notch fa-spin" style={{ fontSize: 28, color: "var(--orange)" }} />
      </div>
    );
  }

  // Plan setup / edit sheet (shared)
  const editing      = !!sub;
  const selectedProd = products.find(p => p.id === form.product_id);
  const unitPrice    = selectedProd ? parseInt(selectedProd.price, 10) : (editing ? sub.unit_price : 699);
  const formTotal    = unitPrice * form.qty;

  const planSheet = sheet === "plan" && (
    <div className="overlay" onClick={() => setSheet(null)}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">{editing ? "Edit Plan" : "Start Monthly Plan"}</div>

        <div className="input-group">
          <label className="input-label">Blend</label>
          <div style={{ position: "relative" }}>
            <select
              className="select"
              style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
              value={form.product_id}
              onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
            >
              {products.length === 0 && <option value="">Midnight Blend — 95g Pouch (৳699)</option>}
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (৳{parseInt(p.price, 10).toLocaleString()})</option>
              ))}
            </select>
            <i className="fa fa-chevron-down" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--cream-65)", pointerEvents: "none" }} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Packs per month</label>
          <div className="row" style={{ gap: 12 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: 40 }}
              disabled={form.qty <= 1}
              onClick={() => setForm(f => ({ ...f, qty: Math.max(1, f.qty - 1) }))}
            ><i className="fa fa-minus" style={{ fontSize: 11 }} /></button>
            <span style={{ fontSize: 17, fontWeight: 700, minWidth: 28, textAlign: "center" }}>{form.qty}</span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: 40 }}
              disabled={form.qty >= 20}
              onClick={() => setForm(f => ({ ...f, qty: Math.min(20, f.qty + 1) }))}
            ><i className="fa fa-plus" style={{ fontSize: 11 }} /></button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Delivery Address</label>
          <input className="input" placeholder="House / Road / Area, City" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          {form.address.trim().length > 0 && form.address.trim().length < 5 && (
            <div className="input-note" style={{ color: "var(--red)" }}>Address is too short.</div>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">Delivery Day</label>
          <div style={{ position: "relative" }}>
            <select
              className="select"
              style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
              value={form.billing_day}
              onChange={e => setForm(f => ({ ...f, billing_day: Number(e.target.value) }))}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}{sfx(d)} of each month</option>
              ))}
            </select>
            <i className="fa fa-chevron-down" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--cream-65)", pointerEvents: "none" }} />
          </div>
        </div>

        <div className="row-between mb16" style={{ paddingTop: 4 }}>
          <span className="text-sm text-muted">Monthly total</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--orange)" }}>৳{formTotal.toLocaleString()}<span className="text-muted text-sm" style={{ fontWeight: 400 }}>/mo</span></span>
        </div>

        <div className="col-gap">
          <button className="btn btn-primary btn-full" disabled={busy || form.address.trim().length < 5} onClick={savePlan}>
            {busy ? <><i className="fa fa-spinner fa-spin" /> Saving…</> : editing ? "Update Plan" : "Start Plan"}
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => setSheet(null)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  // No active subscription — start a plan
  if (!sub) {
    return (
      <div>
        <div className="page-title mb4">Monthly Plan</div>
        <div className="page-sub">Coffee on autopilot.</div>

        <div className="sub-empty">
          <div className="sub-empty-icon">
            <i className="fa fa-calendar-check" style={{ color: "var(--orange)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Start Your Monthly Plan</div>
          <div className="text-sm text-muted" style={{ lineHeight: 1.7, marginBottom: 0 }}>
            Set it once and never run out of your favourite blend again.
          </div>

          <ul className="sub-benefits">
            {[
              "Free delivery on every monthly order",
              "Locked-in pricing — no surprise increases",
              "Skip, pause, or cancel anytime",
              "Priority dispatch before public stock",
            ].map((b, i) => (
              <li key={i} className="sub-benefit">
                <span className="sub-benefit-check"><i className="fa fa-check" style={{ fontSize: 10 }} /></span>
                {b}
              </li>
            ))}
          </ul>

          <button className="btn btn-primary btn-full" onClick={openCreate}>
            <i className="fa fa-calendar-check" /> Start Monthly Plan
          </button>
        </div>

        {planSheet}
      </div>
    );
  }

  // Active subscription
  const isPaused   = sub.status === "paused";
  const totalPrice = sub.qty * sub.unit_price;
  const nextDate   = new Date(sub.next_delivery_date);
  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const countdown  = Math.ceil((nextDate - today) / 86400000);

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-title mb20">Subscription</div>

      <div className="card mb10">
        <div className="row-between mb12">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{sub.product_name}</div>
            <div className="text-sm text-muted mt4">×{sub.qty} pack{sub.qty !== 1 ? "s" : ""} / month</div>
          </div>
          <StatusBadge status={isPaused ? "Paused" : "Active"} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--orange)" }}>
          ৳{totalPrice.toLocaleString()}<span className="text-muted text-sm" style={{ fontWeight: 400 }}>/mo</span>
        </div>
      </div>

      <div className="card mb10">
        <div className="eyebrow">Next Delivery</div>
        <div style={{ fontSize: 18, fontWeight: 700 }} className="mb4">
          {nextDate.toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        {isPaused
          ? <div className="text-sm text-orange">Paused — resumes {nextDate.toLocaleDateString("en-BD", { month: "short", year: "numeric" })}</div>
          : <div className="text-sm text-muted">In {countdown > 0 ? countdown : "< 1"} day{countdown !== 1 ? "s" : ""}</div>
        }
        <div className="text-sm text-muted mt8">
          <i className="fa fa-map-marker-alt" style={{ fontSize: 11, marginRight: 5 }} />{sub.address}
        </div>
      </div>

      <div className="card mb16">
        <div className="row-between text-sm mb6">
          <span className="text-muted">Delivery day</span>
          <span style={{ fontWeight: 600 }}>{sub.billing_day}{sfx(sub.billing_day)} of each month</span>
        </div>
        <div className="row-between text-sm">
          <span className="text-muted">Monthly total</span>
          <span style={{ fontWeight: 600 }}>৳{totalPrice.toLocaleString()}</span>
        </div>
      </div>

      <div className="col-gap">
        <button className="btn btn-ghost btn-full" onClick={openEdit} disabled={busy}>
          <i className="fa fa-pen" style={{ fontSize: 12 }} /> Edit Plan
        </button>
        {isPaused ? (
          <button className="btn btn-primary btn-full" onClick={handleResume} disabled={busy}>
            {busy ? <><i className="fa fa-spinner fa-spin" /> Resuming…</> : "Resume Subscription"}
          </button>
        ) : (
          <button className="btn btn-ghost btn-full" onClick={() => { setPauseMonths(1); setSheet("pause"); }} disabled={busy}>
            <i className="fa fa-pause" style={{ fontSize: 12 }} /> Pause Plan
          </button>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button className="btn-link" style={{ color: "var(--red)", fontSize: 12 }} onClick={handleCancel} disabled={busy}>
          Cancel Subscription
        </button>
      </div>

      {planSheet}

      {sheet === "pause" && (
        <div className="overlay" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">Pause Plan</div>
            <div className="sheet-body">Deliveries will skip ahead — no charges while paused. Resume anytime.</div>
            <div className="input-group">
              <label className="input-label">Pause for</label>
              <div style={{ position: "relative" }}>
                <select
                  className="select"
                  style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
                  value={pauseMonths}
                  onChange={e => setPauseMonths(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map(m => (
                    <option key={m} value={m}>{m} month{m !== 1 ? "s" : ""}</option>
                  ))}
                </select>
                <i className="fa fa-chevron-down" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--cream-65)", pointerEvents: "none" }} />
              </div>
            </div>
            <div className="col-gap">
              <button className="btn btn-primary btn-full" disabled={busy} onClick={handlePause}>
                {busy ? <><i className="fa fa-spinner fa-spin" /> Pausing…</> : `Pause for ${pauseMonths} Month${pauseMonths !== 1 ? "s" : ""}`}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setSheet(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── POINTS TAB ────────────────────────────────────────────────
function PointsTab() {
  const { user, pointsHistory } = useContext(DashCtx);
  const [sheet, setSheet]     = useState(null);
  const [rewards, setRewards] = useState(null);
  const pts = user?.points_balance || 0;

  useEffect(() => {
    mpApi.fetch("/me/point-rewards")
      .then(res => setRewards(res?.data?.rewards || []))
      .catch(() => setRewards([]));
  }, []);

  const nextReward = rewards ? rewards.find(r => r.pts_cost > pts) : null;
  const threshold  = nextReward ? nextReward.pts_cost : (rewards?.[0]?.pts_cost || 1000);
  const pct        = Math.min(100, Math.round((pts / threshold) * 100));

  return (
    <div>
      <div className="page-title mb20">Points</div>

      <div className="pts-layout">

        {/* Left: balance + history */}
        <div>
          <div className="pts-balance-card">
            <div className="pts-eyebrow">Midnight Points</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, position: "relative", zIndex: 1 }}>
              <span className="pts-number">{pts.toLocaleString()}</span>
              <span className="pts-unit">pts</span>
            </div>
            {rewards && rewards.length > 0 && (
              <div className="pts-progress-wrap">
                <div className="pts-progress-labels">
                  <span>
                    {nextReward
                      ? `${(nextReward.pts_cost - pts).toLocaleString()} pts to "${nextReward.label}"`
                      : "All rewards unlocked!"}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="pts-track">
                  <div className="pts-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="eyebrow mt20 mb10">History</div>
          <div className="card">
            {pointsHistory.length === 0 ? (
              <div className="text-sm text-muted" style={{ padding: "16px 0", textAlign: "center" }}>
                Points are added when your orders are delivered.
              </div>
            ) : pointsHistory.map((p, i) => (
              <div key={i} className="pts-history-row">
                <div>
                  <div className="pts-history-desc">{p.description}</div>
                  <div className="pts-history-date">{fmtDate(p.created_at)}</div>
                </div>
                <span style={{
                  fontWeight: 700, fontSize: 14,
                  color: p.type === "earned" || p.type === "bonus" ? "var(--green)" : "var(--red)"
                }}>
                  {p.type === "earned" || p.type === "bonus" ? "+" : "−"}{Math.abs(p.points)} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: rewards */}
        <div>
          <div className="eyebrow mb10">Redeem Points</div>
          {rewards === null ? (
            <div className="card" style={{ padding: "28px", textAlign: "center" }}>
              <i className="fa fa-spinner fa-spin" style={{ color: "var(--orange)" }} />
            </div>
          ) : rewards.length === 0 ? (
            <div className="card">
              <div className="text-sm text-muted" style={{ padding: "16px 0", textAlign: "center" }}>
                No rewards available yet.
              </div>
            </div>
          ) : rewards.map(r => {
            const canRedeem = pts >= r.pts_cost;
            return (
              <div key={r.id} className={`reward-card ${!canRedeem ? "locked" : ""}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="reward-name">{r.label}</div>
                  <div className="reward-pts">{r.pts_cost.toLocaleString()} pts</div>
                  {r.worth && <div className="reward-worth">Worth {r.worth}</div>}
                </div>
                {canRedeem ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setSheet(r)} style={{ flexShrink: 0 }}>
                    Redeem
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <i className="fa fa-lock" style={{ fontSize: 14, color: "var(--text-35)" }} />
                    <span style={{ fontSize: 10, color: "var(--text-35)", fontWeight: 600 }}>
                      {(r.pts_cost - pts).toLocaleString()} more
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {sheet && (
        <Sheet
          title={`Redeem ${sheet.pts_cost.toLocaleString()} pts?`}
          body={`Redeem your points for "${sheet.label}"? This cannot be undone.`}
          confirmLabel="Yes, Redeem"
          onConfirm={() => setSheet(null)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

// ── ACCOUNT TAB ───────────────────────────────────────────────
const ADDR_BLANK = { label: "", line1: "", line2: "", city: "", area: "", is_default: false };
const PM_BLANK   = { type: "bkash", number: "", is_default: false };

function AccountTab() {
  const { user, addresses, paymentMethods, reload } = useContext(DashCtx);
  const [editing, setEditing]   = useState(false);
  const [profile, setProfile]   = useState({ name: user?.name || "", email: user?.email || "" });
  const [saving, setSaving]     = useState(false);
  const [sheet, setSheet]           = useState(null);   // "logout" | "delete" | "addr" | "pm"
  const [addrForm, setAddrForm]     = useState(ADDR_BLANK);
  const [editingAddrId, setEditingAddrId] = useState(null);
  const [pmForm, setPmForm]         = useState(PM_BLANK);
  const [submitting, setSubmitting] = useState(false);

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
      setEditing(false);
      reload();
    } finally { setSaving(false); }
  }

  async function saveAddress() {
    if (!addrForm.label || !addrForm.line1) return;
    setSubmitting(true);
    try {
      const url    = editingAddrId ? `/me/addresses/${editingAddrId}` : "/me/addresses";
      const method = editingAddrId ? "PATCH" : "POST";
      const res = await mpApi.fetch(url, {
        method,
        body: JSON.stringify({
          label:      addrForm.label,
          line1:      addrForm.line1,
          line2:      addrForm.line2 || undefined,
          city:       addrForm.city  || undefined,
          district:   addrForm.area  || undefined,
          is_default: addrForm.is_default,
        }),
      });
      if (res?.ok) { setSheet(null); setAddrForm(ADDR_BLANK); setEditingAddrId(null); reload(); }
    } finally { setSubmitting(false); }
  }

  async function savePaymentMethod() {
    if (!pmForm.number) return;
    setSubmitting(true);
    try {
      const res = await mpApi.fetch("/me/payment-methods", {
        method: "POST",
        body: JSON.stringify({ type: pmForm.type, number: pmForm.number, is_default: pmForm.is_default }),
      });
      if (res?.ok) { setSheet(null); setPmForm(PM_BLANK); reload(); }
    } finally { setSubmitting(false); }
  }

  async function deleteAddress(id) {
    const result = await Swal.fire({
      title: "Remove address?",
      text: "This address will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#FF9100",
      cancelButtonColor: "transparent",
      customClass: { cancelButton: "swal-cancel-dark" },
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    await mpApi.fetch(`/me/addresses/${id}`, { method: "DELETE" });
    reload();
  }

  async function deletePaymentMethod(id) {
    const result = await Swal.fire({
      title: "Remove payment method?",
      text: "This payment method will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#FF9100",
      cancelButtonColor: "transparent",
      customClass: { cancelButton: "swal-cancel-dark" },
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    await mpApi.fetch(`/me/payment-methods/${id}`, { method: "DELETE" });
    reload();
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

  const pmLabel = (type) => ({ bkash: "bK", nagad: "NG", rocket: "RK", card: "CRD", cod: "COD" }[type] || type?.slice(0,2).toUpperCase() || "?");

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-title mb20">Account</div>

      {/* Profile */}
      <div className="card mb12 profile-display">
        <div className="eyebrow">Profile</div>
        {!editing ? (
          <>
            <button className="profile-edit-btn" onClick={() => setEditing(true)}>
              <i className="fa fa-pen" style={{ fontSize: 11 }} /> Edit
            </button>
            <div className="profile-field">
              <div className="profile-label">Name</div>
              <div className="profile-value">{user?.name || "—"}</div>
            </div>
            <div className="profile-field">
              <div className="profile-label">Phone</div>
              <div className="profile-value">{user?.phone || "—"}</div>
            </div>
            <div className="profile-field">
              <div className="profile-label">Email</div>
              <div className="profile-value">{user?.email || <span className="text-muted text-sm">Not set</span>}</div>
            </div>
          </>
        ) : (
          <>
            <div className="input-group">
              <label className="input-label">Name</label>
              <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Phone</label>
              <input className="input" value={user?.phone || ""} readOnly />
              <div className="input-note">Contact support to change your phone number.</div>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email</label>
              <input className="input" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="row mt16" style={{ gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={saving} onClick={saveProfile}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setEditing(false); setProfile({ name: user?.name || "", email: user?.email || "" }); }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* Addresses */}
      <div className="row-between mt20 mb10">
        <div className="eyebrow" style={{ margin: 0 }}>Saved Addresses</div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setAddrForm(ADDR_BLANK); setEditingAddrId(null); setSheet("addr"); }}>
          <i className="fa fa-plus" style={{ fontSize: 11 }} /> Add
        </button>
      </div>
      {addresses.length === 0 ? (
        <div className="text-sm text-muted mb12" style={{ textAlign: "center", padding: "12px 0" }}>
          No saved addresses yet.
        </div>
      ) : addresses.map(addr => (
        <div key={addr.id} className="addr-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row mb4" style={{ gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{addr.label}</span>
              {addr.is_default && <span className="badge badge-orange">Default</span>}
            </div>
            <div className="text-sm text-muted">{addr.line1}</div>
            {addr.line2 && <div className="text-sm text-muted">{addr.line2}</div>}
            {(addr.district || addr.city) && (
              <div className="text-sm text-muted">{[addr.district, addr.city].filter(Boolean).join(", ")}</div>
            )}
          </div>
          <div className="col-gap" style={{ gap: 6, flexShrink: 0, alignItems: "flex-end" }}>
            <button
              className="btn-link"
              style={{ fontSize: 12, color: "var(--orange)" }}
              onClick={() => {
                setAddrForm({
                  label:      addr.label      || "",
                  line1:      addr.line1      || "",
                  line2:      addr.line2      || "",
                  city:       addr.city       || "",
                  area:       addr.district   || "",
                  is_default: addr.is_default || false,
                });
                setEditingAddrId(addr.id);
                setSheet("addr");
              }}
            >
              <i className="fa fa-pen" style={{ fontSize: 10 }} /> Edit
            </button>
            <button
              className="btn-link"
              style={{ color: "var(--red)", fontSize: 12 }}
              onClick={() => deleteAddress(addr.id)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {/* Payment methods */}
      <div className="row-between mt20 mb10">
        <div className="eyebrow" style={{ margin: 0 }}>Payment Methods</div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setPmForm(PM_BLANK); setSheet("pm"); }}>
          <i className="fa fa-plus" style={{ fontSize: 11 }} /> Add
        </button>
      </div>
      {paymentMethods.length === 0 ? (
        <div className="text-sm text-muted mb12" style={{ textAlign: "center", padding: "12px 0" }}>
          No payment methods saved.
        </div>
      ) : paymentMethods.map(pm => (
        <div key={pm.id} className="pay-card">
          <div className="row" style={{ gap: 10 }}>
            <div className="pay-icon">{pmLabel(pm.type)}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{pm.type}</div>
              <div className="text-xs text-muted">{pm.number}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {pm.is_default && <span className="badge badge-orange">Default</span>}
            <button
              className="btn-link"
              style={{ color: "var(--red)", fontSize: 12 }}
              onClick={() => deletePaymentMethod(pm.id)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {/* Crew status */}
      {user?.role === "crew" && (
        <div className="crew-banner mt20 mb12">
          <div className="row mb8" style={{ gap: 10 }}>
            <i className="fa fa-fire text-orange" style={{ fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Midnight Crew Member</span>
          </div>
          <a href="dashboard-crew.html" className="btn btn-primary btn-sm">Crew Dashboard →</a>
        </div>
      )}

      {/* Danger zone */}
      <div className="divider" style={{ marginTop: 28, marginBottom: 20 }} />
      <div className="col-gap">
        <button className="btn btn-ghost btn-full" onClick={async () => {
          const r = await Swal.fire({
            title: "Sign out?",
            text: "You'll be signed out of your Midnight Pick account on this device.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sign Out",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#FF9100",
            cancelButtonColor: "transparent",
            customClass: { cancelButton: "swal-cancel-dark" },
            reverseButtons: true,
          });
          if (r.isConfirmed) handleLogout();
        }}>
          <i className="fa fa-sign-out-alt" style={{ fontSize: 13 }} /> Sign Out
        </button>
        <button
          className="btn-link"
          style={{ color: "var(--red)", fontSize: 12, textAlign: "center", padding: "8px 0" }}
          onClick={async () => {
            const r = await Swal.fire({
              title: "Delete account?",
              text: "This is permanent. All your order history, points, and subscription will be removed.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Yes, Delete My Account",
              cancelButtonText: "Cancel",
              confirmButtonColor: "#C93030",
              cancelButtonColor: "transparent",
              customClass: { cancelButton: "swal-cancel-dark" },
              reverseButtons: true,
            });
          }}
        >
          Delete Account
        </button>
      </div>

      {/* Add / Edit Address Sheet */}
      {sheet === "addr" && (
        <div className="overlay" onClick={() => { setSheet(null); setEditingAddrId(null); setAddrForm(ADDR_BLANK); }}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{editingAddrId ? "Edit Address" : "Add Address"}</div>
            <div className="input-group">
              <label className="input-label">Label (e.g. Home, Office)</label>
              <input className="input" placeholder="Home" value={addrForm.label}
                onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Address Line 1</label>
              <input className="input" placeholder="House / Flat / Road" value={addrForm.line1}
                onChange={e => setAddrForm(f => ({ ...f, line1: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Address Line 2 (optional)</label>
              <input className="input" placeholder="Area / Block" value={addrForm.line2}
                onChange={e => setAddrForm(f => ({ ...f, line2: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">City</label>
                <div style={{ position: "relative" }}>
                  <select
                    className="select"
                    style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer", color: addrForm.city ? "var(--cream)" : "var(--cream-30)" }}
                    value={addrForm.city}
                    onChange={e => setAddrForm(f => ({ ...f, city: e.target.value, area: "" }))}
                  >
                    <option value="" disabled>City</option>
                    {Object.keys(BD_AREAS).sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <i className="fa fa-chevron-down" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--cream-65)", pointerEvents: "none" }} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Area</label>
                <div style={{ position: "relative" }}>
                  <select
                    className="select"
                    style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: addrForm.city ? "pointer" : "not-allowed", color: addrForm.area ? "var(--cream)" : "var(--cream-30)", opacity: addrForm.city ? 1 : 0.55 }}
                    value={addrForm.area}
                    onChange={e => setAddrForm(f => ({ ...f, area: e.target.value }))}
                    disabled={!addrForm.city}
                  >
                    <option value="">{addrForm.city ? "Select area" : "Area"}</option>
                    {(BD_AREAS[addrForm.city] || []).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <i className="fa fa-chevron-down" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--cream-65)", pointerEvents: "none" }} />
                </div>
              </div>
            </div>
            <div className="row mb16" style={{ gap: 8 }}>
              <input type="checkbox" id="addr-default" checked={addrForm.is_default}
                onChange={e => setAddrForm(f => ({ ...f, is_default: e.target.checked }))} />
              <label htmlFor="addr-default" style={{ fontSize: 13, cursor: "pointer" }}>Set as default address</label>
            </div>
            <div className="col-gap">
              <button className="btn btn-primary btn-full" disabled={submitting || !addrForm.label || !addrForm.line1} onClick={saveAddress}>
                {submitting ? "Saving…" : editingAddrId ? "Update Address" : "Save Address"}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => { setSheet(null); setEditingAddrId(null); setAddrForm(ADDR_BLANK); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Sheet */}
      {sheet === "pm" && (
        <div className="overlay" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">Add Payment Method</div>
            <div className="input-group">
              <label className="input-label">Type</label>
              <div style={{ position: "relative" }}>
                <select
                  className="select"
                  style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 36, cursor: "pointer" }}
                  value={pmForm.type}
                  onChange={e => setPmForm(f => ({ ...f, type: e.target.value }))}
                >
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="card">Card</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
                <i className="fa fa-chevron-down" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--cream-65)", pointerEvents: "none" }} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Number / Identifier</label>
              <input className="input" placeholder="01XXXXXXXXX" value={pmForm.number}
                onChange={e => setPmForm(f => ({ ...f, number: e.target.value }))} />
            </div>
            <div className="row mb16" style={{ gap: 8 }}>
              <input type="checkbox" id="pm-default" checked={pmForm.is_default}
                onChange={e => setPmForm(f => ({ ...f, is_default: e.target.checked }))} />
              <label htmlFor="pm-default" style={{ fontSize: 13, cursor: "pointer" }}>Set as default payment method</label>
            </div>
            <div className="col-gap">
              <button className="btn btn-primary btn-full" disabled={submitting || !pmForm.number} onClick={savePaymentMethod}>
                {submitting ? "Saving…" : "Save Payment Method"}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setSheet(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────
function Sidebar({ tab, setTab }) {
  const { user } = useContext(DashCtx);
  const isCrew   = user?.role === "crew";

  const links = [
    { id: "home",         icon: "fa-home",          label: "Home" },
    { id: "orders",       icon: "fa-box",            label: "Orders" },
    { id: "subscription", icon: "fa-calendar-check", label: "Plan" },
    { id: "points",       icon: "fa-star",           label: "Points" },
    { id: "account",      icon: "fa-user",           label: "Account" },
  ];

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
    <>
      <aside className="sidebar">
        <div className="sidebar-logo-wrap">
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

          <div className="sidebar-section-label">Website</div>
          <a href="index.html" className="sidebar-link">
            <i className="fa fa-globe s-icon" />
            <span>Home</span>
          </a>
          <a href="shop.html" className="sidebar-link">
            <i className="fa fa-shopping-bag s-icon" />
            <span>Shop</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{(user?.name || "?")[0].toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.name || "—"}</div>
              <div className="sidebar-user-role">{isCrew ? "Midnight Crew" : "Member"}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={async () => {
          const r = await Swal.fire({
            title: "Sign out?",
            text: "You'll be signed out of your Midnight Pick account on this device.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sign Out",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#FF9100",
            cancelButtonColor: "transparent",
            customClass: { cancelButton: "swal-cancel-dark" },
            reverseButtons: true,
          });
          if (r.isConfirmed) handleLogout();
        }}>
            <i className="fa fa-sign-out-alt" style={{ fontSize: 12 }} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

    </>
  );
}

// ── BOTTOM NAV (mobile) ───────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const items = [
    { id: "home",         icon: "fa-home",          label: "Home" },
    { id: "orders",       icon: "fa-box",            label: "Orders" },
    { id: "subscription", icon: "fa-calendar-check", label: "Plan" },
    { id: "points",       icon: "fa-star",           label: "Points" },
    { id: "account",      icon: "fa-user",           label: "Account" },
  ];
  return (
    <div className="tabbar">
      <div className="tabbar-inner">
        {items.map(it => (
          <button key={it.id} className={`tab-item ${tab === it.id ? "active" : ""}`} onClick={() => setTab(it.id)}>
            <div className="tab-icon"><i className={`fa ${it.icon}`} /></div>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── LOADING ───────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <img src="assets/logo.png" alt="Midnight Pick" style={{ width: 56, opacity: .7 }} />
      <div className="text-muted text-sm">Loading your account…</div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────
function UserDashboard() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState({
    user: null, orders: [], addresses: [], paymentMethods: [], pointsHistory: [], loading: true,
  });

  async function loadData() {
    try {
      const [me, ordersRes, addrsRes, pmsRes, ptsRes] = await Promise.all([
        mpApi.fetch("/me"),
        mpApi.fetch("/orders?limit=20"),
        mpApi.fetch("/me/addresses"),
        mpApi.fetch("/me/payment-methods"),
        mpApi.fetch("/me/points/history?limit=30"),
      ]);
      setData({
        user:           me?.data || null,
        orders:         ordersRes?.data?.orders || [],
        addresses:      addrsRes?.data || [],
        paymentMethods: pmsRes?.data  || [],
        pointsHistory:  ptsRes?.data?.transactions || [],
        loading: false,
      });
    } catch {
      setData(d => ({ ...d, loading: false }));
    }
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

  return (
    <DashCtx.Provider value={ctxValue}>
      <div className="dash-layout">
        <Sidebar tab={tab} setTab={setTab} />
        <div className="dash-main">
          <div className="dash-content">
            <div className="dash-inner">
              {renderTab()}
            </div>
          </div>
        </div>
      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </DashCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<UserDashboard />);
