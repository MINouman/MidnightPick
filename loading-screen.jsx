// ── Reusable Loading Screen with Cup Animation ──────────────────
function LoadingScreen({ message = "Loading…" }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      flexDirection: "column",
      gap: 24,
      background: "var(--bg, #1a0d07)"
    }}>
      <div className="loader" aria-label="Loading" role="status">
        <div className="cup">
          <div className="cup-handle"></div>
          <div className="smoke one"></div>
          <div className="smoke two"></div>
          <div className="smoke three"></div>
        </div>
        <div className="load">{message}</div>
      </div>
    </div>
  );
}
