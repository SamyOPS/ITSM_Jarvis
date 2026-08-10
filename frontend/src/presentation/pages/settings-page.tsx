import { useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ListFilter,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react';

import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';
import {
  isSupportManagerRole,
  isSupportRole,
} from '../../domain/auth/user-role';

type SettingsSectionKey =
  | 'account-info'
  | 'password-security'
  | 'profile-extra'
  | 'notifications'
  | 'misc';

interface SettingsPageProps {
  initialSection?: SettingsSectionKey;
  session: AuthSessionSnapshot;
}

type SettingsNavGroup = {
  items: readonly {
    key: SettingsSectionKey;
    label: string;
  }[];
  label: string;
};

type VisualNotification = {
  description: string;
  enabled: boolean;
  title: string;
};

const settingsNavGroups: readonly SettingsNavGroup[] = [
  {
    label: 'Profil',
    items: [
      { key: 'account-info', label: 'Infos du compte' },
      { key: 'password-security', label: 'Mot de passe et securite' },
      { key: 'profile-extra', label: 'Infos complementaires' },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { key: 'notifications', label: 'Notification' },
      { key: 'misc', label: 'Divers' },
    ],
  },
];

function getDisplayName(session: AuthSessionSnapshot): string {
  const parts = [session.user.firstName, session.user.lastName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : session.user.email;
}

function getCharacteristics(session: AuthSessionSnapshot): string[] {
  const characteristics = [session.user.isVip ? 'VIP' : 'Standard'];

  if (session.user.canManageAssets) {
    characteristics.push('Parc info');
  }

  if (session.user.canManageKnowledgeBase) {
    characteristics.push('Base de connaissances');
  }

  if (session.user.canValidateKnowledgeBase) {
    characteristics.push('Validation KB');
  }

  return characteristics;
}

function buildNotificationItems(
  session: AuthSessionSnapshot,
): VisualNotification[] {
  const items: VisualNotification[] = [
    {
      description: 'Alerte quand un ticket vous concernant est cree.',
      enabled: true,
      title: 'Nouveau ticket',
    },
    {
      description: 'Alerte quand le statut d un ticket suivi change.',
      enabled: true,
      title: 'Changement de statut',
    },
    {
      description: 'Alerte quand un commentaire est ajoute sur un ticket.',
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
        description: 'Alerte quand un ticket approche ou depasse son SLA.',
        enabled: false,
        title: 'SLA et retard',
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

function VisualToggle({ enabled }: { enabled: boolean }) {
  return (
    <button
      aria-pressed={enabled}
      className={
        enabled
          ? 'settings-discord-toggle is-on'
          : 'settings-discord-toggle'
      }
      type="button"
    >
      <span />
    </button>
  );
}

function ReadonlyField({
  label,
  placeholder,
  type = 'text',
  value,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="settings-discord-field">
      <span>{label}</span>
      <input placeholder={placeholder} readOnly type={type} value={value} />
    </label>
  );
}

export function SettingsPage({
  initialSection = 'account-info',
  session,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionKey>(initialSection);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const displayName = getDisplayName(session);
  const characteristics = useMemo(() => getCharacteristics(session), [session]);
  const notificationItems = useMemo(
    () => buildNotificationItems(session),
    [session],
  );

  function renderContent() {
    if (showPasswordUpdate) {
      return (
        <section className="settings-discord-content-card">
          <header className="settings-discord-section-header">
            <h1>Mets ton mot de passe a jour</h1>
            <p>Saisis ton mot de passe actuel puis le nouveau.</p>
          </header>

          <div className="settings-discord-password-form">
            <ReadonlyField
              label="Mot de passe actuel"
              placeholder="********"
              type="password"
              value=""
            />
            <ReadonlyField
              label="Nouveau mot de passe"
              placeholder="********"
              type="password"
              value=""
            />
            <ReadonlyField
              label="Confirmer le nouveau mot de passe"
              placeholder="********"
              type="password"
              value=""
            />

            <div className="settings-discord-actions">
              <button
                className="settings-discord-button is-muted"
                onClick={() => setShowPasswordUpdate(false)}
                type="button"
              >
                Annuler
              </button>
              <button className="settings-discord-button" type="button">
                Termine
              </button>
            </div>
          </div>
        </section>
      );
    }

    switch (activeSection) {
      case 'password-security':
        return (
          <section className="settings-discord-content-card">
            <header className="settings-discord-section-header">
              <h1>Mot de passe et securite</h1>
              <p>Controle visuel des elements sensibles du compte.</p>
            </header>

            <div className="settings-discord-list">
              <div className="settings-discord-row settings-discord-password-row">
                <ReadonlyField
                  label="Mot de passe"
                  type="password"
                  value="************"
                />
                <button
                  className="settings-discord-button"
                  onClick={() => setShowPasswordUpdate(true)}
                  type="button"
                >
                  Modifier
                </button>
              </div>

              <div className="settings-discord-row">
                <div>
                  <strong>Connexion securisee</strong>
                  <span>Protection active sur le compte utilisateur.</span>
                </div>
                <span className="settings-discord-pill is-success">Actif</span>
              </div>
            </div>
          </section>
        );

      case 'profile-extra':
        return (
          <section className="settings-discord-content-card">
            <header className="settings-discord-section-header">
              <h1>Infos complementaires</h1>
              <p>Informations de profil affichees en lecture seule.</p>
            </header>

            <div className="settings-discord-list">
              <div className="settings-discord-row">
                <div>
                  <strong>Role actuel</strong>
                  <span>{translateUserRole(session.user.role)}</span>
                </div>
                <ShieldCheck size={20} strokeWidth={2} />
              </div>

              <div className="settings-discord-row">
                <div>
                  <strong>Caracteristique</strong>
                  <span>{characteristics.join(', ')}</span>
                </div>
                <div className="settings-discord-pill-group">
                  {characteristics.map((characteristic) => (
                    <span className="settings-discord-pill" key={characteristic}>
                      {characteristic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="settings-discord-row">
                <div>
                  <strong>Groupe d affectation</strong>
                  <span>Non renseigne</span>
                </div>
                <Users size={20} strokeWidth={2} />
              </div>
            </div>
          </section>
        );

      case 'notifications':
        return (
          <section className="settings-discord-content-card">
            <header className="settings-discord-section-header">
              <h1>Notification</h1>
              <p>Preferences visuelles adaptees au role actuel.</p>
            </header>

            <div className="settings-discord-list">
              {notificationItems.map((item) => (
                <div className="settings-discord-row" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                  <VisualToggle enabled={item.enabled} />
                </div>
              ))}
            </div>
          </section>
        );

      case 'misc':
        return (
          <section className="settings-discord-content-card">
            <header className="settings-discord-section-header">
              <h1>Divers</h1>
              <p>Reglages d affichage et de tri par defaut.</p>
            </header>

            <div className="settings-discord-list">
              <label className="settings-discord-row settings-discord-select-row">
                <div>
                  <strong>Tri par defaut des tickets</strong>
                  <span>Ordre applique aux listes de tickets.</span>
                </div>
                <span className="settings-discord-select">
                  <select defaultValue="operational" disabled>
                    <option value="operational">Priorite operationnelle</option>
                    <option value="recent">Plus recent d abord</option>
                    <option value="oldest">Plus ancien d abord</option>
                    <option value="ttr">SLA le plus proche</option>
                  </select>
                  <ChevronDown size={16} strokeWidth={2} />
                </span>
              </label>

              <label className="settings-discord-row settings-discord-select-row">
                <div>
                  <strong>Tri par defaut de la base de connaissances</strong>
                  <span>Ordre applique aux articles et procedures.</span>
                </div>
                <span className="settings-discord-select">
                  <select defaultValue="recent" disabled>
                    <option value="recent">Plus recent d abord</option>
                    <option value="popular">Plus consulte</option>
                    <option value="alphabetical">Alphabetique</option>
                  </select>
                  <ChevronDown size={16} strokeWidth={2} />
                </span>
              </label>

              <div className="settings-discord-row">
                <div>
                  <strong>Mode nuit</strong>
                  <span>Theme sombre de l interface Vision.</span>
                </div>
                <VisualToggle enabled={false} />
              </div>
            </div>
          </section>
        );

      case 'account-info':
      default:
        return (
          <section className="settings-discord-content-card">
            <header className="settings-discord-section-header">
              <h1>Infos du compte</h1>
              <p>Informations principales affichees dans le front.</p>
            </header>

            <div className="settings-discord-fields-grid">
              <ReadonlyField label="Identifiant" value={displayName} />
              <ReadonlyField label="Nom" value={session.user.lastName ?? ''} />
              <ReadonlyField
                label="Prenom"
                value={session.user.firstName ?? ''}
              />
              <ReadonlyField label="Mail" value={session.user.email} />
            </div>
          </section>
        );
    }
  }

  return (
    <section className="settings-discord-page">
      <aside className="settings-discord-sidebar">
        <div className="settings-discord-profile-summary">
          <span className="settings-discord-avatar">
            {displayName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{displayName}</strong>
            <span>{session.user.email}</span>
          </div>
        </div>

        <nav aria-label="Navigation des parametres">
          {settingsNavGroups.map((group) => (
            <div className="settings-discord-nav-group" key={group.label}>
              <span className="settings-discord-nav-title">{group.label}</span>
              {group.items.map((item) => (
                <button
                  className={
                    activeSection === item.key && !showPasswordUpdate
                      ? 'settings-discord-nav-item is-active'
                      : 'settings-discord-nav-item'
                  }
                  key={item.key}
                  onClick={() => {
                    setShowPasswordUpdate(false);
                    setActiveSection(item.key);
                  }}
                  type="button"
                >
                  {item.key === 'account-info' ? (
                    <User size={16} strokeWidth={2} />
                  ) : item.key === 'password-security' ? (
                    <Lock size={16} strokeWidth={2} />
                  ) : item.key === 'profile-extra' ? (
                    <ShieldCheck size={16} strokeWidth={2} />
                  ) : item.key === 'notifications' ? (
                    <Bell size={16} strokeWidth={2} />
                  ) : item.key === 'misc' ? (
                    <SlidersHorizontal size={16} strokeWidth={2} />
                  ) : (
                    <ListFilter size={16} strokeWidth={2} />
                  )}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="settings-discord-content">{renderContent()}</main>
    </section>
  );
}
