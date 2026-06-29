/* Built from skeleton.jsx. Run: node scripts/build-jsx.js */
function SkeletonBox({
  width = "100%",
  height = "20px",
  style = {},
  count = 1
}) {
  return React.createElement(React.Fragment, null, Array(count).fill(0).map((_, i) => React.createElement("div", {
    key: i,
    style: {
      width,
      height,
      background: "linear-gradient(90deg, rgba(87,31,41,0.1) 0%, rgba(87,31,41,0.2) 50%, rgba(87,31,41,0.1) 100%)",
      backgroundSize: "1000px 100%",
      animation: "skeleton-loading 2s infinite",
      borderRadius: "4px",
      marginBottom: i < count - 1 ? "8px" : "0",
      ...style
    }
  })));
}
function SkeletonImage({
  width = "100%",
  height = "200px",
  style = {}
}) {
  return React.createElement("div", {
    style: {
      width,
      height,
      background: "linear-gradient(90deg, rgba(87,31,41,0.1) 0%, rgba(87,31,41,0.2) 50%, rgba(87,31,41,0.1) 100%)",
      backgroundSize: "1000px 100%",
      animation: "skeleton-loading 2s infinite",
      borderRadius: "8px",
      ...style
    }
  });
}
function SkeletonText({
  lines = 3,
  style = {}
}) {
  return React.createElement("div", {
    style: style
  }, Array(lines).fill(0).map((_, i) => React.createElement(SkeletonBox, {
    key: i,
    width: i === lines - 1 ? "80%" : "100%",
    height: "16px",
    style: {
      marginBottom: i < lines - 1 ? "10px" : "0"
    }
  })));
}
function SkeletonCard({
  style = {}
}) {
  return React.createElement("div", {
    style: {
      background: "var(--card)",
      borderRadius: "12px",
      padding: "16px",
      border: "1px solid var(--text-08)",
      ...style
    }
  }, React.createElement(SkeletonImage, {
    height: "180px",
    style: {
      marginBottom: "12px"
    }
  }), React.createElement(SkeletonBox, {
    height: "18px",
    width: "80%",
    style: {
      marginBottom: "8px"
    }
  }), React.createElement(SkeletonBox, {
    height: "14px",
    width: "60%"
  }));
}
