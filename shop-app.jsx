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
function ShopNav({ cartCount, onSubscribe }) {
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
            <button className="nav-subscribe-btn" onClick={onSubscribe}>Subscribe & Save</button>
            <a href="shop.html" className="nav-shop-btn nav-shop-btn--active">
              <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
              Shop
            </a>
            <button className="nav-signin-btn">
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              Sign In
            </button>
            <button className="nav-cart-btn" aria-label={`Cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`}>
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

// ---- main shop page ----
function ShopPage() {
  const [activeId, setActiveId] = useState("blend");
  const [activePack, setActivePack] = useState(SHOP_PRODUCTS[0].defaultPack);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [addedAnim, setAddedAnim] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

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

  const totalPrice = pack.price * qty;
  const totalOld = pack.old ? pack.old * qty : null;

  return (
    <div className="shop-page">
      <ShopNav cartCount={cart.length} onSubscribe={() => setModalOpen(true)} />

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
          <button className="shop-buy-btn">Buy Now</button>

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
      <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ShopPage />);
