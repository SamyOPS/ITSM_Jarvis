import {
  Bell,
  ChevronDown,
  Globe2,
  ListFilter,
  Moon,
  SlidersHorizontal,
} from 'lucide-react';

import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  isSupportManagerRole,
  isSupportRole,
} from '../../domain/auth/user-role';

interface PreferencesPageProps {
  session: AuthSessionSnapshot;
}

interface PreferenceNotification {
  description: string;
  enabled: boolean;
  title: string;
}

function buildNotificationPreferences(
  session: AuthSessionSnapshot,
): PreferenceNotification[] {
  const items: PreferenceNotification[] = [
    {
      description: 'Alerte quand un ticket vous concernant est cree.',
      enabled: true,
      title: 'Nouveau ticket',
    },
    {
      description: 'Alerte quand le statut d un ticket suivi change.',
      enabled: true,
      title: 'Statut du ticket modifie',
    },
    {
      description:
        'Alerte quand un commentaire est ajoute sur un ticket suivi.',
      enabled: true,
      title: 'Commentaire ajoute',
    },
  ];

  if (isSupportRole(session.user.role)) {
    items.push(
      {
        description: 'Alerte quand un ticket vous est assigne.',
        enabled: true,
        title: 'Ticket assigne',
      },
      {
        description: 'Alerte quand un ticket arrive dans votre groupe support.',
        enabled: true,
        title: 'Ticket de groupe',
      },
      {
        description: 'Alerte quand un ticket actif depasse son TTR.',
        enabled: true,
        title: 'Ticket en retard',
      },
    );
  }

  if (isSupportManagerRole(session.user.role)) {
    items.push({
      description: 'Alerte pour les changements importants d administration.',
      enabled: false,
      title: 'Administration',
    });
  }

  return items;
}

function StaticToggle({ enabled }: { enabled: boolean }) {
  return (
    <button
      aria-pressed={enabled}
      className={enabled ? 'preferences-toggle is-on' : 'preferences-toggle'}
      disabled
      type="button"
    >
      <span />
    </button>
  );
}

export function PreferencesPage({ session }: PreferencesPageProps) {
  const notificationItems = buildNotificationPreferences(session);

  return (
    <section className="preferences-page">
      <header className="preferences-page-header">
        <h1>Preferences</h1>
      </header>

      <div className="preferences-page-grid">
        <article className="preferences-panel">
          <div className="preferences-section-title">
            <Bell size={17} strokeWidth={2} />
            <span>Notification</span>
          </div>

          <div className="preferences-list">
            {notificationItems.map((item) => (
              <div className="preferences-row" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <StaticToggle enabled={item.enabled} />
              </div>
            ))}
          </div>
        </article>

        <article className="preferences-panel">
          <div className="preferences-section-title">
            <SlidersHorizontal size={17} strokeWidth={2} />
            <span>Divers</span>
          </div>

          <div className="preferences-fields">
            <label className="preferences-field">
              <span>
                <Globe2 size={16} strokeWidth={2} />
                Langue
              </span>
              <span className="preferences-select">
                <select defaultValue="fr" disabled>
                  <option value="fr">Francais</option>
                  <option value="en">Anglais</option>
                </select>
                <ChevronDown size={16} strokeWidth={2} />
              </span>
            </label>

            <label className="preferences-field">
              <span>
                <ListFilter size={16} strokeWidth={2} />
                Tri par defaut des tickets
              </span>
              <span className="preferences-select">
                <select defaultValue="operational" disabled>
                  <option value="operational">Priorite operationnelle</option>
                  <option value="recent">Plus recent d abord</option>
                  <option value="oldest">Plus ancien d abord</option>
                  <option value="ttr">TTR le plus proche</option>
                </select>
                <ChevronDown size={16} strokeWidth={2} />
              </span>
            </label>

            <label className="preferences-field">
              <span>
                <ListFilter size={16} strokeWidth={2} />
                Tri par defaut de la base de connaissances
              </span>
              <span className="preferences-select">
                <select defaultValue="recent" disabled>
                  <option value="recent">Plus recent d abord</option>
                  <option value="popular">Plus consulte</option>
                  <option value="alphabetical">Alphabetique</option>
                </select>
                <ChevronDown size={16} strokeWidth={2} />
              </span>
            </label>

            <div className="preferences-row preferences-row--compact">
              <div>
                <strong>
                  <Moon size={16} strokeWidth={2} />
                  Mode nuit
                </strong>
                <span>Theme sombre de l interface Vision.</span>
              </div>
              <StaticToggle enabled={false} />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
