/* Built from lazy-section.jsx. Run: node scripts/build-jsx.js */
function LazySection({
  children,
  fallback = null,
  threshold = 0.1,
  rootMargin = "50px"
}) {
  var [isVisible, setIsVisible] = useState(false);
  var sectionRef = useRef(null);
  useEffect(() => {
    var observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold,
      rootMargin
    });
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => observer.disconnect();
  }, [threshold, rootMargin]);
  return React.createElement("div", {
    ref: sectionRef
  }, isVisible ? children : fallback);
}
function LazyComponent({
  component: Component,
  fallback = React.createElement(SkeletonCard, null),
  ...props
}) {
  var [isVisible, setIsVisible] = useState(false);
  var ref = useRef(null);
  useEffect(() => {
    var observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      rootMargin: "100px"
    });
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);
  return React.createElement("div", {
    ref: ref
  }, isVisible ? React.createElement(Component, props) : fallback);
}
function preloadImage(src) {
  var img = new Image();
  img.src = src;
  return new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
}
async function preloadImages(sources) {
  return Promise.all(sources.map(preloadImage));
}
