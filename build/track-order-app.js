/* Built from track-order-app.jsx. Run: node scripts/build-jsx.js */
var {
  useState,
  useRef
} = React;
function getMidnightApiBase() {
  if (window.MIDNIGHT_API_BASE) return window.MIDNIGHT_API_BASE.replace(/\/$/, '');
  var {
    protocol,
    hostname,
    port
  } = window.location;
  var base = !port || port === '80' || port === '443' ? `${protocol}//${hostname}/api/v1` : `${protocol}//${hostname}:3000/api/v1`;
  window.MIDNIGHT_API_BASE = base;
  return base;
}
var API_BASE = getMidnightApiBase();
var STATUS_TO_STEP = {
  processing: 'confirmed',
  packed: 'packed',
  shipped: 'shipped',
  delivered: 'delivered'
};
function formatTs(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
var STEPS = [{
  id: "confirmed",
  label: "Order Confirmed",
  detail: "Your order has been received and confirmed."
}, {
  id: "packed",
  label: "Packed & Ready",
  detail: "Your order has been packed and is awaiting courier pickup."
}, {
  id: "shipped",
  label: "Shipped",
  detail: "Your order is on its way with the courier."
}, {
  id: "delivered",
  label: "Delivered",
  detail: "Your order has been delivered."
}];
var STEP_INDEX = {
  confirmed: 0,
  packed: 1,
  shipped: 2,
  delivered: 3
};
var WA_NUMBER = "8801829531588";
async function fetchOrderStatus(orderId) {
  var res = await fetch(`${API_BASE}/track/${encodeURIComponent(orderId.trim().toUpperCase())}`);
  var json = await res.json();
  if (!json.ok) throw {
    code: 'not_found'
  };
  var d = json.data;
  var currentStep = STATUS_TO_STEP[d.status] ?? 'confirmed';
  var steps = {};
  for (var [key, val] of Object.entries(d.steps)) {
    steps[key] = val ? {
      timestamp: formatTs(val.at),
      detail: val.detail
    } : null;
  }
  return {
    orderId: d.order_ref,
    currentStep,
    steps
  };
}
function TrackNav() {
  var [scrolled, setScrolled] = useState(false);
  React.useEffect(() => {
    var fn = () => setScrolled(window.scrollY > 30);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return React.createElement("nav", {
    className: "nav track-nav-standalone" + (scrolled ? " scrolled" : "")
  }, React.createElement("div", {
    className: "nav-inner track-nav-inner-layout"
  }, React.createElement("a", {
    href: "index.html",
    className: "track-nav-back"
  }, React.createElement("i", {
    className: "fa-solid fa-arrow-left-long",
    "aria-hidden": "true"
  }), " Home"), React.createElement("a", {
    href: "index.html",
    className: "nav-logo-link",
    "aria-label": "Midnight Pick \u2014 home"
  }, React.createElement(Logo, {
    variant: "dark",
    height: 174
  })), React.createElement("div", {
    className: "track-nav-spacer"
  })));
}
function TrackTimeline({
  currentStep,
  stepData
}) {
  var currentIdx = STEP_INDEX[currentStep] ?? -1;
  return React.createElement("div", {
    className: "track-timeline"
  }, STEPS.map((step, i) => {
    var s = i < currentIdx ? "done" : i === currentIdx ? "active" : "pending";
    var data = stepData?.[step.id];
    var label = data?.label || step.label;
    var detail = data?.detail || (s !== "pending" ? step.detail : "Pending");
    var timestamp = data?.timestamp || null;
    var isLast = i === STEPS.length - 1;
    return React.createElement("div", {
      key: step.id,
      className: "track-step"
    }, React.createElement("div", {
      className: "track-step-aside"
    }, React.createElement("div", {
      className: `track-step-dot track-step-dot--${s}`
    }), !isLast && React.createElement("div", {
      className: `track-step-line track-step-line--${s === "done" ? "done" : "pending"}`
    })), React.createElement("div", {
      className: "track-step-body" + (!isLast ? " track-step-body--gap" : "")
    }, React.createElement("p", {
      className: "track-step-label" + (s === "pending" ? " track-step-label--dim" : "")
    }, label), timestamp && React.createElement("p", {
      className: "track-step-time"
    }, timestamp), React.createElement("p", {
      className: "track-step-detail" + (s === "pending" ? " track-step-detail--dim" : "")
    }, detail)));
  }));
}
var STATUS_LABEL = {
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "In Transit",
  delivered: "Delivered"
};
var STATUS_MOD = {
  confirmed: "confirmed",
  packed: "packed",
  shipped: "transit",
  delivered: "delivered"
};
function TrackOrderPage() {
  var [orderId, setOrderId] = useState("");
  var [phase, setPhase] = useState("idle");
  var [orderData, setOrderData] = useState(null);
  var inputRef = useRef(null);
  var handleTrack = async () => {
    var id = orderId.trim();
    if (!id) {
      inputRef.current?.focus();
      return;
    }
    setPhase("loading");
    try {
      var data = await fetchOrderStatus(id);
      setOrderData(data);
      setPhase("found");
    } catch {
      setPhase("not_found");
    }
  };
  var reset = () => {
    setPhase("idle");
    setOrderData(null);
  };
  var waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! I need help tracking my order: ${orderId}`)}`;
  return React.createElement("div", {
    className: "track-page"
  }, React.createElement(TrackNav, null), React.createElement("div", {
    className: "track-page-bg",
    "aria-hidden": "true"
  }, React.createElement(Logo, {
    variant: "light",
    height: 72
  })), React.createElement("div", {
    className: "track-content"
  }, React.createElement("div", {
    className: "track-drag-handle"
  }), React.createElement("div", {
    className: "track-card"
  }, React.createElement("div", {
    className: "track-card-head"
  }, React.createElement("h1", null, "Track Your Order"), React.createElement("p", null, "Enter your Order ID from your confirmation message")), (phase === "idle" || phase === "not_found") && React.createElement("div", {
    className: "track-form"
  }, React.createElement("div", {
    className: "track-input-wrap"
  }, React.createElement("i", {
    className: "fa-solid fa-hashtag track-input-icon",
    "aria-hidden": "true"
  }), React.createElement("input", {
    ref: inputRef,
    className: "track-input",
    type: "text",
    placeholder: "e.g. MP-10234",
    value: orderId,
    onChange: e => {
      setOrderId(e.target.value);
      if (phase === "not_found") setPhase("idle");
    },
    onKeyDown: e => e.key === "Enter" && handleTrack(),
    "aria-label": "Order ID",
    autoComplete: "off"
  })), React.createElement("button", {
    className: "track-btn",
    onClick: handleTrack
  }, React.createElement("i", {
    className: "fa-solid fa-magnifying-glass",
    "aria-hidden": "true"
  }), "Track Order")), phase === "loading" && React.createElement("div", {
    className: "track-loading"
  }, React.createElement("div", {
    className: "track-spinner"
  }), React.createElement("p", null, "Looking up your order\u2026")), phase === "not_found" && React.createElement("div", {
    className: "track-not-found"
  }, React.createElement("div", {
    className: "track-not-found-icon"
  }, React.createElement("i", {
    className: "fa-solid fa-box-open"
  })), React.createElement("h3", null, "Order not found"), React.createElement("p", null, "We couldn't find an order matching ", React.createElement("strong", null, orderId), ". Check the ID in your confirmation message, or contact us directly."), React.createElement("a", {
    href: waUrl,
    className: "track-wa-btn",
    target: "_blank",
    rel: "noopener noreferrer"
  }, React.createElement("i", {
    className: "fa-brands fa-whatsapp",
    "aria-hidden": "true"
  }), "Chat on WhatsApp")), phase === "found" && orderData && React.createElement("div", {
    className: "track-result"
  }, React.createElement("div", {
    className: "track-order-meta"
  }, React.createElement("span", {
    className: "track-order-id"
  }, "#", orderData.orderId), React.createElement("span", {
    className: `track-status-badge track-status-badge--${STATUS_MOD[orderData.currentStep]}`
  }, STATUS_LABEL[orderData.currentStep])), React.createElement(TrackTimeline, {
    currentStep: orderData.currentStep,
    stepData: orderData.steps
  }), React.createElement("button", {
    className: "track-reset-btn",
    onClick: reset
  }, React.createElement("i", {
    className: "fa-solid fa-arrow-left",
    "aria-hidden": "true"
  }), "Track another order")))));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(TrackOrderPage, null));
