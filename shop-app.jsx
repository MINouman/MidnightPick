// midnight pick — shop page
const { useState, useEffect } = React;

// ---- product data ----
const SHOP_PRODUCTS = [
  {
    id: "blend",
    category: "Premium Coffee",
    name: "Midnight Blend",
    subtitle: "100g Resealable Pouch",
    inStock: true,
    rating: 4.8,
    reviews: 640,
    badge: "BEST VALUE",
    desc: "Freeze-dried Colombian coffee in a resealable stand-up pouch. Around 50 cups. Medium roast — caramel and nut notes, clean finish, real body. Best value per gram in the Midnight Pick range.",
    roast: "Medium Roast",
    origin: "Colombia",
    blend: "Robusta 65% · Arabica 35%",
    process: "Freeze-Dried",
    packs: [
      { label: "50g",  price: 199, old: null },
      { label: "100g", price: 349, old: 449 },
      { label: "200g", price: 649, old: 799 },
      { label: "500g", price: 1499, old: 1899 },
    ],
    defaultPack: 1,
    img: "assets/product-real.png",
  },
  {
    id: "black",
    category: "Single Sachet",
    name: "Midnight Black",
    subtitle: "Pure Black Coffee",
    inStock: true,
    rating: 4.7,
    reviews: 412,
    badge: null,
    desc: "Pure freeze-dried instant coffee. 65% Robusta, 35% Arabica from Colombian highlands. No sugar. No creamer. No added flavouring. One sachet, one honest cup.",
    roast: "Medium Roast",
    origin: "Colombia",
    blend: "Robusta 65% · Arabica 35%",
    process: "Freeze-Dried",
    packs: [
      { label: "1 Sachet",  price: 25,  old: null },
      { label: "5 Pack",    price: 115, old: null },
      { label: "10 Pack",   price: 210, old: null },
      { label: "30 Pack",   price: 575, old: 700 },
    ],
    defaultPack: 0,
    img: "assets/product-real.png",
  },
  {
    id: "trial",
    category: "Trial Pack",
    name: "Trial Pack",
    subtitle: "3 Midnight Black Sachets",
    inStock: true,
    rating: 4.9,
    reviews: 203,
    badge: "START HERE",
    desc: "Three Midnight Black sachets (10g each). Three clear hours. The simplest introduction to Midnight Pick — try freeze-dried properly before committing to a pouch.",
    roast: "Medium Roast",
    origin: "Colombia",
    blend: "Robusta 65% · Arabica 35%",
    process: "Freeze-Dried",
    packs: [
      { label: "Trial Pack", price: 99, old: null },
    ],
    defaultPack: 0,
    img: "assets/product-real.png",
  },
];

// ---- nav ----
function ShopNav({ cartCount, onSubscribe, onSignIn, onCart }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 900) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <nav className={"nav" + (scrolled ? " scrolled" : "")}>
        <div className="nav-inner">
          <div className="nav-links">
            <a href="index.html">Home</a>
            <a href="index.html#collection">Product</a>
            <a href="index.html#story">About</a>
            <a href="index.html#faq">Contact</a>
          </div>
          <a href="index.html" aria-label="Midnight Pick — home" className="nav-logo-link">
            <Logo variant="dark" height={174} />
          </a>
          <div className="nav-right">
            <button className="nav-patreon-btn" onClick={onSubscribe} aria-label="Support on Patreon">
              <i className="fa-brands fa-patreon" aria-hidden="true" />
            </button>
            <a href="shop.html" className="nav-shop-btn nav-shop-btn--active">
              <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
              Shop
            </a>
            <button className="nav-signin-btn" onClick={onSignIn}>
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              Sign In
            </button>
            <button className="nav-cart-btn" onClick={onCart} aria-label={`Cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`}>
              <CartIcon size={19} />
              <span className="nav-cart-badge">{cartCount}</span>
            </button>
            <button
              className={"mob-menu-btn" + (menuOpen ? " is-open" : "")}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon size={20} /> : <MenuGridIcon size={18} />}
            </button>
          </div>
        </div>
      </nav>
      <div className={"mob-menu" + (menuOpen ? " open" : "")} aria-hidden={!menuOpen}>
        <nav className="mob-menu-nav">
          <a href="index.html">Home</a>
          <a href="index.html#collection">Product</a>
          <a href="index.html#story">About</a>
          <a href="index.html#faq">Contact</a>
        </nav>
        <div className="mob-menu-footer">
          <button className="mob-menu-account-btn" aria-label="Account">
            <UserIcon size={18} /> Account
          </button>
        </div>
      </div>
    </>
  );
}

// ---- star rating ----
function ShopStarRating({ rating, reviews }) {
  return (
    <div className="shop-rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={15} filled={i <= Math.round(rating)} />
      ))}
      <span className="shop-rating-num">{rating}</span>
      <span className="shop-rating-reviews">({reviews} reviews)</span>
    </div>
  );
}

// ---- toast ----
function ShopToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span className="dot" />
          <span>Added <strong>{t.name}</strong> to cart</span>
        </div>
      ))}
    </div>
  );
}

// ---- newsletter banner ----
function ShopNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    // Simulate async submit
    setTimeout(() => setStatus("success"), 1200);
  };

  return (
    <section className="shop-newsletter">
      {/* decorative orbs */}
      <span className="snl-orb snl-orb--tl" aria-hidden="true" />
      <span className="snl-orb snl-orb--br" aria-hidden="true" />
      <span className="snl-orb snl-orb--ml" aria-hidden="true" />
      <span className="snl-orb snl-orb--tr-sm" aria-hidden="true" />

      <div className="snl-inner">
        <div className="snl-eyebrow">EARLY ACCESS</div>

        <h2 className="snl-heading">
          First to know.
        </h2>
        <p className="snl-sub">
          New batches, limited drops, and quiet updates — straight to your inbox.
        </p>

        {status === "success" ? (
          <div className="snl-success">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10l4.5 4.5L16 7" stroke="#4CAF84" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>You're on the list. We'll be in touch.</span>
          </div>
        ) : (
          <form className="snl-form" onSubmit={handleSubmit} noValidate>
            <div className={"snl-field-wrap" + (status === "error" ? " snl-field-wrap--err" : "")}>
              <input
                className="snl-input"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                disabled={status === "loading"}
                aria-label="Email address"
              />
              <button
                className={"snl-btn" + (status === "loading" ? " snl-btn--loading" : "")}
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <span className="snl-spinner" aria-hidden="true" />
                ) : "Subscribe"}
              </button>
            </div>
            {status === "error" && (
              <p className="snl-error-msg">Enter a valid email address to continue.</p>
            )}
          </form>
        )}

        <p className="snl-legal">
          No spam. Unsubscribe any time.
        </p>
      </div>
    </section>
  );
}

// ---- cart panel ----
function CartPanel({ cart, onClose }) {
  const grouped = Object.values(
    cart.reduce((acc, item) => {
      const key = `${item.id}__${item.pack}`;
      if (!acc[key]) acc[key] = { ...item, qty: 0 };
      acc[key].qty += item.qty;
      return acc;
    }, {})
  );
  const total = grouped.reduce((s, i) => s + i.price * i.qty, 0);
  const waMsg = grouped.map(i => `${i.name} (${i.pack}) ×${i.qty}`).join(", ");
  const waUrl = `https://wa.me/8801829531588?text=${encodeURIComponent(`Hi! I'd like to order: ${waMsg}. Total: ৳${total.toLocaleString()}`)}`;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "min(380px, 100vw)", background: "#FFFDF7", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(87,31,41,.12)" }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#571F29" }}>
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
              <p style={{ margin: 0, fontSize: 14 }}>Your cart is empty.</p>
            </div>
          ) : grouped.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(87,31,41,.08)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#571F29" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "rgba(87,31,41,.6)", marginTop: 2 }}>{item.pack} × {item.qty}</div>
              </div>
              <span style={{ fontWeight: 700, color: "#FF9100", fontSize: 15 }}>৳{(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {grouped.length > 0 && (
          <div style={{ padding: 20, borderTop: "1px solid rgba(87,31,41,.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "#571F29", marginBottom: 16 }}>
              <span>Total</span>
              <span style={{ color: "#FF9100" }}>৳{total.toLocaleString()}</span>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 0", background: "#25D366", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none" }}
            >
              <i className="fa-brands fa-whatsapp" style={{ fontSize: 16 }} aria-hidden="true" />
              Order via WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- main shop page ----
function ShopPage() {
  const [activeId, setActiveId] = useState("blend");
  const [activePack, setActivePack] = useState(SHOP_PRODUCTS[0].defaultPack);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("mp_cart") || "[]"); } catch { return []; }
  });
  const [toasts, setToasts] = useState([]);
  const [addedAnim, setAddedAnim] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen,  setAuthOpen]  = useState(false);
  const [cartOpen,  setCartOpen]  = useState(false);

  useEffect(() => { sessionStorage.setItem("mp_cart", JSON.stringify(cart)); }, [cart]);

  const product = SHOP_PRODUCTS.find((p) => p.id === activeId);
  const pack = product.packs[activePack];

  const switchProduct = (id) => {
    const p = SHOP_PRODUCTS.find((x) => x.id === id);
    setActiveId(id);
    setActivePack(p.defaultPack);
    setQty(1);
    setImgKey((k) => k + 1);
  };

  const addToCart = () => {
    const item = { id: product.id, name: product.name, pack: pack.label, price: pack.price, qty };
    setCart((c) => [...c, item]);
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, name: `${product.name} (${pack.label})` }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2200);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1400);
  };

  const buyNow = () => {
    const msg = `Hi! I'd like to buy: ${product.name} (${pack.label}) ×${qty}. Total: ৳${(pack.price * qty).toLocaleString()}`;
    window.open(`https://wa.me/8801829531588?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const totalPrice = pack.price * qty;
  const totalOld = pack.old ? pack.old * qty : null;

  return (
    <div className="shop-page">
      <ShopNav cartCount={cart.length} onSubscribe={() => setModalOpen(true)} onSignIn={() => setAuthOpen(true)} onCart={() => setCartOpen(true)} />

      {/* main layout */}
      <div className="shop-layout">

        {/* ── left: info ── */}
        <div className="shop-info">
          <div className="shop-category">{product.category}</div>

          <div className="shop-name-row">
            <h1 className="shop-name">{product.name}</h1>
            {product.inStock && <span className="shop-stock-badge">In Stock</span>}
          </div>

          <ShopStarRating rating={product.rating} reviews={product.reviews} />

          <div className="shop-price-row">
            <span className="shop-price">৳{totalPrice.toLocaleString()}</span>
            {totalOld && <span className="shop-old-price">৳{totalOld.toLocaleString()}</span>}
            {totalOld && (
              <span className="shop-save-badge">
                Save {Math.round((1 - pack.price / pack.old) * 100)}%
              </span>
            )}
          </div>

          <p className="shop-desc">{product.desc}</p>

          {/* size / pack selector */}
          <div className="shop-size-section">
            <div className="shop-size-label">{product.id === "blend" ? "Size" : "Pack"}</div>
            <div className="shop-size-opts">
              {product.packs.map((p, i) => (
                <button
                  key={p.label}
                  className={"shop-size-btn" + (activePack === i ? " active" : "")}
                  onClick={() => { setActivePack(i); setQty(1); }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* quantity + add to cart */}
          <div className="shop-qty-row">
            <div className="shop-qty">
              <button className="shop-qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span className="shop-qty-val">{qty}</span>
              <button className="shop-qty-btn" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button
              className={"shop-add-btn" + (addedAnim ? " added" : "")}
              onClick={addToCart}
            >
              <CartIcon size={17} />
              {addedAnim ? "Added!" : "Add to Cart"}
            </button>
          </div>

          {/* buy now */}
          <button className="shop-buy-btn" onClick={buyNow}>Buy Now</button>

          {/* specs grid */}
          <div className="shop-specs">
            <div className="shop-spec">
              <span>Roast</span>
              <strong>{product.roast}</strong>
            </div>
            <div className="shop-spec">
              <span>Origin</span>
              <strong>{product.origin}</strong>
            </div>
            <div className="shop-spec">
              <span>Blend</span>
              <strong>{product.blend}</strong>
            </div>
            <div className="shop-spec">
              <span>Process</span>
              <strong>{product.process}</strong>
            </div>
          </div>
        </div>

        {/* ── right: image ── */}
        <div className="shop-visual">
          <div className="shop-img-card">
            {product.badge && (
              <span className="shop-img-badge">{product.badge}</span>
            )}
            <div className="shop-img-wrapper">
              <img
                key={imgKey}
                src={product.img}
                alt={product.name}
                className="shop-main-img"
              />
            </div>
            <div className="shop-thumbs">
              {SHOP_PRODUCTS.map((p) => (
                <button
                  key={p.id}
                  className={"shop-thumb" + (activeId === p.id ? " active" : "")}
                  onClick={() => switchProduct(p.id)}
                  aria-label={`View ${p.name}`}
                >
                  <img src={p.img} alt={p.name} />
                  <span className="shop-thumb-label">{p.name.replace("Midnight ", "")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ShopNewsletter />

      <ShopToastStack toasts={toasts} />
      {cartOpen && <CartPanel cart={cart} onClose={() => setCartOpen(false)} />}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ShopPage />);
