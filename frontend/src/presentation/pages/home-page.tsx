export function HomePage() {
  return (
    <section className="panel">
      <span className="panel-tag">P1.4</span>
      <h2>Frontend auth session in place</h2>
      <p>
        The frontend now exposes login, logout, and local session restoration on
        top of the Supabase and backend auth slices.
      </p>
      <ul className="checklist">
        <li>Login route available with Supabase password sign-in</li>
        <li>Current session restored from local storage on reload</li>
        <li>Logout clears the local session and backend user snapshot</li>
      </ul>
    </section>
  );
}
