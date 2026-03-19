type AccessDeniedPageProps = {
  role: string;
};

export function AccessDeniedPage({ role }: AccessDeniedPageProps) {
  return (
    <section className="panel">
      <span className="panel-tag">P1.5</span>
      <h2>Access denied</h2>
      <p>
        Your current session is authenticated, but this route is not available
        for the role currently attached to your account.
      </p>
      <dl className="status-grid">
        <div>
          <dt>Current role</dt>
          <dd>{role}</dd>
        </div>
        <div>
          <dt>Expected access</dt>
          <dd>AGENT or ADMIN depending on the protected route</dd>
        </div>
      </dl>
    </section>
  );
}
