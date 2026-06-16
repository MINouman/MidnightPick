// ── Lazy Image Loader with Skeleton ────────────────────────────
function LazyImage({ src, alt = "", className = "", style = {}, width, height, onLoad, srcset, webpSrcset }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
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
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src, srcset, onLoad]);

  const isWebP = src?.endsWith('.webp') || webpSrcset;

  return (
    <>
      {isWebP && webpSrcset ? (
        <picture>
          <source srcSet={webpSrcset} type="image/webp" />
          <img
            ref={imgRef}
            alt={alt}
            className={className}
            src={src}
            srcSet={srcset}
            style={{
              ...style,
              opacity: loaded ? 1 : 0.8,
              transition: 'opacity 0.3s ease',
            }}
            width={width}
            height={height}
          />
        </picture>
      ) : (
        <img
          ref={imgRef}
          alt={alt}
          className={className}
          src={src}
          srcSet={srcset}
          style={{
            ...style,
            opacity: loaded ? 1 : 0.8,
            transition: 'opacity 0.3s ease',
          }}
          width={width}
          height={height}
        />
      )}
      {!loaded && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.1)',
            borderRadius: 'inherit',
            animation: 'pulse 2s infinite',
          }}
        />
      )}
    </>
  );
}
