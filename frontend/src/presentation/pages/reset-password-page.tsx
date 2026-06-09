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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!recoveryToken) {
      setMessage(
        'Le lien de réinitialisation est invalide ou expiré. Relance une demande depuis la page de connexion.',
      );

      return;
    }

    if (password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.');

      return;
    }

    if (password !== confirmPassword) {
      setMessage('Les deux mots de passe ne correspondent pas.');

      return;
    }

    setIsSaving(true);

    try {
      await updatePasswordWithRecoveryToken(recoveryToken, password);
      setMessage('Mot de passe mis à jour. Tu peux maintenant te connecter.');
      onPasswordUpdated?.();
      window.history.replaceState({}, '', '/auth/reset-password');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la mise à jour du mot de passe.',
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
          <p>Choisis un nouveau mot de passe pour retrouver ton accès.</p>
        </div>
        <div className="login-showcase-glow" />
      </aside>

      <section className="login-panel">
        <div className="login-panel-header">
          <span className="panel-tag">Sécurité</span>
          <h2>Nouveau mot de passe</h2>
          <p>Saisis un mot de passe fort, puis reconnecte-toi à Vision.</p>
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
            {isSaving ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>

          {message ? <p className="ticket-form-helper">{message}</p> : null}
        </form>

        <button
          className="login-forgot-button"
          onClick={() => navigateTo('/login')}
          type="button"
        >
          Retour à la connexion
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
