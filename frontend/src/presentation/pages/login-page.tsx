import { type FormEvent, useMemo, useState } from 'react';
import { navigateTo } from '../../infrastructure/routing/browser-router';

type LoginPageProps = {
  errorMessage: string | null;
  isBusy: boolean;
  onPasswordResetRequest: (email: string) => Promise<void>;
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function LoginPage({
  errorMessage,
  isBusy,
  onPasswordResetRequest,
  onSubmit,
}: LoginPageProps) {
  const prefilledEmail = useMemo(() => readPrefilledEmail(), []);
  const [email, setEmail] = useState(prefilledEmail);
  const [forgotEmail, setForgotEmail] = useState(prefilledEmail);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [isForgotBusy, setIsForgotBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
              <LoginAuthIcon />
            </span>
            <strong>Compte Vision</strong>
          </div>
          <h2>Connexion</h2>
          <p>Un seul écran pour se connecter ou créer un compte demandeur.</p>
        </div>

        <div className="login-mode-tabs" aria-label="Choix du mode">
          <button className="login-mode-tab is-active" type="button">
            <span className="login-mode-tab-icon">
              <LoginAuthIcon />
            </span>
            Connexion
          </button>
          <button
            className="login-mode-tab"
            onClick={() => navigateTo('/register')}
            type="button"
          >
            <span className="login-mode-tab-icon">
              <RegisterAuthIcon />
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
              placeholder="nom@exemple.com"
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <span className="login-password-field">
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={
                  showPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
                className="login-password-eye"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                <EyeIcon isVisible={showPassword} />
              </button>
            </span>
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
                placeholder="nom@exemple.com"
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

function readPrefilledEmail(): string {
  const queryParams = new URLSearchParams(window.location.search);
  const email = queryParams.get('email');

  return email?.trim() ?? '';
}

function LoginAuthIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M6.5 3.5 10 7l-3.5 3.5M10 7H1.75M10.75 2.25h1.75A1.5 1.5 0 0 1 14 3.75v6.5a1.5 1.5 0 0 1-1.5 1.5h-1.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function RegisterAuthIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M5.75 8.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1.5 13.75c.45-2.12 2.08-3.5 4.25-3.5 1.2 0 2.2.42 2.95 1.15M12.25 5.25v5M9.75 7.75h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
    >
      <path
        d="M2.25 9s2.35-4.25 6.75-4.25S15.75 9 15.75 9 13.4 13.25 9 13.25 2.25 9 2.25 9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M9 10.75A1.75 1.75 0 1 0 9 7.25a1.75 1.75 0 0 0 0 3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      {!isVisible ? (
        <path
          d="M14.25 3.75 3.75 14.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      ) : null}
    </svg>
  );
}
