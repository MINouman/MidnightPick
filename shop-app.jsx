// midnight pick -  shop page
const { useState, useEffect, useRef } = React;

const PRODUCT_DEFAULT = {
  id: null,
  category: "",
  name: "",
  status: "active",
  inStock: true,
  badge: "",
  price: 0,
  desc: "",
  roast: "",
  origin: "",
  blend: "",
  process: "",
  weight: "",
  images: [],
};


const API_BASE = window.MIDNIGHT_API_BASE || "http://localhost:3000/api/v1";
const THUMB_LABELS = ["Front", "Back"];

// ── Bangladesh city → area map ────────────────────────────────────────────────
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

// ── minimal header ────────────────────────────────────────────────────────────
const ROLE_DASH = { user: "dashboard-user.html", crew: "dashboard-crew.html", influencer: "dashboard-influencer.html", admin: "dashboard-admin.html" };

function getShopAuthState() {
  try {
    if (!localStorage.getItem("mp_access_token")) return { loggedIn: false, dashUrl: "dashboard-user.html", user: null };
    const u = JSON.parse(localStorage.getItem("mp_user") || "{}");
    return { loggedIn: true, dashUrl: ROLE_DASH[u.role] || "dashboard-user.html", user: u };
  } catch { return { loggedIn: false, dashUrl: "dashboard-user.html", user: null }; }
}

function ShopHeader({ cartCount, onSignIn, onCart, productName, loggedIn, dashUrl, onLogout }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="shop-header">
      <a href="index.html" className="shop-header-back" aria-label="Back to home">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
        <span>Home</span>
        {productName && (
          <>
            <span className="shop-breadcrumb-sep">/</span>
            <span className="shop-breadcrumb-current">{productName}</span>
          </>
        )}
      </a>
      <div className="shop-header-actions">
        {loggedIn ? (
          <>
            <a href={dashUrl} className="nav-signin-btn">
              <i className="fa-solid fa-gauge" aria-hidden="true" />
              Dashboard
            </a>
            <button className="nav-signin-btn" onClick={onLogout}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
              Log Out
            </button>
          </>
        ) : (
          <button className="nav-signin-btn" onClick={onSignIn}>
            <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
            Sign In
          </button>
        )}
        <button className="nav-cart-btn" onClick={onCart} aria-label={`Cart -  ${cartCount} item${cartCount !== 1 ? "s" : ""}`}>
          <CartIcon size={19} />
          <span className="nav-cart-badge">{cartCount}</span>
        </button>
      </div>
    </header>
  );
}

function ShopStarRating({ rating, reviews }) {
  const scrollToReviews = () => {
    document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <button
      className="shop-rating"
      onClick={scrollToReviews}
      aria-label="Read customer reviews"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
    >
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} filled={i <= Math.round(rating)} />
      ))}
      <span className="shop-rating-num">{rating}</span>
      <span className="shop-rating-reviews" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>({reviews} reviews)</span>
    </button>
  );
}

function ShopToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div className="toast" key={t.id}>
          <span className="dot" />
          <span>Added <strong>{t.name}</strong> to cart</span>
        </div>
      ))}
    </div>
  );
}

function CartPanel({ cart, onClose }) {
  const grouped = Object.values(
    cart.reduce((acc, item) => {
      if (!acc[item.id]) acc[item.id] = { ...item, totalQty: 0, totalAmt: 0 };
      acc[item.id].totalQty += item.qty;
      acc[item.id].totalAmt += item.price * item.qty;
      return acc;
    }, {})
  );
  const total = grouped.reduce((s, i) => s + i.totalAmt, 0);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "min(380px, 100vw)", background: "#FFFDF7", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(87,31,41,.12)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#571F29" }}>
            Cart ({grouped.length} item{grouped.length !== 1 ? "s" : ""})
          </span>
          <button onClick={onClose} aria-label="Close cart" style={{ background: "none", border: "none", cursor: "pointer", color: "#571F29", padding: 4 }}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {grouped.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(87,31,41,.5)" }}>
              <i className="fa-solid fa-bag-shopping" style={{ fontSize: 36, marginBottom: 12, display: "block" }} aria-hidden="true" />
              <p style={{ margin: 0, fontSize: 14, fontFamily: "var(--font-body)" }}>Your cart is empty.</p>
            </div>
          ) : grouped.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(87,31,41,.08)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#571F29", fontFamily: "var(--font-display)" }}>Midnight Blend - 95g Pouch</div>
                <div style={{ fontSize: 12, color: "rgba(87,31,41,.6)", marginTop: 2 }}>×{item.totalQty}</div>
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#FF9100", fontSize: 15 }}>৳{item.totalAmt.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {grouped.length > 0 && (
          <div style={{ padding: 20, borderTop: "1px solid rgba(87,31,41,.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#571F29", marginBottom: 16 }}>
              <span>Total</span>
              <span style={{ color: "#FF9100" }}>৳{total.toLocaleString()}</span>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(87,31,41,.6)", fontFamily: "var(--font-body)" }}>
              Items in your cart are saved here. Click "Buy Now" on the product page to place an order.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Modal ───────────────────────────────────────────────────────────────
function OrderModal({ open, onClose, product, qty, discount, coupon, loggedUser }) {
  const [step, setStep]           = useState("form"); // form | otp | loading | success | error
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [city, setCity]           = useState("");
  const [area, setArea]           = useState("");
  const [street, setStreet]       = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [orderRef, setOrderRef]   = useState("");
  const [isBusy, setIsBusy]       = useState(false);
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const [otpError, setOtpError]   = useState("");
  const [timeLeft, setTimeLeft]   = useState(120);
  const [timerKey, setTimerKey]   = useState(0);
  const otpRefs  = useRef([]);
  const timerRef = useRef(null);

  const finalPrice = product.price - discount;
  const totalPrice = finalPrice * qty;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Full reset when modal opens
  useEffect(() => {
    if (open) {
      setStep("form"); setErrorMsg(""); setOrderRef("");
      setOtpDigits(["","","","","",""]); setOtpError("");
      setIsBusy(false); setTimerKey(0);
      setCity(""); setArea(""); setStreet("");
      setName(loggedUser?.name || "");
      setPhone(loggedUser?.phone || "");
    }
  }, [open]);

  // 2-minute countdown -  starts/resets whenever we enter the OTP step
  useEffect(() => {
    if (step !== "otp") return;
    setTimeLeft(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); timerRef.current = null; return 0; }
        return t - 1;
      });
    }, 1000);
    setTimeout(() => otpRefs.current[0]?.focus(), 80);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, timerKey]);

  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!open) return null;

  const composedAddress = [street.trim(), area, city].filter(Boolean).join(", ");

  // ── Shared styles ──────────────────────────────────────────────────────────
  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,.52)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" };
  const panel   = { background: "#FFFDF7", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.28)", overflow: "hidden" };
  const field   = { width: "100%", padding: "11px 14px", fontFamily: "var(--font-body)", fontSize: 14, border: "1.5px solid rgba(87,31,41,.18)", borderRadius: 8, background: "#fff", color: "#1A0A0D", outline: "none", boxSizing: "border-box" };
  const lbl     = { display: "block", fontSize: 12, fontWeight: 600, color: "rgba(87,31,41,.65)", marginBottom: 5, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".04em" };
  const hdr     = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid rgba(87,31,41,.1)" };
  const summary = { padding: "13px 22px", background: "rgba(87,31,41,.04)", borderBottom: "1px solid rgba(87,31,41,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const primBtn = (busy) => ({ width: "100%", padding: "14px 0", background: busy ? "rgba(87,31,41,.35)" : "#571F29", color: "#F7E3C9", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, border: "none", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background .2s" });

  // ── Order summary strip ────────────────────────────────────────────────────
  const SummaryStrip = () => (
    <div style={summary}>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#571F29" }}>
          {product.name} -  {product.weight} × {qty}
        </div>
        {discount > 0 && <div style={{ fontSize: 11, color: "rgba(87,31,41,.5)", marginTop: 2 }}>Coupon applied -  ৳{discount} off / unit</div>}
      </div>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "#FF9100" }}>৳{totalPrice.toLocaleString()}</span>
    </div>
  );

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === "success") return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panel}>
        <div style={{ padding: "36px 28px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(46,94,31,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 28, color: "#2E5E1F" }} aria-hidden="true" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "#571F29", margin: "0 0 6px" }}>Order Placed!</h2>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#FF9100", margin: "0 0 14px" }}>#{orderRef}</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(87,31,41,.7)", margin: "0 0 6px", lineHeight: 1.5 }}>
            A confirmation SMS has been sent to <strong>{phone}</strong>.
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.5)", margin: "0 0 26px", lineHeight: 1.5 }}>
            Our team will contact you shortly to confirm delivery.
          </p>
          <button onClick={onClose} style={{ padding: "12px 36px", background: "#571F29", color: "#F7E3C9", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Done</button>
        </div>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (step === "error") return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panel}>
        <div style={{ padding: "36px 28px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(200,40,40,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <i className="fa-solid fa-circle-xmark" style={{ fontSize: 28, color: "#C82828" }} aria-hidden="true" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "#571F29", margin: "0 0 10px" }}>Something went wrong</h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(87,31,41,.7)", margin: "0 0 24px", lineHeight: 1.5 }}>{errorMsg}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => setStep("form")} style={{ padding: "11px 24px", background: "#571F29", color: "#F7E3C9", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Try Again</button>
            <button onClick={onClose} style={{ padding: "11px 24px", background: "rgba(87,31,41,.08)", color: "#571F29", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── OTP Step ───────────────────────────────────────────────────────────────
  if (step === "otp") {
    const otpComplete = otpDigits.every(d => d !== "");

    const handleDigit = (idx, val) => {
      if (!/^\d*$/.test(val)) return;
      const d = [...otpDigits]; d[idx] = val.slice(-1);
      setOtpDigits(d);
      if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    };

    const handleKey = (idx, e) => {
      if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
        const d = [...otpDigits]; d[idx - 1] = "";
        setOtpDigits(d);
        otpRefs.current[idx - 1]?.focus();
      }
    };

    const handlePaste = (e) => {
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;
      e.preventDefault();
      const d = Array(6).fill(""); pasted.split("").forEach((c, i) => { d[i] = c; });
      setOtpDigits(d);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleVerify = async () => {
      if (!otpComplete || isBusy) return;
      setIsBusy(true); setOtpError("");
      try {
        const res  = await fetch(`${API_BASE}/orders/guest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), phone: phone.trim(), address: composedAddress, qty, otp: otpDigits.join(""), ...(coupon ? { coupon_code: coupon } : {}), ...(product?.id ? { product_id: product.id } : {}) }),
        });
        const json = await res.json();
        if (!res.ok) {
          const code = json?.error?.code;
          if (code === "INVALID_OTP" || code === "OTP_MAX_ATTEMPTS") {
            setOtpError(json.error.message);
          } else {
            setErrorMsg(json?.error?.message || "Order failed. Please try again.");
            setStep("error");
          }
          return;
        }
        setOrderRef(json.data.order_ref);
        setStep("success");
      } catch (err) {
        setErrorMsg(err.message);
        setStep("error");
      } finally {
        setIsBusy(false);
      }
    };

    const resendOtp = async () => {
      try {
        await fetch(`${API_BASE}/orders/request-otp`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim() }),
        });
        setOtpDigits(["","","","","",""]); setOtpError("");
        setTimerKey(k => k + 1);
      } catch {}
    };

    return (
      <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={panel}>
          {/* Header */}
          <div style={hdr}>
            <button onClick={() => setStep("form")} aria-label="Back" style={{ background: "none", border: "none", cursor: "pointer", color: "#571F29", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "#571F29" }}>Verify Phone</span>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#571F29", fontSize: 20, lineHeight: 1 }}>×</button>
          </div>

          <SummaryStrip />

          <div style={{ padding: "26px 22px 24px" }}>
            {/* Instruction */}
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(87,31,41,.75)", margin: "0 0 22px", textAlign: "center", lineHeight: 1.5 }}>
              Enter the 6-digit code sent to<br />
              <strong style={{ color: "#571F29" }}>{phone}</strong>
            </p>

            {/* 6-box input */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }}>
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text" inputMode="numeric" maxLength={1}
                  value={otpDigits[i]}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKey(i, e)}
                  onPaste={handlePaste}
                  disabled={isBusy}
                  style={{ width: 44, height: 52, textAlign: "center", fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", border: `2px solid ${otpDigits[i] ? "#571F29" : "rgba(87,31,41,.22)"}`, borderRadius: 10, background: otpDigits[i] ? "rgba(87,31,41,.04)" : "#fff", color: "#571F29", outline: "none", transition: "border-color .15s, background .15s" }}
                />
              ))}
            </div>

            {/* OTP error */}
            {otpError && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#C82828", textAlign: "center", margin: "0 0 12px", background: "rgba(200,40,40,.06)", padding: "8px 12px", borderRadius: 7 }}>
                <i className="fa-solid fa-circle-xmark" aria-hidden="true" style={{ marginRight: 5 }} />{otpError}
              </p>
            )}

            {/* Timer / Resend */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              {timeLeft > 0 ? (
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.5)" }}>
                  <i className="fa-regular fa-clock" aria-hidden="true" style={{ marginRight: 5 }} />
                  Resend in <strong style={{ color: "#571F29", fontVariantNumeric: "tabular-nums" }}>{fmtTime(timeLeft)}</strong>
                </span>
              ) : (
                <button onClick={resendOtp} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#FF9100", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" style={{ marginRight: 5 }} />Resend OTP
                </button>
              )}
            </div>

            {/* Confirm button */}
            <button onClick={handleVerify} disabled={!otpComplete || isBusy} style={primBtn(!otpComplete || isBusy)}>
              {isBusy
                ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Placing Order…</>
                : <><i className="fa-solid fa-check" aria-hidden="true" /> Confirm Order -  ৳{totalPrice.toLocaleString()}</>
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form Step ──────────────────────────────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city || !street.trim() || isBusy) return;
    setIsBusy(true);

    if (loggedUser?.phone) {
      // Authenticated — skip OTP, place order directly
      try {
        const token = localStorage.getItem("mp_access_token");
        const res = await fetch(`${API_BASE}/orders/quick`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            qty,
            address: composedAddress,
            ...(coupon ? { coupon_code: coupon } : {}),
            ...(product?.id ? { product_id: product.id } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setErrorMsg(json?.error?.message || "Order failed. Please try again.");
          setStep("error");
          return;
        }
        setOrderRef(json.data.order_ref);
        setStep("success");
      } catch (err) {
        setErrorMsg(err.message);
        setStep("error");
      } finally {
        setIsBusy(false);
      }
      return;
    }

    // Guest — send OTP first
    try {
      const res = await fetch(`${API_BASE}/orders/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to send OTP.");
      setOtpDigits(["","","","","",""]); setOtpError("");
      setStep("otp");
    } catch (err) {
      setErrorMsg(err.message);
      setStep("error");
    } finally {
      setIsBusy(false);
    }
  };

  const canSubmit = name.trim() && phone.trim().length >= 11 && city && street.trim() && !isBusy;

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panel}>
        <div style={hdr}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "#571F29" }}>Place Order</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "#571F29", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <SummaryStrip />

        <form onSubmit={handleFormSubmit} style={{ padding: "20px 22px 22px" }}>
          {loggedUser?.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", background: "rgba(46,168,107,.08)", borderRadius: 8, border: "1px solid rgba(46,168,107,.2)" }}>
              <i className="fa-solid fa-circle-check" style={{ color: "#2ea86b", fontSize: 14 }} aria-hidden="true" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2ea86b", fontWeight: 600 }}>Logged in — no OTP needed</span>
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Full Name</label>
            <input style={{ ...field, ...(loggedUser?.name ? { background: "rgba(87,31,41,.04)", color: "rgba(26,10,13,.6)" } : {}) }} type="text" placeholder="Your full name" value={name}
              onChange={e => !loggedUser?.name && setName(e.target.value)} required disabled={isBusy || !!(loggedUser?.name)} autoFocus={!loggedUser?.name} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Phone Number</label>
            <input style={{ ...field, ...(loggedUser?.phone ? { background: "rgba(87,31,41,.04)", color: "rgba(26,10,13,.6)" } : {}) }} type="tel" placeholder="01XXXXXXXXX" value={phone}
              onChange={e => !loggedUser?.phone && setPhone(e.target.value)} required minLength={11} disabled={isBusy || !!(loggedUser?.phone)} />
          </div>
          {/* ── Delivery Address — structured ── */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Delivery Address</label>

            {/* City + Area row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              {/* City */}
              <div style={{ position: "relative" }}>
                <select
                  style={{ ...field, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: "pointer", color: city ? "#1A0A0D" : "rgba(26,10,13,.38)" }}
                  value={city}
                  onChange={e => { setCity(e.target.value); setArea(""); }}
                  required
                  disabled={isBusy}
                >
                  <option value="" disabled>City</option>
                  {Object.keys(BD_AREAS).sort().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down" aria-hidden="true" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(87,31,41,.45)", pointerEvents: "none" }} />
              </div>

              {/* Area */}
              <div style={{ position: "relative" }}>
                <select
                  style={{ ...field, appearance: "none", WebkitAppearance: "none", paddingRight: 30, cursor: city ? "pointer" : "not-allowed", color: area ? "#1A0A0D" : "rgba(26,10,13,.38)", opacity: city ? 1 : 0.55 }}
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  disabled={!city || isBusy}
                >
                  <option value="">{city ? "Select area" : "Area"}</option>
                  {(BD_AREAS[city] || []).map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down" aria-hidden="true" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(87,31,41,.45)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Street address */}
            <input
              style={field}
              type="text"
              placeholder="House no., road, block, building…"
              value={street}
              onChange={e => setStreet(e.target.value)}
              required
              disabled={isBusy}
            />
          </div>
          <button type="submit" disabled={!canSubmit} style={primBtn(!canSubmit)}>
            {isBusy
              ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> {loggedUser?.phone ? "Placing Order…" : "Sending OTP…"}</>
              : loggedUser?.phone
                ? <><i className="fa-solid fa-check" aria-hidden="true" /> Place Order — ৳{totalPrice.toLocaleString()}</>
                : <><i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /> Send Verification Code</>
            }
          </button>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "rgba(87,31,41,.4)", fontFamily: "var(--font-body)", textAlign: "center" }}>
            {loggedUser?.phone ? "Cash on delivery · Your order will be confirmed immediately" : "Cash on delivery · A code will be sent to your number"}
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Buy Sheet (mobile) ────────────────────────────────────────────────────────
function BuySheet({ open, onClose, qty, setQty, coupon, setCoupon, couponStatus, setCouponStatus, couponError, discount, verifyCoupon, addToCart, addedAnim, product, onBuyNow }) {
  const finalPrice = product.price - discount;
  const totalPrice = finalPrice * qty;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="buy-sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="buy-sheet">
        <div className="buy-sheet-handle" />

        <div className="buy-sheet-header">
          <div>
            <div className="buy-sheet-product-name">{product.name} -  {product.weight}</div>
            <div className="buy-sheet-price">
              ৳{totalPrice.toLocaleString()}
              {discount > 0 && (
                <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(87,31,41,0.5)", textDecoration: "line-through", marginLeft: 8 }}>
                  ৳{(product.price * qty).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button className="buy-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* coupon -  force row layout even on mobile */}
        <div className="shop-coupon-row">
          <div className="shop-coupon-wrap" style={{ flexDirection: "row", borderRadius: 8 }}>
            <input
              className={"shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : "")}
              type="text"
              placeholder="Enter coupon code"
              value={coupon}
              onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponStatus("idle"); }}
              onKeyDown={e => e.key === "Enter" && verifyCoupon()}
              aria-label="Coupon code"
            />
            <button className="shop-coupon-btn" onClick={verifyCoupon} style={{ borderRadius: 0, padding: "0 18px" }}>Verify</button>
          </div>
          {couponStatus === "ok" && (
            <span className="shop-coupon-msg shop-coupon-msg--ok">
              <i className="fa-solid fa-circle-check" aria-hidden="true" /> Coupon applied -  ৳{discount} off
            </span>
          )}
          {couponStatus === "err" && (
            <span className="shop-coupon-msg shop-coupon-msg--err">
              <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> {couponError}
            </span>
          )}
        </div>

        {/* qty + proceed */}
        <div className="shop-qty-row" style={{ marginBottom: 14 }}>
          <div className="shop-qty">
            <button className="shop-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span className="shop-qty-val">{qty}</span>
            <button className="shop-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase quantity">+</button>
          </div>
          <button className="shop-add-btn" onClick={onBuyNow}>Order Now</button>
        </div>
      </div>
    </div>
  );
}

// ── Reviews Section ───────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#7B2D38","#B84A1A","#5E3A1E","#2B5C30","#1A4D6E","#6A3D72"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function ReviewsSection({ productSlug = "midnight-blend", onStats }) {
  const [reviews, setReviews]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [avgRating, setAvgRating]     = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [formRating, setFormRating]   = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [formName, setFormName]       = useState("");
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitDone, setSubmitDone]   = useState(false);
  const formRef = useRef(null);
  const LIMIT = 5;

  const fetchReviews = async (p = 1) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/reviews?product=${productSlug}&page=${p}&limit=${LIMIT}`);
      const json = await res.json();
      if (json.ok) {
        setReviews(prev => p === 1 ? json.data.reviews : [...prev, ...json.data.reviews]);
        setTotal(json.data.total);
        if (p === 1) {
          const avg = json.data.avg_rating || 0;
          setAvgRating(avg);
          if (onStats) onStats({ rating: avg, count: json.data.total });
        }
        setPage(p);
      }
    } catch { /* non-critical */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(1); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRating || !formName.trim() || formComment.trim().length < 5) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_slug: productSlug, reviewer_name: formName.trim(), rating: formRating, comment: formComment.trim() }),
      });
      setSubmitDone(true);
      setFormRating(0); setFormName(""); setFormComment("");
    } catch { /* keep form open */ } finally { setSubmitting(false); }
  };

  const openForm = () => {
    setShowForm(true);
    setSubmitDone(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  };

  const timeAgo = (dateStr) => {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7)  return `${d} days ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  };

  const hasMore = reviews.length < total;
  const displayRating = hoverRating || formRating;
  const displayCount  = total;
  const inField = { width: "100%", padding: "10px 13px", fontFamily: "var(--font-body)", fontSize: 14, border: "1.5px solid rgba(87,31,41,.15)", borderRadius: 8, background: "rgba(255,255,255,.7)", color: "#1A0A0D", outline: "none", boxSizing: "border-box" };

  return (
    <section id="reviews-section" style={{ borderTop: "1px solid rgba(87,31,41,.1)", marginTop: 36 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 64px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Big number */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 48, lineHeight: 1, color: "#571F29" }}>{avgRating > 0 ? avgRating : "- "}</div>
              <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 4 }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={14} filled={i <= Math.round(avgRating)} />)}
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: 1, height: 52, background: "rgba(87,31,41,.15)" }} />
            {/* Label */}
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#571F29", marginBottom: 2 }}>Customer Reviews</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.55)" }}>{displayCount.toLocaleString()} verified reviews</div>
            </div>
          </div>
          {/* Write a Review button -  commented out for now
          <button
            onClick={showForm ? () => setShowForm(false) : openForm}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: showForm ? "rgba(87,31,41,.08)" : "#571F29", color: showForm ? "#571F29" : "#F7E3C9", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, border: showForm ? "1px solid rgba(87,31,41,.18)" : "none", cursor: "pointer", transition: "all .2s", whiteSpace: "nowrap" }}>
            <i className={"fa-solid " + (showForm ? "fa-xmark" : "fa-pen-to-square")} aria-hidden="true" />
            {showForm ? "Cancel" : "Write a Review"}
          </button>
          */}
        </div>

        {/* ── Write Review Form -  commented out for now
        {showForm && (
          <div ref={formRef} style={{ background: "rgba(255,255,255,.55)", backdropFilter: "blur(8px)", borderRadius: 14, padding: "24px 22px", marginBottom: 28, border: "1px solid rgba(87,31,41,.12)", boxShadow: "0 2px 16px rgba(87,31,41,.06)" }}>
            {submitDone ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: 32, color: "#2E5E1F", display: "block", marginBottom: 12 }} aria-hidden="true" />
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#571F29", margin: "0 0 5px" }}>Thank you!</p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.6)", margin: 0 }}>Your review will appear here after approval.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "#571F29", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".05em" }}>Rate your experience</p>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <button key={i} type="button"
                        onMouseEnter={() => setHoverRating(i)} onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setFormRating(i)} aria-label={`${i} star${i > 1 ? "s" : ""}`}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 3px", transition: "transform .12s", transform: displayRating >= i ? "scale(1.2)" : "scale(1)" }}>
                        <Star size={28} filled={displayRating >= i} />
                      </button>
                    ))}
                  </div>
                  {formRating > 0 && (
                    <span style={{ display: "block", marginTop: 6, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#FF9100" }}>
                      {["","Poor","Fair","Good","Great","Excellent!"][formRating]}
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <input style={inField} type="text" placeholder="Your name" value={formName}
                    onChange={e => setFormName(e.target.value)} required disabled={submitting} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <textarea style={{ ...inField, resize: "vertical", minHeight: 88 }}
                    placeholder="Share your honest experience with this product…"
                    value={formComment} onChange={e => setFormComment(e.target.value)}
                    required minLength={5} disabled={submitting} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="submit"
                    disabled={submitting || !formRating || !formName.trim() || formComment.trim().length < 5}
                    style={{ padding: "11px 26px", background: "#571F29", color: "#F7E3C9", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, border: "none", cursor: (submitting || !formRating || !formName.trim() || formComment.trim().length < 5) ? "not-allowed" : "pointer", opacity: (submitting || !formRating || !formName.trim() || formComment.trim().length < 5) ? .45 : 1, transition: "opacity .2s" }}>
                    {submitting ? "Submitting…" : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        ── end commented-out Write Review Form */}

        {/* ── Review List ── */}
        {loading && reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 0", color: "rgba(87,31,41,.4)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} aria-hidden="true" />Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <i className="fa-regular fa-comment-dots" style={{ fontSize: 32, color: "rgba(87,31,41,.2)", display: "block", marginBottom: 12 }} aria-hidden="true" />
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "rgba(87,31,41,.5)", margin: "0 0 4px" }}>No reviews yet</p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.4)", margin: 0 }}>Be the first to share your experience!</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: "rgba(255,255,255,.5)", backdropFilter: "blur(6px)", borderRadius: 12, padding: "16px 18px", border: "1px solid rgba(87,31,41,.09)", boxShadow: "0 1px 8px rgba(87,31,41,.05)" }}>
                  <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: avatarColor(r.reviewer_name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
                      {r.reviewer_name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + date */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#571F29" }}>{r.reviewer_name}</span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(87,31,41,.4)", whiteSpace: "nowrap" }}>{timeAgo(r.created_at)}</span>
                      </div>
                      {/* Stars */}
                      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
                        {[1,2,3,4,5].map(i => <Star key={i} size={13} filled={i <= r.rating} />)}
                      </div>
                      {/* Comment */}
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(87,31,41,.78)", margin: 0, lineHeight: 1.65 }}>{r.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={() => fetchReviews(page + 1)} disabled={loading}
                  style={{ padding: "10px 30px", background: "none", color: "#571F29", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, border: "1.5px solid rgba(87,31,41,.22)", cursor: "pointer", transition: "background .2s" }}>
                  {loading ? "Loading…" : `Load more · ${total - reviews.length} remaining`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ── Shop Page ─────────────────────────────────────────────────────────────────
function ShopPage() {
  const [product, setProduct] = useState(PRODUCT_DEFAULT);
  const [productLoading, setProductLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [imgKey, setImgKey] = useState(0);
  const [qty, setQty] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [couponStatus, setCouponStatus] = useState("idle");
  const [couponError, setCouponError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("mp_cart") || "[]"); } catch { return []; }
  });
  const [toasts, setToasts] = useState([]);
  const [addedAnim, setAddedAnim] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [shopAuth, setShopAuth] = useState(getShopAuthState);

  const handleLogout = () => {
    localStorage.removeItem("mp_access_token");
    localStorage.removeItem("mp_refresh_token");
    localStorage.removeItem("mp_user");
    setShopAuth({ loggedIn: false, dashUrl: "dashboard-user.html", user: null });
  };
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [reviewStats, setReviewStats] = useState({ rating: 0, count: 0 });
  const [couponOpen, setCouponOpen] = useState(false);

  // Fetch product from API -  use ?id= query param or first active product
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('id');
    const url = pid ? `${API_BASE}/products/${pid}` : `${API_BASE}/products`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!data || !data.ok) return;
        const p = pid ? data.data : (data.data && data.data.products && data.data.products[0]);
        if (!p) return;
        const statusLower = (p.status || "active").toLowerCase();
        setProduct({
          id:       p.id,
          name:     p.name || "",
          price:    p.price || 0,
          desc:     p.description || "",
          weight:   p.qty ? `${p.qty}${p.unit || 'g'}` : "",
          category: p.category || "",
          badge:    p.badge || p.category || "",
          status:   statusLower,
          inStock:  statusLower !== "coming soon" && statusLower !== "stock out" &&
                    (p.stock === null || p.stock === undefined || p.stock > 0),
          roast:    p.roast || "",
          origin:   p.origin || "",
          blend:    p.blend || "",
          process:  p.process || "",
          images:   Array.isArray(p.images) ? p.images : [],
        });
        setActiveImg(0);
      })
      .catch(() => {})
      .finally(() => setProductLoading(false));
  }, []);

  useEffect(() => { sessionStorage.setItem("mp_cart", JSON.stringify(cart)); }, [cart]);

  const finalPrice = product.price - discount;
  const totalPrice = finalPrice * qty;

  const switchImage = (idx) => {
    setActiveImg(idx);
    setImgKey(k => k + 1);
  };

  const verifyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponStatus("loading");
    setCouponError("");
    try {
      const subtotal = product.price * qty;
      const res  = await fetch(
        `${API_BASE}/coupons/verify?code=${encodeURIComponent(coupon.trim())}&subtotal=${subtotal}`
      );
      const json = await res.json();
      if (!res.ok) {
        setDiscount(0);
        setCouponError(json?.error?.message || "Invalid coupon code.");
        setCouponStatus("err");
        return;
      }
      setDiscount(json.data.discount);
      setCouponStatus("ok");
    } catch {
      setDiscount(0);
      setCouponError("Could not verify coupon. Please try again.");
      setCouponStatus("err");
    }
  };

  const addToCart = () => {
    const item = { id: product.id || "blend", name: product.name, price: finalPrice, qty };
    setCart(c => [...c, item]);
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, name: `${product.name}${product.weight ? ' -  ' + product.weight : ''}` }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2200);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1400);
  };

  const openOrderModal = () => {
    setBuySheetOpen(false);
    setOrderModalOpen(true);
  };

  const buyNow = () => {
    if (product.status === "coming soon" || product.status === "stock out") return;
    if (window.innerWidth <= 640) {
      setBuySheetOpen(true);
    } else {
      setOrderModalOpen(true);
    }
  };

  if (productLoading) {
    return (
      <div className="shop-page">
        <ShopHeader cartCount={cart.length} onCart={() => setCartOpen(true)} onSignIn={() => setAuthOpen(true)} loggedIn={shopAuth.loggedIn} dashUrl={shopAuth.dashUrl} onLogout={handleLogout} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: "#571F29", opacity: 0.5 }} aria-hidden="true" />
          <span style={{ fontFamily: "var(--font-body)", color: "rgba(87,31,41,.5)", fontSize: 14 }}>Loading product…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <ShopHeader cartCount={cart.length} onCart={() => setCartOpen(true)} onSignIn={() => setAuthOpen(true)} productName={product.name} loggedIn={shopAuth.loggedIn} dashUrl={shopAuth.dashUrl} onLogout={handleLogout} />

      <div className="shop-layout">

        {/* LEFT: image */}
        <div className="shop-visual">
          <div className="shop-img-card">
            <div className="shop-img-wrapper">
              {product.badge && <span className="shop-img-badge">{product.badge}</span>}
              {product.images.length > 0 ? (
                <img
                  key={imgKey}
                  src={product.images[activeImg]}
                  alt={`${product.name} -  image ${activeImg + 1}`}
                  className="shop-main-img"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", minHeight: 280, color: "rgba(87,31,41,.2)" }}>
                  <i className="fa-solid fa-image" style={{ fontSize: 56 }} aria-hidden="true" />
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="shop-thumbs">
                {product.images.map((src, i) => (
                  <button
                    key={i}
                    className={"shop-thumb" + (activeImg === i ? " active" : "")}
                    onClick={() => switchImage(i)}
                    aria-label={`View ${THUMB_LABELS[i] ?? `image ${i + 1}`}`}
                  >
                    <img src={src} alt={THUMB_LABELS[i] ?? `Image ${i + 1}`} loading="lazy" decoding="async" />
                    <span className="shop-thumb-label">{THUMB_LABELS[i] ?? String(i + 1)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: product info */}
        <div className="shop-info">
          {product.category && <div className="shop-category">{product.category}</div>}

          <div className="shop-name-row">
            <h1 className="shop-name">{product.name}</h1>
            {product.status === "coming soon"
              ? <span className="shop-stock-badge" style={{ background: "rgba(255,145,0,.15)", color: "#b36200", border: "1px solid rgba(255,145,0,.35)" }}>Coming Soon</span>
              : product.status === "stock out"
              ? <span className="shop-stock-badge" style={{ background: "rgba(200,40,40,.1)", color: "#c82828", border: "1px solid rgba(200,40,40,.25)" }}>Out of Stock</span>
              : product.inStock
              ? <span className="shop-stock-badge">In Stock</span>
              : null
            }
          </div>

          {reviewStats.rating > 0 && <ShopStarRating rating={reviewStats.rating} reviews={reviewStats.count} />}

          <div className="shop-price-row">
            <span className="shop-price">৳{totalPrice.toLocaleString()}</span>
            {discount > 0 && (
              <>
                <span className="shop-old-price">৳{(product.price * qty).toLocaleString()}</span>
                <span className="shop-save-badge">Coupon Applied</span>
              </>
            )}
          </div>

          <p className="shop-desc">{product.desc}</p>

          {/* specs -  only render rows that have data */}
          {(product.roast || product.origin || product.blend || product.process || product.weight) && (
            <div className="shop-specs">
              {product.roast   && <div className="shop-spec"><span>Roast</span><strong>{product.roast}</strong></div>}
              {product.origin  && <div className="shop-spec"><span>Origin</span><strong>{product.origin}</strong></div>}
              {product.blend   && <div className="shop-spec"><span>Blend</span><strong>{product.blend}</strong></div>}
              {product.process && <div className="shop-spec"><span>Process</span><strong>{product.process}</strong></div>}
              {product.weight  && <div className="shop-spec shop-spec--full"><span>Weight</span><strong>{product.weight}</strong></div>}
            </div>
          )}

          {/* qty + Order Now row — hidden on mobile (lives in buy sheet / sticky CTA) */}
          <div className="shop-inline-controls">
            <p className="shop-qty-label">Quantity</p>
            <div className="shop-qty-row">
              <div className="shop-qty">
                <button className="shop-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span className="shop-qty-val">{qty}</span>
                <button className="shop-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase quantity">+</button>
              </div>
              {product.status === "coming soon" || product.status === "stock out" ? (
                <button className="shop-buy-btn" disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>
                  {product.status === "coming soon" ? "Coming Soon" : "Out of Stock"}
                </button>
              ) : (
                <button className="shop-buy-btn" onClick={buyNow}>
                  <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                  Order Now
                </button>
              )}
            </div>
          </div>

          {/* Trust row — hidden on mobile */}
          <div className="shop-trust-row">
            <span className="shop-trust-chip"><i className="fa-solid fa-motorcycle" aria-hidden="true" /> Cash on Delivery</span>
            <span className="shop-trust-chip"><i className="fa-solid fa-truck-fast" aria-hidden="true" /> 1–2 Day Delivery</span>
            <span className="shop-trust-chip"><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Sealed Pack</span>
          </div>

          {/* Collapsible coupon — hidden on mobile */}
          <button
            className="shop-coupon-toggle"
            onClick={() => setCouponOpen(c => !c)}
            aria-expanded={couponOpen}
          >
            <i className="fa-solid fa-tag" aria-hidden="true" />
            Have a coupon?
            <i className={`fa-solid fa-chevron-${couponOpen ? "up" : "down"}`} aria-hidden="true" />
          </button>
          {couponOpen && (
            <div className="shop-coupon-row">
              <div className="shop-coupon-wrap">
                <input
                  className={"shop-coupon-input" + (couponStatus === "ok" ? " coupon-ok" : couponStatus === "err" ? " coupon-err" : "")}
                  type="text"
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponStatus("idle"); }}
                  onKeyDown={e => e.key === "Enter" && verifyCoupon()}
                  aria-label="Coupon code"
                />
                <button className="shop-coupon-btn" onClick={verifyCoupon} disabled={couponStatus === "loading"}>
                  {couponStatus === "loading" ? <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> : "Apply"}
                </button>
              </div>
              {couponStatus === "ok" && (
                <span className="shop-coupon-msg shop-coupon-msg--ok">
                  <i className="fa-solid fa-circle-check" aria-hidden="true" /> Coupon applied — ৳{discount} off
                </span>
              )}
              {couponStatus === "err" && (
                <span className="shop-coupon-msg shop-coupon-msg--err">
                  <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> {couponError}
                </span>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Reviews — commented out for now
      <ReviewsSection productSlug="midnight-blend" onStats={setReviewStats} />
      */}

      {/* Sticky mobile CTA */}
      <div className="shop-sticky-cta">
        <div className="shop-sticky-cta-left">
          <span className="shop-sticky-price">৳{totalPrice.toLocaleString()}</span>
          {discount > 0 && (
            <span className="shop-sticky-old">৳{(product.price * qty).toLocaleString()}</span>
          )}
        </div>
        <button
          className="shop-sticky-cta-btn"
          onClick={buyNow}
          disabled={product.status === "coming soon" || product.status === "stock out"}
        >
          {product.status === "coming soon" ? "Coming Soon" : product.status === "stock out" ? "Out of Stock" : "Order Now"}
        </button>
      </div>

      <ShopToastStack toasts={toasts} />
      {cartOpen && <CartPanel cart={cart} onClose={() => setCartOpen(false)} />}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <BuySheet
        open={buySheetOpen}
        onClose={() => setBuySheetOpen(false)}
        qty={qty}
        setQty={setQty}
        coupon={coupon}
        setCoupon={setCoupon}
        couponStatus={couponStatus}
        setCouponStatus={setCouponStatus}
        couponError={couponError}
        discount={discount}
        verifyCoupon={verifyCoupon}
        addToCart={addToCart}
        addedAnim={addedAnim}
        product={product}
        onBuyNow={openOrderModal}
      />
      <OrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        product={product}
        qty={qty}
        discount={discount}
        coupon={coupon}
        loggedUser={shopAuth.user}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ShopPage />);
