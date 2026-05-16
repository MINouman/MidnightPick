// Midnight Pick — Admin Dashboard

const { useState, useRef } = React;

// ── Mock Data ──────────────────────────────────────────
const ORDERS_DATA = [
  { id: "MP-1055", time: "10:42 AM", customer: "Sadia Islam",   phone: "01811-567890", items: "Midnight Blend ×2, Black ×5", total: 573,  coupon: "SADIA20", payment: "bKash",  status: "Processing", coupType: "Influencer", orderCount: 6 },
  { id: "MP-1054", time: "9:15 AM",  customer: "Karim Ahmed",   phone: "01712-111222", items: "Trial Pack ×1",              total: 99,   coupon: null,      payment: "Nagad",  status: "Processing", coupType: "None",       orderCount: 1 },
  { id: "MP-1053", time: "Yesterday",customer: "Rafi Hossain",  phone: "01712-345678", items: "Black ×5, Blend 100g ×1",   total: 324,  coupon: "RAFI15",  payment: "bKash",  status: "Shipped",    coupType: "Crew",       orderCount: 3 },
  { id: "MP-1052", time: "Yesterday",customer: "Nusrat Jahan",  phone: "01955-888999", items: "Black ×10",                 total: 250,  coupon: "EID2026", payment: "bKash",  status: "Shipped",    coupType: "Festival",   orderCount: 2 },
  { id: "MP-1051", time: "May 13",   customer: "Tanvir Hasan",  phone: "01611-445566", items: "Night Shift Subscription",  total: 210,  coupon: null,      payment: "Card",   status: "Delivered",  coupType: "None",       orderCount: 4 },
  { id: "MP-1050", time: "May 12",   customer: "Mitu Akter",    phone: "01999-001122", items: "Black ×5",                  total: 125,  coupon: "RAFI15",  payment: "bKash",  status: "Delivered",  coupType: "Crew",       orderCount: 1 },
  { id: "MP-1049", time: "May 12",   customer: "Sabbir Khan",   phone: "01811-334455", items: "Trial Pack ×2",             total: 198,  coupon: "SADIA20", payment: "Nagad",  status: "Delivered",  coupType: "Influencer", orderCount: 1 },
  { id: "MP-1048", time: "May 10",   customer: "Priya Das",     phone: "01711-667788", items: "Blend 100g ×1",             total: 349,  coupon: null,      payment: "bKash",  status: "Cancelled",  coupType: "None",       orderCount: 2 },
  { id: "MP-1047", time: "May 10",   customer: "Faisal Uddin",  phone: "01555-223344", items: "Black ×10",                 total: 250,  coupon: "EID2026", payment: "bKash",  status: "Delivered",  coupType: "Festival",   orderCount: 3 },
  { id: "MP-1046", time: "May 9",    customer: "Shirin Akter",  phone: "01811-009988", items: "Black ×5",                  total: 125,  coupon: null,      payment: "Nagad",  status: "Delivered",  coupType: "None",       orderCount: 1 },
];

const CUSTOMERS_DATA = [
  { name: "Rafi Hossain",  phone: "01712-345678", orders: 3,  spent: 673,  points: 3200, crewStatus: "Active Crew", joined: "Jan 10, 2026" },
  { name: "Sadia Islam",   phone: "01811-567890", orders: 6,  spent: 1980, points: 900,  crewStatus: "Influencer",  joined: "Dec 5, 2025" },
  { name: "Karim Ahmed",   phone: "01712-111222", orders: 1,  spent: 99,   points: 50,   crewStatus: "None",        joined: "May 16, 2026" },
  { name: "Nusrat Jahan",  phone: "01955-888999", orders: 2,  spent: 500,  points: 250,  crewStatus: "None",        joined: "Mar 2, 2026" },
  { name: "Tanvir Hasan",  phone: "01611-445566", orders: 4,  spent: 840,  points: 420,  crewStatus: "None",        joined: "Feb 14, 2026" },
  { name: "Mitu Akter",    phone: "01999-001122", orders: 1,  spent: 125,  points: 60,   crewStatus: "None",        joined: "May 12, 2026" },
];

const SUBS_DATA = [
  { customer: "Rafi Hossain",  phone: "01712-345678", plan: "Night Shift",    nextBilling: "May 23, 2026", amount: 210, status: "Active" },
  { customer: "Tanvir Hasan",  phone: "01611-445566", plan: "Morning Rush",   nextBilling: "May 25, 2026", amount: 399, status: "Active" },
  { customer: "Priya Das",     phone: "01711-667788", plan: "Night Shift",    nextBilling: "May 28, 2026", amount: 210, status: "Active" },
  { customer: "Sabbir Khan",   phone: "01811-334455", plan: "Night Shift",    nextBilling: "—",            amount: 210, status: "Paused" },
  { customer: "Shirin Akter",  phone: "01811-009988", plan: "Morning Rush",   nextBilling: "—",            amount: 399, status: "Cancelled" },
];

const COUPONS_FESTIVAL = [
  { code: "EID2026",   type: "Percentage", discount: "15%", minOrder: 200, used: 42, cap: 100, expiry: "Jun 5, 2026", active: true },
  { code: "SUMMER25",  type: "Flat",       discount: "৳25",  minOrder: 150, used: 18, cap: 50,  expiry: "Jun 30, 2026", active: true },
  { code: "NEWYR26",   type: "Percentage", discount: "20%", minOrder: 300, used: 77, cap: 80,  expiry: "Jan 10, 2026", active: false },
];

const COUPONS_CREW = [
  { member: "Rafi Hossain",  code: "RAFI15",  used: 7,  orders: 7,  value: 1547, pts: 3500 },
  { member: "Imran Haque",   code: "IMRAN10", used: 3,  orders: 3,  value: 673,  pts: 1500 },
  { member: "Jeni Rahman",   code: "JENI15",  used: 12, orders: 11, value: 2430, pts: 6000 },
];

const COUPONS_INFLUENCER = [
  { name: "Sadia Islam",    code: "SADIA20", ordersMo: 4,  commMo: 268, totalOwed: 268, paid: false },
  { name: "Tech Cafe BD",   code: "TCAFE15", ordersMo: 11, commMo: 520, totalOwed: 0,   paid: true  },
];

const PENDING_CREW = [
  { name: "Asif Rahman",  phone: "01511-334455", institution: "BUET",    social: "@asifcoffee",  why: "I drink Midnight Pick every morning before my engineering classes. It's the only instant coffee I've found that actually tastes fresh. I want to spread the word in my department.", date: "May 15, 2026" },
  { name: "Lina Chowdhury", phone: "01611-998877", institution: "NSU",  social: "@lina.nsu",    why: "My entire friend group switched to Midnight Pick after I brought it to a group study session. I've already referred 5 people without any incentive!", date: "May 14, 2026" },
];

const ACTIVE_CREW = [
  { name: "Rafi Hossain",  institution: "RUET", code: "RAFI15",  refMo: 7,  pts: 3200, joined: "Jan 10, 2026" },
  { name: "Imran Haque",   institution: "DU",   code: "IMRAN10", refMo: 3,  pts: 1500, joined: "Feb 5, 2026" },
  { name: "Jeni Rahman",   institution: "BRAC", code: "JENI15",  refMo: 12, pts: 6000, joined: "Nov 20, 2025" },
];

const PENDING_REDEMPTIONS = [
  { customer: "Nusrat Jahan",  phone: "01955-888999", type: "1 sachet",          pts: 1000,  date: "May 15, 2026" },
  { customer: "Tanvir Hasan",  phone: "01611-445566", type: "৳100 bKash credit", pts: 5000,  date: "May 14, 2026" },
  { customer: "Sabbir Khan",   phone: "01811-334455", type: "Free month",        pts: 10000, date: "May 12, 2026" },
];

const FRAUD_FLAGS = [
  { customer: "Unknown Account", phone: "01500-000000", reason: "14 orders on code RAFI15 in 48 hrs", date: "May 13, 2026" },
];

// ── Helpers ────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { Processing: "badge-orange", Shipped: "badge-blue", Delivered: "badge-green", Cancelled: "badge-red", Active: "badge-green", Paused: "badge-gray", paid: "badge-green", Pending: "badge-orange" };
  const s = typeof status === "string" ? status : String(status);
  return <span className={`badge ${map[s] || "badge-gray"}`}>{s}</span>;
}

function SectionCard({ children, style }) {
  return <div className="card" style={{ marginBottom: 14, ...style }}>{children}</div>;
}

// ── Revenue Mini Chart ─────────────────────────────────
function RevenueChart() {
  const days = Array.from({ length: 30 }, (_, i) => {
    const total = Math.round(300 + Math.random() * 800);
    const sub   = Math.round(total * (0.2 + Math.random() * 0.3));
    return { total, sub };
  });
  const maxVal = Math.max(...days.map(d => d.total));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, padding: "0 4px" }}>
      {days.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 0, height: "100%" }}>
          <div style={{ borderRadius: "2px 2px 0 0", background: "var(--orange)", height: `${Math.round((d.sub / maxVal) * 100)}%`, opacity: .85 }} />
          <div style={{ borderRadius: 0, background: "var(--cream-15)", height: `${Math.round(((d.total - d.sub) / maxVal) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

// ── Section: Overview ──────────────────────────────────
function Overview({ setSection }) {
  const stats = [
    { label: "Today's Orders",        value: "12",    icon: "fa-box" },
    { label: "Today's Revenue",       value: "৳4,820", icon: "fa-taka-sign" },
    { label: "Active Subscribers",    value: "38",    icon: "fa-calendar-check" },
    { label: "Total Crew",            value: "3",     icon: "fa-fire" },
    { label: "Pending Applications",  value: "2",     icon: "fa-user-clock", badge: true },
    { label: "Pending Redemptions",   value: "3",     icon: "fa-gift", badge: true },
  ];

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Overview</div>
      <div className="page-sub" style={{ marginBottom: 20 }}>Friday, 16 May 2026</div>

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ cursor: s.badge ? "pointer" : "default" }} onClick={() => s.badge && setSection(i >= 4 ? (i === 4 ? "crew" : "points") : "overview")}>
            <div className="stat-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{s.label}</span>
              {s.badge && <span style={{ background: "var(--orange)", color: "#1a0800", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 99 }}>{s.badge ? "!" : ""}</span>}
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <SectionCard>
        <div className="eyebrow mb12">Revenue — Last 30 Days</div>
        <RevenueChart />
        <div className="row mt12" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--cream-15)" }} /><span className="text-xs text-muted">Total revenue</span></div>
          <div className="row" style={{ gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--orange)", opacity: .85 }} /><span className="text-xs text-muted">Subscription revenue</span></div>
        </div>
      </SectionCard>

      {/* Alerts */}
      {(PENDING_CREW.length > 0 || FRAUD_FLAGS.length > 0) && (
        <SectionCard style={{ borderColor: "rgba(255,145,0,.3)", background: "var(--orange-faint)" }}>
          <div className="eyebrow mb10">Alerts</div>
          {PENDING_CREW.length > 0 && (
            <div className="row mb8" style={{ gap: 10 }}>
              <i className="fa fa-user-clock text-orange" />
              <span className="text-sm">{PENDING_CREW.length} pending Crew application{PENDING_CREW.length > 1 ? "s" : ""}</span>
              <button className="btn-link ml-auto" onClick={() => setSection("crew")} style={{ marginLeft: "auto" }}>Review →</button>
            </div>
          )}
          {FRAUD_FLAGS.length > 0 && (
            <div className="row" style={{ gap: 10 }}>
              <i className="fa fa-exclamation-triangle text-orange" />
              <span className="text-sm">{FRAUD_FLAGS.length} fraud flag{FRAUD_FLAGS.length > 1 ? "s" : ""} require review</span>
              <button className="btn-link" onClick={() => setSection("points")} style={{ marginLeft: "auto" }}>Review →</button>
            </div>
          )}
        </SectionCard>
      )}

      {/* Recent orders */}
      <SectionCard>
        <div className="eyebrow mb12">Recent Orders</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th><th>Customer</th><th>Items</th><th>Total</th><th>Coupon</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS_DATA.slice(0, 10).map((o, i) => (
                <tr key={i}>
                  <td className="muted">{o.time}</td>
                  <td style={{ fontWeight: 600 }}>{o.customer}</td>
                  <td className="muted" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.items}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 700 }}>৳{o.total}</td>
                  <td>{o.coupon ? <span className="mono text-xs" style={{ color: "var(--blue)" }}>{o.coupon}</span> : <span className="muted">—</span>}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    {o.status === "Processing" && (
                      <button className="btn btn-sm btn-primary">Mark Shipped</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Section: Orders ────────────────────────────────────
function Orders() {
  const [filter, setFilter] = useState({ status: "All", coupon: "All", search: "" });
  const [panel, setPanel] = useState(null);

  const filtered = ORDERS_DATA.filter(o => {
    if (filter.status !== "All" && o.status !== filter.status) return false;
    if (filter.coupon !== "All" && o.coupType !== filter.coupon) return false;
    if (filter.search && !o.customer.toLowerCase().includes(filter.search.toLowerCase()) && !o.phone.includes(filter.search)) return false;
    return true;
  });

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Orders</div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input className="input" placeholder="Search name or phone…" style={{ width: 220 }} value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <select className="select" style={{ width: 160 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          {["All", "Processing", "Shipped", "Delivered", "Cancelled"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 160 }} value={filter.coupon} onChange={e => setFilter(f => ({ ...f, coupon: e.target.value }))}>
          {["All", "Festival", "Crew", "Influencer", "None"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th><input type="checkbox" /></th><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Coupon</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={i}>
                  <td><input type="checkbox" /></td>
                  <td className="mono text-xs" style={{ color: "var(--blue)" }}>{o.id}</td>
                  <td className="muted">{o.time}</td>
                  <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => setPanel(o)}>{o.customer}</td>
                  <td className="muted" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.items}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 700 }}>৳{o.total}</td>
                  <td>{o.coupon ? <span className="mono text-xs" style={{ color: "var(--blue)" }}>{o.coupon}</span> : <span className="muted">—</span>}</td>
                  <td className="muted">{o.payment}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <div className="cell-action">
                      {o.status === "Processing" && <button className="btn btn-sm btn-primary" style={{ padding: "5px 10px", fontSize: 11 }}>Shipped</button>}
                      <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setPanel(o)}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Slide-out panel */}
      {panel && (
        <>
          <div className="panel-overlay" onClick={() => setPanel(null)} />
          <div className="slide-panel">
            <div className="panel-hd">
              <div>
                <div className="mono text-xs" style={{ color: "var(--blue)", marginBottom: 4 }}>{panel.id}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{panel.customer}</div>
              </div>
              <button className="icon-btn" onClick={() => setPanel(null)}><i className="fa fa-times" /></button>
            </div>
            <div className="eyebrow mb10">Order Details</div>
            <div className="row-between mb8 text-sm"><span className="text-muted">Items</span><span>{panel.items}</span></div>
            <div className="row-between mb8 text-sm"><span className="text-muted">Total</span><span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{panel.total}</span></div>
            <div className="row-between mb8 text-sm"><span className="text-muted">Payment</span><span>{panel.payment}</span></div>
            {panel.coupon && <div className="row-between mb8 text-sm"><span className="text-muted">Coupon</span><span className="mono" style={{ color: "var(--blue)" }}>{panel.coupon}</span></div>}
            <div className="row-between mb8 text-sm"><span className="text-muted">Status</span><StatusBadge status={panel.status} /></div>
            <div className="row-between mb16 text-sm"><span className="text-muted">Customer's order #</span><span>#{panel.orderCount}</span></div>
            <div className="divider" />
            <div className="col-gap mt16">
              {panel.status === "Processing" && <button className="btn btn-primary btn-full">Mark as Shipped</button>}
              <button className="btn btn-ghost btn-full"><i className="fa fa-flag" style={{ fontSize: 12 }} /> Flag for Review</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Section: Customers ─────────────────────────────────
function Customers() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = CUSTOMERS_DATA.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  if (selected) {
    const c = selected;
    return (
      <div className="dash-inner-wide">
        <button className="btn btn-ghost btn-sm mb16" onClick={() => setSelected(null)}>
          <i className="fa fa-arrow-left" style={{ fontSize: 12 }} /> Back to Customers
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
        <div className="text-muted text-sm mb16">{c.phone}</div>
        <div className="stat-row mb16">
          <div className="stat-card"><div className="stat-label">Orders</div><div className="stat-value">{c.orders}</div></div>
          <div className="stat-card"><div className="stat-label">Total Spent</div><div className="stat-value">৳{c.spent}</div></div>
          <div className="stat-card"><div className="stat-label">Points</div><div className="stat-value">{c.points}</div></div>
        </div>
        <SectionCard>
          <div className="row-between mb8 text-sm"><span className="text-muted">Crew Status</span><span style={{ fontWeight: 600 }}>{c.crewStatus}</span></div>
          <div className="row-between mb8 text-sm"><span className="text-muted">Joined</span><span>{c.joined}</span></div>
          <div className="row-between text-sm"><span className="text-muted">Phone</span><span>{c.phone}</span></div>
        </SectionCard>
        <div className="eyebrow mb10 mt16">Admin Actions</div>
        <div className="col-gap">
          <button className="btn btn-ghost btn-full">Adjust Points Manually</button>
          <button className="btn btn-ghost-danger btn-full"><i className="fa fa-ban" style={{ fontSize: 12 }} /> Suspend Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Customers</div>
      <input className="input mb16" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Points</th><th>Status</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(c)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="muted mono">{c.phone}</td>
                  <td>{c.orders}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{c.spent}</td>
                  <td>{c.points.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${c.crewStatus === "None" ? "badge-gray" : c.crewStatus === "Influencer" ? "badge-blue" : "badge-orange"}`}>
                      {c.crewStatus}
                    </span>
                  </td>
                  <td className="muted">{c.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Section: Subscriptions ─────────────────────────────
function Subscriptions() {
  const [subTab, setSubTab] = useState("Active");
  const filtered = SUBS_DATA.filter(s => s.status === subTab);
  const active   = SUBS_DATA.filter(s => s.status === "Active");
  const upcoming7Days = active.length;
  const upcomingRevenue = active.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Subscriptions</div>

      {/* Upcoming billing */}
      <SectionCard style={{ background: "var(--orange-faint)", borderColor: "rgba(255,145,0,.25)", marginBottom: 16 }}>
        <div className="text-sm" style={{ color: "var(--orange)", fontWeight: 600 }}>
          In the next 7 days, <strong>{upcoming7Days}</strong> subscriptions will be charged totalling <strong>৳{upcomingRevenue}</strong>.
        </div>
      </SectionCard>

      <div className="toggle-group">
        {["Active", "Paused", "Cancelled"].map(t => (
          <button key={t} className={`toggle-btn ${subTab === t ? "active" : ""}`} onClick={() => setSubTab(t)}>{t}</button>
        ))}
      </div>

      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Customer</th><th>Plan</th><th>Next Billing</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--cream-65)" }}>No {subTab.toLowerCase()} subscriptions.</td></tr>
              ) : filtered.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.customer}</td>
                  <td>{s.plan}</td>
                  <td className="muted">{s.nextBilling}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{s.amount}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <div className="cell-action">
                      {s.status === "Active" && <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>Pause</button>}
                      {s.status !== "Cancelled" && <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(229,92,92,.4)" }}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {subTab === "Cancelled" && (
        <div className="card mt8">
          <div className="text-sm text-muted">Cancellations this month: <strong style={{ color: "var(--cream)" }}>1</strong> &nbsp;·&nbsp; MRR lost: <strong style={{ color: "var(--red)" }}>৳210</strong></div>
        </div>
      )}
    </div>
  );
}

// ── Section: Coupons ───────────────────────────────────
function Coupons() {
  const [coupTab, setCoupTab] = useState("Festival");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", type: "Percentage", value: "", minOrder: "", cap: "", perAccount: "1", expiry: "", active: true });

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Coupons</div>
      <div className="toggle-group">
        {["Festival", "Crew", "Influencer"].map(t => (
          <button key={t} className={`toggle-btn ${coupTab === t ? "active" : ""}`} onClick={() => setCoupTab(t)}>{t}</button>
        ))}
      </div>

      {coupTab === "Festival" && (
        <div>
          {/* Create form */}
          <div className="card mb16">
            <div className="row-between" style={{ cursor: "pointer" }} onClick={() => setShowForm(!showForm)}>
              <div className="eyebrow" style={{ marginBottom: 0 }}>Create New Coupon</div>
              <i className={`fa fa-chevron-${showForm ? "up" : "down"} text-muted`} style={{ fontSize: 12 }} />
            </div>
            {showForm && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="input-group"><label className="input-label">Code</label><input className="input" placeholder="SUMMER25" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
                  <div className="input-group"><label className="input-label">Type</label><select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option>Percentage</option><option>Flat amount</option></select></div>
                  <div className="input-group"><label className="input-label">Discount Value</label><input className="input" placeholder={form.type === "Percentage" ? "15" : "50"} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
                  <div className="input-group"><label className="input-label">Min Order (৳)</label><input className="input" placeholder="200" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} /></div>
                  <div className="input-group"><label className="input-label">Usage Cap</label><input className="input" placeholder="100" value={form.cap} onChange={e => setForm(f => ({ ...f, cap: e.target.value }))} /></div>
                  <div className="input-group"><label className="input-label">Per-account Limit</label><input className="input" value={form.perAccount} onChange={e => setForm(f => ({ ...f, perAccount: e.target.value }))} /></div>
                  <div className="input-group" style={{ gridColumn: "1/-1" }}><label className="input-label">Expiry</label><input className="input" type="date" value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} /></div>
                </div>
                <div className="row mt8" style={{ gap: 10 }}>
                  <button className="btn btn-primary">Create Coupon</button>
                  <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <SectionCard style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Used / Cap</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {COUPONS_FESTIVAL.map((c, i) => (
                    <tr key={i}>
                      <td className="mono fw700" style={{ color: "var(--blue)" }}>{c.code}</td>
                      <td>{c.discount}</td>
                      <td className="muted">৳{c.minOrder}</td>
                      <td>{c.used} / {c.cap}</td>
                      <td className="muted">{c.expiry}</td>
                      <td><span className={`badge ${c.active ? "badge-green" : "badge-gray"}`}>{c.active ? "Active" : "Expired"}</span></td>
                      <td>
                        <div className="cell-action">
                          {c.active && <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>Deactivate</button>}
                          <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(229,92,92,.4)" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {coupTab === "Crew" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm"><i className="fa fa-download" style={{ fontSize: 12 }} /> Export CSV</button>
          </div>
          <SectionCard style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Member</th><th>Code</th><th>Times Used</th><th>Orders</th><th>৳ Value</th><th>Points Owed</th></tr></thead>
                <tbody>
                  {COUPONS_CREW.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.member}</td>
                      <td className="mono" style={{ color: "var(--blue)" }}>{c.code}</td>
                      <td>{c.used}</td>
                      <td>{c.orders}</td>
                      <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{c.value}</td>
                      <td style={{ color: "var(--orange)", fontWeight: 600 }}>{c.pts.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {coupTab === "Influencer" && (
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Code</th><th>Orders (Mo)</th><th>Commission (Mo)</th><th>Total Owed</th><th>Actions</th></tr></thead>
              <tbody>
                {COUPONS_INFLUENCER.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="mono" style={{ color: "var(--blue)" }}>{c.code}</td>
                    <td>{c.ordersMo}</td>
                    <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{c.commMo}</td>
                    <td style={{ color: c.totalOwed > 0 ? "var(--orange)" : "var(--green)", fontWeight: 600 }}>
                      {c.totalOwed > 0 ? `৳${c.totalOwed}` : "Paid"}
                    </td>
                    <td>
                      {c.totalOwed > 0 && (
                        <button className="btn btn-sm btn-primary" style={{ padding: "6px 12px", fontSize: 11 }}>Mark as Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ── Section: Crew Management ───────────────────────────
function CrewManagement() {
  const [crewTab, setCrewTab] = useState("Pending");
  const [approved, setApproved] = useState([]);
  const [declined, setDeclined] = useState([]);

  const pending = PENDING_CREW.filter(a => !approved.includes(a.name) && !declined.includes(a.name));

  return (
    <div className="dash-inner">
      <div className="page-title">Crew Management</div>
      <div className="toggle-group">
        <button className={`toggle-btn ${crewTab === "Pending" ? "active" : ""}`} onClick={() => setCrewTab("Pending")}>
          Pending ({pending.length})
        </button>
        <button className={`toggle-btn ${crewTab === "Active" ? "active" : ""}`} onClick={() => setCrewTab("Active")}>Active</button>
      </div>

      {crewTab === "Pending" && (
        <div>
          {pending.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><i className="fa fa-check-circle" /></div>
              <h3>All caught up!</h3>
              <p>No pending applications.</p>
            </div>
          ) : pending.map((a, i) => (
            <div key={i} className="card mb12">
              <div className="row-between mb12">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                  <div className="text-xs text-muted mt4">{a.phone} · {a.institution}</div>
                  {a.social && <div className="text-xs text-muted">{a.social}</div>}
                </div>
                <div className="text-xs text-muted">{a.date}</div>
              </div>
              <div className="card mb12" style={{ background: "rgba(247,227,201,.04)", borderColor: "var(--cream-15)" }}>
                <div className="eyebrow mb6">Why do you drink Midnight Pick?</div>
                <div className="text-sm" style={{ lineHeight: 1.6, color: "var(--cream-65)" }}>{a.why}</div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-primary" onClick={() => setApproved(prev => [...prev, a.name])}>
                  <i className="fa fa-check" style={{ fontSize: 12 }} /> Approve
                </button>
                <button className="btn btn-ghost" onClick={() => setDeclined(prev => [...prev, a.name])}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {crewTab === "Active" && (
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Institution</th><th>Code</th><th>Referrals (Mo)</th><th>Points</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {[...ACTIVE_CREW, ...approved.map(n => ({ name: n, institution: "—", code: "NEWCODE", refMo: 0, pts: 0, joined: "Today" }))].map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="muted">{c.institution}</td>
                    <td className="mono" style={{ color: "var(--blue)" }}>{c.code}</td>
                    <td>{c.refMo}</td>
                    <td style={{ color: "var(--orange)", fontWeight: 600 }}>{c.pts.toLocaleString()}</td>
                    <td className="muted">{c.joined}</td>
                    <td>
                      <div className="cell-action">
                        <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>Suspend</button>
                        <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(229,92,92,.4)" }}>Revoke</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ── Section: Points & Redemptions ─────────────────────
function PointsAdmin() {
  const [adjSearch, setAdjSearch] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");

  return (
    <div className="dash-inner">
      <div className="page-title">Points &amp; Redemptions</div>

      {/* Fraud flags */}
      {FRAUD_FLAGS.length > 0 && (
        <div>
          <div className="eyebrow mb10">Fraud Flags</div>
          {FRAUD_FLAGS.map((f, i) => (
            <div key={i} className="card mb8" style={{ borderColor: "rgba(229,92,92,.4)", background: "var(--red-soft)" }}>
              <div className="row-between mb8">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{f.customer}</div>
                  <div className="text-xs text-muted mt4">{f.phone} · {f.date}</div>
                </div>
                <i className="fa fa-exclamation-triangle text-red" style={{ fontSize: 18 }} />
              </div>
              <div className="text-sm mb12" style={{ color: "var(--red)" }}>{f.reason}</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-sm btn-ghost">Clear Flag</button>
                <button className="btn btn-sm btn-ghost-danger"><i className="fa fa-ban" style={{ fontSize: 11 }} /> Suspend</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending redemptions */}
      <div className="eyebrow mb10 mt16">Pending Redemptions</div>
      {PENDING_REDEMPTIONS.map((r, i) => (
        <div key={i} className="card mb8">
          <div className="row-between mb8">
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.customer}</div>
              <div className="text-xs text-muted mt4">{r.phone} · {r.date}</div>
            </div>
            <span className="badge badge-orange">Pending</span>
          </div>
          <div className="row-between mb12 text-sm">
            <span style={{ fontWeight: 600 }}>{r.type}</span>
            <span style={{ color: "var(--orange)", fontWeight: 700 }}>−{r.pts.toLocaleString()} pts</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm"><i className="fa fa-check" style={{ fontSize: 11 }} /> Fulfill</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)", borderColor: "rgba(229,92,92,.4)" }}>Reject</button>
          </div>
        </div>
      ))}

      {/* Manual adjustment */}
      <div className="eyebrow mb10 mt20">Manual Points Adjustment</div>
      <div className="card">
        <div className="input-group">
          <label className="input-label">Search Customer</label>
          <input className="input" placeholder="Name or phone…" value={adjSearch} onChange={e => setAdjSearch(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Adjustment Amount (+/−)</label>
          <input className="input" placeholder="e.g. 500 or -200" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Reason (required)</label>
          <input className="input" placeholder="Customer service compensation…" value={adjReason} onChange={e => setAdjReason(e.target.value)} />
        </div>
        <button className="btn btn-primary mt16" disabled={!adjSearch || !adjAmount || !adjReason}>Apply Adjustment</button>
      </div>
    </div>
  );
}

// ── Section: Financials ────────────────────────────────
function Financials() {
  const [month, setMonth] = useState("May 2026");
  const months = ["May 2026", "April 2026", "March 2026", "February 2026"];

  const fin = {
    gross:      42840,
    discounts:  5620,
    net:        37220,
    commission: 788,
    ptsValue:   375,
    trueNet:    36057,
  };

  const couponBreak = [
    { label: "Festival", value: 2800, pct: 50, color: "var(--orange)" },
    { label: "Crew",     value: 1540, pct: 27, color: "var(--blue)" },
    { label: "Influencer", value: 1280, pct: 23, color: "var(--green)" },
  ];

  return (
    <div className="dash-inner-wide">
      <div className="row-between mb20" style={{ alignItems: "flex-start" }}>
        <div className="page-title" style={{ marginBottom: 0 }}>Financials</div>
        <div className="row" style={{ gap: 10 }}>
          <select className="select" style={{ width: 140 }} value={month} onChange={e => setMonth(e.target.value)}>
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm"><i className="fa fa-download" style={{ fontSize: 12 }} /> Export CSV</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <div className="stat-card"><div className="stat-label">Gross Revenue</div><div className="stat-value">৳{fin.gross.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Total Discounts</div><div className="stat-value" style={{ color: "var(--red)" }}>−৳{fin.discounts.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Net Revenue</div><div className="stat-value">৳{fin.net.toLocaleString()}</div></div>
        <div className="stat-card"><div className="stat-label">Influencer Commission</div><div className="stat-value" style={{ color: "var(--red)" }}>−৳{fin.commission}</div></div>
        <div className="stat-card"><div className="stat-label">Points Redeemed (৳ eq.)</div><div className="stat-value" style={{ color: "var(--red)" }}>−৳{fin.ptsValue}</div></div>
        <div className="stat-card" style={{ borderColor: "rgba(255,145,0,.35)", background: "var(--orange-faint)" }}>
          <div className="stat-label">Est. True Net</div>
          <div className="stat-value">৳{fin.trueNet.toLocaleString()}</div>
        </div>
      </div>

      {/* Coupon breakdown */}
      <SectionCard>
        <div className="eyebrow mb16">Discount Breakdown by Channel</div>
        {couponBreak.map((c, i) => (
          <div key={i} className="mb12">
            <div className="row-between mb6">
              <span className="text-sm">{c.label}</span>
              <span className="text-sm fw600">৳{c.value.toLocaleString()} <span className="text-muted">({c.pct}%)</span></span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${c.pct}%`, background: c.color }} />
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

// ── Section: Settings ──────────────────────────────────
function Settings() {
  const [store, setStore] = useState({ freeDelivery: "499", city: "Dhaka", whatsapp: "01XXXXXXXXX" });
  const [crew, setCrew]   = useState({ refPts: "500", subBonus: "2000", orderPts: "0.5" });

  return (
    <div className="dash-inner">
      <div className="page-title">Settings</div>

      <div className="eyebrow mb10">Store Settings</div>
      <div className="card mb16">
        <div className="input-group"><label className="input-label">Free Delivery Threshold (৳)</label><input className="input" value={store.freeDelivery} onChange={e => setStore(s => ({ ...s, freeDelivery: e.target.value }))} /></div>
        <div className="input-group"><label className="input-label">Default City</label><input className="input" value={store.city} onChange={e => setStore(s => ({ ...s, city: e.target.value }))} /></div>
        <div className="input-group" style={{ marginBottom: 0 }}><label className="input-label">Support WhatsApp Number</label><input className="input" value={store.whatsapp} onChange={e => setStore(s => ({ ...s, whatsapp: e.target.value }))} /></div>
        <button className="btn btn-primary mt16">Save Store Settings</button>
      </div>

      <div className="eyebrow mb10">Crew Program</div>
      <div className="card mb16">
        <div className="input-group"><label className="input-label">Points per referral order</label><input className="input" value={crew.refPts} onChange={e => setCrew(c => ({ ...c, refPts: e.target.value }))} /></div>
        <div className="input-group"><label className="input-label">Bonus pts for subscription conversion</label><input className="input" value={crew.subBonus} onChange={e => setCrew(c => ({ ...c, subBonus: e.target.value }))} /></div>
        <div className="input-group" style={{ marginBottom: 0 }}><label className="input-label">Points per ৳ spent (regular orders)</label><input className="input" value={crew.orderPts} onChange={e => setCrew(c => ({ ...c, orderPts: e.target.value }))} /></div>
        <button className="btn btn-primary mt16">Save Crew Settings</button>
      </div>

      <div className="eyebrow mb10">Notification Templates</div>
      <div className="card mb16">
        {["Crew Approval", "Order Confirmation", "Subscription Charge Reminder", "Redemption Fulfilled"].map(t => (
          <div key={t} className="mb12">
            <label className="input-label">{t}</label>
            <textarea className="input" rows={2} style={{ resize: "vertical" }} placeholder={`Template for: ${t}`} />
          </div>
        ))}
        <button className="btn btn-primary">Save Templates</button>
      </div>

      <div className="eyebrow mb10">Admin Account</div>
      <div className="card">
        <div className="input-group"><label className="input-label">Email</label><input className="input" defaultValue="admin@midnightpick.com" /></div>
        <div className="input-group"><label className="input-label">New Password</label><input className="input" type="password" placeholder="Leave blank to keep current" /></div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <div className="row-between">
            <label className="input-label" style={{ marginBottom: 0 }}>Two-Factor Authentication</label>
            <span className="badge badge-green">Enabled</span>
          </div>
        </div>
        <button className="btn btn-primary mt16">Update Account</button>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────
function Sidebar({ section, setSection }) {
  const links = [
    { id: "overview",  icon: "fa-chart-pie",      label: "Overview" },
    { id: "orders",    icon: "fa-box",             label: "Orders",     badge: "12" },
    { id: "customers", icon: "fa-users",           label: "Customers" },
    { id: "subs",      icon: "fa-calendar-check",  label: "Subscriptions" },
    { id: "coupons",   icon: "fa-ticket-alt",      label: "Coupons" },
    { id: "crew",      icon: "fa-fire",            label: "Crew", badge: PENDING_CREW.length > 0 ? String(PENDING_CREW.length) : null },
    { id: "influencer",icon: "fa-bolt",            label: "Influencers" },
    { id: "points",    icon: "fa-star",            label: "Points &amp; Redemptions" },
    { id: "financials",icon: "fa-chart-line",      label: "Financials" },
    { id: "settings",  icon: "fa-cog",            label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><img src="assets/logo.png" alt="Midnight Pick" /></div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <div key={l.id} className={`sidebar-link ${section === l.id ? "active" : ""}`} onClick={() => setSection(l.id)}>
            <i className={`fa ${l.icon} s-icon`} />
            <span dangerouslySetInnerHTML={{ __html: l.label }} />
            {l.badge && <span className="sidebar-badge">{l.badge}</span>}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ background: "rgba(229,92,92,.2)", color: "var(--red)" }}>A</div>
          <div><div className="sidebar-user-name">Admin</div><div className="sidebar-user-role">Midnight Pick</div></div>
        </div>
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────
function AdminDashboard() {
  const [section, setSection] = useState("overview");

  const titles = {
    overview: "Overview", orders: "Orders", customers: "Customers",
    subs: "Subscriptions", coupons: "Coupons", crew: "Crew",
    influencer: "Influencers", points: "Points & Redemptions",
    financials: "Financials", settings: "Settings",
  };

  function render() {
    switch (section) {
      case "overview":   return <Overview setSection={setSection} />;
      case "orders":     return <Orders />;
      case "customers":  return <Customers />;
      case "subs":       return <Subscriptions />;
      case "coupons":    return <Coupons />;
      case "crew":       return <CrewManagement />;
      case "influencer": return <InfluencersSection />;
      case "points":     return <PointsAdmin />;
      case "financials": return <Financials />;
      case "settings":   return <Settings />;
      default:           return null;
    }
  }

  return (
    <div className="dash-layout">
      <Sidebar section={section} setSection={setSection} />
      <div className="dash-main">
        {/* Mobile simplified top bar */}
        <header className="topbar">
          <img src="assets/logo.png" alt="Midnight Pick" className="topbar-logo" />
          <span className="topbar-title">Admin — {titles[section]}</span>
          <div className="topbar-right">
            <button className="icon-btn"><i className="fa fa-bars" /></button>
          </div>
        </header>
        <main className="dash-content">
          {render()}
        </main>
      </div>
    </div>
  );
}

// ── Influencers (inline to avoid forward ref issue) ────
function InfluencersSection() {
  return (
    <div className="dash-inner-wide">
      <div className="page-title">Influencers</div>
      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Code</th><th>Orders This Month</th><th>Commission (Mo)</th><th>Total Owed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {COUPONS_INFLUENCER.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="mono" style={{ color: "var(--blue)" }}>{c.code}</td>
                  <td>{c.ordersMo}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{c.commMo}</td>
                  <td style={{ color: c.totalOwed > 0 ? "var(--orange)" : "var(--green)", fontWeight: 700 }}>
                    {c.totalOwed > 0 ? `৳${c.totalOwed}` : "৳0 — Paid"}
                  </td>
                  <td>
                    {c.totalOwed > 0 && (
                      <button className="btn btn-sm btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Mark as Paid</button>
                    )}
                    {!c.totalOwed && <span className="badge badge-green">Paid</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminDashboard />);
