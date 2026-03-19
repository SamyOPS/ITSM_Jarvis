export function HomePage() {
  return (
    <section className="panel">
      <span className="panel-tag">P1.1</span>
      <h2>Authentication foundation prepared</h2>
      <p>
        The frontend now exposes a clean base structure and an auth readiness
        slice for Supabase and role-based access.
      </p>
      <ul className="checklist">
        <li>Supabase auth setup screen available</li>
        <li>Default roles defined: USER, AGENT, ADMIN</li>
        <li>Ready for token validation and RBAC in P1.2 and P1.3</li>
      </ul>
    </section>
  );
}
