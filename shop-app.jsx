// midnight pick — shop page (phase 1: single product)
const { useState, useEffect } = React;

const PRODUCT = {
  category: "PREMIUM COFFEE",
  name: "Midnight Blend",
  inStock: true,
  rating: 4.8,
  reviews: 640,
  badge: "BEST VALUE",
  price: 669,
  desc: "Freeze-dried Colombian coffee in a resealable stand-up pouch. Around 45 cups. Medium roast — caramel and nut notes, clean finish, real body.",
  roast: "Medium Roast",
  origin: "Colombia",
  blend: "Robusta 65% · Arabica 35%",
  process: "Freeze-Dried",
  weight: "95g",
};

const PRODUCT_IMAGES = [
  { src: "assets/product_95g.png", label: "Front" },
  { src: "assets/product_95g_back.png", label: "Back" },
];

// ── minimal header: back arrow (left) + sign-in (right) ──
function ShopHeader({ cartCount, onSignIn, onCart }) {
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
        Home
      </a>
      <div className="shop-header-actions">
        <button className="nav-signin-btn" onClick={onSignIn}>
          <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
          Sign In
        </button>
        <button className="nav-cart-btn" onClick={onCart} aria-label={`Cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`}>
          <CartIcon size={19} />
          <span className="nav-cart-badge">{cartCount}</span>
        </button>
      </div>
    </header>
  );
}

function ShopStarRating({ rating, reviews }) {
  return (
    <div className="shop-rating">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} filled={i <= Math.round(rating)} />
      ))}
      <span className="shop-rating-num">{rating}</span>
      <span className="shop-rating-reviews">({reviews} reviews)</span>
    </div>
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
  const waMsg = grouped.map(i => `Midnight Blend — 95g ×${i.totalQty}`).join(", ");
  const waUrl = `https://wa.me/8801829531588?text=${encodeURIComponent(`Hi! I'd like to order: ${waMsg}. Total: ৳${total.toLocaleString()}`)}`;

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
                <div style={{ fontSize: 14, fontWeight: 600, color: "#571F29", fontFamily: "var(--font-display)" }}>Midnight Blend — 95g Pouch</div>
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
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0", background: "#25D366", color: "#fff", borderRadius: 8, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              <i className="fa-brands fa-whatsapp" style={{ fontSize: 16 }} aria-hidden="true" />
              Order via WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function BuySheet({ open, onClose, qty, setQty, coupon, setCoupon, couponStatus, setCouponStatus, discount, verifyCoupon, addToCart, addedAnim, product, onBuyNow }) {
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
            <div className="buy-sheet-product-name">{product.name} — {product.weight}</div>
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

        {/* coupon — force row layout even on mobile */}
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
              <i className="fa-solid fa-circle-check" aria-hidden="true" /> Coupon applied — ৳{discount} off
            </span>
          )}
          {couponStatus === "err" && (
            <span className="shop-coupon-msg shop-coupon-msg--err">
              <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> Invalid coupon code
            </span>
          )}
        </div>

        {/* qty */}
        <div className="shop-qty-row" style={{ marginBottom: 14 }}>
          <div className="shop-qty">
            <button className="shop-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span className="shop-qty-val">{qty}</span>
            <button className="shop-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button className="shop-buy-btn" onClick={onBuyNow}>Buy Now</button>
      </div>
    </div>
  );
}

function ShopPage() {
  const [activeImg, setActiveImg] = useState(0);
  const [imgKey, setImgKey] = useState(0);
  const [qty, setQty] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [couponStatus, setCouponStatus] = useState("idle");
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("mp_cart") || "[]"); } catch { return []; }
  });
  const [toasts, setToasts] = useState([]);
  const [addedAnim, setAddedAnim] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [buySheetOpen, setBuySheetOpen] = useState(false);

  useEffect(() => { sessionStorage.setItem("mp_cart", JSON.stringify(cart)); }, [cart]);

  const finalPrice = PRODUCT.price - discount;
  const totalPrice = finalPrice * qty;

  const switchImage = (idx) => {
    setActiveImg(idx);
    setImgKey(k => k + 1);
  };

  const verifyCoupon = () => {
    if (!coupon.trim()) return;
    // Coupon logic to be implemented in a later phase
    setCouponStatus("err");
  };

  const addToCart = () => {
    const item = { id: "blend", name: "Midnight Blend", price: finalPrice, qty };
    setCart(c => [...c, item]);
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, name: "Midnight Blend — 95g" }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2200);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1400);
  };

  const buyNowDirect = (q = qty) => {
    const price = (PRODUCT.price - discount) * q;
    const msg = `Hi! I'd like to buy: Midnight Blend — 95g Pouch ×${q}. Total: ৳${price.toLocaleString()}`;
    window.open(`https://wa.me/8801829531588?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const buyNow = () => {
    if (window.innerWidth <= 640) {
      setBuySheetOpen(true);
    } else {
      buyNowDirect();
    }
  };

  return (
    <div className="shop-page">
      <ShopHeader cartCount={cart.length} onSignIn={() => setAuthOpen(true)} onCart={() => setCartOpen(true)} />

      <div className="shop-layout">

        {/* LEFT: product info */}
        <div className="shop-info">
          <div className="shop-category">{PRODUCT.category}</div>

          <div className="shop-name-row">
            <h1 className="shop-name">{PRODUCT.name}</h1>
            {PRODUCT.inStock && <span className="shop-stock-badge">In Stock</span>}
          </div>

          <ShopStarRating rating={PRODUCT.rating} reviews={PRODUCT.reviews} />

          <div className="shop-price-row">
            <span className="shop-price">৳{totalPrice.toLocaleString()}</span>
            {discount > 0 && (
              <>
                <span className="shop-old-price">৳{(PRODUCT.price * qty).toLocaleString()}</span>
                <span className="shop-save-badge">Coupon Applied</span>
              </>
            )}
          </div>

          <p className="shop-desc">{PRODUCT.desc}</p>

          {/* coupon + qty + actions — hidden on mobile (lives in buy sheet) */}
          <div className="shop-inline-controls">
            {/* coupon code */}
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
                <button className="shop-coupon-btn" onClick={verifyCoupon}>Verify</button>
              </div>
              {couponStatus === "ok" && (
                <span className="shop-coupon-msg shop-coupon-msg--ok">
                  <i className="fa-solid fa-circle-check" aria-hidden="true" /> Coupon applied — ৳{discount} off
                </span>
              )}
              {couponStatus === "err" && (
                <span className="shop-coupon-msg shop-coupon-msg--err">
                  <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> Invalid coupon code
                </span>
              )}
            </div>

            {/* qty + add to cart */}
            <div className="shop-qty-row">
              <div className="shop-qty">
                <button className="shop-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span className="shop-qty-val">{qty}</span>
                <button className="shop-qty-btn" onClick={() => setQty(q => q + 1)} aria-label="Increase quantity">+</button>
              </div>
              <button className={"shop-add-btn" + (addedAnim ? " added" : "")} onClick={addToCart}>
                <CartIcon size={17} />
                {addedAnim ? "Added!" : "Add to Cart"}
              </button>
            </div>
          </div>

          {/* buy now */}
          <button className="shop-buy-btn" onClick={buyNow}>Buy Now</button>

          {/* specs */}
          <div className="shop-specs">
            <div className="shop-spec"><span>Roast</span><strong>{PRODUCT.roast}</strong></div>
            <div className="shop-spec"><span>Origin</span><strong>{PRODUCT.origin}</strong></div>
            <div className="shop-spec"><span>Blend</span><strong>{PRODUCT.blend}</strong></div>
            <div className="shop-spec"><span>Process</span><strong>{PRODUCT.process}</strong></div>
            <div className="shop-spec shop-spec--full"><span>Weight</span><strong>{PRODUCT.weight}</strong></div>
          </div>
        </div>

        {/* RIGHT: image */}
        <div className="shop-visual">
          <div className="shop-img-card">
            <div className="shop-img-wrapper">
              <span className="shop-img-badge">{PRODUCT.badge}</span>
              <img
                key={imgKey}
                src={PRODUCT_IMAGES[activeImg].src}
                alt={`${PRODUCT.name} — ${PRODUCT_IMAGES[activeImg].label}`}
                className="shop-main-img"
              />
            </div>
            <div className="shop-thumbs">
              {PRODUCT_IMAGES.map((img, i) => (
                <button
                  key={i}
                  className={"shop-thumb" + (activeImg === i ? " active" : "")}
                  onClick={() => switchImage(i)}
                  aria-label={`View ${img.label}`}
                >
                  <img src={img.src} alt={img.label} />
                  <span className="shop-thumb-label">{img.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

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
        discount={discount}
        verifyCoupon={verifyCoupon}
        addToCart={addToCart}
        addedAnim={addedAnim}
        product={PRODUCT}
        onBuyNow={() => { buyNowDirect(qty); setBuySheetOpen(false); }}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ShopPage />);
