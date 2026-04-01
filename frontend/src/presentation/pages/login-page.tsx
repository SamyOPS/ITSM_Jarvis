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
      <h2>Connexion et gestion de session</h2>
      <p>
        Authentifiez-vous via Supabase, conservez la session localement et
        vérifiez le profil métier connecté auprès du backend.
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
          <span>Mot de passe</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        <button className="primary-button" disabled={isBusy} type="submit">
          {isBusy ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>

      <dl className="status-grid">
        <div>
          <dt>Compte de test par défaut</dt>
          <dd>demandeur@jarvis.fr</dd>
        </div>
        <div>
          <dt>Rôle applicatif par défaut</dt>
          <dd>DEMANDEUR</dd>
        </div>
        <div>
          <dt>Autres comptes de test</dt>
          <dd>agent@jarvis.fr / admin@jarvis.fr</dd>
        </div>
        <div>
          <dt>Mots de passe connus</dt>
          <dd>Demandeur123! / Agent123! / Admin123!</dd>
        </div>
        <div>
          <dt>Dernière erreur</dt>
          <dd>{errorMessage ?? 'aucune'}</dd>
        </div>
      </dl>
    </section>
  );
}
