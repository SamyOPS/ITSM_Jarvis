import { type FormEvent, useState } from 'react';

type LoginPageProps = {
  errorMessage: string | null;
  isBusy: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function LoginPage({ errorMessage, isBusy, onSubmit }: LoginPageProps) {
  const [email, setEmail] = useState('demandeur@jarvis.fr');
  const [password, setPassword] = useState('Demandeur123!');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password);
  }

  return (
    <section className="panel">
      <span className="panel-tag">P1.4</span>
      <h2>Login and session management</h2>
      <p>
        Authenticate against Supabase, store the session locally, and validate
        the connected user through the backend token check.
      </p>

      <form
        className="auth-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        <button className="primary-button" disabled={isBusy} type="submit">
          {isBusy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <dl className="status-grid">
        <div>
          <dt>Default test email</dt>
          <dd>demandeur@jarvis.fr</dd>
        </div>
        <div>
          <dt>Default app role</dt>
          <dd>DEMANDEUR</dd>
        </div>
        <div>
          <dt>Other test accounts</dt>
          <dd>agent@jarvis.fr / admin@jarvis.fr</dd>
        </div>
        <div>
          <dt>Known test passwords</dt>
          <dd>Demandeur123! / Agent123! / Admin123!</dd>
        </div>
        <div>
          <dt>Last error</dt>
          <dd>{errorMessage ?? 'none'}</dd>
        </div>
      </dl>
    </section>
  );
}
