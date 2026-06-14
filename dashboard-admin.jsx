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
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [newOrderPanel, setNewOrderPanel] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer: "", phone: "", address: "", orderItems: [], total: "", payment: "bKash", coupon: "", notes: "", status: "processing" });
  const [couponPreview, setCouponPreview] = useState(null); // { ok, message }
  const [otpInput, setOtpInput] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpStatus, setOtpStatus] = useState(null);
  const [otpModal, setOtpModal] = useState(null); // { phone, otp } for OTP verification during creation
  const [otpModalInput, setOtpModalInput] = useState("");
  const [otpModalVerifying, setOtpModalVerifying] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null); // Store form data until OTP verified

  useEffect(() => { setOrders(ctxOrders || []); }, [ctxOrders]);

  async function previewCoupon() {
    const code = newOrder.coupon.trim();
    if (!code) { setCouponPreview(null); return; }
    const subtotal = newOrder.orderItems.reduce((s, it) => s + it.unit_price * (parseInt(it.qty) || 1), 0);
    setCouponPreview({ ok: null, message: "Checking…" });
    const params = new URLSearchParams({ code, subtotal: String(subtotal) });
    if (newOrder.phone) params.set('phone', newOrder.phone);
    const res = await window.mpApi.fetch(`/admin/coupons/validate?${params}`).catch(() => null);
    if (res?.ok) {
      setCouponPreview({ ok: true, message: `Valid — saves ৳${res.data.discount} on a ৳${subtotal.toFixed(0)} subtotal.` });
    } else {
      setCouponPreview({ ok: false, message: res?.error?.message || 'Could not check this coupon.' });
    }
  }

  async function updateStatus(newStatus) {
    if (!panel) return;
    // Only reflect the change after the server confirms it — a failed PATCH
    // must not show a status the database doesn't have.
    try {
      const res = await window.mpApi.fetch(`/admin/orders/${panel.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res?.ok) {
        alert(res?.error?.message || 'Could not update the order status.');
        return;
      }
      const updated = { ...panel, status: newStatus, ...(res.data?.points_earned != null ? { points_earned: res.data.points_earned } : {}) };
      setOrders(prev => prev.map(o => o.id === panel.id ? updated : o));
      setPanel(updated);
    } catch (e) {
      alert(e?.message || 'Could not update the order status.');
    }
  }

  async function handoffToSteadfast() {
    if (!panel) return;
    try {
      const res = await window.mpApi.fetch(`/admin/orders/${panel.id}/handoff-to-steadfast`, {
        method: 'POST',
      });
      if (!res?.ok) {
        alert(res?.error?.message || 'Handoff failed. Check order details and try again.');
        return;
      }
      const updated = { ...panel, status: res.data?.status, steadfast_consignment_id: res.data?.steadfast_consignment_id };
      setOrders(prev => prev.map(o => o.id === panel.id ? updated : o));
      setPanel(updated);
      alert('Order handed off to Steadfast successfully!');
    } catch (e) {
      alert(e?.message || 'Failed to handoff order.');
    }
  }

  async function refreshSteadfastStatus() {
    if (!panel || !panel.steadfast_consignment_id) {
      alert('No Steadfast tracking ID for this order.');
      return;
    }
    try {
      const res = await window.mpApi.fetch(`/admin/orders/${panel.id}/steadfast-status`, {
        method: 'GET',
      });
      if (!res?.ok) {
        alert(res?.error?.message || 'Failed to refresh status.');
        return;
      }
      const updated = { ...panel, status: res.data?.status };
      setOrders(prev => prev.map(o => o.id === panel.id ? updated : o));
      setPanel(updated);
      alert('Status refreshed!');
    } catch (e) {
      alert(e?.message || 'Failed to refresh status.');
    }
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
    if (!newOrder.phone) {
      Swal.fire({
        title: 'Phone Required',
        text: 'Phone number is required for OTP verification.',
        icon: 'warning',
        confirmButtonColor: '#FF9100',
        background: '#fff',
      });
      return;
    }

    const subtotal = newOrder.orderItems.reduce((s, it) => s + it.unit_price * (parseInt(it.qty) || 1), 0);
    const total    = newOrder.total ? parseFloat(newOrder.total) : subtotal;
    const discount = Math.max(0, Math.round(subtotal - total));

    try {
      setOtpModalVerifying(true);

      // Step 1: Send OTP to customer phone (order not created yet)
      const otpRes = await window.mpApi.fetch('/admin/send-order-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: newOrder.phone,
          customer_name: newOrder.customer,
        }),
      });

      if (!otpRes?.ok) {
        const errorMsg = otpRes?.error?.message || 'Failed to send OTP.';
        Swal.fire({
          title: 'OTP Send Failed',
          text: `Could not send OTP: ${errorMsg}`,
          icon: 'error',
          confirmButtonColor: '#FF9100',
          background: '#fff',
        });
        return;
      }

      // Step 2: Store order data and show OTP modal
      const orderData = {
        customer_name:   newOrder.customer,
        customer_phone:  newOrder.phone,
        address:         newOrder.address || undefined,
        items:           newOrder.orderItems.map(it => ({ id: it.id, name: it.name, qty: parseInt(it.qty) || 1, unit_price: it.unit_price })),
        payment_type:    newOrder.payment,
        coupon_code:     newOrder.coupon || undefined,
        discount_amount: discount,
        status:          newOrder.status,
        notes:           newOrder.notes || undefined,
      };

      setPendingOrder(orderData);
      setOtpModal({ phone: newOrder.phone });
      setOtpModalInput("");
    } catch (e) {
      Swal.fire({
        title: 'Error',
        text: e?.message || 'Failed to send OTP.',
        icon: 'error',
        confirmButtonColor: '#FF9100',
        background: '#fff',
      });
    } finally {
      setOtpModalVerifying(false);
    }
  }

  async function verifyOtpModal() {
    if (!otpModal || !otpModalInput.trim()) {
      Swal.fire({
        title: 'OTP Required',
        text: 'Please enter the OTP code.',
        icon: 'warning',
        confirmButtonColor: '#FF9100',
        background: '#fff',
      });
      return;
    }
    if (!pendingOrder) {
      Swal.fire({
        title: 'Error',
        text: 'Order data lost. Please try again.',
        icon: 'error',
        confirmButtonColor: '#FF9100',
        background: '#fff',
      });
      return;
    }

    setOtpModalVerifying(true);
    try {
      // Step 1: Verify OTP
      const verifyRes = await window.mpApi.fetch('/admin/verify-order-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: otpModal.phone,
          otp: otpModalInput
        }),
      });
      if (!verifyRes?.ok) {
        Swal.fire({
          title: 'Invalid OTP',
          text: verifyRes?.error?.message || 'The OTP code is invalid.',
          icon: 'error',
          confirmButtonColor: '#FF9100',
          background: '#fff',
        });
        return;
      }

      // Step 2: OTP verified - NOW create the actual order
      const createRes = await window.mpApi.fetch('/admin/orders', {
        method: 'POST',
        body: JSON.stringify(pendingOrder),
      });

      if (!createRes?.ok) {
        Swal.fire({
          title: 'Order Creation Failed',
          text: createRes?.error?.message || 'Failed to create order after verification.',
          icon: 'error',
          confirmButtonColor: '#FF9100',
          background: '#fff',
        });
        return;
      }

      // Step 3: Order created successfully
      const createdOrder = createRes.data;

      // Send confirmation SMS
      await window.mpApi.fetch(`/admin/orders/${createdOrder.id}/send-confirmation-sms`, {
        method: 'POST',
      }).catch(() => {
        console.log('Confirmation SMS may have failed');
      });

      Swal.fire({
        title: 'Success!',
        text: '✓ Order confirmed and created successfully!',
        icon: 'success',
        confirmButtonColor: '#FF9100',
        background: '#fff',
        timer: 2000,
      });

      // Close modal and form
      setOtpModal(null);
      setOtpModalInput("");
      setPendingOrder(null);
      setNewOrderPanel(false);
      setNewOrder({ customer: "", phone: "", address: "", orderItems: [], total: "", payment: "bKash", coupon: "", notes: "", status: "processing" });
      setCouponPreview(null);

      // Refresh orders list
      const ordersRes = await window.mpApi.fetch('/admin/orders?limit=20');
      if (ordersRes?.ok) {
        setOrders(ordersRes.data.orders || []);
      }
    } catch (e) {
      Swal.fire({
        title: 'Error',
        text: e?.message || 'Failed to verify OTP.',
        icon: 'error',
        confirmButtonColor: '#FF9100',
        background: '#fff',
      });
    } finally {
      setOtpModalVerifying(false);
    }
  }

  async function cancelOtpModal() {
    setOtpModal(null);
    setOtpModalInput("");
    setPendingOrder(null);
  }

  const filtered = orders.filter(o => {
    if (filter.status !== "All" && o.status !== filter.status) return false;
    if (filter.coupon === "With Coupon" && !o.coupon_code) return false;
    if (filter.coupon === "No Coupon" && o.coupon_code) return false;
    const q = filter.search.toLowerCase();
    if (q && !(o.customer_name || '').toLowerCase().includes(q) && !(o.customer_phone || '').includes(filter.search)) return false;
    return true;
  });

  async function openPanel(o) {
    setPanel(o);
    setOtpInput("");
    setOtpStatus(null);
    // Load OTP status if order exists
    if (o.id) {
      const res = await window.mpApi.fetch(`/admin/orders/${o.id}/otp-status`).catch(() => null);
      if (res?.ok && res.data) {
        setOtpStatus(res.data);
      }
    }
  }

  async function sendOtp() {
    if (!panel || !panel.id || !panel.customer_phone) {
      alert("Cannot send OTP: no phone number on this order.");
      return;
    }
    setOtpSending(true);
    try {
      const res = await window.mpApi.fetch(`/admin/orders/${panel.id}/send-otp`, {
        method: 'POST',
      });
      if (!res?.ok) {
        alert(res?.error?.message || 'Failed to send OTP.');
        return;
      }
      setOtpStatus({ has_otp: true, otp_sent_at: new Date().toISOString(), otp_verified: false, otp_attempts: 0 });
      setOtpInput("");
      alert(`OTP sent to ${panel.customer_phone}`);
    } catch (e) {
      alert(e?.message || 'Failed to send OTP.');
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtp() {
    if (!panel || !panel.id) return;
    if (!otpInput || otpInput.trim().length === 0) {
      alert("Please enter the OTP.");
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await window.mpApi.fetch(`/admin/orders/${panel.id}/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ otp: otpInput }),
      });
      if (!res?.ok) {
        alert(res?.error?.message || 'Failed to verify OTP.');
        return;
      }
      const verified = res.data;
      setPanel(f => ({ ...f, status: verified.order.status }));
      setOrders(prev => prev.map(o => o.id === panel.id ? { ...o, status: verified.order.status } : o));
      setOtpStatus({ has_otp: true, otp_verified_at: new Date().toISOString(), otp_verified: true });
      setOtpInput("");
      alert("Order confirmed!");
    } catch (e) {
      alert(e?.message || 'Failed to verify OTP.');
    } finally {
      setOtpVerifying(false);
    }
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
          <div className="panel-overlay" onClick={() => setPanel(null)} />
          <div className="slide-panel">
            <div className="panel-hd">
              <div>
                <div className="mono text-xs" style={{ color: "var(--blue)", marginBottom: 4 }}>{panel.order_ref}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{panel.customer_name}</div>
              </div>
              <button className="icon-btn" onClick={() => setPanel(null)}><i className="fa fa-times" /></button>
            </div>

            <>
                <div className="eyebrow mb10">Order Details</div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Items</span><span style={{ maxWidth: 200, textAlign: "right" }}>{orderSummary(panel.items)}</span></div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Total</span><span style={{ color: "var(--orange)", fontWeight: 700 }}>৳{panel.total}</span></div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Phone</span><span>{panel.customer_phone || '—'}</span></div>
                <div className="row-between mb8 text-sm"><span className="text-muted">Payment</span><span>{panel.payment_type || '—'}</span></div>
                {panel.coupon_code && <div className="row-between mb8 text-sm"><span className="text-muted">Coupon</span><span className="mono" style={{ color: "var(--blue)" }}>{panel.coupon_code}</span></div>}
                <div className="row-between mb8 text-sm"><span className="text-muted">Date</span><span>{fmtDate(panel.created_at)}</span></div>
                <div className="row-between mb16 text-sm"><span className="text-muted">Status</span><StatusBadge status={panel.status} /></div>
                {panel.steadfast_consignment_id && <div className="row-between mb8 text-sm"><span className="text-muted">Steadfast ID</span><span className="mono text-xs" style={{ color: "var(--orange)" }}>{panel.steadfast_consignment_id}</span></div>}
                <div className="divider" />

                {panel.customer_phone && !otpStatus?.otp_verified && (
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <div className="eyebrow mb10">Phone Verification</div>
                    {otpStatus?.has_otp ? (
                      <>
                        <div style={{ fontSize: 13, color: "var(--text-65)", marginBottom: 12 }}>
                          OTP sent to <strong>{panel.customer_phone}</strong> at {otpStatus.otp_sent_at ? new Date(otpStatus.otp_sent_at).toLocaleTimeString() : 'unknown time'}.
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                          <input type="text" className="input" placeholder="Enter 4-digit OTP" value={otpInput} onChange={e => setOtpInput(e.target.value)} maxLength="4" style={{ flex: 1 }} />
                          <button className="btn btn-primary btn-sm" onClick={verifyOtp} disabled={otpVerifying || !otpInput}>
                            {otpVerifying ? "Verifying..." : "Verify"}
                          </button>
                        </div>
                        <button className="btn btn-ghost btn-sm btn-full" onClick={sendOtp} disabled={otpSending} style={{ fontSize: 11 }}>
                          {otpSending ? "Sending..." : "Resend OTP"}
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-primary btn-sm btn-full" onClick={sendOtp} disabled={otpSending}>
                        <i className="fa fa-sms" style={{ marginRight: 6, fontSize: 11 }} />
                        {otpSending ? "Sending OTP..." : "Send OTP to Customer"}
                      </button>
                    )}
                  </div>
                )}

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
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handoffToSteadfast()}>
                            <i className="fa fa-truck" style={{ fontSize: 11 }} /> Handoff to Steadfast
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => updateStatus("delivered")}>
                            <i className="fa fa-person-walking" style={{ fontSize: 11 }} /> Personally Delivered
                          </button>
                        </>
                      )}
                      {panel.status === "shipped" && (
                        <>
                          <div style={{ fontSize: 12, color: "var(--blue)", padding: "8px 12px", background: "rgba(100,181,246,0.1)", border: "1px solid rgba(100,181,246,0.2)", borderRadius: 8 }}>
                            <i className="fa fa-info-circle" style={{ marginRight: 6 }} />Tracking status will auto-update via Steadfast webhooks.
                          </div>
                          {panel.steadfast_consignment_id && (
                            <button className="btn btn-ghost btn-sm" onClick={() => refreshSteadfastStatus()}>
                              <i className="fa fa-refresh" style={{ fontSize: 11 }} /> Refresh Steadfast Status
                            </button>
                          )}
                          <button className="btn btn-primary btn-sm" onClick={() => updateStatus("delivered")}>
                            <i className="fa fa-check-circle" style={{ fontSize: 11 }} /> Mark as Delivered
                          </button>
                        </>
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

      {otpModal && (
        <Sheet
          title={`Verify Phone Number`}
          body={
            <div>
              <div style={{ fontSize: 14, marginBottom: 16, color: "var(--text-65)" }}>
                Enter the 4-digit code sent to <strong style={{ color: "var(--text)" }}>{otpModal.phone}</strong>
              </div>
              <input
                type="text"
                className="input"
                placeholder="0000"
                value={otpModalInput}
                onChange={e => setOtpModalInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength="4"
                style={{ fontSize: 18, letterSpacing: 8, textAlign: "center", fontWeight: 700 }}
                disabled={otpModalVerifying}
                autoFocus
              />
            </div>
          }
          confirmLabel={otpModalVerifying ? "Verifying..." : "Confirm Order"}
          onConfirm={verifyOtpModal}
          onClose={cancelOtpModal}
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
                          <span style={{ flex: 1, fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{it.name}</span>
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
                  <input className="input" placeholder="Optional" value={newOrder.coupon}
                    onChange={e => { setNewOrder(f => ({ ...f, coupon: e.target.value.toUpperCase() })); setCouponPreview(null); }}
                    onBlur={previewCoupon} />
                  {couponPreview && (
                    <div style={{ fontSize: 11, marginTop: 4, color: couponPreview.ok === false ? "var(--red)" : couponPreview.ok ? "var(--green, #2e9e5b)" : "var(--text-65)" }}>
                      {couponPreview.message}
                    </div>
                  )}
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
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    setLoading(true);
    window.mpApi.fetch('/admin/customers?limit=500').then(res => {
      if (res?.ok) setCustomers(res.data.customers || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  function exportCsv() {
    const header = 'Name,Phone,Orders,Total Spent (BDT),Last Address,First Order,Last Order';
    const rows = customers.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.phone || '',
      c.order_count || 0,
      Number(c.total_spent || 0).toFixed(0),
      `"${(c.last_address || '').replace(/"/g, '""')}"`,
      c.first_seen ? new Date(c.first_seen).toLocaleDateString('en-GB') : '',
      c.last_seen  ? new Date(c.last_seen).toLocaleDateString('en-GB')  : '',
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (selected) {
    const c = selected;
    return (
      <div className="dash-inner-wide">
        <button className="btn btn-ghost btn-sm mb16" onClick={() => setSelected(null)}>
          <i className="fa fa-arrow-left" style={{ fontSize: 12 }} /> Back to Customers
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{c.name || '—'}</div>
        <div className="text-muted text-sm mb16">{c.phone || '—'}</div>
        <div className="stat-row mb16">
          <div className="stat-card"><div className="stat-label">Orders</div><div className="stat-value">{c.order_count || 0}</div></div>
          <div className="stat-card"><div className="stat-label">Total Spent</div><div className="stat-value">৳{Number(c.total_spent || 0).toLocaleString()}</div></div>
        </div>
        <SectionCard>
          <div className="row-between mb8 text-sm"><span className="text-muted">Phone</span><span>{c.phone || '—'}</span></div>
          <div className="row-between mb8 text-sm"><span className="text-muted">Last Address</span><span style={{ textAlign: "right", maxWidth: 220 }}>{c.last_address || '—'}</span></div>
          <div className="row-between mb8 text-sm"><span className="text-muted">First Order</span><span>{fmtDate(c.first_seen)}</span></div>
          <div className="row-between text-sm"><span className="text-muted">Last Order</span><span>{fmtDate(c.last_seen)}</span></div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="dash-inner-wide">
      <div className="row-between mb16">
        <div className="page-title" style={{ marginBottom: 0 }}>Customers</div>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={customers.length === 0}>
          <i className="fa fa-download" style={{ fontSize: 12 }} /> Export CSV
        </button>
      </div>
      <input className="input mb16" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Last Address</th><th>Last Order</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-65)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No customers found.</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={i} style={{ cursor: "pointer" }} onClick={() => setSelected(c)}>
                  <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                  <td className="muted mono">{c.phone || '—'}</td>
                  <td>{c.order_count || 0}</td>
                  <td style={{ color: "var(--orange)", fontWeight: 600 }}>৳{Number(c.total_spent || 0).toLocaleString()}</td>
                  <td className="muted" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_address || '—'}</td>
                  <td className="muted">{fmtDate(c.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <div className="text-muted text-sm mt8" style={{ textAlign: "right" }}>
        {filtered.length} of {customers.length} customers
      </div>
    </div>
  );
}

// ── Section: Subscriptions ─────────────────────────────
function Subscriptions() {
  const STATUS_TABS = ["active", "paused", "cancelled"];
  const [subTab, setSubTab]   = useState("active");
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.mpApi.fetch(`/admin/subscriptions?status=${subTab}`)
      .then(res => setSubs(res?.data?.subscriptions || []))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, [subTab]);

  const sfx    = n => ['st','nd','rd'][n - 1] || 'th';
  const fmtDt  = iso => iso ? new Date(iso).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const fmtAmt = v  => `৳${Number(v).toLocaleString()}`;

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Subscriptions</div>

      <div className="toggle-group mb16">
        {STATUS_TABS.map(t => (
          <button key={t} className={`toggle-btn ${subTab === t ? "active" : ""}`} onClick={() => setSubTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(87,31,41,.4)" }}>
          <i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} />
        </div>
      ) : subs.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <div className="empty-icon"><i className="fa fa-calendar-check" /></div>
          <h3>No {subTab} subscriptions</h3>
          <p>There are no {subTab} subscriptions right now.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subs.map(s => (
            <div key={s.id} className="card" style={{ padding: "14px 16px" }}>
              <div className="row-between mb8">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.user_name}</div>
                  <div className="text-muted text-xs">{s.user_phone || s.user_email}</div>
                </div>
                <span className={`badge ${s.status === "active" ? "badge-green" : s.status === "paused" ? "badge-gray" : "badge-red"}`}>
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </span>
              </div>

              <div className="row-between text-sm mb4">
                <span className="text-muted">Product</span>
                <span style={{ fontWeight: 600 }}>{s.product_name} × {s.qty}</span>
              </div>
              <div className="row-between text-sm mb4">
                <span className="text-muted">Monthly</span>
                <span style={{ fontWeight: 600, color: "var(--orange)" }}>{fmtAmt(s.qty * s.unit_price)}</span>
              </div>
              <div className="row-between text-sm mb4">
                <span className="text-muted">Delivery day</span>
                <span>{s.billing_day}{sfx(s.billing_day)} of each month</span>
              </div>
              <div className="row-between text-sm mb4">
                <span className="text-muted">Next delivery</span>
                <span>{fmtDt(s.next_delivery_date)}</span>
              </div>
              {s.status === "paused" && s.pause_until && (
                <div className="row-between text-sm mb4">
                  <span className="text-muted">Resumes</span>
                  <span style={{ color: "var(--orange)" }}>{fmtDt(s.pause_until)}</span>
                </div>
              )}
              <div className="row-between text-sm">
                <span className="text-muted">Address</span>
                <span style={{ maxWidth: "55%", textAlign: "right", wordBreak: "break-word" }}>{s.address}</span>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [festLoading, setFestLoading] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const emptyForm = { code: "", type: "Percentage", value: "", minOrder: "", cap: "", expiry: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingCode, setEditingCode] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (coupTab !== "Festival") return;
    setFestLoading(true);
    window.mpApi.fetch('/admin/coupons?type=festival').then(res => {
      setFestCoupons(res?.data?.coupons || []);
    }).catch(() => {}).finally(() => setFestLoading(false));
  }, [coupTab]);

  async function createCoupon() {
    if (!form.code || !form.value) return;
    if (form.type === 'Percentage' && parseFloat(form.value) > 100) {
      alert('Percentage discounts cannot exceed 100%.');
      return;
    }
    setSavingCoupon(true);
    try {
      const res = await window.mpApi.fetch('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          type: 'festival',
          discount_type: form.type === 'Percentage' ? 'pct' : 'flat',
          discount_value: parseFloat(form.value),
          min_order: parseFloat(form.minOrder) || 0,
          max_uses: form.cap ? parseInt(form.cap) : undefined,
          expires_at: form.expiry || undefined,
        }),
      });
      if (res?.ok) {
        setFestCoupons(prev => [res.data, ...prev]);
        setForm(emptyForm);
        setShowForm(false);
      } else {
        alert(res?.error?.message || 'Failed to create coupon.');
      }
    } catch (e) {
      alert(e?.message || 'Failed to create coupon.');
    } finally {
      setSavingCoupon(false);
    }
  }

  function startEdit(c) {
    setEditingCode(c.code);
    setEditForm({
      type:     c.discount_type === 'pct' ? 'Percentage' : 'Flat amount',
      value:    String(c.discount_value),
      minOrder: String(c.min_order || 0),
      cap:      c.max_uses != null ? String(c.max_uses) : '',
      expiry:   c.expires_at ? c.expires_at.slice(0, 10) : '',
    });
  }

  async function saveEdit(code) {
    if (!editForm.value) return;
    if (editForm.type === 'Percentage' && parseFloat(editForm.value) > 100) {
      alert('Percentage discounts cannot exceed 100%.');
      return;
    }
    setSavingEdit(true);
    try {
      const body = {
        discount_type:  editForm.type === 'Percentage' ? 'pct' : 'flat',
        discount_value: parseFloat(editForm.value),
        min_order:      parseFloat(editForm.minOrder) || 0,
        max_uses:       editForm.cap ? parseInt(editForm.cap) : null,
        expires_at:     editForm.expiry || null,
      };
      const res = await window.mpApi.fetch(`/admin/coupons/${code}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res?.ok) {
        setFestCoupons(prev => prev.map(c => c.code === code ? res.data : c));
        setEditingCode(null);
      } else {
        alert(res?.error?.message || 'Failed to save changes.');
      }
    } catch (e) {
      alert(e?.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleCoupon(code) {
    const isActive = festCoupons.find(c => c.code === code)?.is_active;
    const action = isActive ? 'Deactivate' : 'Activate';
    const result = await Swal.fire({
      title: `${action} coupon?`,
      text: isActive
        ? `"${code}" will be disabled and can no longer be used at checkout.`
        : `"${code}" will be re-enabled for use at checkout.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#D94040' : '#FF9100',
      cancelButtonColor: '#F7E3C9',
      confirmButtonText: action,
      cancelButtonText: 'Cancel',
      background: '#fff',
      customClass: { cancelButton: 'swal-cancel-dark' },
    });
    if (!result.isConfirmed) return;
    const res = await window.mpApi.fetch(`/admin/coupons/${code}/toggle`, { method: 'PATCH' }).catch(() => null);
    if (res?.ok) {
      setFestCoupons(prev => prev.map(c => c.code === code ? { ...c, is_active: res.data.is_active, disabled_by: res.data.disabled_by } : c));
    } else {
      Swal.fire({ title: 'Failed', text: res?.error?.message || 'Could not update coupon.', icon: 'error', confirmButtonColor: '#FF9100', background: '#fff' });
    }
  }

  async function deleteCoupon(code) {
    const result = await Swal.fire({
      title: `Delete "${code}"?`,
      text: 'This coupon will be permanently removed and cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D94040',
      cancelButtonColor: '#F7E3C9',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      background: '#fff',
      customClass: { cancelButton: 'swal-cancel-dark' },
    });
    if (!result.isConfirmed) return;
    const res = await window.mpApi.fetch(`/admin/coupons/${code}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) {
      setFestCoupons(prev => prev.filter(c => c.code !== code));
    } else {
      Swal.fire({ title: 'Failed', text: res?.error?.message || 'Could not delete coupon.', icon: 'error', confirmButtonColor: '#FF9100', background: '#fff' });
    }
  }

  async function toggleInfluencerCoupon(code) {
    const isActive = (adminInfluencers || []).find(c => c.code === code)?.is_active !== false;
    const action = isActive ? 'Deactivate' : 'Activate';
    const result = await Swal.fire({
      title: `${action} coupon?`,
      text: isActive
        ? `"${code}" will be disabled and can no longer be used at checkout.`
        : `"${code}" will be re-enabled for use at checkout.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#D94040' : '#FF9100',
      cancelButtonColor: '#F7E3C9',
      confirmButtonText: action,
      cancelButtonText: 'Cancel',
      background: '#fff',
      customClass: { cancelButton: 'swal-cancel-dark' },
    });
    if (!result.isConfirmed) return;
    const res = await window.mpApi.fetch(`/admin/coupons/${code}/toggle`, { method: 'PATCH' }).catch(() => null);
    if (res?.ok && res?.data) {
      setAdminInfluencers(prev => prev.map(c => c.code === code ? { ...c, is_active: res.data.is_active } : c));
    } else {
      Swal.fire({ title: 'Failed', text: res?.error?.message || 'Failed to toggle coupon.', icon: 'error', confirmButtonColor: '#FF9100', background: '#fff' });
    }
  }

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Coupons</div>
      <div className="toggle-group">
        {["Festival", "Influencer"].map(t => (
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
                  <div className="input-group">
                    <label className="input-label">Type</label>
                    <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--border)" }}>
                      <button type="button" onClick={() => setForm(f => ({ ...f, type: "Percentage" }))} style={{ flex: 1, padding: "10px 12px", background: form.type === "Percentage" ? "var(--orange)" : "transparent", color: form.type === "Percentage" ? "#fff" : "var(--text-65)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", transition: "background .15s" }}>% Percentage</button>
                      <button type="button" onClick={() => setForm(f => ({ ...f, type: "Flat amount" }))} style={{ flex: 1, padding: "10px 12px", background: form.type === "Flat amount" ? "var(--orange)" : "transparent", color: form.type === "Flat amount" ? "#fff" : "var(--text-65)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, border: "none", borderLeft: "1.5px solid var(--border)", cursor: "pointer", transition: "background .15s" }}>৳ Amount</button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Discount Value</label>
                    <div style={{ position: "relative" }}>
                      <input className="input" placeholder={form.type === "Percentage" ? "15" : "50"} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={{ paddingRight: 36 }} />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "var(--text-65)", fontSize: 14, pointerEvents: "none" }}>{form.type === "Percentage" ? "%" : "৳"}</span>
                    </div>
                  </div>
                  <div className="input-group"><label className="input-label">Min Order (৳)</label><input className="input" placeholder="200" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} /></div>
                  <div className="input-group"><label className="input-label">Usage Cap</label><input className="input" placeholder="100" value={form.cap} onChange={e => setForm(f => ({ ...f, cap: e.target.value }))} /></div>
                  <div className="input-group" style={{ gridColumn: "1/-1" }}><label className="input-label">Expiry</label><input className="input" type="date" value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} /></div>
                </div>
                <div className="row mt8" style={{ gap: 10 }}>
                  <button className="btn btn-primary" disabled={savingCoupon || !form.code || !form.value} onClick={createCoupon}>{savingCoupon ? 'Saving…' : 'Create Coupon'}</button>
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
                  {festLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--text-65)" }}>Loading…</td></tr>
                  ) : festCoupons.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No festival coupons yet.</td></tr>
                  ) : festCoupons.map(c => (
                    <React.Fragment key={c.code}>
                      <tr>
                        <td className="mono fw700" style={{ color: "var(--blue)" }}>{c.code}</td>
                        <td>{c.discount_type === 'pct' ? `${c.discount_value}%` : `৳${c.discount_value}`}</td>
                        <td className="muted">৳{c.min_order || 0}</td>
                        <td>{c.used_count} / {c.max_uses ?? '∞'}</td>
                        <td className="muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                        <td>
                          <span className={`badge ${c.is_active ? "badge-green" : "badge-gray"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                          {!c.is_active && c.disabled_by && (
                            <div style={{ fontSize: 10, color: "var(--text-65)", marginTop: 3 }}>by {c.disabled_by}</div>
                          )}
                        </td>
                        <td>
                          <div className="cell-action">
                            <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => editingCode === c.code ? setEditingCode(null) : startEdit(c)}>
                              {editingCode === c.code ? "Cancel" : "Edit"}
                            </button>
                            <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => toggleCoupon(c.code)}>
                              {c.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(229,92,92,.4)" }} onClick={() => deleteCoupon(c.code)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                      {editingCode === c.code && (
                        <tr style={{ background: "rgba(255,145,0,.04)" }}>
                          <td colSpan={7} style={{ padding: "16px 20px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "flex-end" }}>
                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Type</label>
                                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--border)" }}>
                                  <button type="button" onClick={() => setEditForm(f => ({ ...f, type: "Percentage" }))} style={{ flex: 1, padding: "8px", background: editForm.type === "Percentage" ? "var(--orange)" : "transparent", color: editForm.type === "Percentage" ? "#fff" : "var(--text-65)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>% Pct</button>
                                  <button type="button" onClick={() => setEditForm(f => ({ ...f, type: "Flat amount" }))} style={{ flex: 1, padding: "8px", background: editForm.type === "Flat amount" ? "var(--orange)" : "transparent", color: editForm.type === "Flat amount" ? "#fff" : "var(--text-65)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, border: "none", borderLeft: "1.5px solid var(--border)", cursor: "pointer" }}>৳ Flat</button>
                                </div>
                              </div>
                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Value {editForm.type === "Percentage" ? "(%)" : "(৳)"}</label>
                                <input className="input" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} placeholder={editForm.type === "Percentage" ? "15" : "100"} />
                              </div>
                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Min Order (৳)</label>
                                <input className="input" value={editForm.minOrder} onChange={e => setEditForm(f => ({ ...f, minOrder: e.target.value }))} placeholder="0" />
                              </div>
                              <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">Expiry</label>
                                <input className="input" type="date" value={editForm.expiry} onChange={e => setEditForm(f => ({ ...f, expiry: e.target.value }))} />
                              </div>
                              <button className="btn btn-primary" style={{ whiteSpace: "nowrap", marginBottom: 0 }} disabled={savingEdit || !editForm.value} onClick={() => saveEdit(c.code)}>
                                {savingEdit ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
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

// ── Section: Policies ──────────────────────────────
function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    try {
      const res = await window.mpApi.fetch('/admin/policies');
      setPolicies(res?.data?.policies || []);
    } catch (_) {}
    setLoading(false);
  }

  async function createPolicy() {
    if (!panel || !panel.name || !panel.title || !panel.content) return;
    try {
      const res = await window.mpApi.fetch('/admin/policies', {
        method: 'POST',
        body: JSON.stringify(panel),
      });
      if (res?.ok) {
        setPolicies(prev => [res.data.policy, ...prev]);
        setPanel(null);
      } else {
        alert(res?.error?.message || 'Failed to create policy');
      }
    } catch (_) {
      alert('Could not connect to server');
    }
  }

  async function updatePolicy() {
    if (!editing || !panel) return;
    try {
      const res = await window.mpApi.fetch(`/admin/policies/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: panel.title, content: panel.content }),
      });
      if (res?.ok) {
        setPolicies(prev => prev.map(p => p.id === editing.id ? res.data.policy : p));
        setEditing(null);
        setPanel(null);
      } else {
        alert(res?.error?.message || 'Failed to update policy');
      }
    } catch (_) {
      alert('Could not connect to server');
    }
  }

  async function deletePolicy(id) {
    if (!confirm('Delete this policy?')) return;
    try {
      const res = await window.mpApi.fetch(`/admin/policies/${id}`, { method: 'DELETE' });
      if (res?.ok) {
        setPolicies(prev => prev.filter(p => p.id !== id));
      } else {
        alert(res?.error?.message || 'Failed to delete policy');
      }
    } catch (_) {
      alert('Could not connect to server');
    }
  }

  return (
    <div>
      <div className="page-title">Policies</div>
      <button className="btn btn-primary" onClick={() => { setEditing(null); setPanel({ name: '', title: '', content: '' }); }} style={{ marginBottom: 16 }}>
        <i className="fa fa-plus" /> New Policy
      </button>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-65)' }}>Loading policies…</div>
      ) : policies.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-65)' }}>No policies yet. Create one to get started.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {policies.map(policy => (
            <div key={policy.id} className="card" style={{ padding: 16, border: '1px solid var(--text-08)' }}>
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{policy.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-65)' }}>Name: <span className="mono">{policy.name}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => { setEditing(policy); setPanel(policy); }}>Edit</button>
                  <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red)', borderColor: 'rgba(229,92,92,.4)' }} onClick={() => deletePolicy(policy.id)}>Delete</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-65)', lineHeight: 1.5, maxHeight: 80, overflow: 'hidden' }}>{policy.content.substring(0, 200)}…</div>
            </div>
          ))}
        </div>
      )}

      {panel && (
        <div className="overlay" onClick={() => { setPanel(null); setEditing(null); }}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{editing ? 'Edit Policy' : 'New Policy'}</div>
            <div className="sheet-body">
              {!editing && (
                <div className="input-group">
                  <label className="input-label">Name (e.g., return-policy)</label>
                  <input className="input" value={panel.name} onChange={e => setPanel(f => ({ ...f, name: e.target.value }))} placeholder="return-policy" />
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Title</label>
                <input className="input" value={panel.title} onChange={e => setPanel(f => ({ ...f, title: e.target.value }))} placeholder="Return Policy" />
              </div>
              <div className="input-group">
                <label className="input-label">Content (Markdown Supported)</label>
                <MarkdownEditor value={panel.content} onChange={e => setPanel(f => ({ ...f, content: e.target.value }))} />
              </div>
            </div>
            <div className="col-gap">
              <button className="btn btn-primary btn-full" onClick={editing ? updatePolicy : createPolicy}>{editing ? 'Save Changes' : 'Create Policy'}</button>
              <button className="btn btn-ghost btn-full" onClick={() => { setPanel(null); setEditing(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Crew Management ───────────────────────────
function CrewManagement() {
  const [crewTab, setCrewTab] = useState("Applications");
  const [apps, setApps] = useState([]);
  const [members, setMembers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [settings, setSettings] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [panel, setPanel] = useState(null);
  const [busy, setBusy] = useState(false);

  function loadCrew() {
    Promise.all([
      window.mpApi.fetch('/admin/crew/applications').catch(() => null),
      window.mpApi.fetch('/admin/crew/members').catch(() => null),
      window.mpApi.fetch('/admin/crew/coupons').catch(() => null),
      window.mpApi.fetch('/admin/crew/settings').catch(() => null),
      window.mpApi.fetch('/admin/crew/commissions').catch(() => null),
    ]).then(([a, m, c, s, p]) => {
      setApps(a?.data?.applications || []);
      setMembers(m?.data?.members || []);
      setCoupons(c?.data?.coupons || []);
      setSettings(s?.data || null);
      setCommissions(p?.data?.commissions || []);
    });
  }

  useEffect(loadCrew, []);

  async function approve(app) {
    const r = await Swal.fire({
      title: "Approve crew application?",
      text: "This will allow the user to create referral codes within your crew settings.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve Crew Member",
      confirmButtonColor: "#FF9100",
      cancelButtonColor: "#F7E3C9",
      customClass: { cancelButton: "swal-cancel-dark" },
    });
    if (!r.isConfirmed) return;
    setBusy(true);
    await window.mpApi.fetch(`/admin/crew/applications/${app.id}/approve`, { method: "PATCH" }).catch(() => null);
    setBusy(false); setPanel(null); loadCrew();
  }

  async function reject(app) {
    const r = await Swal.fire({
      title: "Reject crew application?",
      text: "The user will not receive crew access.",
      input: "textarea",
      inputPlaceholder: "Optional admin note",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reject Application",
      confirmButtonColor: "#D94040",
      cancelButtonColor: "#F7E3C9",
      customClass: { cancelButton: "swal-cancel-dark" },
    });
    if (!r.isConfirmed) return;
    setBusy(true);
    await window.mpApi.fetch(`/admin/crew/applications/${app.id}/reject`, { method: "PATCH", body: JSON.stringify({ admin_note: r.value || "" }) }).catch(() => null);
    setBusy(false); setPanel(null); loadCrew();
  }

  async function updateMember(member, body) {
    await window.mpApi.fetch(`/admin/crew/members/${member.id}`, { method: "PATCH", body: JSON.stringify(body) }).catch(() => null);
    loadCrew();
  }

  async function updateCoupon(coupon, body) {
    const res = await window.mpApi.fetch(`/admin/coupons/${coupon.code}`, { method: "PATCH", body: JSON.stringify(body) }).catch(() => null);
    if (res?.ok) loadCrew();
  }

  async function saveSettings() {
    if (!settings) return;
    setBusy(true);
    const res = await window.mpApi.fetch('/admin/crew/settings', { method: "PATCH", body: JSON.stringify(settings) }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setSettings(res.data);
      Swal.fire({ title: "Crew settings updated.", icon: "success", timer: 1200, showConfirmButton: false });
    }
  }

  async function markPaid(comm) {
    await window.mpApi.fetch(`/admin/crew/commissions/${comm.id}/mark-paid`, { method: "PATCH" }).catch(() => null);
    loadCrew();
  }

  const pendingApps = apps.filter(a => a.status === "pending");

  return (
    <div className="dash-inner-wide">
      <div className="page-title">Crew Management</div>
      <div className="toggle-group">
        {["Applications", "Active Crew", "Crew Coupons", "Settings", "Payouts"].map(t => (
          <button key={t} className={`toggle-btn ${crewTab === t ? "active" : ""}`} onClick={() => setCrewTab(t)}>{t}{t === "Applications" ? ` (${pendingApps.length})` : ""}</button>
        ))}
      </div>

      {crewTab === "Applications" && (
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Applicant</th><th>Phone</th><th>Social</th><th>Sharing</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{apps.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--text-65)" }}>No crew applications yet.</td></tr>
              ) : apps.map(a => (
                <tr key={a.id}><td>{fmtDate(a.created_at)}</td><td style={{ fontWeight: 700 }}>{a.name}</td><td>{a.phone}</td><td className="muted">{a.social_link || "—"}</td><td>{(a.sharing_methods || []).join(", ") || "—"}</td><td><StatusBadge status={a.status} /></td><td><button className="btn btn-sm btn-ghost" onClick={() => setPanel(a)}>View</button></td></tr>
              ))}</tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {crewTab === "Active Crew" && (
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Codes</th><th>Orders</th><th>Sales</th><th>Pending</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{members.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 28, color: "var(--text-65)" }}>No active crew members yet.</td></tr>
              ) : members.map(m => (
                <tr key={m.id}><td style={{ fontWeight: 700 }}>{m.name}</td><td>{m.phone}</td><td>{m.active_coupon_codes || 0}</td><td>{m.referral_orders || 0}</td><td>৳{Number(m.total_referral_sales || 0).toLocaleString()}</td><td>৳{Number(m.pending_commission || 0).toLocaleString()}</td><td>৳{Number(m.paid_commission || 0).toLocaleString()}</td><td><StatusBadge status={m.status} /></td><td><div className="cell-action"><button className="btn btn-sm btn-ghost" onClick={() => setPanel(m)}>View</button><button className="btn btn-sm btn-ghost" onClick={() => updateMember(m, { status: m.status === "active" ? "paused" : "active" })}>{m.status === "active" ? "Pause" : "Activate"}</button><button className="btn btn-sm btn-ghost" onClick={() => updateMember(m, { status: "disabled" })}>Disable</button></div></td></tr>
              ))}</tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {crewTab === "Crew Coupons" && (
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Crew</th><th>Discount</th><th>Usage</th><th>Max Phone</th><th>Sales</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{coupons.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 28, color: "var(--text-65)" }}>Crew-created coupons will appear here.</td></tr>
              ) : coupons.map(c => (
                <tr key={c.id}><td className="mono fw700" style={{ color: "var(--blue)" }}>{c.code}</td><td>{c.crew_member || "—"}</td><td>{c.discount_type === "pct" ? `${c.discount_value}%` : `৳${c.discount_value}`}</td><td>{c.used_count || 0} / {c.max_uses || "∞"}</td><td>{c.max_usage_per_phone || "—"}</td><td>৳{Number(c.total_sales || 0).toLocaleString()}</td><td>৳{Number(c.commission_generated || 0).toLocaleString()}</td><td><span className={`badge ${c.status === "active" ? "badge-green" : c.status === "pending_approval" ? "badge-orange" : "badge-gray"}`}>{c.status === "pending_approval" ? "Pending Approval" : fmtStatus(c.status)}</span></td><td><div className="cell-action">{c.status === "pending_approval" && <button className="btn btn-sm btn-ghost" onClick={() => updateCoupon(c, { status: "active", is_active: true })}>Approve</button>}<button className="btn btn-sm btn-ghost" onClick={() => updateCoupon(c, { status: "disabled", is_active: false })}>Disable</button><button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard?.writeText(c.code)}>Copy</button></div></td></tr>
              ))}</tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {crewTab === "Settings" && settings && (
        <SectionCard>
          <div className="grid-2">
            {[
              ["Maximum percentage discount", "max_pct_discount"],
              ["Maximum flat amount discount", "max_flat_discount"],
              ["Minimum order amount", "min_order"],
              ["Maximum orders per coupon", "max_uses_per_coupon"],
              ["Maximum usage per customer phone", "max_usage_per_phone"],
              ["Maximum active coupons per crew", "max_active_coupons_per_crew"],
              ["Commission value (max — earned at zero discount)", "commission_value"],
              ["Minimum commission value (at full allowed discount)", "commission_min_value"],
              ["Payout threshold", "payout_threshold"],
            ].map(([label, key]) => (
              <div className="input-group" key={key}><label className="input-label">{label}</label><input className="input" type="number" value={settings[key] ?? ""} onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))} /></div>
            ))}
            <div className="input-group"><label className="input-label">Crew commission type</label><select className="select" value={settings.commission_type} onChange={e => setSettings(s => ({ ...s, commission_type: e.target.value }))}><option value="percentage">Percentage of net order value</option><option value="flat">Fixed amount per delivered order</option></select></div>
            <div className="input-group"><label className="input-label">Commission model</label><select className="select" value={settings.commission_mode || "discount_linked"} onChange={e => setSettings(s => ({ ...s, commission_mode: e.target.value }))}><option value="discount_linked">Discount-linked — less discount given, more commission</option><option value="fixed">Fixed — same commission regardless of discount</option></select></div>
            <div className="input-group"><label className="input-label">Commission calculation basis</label><select className="select" value={settings.commission_base} onChange={e => setSettings(s => ({ ...s, commission_base: e.target.value }))}><option value="after_discount">After discount</option><option value="before_discount">Before discount</option></select></div>
          </div>
          <div className="grid-2">
            {[
              ["Require admin approval for new crew coupons", "require_coupon_approval"],
              ["Allow crew to edit active coupons", "allow_crew_edit_active_coupon"],
              ["Allow crew to deactivate coupons", "allow_crew_deactivate_coupon"],
              ["Allow coupon expiry date", "allow_coupon_expiry"],
            ].map(([label, key]) => (
              <label key={key} className="row mb10" style={{ gap: 8 }}><input type="checkbox" checked={!!settings[key]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))} /> <span className="text-sm">{label}</span></label>
            ))}
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={saveSettings}>{busy ? "Saving..." : "Save Settings"}</button>
        </SectionCard>
      )}

      {crewTab === "Payouts" && (
        <SectionCard style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Crew</th><th>Order</th><th>Code</th><th>Base</th><th>Commission</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{commissions.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 28, color: "var(--text-65)" }}>No crew commissions yet.</td></tr>
              ) : commissions.map(c => (
                <tr key={c.id}><td>{fmtDate(c.created_at)}</td><td>{c.crew_member}</td><td>{c.order_ref}</td><td>{c.coupon_code}</td><td>৳{Number(c.commission_base_amount || 0).toLocaleString()}</td><td style={{ fontWeight: 700, color: "var(--orange)" }}>৳{Number(c.commission_amount || 0).toLocaleString()}</td><td><StatusBadge status={c.status} /></td><td>{(c.status === "pending" || c.status === "approved") && <button className="btn btn-sm btn-ghost" onClick={() => markPaid(c)}>Mark Paid</button>}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {panel && (
        <div className="overlay" onClick={() => setPanel(null)}>
          <div className="slide-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-hd">
              <div>
                <div className="eyebrow">Crew Detail</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{panel.name}</div>
              </div>
              <button className="icon-btn" onClick={() => setPanel(null)}><i className="fa fa-times" /></button>
            </div>
            <div className="panel-bd">
              <div className="grid-2">
                <div><div className="profile-label">Phone</div><div className="profile-value">{panel.phone || "—"}</div></div>
                <div><div className="profile-label">Email</div><div className="profile-value">{panel.email || panel.user_email || "—"}</div></div>
                <div><div className="profile-label">Existing order count</div><div className="profile-value">{panel.order_count ?? panel.referral_orders ?? 0}</div></div>
                <div><div className="profile-label">Total spent / sales</div><div className="profile-value">৳{Number(panel.total_spent ?? panel.total_referral_sales ?? 0).toLocaleString()}</div></div>
                <div><div className="profile-label">Points balance</div><div className="profile-value">{panel.points_balance ?? "—"}</div></div>
                <div><div className="profile-label">Status</div><StatusBadge status={panel.status} /></div>
              </div>
              {panel.reason && <div className="card mt16"><div className="eyebrow">Application text</div><div className="text-sm text-muted">{panel.reason}</div></div>}
              {panel.social_link && <div className="card mt16"><div className="eyebrow">Social link</div><div className="text-sm text-muted">{panel.social_link}</div></div>}
              {panel.status === "pending" && (
                <div className="row mt16" style={{ gap: 10 }}>
                  <button className="btn btn-primary" disabled={busy} onClick={() => approve(panel)}>Approve Crew Member</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => reject(panel)}>Reject Application</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Points & Redemptions ─────────────────────
function PointsAdmin() {
  const [rewards, setRewards]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [panel, setPanel]       = useState(null); // null | { mode: 'add' | 'edit', data }
  const [busy, setBusy]         = useState(false);
  const [form, setForm]         = useState({ label: "", pts_cost: "", worth: "", is_active: true, sort_order: 0 });
  const [redemptions, setRedemptions] = useState([]);
  const [redLoading, setRedLoading]   = useState(true);

  useEffect(() => {
    window.mpApi.fetch('/admin/point-rewards')
      .then(res => setRewards(res?.data?.rewards || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    window.mpApi.fetch('/admin/redemptions')
      .then(res => setRedemptions(res?.data?.redemptions || []))
      .catch(() => {})
      .finally(() => setRedLoading(false));
  }, []);

  async function resolveRedemption(r, status) {
    if (status === 'cancelled') {
      const c = await Swal.fire({
        title: 'Cancel redemption?',
        text: `${Number(r.pts_cost).toLocaleString()} pts will be refunded to ${r.user_name || 'the customer'}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Cancel & Refund',
        confirmButtonColor: '#d33',
        background: '#fff',
      });
      if (!c.isConfirmed) return;
    }
    const res = await window.mpApi.fetch(`/admin/redemptions/${r.id}`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }).catch(() => null);
    if (res?.ok) setRedemptions(prev => prev.map(x => x.id === r.id ? { ...x, status } : x));
    else alert(res?.error?.message || 'Failed to update redemption.');
  }

  function openAdd() {
    setForm({ label: "", pts_cost: "", worth: "", is_active: true, sort_order: 0 });
    setPanel({ mode: "add" });
  }

  function openEdit(r) {
    setForm({ label: r.label, pts_cost: String(r.pts_cost), worth: r.worth || "", is_active: r.is_active, sort_order: r.sort_order });
    setPanel({ mode: "edit", id: r.id });
  }

  async function handleSave() {
    if (!form.label.trim() || !form.pts_cost) return;
    setBusy(true);
    try {
      const body = {
        label:      form.label.trim(),
        pts_cost:   parseInt(form.pts_cost),
        worth:      form.worth.trim() || null,
        is_active:  form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (panel.mode === "add") {
        const res = await window.mpApi.fetch('/admin/point-rewards', { method: 'POST', body: JSON.stringify(body) });
        if (res?.ok) setRewards(prev => [...prev, res.data]);
        else alert(res?.error?.message || 'Failed to create reward.');
      } else {
        const res = await window.mpApi.fetch(`/admin/point-rewards/${panel.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        if (res?.ok) setRewards(prev => prev.map(r => r.id === panel.id ? res.data : r));
        else alert(res?.error?.message || 'Failed to update reward.');
      }
      setPanel(null);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function handleToggle(r) {
    const res = await window.mpApi.fetch(`/admin/point-rewards/${r.id}`, {
      method: 'PATCH', body: JSON.stringify({ is_active: !r.is_active }),
    }).catch(() => null);
    if (res?.ok) setRewards(prev => prev.map(x => x.id === r.id ? res.data : x));
  }

  async function handleDelete(r) {
    const confirmed = await Swal.fire({
      title: 'Delete reward?',
      text: `"${r.label}" will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d33',
      background: '#fff',
    });
    if (!confirmed.isConfirmed) return;
    const res = await window.mpApi.fetch(`/admin/point-rewards/${r.id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setRewards(prev => prev.filter(x => x.id !== r.id));
    else alert(res?.error?.message || 'Failed to delete reward.');
  }

  return (
    <div className="dash-inner">
      <div className="page-title">Points &amp; Redemptions</div>

      {/* Rewards catalogue */}
      <div className="row-between mb10">
        <div className="eyebrow" style={{ marginBottom: 0 }}>Point Rewards Catalogue</div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <i className="fa fa-plus" style={{ fontSize: 11 }} /> Add Reward
        </button>
      </div>

      <div className="card mb20">
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}><i className="fa fa-spinner fa-spin" style={{ color: "var(--orange)" }} /></div>
        ) : rewards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-65)", fontSize: 13 }}>No rewards yet. Add one above.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Points Cost</th>
                  <th>Worth</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rewards.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td style={{ color: "var(--orange)", fontWeight: 700 }}>{Number(r.pts_cost).toLocaleString()} pts</td>
                    <td className="text-muted">{r.worth || "—"}</td>
                    <td className="text-muted">{r.sort_order}</td>
                    <td>
                      <span className={`badge ${r.is_active ? "badge-green" : "badge-gray"}`}>
                        {r.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(r)}>
                          {r.is_active ? "Hide" : "Show"}
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => handleDelete(r)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redemption requests */}
      <div className="eyebrow mb10">Redemption Requests</div>
      <div className="card mb20">
        {redLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}><i className="fa fa-spinner fa-spin" style={{ color: "var(--orange)" }} /></div>
        ) : redemptions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-65)", fontSize: 13 }}>No redemptions yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Reward</th>
                  <th>Points</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.user_name || "—"}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{r.user_phone || ""}</div>
                    </td>
                    <td>{r.reward_label}{r.worth ? <span className="text-muted"> ({r.worth})</span> : null}</td>
                    <td style={{ color: "var(--orange)", fontWeight: 700 }}>{Number(r.pts_cost).toLocaleString()} pts</td>
                    <td className="text-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${r.status === 'fulfilled' ? "badge-green" : r.status === 'cancelled' ? "badge-gray" : "badge-orange"}`}>
                        {r.status === 'fulfilled' ? "Fulfilled" : r.status === 'cancelled' ? "Cancelled" : "Pending"}
                      </span>
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => resolveRedemption(r, 'fulfilled')}>Fulfil</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => resolveRedemption(r, 'cancelled')}>Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit panel */}
      {panel && (
        <div className="overlay" onClick={() => setPanel(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">{panel.mode === "add" ? "Add Reward" : "Edit Reward"}</div>

            <div className="input-group">
              <label className="input-label">Label</label>
              <input className="input" placeholder="e.g. 1 Free Sachet" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Points Cost</label>
              <input className="input" type="number" min="1" placeholder="e.g. 1000" value={form.pts_cost} onChange={e => setForm(f => ({ ...f, pts_cost: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Worth (display only, e.g. ৳25)</label>
              <input className="input" placeholder="Optional" value={form.worth} onChange={e => setForm(f => ({ ...f, worth: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Sort Order (lower = first)</label>
              <input className="input" type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: "var(--orange)" }} />
                <span className="input-label" style={{ marginBottom: 0 }}>Active (visible to customers)</span>
              </label>
            </div>

            <div className="col-gap" style={{ marginTop: 20 }}>
              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={busy || !form.label.trim() || !form.pts_cost}>
                {busy ? <><i className="fa fa-spinner fa-spin" /> Saving…</> : "Save Reward"}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setPanel(null)} disabled={busy}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Financials ────────────────────────────────
function Financials() {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  });
  const [month, setMonth]     = useState(months[0]);
  const [fin, setFin]         = useState(null);
  const [loading, setLoading] = useState(true);

  const toYYYYMM = (label) => {
    const [name, year] = label.split(' ');
    return `${year}-${String(MONTH_NAMES.indexOf(name) + 1).padStart(2, '0')}`;
  };

  useEffect(() => {
    setLoading(true);
    window.mpApi.fetch(`/admin/financials?month=${toYYYYMM(month)}`)
      .then(res => { if (res?.data) setFin(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month]);

  const fmt = v => loading ? '…' : `৳${Number(v ?? 0).toLocaleString()}`;

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
          <div className="stat-label">Revenue (All Orders)</div>
          <div className="stat-value">{fmt(fin?.revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Discounts</div>
          <div className="stat-value">{fmt(fin?.discounts)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Influencer Commission</div>
          <div className="stat-value">{fmt(fin?.commission)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Points Redeemed (৳ eq.)</div>
          <div className="stat-value">{fmt(fin?.points_redeemed_taka)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Section: SMS Management ─────────────────────────────
function SmsManagement() {
  const [settings, setSettings] = useState(null);
  const [balance, setBalance] = useState(null);
  const [usage, setUsage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ apiUrl: '', apiKey: '', senderId: '', balanceApiUrl: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [settingsRes, balanceRes, usageRes, logsRes] = await Promise.all([
        window.mpApi.fetch('/admin/sms/settings'),
        window.mpApi.fetch('/admin/sms/balance'),
        window.mpApi.fetch('/admin/sms/usage?days=7'),
        window.mpApi.fetch('/admin/sms/logs?limit=20'),
      ]);

      if (settingsRes?.ok) setSettings(settingsRes.data);
      if (balanceRes?.ok) setBalance(balanceRes.data);
      if (usageRes?.ok) setUsage(usageRes.data);
      if (logsRes?.ok) setLogs(logsRes.data?.logs || []);

      if (settingsRes?.data) {
        setForm({
          apiUrl: settingsRes.data.apiUrl || '',
          apiKey: settingsRes.data.apiKey || '',
          senderId: settingsRes.data.senderId || '',
          balanceApiUrl: settingsRes.data.balanceApiUrl || '',
        });
      }
    } catch (err) {
      setError('Failed to load SMS data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    setError('');
    setSuccess('');
    try {
      const res = await window.mpApi.fetch('/admin/sms/settings', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      if (res?.ok) {
        setSuccess('SMS settings saved successfully');
        setEditMode(false);
        await loadData();
      } else {
        setError(res?.error?.message || 'Failed to save settings');
      }
    } catch (err) {
      setError('Error saving settings');
    }
  }

  async function handleRefreshBalance() {
    setError('');
    try {
      const res = await window.mpApi.fetch('/admin/sms/balance?refresh=true');
      if (res?.ok) {
        setBalance(res.data);
        setSuccess('Balance refreshed');
      } else {
        setError('Failed to refresh balance');
      }
    } catch (err) {
      setError('Error refreshing balance');
    }
  }

  if (loading) {
    return <div className="dash-inner" style={{ textAlign: 'center', padding: 40 }}><i className="fa fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--orange)' }} /></div>;
  }

  return (
    <div className="dash-inner">
      <div className="page-title">SMS & Balance Management</div>

      {error && <div style={{ padding: 12, marginBottom: 16, background: 'rgba(220,53,69,.1)', border: '1px solid rgba(220,53,69,.3)', borderRadius: 6, color: 'var(--red)', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: 12, marginBottom: 16, background: 'rgba(40,167,69,.1)', border: '1px solid rgba(40,167,69,.3)', borderRadius: 6, color: 'var(--green)', fontSize: 13 }}>{success}</div>}

      {/* Balance Card */}
      {balance && (
        <div className="card mb20">
          <div className="row-between mb12">
            <div className="eyebrow">Current Balance</div>
            <button className="btn btn-sm btn-ghost" onClick={handleRefreshBalance}>
              <i className="fa fa-sync-alt" style={{ fontSize: 11, marginRight: 4 }} /> Refresh
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--orange)' }}>
              ৳ {Number(balance.balance || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-65)' }}>
              {balance.cached && `Last updated: ${new Date(balance.cachedAt).toLocaleTimeString()}`}
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {usage && (
        <div className="card mb20">
          <div className="eyebrow mb12">SMS Usage (Last 7 Days)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, background: 'var(--bg-soft)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--text-65)', marginBottom: 4 }}>Total SMS Sent</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{usage.totalSms}</div>
            </div>
            {usage.byDate && usage.byDate.length > 0 && (
              <div style={{ padding: 12, background: 'var(--bg-soft)', borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--text-65)', marginBottom: 4 }}>Daily Average</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(usage.totalSms / (usage.byDate?.length || 1))}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="card mb20">
        <div className="row-between mb12">
          <div className="eyebrow">SMS Gateway Configuration</div>
          {!editMode && <button className="btn btn-sm btn-primary" onClick={() => setEditMode(true)}>Edit</button>}
        </div>

        {editMode ? (
          <>
            <div className="input-group">
              <label className="input-label">API URL</label>
              <input className="input" value={form.apiUrl} onChange={e => setForm(f => ({ ...f, apiUrl: e.target.value }))} placeholder="https://api.gateway.com/send" />
            </div>
            <div className="input-group">
              <label className="input-label">API Key</label>
              <input className="input" type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Your API key" />
            </div>
            <div className="input-group">
              <label className="input-label">Sender ID</label>
              <input className="input" value={form.senderId} onChange={e => setForm(f => ({ ...f, senderId: e.target.value }))} maxLength="11" placeholder="MidnightPick" />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Balance Check API URL</label>
              <input className="input" value={form.balanceApiUrl} onChange={e => setForm(f => ({ ...f, balanceApiUrl: e.target.value }))} placeholder="https://api.gateway.com/balance" />
            </div>
            <div className="col-gap mt12" style={{ marginBottom: 0 }}>
              <button className="btn btn-primary btn-full" onClick={handleSaveSettings}>Save</button>
              <button className="btn btn-ghost btn-full" onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {settings ? (
              <>
                <div><span style={{ fontSize: 12, color: 'var(--text-65)' }}>API URL:</span> <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{settings.apiUrl || '—'}</span></div>
                <div><span style={{ fontSize: 12, color: 'var(--text-65)' }}>Sender ID:</span> <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{settings.senderId || '—'}</span></div>
                <div><span style={{ fontSize: 12, color: 'var(--text-65)' }}>Balance API:</span> <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{settings.balanceApiUrl || '—'}</span></div>
              </>
            ) : (
              <div style={{ color: 'var(--text-65)', fontSize: 13 }}>No SMS configuration yet. Click Edit to configure.</div>
            )}
          </div>
        )}
      </div>

      {/* Recent Logs */}
      <div className="card">
        <div className="eyebrow mb12">Recent SMS Logs</div>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-65)', fontSize: 13 }}>No SMS logs yet</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr><th>Phone</th><th>Type</th><th>Status</th><th>Sent</th></tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.phone}</td>
                    <td><span style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg-soft)', borderRadius: 3 }}>{log.sms_type}</span></td>
                    <td><StatusBadge status={log.status} /></td>
                    <td className="text-muted">{fmtDate(log.sent_at || log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SMS Templates */}
      <SmsTemplatesEditor />
    </div>
  );
}

// SMS Templates Editor Component
function SmsTemplatesEditor() {
  const [templates, setTemplates] = useState([]);
  const [editingType, setEditingType] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await window.mpApi.fetch('/admin/sms/templates');
      if (res?.ok) {
        setTemplates(res.data);
      } else {
        setError('Failed to load templates');
      }
    } catch (err) {
      setError('Error loading templates');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(templateType) {
    setError('');
    setSuccess('');
    try {
      const res = await window.mpApi.fetch(`/admin/sms/templates/${templateType}`, {
        method: 'PATCH',
        body: JSON.stringify({ messageTemplate: editingText }),
      });
      if (res?.ok) {
        setSuccess('Template saved successfully');
        setEditingType(null);
        await loadTemplates();
      } else {
        setError(res?.error?.message || 'Failed to save template');
      }
    } catch (err) {
      setError('Error saving template');
    }
  }

  const templateDescriptions = {
    'otp': 'OTP code sent during login',
    'order_confirmation': 'Confirmation message after order placement',
  };

  const templateVariables = {
    'otp': ['OTP_CODE'],
    'order_confirmation': ['ORDER_REF', 'TOTAL'],
  };

  return (
    <div className="card">
      <div className="eyebrow mb16">SMS Message Templates</div>
      {error && <div style={{ padding: 12, marginBottom: 12, background: 'rgba(220,53,69,.1)', border: '1px solid rgba(220,53,69,.3)', borderRadius: 6, color: 'var(--red)', fontSize: 12 }}>{error}</div>}
      {success && <div style={{ padding: 12, marginBottom: 12, background: 'rgba(40,167,69,.1)', border: '1px solid rgba(40,167,69,.3)', borderRadius: 6, color: 'var(--green)', fontSize: 12 }}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><i className="fa fa-spinner fa-spin" style={{ color: 'var(--orange)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {templates.map(template => (
            <div key={template.template_type} style={{ padding: 12, background: 'var(--bg-soft)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{template.subject}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-65)', marginTop: 2 }}>
                    Available: {templateVariables[template.template_type]?.join(', ') || 'No variables'}
                  </div>
                </div>
                {editingType !== template.template_type && (
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditingType(template.template_type); setEditingText(template.message_template); }}>
                    Edit
                  </button>
                )}
              </div>

              {editingType === template.template_type ? (
                <>
                  <textarea
                    className="input"
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical', marginBottom: 8 }}
                    placeholder="Enter message template..."
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-65)', marginBottom: 8 }}>
                    Use {'{'}VARIABLE{'}'} for placeholders: {templateVariables[template.template_type]?.join(', ')}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSave(template.template_type)}>Save</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingType(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-75)', lineHeight: 1.5 }}>
                  {template.message_template}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
const BEAN_VARIETIES  = ["Robusta", "Arabica", "Liberica", "Excelsa"];
const ROAST_OPTIONS   = ["Light Roast", "Medium Roast", "Dark Roast"];
const PROCESS_OPTIONS = ["Freeze Dried", "Spray Dried"];

function parseBlend(str) {
  if (!str || !str.trim()) return [{ variety: "Robusta", pct: "" }];
  const parsed = str.split("·").map(s => s.trim()).filter(Boolean).map(p => {
    const m = p.match(/^(.+?)\s+(\d+)%$/);
    return m ? { variety: m[1].trim(), pct: m[2] } : null;
  }).filter(Boolean);
  return parsed.length ? parsed : [{ variety: "Robusta", pct: "" }];
}

function serializeBlend(parts) {
  const valid = parts.filter(p => p.variety && parseInt(p.pct) > 0);
  return valid.length ? valid.map(p => `${p.variety} ${p.pct}%`).join(" · ") : "";
}

function Products() {
  const [prodTab, setProdTab] = useState("Products");
  const { adminProducts: products, setAdminProducts: setProducts } = useContext(DashCtx);
  const [packages, setPackages] = useState([]);
  const [panel, setPanel] = useState(null);
  const [pkgPanel, setPkgPanel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);
  const activeImgIdx = useRef(0);

  const emptyProd = { name: "", description: "", price: "", stock: "", qty: "", unit: "g", status: "Active", images: [], category: "", badge: "", roast: "", origin: "" };
  const [form, setForm] = useState(emptyProd);
  const [blendMode, setBlendMode]       = useState("single"); // "single" | "blend"
  const [singleVariety, setSingleVariety] = useState("Robusta");
  const [blendParts, setBlendParts]     = useState([{ variety: "Robusta", pct: "" }]);
  const [processVal, setProcessVal]     = useState("");

  const emptyPkg = { name: "", description: "", price: "", status: "Active", productIds: [], quantities: {} };
  const [pkgForm, setPkgForm] = useState(emptyPkg);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) { e.target.value = ""; return; }
    const idx = activeImgIdx.current;
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 900;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      // prefer WebP (smaller), fall back to JPEG
      const compressed = canvas.toDataURL('image/webp', 0.82) || canvas.toDataURL('image/jpeg', 0.82);
      setForm(f => {
        const imgs = [...(f.images || [])];
        imgs[idx] = compressed;
        return { ...f, images: imgs };
      });
    };
    img.src = objectUrl;
  }

  function openAddProduct() {
    setForm(emptyProd);
    setBlendMode("single");
    setSingleVariety("Robusta");
    setBlendParts([{ variety: "Robusta", pct: "" }]);
    setProcessVal("");
    setPanel({ type: "add" });
  }

  function openEditProduct(p) {
    setForm({ ...p, price: String(p.price), stock: String(p.stock), qty: p.qty ? String(p.qty) : "", unit: p.unit || "g", images: p.images || (p.image ? [p.image] : []), category: p.category || "", badge: p.badge || "", roast: p.roast || "", origin: p.origin || "" });
    const mode = p.blend && p.blend.includes("%") ? "blend" : "single";
    setBlendMode(mode);
    if (mode === "single") {
      setSingleVariety(p.blend || "Robusta");
      setBlendParts([{ variety: "Robusta", pct: "" }]);
    } else {
      setSingleVariety("Robusta");
      setBlendParts(parseBlend(p.blend));
    }
    setProcessVal(p.process || "");
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
    if (form.category) body.category = form.category;
    if (form.badge)    body.badge    = form.badge;
    if (form.roast)    body.roast    = form.roast;
    if (form.origin)   body.origin   = form.origin;
    const blendStr = blendMode === "single" ? singleVariety : serializeBlend(blendParts);
    if (blendStr)      body.blend    = blendStr;
    if (processVal)    body.process  = processVal;
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
                    ? <img src={p.images?.[0] || p.image} alt={p.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                    <img src={img} alt={`Image ${idx + 1}`} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid var(--text-08)" }} />
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <input className="input" placeholder="e.g. Premium Coffee" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Badge</label>
                  <input className="input" placeholder="e.g. BEST VALUE" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} />
                </div>
              </div>
              <div className="eyebrow mt8 mb8" style={{ fontSize: 11, color: "var(--cream-65)", textTransform: "uppercase", letterSpacing: ".06em" }}>Specifications</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Roast</label>
                  <select className="select" value={form.roast} onChange={e => setForm(f => ({ ...f, roast: e.target.value }))}>
                    <option value="">— Select —</option>
                    {ROAST_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Origin</label>
                  <input className="input" placeholder="e.g. Colombia" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Process</label>
                <select className="select" value={processVal} onChange={e => setProcessVal(e.target.value)}>
                  <option value="">— Select —</option>
                  {PROCESS_OPTIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Bean</label>

                {blendMode === "single" ? (
                  <>
                    <select
                      className="select"
                      value={singleVariety}
                      onChange={e => setSingleVariety(e.target.value)}
                    >
                      {BEAN_VARIETIES.map(v => <option key={v}>{v}</option>)}
                    </select>
                    <button
                      onClick={() => {
                        setBlendParts([{ variety: singleVariety, pct: "" }, { variety: "Arabica", pct: "" }]);
                        setBlendMode("blend");
                      }}
                      style={{ marginTop: 8, width: "100%", padding: "9px 0", background: "rgba(255,160,0,.12)", border: "1px dashed rgba(255,160,0,.45)", borderRadius: 8, color: "var(--orange)", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: ".02em" }}
                    >
                      <i className="fa fa-plus" style={{ fontSize: 10, marginRight: 6 }} />Add Blend
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <button
                        onClick={() => { setSingleVariety(blendParts[0]?.variety || "Robusta"); setBlendMode("single"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cream-65)", fontSize: 11, padding: 0, textDecoration: "underline" }}
                      >
                        ← Single Origin
                      </button>
                      {(() => {
                        const total = blendParts.reduce((s, p) => s + (parseInt(p.pct) || 0), 0);
                        if (total === 0) return null;
                        return (
                          <span style={{ fontSize: 11, fontWeight: 700, color: total === 100 ? "var(--green)" : "var(--red)" }}>
                            {total === 100 ? "✓ 100%" : `${total}% — must be 100%`}
                          </span>
                        );
                      })()}
                    </div>
                    {blendParts.map((part, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <select
                          className="select"
                          value={part.variety}
                          onChange={e => setBlendParts(prev => prev.map((p, i) => i === idx ? { ...p, variety: e.target.value } : p))}
                          style={{ flex: 1 }}
                        >
                          {BEAN_VARIETIES.map(v => <option key={v}>{v}</option>)}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            max="100"
                            placeholder="0"
                            value={part.pct}
                            onChange={e => setBlendParts(prev => prev.map((p, i) => i === idx ? { ...p, pct: e.target.value } : p))}
                            style={{ width: 62, textAlign: "center" }}
                          />
                          <span style={{ fontSize: 13, color: "var(--cream-65)" }}>%</span>
                        </div>
                        <button
                          onClick={() => {
                            if (blendParts.length === 2) {
                              setSingleVariety(blendParts[idx === 0 ? 1 : 0].variety);
                              setBlendMode("single");
                            } else {
                              setBlendParts(prev => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
                          aria-label="Remove"
                        >×</button>
                      </div>
                    ))}
                    {blendParts.length < 4 && (
                      <button
                        onClick={() => setBlendParts(prev => [...prev, { variety: "Arabica", pct: "" }])}
                        style={{ marginTop: 4, padding: "7px 14px", background: "rgba(255,160,0,.08)", border: "1px dashed rgba(255,160,0,.35)", borderRadius: 8, color: "var(--orange)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        <i className="fa fa-plus" style={{ fontSize: 9, marginRight: 5 }} />Add variety
                      </button>
                    )}
                  </>
                )}
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
    { id: "policies",   icon: "fa-file-alt",        label: "Policies" },
    { id: "crew",       icon: "fa-fire",            label: "Crew" },
    { id: "feedback",   icon: "fa-comment-dots",    label: "Feedback" },
    { id: "reviews",    icon: "fa-star-half-alt",   label: "Reviews" },
    { id: "influencer", icon: "fa-bolt",            label: "Influencers" },
    { id: "points",     icon: "fa-star",            label: "Points" },
    { id: "sms",        icon: "fa-envelope",        label: "SMS" },
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

// ── Mobile bottom nav (sidebar is hidden ≤768px) ───────
function AdminTabbar({ section, setSection, onLogout }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { stats } = useContext(DashCtx);
  const activeOrders = stats?.orders?.active || 0;

  const main = [
    { id: "overview", icon: "fa-chart-pie",  label: "Overview" },
    { id: "orders",   icon: "fa-box",        label: "Orders" },
    { id: "products", icon: "fa-box-open",   label: "Products" },
    { id: "coupons",  icon: "fa-ticket-alt", label: "Coupons" },
  ];
  const more = [
    { id: "customers",  icon: "fa-users",          label: "Customers" },
    { id: "subs",       icon: "fa-calendar-check", label: "Subscriptions" },
    { id: "crew",       icon: "fa-fire",           label: "Crew" },
    { id: "feedback",   icon: "fa-comment-dots",   label: "Feedback" },
    { id: "reviews",    icon: "fa-star-half-alt",  label: "Reviews" },
    { id: "influencer", icon: "fa-bolt",           label: "Influencers" },
    { id: "points",     icon: "fa-star",           label: "Points" },
    { id: "sms",        icon: "fa-envelope",       label: "SMS" },
    { id: "financials", icon: "fa-chart-line",     label: "Financials" },
    { id: "settings",   icon: "fa-cog",            label: "Settings" },
  ];
  const moreActive = more.some(l => l.id === section);

  return (
    <>
      <div className="tabbar">
        <div className="tabbar-inner">
          {main.map(it => (
            <button key={it.id} className={`tab-item ${section === it.id ? "active" : ""}`} onClick={() => setSection(it.id)}>
              <div className="tab-icon" style={{ position: "relative" }}>
                <i className={`fa ${it.icon}`} />
                {it.id === "orders" && activeOrders > 0 && (
                  <span style={{ position: "absolute", top: -2, right: 2, minWidth: 14, height: 14, padding: "0 3px", borderRadius: 7, background: "var(--red)", color: "#fff", fontSize: 8.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeOrders}</span>
                )}
              </div>
              <span>{it.label}</span>
            </button>
          ))}
          <button className={`tab-item ${moreActive ? "active" : ""}`} onClick={() => setMoreOpen(true)}>
            <div className="tab-icon"><i className="fa fa-ellipsis-h" /></div>
            <span>More</span>
          </button>
        </div>
      </div>

      {moreOpen && (
        <div className="overlay" onClick={() => setMoreOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">All Sections</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {more.map(l => (
                <button
                  key={l.id}
                  onClick={() => { setSection(l.id); setMoreOpen(false); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                    padding: "14px 4px", borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${section === l.id ? "rgba(255,145,0,.45)" : "rgba(247,227,201,.14)"}`,
                    background: section === l.id ? "rgba(255,145,0,.14)" : "rgba(247,227,201,.06)",
                    color: section === l.id ? "var(--orange)" : "var(--cream)",
                  }}
                >
                  <i className={`fa ${l.icon}`} style={{ fontSize: 16 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600 }}>{l.label}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-full" onClick={() => { setMoreOpen(false); onLogout(); }}>
              <i className="fa fa-sign-out-alt" style={{ marginRight: 8 }} /> Log Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── App ────────────────────────────────────────────────
function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(null); // null=checking, true=ok, false=needs login
  const [ctxData, setCtxData] = useState({ user: null, orders: [], customers: [], stats: null });
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminInfluencers, setAdminInfluencers] = useState([]);

  function loadDashboard() {
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
  }

  useEffect(() => {
    // Verify auth via API call with credentials: include (httpOnly cookies sent automatically)
    fetch(window.mpApi.base + '/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // Send httpOnly cookies automatically
    })
      .then(res => res.json())
      .then(data => {
        if (!data.ok || data.data?.role !== 'admin') {
          setAuthed(false);
          setLoading(false);
          return;
        }
        setAuthed(true);
        loadDashboard();
      })
      .catch(() => {
        setAuthed(false);
        setLoading(false);
      });
  }, []);

  function onLoginSuccess() {
    setAuthed(true);
    setLoading(true);
    loadDashboard();
  }

  function render() {
    switch (section) {
      case "overview":   return <Overview setSection={setSection} />;
      case "orders":     return <Orders />;
      case "products":   return <Products />;
      case "customers":  return <Customers />;
      case "subs":       return <Subscriptions />;
      case "coupons":    return <Coupons />;
      case "policies":   return <Policies />;
      case "feedback":   return <CustomerFeedback />;
      case "reviews":    return <ReviewsAdmin />;
      case "crew":       return <CrewManagement />;
      case "influencer": return <InfluencersSection />;
      case "points":     return <PointsAdmin />;
      case "sms":        return <SmsManagement />;
      case "financials": return <Financials />;
      case "settings":   return <Settings />;
      default:           return null;
    }
  }

  if (loading) return <LoadingScreen message="Loading…" />;
  if (!authed)  return <AdminLogin onSuccess={onLoginSuccess} />;

  return (
    <DashCtx.Provider value={{...ctxData, adminProducts, setAdminProducts, adminInfluencers, setAdminInfluencers}}>
      <div className="dash-layout">
        <Sidebar section={section} setSection={setSection} onLogout={() => setLogoutOpen(true)} />
        <div className="dash-main">
          <main className="dash-content">
            {render()}
          </main>
        </div>
        <AdminTabbar section={section} setSection={setSection} onLogout={() => setLogoutOpen(true)} />
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

// ── Customer Feedback (private ordering-experience insights) ──
const EMOTION_META = {
  very_easy: { label: "Very easy", badge: "badge-green",  icon: "fa-face-laugh-beam" },
  okay:      { label: "Okay",      badge: "badge-orange", icon: "fa-face-meh" },
  confusing: { label: "Confusing", badge: "badge-red",    icon: "fa-face-frown" },
};

const ISSUE_LABELS = {
  checkout: "Checkout", payment: "Payment", delivery_address: "Delivery address",
  coupon: "Coupon", website_speed: "Website speed", product_info: "Product info", other: "Other",
};

const HIGHLIGHT_LABELS = {
  taste: "Taste", aroma: "Aroma", easy_to_make: "Easy to make",
  energy_focus: "Energy / Focus", packaging: "Packaging", delivery: "Delivery",
};

function CustomerFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel]   = useState(null);
  const [filter, setFilter] = useState({ emotion: "", device: "", tag: "", from: "", to: "", search: "" });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: 100 });
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await window.mpApi.fetch(`/admin/feedback?${params}`).catch(() => null);
    setFeedbacks(res?.data?.feedbacks || []);
    setStats(res?.data?.stats || null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  const statCards = [
    { label: "Average Ordering Experience", value: stats ? `${stats.avg_score} / 5` : "…", icon: "fa-gauge-high" },
    { label: "Total Feedback",              value: stats?.total ?? "…",                    icon: "fa-comment-dots" },
    { label: "Confusing Responses",         value: stats ? `${stats.confusing_pct}%` : "…", icon: "fa-circle-question" },
    { label: "Most Common Issue",           value: stats?.top_issue ? (ISSUE_LABELS[stats.top_issue] || stats.top_issue) : "—", icon: "fa-triangle-exclamation" },
  ];

  return (
    <div className="dash-inner-wide">
      <div className="row-between mb20" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="page-title" style={{ marginBottom: 2 }}>Customer Feedback</div>
          <div className="page-sub">Private ordering-experience feedback — never shown publicly.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><i className="fa fa-sync" style={{ fontSize: 12 }} /> Refresh</button>
      </div>

      <div className="stat-row" style={{ marginBottom: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input className="input" placeholder="Search order, name, phone…" style={{ width: 210 }} value={filter.search}
               onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <select className="select" style={{ width: 150 }} value={filter.emotion} onChange={e => setFilter(f => ({ ...f, emotion: e.target.value }))}>
          <option value="">All experiences</option>
          {Object.entries(EMOTION_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select className="select" style={{ width: 130 }} value={filter.device} onChange={e => setFilter(f => ({ ...f, device: e.target.value }))}>
          <option value="">All devices</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
        </select>
        <select className="select" style={{ width: 160 }} value={filter.tag} onChange={e => setFilter(f => ({ ...f, tag: e.target.value }))}>
          <option value="">All issues</option>
          {Object.entries(ISSUE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" type="date" style={{ width: 145 }} value={filter.from} onChange={e => setFilter(f => ({ ...f, from: e.target.value }))} title="From date" />
        <input className="input" type="date" style={{ width: 145 }} value={filter.to} onChange={e => setFilter(f => ({ ...f, to: e.target.value }))} title="To date" />
      </div>

      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Order</th><th>Customer</th><th>Experience</th><th>Issues</th><th>Comment</th><th>Device</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-65)" }}>Loading…</td></tr>
              ) : feedbacks.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No feedback yet. It appears here as customers respond after placing orders.</td></tr>
              ) : feedbacks.map(f => {
                const em = EMOTION_META[f.emotion] || {};
                return (
                  <tr key={f.id}>
                    <td className="muted">{fmtDate(f.created_at)}</td>
                    <td className="mono text-xs" style={{ color: "var(--blue)" }}>{f.order_ref}</td>
                    <td style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => setPanel(f)}>{f.customer_name || "Guest"}</td>
                    <td><span className={`badge ${em.badge || "badge-gray"}`}>{em.label || f.emotion}</span></td>
                    <td>
                      {f.issue_tags?.length
                        ? f.issue_tags.map(t => <span key={t} className="badge badge-gray" style={{ marginRight: 4 }}>{ISSUE_LABELS[t] || t}</span>)
                        : <span className="muted">—</span>}
                    </td>
                    <td className="muted" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.comment || "—"}</td>
                    <td className="muted" style={{ textTransform: "capitalize" }}>{f.device_type || "—"}</td>
                    <td><button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setPanel(f)}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {panel && (
        <>
          <div className="panel-overlay" onClick={() => setPanel(null)} />
          <div className="slide-panel">
            <div className="panel-hd">
              <div>
                <div className="mono text-xs" style={{ color: "var(--blue)", marginBottom: 4 }}>{panel.order_ref}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{panel.customer_name || "Guest"}</div>
              </div>
              <button className="icon-btn" onClick={() => setPanel(null)}><i className="fa fa-times" /></button>
            </div>

            <div className="eyebrow mb10">Feedback</div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="row-between mb8">
                <span className="text-sm text-muted">Was it easy to place the order?</span>
                <span className={`badge ${EMOTION_META[panel.emotion]?.badge || "badge-gray"}`}>{EMOTION_META[panel.emotion]?.label || panel.emotion}</span>
              </div>
              <div className="row-between mb8">
                <span className="text-sm text-muted">Score</span>
                <span style={{ fontWeight: 700, color: "var(--orange)" }}>{panel.score} / 5</span>
              </div>
              {panel.issue_tags?.length > 0 && (
                <div className="row-between mb8" style={{ alignItems: "flex-start" }}>
                  <span className="text-sm text-muted">Detected issues</span>
                  <span style={{ textAlign: "right" }}>{panel.issue_tags.map(t => <span key={t} className="badge badge-gray" style={{ marginLeft: 4 }}>{ISSUE_LABELS[t] || t}</span>)}</span>
                </div>
              )}
              {panel.comment && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
                  “{panel.comment}”
                </div>
              )}
            </div>

            <div className="eyebrow mb10">Customer & Order</div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="row-between mb8"><span className="text-sm text-muted">Phone</span><span className="text-sm">{panel.customer_phone || "—"}</span></div>
              <div className="row-between mb8"><span className="text-sm text-muted">Order</span><span className="mono text-xs" style={{ color: "var(--blue)" }}>{panel.order_ref}</span></div>
              <div className="row-between mb8"><span className="text-sm text-muted">Order status</span><StatusBadge status={panel.order_status || "—"} /></div>
            </div>

            <div className="eyebrow mb10">Context</div>
            <div className="card">
              <div className="row-between mb8"><span className="text-sm text-muted">Device</span><span className="text-sm" style={{ textTransform: "capitalize" }}>{panel.device_type || "—"}</span></div>
              <div className="row-between mb8"><span className="text-sm text-muted">Page source</span><span className="text-sm">{panel.page_source}</span></div>
              <div className="row-between"><span className="text-sm text-muted">Submitted</span><span className="text-sm">{new Date(panel.created_at).toLocaleString("en-GB")}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Reviews (live immediately — hide or remove only) ──
function ReviewsAdmin() {
  const [filter, setFilter]   = useState("all");
  const [reviews, setReviews] = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(f = filter) {
    setLoading(true);
    const q = f === "all" ? "?limit=100" : `?limit=100&status=${f}`;
    const res = await window.mpApi.fetch(`/admin/reviews${q}`).catch(() => null);
    setReviews(res?.data?.reviews || []);
    setStats(res?.data?.stats || null);
    setLoading(false);
  }

  useEffect(() => { load(filter); }, [filter]);

  async function setStatus(id, status) {
    const res = await window.mpApi.fetch(`/admin/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => null);
    if (res?.ok) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      load(filter);
    }
  }

  async function remove(id) {
    if (!window.confirm("Permanently delete this review?")) return;
    const res = await window.mpApi.fetch(`/admin/reviews/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setReviews(prev => prev.filter(r => r.id !== id));
  }

  const statCards = [
    { label: "Average Product Rating", value: stats ? `${stats.avg_rating} ★` : "…" },
    { label: "Live Reviews",           value: stats?.visible ?? "…" },
    { label: "Hidden Reviews",         value: stats?.hidden ?? "…" },
    { label: "Most Mentioned",         value: stats?.top_tag ? (HIGHLIGHT_LABELS[stats.top_tag] || stats.top_tag) : "—" },
  ];

  return (
    <div className="dash-inner-wide">
      <div className="row-between mb20" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="page-title" style={{ marginBottom: 2 }}>Reviews</div>
          <div className="page-sub">Verified-purchase reviews go live immediately. Hide or remove anything inappropriate.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(filter)}><i className="fa fa-sync" style={{ fontSize: 12 }} /> Refresh</button>
      </div>

      <div className="stat-row" style={{ marginBottom: 16 }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="toggle-group" style={{ marginBottom: 16 }}>
        {[["all", "All"], ["visible", "Live"], ["hidden", "Hidden"]].map(([val, label]) => (
          <button key={val} className={`toggle-btn ${filter === val ? "active" : ""}`} onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      <SectionCard style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Customer</th><th>Rating</th><th>Highlights</th><th>Review</th><th>Order</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--text-65)" }}>Loading…</td></tr>
              ) : reviews.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-65)" }}>No reviews found.</td></tr>
              ) : reviews.map(r => (
                <tr key={r.id}>
                  <td className="muted">{fmtDate(r.created_at)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.reviewer_name}</div>
                    <div className="text-xs text-muted">shown as “{r.display_name}”{r.is_verified ? " · Verified" : ""}</div>
                  </td>
                  <td style={{ color: "#FF9100", letterSpacing: 1, whiteSpace: "nowrap" }}>
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  </td>
                  <td>
                    {r.highlight_tags?.length
                      ? r.highlight_tags.map(t => <span key={t} className="badge badge-gray" style={{ marginRight: 4 }}>{HIGHLIGHT_LABELS[t] || t}</span>)
                      : <span className="muted">—</span>}
                  </td>
                  <td className="muted" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.comment || "—"}</td>
                  <td className="mono text-xs" style={{ color: "var(--blue)" }}>{r.order_ref || "—"}</td>
                  <td><span className={`badge ${r.status === "visible" ? "badge-green" : "badge-gray"}`}>{r.status === "visible" ? "Live" : "Hidden"}</span></td>
                  <td>
                    <div className="cell-action">
                      {r.status === "visible"
                        ? <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setStatus(r.id, "hidden")}>Hide</button>
                        : <button className="btn btn-sm btn-primary" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setStatus(r.id, "visible")}>Unhide</button>
                      }
                      <button className="btn btn-sm btn-ghost" style={{ padding: "5px 10px", fontSize: 11, color: "var(--red)", borderColor: "rgba(229,92,92,.4)" }} onClick={() => remove(r.id)}>Delete</button>
                    </div>
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

// ── Admin Login ────────────────────────────────────────
function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isBootstrap, setIsBootstrap] = useState(null);

  useEffect(() => {
    // Check if any admin exists
    async function checkAdminExists() {
      try {
        const res = await fetch(window.mpApi.base + '/auth/admin/bootstrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
          credentials: 'include',
        });
        const data = await res.json();
        // If bootstrap fails with ADMIN_EXISTS, then admin already exists
        setIsBootstrap(data.error?.code !== 'ADMIN_EXISTS');
      } catch {
        setIsBootstrap(false); // Assume admin exists if we can't reach the server
      }
    }
    checkAdminExists();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const endpoint = isBootstrap ? '/auth/admin/bootstrap' : '/auth/admin/login';
      const res = await fetch(window.mpApi.base + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error?.message || (isBootstrap ? 'Setup failed.' : 'Login failed.')); return; }
      // Store user info in localStorage for dashboard to use
      localStorage.setItem('mp_user', JSON.stringify(data.data.user));
      onSuccess();
    } catch {
      setError('Could not connect to server. Is the backend running?');
    } finally {
      setBusy(false);
    }
  }

  if (isBootstrap === null) return <LoadingScreen message="Checking admin status…" />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360, padding: 32, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--text-08)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="assets/logo.png" alt="Midnight Pick" style={{ height: 40, marginBottom: 12 }} />
          <div style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>
            {isBootstrap ? 'Create First Admin' : 'Admin Login'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-65)', marginTop: 4 }}>
            {isBootstrap ? 'Set up your admin account' : 'Midnight Pick Dashboard'}
          </div>
        </div>
        {isBootstrap && (
          <div style={{ background: 'rgba(255,145,0,.1)', border: '1px solid rgba(255,145,0,.2)', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12, color: 'var(--text-65)', lineHeight: 1.5 }}>
            ℹ️ No admin account found. Create the first admin account to access the dashboard.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@midnightpick.com" />
          </div>
          <div className="input-group" style={{ marginBottom: error ? 8 : 20 }}>
            <label className="input-label">Password</label>
            <input className="input" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16, padding: '8px 12px', background: 'rgba(229,92,92,.1)', borderRadius: 8 }}>{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
            {busy ? (isBootstrap ? 'Setting up…' : 'Signing in…') : (isBootstrap ? 'Create Account' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminDashboard />);
