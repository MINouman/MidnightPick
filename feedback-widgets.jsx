// Midnight Pick — customer insight widgets
// Self-contained (injects its own CSS) so it works on the shop page AND the
// dashboards, which load different stylesheets.
//   • MPFeedbackCard  — private ordering-experience feedback on order success
//   • MPReviewPrompt  — public verified-purchase review prompt after delivery

(function () {
  function getMidnightApiBase() {
    if (window.MIDNIGHT_API_BASE) return window.MIDNIGHT_API_BASE.replace(/\/$/, "");

    const hostname = window.location.hostname || "localhost";
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const base = `${protocol}//${hostname}:3000/api/v1`;
    window.MIDNIGHT_API_BASE = base;
    return base;
  }

  const MP_API = getMidnightApiBase();

  // ── Shared styles ──────────────────────────────────────────────────────────
  const css = `
  .mpw-card {
    background: #FBEDD9;
    border: 1px solid rgba(87,31,41,.12);
    border-radius: 18px;
    padding: 16px 16px 12px;
    margin: 0 0 18px;
    text-align: left;
    box-shadow: 0 6px 24px rgba(87,31,41,.07);
    animation: mpwRise .45s ease both;
  }
  .mpw-eyebrow {
    font-size: 9.5px; font-weight: 800; letter-spacing: .13em;
    color: #FF9100; text-transform: uppercase; margin: 0 0 6px;
    font-family: inherit;
  }
  .mpw-title {
    margin: 0 0 4px; font-size: 16.5px; font-weight: 800;
    color: #571F29; line-height: 1.25;
  }
  .mpw-sub { margin: 0 0 14px; font-size: 12.5px; color: rgba(44,24,16,.6); line-height: 1.5; }
  .mpw-emotions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 4px; }
  .mpw-emotion {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 12px 6px 10px; min-height: 64px;
    background: #FFFDF7; border: 1.5px solid rgba(87,31,41,.14); border-radius: 14px;
    font-size: 12px; font-weight: 700; color: rgba(87,31,41,.75);
    cursor: pointer; transition: border-color .15s, background .15s, transform .12s;
    font-family: inherit;
  }
  .mpw-emotion i { font-size: 19px; }
  .mpw-emotion .mpw-i-easy { color: #2E7D4F; }
  .mpw-emotion .mpw-i-okay { color: #C98A1B; }
  .mpw-emotion .mpw-i-conf { color: #C25555; }
  .mpw-emotion:hover { transform: translateY(-1px); border-color: rgba(87,31,41,.3); }
  .mpw-emotion.selected { border-color: #FF9100; background: rgba(255,145,0,.09); color: #571F29; }
  .mpw-textarea {
    width: 100%; box-sizing: border-box; margin-top: 10px;
    padding: 10px 13px; font-size: 13px; font-family: inherit;
    border: 1.5px solid rgba(87,31,41,.14); border-radius: 12px;
    background: #FFFDF7; color: #2C1810; outline: none; resize: vertical; min-height: 64px;
    transition: border-color .15s, box-shadow .15s;
  }
  .mpw-textarea:focus { border-color: #FF9100; box-shadow: 0 0 0 3px rgba(255,145,0,.12); }
  .mpw-textarea::placeholder { color: rgba(44,24,16,.35); }
  .mpw-label { display: block; margin: 12px 0 0; font-size: 10.5px; font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase; color: rgba(44,24,16,.5); }
  .mpw-label .mpw-opt { margin-left: 5px; font-size: 9px; font-weight: 800; letter-spacing: .08em;
    color: #FF9100; background: rgba(255,145,0,.12); padding: 2px 7px; border-radius: 999px; }
  .mpw-cta {
    width: 100%; margin-top: 12px; padding: 12px; min-height: 46px;
    background: #FF9100; color: #2C1810; border: none; border-radius: 13px;
    font-size: 14px; font-weight: 800; font-family: inherit; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(255,145,0,.38);
    transition: filter .15s, transform .12s;
  }
  .mpw-cta:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
  .mpw-cta:disabled { opacity: .65; cursor: not-allowed; }
  .mpw-skip {
    display: block; margin: 10px auto 0; background: none; border: none;
    font-size: 12.5px; font-weight: 600; color: rgba(44,24,16,.45);
    cursor: pointer; padding: 6px 12px; font-family: inherit; transition: color .15s;
  }
  .mpw-skip:hover { color: rgba(44,24,16,.7); }
  .mpw-thanks { display: flex; align-items: center; gap: 10px; padding: 6px 2px; }
  .mpw-thanks i { font-size: 20px; color: #2E7D4F; }
  .mpw-thanks-t { font-size: 13.5px; font-weight: 700; color: #571F29; margin: 0; }
  .mpw-thanks-s { font-size: 12px; color: rgba(44,24,16,.55); margin: 2px 0 0; }

  /* ── Review prompt modal / bottom sheet ── */
  .mprv-overlay {
    position: fixed; inset: 0; z-index: 1300;
    background: rgba(33,16,13,.5);
    -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center; padding: 22px;
    animation: mpwFade .3s ease both;
  }
  .mprv-modal {
    position: relative; width: 100%; max-width: 420px; max-height: 92vh; overflow-y: auto;
    background: #FFFDF7; border: 1px solid rgba(87,31,41,.1); border-radius: 26px;
    padding: 28px 26px 22px; box-shadow: 0 28px 80px rgba(58,31,26,.32);
    animation: mpwPop .45s cubic-bezier(.26,1.04,.42,1) both;
  }
  .mprv-handle { display: none; }
  .mprv-close {
    position: absolute; top: 14px; right: 14px; width: 30px; height: 30px;
    border: none; border-radius: 9px; background: rgba(44,24,16,.06); color: #2C1810;
    font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .mprv-close:hover { background: rgba(44,24,16,.13); }
  .mprv-title { margin: 0 0 5px; font-size: 21px; font-weight: 800; color: #571F29; line-height: 1.2; }
  .mprv-sub { margin: 0 0 18px; font-size: 13px; color: rgba(44,24,16,.6); line-height: 1.55; }
  .mprv-q { margin: 0 0 8px; font-size: 10.5px; font-weight: 800; letter-spacing: .08em;
    text-transform: uppercase; color: rgba(44,24,16,.5); }
  .mprv-stars { display: flex; gap: 6px; margin-bottom: 16px; }
  .mprv-star {
    background: none; border: none; cursor: pointer; padding: 4px;
    font-size: 30px; line-height: 1; color: rgba(87,31,41,.18);
    transition: color .12s, transform .12s;
  }
  .mprv-star.on { color: #FF9100; }
  .mprv-star:hover { transform: scale(1.12); }
  .mprv-star-word { font-size: 12.5px; font-weight: 800; color: #FF9100; margin: -8px 0 14px; min-height: 16px; }
  .mprv-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
  .mprv-tag {
    padding: 9px 15px; min-height: 38px; border-radius: 999px;
    background: #FFFDF7; border: 1.5px solid rgba(87,31,41,.16);
    font-size: 12.5px; font-weight: 700; color: rgba(87,31,41,.75);
    cursor: pointer; font-family: inherit; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .mprv-tag:hover { border-color: rgba(87,31,41,.35); }
  .mprv-tag.on { border-color: #FF9100; background: rgba(255,145,0,.1); color: #571F29; }
  .mprv-tag.on i { color: #FF9100; }
  .mprv-reassure {
    margin: 12px 0 0; font-size: 11px; color: rgba(44,24,16,.45);
    line-height: 1.55; text-align: center;
  }
  .mprv-thanks { text-align: center; padding: 18px 0 10px; }
  .mprv-thanks i { font-size: 38px; color: #2E7D4F; margin-bottom: 12px; display: block; }
  .mprv-err { margin: 10px 0 0; font-size: 12px; color: #C25555; background: rgba(194,85,85,.08);
    border: 1px solid rgba(194,85,85,.25); border-radius: 10px; padding: 8px 12px; }

  @keyframes mpwFade { from { opacity: 0; } }
  @keyframes mpwRise { from { opacity: 0; transform: translateY(10px); } }
  @keyframes mpwPop  { from { opacity: 0; transform: translateY(24px) scale(.97); } }
  @keyframes mpwSheet { from { transform: translateY(100%); } }

  @media (max-width: 639px) {
    .mprv-overlay { padding: 0; align-items: flex-end; }
    .mprv-modal {
      max-width: 100%; border-radius: 26px 26px 0 0; max-height: 92dvh;
      padding: 30px 22px calc(22px + env(safe-area-inset-bottom));
      animation: mpwSheet .45s cubic-bezier(.32,.72,0,1) both;
    }
    .mprv-handle {
      display: block; position: absolute; top: 9px; left: 50%; transform: translateX(-50%);
      width: 42px; height: 5px; border-radius: 999px; background: rgba(87,31,41,.18);
    }
    .mprv-star { font-size: 34px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .mpw-card, .mprv-overlay, .mprv-modal { animation: none !important; }
  }`;

  if (!document.getElementById("mp-widget-css")) {
    const tag = document.createElement("style");
    tag.id = "mp-widget-css";
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  const deviceType = () =>
    window.innerWidth <= 640 ? "mobile" : window.innerWidth <= 1024 ? "tablet" : "desktop";

  // ── MPFeedbackCard ─────────────────────────────────────────────────────────
  // Inline card for the order-success view. One question, optional comment,
  // skippable, never blocks confirmation. Remembers per order.
  function MPFeedbackCard({ orderRef }) {
    const doneKey = `mp_fb_done_${orderRef}`;
    const [phase, setPhase]     = React.useState(() =>
      localStorage.getItem(doneKey) ? "hidden" : "ask"); // ask | thanks | hidden
    const [emotion, setEmotion] = React.useState(null);
    const [comment, setComment] = React.useState("");
    const [busy, setBusy]       = React.useState(false);

    if (!orderRef || phase === "hidden") return null;

    const submit = async () => {
      if (!emotion || busy) return;
      setBusy(true);
      try {
        await fetch(`${MP_API}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_ref:   orderRef,
            emotion,
            ...(comment.trim() ? { comment: comment.trim() } : {}),
            device_type: deviceType(),
            page_source: "order_confirmation",
          }),
        });
      } catch { /* feedback is best-effort — never block the success page */ }
      localStorage.setItem(doneKey, "1");
      setPhase("thanks");
      setBusy(false);
    };

    const skip = () => {
      localStorage.setItem(doneKey, "1");
      setPhase("hidden");
    };

    if (phase === "thanks") return (
      <div className="mpw-card">
        <div className="mpw-thanks">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <div>
            <p className="mpw-thanks-t">Thank you!</p>
            <p className="mpw-thanks-s">Your note helps us make Midnight Pick smoother.</p>
          </div>
        </div>
      </div>
    );

    const emotions = [
      { id: "very_easy", label: "Very easy", icon: "fa-face-laugh-beam", cls: "mpw-i-easy" },
      { id: "okay",      label: "Okay",      icon: "fa-face-meh",        cls: "mpw-i-okay" },
      { id: "confusing", label: "Confusing", icon: "fa-face-frown",      cls: "mpw-i-conf" },
    ];

    return (
      <div className="mpw-card">
        <h3 className="mpw-title" style={{ marginBottom: 12 }}>How was your ordering experience?</h3>

        <div className="mpw-emotions" role="radiogroup" aria-label="Was it easy to place your order?">
          {emotions.map(e => (
            <button
              key={e.id} type="button" role="radio" aria-checked={emotion === e.id}
              className={`mpw-emotion${emotion === e.id ? " selected" : ""}`}
              onClick={() => setEmotion(e.id)}
            >
              <i className={`fa-solid ${e.icon} ${e.cls}`} aria-hidden="true" />
              {e.label}
            </button>
          ))}
        </div>

        {emotion && (
          <>
            <label className="mpw-label" htmlFor="mpw-comment">
              What should we improve? <span className="mpw-opt">Optional</span>
            </label>
            <textarea
              id="mpw-comment" className="mpw-textarea" rows={2} maxLength={1000}
              placeholder="Tell us if anything felt unclear, slow, or difficult."
              value={comment} onChange={e => setComment(e.target.value)}
            />
            <button type="button" className="mpw-cta" disabled={busy} onClick={submit}>
              {busy ? "Sending…" : "Submit Feedback"}
            </button>
          </>
        )}

        <button type="button" className="mpw-skip" onClick={skip}>Maybe later</button>
      </div>
    );
  }

  // ── MPReviewPrompt ─────────────────────────────────────────────────────────
  // Verified-purchase review prompt. Self-managing: checks eligibility for the
  // signed-in member (delivered order ≥ 24h, not yet reviewed, not snoozed)
  // and stays silent otherwise. `suppress` keeps it away during checkout.
  const SNOOZE_KEY = "mp_review_snooze_until";
  const DONE_KEY   = "mp_review_done";

  const REVIEW_TAGS = [
    { id: "taste",        label: "Taste" },
    { id: "aroma",        label: "Aroma" },
    { id: "easy_to_make", label: "Easy to make" },
    { id: "energy_focus", label: "Energy / Focus" },
    { id: "packaging",    label: "Packaging" },
    { id: "delivery",     label: "Delivery" },
  ];
  const STAR_WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

  function MPReviewPrompt({ source = "site_revisit", suppress = false, delay = 1400, triggerKey = 0, manual = false, orderId = null, productSlug = "midnight-blend" }) {
    const [open, setOpen]       = React.useState(false);
    const [rating, setRating]   = React.useState(0);
    const [hover, setHover]     = React.useState(0);
    const [tags, setTags]       = React.useState([]);
    const [text, setText]       = React.useState("");
    const [busy, setBusy]       = React.useState(false);
    const [error, setError]     = React.useState("");
    const [thanks, setThanks]   = React.useState(false);

    React.useEffect(() => {
      if (manual) return;
      if (localStorage.getItem(DONE_KEY)) return;
      const snooze = parseInt(localStorage.getItem(SNOOZE_KEY) || "0", 10);
      if (snooze > Date.now()) return;

      let cancelled = false;
      const q = new URLSearchParams({ product: productSlug });
      // Tokens in httpOnly cookies, sent automatically with credentials: include
      fetch(`${MP_API}/reviews/eligibility?${q.toString()}`, { credentials: 'include' })
        .then(r => r.json())
        .then(json => {
          if (cancelled || !json?.ok) return;
          if (json.data.eligible) {
            setTimeout(() => { if (!cancelled) setOpen(true); }, delay);
          } else if (json.data.reason === "already_reviewed") {
            localStorage.setItem(DONE_KEY, "1");
          } else if (json.data.reason === "recently_dismissed") {
            localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 86400000));
          }
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }, []);

    React.useEffect(() => {
      if (!manual || !triggerKey) return;
      setRating(0); setHover(0); setTags([]); setText(""); setThanks(false); setError("");
      const q = new URLSearchParams({ prompt: "false", product: productSlug });
      if (orderId) q.set("order_id", orderId);
      // Tokens in httpOnly cookies, sent automatically with credentials: include
      fetch(`${MP_API}/reviews/eligibility?${q.toString()}`, { credentials: 'include' })
        .then(r => r.json())
        .then(json => {
          if (json?.data?.eligible) {
            setOpen(true);
          } else if (json?.data?.reason === "already_reviewed") {
            setOpen(true);
            setError("You have already reviewed this product.");
          } else {
            setOpen(true);
            setError("Reviews open once your order has been delivered.");
          }
        })
        .catch(() => {
          setOpen(true);
          setError("Could not check review eligibility. Please try again.");
        });
    }, [manual, triggerKey]);

    React.useEffect(() => {
      if (open && !suppress) document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }, [open, suppress]);

    if (!open || suppress) return null;

    const dismiss = async () => {
      setOpen(false);
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 86400000));
      try {
        // Tokens in httpOnly cookies, sent automatically with credentials: include
        await fetch(`${MP_API}/reviews/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ source }),
        });
      } catch {}
    };

    const toggleTag = (id) =>
      setTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

    const submit = async () => {
      if (!rating || busy) return;
      setBusy(true); setError("");
      try {
        // Tokens in httpOnly cookies, sent automatically with credentials: include
        const res = await fetch(`${MP_API}/reviews/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            rating,
            product_slug: productSlug,
            ...(orderId ? { order_id: orderId } : {}),
            highlight_tags: tags,
            ...(text.trim() ? { review_text: text.trim() } : {}),
            source,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message || "Could not submit your review.");
        localStorage.setItem(DONE_KEY, "1");
        setThanks(true);
        setTimeout(() => setOpen(false), 2600);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };

    const word = STAR_WORDS[hover || rating];

    return (
      <div className="mprv-overlay" onClick={e => e.target === e.currentTarget && dismiss()}
           role="dialog" aria-modal="true" aria-label="Review your Midnight Pick">
        <div className="mprv-modal">
          <div className="mprv-handle" aria-hidden="true" />
          <button className="mprv-close" onClick={dismiss} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>

          {thanks ? (
            <div className="mprv-thanks">
              <i className="fa-solid fa-mug-hot" aria-hidden="true" />
              <h3 className="mprv-title">Thank you!</h3>
              <p className="mprv-sub" style={{ marginBottom: 0 }}>
                Your review has been submitted and will appear after admin approval.
              </p>
            </div>
          ) : (
            <>
              <p className="mpw-eyebrow">Verified purchase</p>
              <h3 className="mprv-title">Enjoyed your Midnight Pick?</h3>
              <p className="mprv-sub">Your review helps other coffee lovers choose better.</p>

              <p className="mprv-q">Rate your coffee experience</p>
              <div className="mprv-stars" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i} type="button" role="radio" aria-checked={rating === i}
                    aria-label={`${i} star${i > 1 ? "s" : ""}`}
                    className={`mprv-star${(hover || rating) >= i ? " on" : ""}`}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(i)}
                  >
                    <i className="fa-solid fa-star" aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="mprv-star-word">{word}</div>

              <p className="mprv-q">What stood out most?</p>
              <div className="mprv-tags">
                {REVIEW_TAGS.map(t => (
                  <button key={t.id} type="button"
                          className={`mprv-tag${tags.includes(t.id) ? " on" : ""}`}
                          aria-pressed={tags.includes(t.id)}
                          onClick={() => toggleTag(t.id)}>
                    {tags.includes(t.id) && <i className="fa-solid fa-check" aria-hidden="true" />}
                    {t.label}
                  </button>
                ))}
              </div>

              <label className="mpw-label" htmlFor="mprv-text">
                Write a short review <span className="mpw-opt">Optional</span>
              </label>
              <textarea
                id="mprv-text" className="mpw-textarea" rows={3} maxLength={1000}
                placeholder="Share what you liked or what could be better."
                value={text} onChange={e => setText(e.target.value)}
              />

              {error && <p className="mprv-err">{error}</p>}

              <button type="button" className="mpw-cta" disabled={!rating || busy} onClick={submit}>
                {busy ? "Sending…" : "Submit Review"}
              </button>
              <button type="button" className="mpw-skip" onClick={dismiss}>Not now</button>

              <p className="mprv-reassure">
                Shown publicly with your first name only. Your phone number is never displayed.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  Object.assign(window, { MPFeedbackCard, MPReviewPrompt });
})();
