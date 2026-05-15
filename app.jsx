// midnight pick — main app
const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "burgundy",
  "headline": "From stillness, something stronger.",
  "showMountain": true
} /*EDITMODE-END*/;

const PALETTES = {
  burgundy: { burgundy: "#571F29", deep: "#3A1F1A", cream: "#F7E3C9", cream_soft: "#FBEDD9", flame: "#FF9100", paper: "#FFFDF7" },
  forest: { burgundy: "#1E3A2F", deep: "#0F1F18", cream: "#EFE8D3", cream_soft: "#F4EFDC", flame: "#E89B2A", paper: "#FBF8EE" },
  midnight: { burgundy: "#1A2548", deep: "#0E1530", cream: "#E8E6F0", cream_soft: "#EFEDF5", flame: "#F4A23C", paper: "#FAF9FC" }
};

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.burgundy;
  const r = document.documentElement.style;
  r.setProperty("--burgundy", p.burgundy);
  r.setProperty("--burgundy-deep", p.deep);
  r.setProperty("--cream", p.cream);
  r.setProperty("--cream-soft", p.cream_soft);
  r.setProperty("--flame", p.flame);
  r.setProperty("--paper", p.paper);
}

// ----------------- cart nav button -----------------
function CartNavBtn({ count, onClick }) {
  return (
    <button className="nav-cart-btn" onClick={onClick} aria-label={`Cart — ${count} item${count !== 1 ? "s" : ""}`}>
      <CartIcon size={19} />
      <span className="nav-cart-badge">{count}</span>
    </button>
  );
}

// ----------------- nav -----------------
function Nav({ cartCount, onShop, onSubscribe }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");
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

  const jump = (id, name) => (e) => {
    e.preventDefault();
    setActive(name);
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      if (id === "collection") {
        const top = el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight - window.innerHeight) / 2 - window.innerHeight * 0.02;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      } else {
        const navH = document.querySelector(".nav")?.offsetHeight ?? 0;
        const offset = name === "home" ? 0 : name === "about" ? window.innerHeight * 0.03 : navH + window.innerHeight * 0.005;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <nav className={"nav" + (scrolled ? " scrolled" : "")}>
        <div className="nav-inner">
          <div className="nav-links">
            <a href="#home" className={active === "home" ? "active" : ""} onClick={jump("home", "home")}>Home</a>
            <a href="#collection" className={active === "product" ? "active" : ""} onClick={jump("collection", "product")}>Product</a>
            <a href="#story" className={active === "about" ? "active" : ""} onClick={jump("story", "about")}>About</a>
            <a href="#faq" className={active === "contact" ? "active" : ""} onClick={jump("faq", "contact")}>Contact</a>
          </div>
          <a href="#home" onClick={jump("home", "home")} aria-label="Midnight Pick — home" className="nav-logo-link">
            <Logo variant="dark" height={174} />
          </a>
          <div className="nav-right">
            <button className="nav-subscribe-btn" onClick={onSubscribe}>Subscribe & Save</button>
            <a href="shop.html" className="nav-shop-btn">
              <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
              Shop
            </a>
            <button className="nav-signin-btn">
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              Sign In
            </button>
            <CartNavBtn count={cartCount} onClick={onShop} />
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
          <a href="#home" className={active === "home" ? "active" : ""} onClick={jump("home", "home")}>Home</a>
          <a href="#collection" className={active === "product" ? "active" : ""} onClick={jump("collection", "product")}>Product</a>
          <a href="#story" className={active === "about" ? "active" : ""} onClick={jump("story", "about")}>About</a>
          <a href="#faq" className={active === "contact" ? "active" : ""} onClick={jump("faq", "contact")}>Contact</a>
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

// ----------------- hero -----------------
function Hero({ headline, showMountain }) {
  return (
    <section className="hero" id="home" data-screen-label="01 Hero">
      <div className="hero-stars" />
      <div className="hero-vignette" />
      <div className="hero-content">
        <div className="hero-eyebrow">Welcome</div>
        <h1>
          {headline.split(/(stronger)/i).map((part, i) =>
            /^stronger$/i.test(part)
              ? <span key={i} style={{ color: "#FF9100" }}>{part}</span>
              : part
          )}
        </h1>
        <p className="sub">Freeze-dried instant coffee from Colombian highlands. Carefully preserved aroma and character in every sip. The same gentle low-temperature process that premium imported jars use — at a fraction of the per-gram price. Sachets from ৳25. Free delivery above ৳499.</p>
        <a className="hero-cta" href="shop.html">
          Try the ৳99 Trial Pack
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="hero-marquee" aria-hidden="true">
        <div className="track">
          <span>Freeze-Dried <span className="dot">●</span></span>
          <span>100% Colombian <span className="dot">●</span></span>
          <span>Robusta 65 · Arabica 35 <span className="dot">●</span></span>
          <span>Cash on Delivery <span className="dot">●</span></span>
          <span>Free Shipping Over ৳499 <span className="dot">●</span></span>
          <span>Freeze-Dried <span className="dot">●</span></span>
          <span>100% Colombian <span className="dot">●</span></span>
          <span>Robusta 65 · Arabica 35 <span className="dot">●</span></span>
          <span>Cash on Delivery <span className="dot">●</span></span>
          <span>Free Shipping Over ৳499 <span className="dot">●</span></span>
        </div>
      </div>
    </section>);

}

// ----------------- story -----------------
function Story() {
  return (
    <section className="story" id="story" data-screen-label="02 Story">
      <div className="story-blob b1" />
      <div className="story-blob b2" />
      <div className="story-blob b3" />
      <div className="story-inner">
        <div className="story-text">
          <div className="eyebrow">The Story <span className="arrow">→</span></div>
          <h2>A quieter kind of<br /><em>coffee company.</em></h2>
          <p>High-altitude Colombian coffee, harvested before sunrise and freeze-dried to lock in aroma and character. Built for students, designers, developers, and freelancers who treat a good cup as part of how they work — not a reward for working. Quietly, from Dhaka.</p>
          <div className="signature">
            <span className="line" />
            EST. 2026 · DHAKA, BANGLADESH
          </div>
        </div>
        <div className="story-img">
          <img src="assets/serene-morning-coffee-plantation.jpg" alt="Serene morning at a coffee plantation" />
          <div className="story-tag"><span className="pulse" /> Now shipping nationwide</div>
        </div>
      </div>
    </section>);

}

// ----------------- collection -----------------
const PRODUCTS = [
{
  id: "blend",
  name: "Midnight Blend — 100g",
  badge: "BEST VALUE",
  price: "৳349",
  old: "৳449",
  rating: 4.8, reviews: 640,
  desc: "Resealable pouch. ~50 cups of pure freeze-dried coffee. Roughly ৳7 a cup.",
  specs: "MEDIUM ROAST · 100g"
},
{
  id: "black",
  name: "Midnight Black — 10g",
  badge: null,
  price: "৳25",
  old: null,
  rating: 4.7, reviews: 412,
  desc: "Single-sachet, pure black coffee. 65% Robusta, 35% Arabica. No sugar, no creamer.",
  specs: "SINGLE SACHET · 10g"
},
{
  id: "trial",
  name: "Trial Pack — 3 Sachets",
  badge: "START HERE",
  price: "৳99",
  old: null,
  rating: 4.9, reviews: 203,
  desc: "Three Midnight Black sachets. The simplest way to try freeze-dried before committing to a pouch.",
  specs: "3 × 10g SACHETS"
}];


function ProductRow({ p, onAdd }) {
  const [added, setAdded] = useState(false);
  const handle = () => {
    onAdd(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };
  return (
    <div className="prod-row">
      <div className="prod-row-info">
        <span className="prod-row-name">{p.name}</span>
        <div className="prod-row-meta">
          {p.old && <span className="prod-row-old">{p.old}</span>}
          <span className="prod-row-price">{p.price}</span>
          {p.badge && <span className="badge" style={{ fontSize: 9, padding: "2px 7px" }}>{p.badge}</span>}
        </div>
      </div>
      <button className={"add-btn" + (added ? " added" : "")} onClick={handle}>
        {added ? <><Check size={14} /> Added</> : <><Plus size={12} /> ADD</>}
      </button>
    </div>);
}

function Collection({ onAdd }) {
  return (
    <section className="collection" id="collection" data-screen-label="03 Collection">
      <div className="coll-words" aria-hidden="true">
        <span className="cw cw-1">MIDNIGHT</span>
        <span className="cw cw-2">BLEND</span>
        <span className="cw cw-3">TRIAL</span>
      </div>
      <div className="coll-layout">
        <div className="coll-left">
          <div className="coll-head">
            <div className="eyebrow">The Collection <span className="arrow">→</span></div>
            <h2>Explore <em className="italic-accent">Your</em><br /><span className="italic-accent underline-em">Favorite</span> Flavor</h2>
          </div>
          <div className="coll-product-list">
            {PRODUCTS.map((p) => <ProductRow key={p.id} p={p} onAdd={onAdd} />)}
          </div>
        </div>
        <div className="coll-imgs">
          <div className="coll-img ci-0"><img src="assets/product-real.png" alt="Midnight Blend pouch" /></div>
          <div className="coll-img ci-1"><img src="assets/product-real.png" alt="Midnight Black sachet" /></div>
          <div className="coll-img ci-2"><img src="assets/product-real.png" alt="Midnight Pick Trial Pack" /></div>
        </div>
        <div className="coll-right">
          <p>Premium freeze-dried Colombian coffee — roughly ৳7 a cup from the 100g pouch. No machine needed. Tear, pour, stir. One clear hour ahead.</p>
          <div className="coll-cta-row">
            <a className="hero-cta" href="shop.html">
              Shop Now <ArrowRight size={14} />
            </a>
            <span className="coll-tag">3 products · Free shipping over ৳499</span>
          </div>
        </div>
      </div>
    </section>);
}

// ----------------- promo -----------------
const PROMO_BEANS = [
  { s:18, top:'14%', left:'4%',   rot:'20deg',   dur:'6.2s', delay:'0s'   },
  { s:13, top:'58%', left:'8%',   rot:'-38deg',  dur:'7.6s', delay:'1.2s' },
  { s:21, top:'30%', left:'14%',  rot:'55deg',   dur:'5.4s', delay:'0.5s' },
  { s:12, top:'70%', left:'20%',  rot:'-18deg',  dur:'8.1s', delay:'2s'   },
  { s:16, top:'22%', left:'27%',  rot:'42deg',   dur:'6.6s', delay:'1.8s' },
  { s:14, top:'62%', left:'31%',  rot:'-60deg',  dur:'7s',   delay:'0.9s' },
  { s:14, top:'26%', right:'4%',  rot:'-28deg',  dur:'7.1s', delay:'0.8s' },
  { s:20, top:'62%', right:'9%',  rot:'47deg',   dur:'5.9s', delay:'0.3s' },
  { s:13, top:'38%', right:'16%', rot:'-52deg',  dur:'6.9s', delay:'1.5s' },
  { s:17, top:'74%', right:'23%', rot:'32deg',   dur:'7.3s', delay:'2.4s' },
  { s:11, top:'18%', right:'28%', rot:'-12deg',  dur:'5.3s', delay:'1.1s' },
  { s:15, top:'50%', right:'33%', rot:'65deg',   dur:'6.4s', delay:'0.6s' },
];

const PROMO_STEAMS = [
  { w:10, h:22, top:'15%', left:'2%',  dur:'3.8s', delay:'0s'   },
  { w:8,  h:18, top:'25%', left:'5%',  dur:'4.5s', delay:'1.4s' },
  { w:10, h:22, top:'15%', right:'2%', dur:'4.1s', delay:'0.7s' },
  { w:8,  h:18, top:'28%', right:'5%', dur:'3.6s', delay:'1.9s' },
];

const BeanSvg = () => (
  <svg viewBox="0 0 20 30" fill="none" style={{width:'100%',height:'100%'}}>
    <ellipse cx="10" cy="15" rx="8.5" ry="13" fill="currentColor" opacity="0.28"/>
    <path d="M10 3.5 C7 9 7 21 10 26.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.75"/>
  </svg>
);

const SteamSvg = () => (
  <svg viewBox="0 0 12 24" fill="none" style={{width:'100%',height:'100%'}}>
    <path d="M6 22 C3.5 18 8.5 15 6 11 C3.5 7 8 4.5 6 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

function Promo({ onShop }) {
  return (
    <section className="promo" data-screen-label="04 Promo">
      {PROMO_BEANS.map((b, i) => (
        <span key={`b${i}`} className="promo-bean" style={{
          width: b.s, height: b.s * 1.52,
          top: b.top, left: b.left, right: b.right,
          color: 'rgba(30,12,4,0.88)',
          '--rot': b.rot, '--dur': b.dur, '--delay': b.delay,
        }}><BeanSvg /></span>
      ))}
      {PROMO_STEAMS.map((st, i) => (
        <span key={`st${i}`} className="promo-steam" style={{
          width: st.w, height: st.h,
          top: st.top, left: st.left, right: st.right,
          color: 'rgba(255,255,255,0.5)',
          '--dur': st.dur, '--delay': st.delay,
        }}><SteamSvg /></span>
      ))}
      <h3>Get 20% off your first order.</h3>
      <button className="shop-btn" onClick={onShop}>Shop Now <ArrowRight size={14} /></button>
    </section>);

}

// ----------------- why -----------------
const WHY_ITEMS = [
{
  title: "Colombian Highland Origin",
  desc: "Coffee cherries on the steepest Colombian slopes are picked before sunrise, when the cool air locks in sugars and aromatic oils. High altitude means slower ripening, denser beans, and more complex flavour.",
  icon: <IconCoffeeSack />
},
{
  title: "Fuel for Focused Hours",
  desc: "Built for students, designers, developers, and creators who do their best work in a clear, undistracted hour. 65% Robusta, 35% Arabica means real body and a clean caffeine lift.",
  icon: <IconSparkles />
},
{
  title: "Freeze-Dried, Not Spray-Dried",
  desc: "The same low-temperature vacuum process as Nescafé Gold and Davidoff — preserving aroma and antioxidants — at roughly a third of the per-gram price. No burnt taste. No flat finish.",
  icon: <IconQualityBadge />
}];


function Why() {
  return (
    <section className="why" id="why" data-screen-label="05 Why">
      <div className="why-inner">
        <div className="section-head">
          <div className="eyebrow" style={{ color: "var(--flame)" }}>Why Midnight Pick <span className="arrow">→</span></div>
          <h2>Premium coffee that doesn't ask you to choose between <em className="italic-accent">quality</em> and rent.</h2>
        </div>
        <div className="why-grid">
          {WHY_ITEMS.map((c) =>
          <div className="why-item" key={c.title}>
              <div className="why-ico">{c.icon}</div>
              <h4>{c.title}</h4>
              <p>{c.desc}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}

// ----------------- howto (5 steps using process icons) -----------------
const STEPS = [
{ n: "01", t: "Hand-picked", d: "Ripest cherries selected by hand on Colombian highlands.", icon: <StepPick /> },
{ n: "02", t: "Sun-dried", d: "Cherries laid out under the sun to develop sweetness.", icon: <StepSundry /> },
{ n: "03", t: "Slow-roasted", d: "Drum-roasted to a medium profile — caramel, nut, cocoa.", icon: <StepRoast /> },
{ n: "04", t: "Brewed & frozen", d: "Brewed at origin, then freeze-dried under vacuum.", icon: <StepGrind /> },
{ n: "05", t: "Sealed for you", d: "Sachet or pouch. Tear, pour, stir. Sixty seconds to cup.", icon: <StepJar /> }];


function Howto() {
  return (
    <section className="howto" id="howto" data-screen-label="06 How it works">
      <div className="howto-inner">
        <div className="section-head">
          <div className="eyebrow">How it works <span className="arrow">→</span></div>
          <h2>Simple steps, smooth experience, <em className="italic-accent underline-em">Perfect</em> results.</h2>
        </div>
        <div className="howto-grid">
          {STEPS.map((s) =>
          <div className="step" key={s.n}>
              <div className="step-icon">{s.icon}</div>
              <div className="step-num">{s.n}</div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}

// ----------------- pricing -----------------
const PLANS = [
{
  id: "starter", name: "Quiet Hour", desc: "Two sachets a week — perfect for the occasional desk brew.",
  price: "৳299", per: "/mo", old: null, save: null, featured: false,
  features: ["8 × Midnight Black sachets", "Free shipping over ৳499", "Pause or skip anytime", "Brewing guide in every box"]
},
{
  id: "regular", name: "Deep Work", desc: "A pouch + sachets — the default for daily focus.",
  price: "৳549", per: "/mo", old: "৳699", save: "Save 20%", featured: true,
  features: ["1 × 100g Midnight Blend pouch", "6 × Midnight Black sachets", "Free express shipping", "First access to limited drops", "10% off all add-ons"]
},
{
  id: "pro", name: "All Nighter", desc: "Two pouches a month — for shared kitchens & studios.",
  price: "৳879", per: "/mo", old: "৳1,199", save: "Save 27%", featured: false,
  features: ["2 × 100g Midnight Blend pouches", "Priority WhatsApp support", "Bonus seasonal blend (every 3rd box)", "Free desk dripper on signup"]
}];


function Pricing({ onSubscribe }) {
  return (
    <section className="pricing" id="pricing" data-screen-label="07 Pricing">
      <div className="pricing-inner">
        <div className="eyebrow" style={{ color: "var(--flame)", justifyContent: "center", marginBottom: 14 }}>Subscriptions <span className="arrow">→</span></div>
        <h2>Pour smarter. <em className="italic-accent">Save</em> more.</h2>
        <p className="sub">Choose the plan that suits your need — adjust, pause, or cancel from your account anytime.</p>
        <div className="plan-grid">
          {PLANS.map((p) =>
          <div className={"plan" + (p.featured ? " featured" : "")} key={p.id}>
              {p.save && <span className="save">{p.save}</span>}
              <h4>{p.name}</h4>
              <p className="desc">{p.desc}</p>
              <div className="price">
                {p.old && <span className="old">{p.old}</span>}
                {p.price}<span className="per">{p.per}</span>
              </div>
              <ul>
                {p.features.map((f) =>
              <li key={f}><Check size={14} color={p.featured ? "var(--burgundy)" : "var(--flame)"} /> {f}</li>
              )}
              </ul>
              <button className="subscribe" onClick={onSubscribe}>
                Subscription <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>);

}

// ----------------- faq -----------------
const FAQ_TOPICS = [
  { id: "brand",    label: "Our Story" },
  { id: "quality",  label: "Coffee Quality" },
  { id: "health",   label: "Health & Safety" },
  { id: "products", label: "Products" },
  { id: "delivery", label: "Delivery" },
];

const FAQS = [
{ topic: "brand",    q: "What does \"Midnight Pick\" mean?",                  a: "A nod to coffee that gets you through the quiet hours — the ideas, the projects, the breakthroughs that happen long after the rest of the city has gone to sleep. The name also points to the Colombian harvest tradition of picking ripe cherries in the cool pre-dawn." },
{ topic: "brand",    q: "Is Midnight Pick freeze-dried?",                      a: "Yes — every bag and sachet is freeze-dried, the same low-temperature vacuum process used by Nescafé Gold, Davidoff, and Moccona. Spray-drying (250°C hot air) cooks off the aromatics; freeze-drying preserves them." },

{ topic: "quality",  q: "What is freeze-dried coffee?",                        a: "Freeze-dried coffee is instant coffee made by freezing brewed coffee and removing the water under vacuum through sublimation. The ice converts directly to vapour without passing through liquid. Because no high heat is involved, more of the coffee's natural aroma and flavour compounds survive. The result dissolves cleanly in hot or cold water." },
{ topic: "quality",  q: "How is freeze-dried coffee different from regular instant coffee?", a: "Most instant coffee is spray-dried: the brewed liquid is sprayed as a mist through very hot air — sometimes around 250°C — until it dries. It's fast and cheap. Freeze-drying takes longer and costs more, but avoids the heat that flattens delicate aromatics. Freeze-dried granules taste cleaner, dissolve more evenly, and retain more antioxidants." },
{ topic: "quality",  q: "Does freeze-dried coffee have caffeine?",             a: "Yes. Freeze-drying removes water, not caffeine. A 10g sachet of Midnight Black delivers roughly 65–90mg of caffeine — on the stronger end for instant coffee, partly because of the Robusta-heavy blend." },
{ topic: "quality",  q: "Does freeze-dried coffee go bad?",                    a: "Sealed, the shelf life is typically 18–24 months from manufacture. Once opened, the coffee stays safe well beyond that — but the aroma gradually fades with exposure to air, heat, and moisture. Keep it sealed in a cool dry place, away from direct light. No refrigeration needed." },
{ topic: "quality",  q: "What makes high-altitude coffee better?",             a: "Beans grown above 1,500m mature more slowly, developing denser sugars and more complex aromatics. Cooler nights, mineral-rich soil, and dramatic sun cycles do the work for us — we just don't get in the way." },

{ topic: "health",   q: "Is freeze-dried coffee healthy?",                     a: "Coffee in moderate amounts has been associated in research with benefits including antioxidant activity and improved alertness. Freeze-dried coffee retains more of the antioxidant compounds found in brewed coffee than spray-dried does, because the lower-temperature process is gentler. For most healthy adults, moderate daily consumption is generally considered fine." },
{ topic: "health",   q: "Is instant coffee bad for you?",                      a: "Research on moderate coffee consumption — typically cited as 3–4 cups per day for healthy adults — does not support the idea that it causes harm for most people. The main concerns are excess caffeine disrupting sleep, adding large amounts of sugar or flavoured syrups, and sensitivity in people with specific conditions. Plain black freeze-dried coffee has no additives and no sugar." },
{ topic: "health",   q: "Can I drink coffee if I have gastritis?",             a: "Coffee stimulates gastric acid, which can aggravate symptoms in people with gastritis or peptic ulcers. If this applies to you: avoid coffee on an empty stomach, keep portions small, and consider whether milk softens the acidity. Always check with a doctor for anything medically specific." },
{ topic: "health",   q: "What does the 65/35 Robusta-Arabica blend mean?",     a: "65% Robusta and 35% Arabica. Robusta beans have more body, higher caffeine, and a stronger, earthier profile. Arabica beans are more aromatic, with a cleaner, slightly sweeter finish. The blend gives the cup real weight and caffeine presence from the Robusta, with aromatic brightness from the Arabica rounding it out." },
{ topic: "health",   q: "Where do your beans come from?",                      a: "Colombian highlands. Colombia is one of the most established coffee origins — high altitude, distinct seasons, and mineral-rich soil that develops well-structured, balanced beans." },

{ topic: "products", q: "How does Midnight Pick compare to Nescafé Gold?",    a: "Same freeze-drying process. A 100g jar of Nescafé Gold runs roughly ৳780–990 in Bangladesh (about ৳8–10/g). Our 100g Midnight Blend pouch is ৳349 (about ৳3.49/g). A fraction of the price, none of the compromise." },
{ topic: "products", q: "How much freeze-dried coffee per cup?",               a: "1.5–2 grams per 150–180ml of water. From the 100g pouch, that's roughly half a level teaspoon. The 10g sachet is pre-measured for a single strong cup. Adjust to your taste." },
{ topic: "products", q: "How do I store freeze-dried coffee once opened?",     a: "Seal the pouch or transfer to an airtight jar. Store at room temperature in a cool, dry cupboard. Keep away from steam, sunlight, and anything that introduces moisture. Do not refrigerate — cold environments introduce condensation, which is worse for freeze-dried coffee than warmth." },
{ topic: "products", q: "Can I make iced coffee with freeze-dried instant coffee?", a: "Yes. Dissolve one sachet (or 2g from the pouch) in 50ml of hot water first, then pour over ice and top up with cold water or cold milk. The hot water step ensures the granules dissolve fully before cooling." },
{ topic: "products", q: "Can I use freeze-dried coffee in baking?",            a: "Yes. It dissolves cleanly and works well in tiramisu, coffee cakes, brownies, and ice cream. Dissolve in a small amount of warm liquid before mixing into batters or creams." },

{ topic: "delivery", q: "Where can I buy Midnight Pick in Bangladesh?",        a: "Directly through this website. Delivery across Bangladesh: 1–3 working days inside Dhaka, 3–5 days outside. Free shipping on orders over ৳499." },
{ topic: "delivery", q: "How can I pay?",                                       a: "Cash on delivery, bKash, Nagad, Rocket, and debit/credit cards." },
{ topic: "delivery", q: "Can I return a product?",                             a: "Yes, for damaged or incorrect orders within 7 days of delivery. Message us on WhatsApp and we'll sort it out directly." },
{ topic: "delivery", q: "Where do you deliver?",                               a: "Across Bangladesh. Free delivery inside Dhaka over ৳499, cash on delivery and bKash/Nagad/Rocket accepted. Standard delivery: 1–3 days inside Dhaka, 3–5 days outside." }];


function FAQ() {
  const [activeTopic, setActiveTopic] = useState("brand");
  const [open, setOpen] = useState(0);

  const filtered = FAQS.filter((f) => f.topic === activeTopic);

  const handleTopic = (id) => { setActiveTopic(id); setOpen(0); };

  return (
    <section className="faq" id="faq" data-screen-label="08 FAQ">
      <div className="faq-inner">
        <div className="faq-header">
          <h2>Frequently<br />Asked Questions</h2>
          <p className="faq-subtitle">Straight answers about freeze-dried coffee, how it's made, whether it's healthy, how to store it, and how to order in Bangladesh.</p>
        </div>
        <div className="faq-body">
          <div className="faq-sidebar">
            <div className="faq-panel-label">Topic</div>
            <ul className="faq-topics">
              {FAQ_TOPICS.map((t) =>
                <li key={t.id}>
                  <button className={"faq-topic-btn" + (activeTopic === t.id ? " active" : "")} onClick={() => handleTopic(t.id)}>
                    {t.label}
                  </button>
                </li>
              )}
            </ul>
          </div>
          <div className="faq-content">
            <div className="faq-panel-label">Questions and answers</div>
            <div className="faq-list">
              {filtered.map((f, i) =>
                <div className={"faq-item" + (open === i ? " open" : "")} key={i}>
                  <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                    <span>{f.q}</span>
                    <Chev size={18} />
                  </button>
                  <div className="faq-a">{f.a}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);
}

// ----------------- footer -----------------
function Footer() {
  return (
    <footer className="footer" data-screen-label="09 Footer">
      <div className="footer-inner">
        <div>
          <Logo variant="light" height={70} />
          <p className="footer-tag">Fuel your dreams, one cup at a time. Freeze-dried in Colombia, packed in Dhaka, shipped wherever the night runs long.</p>
          <div className="social">
            <a href="#" aria-label="X/Twitter">{SocialIcons.x}</a>
            <a href="#" aria-label="Instagram">{SocialIcons.ig}</a>
            <a href="#" aria-label="Facebook">{SocialIcons.fb}</a>
            <a href="https://wa.me/" aria-label="WhatsApp">{SocialIcons.wa}</a>
          </div>
        </div>
        <div>
          <h5>Product</h5>
          <ul>
            <li><a href="#collection">Midnight Black</a></li>
            <li><a href="#collection">Midnight Blend 50g</a></li>
            <li><a href="#collection">Midnight Blend</a></li>
            <li><a href="#collection">Trial Pack — ৳99</a></li>
          </ul>
        </div>
        <div>
          <h5>Company</h5>
          <ul>
            <li><a href="#story">Our story</a></li>
            <li><a href="#why">Sourcing</a></li>
            <li><a href="#">Wholesale</a></li>
            <li><a href="#">Return policy</a></li>
          </ul>
        </div>
        <div>
          <h5>Contact</h5>
          <ul>
            <li><a href="mailto:hello@midnightpick.com">hello@midnightpick.com</a></li>
            <li><a href="https://wa.me/">WhatsApp · +880 1829-531588</a></li>
            <li>Open 7 days · 9am – 9pm</li>
            <li>Dhaka, Bangladesh</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 Midnight Pick. All rights reserved.</span>
        <div className="links">
          <a href="#">Privacy</a>
          <a href="#">Terms of Use</a>
          <a href="#">Accessibility</a>
        </div>
      </div>
    </footer>
  );
}

// ----------------- toast stack -----------------
function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) =>
      <div className="toast" key={t.id}>
          <span className="dot" />
          <span>Added <strong>{t.name}</strong> to cart</span>
        </div>
      )}
    </div>);

}

// ----------------- sticky cart -----------------
function StickyCart({ cartCount, onShop }) {
  return (
    <button className="sticky-cart" onClick={onShop} aria-label={`View cart, ${cartCount} items`}>
      <CartIcon size={22} />
      <span className="sticky-cart-count">{cartCount}</span>
      <span className="sticky-cart-label">Items</span>
    </button>
  );
}

// ----------------- app -----------------
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [cart, setCart] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {applyPalette(t.palette);}, [t.palette]);

  const addToCart = (p) => {
    setCart((c) => [...c, p]);
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, name: p.name }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2200);
  };

  const onShop = () => { window.location.href = "shop.html"; };

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {if (e.isIntersecting) e.target.classList.add("in");});
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Nav cartCount={cart.length} onShop={onShop} onSubscribe={() => setModalOpen(true)} />
      <Hero headline={t.headline} showMountain={t.showMountain} />
      <Story />
      <Collection onAdd={addToCart} />
      <Promo onShop={onShop} />
      <Why />
      <Howto />
      <Pricing onSubscribe={() => setModalOpen(true)} />
      <FAQ />
      <Footer />
      <StickyCart cartCount={cart.length} onShop={onShop} />
      <ToastStack toasts={toasts} />
      <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio
            label="Palette"
            value={t.palette}
            options={["burgundy", "forest", "midnight"]}
            onChange={(v) => setTweak("palette", v)} />
          
        </TweakSection>
        <TweakSection label="Hero">
          <TweakText label="Headline" value={t.headline} onChange={(v) => setTweak("headline", v)} />
          <TweakToggle label="Mountain backdrop" value={t.showMountain} onChange={(v) => setTweak("showMountain", v)} />
        </TweakSection>
      </TweaksPanel>
    </>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);