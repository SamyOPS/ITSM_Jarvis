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
      <aside className="login-showcase">
        <div className="login-showcase-overlay" />
        <div className="login-showcase-copy">
          <span className="login-showcase-eyebrow">Jarvis Connect</span>
          <h1>Vision</h1>
          <p>
            Crée ton accès demandeur pour suivre tes tickets et consulter la
            base de connaissances.
          </p>
        </div>
        <div className="login-showcase-glow" />
      </aside>

      <section className="login-panel">
        <div className="login-panel-header">
          <span className="panel-tag">Inscription</span>
          <h2>Créer un compte</h2>
          <p>
            Les comptes créés ici sont automatiquement limités au rôle
            demandeur.
          </p>
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
              value={form.firstName}
            />
          </label>

          <label className="field">
            <span>Nom</span>
            <input
              autoComplete="family-name"
              onChange={(event) => updateField('lastName', event.target.value)}
              value={form.lastName}
            />
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => updateField('password', event.target.value)}
              required
              type="password"
              value={form.password}
            />
          </label>

          <label className="field">
            <span>Confirmer le mot de passe</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) =>
                updateField('confirmPassword', event.target.value)
              }
              required
              type="password"
              value={form.confirmPassword}
            />
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

        <button
          className="login-forgot-button"
          onClick={() => navigateTo('/login')}
          type="button"
        >
          J’ai déjà un compte
        </button>
      </section>
    </section>
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
