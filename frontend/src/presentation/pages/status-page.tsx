export function StatusPage() {
  return (
    <section className="panel">
      <span className="panel-tag">Routing</span>
      <h2>Status route ready</h2>
      <p>
        This route is reserved for future frontend to backend integration
        checks.
      </p>
      <div className="status-card">
        <strong>Current state</strong>
        <span>frontend-ready</span>
      </div>
    </section>
  );
}
