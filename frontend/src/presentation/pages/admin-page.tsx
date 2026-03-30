import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

type AdminPageProps = {
  session: AuthSessionSnapshot;
};

export function AdminPage({ session }: AdminPageProps) {
  return (
    <section className="panel">
      <span className="panel-tag">P1.5</span>
      <h2>Admin workspace</h2>
      <p>
        This protected route is reserved for admins and exposes the highest
        privilege UI slice of the current frontend prototype.
      </p>
      <ul className="checklist">
        <li>Current session role: {session.user.role}</li>
        <li>Admin session email: {session.user.email}</li>
        <li>Use cases: reference data, policies, privileged operations</li>
      </ul>
    </section>
  );
}
