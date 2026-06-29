/* Built from lazy-image.jsx. Run: node scripts/build-jsx.js */
function LazyImage({
  src,
  alt = "",
  className = "",
  style = {},
  width,
  height,
  onLoad,
  srcset,
  webpSrcset
}) {
  var [loaded, setLoaded] = useState(false);
  var [error, setError] = useState(false);
  var imgRef = useRef(null);
  useEffect(() => {
    if (!imgRef.current) return;
    var observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        var img = new Image();
        img.onload = () => {
          setLoaded(true);
          if (imgRef.current) {
            imgRef.current.src = src;
            if (srcset) imgRef.current.srcset = srcset;
          }
          if (onLoad) onLoad();
        };
        img.onerror = () => {
          setError(true);
          setLoaded(true);
        };
        img.src = src;
        observer.unobserve(entry.target);
      }
    }, {
      rootMargin: '50px'
    });
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src, srcset, onLoad]);
  var isWebP = src?.endsWith('.webp') || webpSrcset;
  return React.createElement(React.Fragment, null, isWebP && webpSrcset ? React.createElement("picture", null, React.createElement("source", {
    srcSet: webpSrcset,
    type: "image/webp"
  }), React.createElement("img", {
    ref: imgRef,
    alt: alt,
    className: className,
    src: src,
    srcSet: srcset,
    style: {
      ...style,
      opacity: loaded ? 1 : 0.8,
      transition: 'opacity 0.3s ease'
    },
    width: width,
    height: height
  })) : React.createElement("img", {
    ref: imgRef,
    alt: alt,
    className: className,
    src: src,
    srcSet: srcset,
    style: {
      ...style,
      opacity: loaded ? 1 : 0.8,
      transition: 'opacity 0.3s ease'
    },
    width: width,
    height: height
  }), !loaded && !error && React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.1)',
      borderRadius: 'inherit',
      animation: 'pulse 2s infinite'
    }
  }));
}
