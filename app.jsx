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
function Nav({ cartCount, onShop, onSubscribe, onSignIn }) {
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
            <a href="#journal" className={active === "blog" ? "active" : ""} onClick={jump("journal", "blog")}>Blog</a>
            <a href="#faq" className={active === "contact" ? "active" : ""} onClick={jump("faq", "contact")}>Contact</a>
          </div>
          <a href="#home" onClick={jump("home", "home")} aria-label="Midnight Pick — home" className="nav-logo-link">
            <Logo variant="dark" height={174} />
          </a>
          <div className="nav-right">
            <button className="nav-patreon-btn" onClick={onSubscribe} aria-label="Support on Patreon">
                <i className="fa-brands fa-patreon" aria-hidden="true" />
              </button>
            <a href="shop.html" className="nav-shop-btn">
              <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
              Shop
            </a>
            <button className="nav-signin-btn" onClick={onSignIn}>
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
          <a href="#journal" className={active === "blog" ? "active" : ""} onClick={jump("journal", "blog")}>Blog</a>
          <a href="#faq" className={active === "contact" ? "active" : ""} onClick={jump("faq", "contact")}>Contact</a>
        </nav>
        <div className="mob-menu-footer">
          <button className="mob-menu-account-btn" onClick={onSignIn} aria-label="Account">
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

// ----------------- the journal (blog) -----------------
const PILLAR_META = {
  "Process Education": "#FF9100",
  "Practical Guides":  "#571F29",
  "Health & Science":  "#4CAF84",
  "Buying Guides":     "#C4893A",
};

const BLOG_POSTS = [
  {
    slug: "/blog/what-is-freeze-dried-coffee",
    pillar: "Process Education",
    title: "What Is Freeze-Dried Coffee, and Why Does the Process Matter?",
    excerpt: "Most people stir instant coffee into hot water and never think about how it got there. There are two very different ways to turn brewed coffee into a powder — and they produce noticeably different results in the cup.",
    readTime: "5 min",
  },
  {
    slug: "/blog/freeze-dried-vs-spray-dried-coffee",
    pillar: "Process Education",
    title: "Freeze-Dried vs Spray-Dried Coffee — What Actually Changes in the Cup",
    excerpt: "Two jars of instant coffee sit on the same shelf. Same category. Same label. The difference is in how they were made, and it changes what ends up in your cup.",
    readTime: "5 min",
  },
  {
    slug: "/blog/does-freeze-dried-coffee-go-bad",
    pillar: "Practical Guides",
    title: "Does Freeze-Dried Coffee Go Bad? Storage, Shelf Life, and What to Watch For",
    excerpt: "Freeze-dried coffee has a reputation for lasting forever. That's mostly true — but \"safe to eat\" and \"tastes as good as the day you opened it\" are two different things.",
    readTime: "4 min",
  },
  {
    slug: "/blog/how-to-make-iced-coffee-instant",
    pillar: "Practical Guides",
    title: "How to Make Iced Coffee with Instant Coffee at Home",
    excerpt: "Iced coffee made at home is better than most cafés charge ৳200+ for. The trick is a 30-second step that most people skip — and once you know it, you'll never make watery iced coffee again.",
    readTime: "4 min",
  },
  {
    slug: "/blog/is-instant-coffee-good-or-bad-for-you",
    pillar: "Health & Science",
    title: "Is Instant Coffee Good or Bad for You? An Honest Answer",
    excerpt: "If you search \"is instant coffee bad for you,\" you'll find confident articles on both sides. Most of them aren't wrong — they're just incomplete. The real answer is more reassuring than either camp suggests.",
    readTime: "6 min",
  },
  {
    slug: "/blog/coffee-and-sleep",
    pillar: "Health & Science",
    title: "Coffee and Sleep — What You Actually Need to Know",
    excerpt: "Caffeine's half-life is around 5–6 hours, which means half of what you drink at 4pm is still active at 10pm. The useful question is how to time your coffee so you get the focus without paying for it at night.",
    readTime: "5 min",
  },
  {
    slug: "/blog/how-to-choose-good-instant-coffee",
    pillar: "Buying Guides",
    title: "How to Choose a Good Instant Coffee — What to Look for on the Label",
    excerpt: "Most coffee labels don't tell you much. \"Premium,\" \"rich,\" \"smooth\" — these words are on almost everything, including products that taste like hot pencil shavings. Here's what to actually look at.",
    readTime: "4 min",
  },
  {
    slug: "/blog/robusta-arabica-blend-instant-coffee",
    pillar: "Buying Guides",
    title: "What Is the Robusta-Arabica Blend, and Why Does It Matter in Instant Coffee?",
    excerpt: "Every bag of blended coffee has a ratio on it — or it should. The ratio tells you more about what the cup will taste like than almost any other number on the packaging.",
    readTime: "4 min",
  },
  {
    slug: "/blog/how-to-brew-instant-coffee",
    pillar: "Practical Guides",
    title: "How to Brew the Best Cup of Instant Coffee at Home",
    excerpt: "Instant coffee has a reputation for being impossible to get wrong. That's almost true. But a few small things make the real difference between a flat cup and one that tastes the way it should.",
    readTime: "4 min",
  },
  {
    slug: "/blog/freeze-dried-coffee-bangladesh",
    pillar: "Buying Guides",
    title: "Premium Freeze-Dried Instant Coffee in Bangladesh — What's Available and What to Look For",
    excerpt: "Bangladesh's coffee market reached over 1,700 tonnes by 2022. Most of that growth is in instant coffee. Within instant, freeze-dried is the quality end — here's what's available and what to look for.",
    readTime: "5 min",
  },
];

const BLOG_CONTENT = {
  "/blog/what-is-freeze-dried-coffee": {
    sections: [
      { body: "Most people pick up a jar of instant coffee, stir it into hot water, and never think about how it got there. But there are two very different ways to turn brewed coffee into a powder, and they produce noticeably different results in the cup." },
      { heading: "What \"instant coffee\" actually means", body: "Coffee is brewed normally first — ground beans, hot water — and the result is a concentrate. That liquid is then dried into a powder or granules that dissolve when water is added again. It's brewed twice: once at origin, once in your mug." },
      { heading: "Spray-drying — and why heat is a problem", body: "In spray-drying, the brewed coffee liquid is pumped through a nozzle and sprayed as a fine mist into a chamber of very hot air — around 200–250°C. The water evaporates almost instantly, leaving a fine dry powder. It's fast and inexpensive, but that heat burns off the aromatic compounds that give coffee its character." },
      { heading: "Freeze-drying — how it actually works", body: "In freeze-drying, the brewed coffee is first frozen solid, then placed in a vacuum chamber. The pressure drops so low that the ice converts directly to vapour — bypassing the liquid stage entirely. This is called sublimation. No high heat is involved, which means the coffee's aromatic and antioxidant compounds largely survive the process." },
      { heading: "What survives that doesn't survive spray-drying", body: "Because freeze-drying avoids the heat that spray-drying uses, more of the coffee's volatile aromatics remain intact. This is why freeze-dried granules have that recognisable, roasty smell when you open the jar — and spray-dried powder typically doesn't. Research also shows higher retention of antioxidant compounds in freeze-dried coffee." },
      { heading: "What it means in your cup", body: "Freeze-dried coffee dissolves cleanly, tends to have more aroma, and tastes closer to brewed coffee than its spray-dried counterpart. The difference is most noticeable drinking it black. With milk or sugar, the gap narrows — but the starting point is still better." },
    ],
    cta: { text: "Try Midnight Pick freeze-dried sachets", href: "shop.html" },
  },
  "/blog/freeze-dried-vs-spray-dried-coffee": {
    sections: [
      { body: "Two jars of instant coffee sit on the same shelf. Same category. Same \"instant\" label. The difference is in how they were made, and it changes what ends up in your cup." },
      { heading: "How each method works", body: "Spray-drying uses hot air — sometimes above 200°C — to evaporate moisture from the brewed liquid. Freeze-drying freezes the coffee and removes moisture through sublimation under vacuum. For a deeper look at the process, see our post on what freeze-dried coffee actually is." },
      { heading: "Flavour: what heat does to aromatics", body: "The high temperature in spray-drying volatilises many of the aromatic compounds that give coffee its complexity. What you're left with is the basic flavour structure — bitter, slightly harsh — without the top notes that make a cup interesting. Freeze-dried coffee retains those top notes." },
      { heading: "Texture and how each dissolves", body: "Freeze-dried coffee typically comes in larger granules that dissolve evenly and leave no residue. Spray-dried powder can clump and dissolves less consistently. Neither is difficult to use, but the dissolution difference is visible in the cup." },
      { heading: "How to identify which type you're buying", body: "\"Granules\" on the label almost always means freeze-dried. \"Powder\" or no process mentioned typically means spray-dried. Freeze-drying is a selling point brands usually mention — if it's not on the label, assume spray-dried." },
      { heading: "When spray-dried is fine", body: "If you're adding a lot of milk, sugar, or flavoured syrup, the gap between the two methods narrows considerably. Spray-dried also works fine in baking. But for a plain black cup — or anything where the coffee itself is the point — freeze-dried tastes noticeably better." },
    ],
    cta: { text: "Midnight Pick is freeze-dried — here's where to start", href: "shop.html" },
  },
  "/blog/does-freeze-dried-coffee-go-bad": {
    sections: [
      { body: "Freeze-dried coffee has a reputation for lasting forever. That's mostly true — but \"safe to eat\" and \"tastes as good as the day you opened it\" are two different things." },
      { heading: "Sealed vs opened shelf life", body: "Sealed, properly stored freeze-dried coffee typically has a shelf life of 18–24 months from the manufacture date. Once opened, the coffee stays safe well beyond that — but for peak flavour and aroma, aim to use it within 3–6 months of opening." },
      { heading: "What \"going bad\" actually looks like", body: "Signs to check: clumping (moisture has got in), a flat or papery smell where there should be aroma, or visible discolouration. None of these mean the coffee is unsafe — just that it's past its flavour peak. It won't make you ill; it'll just taste flat." },
      { heading: "The three enemies: moisture, light, heat", body: "Moisture is the main enemy of freeze-dried coffee. Even small amounts of water vapour will cause granules to clump and begin degrading. Bright light and heat both accelerate this process. A warm, sunny windowsill is exactly where you shouldn't store it." },
      { heading: "Why not to refrigerate", body: "The fridge introduces condensation — every time you take the jar in and out, the temperature change causes moisture to form on the granules. Freeze-dried coffee does not need refrigeration and is actively harmed by it." },
      { heading: "Best storage at home", body: "Original resealable pouch if it has one, or an airtight glass jar in a cool, dry cupboard. Away from the kettle. Away from direct sunlight. That's genuinely all it takes to keep freeze-dried coffee at its best." },
    ],
    cta: { text: "Midnight Blend comes in a resealable zipper pouch", href: "shop.html" },
  },
  "/blog/how-to-make-iced-coffee-instant": {
    sections: [
      { body: "Iced coffee made at home is better than most cafés charge ৳200+ for. The trick is a 30-second step that most people skip — and once you know it, you'll never make watery iced coffee again." },
      { heading: "The one rule: dissolve in hot water first", body: "Instant coffee — including freeze-dried — won't dissolve properly in cold water. The granules need heat. Dissolve your coffee in 50ml of hot water first, then pour it over ice and top up with cold water or milk. Skipping this makes under-dissolved, watery iced coffee." },
      { heading: "Basic iced coffee — step by step", body: "1 sachet (or 2g from the pouch) dissolved in 50ml hot water. Pour into a glass packed with ice. Add 150ml cold water or cold milk. Adjust to taste. Ready in under 2 minutes. Simple, consistent, better than most ৳200 café versions." },
      { heading: "Iced milk coffee — doodh style, cold", body: "Use cold milk instead of water when topping up. Add half a teaspoon of sugar if you like it sweet. The result is closer to a cold latte than a black iced coffee — rich, soft, and surprisingly satisfying on a warm Dhaka afternoon." },
      { heading: "Quick dalgona coffee", body: "2g coffee, 2 teaspoons sugar, 2 tablespoons hot water in a small bowl. Whip vigorously — by hand or hand mixer — for 2–3 minutes until light and foamy. Spoon over cold milk on ice. Looks impressive, takes five minutes." },
      { heading: "Getting the ratio right for iced drinks", body: "Cold dilutes. For iced coffee, start stronger than you would for a hot cup — use about 1.5× the coffee. The ice melt will bring it back to the right strength. Taste after the ice has settled and adjust from there." },
    ],
    cta: { text: "Midnight Black sachets dissolve cleanly — perfect for iced coffee", href: "shop.html" },
  },
  "/blog/is-instant-coffee-good-or-bad-for-you": {
    sections: [
      { body: "If you search \"is instant coffee bad for you,\" you'll find confident articles on both sides. Most of them aren't wrong — they're just incomplete. The real answer is more boring and more reassuring than either camp suggests." },
      { heading: "What moderate consumption actually means", body: "Research on coffee health typically defines \"moderate\" as 3–4 cups per day for healthy adults. Within that range, studies consistently find no evidence of harm — and some associations with benefits including reduced risk of certain conditions and improved cognitive performance." },
      { heading: "Antioxidants in coffee", body: "Coffee is one of the primary dietary sources of antioxidants for many people. Freeze-dried coffee retains more of these compounds than spray-dried, because the lower-temperature process is gentler on heat-sensitive molecules. This doesn't make it medicine — but it's not harmful either." },
      { heading: "Caffeine: the real conversation", body: "For most people, caffeine timing matters more than quantity. A cup at 2pm hits differently than the same cup at 10pm. The issue isn't usually \"too much caffeine\" — it's caffeine at the wrong time disrupting sleep, which then creates a cycle of fatigue and more coffee." },
      { heading: "Who should be careful", body: "People with gastritis, peptic ulcers, or acid reflux often find coffee aggravates symptoms — especially on an empty stomach. During pregnancy, most guidelines suggest limiting caffeine to under 200mg/day. If you're on certain medications, a doctor is the right person to ask about interactions." },
      { heading: "What you add matters more than the coffee itself", body: "Plain black coffee has almost no calories and no additives. Add four teaspoons of sugar and a splash of flavoured syrup and the health calculation changes entirely. Midnight Black is pure coffee — no sugar, no creamers, no additives of any kind." },
    ],
    disclaimer: "This is general information, not medical advice. For anything health-specific, your doctor is the right person to ask.",
    cta: { text: "Midnight Black — just coffee, nothing else", href: "shop.html" },
  },
  "/blog/coffee-and-sleep": {
    sections: [
      { body: "The question isn't whether coffee affects sleep. It does — caffeine's half-life is around 5–6 hours, which means half of what you drink at 4pm is still active at 10pm. The more useful question is how to time your coffee so you get the focus without paying for it at night." },
      { heading: "How caffeine actually works", body: "Caffeine works by blocking adenosine receptors in the brain. Adenosine is the compound that builds up throughout the day and creates the feeling of tiredness. Caffeine doesn't remove tiredness — it blocks the signal. When the caffeine clears, the adenosine is still there, which is why the crash can feel sharp." },
      { heading: "The half-life reality", body: "If you drink a 90mg coffee at 3pm, approximately 45mg is still active at 8–9pm, and 22mg at 1–2am. This doesn't mean everyone feels it — individual metabolism varies significantly — but it's the underlying reason why an afternoon coffee can disrupt sleep even if you don't notice it directly." },
      { heading: "The cortisol timing window", body: "Cortisol (your primary alertness hormone) peaks naturally around 30–45 minutes after waking. Drinking coffee during that peak means caffeine competes with cortisol rather than supplementing it. Waiting 60–90 minutes after waking before your first coffee means it's working with your biology, not against it." },
      { heading: "A simple daily framework", body: "First coffee: 90 minutes after waking. Last coffee: no later than 2pm for most people with a 10–11pm bedtime. Between those points: drink coffee when you need it, not out of habit. This framework alone resolves most coffee-related sleep complaints." },
      { heading: "Signs your timing might be off", body: "You lie awake longer than usual. You wake in the night more than you used to. The coffee feels like it's stopped working and you need more of it. All of these can be caused by caffeine disruption, even when you don't consciously feel \"wired.\"" },
    ],
    cta: { text: "Midnight Pick is designed for focus, not for fighting exhaustion", href: "shop.html" },
  },
  "/blog/how-to-choose-good-instant-coffee": {
    sections: [
      { body: "Most coffee labels don't tell you much. \"Premium,\" \"rich,\" \"smooth\" — these words are on almost everything, including products that taste like hot pencil shavings. Here's what to actually look at." },
      { heading: "Process first — the single biggest quality indicator", body: "\"Freeze-dried\" or \"granules\" on the label means the vacuum process that preserves aroma. \"Powder\" or no process mentioned typically means spray-dried. This one factor matters more than any other descriptor on the packaging." },
      { heading: "Bean origin", body: "A stated origin — \"Colombian,\" \"Ethiopian,\" \"Vietnamese blend\" — tells you the brand knows where its beans came from and cares enough to say so. Vague terms like \"selected arabica\" without a country of origin tell you very little about what's actually inside." },
      { heading: "Robusta vs Arabica ratio", body: "Pure Arabica instants often taste thin — the variety is delicate and freeze-drying removes some of its lighter aromatics. Pure Robusta can taste harsh. A blend that states the ratio (e.g. 65/35 Robusta-Arabica) is more transparent and typically more balanced in the cup." },
      { heading: "Ingredients list", body: "A pure black instant coffee should have exactly one ingredient: coffee. If the list includes glucose syrup, vegetable fat, or anything else, it's not a pure product. That's fine if you want a 3-in-1 — but know what you're buying before you buy it." },
      { heading: "A 5-point checklist", body: "Freeze-dried process ✓ · Stated origin ✓ · Transparent blend ratio ✓ · Coffee as the only ingredient ✓ · Resealable packaging ✓. These five things together are a reliable indicator of a product worth trying." },
    ],
    cta: { text: "See how Midnight Pick scores on each point", href: "shop.html" },
  },
  "/blog/robusta-arabica-blend-instant-coffee": {
    sections: [
      { body: "Every bag of blended coffee has a ratio on it — or it should. The ratio tells you more about what the cup will taste like than almost any other number." },
      { heading: "What Robusta and Arabica actually are", body: "Robusta (Coffea canephora) and Arabica (Coffea arabica) are two different species of the coffee plant. Robusta grows at lower altitudes, is more disease-resistant, and produces beans with higher caffeine and more body. Arabica grows at higher altitudes, is more delicate, and produces beans with more aromatic complexity and a cleaner finish." },
      { heading: "What Robusta brings to a blend", body: "Higher caffeine, stronger body, earthy and slightly bitter notes. More forgiving through processing — Robusta's flavour compounds are more heat-stable than Arabica's, which is why it performs reliably in instant coffee. It also produces a stronger, more persistent flavour that doesn't disappear in milk." },
      { heading: "What Arabica brings", body: "Aromatic brightness, a cleaner finish, and more acidity. The top notes in a good cup — slightly floral, fruity, gently sweet — typically come from the Arabica component. Without it, a high-Robusta blend can taste flat and one-dimensional." },
      { heading: "Why blending works well for instant", body: "Robusta's robustness holds up better through freeze-drying. Arabica adds the aromatic layer that makes the cup interesting. A good blend uses both: the body and caffeine presence from Robusta, the aroma and finish from Arabica. It's complementary, not a compromise." },
      { heading: "The 65/35 ratio in the cup", body: "Midnight Pick's 65/35 Robusta-Arabica blend produces a strong, clean body with a proper caffeine lift, rounded by enough Arabica to add aromatic complexity. It works equally well as a straight black cup and as a base for milk-based iced drinks." },
    ],
    cta: { text: "Try the 65/35 blend — Midnight Black sachets", href: "shop.html" },
  },
  "/blog/how-to-brew-instant-coffee": {
    sections: [
      { body: "Instant coffee has a reputation for being impossible to get wrong. That's almost true. But there are a few small things that make a real difference between a flat cup and one that tastes the way it should." },
      { heading: "Water temperature", body: "Boiling water (100°C) makes instant coffee taste slightly more bitter and hollow. 85–90°C is the sweet spot — hot enough to dissolve everything fully, cool enough to preserve aromatic compounds. No thermometer needed: boil the kettle, then wait 30 seconds." },
      { heading: "The ratio", body: "Standard: 1.5–2g of coffee per 150–180ml of water. The Midnight Black sachet (10g) is pre-measured for one strong cup. From the 100g pouch, that's roughly half a level teaspoon. Start at the lower end of any range and adjust to your taste." },
      { heading: "Stir properly", body: "Stir in a slow circle for 10–15 seconds until no undissolved granules remain. Instant coffee can clump slightly, especially if there's been any moisture near the container. A proper stir makes a visibly cleaner cup — no gritty residue at the bottom." },
      { heading: "The 30-second wait", body: "After stirring, wait 30 seconds before drinking. The granules continue to open and release aromatic compounds during that short window. Small, but real — you'll notice the aroma becomes more pronounced if you give it that moment." },
      { heading: "Common mistakes", body: "Cold mug: ceramic drops water temperature by 5–8°C in the first 30 seconds — warm it with a splash of hot water first. Too much water: overdilution is the most common mistake. Start with less than you think you need, then add more. You can always add; you can't take away." },
    ],
    cta: { text: "Midnight Black sachets — pre-measured, ready in 60 seconds", href: "shop.html" },
  },
  "/blog/freeze-dried-coffee-bangladesh": {
    sections: [
      { body: "Bangladesh's coffee market has been growing steadily — imports that were 264 tonnes in 2012 reached over 1,700 tonnes by 2022. Most of that growth is in instant coffee. And within instant, freeze-dried is the quality end." },
      { heading: "The freeze-dried market in Bangladesh", body: "Until recently, freeze-dried coffee in Bangladesh meant imported jars from European brands. These are good products, but they carry a significant import premium. A 100g jar typically costs ৳780–990 in local retail — roughly ৳8–10 per gram, which puts it out of daily-use range for most people." },
      { heading: "What the import segment offers and what it costs", body: "Imported freeze-dried options are available in Shwapno, Meena Bazar, and on Daraz. The quality is generally reliable. The main limitation is price: at that cost, it's a luxury purchase rather than a daily choice — which is a gap the local market is now beginning to fill." },
      { heading: "What \"premium affordable\" actually means", body: "The same freeze-drying process applied to quality Colombian-origin beans doesn't have to cost ৳800 a jar. Midnight Pick uses the same process as the premium imported brands — at roughly a third of the per-gram price. Not by compromising on quality, but by not importing from Europe." },
      { heading: "Where to buy freeze-dried coffee online in Bangladesh", body: "Midnight Pick ships nationwide directly from this site. Freeze-dried options are also available on Daraz and at Shwapno. For the best price-per-gram value, buying directly from a local brand skips the import markup entirely and means faster, simpler delivery." },
      { heading: "Delivery and payment options", body: "Midnight Pick delivers in 1–3 business days inside Dhaka, 3–5 days outside. Cash on delivery, bKash, Nagad, and Rocket are all accepted. Free delivery on orders above ৳499. The ৳99 Trial Pack is the lowest-commitment way to start." },
    ],
    cta: { text: "Order directly — free delivery over ৳499, COD accepted", href: "shop.html" },
  },
};

const JOURNAL_INITIAL = 6;

function JournalCard({ post, onClick }) {
  const color = PILLAR_META[post.pillar] || "#FF9100";
  return (
    <button className="journal-card" onClick={() => onClick(post)} aria-label={`Read: ${post.title}`}>
      <div className="journal-card-accent" style={{ background: color }} />
      <div className="journal-card-body">
        <div className="journal-card-tag" style={{ color }}>
          <span className="journal-tag-dot" style={{ background: color }} />
          {post.pillar}
        </div>
        <h3 className="journal-card-title">{post.title}</h3>
        <p className="journal-card-excerpt">{post.excerpt}</p>
        <div className="journal-card-footer">
          <span className="journal-card-meta">{post.readTime} read</span>
          <span className="journal-card-link" style={{ color }}>
            Read More <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </button>
  );
}

function BlogModal({ post, onClose }) {
  const color = PILLAR_META[post.pillar] || "#FF9100";
  const content = BLOG_CONTENT[post.slug];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="blog-overlay" onClick={handleOverlay} role="dialog" aria-modal="true" aria-label={post.title}>
      <div className="blog-modal">
        <button className="blog-modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={18} />
        </button>

        <div className="blog-modal-header" style={{ borderTopColor: color }}>
          <div className="blog-modal-tag" style={{ color }}>
            <span className="journal-tag-dot" style={{ background: color }} />
            {post.pillar}
          </div>
          <h2 className="blog-modal-title">{post.title}</h2>
          <div className="blog-modal-meta">
            <i className="fa-regular fa-clock" aria-hidden="true" />
            {post.readTime} read
          </div>
        </div>

        <div className="blog-modal-divider" style={{ background: color }} />

        <div className="blog-modal-body">
          {content && content.sections.map((s, i) => (
            <React.Fragment key={i}>
              {s.heading && <h4 className="blog-modal-section-heading">{s.heading}</h4>}
              <p className="blog-modal-p">{s.body}</p>
            </React.Fragment>
          ))}

          {content && content.disclaimer && (
            <p className="blog-modal-disclaimer">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              {content.disclaimer}
            </p>
          )}
        </div>

        {content && content.cta && (
          <div className="blog-modal-cta-wrap">
            <a className="blog-modal-cta-btn" href={content.cta.href} style={{ background: color, borderColor: color }}>
              {content.cta.text} <ArrowRight size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function TheJournal() {
  const [showAll, setShowAll] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const visible = showAll ? BLOG_POSTS : BLOG_POSTS.slice(0, JOURNAL_INITIAL);

  return (
    <section className="journal" id="journal" data-screen-label="05 The Journal">
      <div className="journal-inner">
        <div className="journal-header">
          <div className="eyebrow" style={{ justifyContent: "center", marginBottom: 14, color: "var(--burgundy)" }}>
            Stories &amp; Guides <span className="arrow">→</span>
          </div>
          <h2 className="journal-h2">The <em className="italic-accent">Journal</em></h2>
          <p className="journal-subtitle">Straight answers about freeze-dried coffee — how it's made, whether it's healthy, how to store it, and how to make the perfect cup.</p>
        </div>
        <div className="journal-grid">
          {visible.map((post) => (
            <JournalCard key={post.slug} post={post} onClick={setActivePost} />
          ))}
        </div>
        {!showAll && BLOG_POSTS.length > JOURNAL_INITIAL && (
          <div className="journal-load-more-wrap">
            <button className="journal-load-more-btn" onClick={() => setShowAll(true)}>
              Load More <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
      {activePost && <BlogModal post={activePost} onClose={() => setActivePost(null)} />}
    </section>
  );
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

{ topic: "delivery", q: "Where is my order?",                           trackLink: true },
{ topic: "delivery", q: "Where can I buy Midnight Pick in Bangladesh?",        a: "Directly through this website. Delivery across Bangladesh: 1–3 working days inside Dhaka, 3–5 days outside. Free shipping on orders over ৳499." },
{ topic: "delivery", q: "How can I pay?",                                       a: "Cash on delivery, bKash, Nagad, Rocket, and debit/credit cards." },
{ topic: "delivery", q: "Can I return a product?",                             a: "Yes, for damaged or incorrect orders within 7 days of delivery. Message us on WhatsApp and we'll sort it out directly." },
{ topic: "delivery", q: "Where do you deliver?",                               a: "Across Bangladesh. Free delivery inside Dhaka over ৳499, cash on delivery and bKash/Nagad/Rocket accepted. Standard delivery: 1–3 days inside Dhaka, 3–5 days outside." }];


function FAQ({ onTrack }) {
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
                  <div className="faq-a">
                    {f.trackLink
                      ? <span>Track your order in real time using your Order ID.{" "}
                          <button className="faq-text-link" onClick={onTrack}>Open order tracker →</button>
                        </span>
                      : f.a}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>);
}

// ----------------- footer -----------------
function Footer({ onTrack }) {
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
            <a href="https://wa.me/8801829531588" aria-label="WhatsApp">{SocialIcons.wa}</a>
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
          </ul>
        </div>
        <div>
          <h5>Support</h5>
          <ul>
            <li><button className="footer-text-btn" onClick={onTrack}>Track your order</button></li>
            <li><a href="#">Return policy</a></li>
            <li><a href="https://wa.me/8801829531588">WhatsApp support</a></li>
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
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("mp_cart") || "[]"); } catch { return []; }
  });
  const [toasts, setToasts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [authOpen,  setAuthOpen]  = useState(false);

  useEffect(() => {applyPalette(t.palette);}, [t.palette]);
  useEffect(() => { sessionStorage.setItem("mp_cart", JSON.stringify(cart)); }, [cart]);

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
      <Nav cartCount={cart.length} onShop={onShop} onSubscribe={() => setModalOpen(true)} onSignIn={() => setAuthOpen(true)} />
      <Hero headline={t.headline} showMountain={t.showMountain} />
      <Story />
      <Collection onAdd={addToCart} />
      <Promo onShop={onShop} />
      <TheJournal />
      <Why />
      <Howto />
      <Pricing onSubscribe={() => setModalOpen(true)} />
      <FAQ onTrack={() => setTrackOpen(true)} />
      <Footer onTrack={() => setTrackOpen(true)} />
      <StickyCart cartCount={cart.length} onShop={onShop} />
      <ToastStack toasts={toasts} />
      <SubscribeModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <TrackOrderModal open={trackOpen} onClose={() => setTrackOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

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