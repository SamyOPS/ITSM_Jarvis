import { type FormEvent, useMemo, useState } from 'react';
import { updatePasswordWithRecoveryToken } from '../../infrastructure/api/auth-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';

type ResetPasswordPageProps = {
  onPasswordUpdated?: () => void;
};

export function ResetPasswordPage({
  onPasswordUpdated,
}: ResetPasswordPageProps) {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const recoveryToken = useMemo(() => readRecoveryAccessToken(), []);
  const recoveryEmail = useMemo(
    () => (recoveryToken ? readEmailFromRecoveryToken(recoveryToken) : null),
    [recoveryToken],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!recoveryToken) {
      setMessage(
        'Le lien de reinitialisation est invalide ou expire. Relance une demande depuis la page de connexion.',
      );

      return;
    }

    if (password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caracteres.');

      return;
    }

    if (password !== confirmPassword) {
      setMessage('Les deux mots de passe ne correspondent pas.');

      return;
    }

    setIsSaving(true);

    try {
      await updatePasswordWithRecoveryToken(recoveryToken, password);
      onPasswordUpdated?.();

      const loginPath = recoveryEmail
        ? `/login?email=${encodeURIComponent(recoveryEmail)}`
        : '/login';

      // Clear recovery tokens from the URL before sending the user back.
      window.history.replaceState({}, '', loginPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la mise a jour du mot de passe.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="login-layout">
      <aside className="login-showcase">
        <div className="login-showcase-overlay" />
        <div className="login-showcase-copy">
          <span className="login-showcase-eyebrow">Jarvis Connect</span>
          <h1>Vision</h1>
          <p>Choisis un nouveau mot de passe pour retrouver ton acces.</p>
        </div>
        <div className="login-showcase-glow" />
      </aside>

      <section className="login-panel">
        <div className="login-panel-header">
          <span className="panel-tag">Securite</span>
          <h2>Nouveau mot de passe</h2>
          <p>Saisis un mot de passe fort, puis reconnecte-toi a Vision.</p>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="field">
            <span>Nouveau mot de passe</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <label className="field">
            <span>Confirmer le mot de passe</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          <button
            className="login-submit-button"
            disabled={isSaving || !recoveryToken}
            type="submit"
          >
            {isSaving ? 'Mise a jour...' : 'Changer le mot de passe'}
          </button>

          {message ? <p className="ticket-form-helper">{message}</p> : null}
        </form>

        <button
          className="login-forgot-button"
          onClick={() => navigateTo('/login')}
          type="button"
        >
          Retour a la connexion
        </button>
      </section>
    </section>
  );
}

function readRecoveryAccessToken(): string | null {
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, ''),
  );
  const queryParams = new URLSearchParams(window.location.search);
  const type = hashParams.get('type') ?? queryParams.get('type');
  const accessToken =
    hashParams.get('access_token') ?? queryParams.get('access_token');

  if (type && type !== 'recovery') {
    return null;
  }

  return accessToken;
}

function readEmailFromRecoveryToken(token: string): string | null {
  const parts = token.split('.');

  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as {
      email?: unknown;
    };

    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + paddingLength,
    '=',
  );

  return window.atob(paddedValue);
}
