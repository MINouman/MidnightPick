// midnight pick — track order page
const { useState, useRef } = React;

function getMidnightApiBase() {
  if (window.MIDNIGHT_API_BASE) return window.MIDNIGHT_API_BASE.replace(/\/$/, '');

  const hostname = window.location.hostname || 'localhost';
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const base = `${protocol}//${hostname}:3000/api/v1`;
  window.MIDNIGHT_API_BASE = base;
  return base;
}

const API_BASE = getMidnightApiBase();

const STATUS_TO_STEP = {
  processing: 'confirmed',
  packed:     'packed',
  shipped:    'shipped',
  delivered:  'delivered',
};

function formatTs(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-BD', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const STEPS = [
  { id: "confirmed", label: "Order Confirmed", detail: "Your order has been received and confirmed." },
  { id: "packed",    label: "Packed & Ready",  detail: "Your order has been packed and is awaiting courier pickup." },
  { id: "shipped",   label: "Shipped",         detail: "Your order is on its way with the courier." },
  { id: "delivered", label: "Delivered",       detail: "Your order has been delivered." },
];

const STEP_INDEX = { confirmed: 0, packed: 1, shipped: 2, delivered: 3 };

const WA_NUMBER = "8801829531588";

async function fetchOrderStatus(orderId) {
  const res  = await fetch(`${API_BASE}/track/${encodeURIComponent(orderId.trim().toUpperCase())}`);
  const json = await res.json();

  if (!json.ok) throw { code: 'not_found' };

  const d           = json.data;
  const currentStep = STATUS_TO_STEP[d.status] ?? 'confirmed';

  const steps = {};
  for (const [key, val] of Object.entries(d.steps)) {
    steps[key] = val ? { timestamp: formatTs(val.at), detail: val.detail } : null;
  }

  return { orderId: d.order_ref, currentStep, steps };
}

function TrackNav() {
  const [scrolled, setScrolled] = useState(false);
  React.useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className={"nav track-nav-standalone" + (scrolled ? " scrolled" : "")}>
      <div className="nav-inner track-nav-inner-layout">
        <a href="index.html" className="track-nav-back">
          <i className="fa-solid fa-arrow-left-long" aria-hidden="true" /> Home
        </a>
        <a href="index.html" className="nav-logo-link" aria-label="Midnight Pick — home">
          <Logo variant="dark" height={174} />
        </a>
        <div className="track-nav-spacer" />
      </div>
    </nav>
  );
}

function TrackTimeline({ currentStep, stepData }) {
  const currentIdx = STEP_INDEX[currentStep] ?? -1;
  return (
    <div className="track-timeline">
      {STEPS.map((step, i) => {
        const s = i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
        const data = stepData?.[step.id];
        const label = (data?.label) || step.label;
        const detail = (data?.detail) || (s !== "pending" ? step.detail : "Pending");
        const timestamp = data?.timestamp || null;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.id} className="track-step">
            <div className="track-step-aside">
              <div className={`track-step-dot track-step-dot--${s}`} />
              {!isLast && <div className={`track-step-line track-step-line--${s === "done" ? "done" : "pending"}`} />}
            </div>
            <div className={"track-step-body" + (!isLast ? " track-step-body--gap" : "")}>
              <p className={"track-step-label" + (s === "pending" ? " track-step-label--dim" : "")}>{label}</p>
              {timestamp && <p className="track-step-time">{timestamp}</p>}
              <p className={"track-step-detail" + (s === "pending" ? " track-step-detail--dim" : "")}>{detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_LABEL = { confirmed: "Confirmed", packed: "Packed", shipped: "In Transit", delivered: "Delivered" };
const STATUS_MOD   = { confirmed: "confirmed", packed: "packed", shipped: "transit", delivered: "delivered" };

function TrackOrderPage() {
  const [orderId, setOrderId]   = useState("");
  const [phase, setPhase]       = useState("idle"); // idle | loading | found | not_found
  const [orderData, setOrderData] = useState(null);
  const inputRef = useRef(null);

  const handleTrack = async () => {
    const id = orderId.trim();
    if (!id) { inputRef.current?.focus(); return; }
    setPhase("loading");
    try {
      const data = await fetchOrderStatus(id);
      setOrderData(data);
      setPhase("found");
    } catch {
      setPhase("not_found");
    }
  };

  const reset = () => { setPhase("idle"); setOrderData(null); };
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! I need help tracking my order: ${orderId}`)}`;

  return (
    <div className="track-page">
      <TrackNav />

      {/* mobile only — logo on burgundy background above the sheet */}
      <div className="track-page-bg" aria-hidden="true">
        <Logo variant="light" height={72} />
      </div>

      <div className="track-content">
        <div className="track-drag-handle" />
        <div className="track-card">

          <div className="track-card-head">
            <h1>Track Your Order</h1>
            <p>Enter your Order ID from your confirmation message</p>
          </div>

          {/* search form */}
          {(phase === "idle" || phase === "not_found") && (
            <div className="track-form">
              <div className="track-input-wrap">
                <i className="fa-solid fa-hashtag track-input-icon" aria-hidden="true" />
                <input
                  ref={inputRef}
                  className="track-input"
                  type="text"
                  placeholder="e.g. MP-10234"
                  value={orderId}
                  onChange={e => { setOrderId(e.target.value); if (phase === "not_found") setPhase("idle"); }}
                  onKeyDown={e => e.key === "Enter" && handleTrack()}
                  aria-label="Order ID"
                  autoComplete="off"
                />
              </div>
              <button className="track-btn" onClick={handleTrack}>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                Track Order
              </button>
            </div>
          )}

          {/* loading */}
          {phase === "loading" && (
            <div className="track-loading">
              <div className="track-spinner" />
              <p>Looking up your order…</p>
            </div>
          )}

          {/* not found */}
          {phase === "not_found" && (
            <div className="track-not-found">
              <div className="track-not-found-icon"><i className="fa-solid fa-box-open" /></div>
              <h3>Order not found</h3>
              <p>We couldn't find an order matching <strong>{orderId}</strong>. Check the ID in your confirmation message, or contact us directly.</p>
              <a href={waUrl} className="track-wa-btn" target="_blank" rel="noopener noreferrer">
                <i className="fa-brands fa-whatsapp" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </div>
          )}

          {/* found */}
          {phase === "found" && orderData && (
            <div className="track-result">
              <div className="track-order-meta">
                <span className="track-order-id">#{orderData.orderId}</span>
                <span className={`track-status-badge track-status-badge--${STATUS_MOD[orderData.currentStep]}`}>
                  {STATUS_LABEL[orderData.currentStep]}
                </span>
              </div>
              <TrackTimeline currentStep={orderData.currentStep} stepData={orderData.steps} />
              <button className="track-reset-btn" onClick={reset}>
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                Track another order
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TrackOrderPage />);
