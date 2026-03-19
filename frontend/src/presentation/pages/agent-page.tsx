import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

type AgentPageProps = {
  session: AuthSessionSnapshot;
};

export function AgentPage({ session }: AgentPageProps) {
  return (
    <section className="panel">
      <span className="panel-tag">P1.5</span>
      <h2>Agent workspace</h2>
      <p>
        This protected route is visible only to support agents and admins. It
        confirms that frontend route protection and role-aware UI are aligned.
      </p>
      <ul className="checklist">
        <li>Current session role: {session.user.role}</li>
        <li>Assigned user: {session.user.email}</li>
        <li>Use cases: triage, assignment, escalation preparation</li>
      </ul>
    </section>
  );
}
