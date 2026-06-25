import { type FormEvent, useState } from 'react';
import { registerRequester } from '../../infrastructure/api/auth-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';

type RegisterFormState = {
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

const EMPTY_REGISTER_FORM: RegisterFormState = {
  confirmPassword: '',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
};

export function RegisterPage() {
  const [form, setForm] = useState<RegisterFormState>(EMPTY_REGISTER_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateField(field: keyof RegisterFormState, value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (form.password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.');

      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('Les deux mots de passe ne correspondent pas.');

      return;
    }

    setIsSubmitting(true);

    try {
      await registerRequester({
        email: form.email.trim(),
        firstName: normalizeOptionalText(form.firstName),
        lastName: normalizeOptionalText(form.lastName),
        password: form.password,
      });
      setForm(EMPTY_REGISTER_FORM);
      setMessage(
        'Compte créé. Vérifiez vos emails pour confirmer votre compte avant de vous connecter.',
      );
    } catch (error) {
      setMessage(mapRegisterError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-layout">
      <section className="login-panel">
        <div className="login-panel-header">
          <div className="login-brand">
            <span className="login-brand-icon">
              <RegisterAuthIcon />
            </span>
            <strong>Compte Vision</strong>
          </div>
          <h2>Créer un compte</h2>
          <p>Un seul écran pour se connecter ou créer un compte demandeur.</p>
        </div>

        <div className="login-mode-tabs" aria-label="Choix du mode">
          <button
            className="login-mode-tab"
            onClick={() => navigateTo('/login')}
            type="button"
          >
            <span className="login-mode-tab-icon">
              <LoginAuthIcon />
            </span>
            Connexion
          </button>
          <button className="login-mode-tab is-active" type="button">
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
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="Email"
              required
              type="email"
              value={form.email}
            />
          </label>

          <label className="field">
            <span>Prénom</span>
            <input
              autoComplete="given-name"
              onChange={(event) => updateField('firstName', event.target.value)}
              placeholder="Prénom"
              value={form.firstName}
            />
          </label>

          <label className="field">
            <span>Nom</span>
            <input
              autoComplete="family-name"
              onChange={(event) => updateField('lastName', event.target.value)}
              placeholder="Nom"
              value={form.lastName}
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <span className="login-password-field">
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) =>
                  updateField('password', event.target.value)
                }
                placeholder="Mot de passe"
                required
                type={showPassword ? 'text' : 'password'}
                value={form.password}
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

          <label className="field">
            <span>Confirmer le mot de passe</span>
            <span className="login-password-field">
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) =>
                  updateField('confirmPassword', event.target.value)
                }
                placeholder="Confirmer le mot de passe"
                required
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
              />
              <button
                aria-label={
                  showConfirmPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
                className="login-password-eye"
                onClick={() => setShowConfirmPassword((current) => !current)}
                type="button"
              >
                <EyeIcon isVisible={showConfirmPassword} />
              </button>
            </span>
          </label>

          <button
            className="login-submit-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Création du compte...' : 'Créer mon compte'}
          </button>

          {message ? <p className="ticket-form-helper">{message}</p> : null}
        </form>
      </section>
    </section>
  );
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

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function mapRegisterError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Erreur inconnue lors de la création du compte.';
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('rate limit') ||
    message.includes('too many') ||
    message.includes('trop de mails')
  ) {
    return 'Trop de mails ont été envoyés en peu de temps. Attends quelques minutes avant de réessayer.';
  }

  if (
    message.includes('already') ||
    message.includes('duplicate') ||
    message.includes('registered')
  ) {
    return 'Un compte existe déjà avec cette adresse email.';
  }

  return error.message;
}
