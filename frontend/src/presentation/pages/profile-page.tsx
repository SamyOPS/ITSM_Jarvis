import { BadgeCheck, Mail, Shield, User, Users } from 'lucide-react';

import { DefaultProfileAvatar } from '../../components/ui/default-profile-avatar';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';

interface ProfilePageProps {
  session: AuthSessionSnapshot;
}

function getDisplayName(session: AuthSessionSnapshot): string {
  const parts = [session.user.firstName, session.user.lastName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : session.user.email;
}

export function ProfilePage({ session }: ProfilePageProps) {
  const displayName = getDisplayName(session);

  return (
    <section className="preferences-page profile-page">
      <header className="preferences-page-header profile-page-header">
        <DefaultProfileAvatar
          className="profile-page-avatar"
          seed={session.user.id || session.user.email}
        />
        <div>
          <h1>Profil</h1>
          <span>{session.user.email}</span>
        </div>
      </header>

      <div className="preferences-page-grid">
        <article className="preferences-panel">
          <div className="preferences-section-title">
            <User size={17} strokeWidth={2} />
            <span>Identite</span>
          </div>

          <div className="preferences-fields profile-fields-grid">
            <div className="preferences-field">
              <span>Nom</span>
              <strong>{session.user.lastName || 'Non renseigne'}</strong>
            </div>

            <div className="preferences-field">
              <span>Prenom</span>
              <strong>{session.user.firstName || 'Non renseigne'}</strong>
            </div>

            <div className="preferences-field">
              <span>
                <Mail size={16} strokeWidth={2} />
                Email
              </span>
              <strong>{session.user.email}</strong>
            </div>

            <div className="preferences-field">
              <span>
                <Shield size={16} strokeWidth={2} />
                Role actuel
              </span>
              <strong>{translateUserRole(session.user.role)}</strong>
            </div>
          </div>
        </article>

        <article className="preferences-panel">
          <div className="preferences-section-title">
            <BadgeCheck size={17} strokeWidth={2} />
            <span>Caracteristiques</span>
          </div>

          <div className="preferences-fields">
            <div className="preferences-row">
              <div>
                <strong>{displayName}</strong>
                <span>Compte Vision en lecture seule.</span>
              </div>
              {session.user.isVip ? (
                <span className="profile-vip-badge">VIP</span>
              ) : (
                <span className="profile-muted-badge">Standard</span>
              )}
            </div>

            <div className="preferences-row">
              <div>
                <strong>
                  <Users size={16} strokeWidth={2} />
                  Groupe d affectation
                </strong>
                <span>Non renseigne</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
