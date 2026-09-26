export default function AppLoading() {
  return (
    <div className="loading-stack" aria-label="Loading page" role="status">
      <div className="skeleton skeleton-line" style={{ width: "180px", height: "25px" }} />
      <div className="skeleton skeleton-line" style={{ width: "320px", maxWidth: "80%" }} />
      <div className="stat-grid" style={{ marginTop: 15 }}>
        {Array.from({ length: 4 }, (_, index) => <div className="skeleton skeleton-card" key={index} />)}
      </div>
      <div className="dashboard-columns">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}