// midnight pick — shared components & icons

const Logo = ({ variant = "light", height = 56 }) => (
  <img
    src={variant === "dark" ? "assets/logo-dark.png" : "assets/logo.png"}
    alt="Midnight Pick"
    style={{ height, width: "auto", display: "block" }}
  />
);

// --- nav icons ---
const CartIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const HeartIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ArrowUpRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="arrow">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const Plus = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const Chev = ({ size = 18 }) => (
  <svg className="chev" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Check = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MenuGridIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" rx="2.5"/>
    <rect x="12" y="1" width="9" height="9" rx="2.5"/>
    <rect x="1" y="12" width="9" height="9" rx="2.5"/>
    <rect x="12" y="12" width="9" height="9" rx="2.5"/>
  </svg>
);

const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const Star = ({ size = 14, filled = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// --- "why" section icons (Font Awesome 6 Free) ---
const IconCoffeeSack  = () => <i className="fa-solid fa-building-wheat" style={{ fontSize: 48 }} aria-hidden="true" />;
const IconBullseye    = () => <i className="fa-solid fa-bullseye"  style={{ fontSize: 48 }} aria-hidden="true" />;
const IconQualityBadge = () => <i className="fa-solid fa-award" style={{ fontSize: 48 }} aria-hidden="true" />;

// --- "how it works" process icons (Font Awesome 6 Free) ---
const StepPick   = () => <i className="fa-solid fa-hand"               style={{ fontSize: 32 }} aria-hidden="true" />;
const StepSundry = () => <i className="fa-solid fa-sun"                style={{ fontSize: 32 }} aria-hidden="true" />;
const StepRoast  = () => <i className="fa-solid fa-fire-flame-curved"  style={{ fontSize: 32 }} aria-hidden="true" />;
const StepGrind  = () => <i className="fa-solid fa-snowflake"          style={{ fontSize: 32 }} aria-hidden="true" />;
const StepJar    = () => <i className="fa-solid fa-box-open"           style={{ fontSize: 32 }} aria-hidden="true" />;

// social icons
const SocialIcons = {
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  ig: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  fb: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  wa: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>,
};

// ─────────────────────────────────────────────
// SUBSCRIBE MODAL
// ─────────────────────────────────────────────

const SUBSCRIBE_PLANS = [
  {
    id: "nightshift",
    name: "Night Shift",
    badge: "POPULAR",
    contents: "10× Midnight Black sachets",
    regularPrice: 250,
    monthlyPrice: 210,
    bimonthlyPrice: 189,
    savings: "Save ৳40 · 16% off",
  },
  {
    id: "doubleshot",
    name: "Double Shot",
    badge: "BEST VALUE",
    contents: "10× Midnight Black + 10× Midnight Latte",
    regularPrice: 450,
    monthlyPrice: 370,
    bimonthlyPrice: 333,
    savings: "Save ৳80 · 18% off",
  },
];

function SubStepper({ step }) {
  return (
    <div className="sub-stepper" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
      {[1, 2, 3].map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && <div className={"sub-step-line" + (step > i ? " done" : "")} />}
          <div className={"sub-step-dot" + (step === n ? " current" : step > n ? " done" : "")}>
            {step > n ? (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : <span>{n}</span>}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function SubScreen1({ plan, setPlan, freq, setFreq, onContinue, onClose }) {
  const [priceVisible, setPriceVisible] = React.useState(true);

  const switchFreq = (f) => {
    if (f === freq) return;
    setPriceVisible(false);
    setTimeout(() => { setFreq(f); setPriceVisible(true); }, 150);
  };

  const getPrice = (p) => freq === "monthly" ? p.monthlyPrice : p.bimonthlyPrice;

  return (
    <div className="sub-screen">
      <SubStepper step={1} />
      <div className="sub-eyebrow">SUBSCRIBE</div>
      <h2 className="sub-title">Your Monthly Midnight</h2>
      <p className="sub-subtitle">Choose a plan. Cancel any time.</p>

      <div className="sub-freq-wrap">
        <div className="sub-freq-track">
          <div className={"sub-freq-thumb" + (freq === "bimonthly" ? " right" : "")} aria-hidden="true" />
          <button className={"sub-freq-opt" + (freq === "monthly" ? " active" : "")} onClick={() => switchFreq("monthly")}>Every month</button>
          <button className={"sub-freq-opt" + (freq === "bimonthly" ? " active" : "")} onClick={() => switchFreq("bimonthly")}>Every 2 months</button>
        </div>
      </div>

      <div className="sub-plans">
        {SUBSCRIBE_PLANS.map((p) => (
          <button
            key={p.id}
            className={"sub-plan-card" + (plan === p.id ? " selected" : "")}
            onClick={() => setPlan(p.id)}
          >
            <div className="sub-plan-body">
              <div className="sub-plan-left">
                <div className="sub-plan-name-row">
                  <span className="sub-plan-name">{p.name}</span>
                  <span className="sub-plan-badge">{p.badge}</span>
                </div>
                <div className="sub-plan-contents">{p.contents}</div>
                <div className="sub-plan-savings">{p.savings}</div>
                {freq === "bimonthly" && <div className="sub-plan-billed-note">Billed every 2 months</div>}
              </div>
              <div className="sub-plan-right">
                <div className={"sub-plan-price-wrap" + (!priceVisible ? " price-fading" : "")}>
                  <span className="sub-plan-price">৳{getPrice(p)}</span>
                  <span className="sub-plan-per">/mo</span>
                </div>
                <div className={"sub-plan-radio" + (plan === p.id ? " checked" : "")} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="sub-perks">
        {[
          { icon: "fa-truck-fast", text: "Priority delivery every month" },
          { icon: "fa-gift",       text: "Occasional free sachet included" },
          { icon: "fa-xmark",      text: "Cancel any time · no lock-in" },
        ].map((perk) => (
          <div className="sub-perk" key={perk.icon}>
            <div className="sub-perk-icon"><i className={`fa-solid ${perk.icon}`} aria-hidden="true" /></div>
            <span>{perk.text}</span>
          </div>
        ))}
      </div>

      <button className="sub-cta-btn" onClick={onContinue}>Continue →</button>
      <button className="sub-ghost-link" onClick={onClose}>One-time purchase instead? ↑ Back to shop</button>
    </div>
  );
}

function SubScreen2({ plan, freq, form, setForm, onContinue, onBack }) {
  const [errors, setErrors] = React.useState({});
  const [attempted, setAttempted] = React.useState(false);
  const [createAccount, setCreateAccount] = React.useState(true);
  const [returningUser, setReturningUser] = React.useState(false);

  const selectedPlan = SUBSCRIBE_PLANS.find((p) => p.id === plan);
  const price = freq === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.bimonthlyPrice;

  const validate = (f) => {
    const e = {};
    if (!f.name?.trim())    e.name    = "Full name is required.";
    if (!f.phone?.trim())   e.phone   = "Phone number is required.";
    if (!f.address?.trim()) e.address = "Delivery address is required.";
    if (!f.area?.trim())    e.area    = "Area is required.";
    if (!f.city?.trim())    e.city    = "City is required.";
    return e;
  };

  const handleContinue = () => {
    setAttempted(true);
    const e = validate(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    onContinue();
  };

  const handleBlur = (field) => {
    if (!attempted) return;
    const e = validate(form);
    setErrors((prev) => ({ ...prev, [field]: e[field] }));
  };

  const handlePhoneBlur = () => {
    handleBlur("phone");
    if (form.phone?.startsWith("01711") && !returningUser) {
      setReturningUser(true);
      setForm((prev) => ({ ...prev, name: "Muzahidul Islam", address: "House 12, Road 4, Aftabnagar", area: "Badda", city: "Dhaka" }));
    }
  };

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="sub-screen">
      <SubStepper step={2} />
      <h2 className="sub-title">Delivery Details</h2>
      <p className="sub-subtitle">Where should we send your monthly coffee?</p>

      <div className="sub-recap-bar">
        <div>
          <div className="sub-recap-plan">{selectedPlan.name.toUpperCase()} PLAN</div>
          <div className="sub-recap-detail">{selectedPlan.contents} · ৳{price}/mo</div>
        </div>
        <button className="sub-recap-edit" onClick={onBack} aria-label="Edit plan">
          <i className="fa-solid fa-pencil" aria-hidden="true" />
        </button>
      </div>

      {returningUser && (
        <div className="sub-returning-banner">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>Welcome back. We've filled in your details.</span>
        </div>
      )}

      <div className="sub-form">
        <div className="sub-field">
          <label className="sub-label">FULL NAME</label>
          <input className={"sub-input" + (errors.name ? " error" : "")} placeholder="Your full name" value={form.name || ""} onChange={set("name")} onBlur={() => handleBlur("name")} />
          {errors.name && <span className="sub-field-err">{errors.name}</span>}
        </div>
        <div className="sub-field">
          <label className="sub-label">PHONE NUMBER</label>
          <input className={"sub-input" + (errors.phone ? " error" : "")} type="tel" placeholder="01X XXXX XXXX" value={form.phone || ""} onChange={set("phone")} onBlur={handlePhoneBlur} />
          {errors.phone && <span className="sub-field-err">{errors.phone}</span>}
        </div>
        <div className="sub-field">
          <label className="sub-label">EMAIL ADDRESS <span className="sub-label-opt">(OPTIONAL)</span></label>
          <input className="sub-input" type="email" placeholder="For order updates (optional)" value={form.email || ""} onChange={set("email")} />
        </div>
        <div className="sub-field">
          <label className="sub-label">DELIVERY ADDRESS</label>
          <input className={"sub-input" + (errors.address ? " error" : "")} placeholder="House number, road, area" value={form.address || ""} onChange={set("address")} onBlur={() => handleBlur("address")} />
          {errors.address && <span className="sub-field-err">{errors.address}</span>}
        </div>
        <div className="sub-field-row">
          <div className="sub-field sub-field--half">
            <label className="sub-label">AREA / THANA</label>
            <input className={"sub-input" + (errors.area ? " error" : "")} placeholder="e.g. Badda, Mirpur" value={form.area || ""} onChange={set("area")} onBlur={() => handleBlur("area")} />
            {errors.area && <span className="sub-field-err">{errors.area}</span>}
          </div>
          <div className="sub-field sub-field--half">
            <label className="sub-label">CITY</label>
            <input className={"sub-input" + (errors.city ? " error" : "")} placeholder="Dhaka" value={form.city || ""} onChange={set("city")} onBlur={() => handleBlur("city")} />
            {errors.city && <span className="sub-field-err">{errors.city}</span>}
          </div>
        </div>

        <div className="sub-info-notice">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <span>Your address is saved to your account. You can update it before each month's delivery from your account page.</span>
        </div>

        <label className="sub-checkbox-label">
          <button
            role="checkbox"
            aria-checked={createAccount}
            className={"sub-checkbox" + (createAccount ? " checked" : "")}
            onClick={() => setCreateAccount((v) => !v)}
            type="button"
          >
            {createAccount && <i className="fa-solid fa-check" style={{ fontSize: 8 }} aria-hidden="true" />}
          </button>
          <span>Create an account to manage deliveries, pause, or cancel from your dashboard.</span>
        </label>
        {!createAccount && (
          <p className="sub-no-account">You'll manage everything via WhatsApp. No dashboard access.</p>
        )}
      </div>

      <button className="sub-cta-btn" onClick={handleContinue}>Continue to Payment →</button>
      <button className="sub-back-btn" onClick={onBack}>← Back</button>
    </div>
  );
}

function SubScreen3({ plan, freq, form, onConfirm, onBack }) {
  const [method, setMethod]       = React.useState("bkash");
  const [bkashNum, setBkashNum]   = React.useState(form.phone || "");
  const [nagadNum, setNagadNum]   = React.useState(form.phone || "");
  const [card, setCard]           = React.useState({ number: "", expiry: "", cvv: "" });
  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState("");
  const [promoStatus, setPromoStatus] = React.useState("idle");
  const [discount, setDiscount]   = React.useState(0);
  const [confirmStatus, setConfirmStatus] = React.useState("idle");

  const selectedPlan    = SUBSCRIBE_PLANS.find((p) => p.id === plan);
  const basePrice       = freq === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.bimonthlyPrice;
  const isOutsideDhaka  = form.city && form.city.trim().toLowerCase() !== "dhaka";
  const deliveryCharge  = isOutsideDhaka ? 60 : 0;
  const total           = basePrice + deliveryCharge - discount;

  const applyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoStatus("loading");
    setTimeout(() => {
      if (promoCode.trim().toUpperCase() === "MIDNIGHT10") {
        setDiscount(Math.round(basePrice * 0.1));
        setPromoStatus("success");
      } else {
        setPromoStatus("error");
      }
    }, 900);
  };

  const handleConfirm = () => {
    setConfirmStatus("loading");
    setTimeout(() => onConfirm({ method, total }), 1400);
  };

  const TABS = [
    { id: "bkash", label: "bKash", icon: "fa-mobile-screen-button" },
    { id: "nagad", label: "Nagad", icon: "fa-mobile-screen-button" },
    { id: "card",  label: "Card",  icon: "fa-credit-card" },
  ];

  return (
    <div className="sub-screen">
      <SubStepper step={3} />
      <h2 className="sub-title">Payment</h2>
      <p className="sub-subtitle">First charge today. Then monthly.</p>

      <div className="sub-pay-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"sub-pay-tab" + (method === t.id ? " active" : "")}
            onClick={() => setMethod(t.id)}
          >
            <i className={`fa-solid ${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {(method === "bkash" || method === "nagad") && (
        <div className="sub-field sub-field--mt">
          <label className="sub-label">{method === "bkash" ? "BKASH" : "NAGAD"} NUMBER</label>
          <input
            className="sub-input"
            type="tel"
            value={method === "bkash" ? bkashNum : nagadNum}
            onChange={(e) => method === "bkash" ? setBkashNum(e.target.value) : setNagadNum(e.target.value)}
          />
          <p className="sub-redirect-note">You'll be redirected to {method === "bkash" ? "bKash" : "Nagad"} to authorise the payment.</p>
        </div>
      )}

      {method === "card" && (
        <div className="sub-card-section">
          <div className="sub-card-brands">
            <span className="sub-card-brand-tag">VISA</span>
            <span className="sub-card-brand-tag">MC</span>
          </div>
          <div className="sub-field">
            <label className="sub-label">CARD NUMBER</label>
            <input className="sub-input" placeholder="•••• •••• •••• ••••" value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))} />
          </div>
          <div className="sub-field-row">
            <div className="sub-field sub-field--half">
              <label className="sub-label">EXPIRY</label>
              <input className="sub-input" placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))} />
            </div>
            <div className="sub-field sub-field--half">
              <label className="sub-label">CVV</label>
              <input className="sub-input" placeholder="•••" value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value }))} />
            </div>
          </div>
          <div className="sub-card-security">
            <i className="fa-solid fa-lock" style={{ fontSize: 10 }} aria-hidden="true" />
            <span>Your card details are encrypted and never stored.</span>
          </div>
        </div>
      )}

      <div className="sub-promo-wrap">
        {!promoOpen ? (
          <button className="sub-promo-trigger" onClick={() => setPromoOpen(true)}>Have a promo code?</button>
        ) : (
          <div className="sub-promo-panel">
            <label className="sub-label">PROMO CODE</label>
            <div className="sub-promo-row">
              <input
                className={"sub-input" + (promoStatus === "success" ? " promo-ok" : promoStatus === "error" ? " promo-err" : "")}
                placeholder="Enter code (optional)"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); if (promoStatus !== "idle") setPromoStatus("idle"); }}
                disabled={promoStatus === "loading" || promoStatus === "success"}
              />
              {promoStatus !== "success" && (
                <button className="sub-promo-apply" onClick={applyPromo} disabled={promoStatus === "loading" || !promoCode.trim()}>
                  {promoStatus === "loading" ? <span className="sub-spinner" aria-hidden="true" /> : "Apply"}
                </button>
              )}
              {promoStatus === "success" && <i className="fa-solid fa-circle-check" style={{ color: "#4CAF84", fontSize: 16, marginLeft: 8, flexShrink: 0 }} aria-hidden="true" />}
              {promoStatus === "error"   && <i className="fa-solid fa-circle-xmark" style={{ color: "#e57373", fontSize: 16, marginLeft: 8, flexShrink: 0 }} aria-hidden="true" />}
            </div>
            {promoStatus === "error" && <p className="sub-field-err">Invalid code. Please check and try again.</p>}
          </div>
        )}
      </div>

      <div className="sub-order-summary">
        <div className="sub-summary-row">
          <span>{selectedPlan.name} Plan</span>
          <span>৳{basePrice}</span>
        </div>
        <div className="sub-summary-divider" />
        <div className="sub-summary-row">
          <span>Delivery ({form.city || "Dhaka"})</span>
          <span className={isOutsideDhaka ? "" : "sub-free-label"}>{isOutsideDhaka ? `৳${deliveryCharge}` : "Free"}</span>
        </div>
        {discount > 0 && (
          <>
            <div className="sub-summary-divider" />
            <div className="sub-summary-row sub-summary-discount">
              <span>Promo discount</span>
              <span>−৳{discount}</span>
            </div>
          </>
        )}
        <div className="sub-summary-divider" />
        <div className="sub-summary-row sub-summary-total">
          <span>Total today</span>
          <span>৳{total}</span>
        </div>
        <p className="sub-billing-note">Billed monthly. Cancel before the 25th of each month to skip your next delivery.</p>
      </div>

      <button
        className={"sub-cta-btn" + (confirmStatus === "loading" ? " loading" : "")}
        onClick={handleConfirm}
        disabled={confirmStatus === "loading"}
      >
        {confirmStatus === "loading"
          ? <span className="sub-spinner" aria-hidden="true" />
          : "Confirm Subscription"}
      </button>
      <button className="sub-back-btn" onClick={onBack}>← Back</button>
      <div className="sub-secured-row">
        <i className="fa-solid fa-lock" aria-hidden="true" />
        <span>Secured payment</span>
      </div>
    </div>
  );
}

function SubConfirmation({ plan, freq, form, onBackToShop }) {
  const selectedPlan = SUBSCRIBE_PLANS.find((p) => p.id === plan);
  const price = freq === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.bimonthlyPrice;

  const now = new Date();
  const isAfter25 = now.getDate() >= 25;
  const rawMonth  = now.getMonth() + (isAfter25 ? 2 : 1);
  const delivYear = now.getFullYear() + Math.floor(rawMonth / 12);
  const delivMon  = rawMonth % 12;
  const months    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const isOutsideDhaka = form.city && form.city.trim().toLowerCase() !== "dhaka";
  const endDay    = isOutsideDhaka ? 5 : 3;

  const nextCharge  = new Date(delivYear, delivMon, 1);
  const cancelMon   = isAfter25 ? (now.getMonth() + 1) % 12 : now.getMonth();
  const cancelYear  = isAfter25 && now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const cancelBy    = new Date(cancelYear, cancelMon, 25);

  const fmt = (d) => `${months[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;

  return (
    <div className="sub-screen sub-screen--confirm">
      <div className="sub-confirm-icon-wrap">
        <div className="sub-confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l4.5 4.5L19 7" stroke="#FF9100" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <h2 className="sub-confirm-heading">You're subscribed.</h2>
      <p className="sub-confirm-sub">Your first Midnight Pick box is on its way. We'll message you on WhatsApp when it ships.</p>

      <div className="sub-delivery-card">
        <div className="sub-delivery-label">FIRST DELIVERY</div>
        <div className="sub-delivery-dates">{months[delivMon].slice(0, 3)} 1 – {months[delivMon].slice(0, 3)} {endDay}, {delivYear}</div>
        <div className="sub-delivery-detail">{isOutsideDhaka ? "Outside Dhaka · 3–5 business days" : "Inside Dhaka · 1–2 business days"}</div>
      </div>

      <div className="sub-order-summary sub-order-summary--confirm">
        <div className="sub-summary-label">YOUR SUBSCRIPTION</div>
        {[
          ["Plan",        selectedPlan.name],
          ["Billed",      `৳${price}/month`],
          ["Next charge", fmt(nextCharge)],
          ["Cancel by",   fmt(cancelBy)],
        ].map(([label, value], i, arr) => (
          <React.Fragment key={label}>
            <div className="sub-summary-row">
              <span>{label}</span>
              <span className="sub-confirm-val">{value}</span>
            </div>
            {i < arr.length - 1 && <div className="sub-summary-divider" />}
          </React.Fragment>
        ))}
      </div>

      <div className="sub-whatsapp-strip">
        <i className="fa-brands fa-whatsapp" aria-hidden="true" />
        <span>We've sent your confirmation to <strong style={{ color: "#F7E3C9" }}>{form.phone}</strong> on WhatsApp.</span>
      </div>

      <button className="sub-cta-btn" onClick={onBackToShop}>Back to Shop</button>
      <button className="sub-back-btn" onClick={() => { window.location.href = "dashboard-user.html"; }}>Manage Subscription</button>
    </div>
  );
}

function SubCloseConfirm({ onLeave, onStay }) {
  return (
    <div className="sub-close-confirm">
      <p className="sub-close-msg">Leave subscription setup? Your progress will be lost.</p>
      <div className="sub-close-actions">
        <button className="sub-back-btn" onClick={onLeave}>Yes, leave</button>
        <button className="sub-cta-btn" onClick={onStay}>Stay</button>
      </div>
    </div>
  );
}

function SubscribeModal({ open, onClose }) {
  const [step,             setStep]             = React.useState(1);
  const [plan,             setPlan]             = React.useState("nightshift");
  const [freq,             setFreq]             = React.useState("monthly");
  const [form,             setForm]             = React.useState({ city: "Dhaka" });
  const [confirmed,        setConfirmed]        = React.useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep(1); setPlan("nightshift"); setFreq("monthly");
      setForm({ city: "Dhaka" }); setConfirmed(false); setShowCloseConfirm(false);
    }
  }, [open]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const requestClose = () => {
    if (step === 1 && !confirmed) { onClose(); return; }
    setShowCloseConfirm(true);
  };

  const handleBackToShop = () => { onClose(); window.location.href = "shop.html"; };

  return (
    <div className="sub-overlay" role="dialog" aria-modal="true" aria-label="Subscription setup">
      <div className="sub-modal">
        {!confirmed && !showCloseConfirm && (
          <button className="sub-close-btn" onClick={requestClose} aria-label="Close">×</button>
        )}

        {showCloseConfirm ? (
          <SubCloseConfirm onLeave={onClose} onStay={() => setShowCloseConfirm(false)} />
        ) : confirmed ? (
          <SubConfirmation plan={plan} freq={freq} form={form} onBackToShop={handleBackToShop} />
        ) : step === 1 ? (
          <SubScreen1 plan={plan} setPlan={setPlan} freq={freq} setFreq={setFreq} onContinue={() => setStep(2)} onClose={onClose} />
        ) : step === 2 ? (
          <SubScreen2 plan={plan} freq={freq} form={form} setForm={setForm} onContinue={() => setStep(3)} onBack={() => setStep(1)} />
        ) : (
          <SubScreen3 plan={plan} freq={freq} form={form} onConfirm={() => setConfirmed(true)} onBack={() => setStep(2)} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRACK ORDER MODAL
// ─────────────────────────────────────────────

const TRACK_STEPS = [
  { id: "confirmed", label: "Order Confirmed", detail: "Your order has been received and confirmed." },
  { id: "packed",    label: "Packed & Ready",  detail: "Your order has been packed and is awaiting courier pickup." },
  { id: "shipped",   label: "Shipped",         detail: "Your order is on its way with the courier." },
  { id: "delivered", label: "Delivered",       detail: "Your order has been delivered." },
];
const TRACK_STEP_IDX = { confirmed: 0, packed: 1, shipped: 2, delivered: 3 };

const TRACK_STATUS_TO_STEP = {
  processing: 'confirmed',
  packed:     'packed',
  shipped:    'shipped',
  delivered:  'delivered',
};

function formatTrackTs(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-BD', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

async function fetchOrderStatus(orderId) {
  const res  = await fetch(`${getMidnightApiBase()}/track/${encodeURIComponent(orderId.trim().toUpperCase())}`);
  const json = await res.json();
  if (!json.ok) throw { code: 'not_found' };

  const d           = json.data;
  const currentStep = TRACK_STATUS_TO_STEP[d.status] ?? 'confirmed';

  const steps = {};
  for (const [key, val] of Object.entries(d.steps)) {
    steps[key] = val ? { timestamp: formatTrackTs(val.at), detail: val.detail } : null;
  }

  return { orderId: d.order_ref, currentStep, steps };
}

const TRACK_STATUS_LBL = { confirmed: "Confirmed", packed: "Packed", shipped: "In Transit", delivered: "Delivered" };
const TRACK_STATUS_MOD = { confirmed: "confirmed", packed: "packed", shipped: "transit",    delivered: "delivered" };
const BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;

function normalizeBdMobile(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (/^008801[3-9]\d{8}$/.test(digits)) return digits.slice(4);
  if (/^8801[3-9]\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^1[3-9]\d{8}$/.test(digits)) return `0${digits}`;
  return digits;
}

function isValidBdMobile(raw) {
  return BD_MOBILE_PATTERN.test(normalizeBdMobile(raw));
}

function TrackTimeline({ currentStep, stepData }) {
  const idx = TRACK_STEP_IDX[currentStep] ?? -1;
  return (
    <div className="track-timeline">
      {TRACK_STEPS.map((step, i) => {
        const s = i < idx ? "done" : i === idx ? "active" : "pending";
        const data = stepData?.[step.id];
        const isLast = i === TRACK_STEPS.length - 1;
        return (
          <div key={step.id} className="track-step">
            <div className="track-step-aside">
              <div className={`track-step-dot track-step-dot--${s}`} />
              {!isLast && <div className={`track-step-line track-step-line--${s === "done" ? "done" : "pending"}`} />}
            </div>
            <div className={"track-step-body" + (!isLast ? " track-step-body--gap" : "")}>
              <p className={"track-step-label" + (s === "pending" ? " track-step-label--dim" : "")}>{step.label}</p>
              {data?.timestamp && <p className="track-step-time">{data.timestamp}</p>}
              <p className={"track-step-detail" + (s === "pending" ? " track-step-detail--dim" : "")}>
                {data?.detail || (s !== "pending" ? step.detail : "Pending")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrackOrderModal({ open, onClose }) {
  const [orderId,   setOrderId]   = React.useState("");
  const [phase,     setPhase]     = React.useState("idle");
  const [orderData, setOrderData] = React.useState(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open) { setOrderId(""); setPhase("idle"); setOrderData(null); }
  }, [open]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleTrack = async () => {
    const id = orderId.trim();
    if (!id) { inputRef.current?.focus(); return; }
    setPhase("loading");
    try {
      const data = await fetchOrderStatus(id);
      setOrderData(data);
      setPhase("found");
    } catch { setPhase("not_found"); }
  };

  const reset = () => { setPhase("idle"); setOrderData(null); };
  const waUrl = `https://wa.me/8801829531588?text=${encodeURIComponent(`Hi! I need help tracking my order: ${orderId}`)}`;

  return (
    <div className="track-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Track your order">
      <div className="track-modal">
        <button className="track-modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={16} />
        </button>

        <div className="track-card-head">
          <h2>Track Your Order</h2>
          <p>Enter your Order ID from your confirmation message</p>
        </div>

        {(phase === "idle" || phase === "not_found") && (
          <div className="track-form">
            <div className="track-input-wrap">
              <i className="fa-solid fa-hashtag track-input-icon" aria-hidden="true" />
              <input
                ref={inputRef} autoFocus
                className="track-input" type="text" placeholder="e.g. MP-1005"
                value={orderId}
                onChange={e => { setOrderId(e.target.value); if (phase === "not_found") setPhase("idle"); }}
                onKeyDown={e => e.key === "Enter" && handleTrack()}
                aria-label="Order ID" autoComplete="off"
              />
            </div>
            <button className="track-btn" onClick={handleTrack}>
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Track Order
            </button>
          </div>
        )}

        {phase === "not_found" && (
          <div className="track-not-found">
            <div className="track-not-found-icon"><i className="fa-solid fa-box-open" /></div>
            <h3>Order not found</h3>
            <p>We couldn't find an order matching <strong>{orderId}</strong>. Check the ID in your confirmation message, or contact us directly.</p>
            <a href={waUrl} className="track-wa-btn" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-whatsapp" aria-hidden="true" /> Chat on WhatsApp
            </a>
          </div>
        )}

        {phase === "loading" && (
          <div className="track-loading">
            <div className="track-spinner" />
            <p>Looking up your order…</p>
          </div>
        )}

        {phase === "found" && orderData && (
          <div className="track-result">
            <div className="track-order-meta">
              <span className="track-order-id">#{orderData.orderId}</span>
              <span className={`track-status-badge track-status-badge--${TRACK_STATUS_MOD[orderData.currentStep]}`}>
                {TRACK_STATUS_LBL[orderData.currentStep]}
              </span>
            </div>
            <TrackTimeline currentStep={orderData.currentStep} stepData={orderData.steps} />
            <button className="track-reset-btn" onClick={reset}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Track another order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH MODAL (Login / Sign Up)
// ─────────────────────────────────────────────

// Module-level: the open modal registers its setServerError here so the GSI callback
// can surface errors back into React state.
let _gsiErrorReporter = null;
const AUTH_REDIRECT_KEY = "mp_auth_redirect_after_login";

async function _handleGoogleCredential(response) {
  try {
    const res  = await fetch(`${API_BASE}/auth/google`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ credential: response.credential }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message || "Google sign-in failed.");
    // Tokens are now in httpOnly cookies (set by backend), do not store in localStorage
    localStorage.setItem("mp_user", JSON.stringify(data.data.user));
    const redirect = localStorage.getItem(AUTH_REDIRECT_KEY);
    if (redirect) {
      localStorage.removeItem(AUTH_REDIRECT_KEY);
      window.location.href = redirect;
      return;
    }
    window.location.href = ROLE_ROUTES[data.data.user.role] || ROLE_ROUTES.user;
  } catch (err) {
    if (_gsiErrorReporter) _gsiErrorReporter(err.message);
    _gsiErrorReporter = null;
  }
}

function _initGsi() {
  const clientId = window.MP_CONFIG?.googleClientId;
  if (!clientId || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id:             clientId,
    callback:              _handleGoogleCredential,
    auto_select:           false,
    cancel_on_tap_outside: false,
  });
  // Set up error reporter for automatic prompts if modal is open
  // This will be overridden when user manually clicks the Google button
  if (!_gsiErrorReporter && window._authModalSetError) {
    _gsiErrorReporter = window._authModalSetError;
  }
}

// Register as the GSI library's own ready hook so the timing is guaranteed
// regardless of whether GSI or Babel finishes loading first.
window._gsiInit = _initGsi;
if (window._gsiReady || window.google?.accounts?.id) {
  _initGsi();
  window._gsiReady = false;
}

const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = ({ size = 16, open = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

function getMidnightApiBase() {
  if (window.MIDNIGHT_API_BASE) return window.MIDNIGHT_API_BASE.replace(/\/$/, "");

  const { protocol, hostname, port } = window.location;
  const base = (!port || port === "80" || port === "443")
    ? `${protocol}//${hostname}/api/v1`
    : `${protocol}//${hostname}:3000/api/v1`;
  window.MIDNIGHT_API_BASE = base;
  return base;
}

const API_BASE = getMidnightApiBase();
const AUTH_INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

const ROLE_ROUTES = {
  user:       "dashboard-user.html",
  crew:       "dashboard-user.html",
  influencer: "dashboard-influencer.html",
  admin:      "dashboard-admin.html",
};

(function setupAuthInactivityLogout() {
  if (window.mpAuthInactivity) return;

  const events = ["click", "keydown", "mousemove", "mousedown", "scroll", "touchstart", "wheel"];
  let started = false;
  let timer = null;
  let lastActivity = Date.now();

  function hasUser() {
    return !!localStorage.getItem("mp_user");
  }

  function markActivity() {
    lastActivity = Date.now();
  }

  function stop() {
    if (!started) return;
    started = false;
    if (timer) window.clearInterval(timer);
    timer = null;
    events.forEach(eventName => window.removeEventListener(eventName, markActivity));
  }

  function signOut() {
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
    localStorage.removeItem("mp_user");
    window.location.replace("index.html?session=inactive");
  }

  function start() {
    if (started || !hasUser()) return;
    started = true;
    markActivity();
    events.forEach(eventName => window.addEventListener(eventName, markActivity, { passive: true }));
    timer = window.setInterval(() => {
      if (!hasUser()) {
        stop();
        return;
      }
      if (Date.now() - lastActivity >= AUTH_INACTIVITY_LIMIT_MS) signOut();
    }, 1000);
  }

  window.mpAuthInactivity = { start, stop };
  start();
})();

function AuthModal({ open, onClose, title = "Join the Midnight Circle", subtitle = "Track orders, collect Midnight Points, reorder faster, and manage your monthly coffee plan.", postAuthRedirect = null }) {
  const [step,      setStep]      = React.useState("access");      // access | complete
  const [stepDir,   setStepDir]   = React.useState("fwd");         // fwd | back — drives slide direction
  const [method,    setMethod]    = React.useState("phone");       // phone | email
  const [otpStage,  setOtpStage]  = React.useState("entry");       // entry | code
  const [otpPurpose, setOtpPurpose] = React.useState("register");   // register | reset
  const [phone,     setPhone]     = React.useState("");
  const [otpDigits, setOtpDigits] = React.useState(["","","","","",""]);
  const [otpTimer,  setOtpTimer]  = React.useState(0);
  const [email,     setEmail]     = React.useState("");
  const [password,  setPassword]  = React.useState("");
  const [showPass,  setShowPass]  = React.useState(false);
  const [fullName,  setFullName]  = React.useState("");
  const [optEmail,  setOptEmail]  = React.useState("");
  const [newVia,    setNewVia]    = React.useState(null);          // how the new user arrived: phone | email
  const [pending,   setPending]   = React.useState(null);          // verified-phone auth payload awaiting profile completion
  const [emailMiss, setEmailMiss] = React.useState(false);         // failed email login → offer account creation
  const [errors,      setErrors]      = React.useState({});
  const [serverError, setServerError] = React.useState("");
  const [submitting,  setSubmitting]  = React.useState(false);
  const otpRefs = React.useRef([]);

  React.useEffect(() => {
    if (open) {
      if (postAuthRedirect) localStorage.setItem(AUTH_REDIRECT_KEY, postAuthRedirect);
      else localStorage.removeItem(AUTH_REDIRECT_KEY);
      setStep("access"); setStepDir("fwd"); setMethod("phone"); setOtpStage("entry"); setOtpPurpose("register");
      setPhone(""); setOtpDigits(["","","","","",""]); setOtpTimer(0);
      setEmail(""); setPassword(""); setShowPass(false);
      setFullName(""); setOptEmail(""); setNewVia(null); setPending(null); setEmailMiss(false);
      setErrors({}); setServerError(""); setSubmitting(false);
    } else {
      localStorage.removeItem(AUTH_REDIRECT_KEY);
    }
  }, [open, postAuthRedirect]);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) { _gsiErrorReporter = null; window.google?.accounts?.id?.cancel(); }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Set up error reporter for Google Auth when modal is open
  React.useEffect(() => {
    if (open) {
      _gsiErrorReporter = setServerError;
    } else {
      _gsiErrorReporter = null;
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setTimeout(() => setOtpTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [otpTimer]);

  React.useEffect(() => {
    if (open && otpStage === "code") setTimeout(() => otpRefs.current[0]?.focus(), 140);
  }, [open, otpStage]);

  if (!open) return null;

  const clearFeedback = () => { setErrors({}); setServerError(""); };

  const persistAndGo = (payload) => {
    // Tokens are now in httpOnly cookies (set by backend), do not store in localStorage
    localStorage.setItem("mp_user", JSON.stringify(payload.user));
    if (postAuthRedirect) {
      localStorage.removeItem(AUTH_REDIRECT_KEY);
      window.location.href = postAuthRedirect;
      return;
    }
    window.location.href = ROLE_ROUTES[payload.user.role] || ROLE_ROUTES.user;
  };

  const switchMethod = (m) => {
    if (m === method) return;
    setMethod(m); setEmailMiss(false); clearFeedback();
  };

  const handlePhoneLogin = async () => {
    const p = normalizeBdMobile(phone);
    const errs = {};
    if (!isValidBdMobile(p)) errs.phone = "Enter a valid Bangladesh mobile number, e.g. 017XXXXXXXX or +88017XXXXXXXX.";
    if (password && password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setPhone(p);
    setSubmitting(true); clearFeedback();
    try {
      const res = await fetch(`${API_BASE}/auth/phone/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password ? { phone: p, password } : { phone: p }),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error?.code === "PHONE_OTP_REQUIRED") {
          setOtpPurpose("register");
          const otpRes = await fetch(`${API_BASE}/auth/otp/send`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: p }),
            credentials: "include",
          });
          const otpData = await otpRes.json();
          if (!otpData.ok) throw new Error(otpData.error?.message || "Failed to send OTP.");
          setStepDir("fwd");
          setOtpStage("code");
          setOtpTimer(otpData.data.expires_in || 120);
          setSubmitting(false);
          return;
        }
        if (data.error?.code === "PASSWORD_REQUIRED") {
          setErrors({ password: "Enter your password." });
          setSubmitting(false);
          return;
        }
        throw new Error(data.error?.message || "We couldn't sign you in.");
      }
      persistAndGo(data.data);
    } catch (err) { setServerError(err.message); setSubmitting(false); }
  };

  const handleSendOtp = async (purpose = "register") => {
    const p = normalizeBdMobile(phone);
    if (!isValidBdMobile(p)) {
      setErrors({ phone: "Enter a valid Bangladesh mobile number, e.g. 017XXXXXXXX or +88017XXXXXXXX." });
      return;
    }
    setPhone(p);
    setSubmitting(true); clearFeedback();
    try {
      const res  = await fetch(`${API_BASE}/auth/otp/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "Failed to send OTP.");
      setOtpPurpose(purpose);
      setStepDir("fwd"); setOtpStage("code");
      setOtpTimer(data.data.expires_in || 120);
    } catch (err) { setServerError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (!/^\d{6}$/.test(code)) {
      setErrors({ otp: "Enter the 6-digit code." });
      return;
    }
    setSubmitting(true); clearFeedback();
    try {
      const res  = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeBdMobile(phone), otp: code }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "Invalid OTP.");
      if (data.data.user.is_new || !data.data.user.has_password || otpPurpose === "reset") {
        // New member / password reset → finish profile and set password
        setPending(data.data);
        setNewVia("phone");
        if (data.data.user.name) setFullName(data.data.user.name);
        setPassword("");
        setShowPass(false);
        setStepDir("fwd"); setStep("complete");
        setSubmitting(false);
      } else {
        // Existing member → straight in
        persistAndGo(data.data);
      }
    } catch (err) { setServerError(err.message); setSubmitting(false); }
  };

  const handleResendOtp = async () => {
    setOtpDigits(["","","","","",""]); setServerError(""); setSubmitting(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/otp/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeBdMobile(phone) }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message || "Failed to send OTP.");
      setOtpTimer(data.data.expires_in || 120);
    } catch (err) { setServerError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleEmailContinue = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = "Email address is required.";
    else if (!/\S+@\S+\.\S+/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true); clearFeedback();
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error?.code === "UNAUTHORIZED") setEmailMiss(true);
        throw new Error(data.error?.message || "We couldn't sign you in.");
      }
      persistAndGo(data.data);
    } catch (err) { setServerError(err.message); setSubmitting(false); }
  };

  const startEmailSignup = () => {
    if (password.length < 6) {
      setErrors({ password: "Pick a password of at least 6 characters first." });
      return;
    }
    clearFeedback(); setNewVia("email");
    setStepDir("fwd"); setStep("complete");
  };

  const handleComplete = async () => {
    const errs = {};
    if (!fullName.trim()) errs.name = "Full name is required.";
    if (newVia === "phone" && optEmail.trim() && !/\S+@\S+\.\S+/.test(optEmail.trim())) {
      errs.optEmail = "Enter a valid email address.";
    }
    if (newVia === "phone" && password.length < 6) {
      errs.password = "Set a password of at least 6 characters.";
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true); clearFeedback();
    try {
      if (newVia === "phone") {
        const body = { name: fullName.trim() };
        if (optEmail.trim()) body.email = optEmail.trim();
        const res  = await fetch(`${API_BASE}/me`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
          credentials: 'include',
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error?.message || "Couldn't save your details.");
        const passRes = await fetch(`${API_BASE}/me/password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          credentials: "include",
        });
        const passData = await passRes.json();
        if (!passData.ok) throw new Error(passData.error?.message || "Couldn't save your password.");
        persistAndGo({ ...pending, user: { ...pending.user, ...data.data } });
      } else {
        const res  = await fetch(`${API_BASE}/auth/register`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fullName.trim(), email: email.trim(), password }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error?.message || "Couldn't create your account.");
        persistAndGo(data.data);
      }
    } catch (err) { setServerError(err.message); setSubmitting(false); }
  };

  const handleGoogleClick = () => {
    setServerError("");
    if (!window.google?.accounts?.id) {
      setServerError("Google Sign-In is not loaded yet — please refresh the page.");
      return;
    }
    _gsiErrorReporter = setServerError;
    window.google.accounts.id.prompt((note) => {
      if (note.isNotDisplayed()) {
        const reason = note.getNotDisplayedReason();
        const msg = {
          opt_out_or_no_session:  "No Google session found. Please sign in to Google first, then try again.",
          suppressed_by_user:     "Google sign-in was suppressed. Try again or allow pop-ups for this site.",
          unregistered_origin:    "This site is not yet authorised in Google Cloud Console.",
          browser_not_supported:  "Your browser does not support Google One Tap.",
        }[reason] || `Google sign-in unavailable (${reason}).`;
        if (_gsiErrorReporter) _gsiErrorReporter(msg);
        _gsiErrorReporter = null;
      } else if (note.isSkippedMoment() || note.isDismissedMoment()) {
        _gsiErrorReporter = null;
      }
    });
  };

  const reassurance = (
    <p className="auth-reassure">
      <strong>New here?</strong> We'll create your account after verification.{" "}
      <strong>Already a member?</strong> We'll sign you in automatically.
    </p>
  );

  /* ── Window 1 — universal access ── */
  const accessStep = (
    <div key={`access-${otpStage}`} className={`auth-step auth-step--${stepDir}`}>
      <div className="midnight-member-badge">Midnight Member Access</div>
      <h2 className="auth-title">{title}</h2>

      {otpStage === "entry" ? (
        <>
          <p className="auth-sub">{subtitle}</p>

          <div className={`auth-method-switch auth-method-switch--${method}`} role="tablist" aria-label="Sign-in method">
            <span className="auth-method-thumb" aria-hidden="true" />
            <button type="button" role="tab" aria-selected={method === "phone"} className={`auth-method-btn${method === "phone" ? " active" : ""}`} onClick={() => switchMethod("phone")}>
              <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /> Phone
            </button>
            <button type="button" role="tab" aria-selected={method === "email"} className={`auth-method-btn${method === "email" ? " active" : ""}`} onClick={() => switchMethod("email")}>
              <i className="fa-solid fa-envelope" aria-hidden="true" /> Email
            </button>
          </div>

          {method === "phone" ? (
            <div className="auth-form">
              <div className="auth-field">
                <label className="auth-label" htmlFor="mp-auth-phone">Phone Number</label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-phone auth-input-icon" aria-hidden="true" />
                  <input
                    id="mp-auth-phone"
                    className={`auth-input${errors.phone ? " error" : ""}`}
                    type="tel"
                    placeholder="01X XXXX XXXX"
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 20)); if (errors.phone) setErrors(p => ({ ...p, phone: undefined })); }}
                    onKeyDown={e => e.key === "Enter" && handlePhoneLogin()}
                    autoComplete="tel"
                    autoFocus
                  />
                </div>
                {errors.phone && <span className="auth-field-err">{errors.phone}</span>}
                {phone.trim() && !isValidBdMobile(phone) && !errors.phone && (
                  <span className="auth-field-err">Use a Bangladesh mobile number: 013-019, 11 digits locally or +880 format.</span>
                )}
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="mp-auth-phone-pass">Password</label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-lock auth-input-icon" aria-hidden="true" />
                  <input
                    id="mp-auth-phone-pass"
                    className={`auth-input auth-input--pass${errors.password ? " error" : ""}`}
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                    onKeyDown={e => e.key === "Enter" && handlePhoneLogin()}
                    autoComplete="current-password"
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPass(v => !v)} aria-label={showPass ? "Hide password" : "Show password"}>
                    <EyeIcon size={15} open={showPass} />
                  </button>
                </div>
                {errors.password && <span className="auth-field-err">{errors.password}</span>}
              </div>
              {serverError && <p className="auth-server-err">{serverError}</p>}
              <button type="button" className={`auth-submit-btn${submitting ? " loading" : ""}`} disabled={submitting} onClick={handlePhoneLogin}>
                {submitting ? <span className="sub-spinner" aria-hidden="true" /> : <>Sign In <i className="fa-solid fa-arrow-right-long" aria-hidden="true" /></>}
              </button>
              <div className="auth-new-here">
                <span>New here? Enter your phone and continue.</span>
                <button type="button" onClick={() => handleSendOtp("reset")}>
                  Forgot password?
                </button>
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleEmailContinue} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="mp-auth-email">Email Address</label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-envelope auth-input-icon" aria-hidden="true" />
                  <input
                    id="mp-auth-email"
                    className={`auth-input${errors.email ? " error" : ""}`}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && <span className="auth-field-err">{errors.email}</span>}
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="mp-auth-pass">Password</label>
                <div className="auth-input-wrap">
                  <i className="fa-solid fa-lock auth-input-icon" aria-hidden="true" />
                  <input
                    id="mp-auth-pass"
                    className={`auth-input auth-input--pass${errors.password ? " error" : ""}`}
                    type={showPass ? "text" : "password"}
                    placeholder="Your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                    autoComplete="current-password"
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPass(v => !v)} aria-label={showPass ? "Hide password" : "Show password"}>
                    <EyeIcon size={15} open={showPass} />
                  </button>
                </div>
                {errors.password && <span className="auth-field-err">{errors.password}</span>}
              </div>
              {serverError && <p className="auth-server-err">{serverError}</p>}
              <button type="submit" className={`auth-submit-btn${submitting ? " loading" : ""}`} disabled={submitting}>
                {submitting ? <span className="sub-spinner" aria-hidden="true" /> : "Continue with Email"}
              </button>
              {emailMiss && (
                <div className="auth-new-here">
                  <span>First time at Midnight Pick?</span>
                  <button type="button" onClick={startEmailSignup}>
                    Create my account with this email <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />
                  </button>
                </div>
              )}
            </form>
          )}

          {method === "email" && (
            <>
              <div className="auth-divider"><span>or</span></div>

              <button className="auth-google-btn" type="button" onClick={handleGoogleClick}>
                <GoogleIcon size={18} />
                <span>Continue with Google</span>
              </button>
            </>
          )}

          {reassurance}
        </>
      ) : (
        <>
          <div className="auth-otp-intro">
            <p className="auth-otp-hint">Enter the 6-digit code sent to</p>
            <p className="auth-otp-phone">{phone}</p>
            <p className="auth-otp-via">via WhatsApp / SMS</p>
          </div>

          <div className="auth-otp-row">
            {[0,1,2,3,4,5].map(i => (
              <input
                key={i}
                ref={el => otpRefs.current[i] = el}
                className={`auth-otp-box${errors.otp ? " error" : ""}${otpDigits[i] ? " filled" : ""}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otpDigits[i]}
                disabled={submitting}
                autoComplete="one-time-code"
                aria-label={`Digit ${i + 1}`}
                onChange={e => {
                  if (!/^\d*$/.test(e.target.value)) return;
                  const d = [...otpDigits]; d[i] = e.target.value.slice(-1);
                  setOtpDigits(d);
                  if (errors.otp) setErrors(p => ({ ...p, otp: undefined }));
                  if (e.target.value && i < 5) otpRefs.current[i + 1]?.focus();
                }}
                onKeyDown={e => {
                  if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
                    const d = [...otpDigits]; d[i - 1] = "";
                    setOtpDigits(d); otpRefs.current[i - 1]?.focus();
                  }
                }}
                onPaste={e => {
                  const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                  if (!pasted) return;
                  e.preventDefault();
                  const d = Array(6).fill(""); pasted.split("").forEach((c, j) => { d[j] = c; });
                  setOtpDigits(d);
                  otpRefs.current[Math.min(pasted.length, 5)]?.focus();
                }}
              />
            ))}
          </div>

          {errors.otp    && <p className="auth-server-err">{errors.otp}</p>}
          {serverError   && <p className="auth-server-err">{serverError}</p>}

          <button
            type="button"
            className={`auth-submit-btn${submitting ? " loading" : ""}`}
            disabled={submitting || otpDigits.some(d => !d)}
            onClick={handleVerifyOtp}
          >
            {submitting ? <span className="sub-spinner" aria-hidden="true" /> : "Verify & Continue"}
          </button>

          <div className="auth-otp-meta">
            {otpTimer > 0
              ? <span>
                  <i className="fa-regular fa-clock" aria-hidden="true" style={{ marginRight: 5 }} />
                  Resend in <strong>{Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}</strong>
                </span>
              : <button type="button" className="auth-link" onClick={handleResendOtp}>Resend OTP</button>
            }
            <span className="auth-otp-sep">·</span>
            <button type="button" className="auth-link" onClick={() => { setStepDir("back"); setOtpStage("entry"); setOtpDigits(["","","","","",""]); clearFeedback(); }}>
              Change number
            </button>
          </div>

          {reassurance}
        </>
      )}
    </div>
  );

  /* ── Window 2 — complete account (new members only) ── */
  const completeStep = (
    <div key="complete" className={`auth-step auth-step--${stepDir}`}>
      <div className="midnight-member-badge">Almost There</div>
      <h2 className="auth-title">{otpPurpose === "reset" ? "Set a new password" : "Complete your account"}</h2>
      <div className="auth-verified-chip">
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        {newVia === "phone"
          ? <span>Phone verified · <strong>{phone}</strong></span>
          : <span>Joining as <strong>{email.trim()}</strong></span>}
      </div>

      <div className="auth-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="mp-auth-name">Full Name</label>
          <div className="auth-input-wrap">
            <i className="fa-solid fa-user auth-input-icon" aria-hidden="true" />
            <input
              id="mp-auth-name"
              className={`auth-input${errors.name ? " error" : ""}`}
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={e => { setFullName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }}
              onKeyDown={e => e.key === "Enter" && handleComplete()}
              autoComplete="name"
              autoFocus
            />
          </div>
          {errors.name && <span className="auth-field-err">{errors.name}</span>}
        </div>

        {newVia === "phone" && (
          <div className="auth-field">
            <label className="auth-label" htmlFor="mp-auth-opt-email">Email Address <span className="auth-optional">Optional</span></label>
            <div className="auth-input-wrap">
              <i className="fa-solid fa-envelope auth-input-icon" aria-hidden="true" />
              <input
                id="mp-auth-opt-email"
                className={`auth-input${errors.optEmail ? " error" : ""}`}
                type="email"
                placeholder="you@example.com"
                value={optEmail}
                onChange={e => { setOptEmail(e.target.value); if (errors.optEmail) setErrors(p => ({ ...p, optEmail: undefined })); }}
                onKeyDown={e => e.key === "Enter" && handleComplete()}
                autoComplete="email"
              />
            </div>
            {errors.optEmail && <span className="auth-field-err">{errors.optEmail}</span>}
          </div>
        )}

        {newVia === "phone" && (
          <div className="auth-field">
            <label className="auth-label" htmlFor="mp-auth-new-pass">Password</label>
            <div className="auth-input-wrap">
              <i className="fa-solid fa-lock auth-input-icon" aria-hidden="true" />
              <input
                id="mp-auth-new-pass"
                className={`auth-input auth-input--pass${errors.password ? " error" : ""}`}
                type={showPass ? "text" : "password"}
                placeholder="Set at least 6 characters"
                value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                onKeyDown={e => e.key === "Enter" && handleComplete()}
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPass(v => !v)} aria-label={showPass ? "Hide password" : "Show password"}>
                <EyeIcon size={15} open={showPass} />
              </button>
            </div>
            {errors.password && <span className="auth-field-err">{errors.password}</span>}
          </div>
        )}

        {serverError && <p className="auth-server-err">{serverError}</p>}

        <button type="button" className={`auth-submit-btn${submitting ? " loading" : ""}`} disabled={submitting} onClick={handleComplete}>
          {submitting ? <span className="sub-spinner" aria-hidden="true" /> : (otpPurpose === "reset" ? "Save New Password" : "Create My Account")}
        </button>

        <p className="auth-footnote">{otpPurpose === "reset" ? "Use this password for your next phone login." : "You can update these details anytime from your dashboard."}</p>
      </div>
    </div>
  );

  return (
    <div
      className="auth-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={step === "complete" ? "Complete your Midnight Pick account" : "Join the Midnight Circle"}
    >
      <div className="auth-modal">
        <div className="auth-glow" aria-hidden="true" />
        <div className="auth-sheet-handle" aria-hidden="true" />

        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          <CloseIcon size={16} />
        </button>

        {step === "complete" && newVia === "email" && (
          <button className="auth-back-btn" onClick={() => { setStepDir("back"); setStep("access"); clearFeedback(); }} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}

        <div className="auth-pane">
          <div className={`auth-dots${step === "complete" && newVia === "email" ? " auth-dots--offset" : ""}`} aria-hidden="true">
            <span className={`auth-dot${step === "access" ? " active" : " done"}`} />
            <span className={`auth-dot${step === "complete" ? " active" : ""}`} />
          </div>
          {step === "access" ? accessStep : completeStep}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Logo,
  CartIcon, HeartIcon, UserIcon, ArrowRight, ArrowUpRight, Plus, Chev, Check, Star,
  MenuGridIcon, CloseIcon,
  IconCoffeeSack, IconBullseye, IconQualityBadge,
  StepPick, StepSundry, StepRoast, StepGrind, StepJar,
  SocialIcons,
  SubscribeModal,
  TrackOrderModal,
  AuthModal,
});
