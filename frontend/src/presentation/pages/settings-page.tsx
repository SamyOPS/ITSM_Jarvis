import { KeyRound, Lock, Mail, ShieldCheck, UserCog } from 'lucide-react';

import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';

interface SettingsPageProps {
  session: AuthSessionSnapshot;
}

export function SettingsPage({ session }: SettingsPageProps) {
  return (
    <section className="preferences-page settings-page">
      <header className="preferences-page-header">
        <h1>Parametres</h1>
      </header>

      <div className="preferences-page-grid">
        <article className="preferences-panel">
          <div className="preferences-section-title">
            <ShieldCheck size={17} strokeWidth={2} />
            <span>Securite du compte</span>
          </div>

          <div className="preferences-fields">
            <div className="preferences-row">
              <div>
                <strong>
                  <Lock size={16} strokeWidth={2} />
                  Connexion securisee
                </strong>
                <span>Protection active sur le compte utilisateur.</span>
              </div>
              <span className="profile-muted-badge settings-status-badge">
                Actif
              </span>
            </div>

            <div className="preferences-row">
              <div>
                <strong>Authentification</strong>
                <span>Adresse utilisee pour la connexion a Vision.</span>
              </div>
              <strong className="settings-readonly-value">
                {session.user.email}
              </strong>
            </div>
          </div>
        </article>

        <article className="preferences-panel">
          <div className="preferences-section-title">
            <KeyRound size={17} strokeWidth={2} />
            <span>Changement de mot de passe</span>
          </div>

          <div className="preferences-fields">
            <label className="preferences-field settings-field">
              <span>Mot de passe actuel</span>
              <input
                className="settings-input"
                disabled
                placeholder="********"
                type="password"
              />
            </label>

            <label className="preferences-field settings-field">
              <span>Nouveau mot de passe</span>
              <input
                className="settings-input"
                disabled
                placeholder="********"
                type="password"
              />
            </label>

            <label className="preferences-field settings-field">
              <span>Confirmation</span>
              <input
                className="settings-input"
                disabled
                placeholder="********"
                type="password"
              />
            </label>

            <div className="preferences-row">
              <div>
                <strong>Validation</strong>
                <span>Action inactive pour le moment.</span>
              </div>
              <button className="settings-ghost-button" disabled type="button">
                Mettre a jour
              </button>
            </div>
          </div>
        </article>

        <article className="preferences-panel">
          <div className="preferences-section-title">
            <UserCog size={17} strokeWidth={2} />
            <span>Compte utilisateur</span>
          </div>

          <div className="preferences-fields">
            <div className="preferences-field">
              <span>
                <Mail size={16} strokeWidth={2} />
                Email du compte
              </span>
              <strong>{session.user.email}</strong>
            </div>

            <div className="preferences-field">
              <span>Role</span>
              <strong>{translateUserRole(session.user.role)}</strong>
            </div>

            <div className="preferences-field">
              <span>Identifiant utilisateur</span>
              <strong>{session.user.id}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
