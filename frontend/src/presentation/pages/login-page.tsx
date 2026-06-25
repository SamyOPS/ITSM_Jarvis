import { type FormEvent, useState } from 'react';
import { navigateTo } from '../../infrastructure/routing/browser-router';

type LoginPageProps = {
  errorMessage: string | null;
  isBusy: boolean;
  onPasswordResetRequest: (email: string) => Promise<void>;
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

export function LoginPage({
  errorMessage,
  isBusy,
  onPasswordResetRequest,
  onSubmit,
}: LoginPageProps) {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [isForgotBusy, setIsForgotBusy] = useState(false);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password);
  }

  async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsForgotBusy(true);
    setForgotMessage(null);

    try {
      await onPasswordResetRequest(forgotEmail.trim());
      setForgotMessage(
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      );
    } catch (error) {
      setForgotMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'envoi du lien.",
      );
    } finally {
      setIsForgotBusy(false);
    }
  }

  return (
    <section className="login-layout">
      <section className="login-panel">
        <div className="login-panel-header">
          <div className="login-brand">
            <span className="login-brand-icon">
              <i className="bi bi-person-circle" aria-hidden="true" />
            </span>
            <strong>Compte Vision</strong>
          </div>
          <h2>Connexion</h2>
          <p>Un seul écran pour se connecter ou créer un compte demandeur.</p>
        </div>

        <div className="login-mode-tabs" aria-label="Choix du mode">
          <button className="login-mode-tab is-active" type="button">
            <span className="login-mode-tab-icon">
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
            </span>
            Connexion
          </button>
          <button
            className="login-mode-tab"
            onClick={() => navigateTo('/register')}
            type="button"
          >
            <span className="login-mode-tab-icon">
              <i className="bi bi-person-plus" aria-hidden="true" />
            </span>
            Inscription
          </button>
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

        <button
          className="login-forgot-button"
          onClick={() => {
            setForgotMode((current) => !current);
            setForgotEmail(email);
            setForgotMessage(null);
          }}
          type="button"
        >
          Mot de passe oublié ?
        </button>

        {forgotMode ? (
          <form
            className="login-form login-forgot-form"
            onSubmit={(event) => void handleForgotSubmit(event)}
          >
            <label className="field">
              <span>Email du compte</span>
              <input
                autoComplete="email"
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="nom@jarvis.fr"
                required
                type="email"
                value={forgotEmail}
              />
            </label>

            <button
              className="secondary-button"
              disabled={isForgotBusy}
              type="submit"
            >
              {isForgotBusy ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>

            {forgotMessage ? (
              <p className="ticket-form-helper">{forgotMessage}</p>
            ) : null}
          </form>
        ) : null}
      </section>
    </section>
  );
}
