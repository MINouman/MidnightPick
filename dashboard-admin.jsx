// Midnight Pick — Admin Dashboard

const { useState, useRef, useEffect, useContext, createContext } = React;

const DashCtx = createContext(null);

// ── Helpers ────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtStatus(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function orderSummary(items) {
  if (!items || !items.length) return '—';
  return items.map(i => `${i.name} ×${i.qty}`).join(', ');
}

function roleLabel(role) {
  if (role === 'crew') return 'Crew';
  if (role === 'influencer') return 'Influencer';
  return 'Customer';
}

function roleBadge(role) {
  if (role === 'crew') return 'badge-orange';
  if (role === 'influencer') return 'badge-blue';
  return 'badge-gray';
}

const PRODUCT_STATUSES = ["Active", "New", "Coming Soon", "Stock Out", "Featured", "Discontinued"];

const PRODUCT_STATUS_BADGE = {
  "Active": "badge-green", "New": "badge-blue", "Coming Soon": "badge-orange",
  "Stock Out": "badge-red", "Featured": "badge-orange", "Discontinued": "badge-gray",
};

// ── Loading Screen ─────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <img src="assets/logo.png" alt="Midnight Pick" style={{ width: 48, opacity: .6 }} />
      <div className="text-muted text-sm">Loading…</div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    confirmed: "badge-orange", processing: "badge-orange", packed: "badge-orange",
    shipped: "badge-blue", delivered: "badge-green", cancelled: "badge-red",
    Processing: "badge-orange", Packaged: "badge-orange", Shipped: "badge-blue",
    Delivered: "badge-green", Cancelled: "badge-red", Active: "badge-green",
    Paused: "badge-gray", paid: "badge-green", Pending: "badge-orange",
  };
  const s = typeof status === "string" ? status : String(status);
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return <span className={`badge ${map[s] || "badge-gray"}`}>{label}</span>;
}

function SectionCard({ children, style }) {
  return <div className="card" style={{ marginBottom: 14, ...style }}>{children}</div>;
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

// ── Revenue Mini Chart ─────────────────────────────────
function RevenueChart({ days }) {
  if (!days || days.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: "var(--text-35)", fontSize: 12, borderRadius: 6, background: "var(--bg-soft)" }}>
        No revenue data yet
      </div>
    );
  }
  const maxVal = Math.max(...days.map(d => d.total), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, padding: "0 4px" }}>
      {days.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 0, height: "100%" }}>
          <div style={{ borderRadius: "2px 2px 0 0", background: "var(--orange)", height: `${Math.round((d.sub / maxVal) * 100)}%`, opacity: .85 }} />
          <div style={{ borderRadius: 0, background: "rgba(44,24,16,.14)", height: `${Math.round(((d.total - d.sub) / maxVal) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}

// ── Section: Overview ──────────────────────────────────
function Overview({ setSection }) {
  const { stats, orders } = useContext(DashCtx);

  const statCards = [
    { label: "Total Orders",       value: stats?.orders?.total ?? '…',          icon: "fa-box" },
    { label: "Active Orders",      value: stats?.orders?.active ?? '…',         icon: "fa-box-open" },
    { label: "Total Users",        value: stats?.users?.total ?? '…',           icon: "fa-users" },
    { label: "Crew Members",       value: stats?.users?.crew ?? '…',            icon: "fa-fire" },
    { label: "Influencers",        value: stats?.users?.influencer ?? '…',      icon: "fa-bolt" },
    { label: "Revenue Delivered",  value: `৳${Number(stats?.revenue?.total_delivered || 0).toLocaleString()}`, icon: "fa-chart-line" },
  ];

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Overview</div>
      <div className="page-sub" style={{ marginBottom: 20 }}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      <div className="stat-row" style={{ marginBottom: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <SectionCard>
        <div className="eyebrow mb12">Revenue — Last 30 Days</div>
        <RevenueChart />
        <div className="row mt12" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(44,24,16,.14)" }} /><span className="text-xs text-muted">Total revenue</span></div>
          <div className="row" style={{ gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--orange)", opacity: .85 }} /><span className="text-xs text-muted">Subscription revenue</span></div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="eyebrow mb12">Recent Orders</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Coupon</th><th>Status</th></tr>
            </thead>
            <tbody>
              {(!orders || orders.length === 0) ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No orders yet.</td></tr>
              ) : orders.slice(0, 10).map((o, i) => (
                <tr key={i}>
                  <td className="muted">{fmtDate(o.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                  <td className="muted" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orderSummary(o.items)}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 700 }}>৳{o.total}</td>
                  <td>{o.coupon_code ? <span className="mono text-xs" style={{ color: "var(--blue)" }}>{o.coupon_code}</span> : <span className="muted">—</span>}</td>
                  <td><StatusBadge status={o.status} /></td>
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
  const { orders: ctxOrders, adminProducts } = useContext(DashCtx);
  const [orders, setOrders] = useState(ctxOrders || []);
  const [filter, setFilter] = useState({ status: "All", coupon: "All", search: "" });
  const [panel, setPanel] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [newOrderPanel, setNewOrderPanel] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer: "", phone: "", address: "", orderItems: [], total: "", payment: "bKash", coupon: "", notes: "", status: "processing" });

  useEffect(() => { setOrders(ctxOrders || []); }, [ctxOrders]);

  async function updateStatus(newStatus) {
    if (!panel) return;
    try {
      await window.mpApi.fetch(`/admin/orders/${panel.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (_) {}
    const updated = { ...panel, status: newStatus };
    setOrders(prev => prev.map(o => o.id === panel.id ? updated : o));
    setPanel(updated);
  }

  function saveEdit() {
    const updated = { ...panel, total: parseFloat(editFields.total) || panel.total, customer_phone: editFields.phone };
    setOrders(prev => prev.map(o => o.id === panel.id ? updated : o));
    setPanel(updated);
    setEditMode(false);
  }

  function addOrderItem(productId) {
    const p = (adminProducts || []).find(x => x.id === productId);
    if (!p) return;
    setNewOrder(f => {
      const existing = f.orderItems.find(x => x.id === productId);
      if (existing) return { ...f, orderItems: f.orderItems.map(it => it.id === productId ? { ...it, qty: (parseInt(it.qty) || 1) + 1 } : it) };
      return { ...f, orderItems: [...f.orderItems, { id: p.id, name: p.name, qty: 1, unit_price: parseFloat(p.price) || 0 }] };
    });
  }

  function removeOrderItem(idx) {
    setNewOrder(f => ({ ...f, orderItems: f.orderItems.filter((_, i) => i !== idx) }));
  }

  function updateOrderItemQty(idx, val) {
    setNewOrder(f => ({ ...f, orderItems: f.orderItems.map((it, i) => i === idx ? { ...it, qty: val === '' ? '' : Math.max(1, parseInt(val) || 1) } : it) }));
  }

  async function submitManualOrder() {
    if (!newOrder.customer || !newOrder.orderItems.length) return;
    const subtotal = newOrder.orderItems.reduce((s, it) => s + it.unit_price * (parseInt(it.qty) || 1), 0);
    const total    = newOrder.total ? parseFloat(newOrder.total) : subtotal;
    const discount = Math.max(0, Math.round(subtotal - total));
    try {
      const res = await window.mpApi.fetch('/admin/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name:   newOrder.customer,
          customer_phone:  newOrder.phone || undefined,
          address:         newOrder.address || undefined,
          items:           newOrder.orderItems.map(it => ({ id: it.id, name: it.name, qty: parseInt(it.qty) || 1, unit_price: it.unit_price })),
          payment_type:    newOrder.payment,
          coupon_code:     newOrder.coupon || undefined,
          discount_amount: discount,
          status:          newOrder.status,
          notes:           newOrder.notes || undefined,
        }),
      });
      if (res?.ok && res.data) setOrders(prev => [res.data, ...prev]);
    } catch (_) {}
    setNewOrderPanel(false);
    setNewOrder({ customer: "", phone: "", address: "", orderItems: [], total: "", payment: "bKash", coupon: "", notes: "", status: "processing" });
  }

  const filtered = orders.filter(o => {
    if (filter.status !== "All" && o.status !== filter.status) return false;
    if (filter.coupon === "With Coupon" && !o.coupon_code) return false;
    if (filter.coupon === "No Coupon" && o.coupon_code) return false;
    const q = filter.search.toLowerCase();
    if (q && !(o.customer_name || '').toLowerCase().includes(q) && !(o.customer_phone || '').includes(filter.search)) return false;
    return true;
  });

  function openPanel(o) {
    setPanel(o);
    setEditMode(false);
    setEditFields({ total: o.total, phone: o.customer_phone || "" });
  }

  const statusOpts = [
    { val: "All", label: "All Statuses" },
    { val: "confirmed",  label: "Confirmed" },
    { val: "processing", label: "Processing" },
    { val: "packed",     label: "Packaged" },
    { val: "shipped",    label: "Shipped" },
    { val: "delivered",  label: "Delivered" },
    { val: "cancelled",  label: "Cancelled" },
  ];

  return (
    <div className="dash-inner-wide">
      <div className="row-between mb20" style={{ alignItems: "flex-start" }}>
        <div className="page-title" style={{ marginBottom: 0 }}>Orders</div>
        <button className="btn btn-primary" onClick={() => setNewOrderPanel(true)}>
          <i className="fa fa-plus" style={{ fontSize: 12 }} /> New Order
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input className="input" placeholder="Search name or phone…" style={{ width: 220 }} value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <select className="select" style={{ width: 160 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          {statusOpts.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
        </select>
        <select className="select" style={{ width: 160 }} value={filter.coupon} onChange={e => setFilter(f => ({ ...f, coupon: e.target.value }))}>
          {["All", "With Coupon", "No Coupon"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Coupon</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No orders found.</td></tr>
              ) : filtered.map((o, i) => (
                <tr key={i}>
                  <td className="mono text-xs" style={{ color: "var(--blue)" }}>{o.order_ref}</td>
                  <td className="muted">{fmtDate(o.created_at)}</td>
                  <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => openPanel(o)}>{o.customer_name}</td>
                  <td className="muted" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orderSummary(o.items)}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 700 }}>৳{o.total}</td>
                  <td>{o.coupon_code ? <span className="mono text-xs" style={{ color: "var(--blue)" }}>{o.coupon_code}</span> : <span className="muted">—</span>}</td>
                  <td className="muted">{o.payment_type || '—'}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>
                    <div className="cell-action">
                      {(o.status === "processing" || o.status === "confirmed") && (
                        <button className="btn btn-sm btn-primary" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => openPanel(o)}>Manage</button>
                      )}
                      <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => openPanel(o)}>View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {panel && (
        <>
          <div className="panel-overlay" onClick={() => { setPanel(null); setEditMode(false); }} />
          <div className="slide-panel">
            <div className="panel-hd">
              <div>
                <div className="mono text-xs" style={{ color: "var(--blue)", marginBottom: 4 }}>{panel.order_ref}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{panel.customer_name}</div>
              </div>
              <button className="icon-btn" onClick={() => { setPanel(null); setEditMode(false); }}><i className="fa fa-times" /></button>
            </div>

            {!editMode ? (
              <>
                <div className="eyebrow mb10">Order Details</div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Items</span><span style={{ maxWidth: 200, textAlign: "right" }}>{orderSummary(panel.items)}</span></div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Total</span><span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{panel.total}</span></div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Phone</span><span>{panel.customer_phone || '—'}</span></div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Payment</span><span>{panel.payment_type || '—'}</span></div>
                {panel.coupon_code && <div className="row-between mb8 text-sm"><span className="text-muted">Coupon</span><span className="mono" style={{ color: "var(--blue)" }}>{panel.coupon_code}</span></div>}
                <div className="row-between mb8 text-sm"><span className="text-muted">Date</span><span>{fmtDate(panel.created_at)}</span></div>
                <div className="row-between mb16 text-sm"><span className="text-muted">Status</span><StatusBadge status={panel.status} /></div>
                <div className="divider" />

                <div className="col-gap mt16">
                  {panel.status !== "cancelled" && panel.status !== "delivered" && (
                    <button className="btn btn-ghost btn-full" onClick={() => setEditMode(true)}>
                      <i className="fa fa-pencil" style={{ fontSize: 12 }} /> Edit Order
                    </button>
                  )}
                </div>

                {panel.status !== "cancelled" && panel.status !== "delivered" && (
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <div className="eyebrow mb10">Update Status</div>
                    <div className="col-gap" style={{ gap: 8 }}>
                      {(panel.status === "processing" || panel.status === "confirmed") && (
                        <button className="btn btn-primary btn-sm" onClick={() => updateStatus("packed")}>
                          <i className="fa fa-box-open" style={{ fontSize: 11 }} /> Mark as Packaged
                        </button>
                      )}
                      {panel.status === "packed" && (
                        <button className="btn btn-primary btn-sm" onClick={() => updateStatus("shipped")}>
                          <i className="fa fa-truck" style={{ fontSize: 11 }} /> Hand to Delivery Service
                        </button>
                      )}
                      {panel.status === "shipped" && (
                        <div style={{ fontSize: 12, color: "var(--blue)", padding: "8px 12px", background: "rgba(100,181,246,0.1)", border: "1px solid rgba(100,181,246,0.2)", borderRadius: 8 }}>
                          <i className="fa fa-info-circle" style={{ marginRight: 6 }} />Tracking status will auto-update via the delivery service API.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="col-gap mt4">
                  {panel.status !== "cancelled" && (
                    <button className="btn btn-full" style={{ background: "rgba(217,64,64,.08)", color: "var(--red)", border: "1px solid rgba(217,64,64,.25)" }} onClick={() => setCancelConfirm(true)}>
                      <i className="fa fa-times-circle" style={{ fontSize: 12 }} /> Cancel Order
                    </button>
                  )}
                  <button className="btn btn-ghost btn-full"><i className="fa fa-flag" style={{ fontSize: 12 }} /> Flag for Review</button>
                </div>
              </>
            ) : (
              <>
                <div className="eyebrow mb12">Edit Order</div>
                <div className="input-group">
                  <label className="input-label">Total (৳)</label>
                  <input className="input" type="number" value={editFields.total} onChange={e => setEditFields(f => ({ ...f, total: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Customer Phone</label>
                  <input className="input" value={editFields.phone} onChange={e => setEditFields(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="col-gap mt8">
                  <button className="btn btn-primary btn-full" onClick={saveEdit}>Save Changes</button>
                  <button className="btn btn-ghost btn-full" onClick={() => setEditMode(false)}>Cancel Edit</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {cancelConfirm && (
        <Sheet
          title={`Cancel order ${panel?.order_ref}?`}
          body={`This will mark the order as Cancelled. ${panel?.customer_name} will be notified.`}
          confirmLabel="Cancel Order"
          onConfirm={() => { updateStatus("cancelled"); setCancelConfirm(false); }}
          onClose={() => setCancelConfirm(false)}
        />
      )}

      {newOrderPanel && (
        <>
          <div className="panel-overlay" onClick={() => setNewOrderPanel(false)} />
          <div className="slide-panel" style={{ width: 440 }}>
            <div className="panel-hd">
              <div style={{ fontWeight: 700, fontSize: 16 }}>New Manual Order</div>
              <button className="icon-btn" onClick={() => setNewOrderPanel(false)}><i className="fa fa-times" /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingBottom: 16 }}>
              <div style={{ background: "rgba(255,145,0,.1)", border: "1px solid rgba(255,145,0,.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--orange)" }}>
                  <i className="fa fa-info-circle" style={{ marginRight: 6 }} />
                  Use this form to record orders placed via phone, WhatsApp, or in person.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Customer Name *</label>
                  <input className="input" placeholder="Full name" value={newOrder.customer} onChange={e => setNewOrder(f => ({ ...f, customer: e.target.value }))} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Phone Number</label>
                  <input className="input" placeholder="01XXXXXXXXX" value={newOrder.phone} onChange={e => setNewOrder(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Delivery Address</label>
                  <textarea className="input" rows={2} style={{ resize: "vertical" }} placeholder="House, Road, Area, City" value={newOrder.address} onChange={e => setNewOrder(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Products *</label>
                  <select className="select" defaultValue="" onChange={e => { if (e.target.value) { addOrderItem(e.target.value); e.target.value = ""; } }}>
                    <option value="" disabled>— Select a product —</option>
                    {(adminProducts || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name} — ৳{p.price}</option>
                    ))}
                  </select>
                  {newOrder.orderItems.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {newOrder.orderItems.map((it, idx) => (
                        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-soft)", borderRadius: 6, padding: "6px 10px" }}>
                          <span style={{ flex: 1, fontSize: 13 }}>{it.name}</span>
                          <span style={{ color: "var(--text-65)", fontSize: 12, whiteSpace: "nowrap" }}>৳{it.unit_price}</span>
                          <input type="number" min="1" value={it.qty} onChange={e => updateOrderItemQty(idx, e.target.value)} style={{ width: 52, textAlign: "center" }} className="input" />
                          <button className="icon-btn" onClick={() => removeOrderItem(idx)}><i className="fa fa-times" /></button>
                        </div>
                      ))}
                      <div style={{ textAlign: "right", fontSize: 13, color: "var(--orange)", fontWeight: 700, paddingRight: 4 }}>
                        Subtotal: ৳{newOrder.orderItems.reduce((s, it) => s + it.unit_price * (parseInt(it.qty) || 1), 0).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label className="input-label">Total (৳)</label>
                  <input className="input" type="number" min="0" placeholder="0" value={newOrder.total} onChange={e => setNewOrder(f => ({ ...f, total: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Payment Method</label>
                  <select className="select" value={newOrder.payment} onChange={e => setNewOrder(f => ({ ...f, payment: e.target.value }))}>
                    {["bKash", "Nagad", "Rocket", "Cash", "Card", "Bank Transfer"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Coupon Code</label>
                  <input className="input" placeholder="Optional" value={newOrder.coupon} onChange={e => setNewOrder(f => ({ ...f, coupon: e.target.value.toUpperCase() }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Initial Status</label>
                  <select className="select" value={newOrder.status} onChange={e => setNewOrder(f => ({ ...f, status: e.target.value }))}>
                    {["processing", "packed", "shipped", "delivered"].map(s => <option key={s}>{fmtStatus(s)}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Internal Notes</label>
                  <textarea className="input" rows={2} style={{ resize: "vertical" }} placeholder="e.g. Customer called at 3pm, prefers evening delivery" value={newOrder.notes} onChange={e => setNewOrder(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="divider mt4" />
              <div className="col-gap mt16">
                <button className="btn btn-primary btn-full" onClick={submitManualOrder} disabled={!newOrder.customer || !newOrder.orderItems.length}>
                  <i className="fa fa-plus" style={{ fontSize: 12 }} /> Create Order
                </button>
                <button className="btn btn-ghost btn-full" onClick={() => setNewOrderPanel(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Section: Customers ─────────────────────────────────
function Customers() {
  const { customers: ctxCustomers } = useContext(DashCtx);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const all = ctxCustomers || [];
  const filtered = all.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    const c = selected;
    return (
      <div className="dash-inner-wide">
        <button className="btn btn-ghost btn-sm mb16" onClick={() => setSelected(null)}>
          <i className="fa fa-arrow-left" style={{ fontSize: 12 }} /> Back to Customers
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{c.name || '—'}</div>
        <div className="text-muted text-sm mb16">{c.phone || c.email || '—'}</div>
        <div className="stat-row mb16">
          <div className="stat-card"><div className="stat-label">Orders</div><div className="stat-value">{c.order_count || 0}</div></div>
          <div className="stat-card"><div className="stat-label">Total Spent</div><div className="stat-value">৳{Number(c.total_spent || 0).toLocaleString()}</div></div>
          <div className="stat-card"><div className="stat-label">Points</div><div className="stat-value">{(c.points_balance || 0).toLocaleString()}</div></div>
        </div>
        <SectionCard>
          <div className="row-between mb8 text-sm"><span className="text-muted">Role</span><span style={{ fontWeight: 600 }}>{roleLabel(c.role)}</span></div>
          <div className="row-between mb8 text-sm"><span className="text-muted">Joined</span><span>{fmtDate(c.created_at)}</span></div>
          <div className="row-between mb8 text-sm"><span className="text-muted">Phone</span><span>{c.phone || '—'}</span></div>
          {c.email && <div className="row-between mb8 text-sm"><span className="text-muted">Email</span><span>{c.email}</span></div>}
          <div className="row-between text-sm"><span className="text-muted">Account Status</span><span className={`badge ${c.is_active ? "badge-green" : "badge-red"}`}>{c.is_active ? "Active" : "Suspended"}</span></div>
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
      <input className="input mb16" placeholder="Search by name, phone, or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Points</th><th>Role</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No customers found.</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(c)}>
                  <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                  <td className="muted mono">{c.phone || '—'}</td>
                  <td>{c.order_count || 0}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{Number(c.total_spent || 0).toLocaleString()}</td>
                  <td>{(c.points_balance || 0).toLocaleString()}</td>
                  <td><span className={`badge ${roleBadge(c.role)}`}>{roleLabel(c.role)}</span></td>
                  <td className="muted">{fmtDate(c.created_at)}</td>
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

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Subscriptions</div>

      <div className="toggle-group">
        {["Active", "Paused", "Cancelled"].map(t => (
          <button key={t} className={`toggle-btn ${subTab === t ? "active" : ""}`} onClick={() => setSubTab(t)}>{t}</button>
        ))}
      </div>

      <div className="empty-state" style={{ marginTop: 40 }}>
        <div className="empty-icon"><i className="fa fa-calendar-check" /></div>
        <h3>Subscriptions coming soon</h3>
        <p>Subscription management backend is not yet built. This section will show active, paused, and cancelled subscriptions once ready.</p>
      </div>
    </div>
  );
}

// ── Section: Coupons ───────────────────────────────────
function Coupons() {
  const { adminInfluencers, setAdminInfluencers } = useContext(DashCtx);

  useEffect(() => {
    if ((adminInfluencers || []).length > 0) return;
    window.mpApi.fetch('/admin/influencers').then(res => {
      if (res?.data?.influencers?.length) setAdminInfluencers(res.data.influencers);
    }).catch(() => {});
  }, []);

  const [coupTab, setCoupTab] = useState("Festival");
  const [showForm, setShowForm] = useState(false);
  const [festCoupons, setFestCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", type: "Percentage", value: "", minOrder: "", cap: "", perAccount: "1", expiry: "", active: true });

  async function toggleInfluencerCoupon(code) {
    const res = await window.mpApi.fetch(`/admin/coupons/${code}/toggle`, { method: 'PATCH' });
    if (res?.ok && res?.data) {
      setAdminInfluencers(prev => prev.map(c => c.code === code ? { ...c, is_active: res.data.is_active } : c));
    } else if (res) {
      alert(res?.error?.message || res?.message || 'Failed to toggle coupon.');
    }
  }

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
                  <button className="btn btn-primary" onClick={() => {
                    if (!form.code || !form.value) return;
                    setFestCoupons(prev => [...prev, { ...form, used: 0 }]);
                    setForm({ code: "", type: "Percentage", value: "", minOrder: "", cap: "", perAccount: "1", expiry: "", active: true });
                    setShowForm(false);
                  }}>Create Coupon</button>
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
                  {festCoupons.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No festival coupons yet.</td></tr>
                  ) : festCoupons.map((c, i) => (
                    <tr key={i}>
                      <td className="mono fw700" style={{ color: "var(--blue)" }}>{c.code}</td>
                      <td>{c.type === "Percentage" ? `${c.value}%` : `৳${c.value}`}</td>
                      <td className="muted">৳{c.minOrder}</td>
                      <td>{c.used} / {c.cap}</td>
                      <td className="muted">{c.expiry}</td>
                      <td><span className={`badge ${c.active ? "badge-green" : "badge-gray"}`}>{c.active ? "Active" : "Expired"}</span></td>
                      <td>
                        <div className="cell-action">
                          <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setFestCoupons(prev => prev.map((x, j) => j === i ? { ...x, active: !x.active } : x))}>
                            {c.active ? "Deactivate" : "Activate"}
                          </button>
                          <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(229,92,92,.4)" }} onClick={() => setFestCoupons(prev => prev.filter((_, j) => j !== i))}>Delete</button>
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
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon"><i className="fa fa-fire" /></div>
          <h3>Crew coupons coming soon</h3>
          <p>Crew referral codes and their usage stats will appear here once the crew management backend is built.</p>
        </div>
      )}

      {coupTab === "Influencer" && (
        (adminInfluencers || []).length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-icon"><i className="fa fa-bolt" /></div>
            <h3>No influencer codes yet</h3>
            <p>Add influencers from the Influencers section. Their promo codes will appear here automatically.</p>
          </div>
        ) : (
          <SectionCard style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Code</th><th>Influencer</th><th>Commission Rate</th><th>Orders (Mo)</th><th>Total Owed</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {(adminInfluencers || []).map((c, i) => (
                    <tr key={c.id || i}>
                      <td className="mono fw700" style={{ color: "var(--blue)", letterSpacing: 2 }}>{c.code}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="muted">{c.comm_rate || 15}%</td>
                      <td>{c.orders_mo || 0}</td>
                      <td style={{ color: (c.total_owed || 0) > 0 ? "var(--orange)" : "var(--green)", fontWeight: 700 }}>
                        {(c.total_owed || 0) > 0 ? `৳${c.total_owed}` : "৳0 — Paid"}
                      </td>
                      <td><span className={`badge ${c.is_active !== false ? "badge-green" : "badge-gray"}`}>{c.is_active !== false ? "Active" : "Inactive"}</span></td>
                      <td>
                        <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => toggleInfluencerCoupon(c.code)}>
                          {c.is_active !== false ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )
      )}
    </div>
  );
}

// ── Section: Crew Management ───────────────────────────
function CrewManagement() {
  const [crewTab, setCrewTab] = useState("Pending");

  return (
    <div className="dash-inner">
      <div className="page-title">Crew Management</div>
      <div className="toggle-group">
        <button className={`toggle-btn ${crewTab === "Pending" ? "active" : ""}`} onClick={() => setCrewTab("Pending")}>Pending (0)</button>
        <button className={`toggle-btn ${crewTab === "Active" ? "active" : ""}`} onClick={() => setCrewTab("Active")}>Active</button>
      </div>

      {crewTab === "Pending" && (
        <div className="empty-state">
          <div className="empty-icon"><i className="fa fa-check-circle" /></div>
          <h3>All caught up!</h3>
          <p>No pending applications. Crew applications backend is not yet built.</p>
        </div>
      )}

      {crewTab === "Active" && (
        <div className="empty-state">
          <div className="empty-icon"><i className="fa fa-fire" /></div>
          <h3>No active crew members</h3>
          <p>Active crew members will appear here once the crew backend is built.</p>
        </div>
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

      <div className="empty-state" style={{ marginBottom: 32 }}>
        <div className="empty-icon"><i className="fa fa-star" /></div>
        <h3>No pending redemptions</h3>
        <p>Pending redemption requests will appear here once the redemptions backend is built.</p>
      </div>

      <div className="eyebrow mb10">Manual Points Adjustment</div>
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
  const { stats } = useContext(DashCtx);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  });
  const [month, setMonth] = useState(months[0]);
  const revenueDelivered = Number(stats?.revenue?.total_delivered || 0);

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

      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="stat-card" style={{ borderColor: "rgba(255,145,0,.35)", background: "var(--orange-faint)" }}>
          <div className="stat-label">Revenue (Delivered Orders)</div>
          <div className="stat-value">৳{revenueDelivered.toLocaleString()}</div>
        </div>
        <div className="stat-card"><div className="stat-label">Total Discounts</div><div className="stat-value text-muted">—</div></div>
        <div className="stat-card"><div className="stat-label">Influencer Commission</div><div className="stat-value text-muted">—</div></div>
        <div className="stat-card"><div className="stat-label">Points Redeemed (৳ eq.)</div><div className="stat-value text-muted">—</div></div>
      </div>

      <SectionCard>
        <div className="text-sm text-muted" style={{ textAlign: "center", padding: "20px 0" }}>
          Detailed financial breakdown (discounts, commissions, coupon analytics) will be available once the full order pipeline is live.
        </div>
      </SectionCard>
    </div>
  );
}

// ── Section: Settings ──────────────────────────────────
function Settings() {
  const { user } = useContext(DashCtx);
  const [store, setStore] = useState({ freeDelivery: "", city: "", whatsapp: "" });
  const [crew, setCrew]   = useState({ refPts: "", subBonus: "", orderPts: "" });

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
        <div className="input-group"><label className="input-label">Email</label><input className="input" defaultValue={user?.email || ''} readOnly /></div>
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

// ── Section: Products ──────────────────────────────────
function Products() {
  const [prodTab, setProdTab] = useState("Products");
  const { adminProducts: products, setAdminProducts: setProducts } = useContext(DashCtx);
  const [packages, setPackages] = useState([]);
  const [panel, setPanel] = useState(null);
  const [pkgPanel, setPkgPanel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);
  const activeImgIdx = useRef(0);

  const emptyProd = { name: "", description: "", price: "", stock: "", qty: "", unit: "g", status: "Active", images: [] };
  const [form, setForm] = useState(emptyProd);

  const emptyPkg = { name: "", description: "", price: "", status: "Active", productIds: [], quantities: {} };
  const [pkgForm, setPkgForm] = useState(emptyPkg);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) { e.target.value = ""; return; }
    const idx = activeImgIdx.current;
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(f => {
        const imgs = [...(f.images || [])];
        imgs[idx] = ev.target.result;
        return { ...f, images: imgs };
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openAddProduct() {
    setForm(emptyProd);
    setPanel({ type: "add" });
  }

  function openEditProduct(p) {
    setForm({ ...p, price: String(p.price), stock: String(p.stock), qty: p.qty ? String(p.qty) : "", unit: p.unit || "g", images: p.images || (p.image ? [p.image] : []) });
    setPanel({ type: "edit", data: p });
  }

  async function saveProduct() {
    if (!form.name || !form.price || !(form.images?.length)) return;
    const body = {
      name:   form.name,
      price:  parseFloat(form.price) || 0,
      stock:  parseInt(form.stock) || 0,
      status: form.status,
      images: form.images || [],
    };
    if (form.description) body.description = form.description;
    const qtyVal = parseInt(form.qty);
    if (qtyVal > 0) body.qty = qtyVal;
    if (form.unit) body.unit = form.unit;
    try {
      let res;
      if (panel.type === "add") {
        res = await window.mpApi.fetch('/admin/products', { method: 'POST', body: JSON.stringify(body) });
        if (res?.data) setProducts(prev => [res.data, ...prev]);
      } else {
        res = await window.mpApi.fetch(`/admin/products/${panel.data.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        if (res?.data) setProducts(prev => prev.map(p => p.id === panel.data.id ? res.data : p));
      }
    } catch (_) {
      alert('Failed to save product.');
      return;
    }
    setPanel(null);
  }

  async function deleteProduct(id) {
    try {
      await window.mpApi.fetch(`/admin/products/${id}`, { method: 'DELETE' });
    } catch (_) {}
    setProducts(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
    setPanel(null);
  }

  function toggleProdInPkg(id) {
    setPkgForm(f => {
      const included = f.productIds.includes(id);
      const newIds = included ? f.productIds.filter(x => x !== id) : [...f.productIds, id];
      const newQty = { ...f.quantities };
      if (included) delete newQty[id]; else newQty[id] = 1;
      return { ...f, productIds: newIds, quantities: newQty };
    });
  }

  function setPkgQty(id, qty) {
    setPkgForm(f => ({ ...f, quantities: { ...f.quantities, [id]: Math.max(1, parseInt(qty) || 1) } }));
  }

  function savePkg() {
    if (!pkgForm.name || !pkgForm.price) return;
    const entry = { ...pkgForm, price: parseFloat(pkgForm.price) || 0 };
    if (pkgPanel.type === "add") {
      setPackages(prev => [...prev, { ...entry, id: `PKG${String(prev.length + 1).padStart(3, "0")}` }]);
    } else {
      setPackages(prev => prev.map(p => p.id === pkgPanel.data.id ? { ...p, ...entry } : p));
    }
    setPkgPanel(null);
  }

  return (
    <div className="dash-inner-wide">
      <div className="row-between mb20" style={{ alignItems: "flex-start" }}>
        <div className="page-title" style={{ marginBottom: 0 }}>Products</div>
        <button className="btn btn-primary" onClick={() => {
          if (prodTab === "Products") openAddProduct();
          else { setPkgForm(emptyPkg); setPkgPanel({ type: "add" }); }
        }}>
          <i className="fa fa-plus" style={{ fontSize: 12 }} /> {prodTab === "Products" ? "Add Product" : "Add Package"}
        </button>
      </div>

      <div className="toggle-group" style={{ marginBottom: 20 }}>
        {["Products", "Packages"].map(t => (
          <button key={t} className={`toggle-btn ${prodTab === t ? "active" : ""}`} onClick={() => setProdTab(t)}>{t}</button>
        ))}
      </div>

      {prodTab === "Products" && (
        products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><i className="fa fa-box-open" /></div>
            <h3>No products yet</h3>
            <p>Click "Add Product" to create your first product.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, alignItems: "stretch" }}>
            {products.map(p => (
              <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, height: "100%" }}>
                <div style={{ height: 130, borderRadius: 8, overflow: "hidden", background: "var(--bg-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {(p.images?.[0] || p.image)
                    ? <img src={p.images?.[0] || p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <i className="fa fa-coffee" style={{ fontSize: 36, color: "var(--text-15)" }} />}
                </div>
                <div className="row-between" style={{ flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <span className={`badge ${PRODUCT_STATUS_BADGE[p.status] || "badge-gray"}`} style={{ fontSize: 10, flexShrink: 0 }}>{p.status}</span>
                </div>
                <div className="text-xs text-muted" style={{ lineHeight: 1.5, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{p.description}</div>
                <div className="row-between" style={{ flexShrink: 0 }}>
                  <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: 16 }}>৳{p.price}</div>
                  <div className="text-xs text-muted">{p.qty && p.unit ? <span style={{ marginRight: 8 }}>{p.qty}{p.unit}</span> : null}Stock: {p.stock}</div>
                </div>
                <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-sm btn-primary" style={{ flex: 1, padding: "6px 10px", fontSize: 11 }} onClick={() => openEditProduct(p)}>
                    <i className="fa fa-pencil" style={{ fontSize: 10 }} /> Edit
                  </button>
                  <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(217,64,64,.3)" }} onClick={() => setConfirmDelete(p)}>
                    <i className="fa fa-trash" style={{ fontSize: 10 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {prodTab === "Packages" && (
        packages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><i className="fa fa-layer-group" /></div>
            <h3>No packages yet</h3>
            <p>Click "Add Package" to create your first bundle.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {packages.map(pkg => {
              const included = products.filter(p => pkg.productIds.includes(p.id));
              const mrp = included.reduce((s, p) => s + p.price, 0);
              const saving = mrp - pkg.price;
              return (
                <div key={pkg.id} className="card">
                  <div className="row-between mb10">
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{pkg.name}</div>
                    <span className={`badge ${PRODUCT_STATUS_BADGE[pkg.status] || "badge-gray"}`} style={{ fontSize: 10 }}>{pkg.status}</span>
                  </div>
                  <div className="text-xs text-muted mb10" style={{ lineHeight: 1.5 }}>{pkg.description}</div>
                  <div className="eyebrow mb8">Includes</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {included.map(p => {
                      const qty = pkg.quantities?.[p.id] || 1;
                      return (
                        <span key={p.id} style={{ background: "var(--bg-soft)", border: "1px solid var(--text-08)", padding: "3px 8px", borderRadius: 99, fontSize: 11 }}>
                          {p.name}{qty > 1 ? ` ×${qty}` : ""} <span className="text-muted">৳{p.price * qty}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="row-between">
                    <div>
                      <div style={{ color: "var(--orange)", fontWeight: 700, fontSize: 18 }}>৳{pkg.price}</div>
                      {saving > 0 && <div className="text-xs" style={{ color: "var(--green)", marginTop: 2 }}>Save ৳{saving} vs individual</div>}
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn-sm btn-primary" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => { setPkgForm({ ...pkg, price: String(pkg.price), quantities: { ...(pkg.quantities || {}) } }); setPkgPanel({ type: "edit", data: pkg }); }}>
                        <i className="fa fa-pencil" style={{ fontSize: 10 }} /> Edit
                      </button>
                      <button className="btn btn-sm btn-ghost" style={{ padding: "6px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(217,64,64,.3)" }} onClick={() => setPackages(prev => prev.filter(p => p.id !== pkg.id))}>
                        <i className="fa fa-trash" style={{ fontSize: 10 }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {panel && (
        <>
          <div className="panel-overlay" onClick={() => setPanel(null)} />
          <div className="slide-panel" style={{ width: 420 }}>
            <div className="panel-hd">
              <div style={{ fontWeight: 700, fontSize: 16 }}>{panel.type === "add" ? "Add New Product" : `Edit: ${panel.data.name}`}</div>
              <button className="icon-btn" onClick={() => setPanel(null)}><i className="fa fa-times" /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingBottom: 16 }}>
              <div className="eyebrow mb8">Product Images <span style={{ color: "var(--red)" }}>*</span></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                {(form.images || []).map((img, idx) => (
                  <div key={idx} style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
                    <img src={img} alt={`Image ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid var(--text-08)" }} />
                    {idx === 0 && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 9, textAlign: "center", padding: "2px 0", borderRadius: "0 0 8px 8px" }}>Main</span>}
                    <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "var(--red)", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {(form.images || []).length < 5 && (
                  <div
                    onClick={() => { activeImgIdx.current = (form.images || []).length; fileRef.current?.click(); }}
                    style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed var(--text-15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "var(--bg-soft)", flexShrink: 0, gap: 4 }}
                  >
                    <i className="fa fa-plus" style={{ fontSize: 16, color: "var(--text-35)" }} />
                    <span style={{ fontSize: 9, color: "var(--text-35)" }}>{(form.images || []).length === 0 ? "Required" : "Add more"}</span>
                  </div>
                )}
              </div>
              {(form.images || []).length === 0 && <div className="text-xs mb8" style={{ color: "var(--red)" }}>At least 1 image is required.</div>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
              <div className="input-group mt12">
                <label className="input-label">Product Name *</label>
                <input className="input" placeholder="Midnight Black" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input" rows={3} style={{ resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Price (৳) *</label>
                  <input className="input" type="number" min="0" placeholder="25" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Stock Quantity</label>
                  <input className="input" type="number" min="0" placeholder="100" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Quantity (grams)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" type="number" min="1" step="1" placeholder="e.g. 100" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} style={{ flex: 1 }} />
                  <select className="select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ width: 90 }}>
                    {["g", "kg", "ml", "L", "pcs", "sachets", "pack"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {PRODUCT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="divider mt4" />
              <div className="col-gap mt16">
                <button className="btn btn-primary btn-full" onClick={saveProduct} disabled={!form.name || !form.price || !(form.images?.length)}>
                  {panel.type === "add" ? "Add Product" : "Save Changes"}
                </button>
                {panel.type === "edit" && (
                  <button className="btn btn-full" style={{ background: "rgba(217,64,64,.08)", color: "var(--red)", border: "1px solid rgba(217,64,64,.25)" }} onClick={() => setConfirmDelete(panel.data)}>
                    <i className="fa fa-trash" style={{ fontSize: 12 }} /> Delete Product
                  </button>
                )}
                <button className="btn btn-ghost btn-full" onClick={() => setPanel(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      {pkgPanel && (
        <>
          <div className="panel-overlay" onClick={() => setPkgPanel(null)} />
          <div className="slide-panel" style={{ width: 420 }}>
            <div className="panel-hd">
              <div style={{ fontWeight: 700, fontSize: 16 }}>{pkgPanel.type === "add" ? "Create Package" : `Edit: ${pkgPanel.data.name}`}</div>
              <button className="icon-btn" onClick={() => setPkgPanel(null)}><i className="fa fa-times" /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingBottom: 16 }}>
              <div className="input-group">
                <label className="input-label">Package Name *</label>
                <input className="input" placeholder="Starter Bundle" value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea className="input" rows={2} style={{ resize: "vertical" }} value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="eyebrow mb10">Include Products</div>
              {products.length === 0 ? (
                <div className="text-sm text-muted mb16">No products available. Add products first.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
                  {products.map(p => {
                    const checked = pkgForm.productIds.includes(p.id);
                    const qty = pkgForm.quantities?.[p.id] || 1;
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(247,227,201,.1)" }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleProdInPkg(p.id)} style={{ accentColor: "var(--orange)", flexShrink: 0, width: 15, height: 15 }} />
                        <span style={{ flex: 1, fontSize: 13, color: "var(--cream)" }}>{p.name}</span>
                        {checked && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 11, color: "var(--cream-65)" }}>Qty</span>
                            <input
                              type="number" min="1" value={qty}
                              onChange={e => setPkgQty(p.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ width: 52, background: "rgba(247,227,201,.1)", border: "1px solid rgba(247,227,201,.2)", borderRadius: 6, padding: "4px 6px", color: "var(--cream)", fontSize: 13, textAlign: "center", outline: "none" }}
                            />
                          </div>
                        )}
                        <span style={{ fontSize: 11, color: "var(--cream-65)", flexShrink: 0 }}>৳{p.price}{checked && qty > 1 ? ` ×${qty}` : ""}</span>
                        <span className={`badge ${PRODUCT_STATUS_BADGE[p.status] || "badge-gray"}`} style={{ fontSize: 9, flexShrink: 0 }}>{p.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {pkgForm.productIds.length > 0 && (
                <div style={{ background: "rgba(255,145,0,.12)", border: "1px solid rgba(255,145,0,.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--cream-65)", marginBottom: 4 }}>Individual total (MRP):</div>
                  <div style={{ fontWeight: 700, color: "var(--orange)", fontSize: 15 }}>৳{products.filter(p => pkgForm.productIds.includes(p.id)).reduce((s, p) => s + p.price * (pkgForm.quantities?.[p.id] || 1), 0)}</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Bundle Price (৳) *</label>
                  <input className="input" type="number" min="0" value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select className="select" value={pkgForm.status} onChange={e => setPkgForm(f => ({ ...f, status: e.target.value }))}>
                    {PRODUCT_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="divider mt4" />
              <div className="col-gap mt16">
                <button className="btn btn-primary btn-full" onClick={savePkg} disabled={!pkgForm.name || !pkgForm.price}>
                  {pkgPanel.type === "add" ? "Create Package" : "Save Package"}
                </button>
                {pkgPanel.type === "edit" && (
                  <button className="btn btn-full" style={{ background: "rgba(217,64,64,.08)", color: "var(--red)", border: "1px solid rgba(217,64,64,.25)" }} onClick={() => { setPackages(prev => prev.filter(p => p.id !== pkgPanel.data.id)); setPkgPanel(null); }}>
                    <i className="fa fa-trash" style={{ fontSize: 12 }} /> Delete Package
                  </button>
                )}
                <button className="btn btn-ghost btn-full" onClick={() => setPkgPanel(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <Sheet
          title={`Delete "${confirmDelete.name}"?`}
          body="This product will be permanently removed. Packages containing it will lose this item."
          confirmLabel="Delete"
          onConfirm={() => deleteProduct(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────
function Sidebar({ section, setSection, onLogout }) {
  const { user, stats } = useContext(DashCtx);
  const activeOrders = stats?.orders?.active || 0;

  const links = [
    { id: "overview",   icon: "fa-chart-pie",      label: "Overview" },
    { id: "orders",     icon: "fa-box",             label: "Orders", badge: activeOrders > 0 ? String(activeOrders) : null },
    { id: "products",   icon: "fa-box-open",        label: "Products" },
    { id: "customers",  icon: "fa-users",           label: "Customers" },
    { id: "subs",       icon: "fa-calendar-check",  label: "Subscriptions" },
    { id: "coupons",    icon: "fa-ticket-alt",      label: "Coupons" },
    { id: "crew",       icon: "fa-fire",            label: "Crew" },
    { id: "influencer", icon: "fa-bolt",            label: "Influencers" },
    { id: "points",     icon: "fa-star",            label: "Points &amp; Redemptions" },
    { id: "financials", icon: "fa-chart-line",      label: "Financials" },
    { id: "settings",   icon: "fa-cog",             label: "Settings" },
  ];

  const initial = (user?.name || 'A')[0].toUpperCase();

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
        <div className="sidebar-user" style={{ marginBottom: 10 }}>
          <div className="sidebar-avatar" style={{ background: "rgba(229,92,92,.2)", color: "var(--red)" }}>{initial}</div>
          <div><div className="sidebar-user-name">{user?.name || 'Admin'}</div><div className="sidebar-user-role">Midnight Pick</div></div>
        </div>
        <button className="sidebar-link" style={{ width: "100%", borderLeft: "3px solid transparent", color: "var(--cream-65)" }} onClick={onLogout}>
          <i className="fa fa-sign-out-alt s-icon" /><span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────
function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ctxData, setCtxData] = useState({ user: null, orders: [], customers: [], stats: null });
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminInfluencers, setAdminInfluencers] = useState([]);

  useEffect(() => {
    window.mpApi.guard(["admin"]);
    const stored = localStorage.getItem('mp_user');
    const user = stored ? JSON.parse(stored) : null;

    Promise.all([
      window.mpApi.fetch('/admin/stats').catch(() => null),
      window.mpApi.fetch('/admin/orders?limit=50').catch(() => null),
      window.mpApi.fetch('/admin/customers?limit=50').catch(() => null),
      window.mpApi.fetch('/admin/influencers').catch(() => null),
      window.mpApi.fetch('/admin/products').catch(() => null),
    ]).then(([statsRes, ordersRes, customersRes, infRes, prodsRes]) => {
      setCtxData({
        user,
        stats:     statsRes?.data || null,
        orders:    ordersRes?.data?.orders || [],
        customers: customersRes?.data?.customers || [],
      });
      setAdminInfluencers(infRes?.data?.influencers || []);
      setAdminProducts(prodsRes?.data?.products || []);
      setLoading(false);
    });
  }, []);

  function render() {
    switch (section) {
      case "overview":   return <Overview setSection={setSection} />;
      case "orders":     return <Orders />;
      case "products":   return <Products />;
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

  if (loading) return <LoadingScreen />;

  return (
    <DashCtx.Provider value={{...ctxData, adminProducts, setAdminProducts, adminInfluencers, setAdminInfluencers}}>
      <div className="dash-layout">
        <Sidebar section={section} setSection={setSection} onLogout={() => setLogoutOpen(true)} />
        <div className="dash-main">
          <main className="dash-content">
            {render()}
          </main>
        </div>
      </div>
      {logoutOpen && (
        <Sheet
          title="Log out?"
          body="You'll be signed out of the admin dashboard."
          confirmLabel="Log Out"
          onConfirm={() => { window.mpApi.signOut(); }}
          onClose={() => setLogoutOpen(false)}
        />
      )}
    </DashCtx.Provider>
  );
}

// ── Influencers (defined after AdminDashboard to avoid forward-ref issues in Babel) ──
function InfluencersSection() {
  const { adminInfluencers: influencers, setAdminInfluencers: setInfluencers } = useContext(DashCtx);

  useEffect(() => {
    if (influencers.length > 0) return;
    window.mpApi.fetch('/admin/influencers').then(res => {
      if (res?.data?.influencers?.length) setInfluencers(res.data.influencers);
    }).catch(() => {});
  }, []);

  const [createPanel, setCreatePanel] = useState(false);
  const [viewPanel, setViewPanel] = useState(null);
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);
  const emptyInf = { name: "", email: "", phone: "", code: "", commRate: "15", notes: "" };
  const [form, setForm] = useState(emptyInf);

  async function submitCreate() {
    if (!form.name || !form.email || !form.code) return;
    setSaving(true);
    try {
      const res = await window.mpApi.fetch('/admin/influencers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone || undefined,
          code: form.code.toUpperCase(), comm_rate: parseFloat(form.commRate) || 15,
          notes: form.notes || undefined,
        }),
      });
      const entry = res.data;
      setInfluencers(prev => [entry, ...prev]);
      setCreated(entry);
    } catch (e) {
      alert(e?.message || 'Failed to save influencer.');
    } finally {
      setSaving(false);
    }
    setCreatePanel(false);
    setForm(emptyInf);
  }

  async function markPaid(id) {
    try {
      await window.mpApi.fetch(`/admin/influencers/${id}/paid`, { method: 'PATCH' });
      setInfluencers(prev => prev.map(c => c.id === id ? { ...c, total_owed: 0 } : c));
    } catch (_) {}
  }

  return (
    <div className="dash-inner-wide">
      <div className="row-between mb20" style={{ alignItems: "flex-start" }}>
        <div className="page-title" style={{ marginBottom: 0 }}>Influencers</div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyInf); setCreatePanel(true); }}>
          <i className="fa fa-plus" style={{ fontSize: 12 }} /> Add Influencer
        </button>
      </div>

      {created && (
        <SectionCard style={{ background: "var(--green-soft)", borderColor: "rgba(46,168,107,.3)", marginBottom: 16 }}>
          <div className="row" style={{ gap: 10 }}>
            <i className="fa fa-check-circle" style={{ color: "var(--green)", fontSize: 18 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Influencer account created for {created.name}</div>
              <div className="text-xs text-muted mt4">
                Code: <span className="mono" style={{ color: "var(--blue)" }}>{created.code}</span> · Saved to database. A coupon with this code has been created automatically.
              </div>
            </div>
            <button className="icon-btn ml-auto" style={{ marginLeft: "auto" }} onClick={() => setCreated(null)}><i className="fa fa-times" /></button>
          </div>
        </SectionCard>
      )}

      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Code</th><th>Commission Rate</th><th>Orders (Mo)</th><th>Commission (Mo)</th><th>Total Owed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {influencers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No influencers yet. Click "Add Influencer" to get started.</td></tr>
              ) : influencers.map((c, i) => (
                <tr key={c.id || i}>
                  <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => setViewPanel(c)}>{c.name}</td>
                  <td className="mono" style={{ color: "var(--blue)" }}>{c.code}</td>
                  <td className="muted">{c.comm_rate || 15}%</td>
                  <td>{c.orders_mo || 0}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{c.comm_mo || 0}</td>
                  <td style={{ color: (c.total_owed || 0) > 0 ? "var(--orange)" : "var(--green)", fontWeight: 700 }}>
                    {(c.total_owed || 0) > 0 ? `৳${c.total_owed}` : "৳0 — Paid"}
                  </td>
                  <td>
                    <div className="cell-action">
                      {(c.total_owed || 0) > 0 && (
                        <button className="btn btn-sm btn-primary" style={{ padding: "6px 12px", fontSize: 11 }} onClick={() => markPaid(c.id)}>Mark Paid</button>
                      )}
                      {!(c.total_owed || 0) && <span className="badge badge-green">Paid</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {createPanel && (
        <>
          <div className="panel-overlay" onClick={() => setCreatePanel(false)} />
          <div className="slide-panel" style={{ width: 440 }}>
            <div className="panel-hd">
              <div style={{ fontWeight: 700, fontSize: 16 }}>Add Influencer</div>
              <button className="icon-btn" onClick={() => setCreatePanel(false)}><i className="fa fa-times" /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingBottom: 16 }}>
              <div style={{ background: "rgba(255,145,0,.1)", border: "1px solid rgba(255,145,0,.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--orange)" }}>
                  <i className="fa fa-info-circle" style={{ marginRight: 6 }} />
                  The influencer will be saved to the database. Their promo code is automatically registered as a coupon.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Full Name *</label>
                  <input className="input" placeholder="e.g. Sadia Islam" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Email Address *</label>
                  <input className="input" type="email" placeholder="influencer@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone</label>
                  <input className="input" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Commission Rate (%)</label>
                  <input className="input" type="number" min="1" max="50" placeholder="15" value={form.commRate} onChange={e => setForm(f => ({ ...f, commRate: e.target.value }))} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Promo Code *</label>
                  <input className="input" placeholder="e.g. SADIA20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} style={{ fontFamily: "monospace", letterSpacing: "0.1em" }} />
                  <div className="input-note">Customers use this code. Ensure it's unique.</div>
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Notes (internal)</label>
                  <textarea className="input" rows={2} style={{ resize: "vertical" }} placeholder="Platform, audience size, niche..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="divider mt4" />
              <div className="col-gap mt16">
                <button className="btn btn-primary btn-full" onClick={submitCreate} disabled={saving || !form.name || !form.email || !form.code}>
                  <i className="fa fa-user-plus" style={{ fontSize: 12 }} /> Create Account
                </button>
                <button className="btn btn-ghost btn-full" onClick={() => setCreatePanel(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      {viewPanel && (
        <>
          <div className="panel-overlay" onClick={() => setViewPanel(null)} />
          <div className="slide-panel">
            <div className="panel-hd">
              <div style={{ fontWeight: 700, fontSize: 16 }}>{viewPanel.name}</div>
              <button className="icon-btn" onClick={() => setViewPanel(null)}><i className="fa fa-times" /></button>
            </div>
            <div className="eyebrow mb10">Account Details</div>
            {viewPanel.email && <div className="row-between mb8 text-sm"><span className="text-muted">Email</span><span>{viewPanel.email}</span></div>}
            {viewPanel.phone && <div className="row-between mb8 text-sm"><span className="text-muted">Phone</span><span>{viewPanel.phone}</span></div>}
            <div className="row-between mb8 text-sm"><span className="text-muted">Code</span><span className="mono" style={{ color: "var(--blue)" }}>{viewPanel.code}</span></div>
            <div className="row-between mb8 text-sm"><span className="text-muted">Commission Rate</span><span>{viewPanel.commRate || 15}%</span></div>
            <div className="divider" />
            <div className="eyebrow mb10 mt16">This Month</div>
            <div className="row-between mb8 text-sm"><span className="text-muted">Orders</span><span>{viewPanel.ordersMo}</span></div>
            <div className="row-between mb8 text-sm"><span className="text-muted">Commission Earned</span><span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{viewPanel.commMo}</span></div>
            <div className="row-between mb16 text-sm"><span className="text-muted">Total Owed</span><span style={{ color: viewPanel.totalOwed > 0 ? "var(--orange)" : "var(--green)", fontWeight: 700 }}>{viewPanel.totalOwed > 0 ? `৳${viewPanel.totalOwed}` : "All paid"}</span></div>
            {viewPanel.totalOwed > 0 && (
              <button className="btn btn-primary btn-full" onClick={() => { markPaid(viewPanel.code); setViewPanel(p => ({ ...p, totalOwed: 0 })); }}>Mark Commission as Paid</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminDashboard />);
