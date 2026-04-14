import { type FormEvent, useState } from 'react';

type LoginPageProps = {
  errorMessage: string | null;
  isBusy: boolean;
  onSubmit: (email: string, password: string) => Promise<void>;
};

type DemoAccount = {
  email: string;
  password: string;
  role: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'demandeur@jarvis.fr',
    password: 'Demandeur123!',
    role: 'DEMANDEUR',
  },
  {
    email: 'agent@jarvis.fr',
    password: 'Agent123!',
    role: 'AGENT',
  },
  {
    email: 'admin@jarvis.fr',
    password: 'Admin123!',
    role: 'ADMIN',
  },
];

export function LoginPage({ errorMessage, isBusy, onSubmit }: LoginPageProps) {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password);
  }

  function applyDemoAccount(account: DemoAccount): void {
    setEmail(account.email);
    setPassword(account.password);
  }

  return (
    <section className="login-layout">
      <aside className="login-showcase">
        <div className="login-showcase-overlay" />
        <div className="login-showcase-copy">
          <span className="login-showcase-eyebrow">Jarvis Connect</span>
          <h1>Vision</h1>
          <p>
            Portail de ticketing interne pour incidents, demandes et suivi des
            opérations support.
          </p>
        </div>
        <div className="login-showcase-glow" />
      </aside>

      <section className="login-panel">
        <div className="login-panel-header">
          <span className="panel-tag">Connexion</span>
          <h2>Accès à la plateforme</h2>
          <p>Authentifie-toi avec un compte de test pour accéder à Vision.</p>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@jarvis.fr"
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
              type="password"
              value={password}
            />
          </label>

          <button
            className="login-submit-button"
            disabled={isBusy}
            type="submit"
          >
            {isBusy ? 'Connexion en cours...' : 'Se connecter'}
          </button>

          {errorMessage ? (
            <p className="ticket-form-error">{errorMessage}</p>
          ) : null}
        </form>

        <div className="login-demo-section">
          <div className="login-demo-heading">
            <h3>Comptes de test</h3>
            <p>
              Les trois adresses et mots de passe restent visibles pour tester
              rapidement.
            </p>
          </div>

          <div className="login-demo-grid">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                className="login-demo-card"
                key={account.email}
                onClick={() => applyDemoAccount(account)}
                type="button"
              >
                <span>{account.role}</span>
                <strong>{account.email}</strong>
                <code>{account.password}</code>
              </button>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
