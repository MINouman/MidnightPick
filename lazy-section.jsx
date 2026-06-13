// ── Lazy Section Loader ────────────────────────────────────────
// Renders children only when section scrolls into view
function LazySection({ children, fallback = null, threshold = 0.1, rootMargin = "50px" }) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={sectionRef}>
      {isVisible ? children : fallback}
    </div>
  );
}

// ── Lazy Component Loader ───────────────────────────────────────
// Dynamically loads component when visible
function LazyComponent({ component: Component, fallback = <SkeletonCard />, ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "100px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? <Component {...props} /> : fallback}
    </div>
  );
}

// ── Image Preloader ─────────────────────────────────────────────
// Preload critical images for faster display
function preloadImage(src) {
  const img = new Image();
  img.src = src;
  return new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
}

// Preload multiple images in parallel
async function preloadImages(sources) {
  return Promise.all(sources.map(preloadImage));
}
