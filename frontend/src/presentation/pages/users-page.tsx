import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { UserRole } from '../../domain/auth/user-role';
import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';
import {
  createAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from '../../infrastructure/api/auth-api';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

type UsersPageProps = {
  session: AuthSessionSnapshot;
};

type UserFormState = {
  email: string;
  firstName: string;
  groupId: string;
  lastName: string;
  password: string;
  role: UserRole;
};

const USER_ROLES: UserRole[] = ['DEMANDEUR', 'AGENT', 'ADMIN'];

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
  services: [],
};

const EMPTY_USER_FORM: UserFormState = {
  email: '',
  firstName: '',
  groupId: '',
  lastName: '',
  password: '',
  role: 'DEMANDEUR',
};

export function UsersPage({ session }: UsersPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState>(EMPTY_USER_FORM);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const groupsById = useMemo(
    () => new Map(catalog.groups.map((group) => [group.id, group])),
    [catalog.groups],
  );

  const activeUsers = users.filter((user) => user.isActive).length;
  const agentUsers = users.filter((user) => user.role === 'AGENT').length;
  const adminUsers = users.filter((user) => user.role === 'ADMIN').length;

  const loadUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextUsers, nextCatalog] = await Promise.all([
        fetchAdminUsers(session.accessToken),
        fetchReferentialCatalog(),
      ]);

      setUsers(nextUsers);
      setCatalog(nextCatalog);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du chargement des utilisateurs',
      );
    } finally {
      setIsLoading(false);
    }
  }, [session.accessToken]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function handleFieldChange(field: keyof UserFormState, value: string): void {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFormMessage(null);
  }

  function handleSelectUser(user: AdminUserSummary): void {
    const inferredName = inferUserNameParts(user);

    setSelectedUserId(user.id);
    setFormMessage(null);
    setFormState({
      email: user.email ?? '',
      firstName: inferredName.firstName,
      groupId: user.groupId ?? '',
      lastName: inferredName.lastName,
      password: '',
      role: user.role,
    });
  }

  function handleResetForm(): void {
    setSelectedUserId(null);
    setFormState(EMPTY_USER_FORM);
    setFormMessage(null);
  }

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsCreating(true);
    setFormMessage(null);

    try {
      await createAdminUser(session.accessToken, {
        email: formState.email.trim(),
        firstName: normalizeOptionalText(formState.firstName),
        groupId: normalizeOptionalText(formState.groupId),
        lastName: normalizeOptionalText(formState.lastName),
        password: formState.password,
        role: formState.role,
      });

      setFormState(EMPTY_USER_FORM);
      setFormMessage('Compte cree avec succes.');
      await loadUsers();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la creation du compte',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateUser(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedUserId) {
      return;
    }

    setIsUpdating(true);
    setFormMessage(null);

    try {
      await updateAdminUser(session.accessToken, selectedUserId, {
        email: formState.email.trim(),
        firstName: normalizeOptionalText(formState.firstName),
        groupId: normalizeOptionalText(formState.groupId),
        lastName: normalizeOptionalText(formState.lastName),
        role: formState.role,
      });

      setSelectedUserId(null);
      setFormState(EMPTY_USER_FORM);
      setFormMessage('Compte mis a jour avec succes.');
      await loadUsers();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la mise a jour du compte',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <section className="panel referentials-panel">
      <span className="panel-tag">Administration</span>
      <h2>Utilisateurs</h2>
      <p>
        Liste des comptes de la plateforme, de leurs roles et de leur groupe de
        support.
      </p>

      <div className="referentials-summary">
        <article>
          <span>Total utilisateurs</span>
          <strong>{users.length}</strong>
        </article>
        <article>
          <span>Comptes actifs</span>
          <strong>{activeUsers}</strong>
        </article>
        <article>
          <span>Agents</span>
          <strong>{agentUsers}</strong>
        </article>
        <article>
          <span>Admins</span>
          <strong>{adminUsers}</strong>
        </article>
      </div>

      <section className="referentials-form-card">
        <header className="referentials-card-header">
          <div>
            <h3>{selectedUserId ? 'Modifier un compte' : 'Creer un compte'}</h3>
            <p>
              {selectedUserId
                ? 'Modifie les informations principales du compte selectionne.'
                : 'Ajoute un utilisateur dans Supabase Auth et dans le repertoire applicatif.'}
            </p>
          </div>
        </header>

        <form
          className="referentials-form"
          onSubmit={(event) =>
            selectedUserId
              ? void handleUpdateUser(event)
              : void handleCreateUser(event)
          }
        >
          <label className="field">
            <span>Email</span>
            <input
              onChange={(event) =>
                handleFieldChange('email', event.target.value)
              }
              required
              type="email"
              value={formState.email}
            />
          </label>

          {selectedUserId ? null : (
            <label className="field">
              <span>Mot de passe</span>
              <input
                minLength={6}
                onChange={(event) =>
                  handleFieldChange('password', event.target.value)
                }
                required
                type="password"
                value={formState.password}
              />
            </label>
          )}

          <label className="field">
            <span>Prenom</span>
            <input
              onChange={(event) =>
                handleFieldChange('firstName', event.target.value)
              }
              value={formState.firstName}
            />
          </label>

          <label className="field">
            <span>Nom</span>
            <input
              onChange={(event) =>
                handleFieldChange('lastName', event.target.value)
              }
              value={formState.lastName}
            />
          </label>

          <label className="field">
            <span>Role</span>
            <select
              onChange={(event) =>
                handleFieldChange('role', event.target.value as UserRole)
              }
              value={formState.role}
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {translateUserRole(role)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Groupe</span>
            <select
              onChange={(event) =>
                handleFieldChange('groupId', event.target.value)
              }
              value={formState.groupId}
            >
              <option value="">Aucun groupe</option>
              {catalog.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <div className="referentials-actions">
            <button
              className="primary-button"
              disabled={isCreating || isUpdating}
            >
              {selectedUserId
                ? isUpdating
                  ? 'Mise a jour...'
                  : 'Enregistrer les modifications'
                : isCreating
                  ? 'Creation...'
                  : 'Creer le compte'}
            </button>
            <button
              className="secondary-button"
              onClick={handleResetForm}
              type="button"
            >
              Reinitialiser
            </button>
          </div>
        </form>

        {formMessage ? (
          <p className="referentials-feedback">{formMessage}</p>
        ) : null}
      </section>

      <section className="admin-users-card">
        <header className="referentials-card-header">
          <div>
            <h3>Liste des utilisateurs</h3>
            <p>
              Controle les profils disponibles pour les droits et les
              assignations.
            </p>
          </div>
          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={() => void loadUsers()}
            type="button"
          >
            Actualiser
          </button>
        </header>

        {isLoading ? (
          <p className="referentials-empty-state">
            Chargement des utilisateurs...
          </p>
        ) : errorMessage ? (
          <p className="referentials-error">{errorMessage}</p>
        ) : users.length === 0 ? (
          <p className="referentials-empty-state">
            Aucun utilisateur disponible.
          </p>
        ) : (
          <div className="admin-users-grid">
            {users.map((user) => (
              <article className="admin-user-card" key={user.id}>
                <div className="admin-user-card-header">
                  <strong>
                    {formatUserDisplayName(
                      user.firstName,
                      user.lastName,
                      user.displayName ?? user.email ?? user.id,
                    )}
                  </strong>
                  <span
                    className={
                      user.isActive
                        ? 'admin-user-status is-active'
                        : 'admin-user-status is-inactive'
                    }
                  >
                    {user.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <dl className="admin-user-meta">
                  <div>
                    <dt>Email</dt>
                    <dd>{user.email ?? 'Email indisponible'}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{translateUserRole(user.role)}</dd>
                  </div>
                  <div>
                    <dt>Groupe</dt>
                    <dd>
                      {user.groupId
                        ? (groupsById.get(user.groupId)?.name ?? user.groupId)
                        : 'Aucun groupe'}
                    </dd>
                  </div>
                  <div>
                    <dt>Identifiant</dt>
                    <dd>{user.id}</dd>
                  </div>
                </dl>

                <button
                  className="secondary-button"
                  onClick={() => handleSelectUser(user)}
                  type="button"
                >
                  Modifier
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function inferUserNameParts(user: AdminUserSummary): {
  firstName: string;
  lastName: string;
} {
  if (user.firstName || user.lastName) {
    return {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    };
  }

  const displayName = user.displayName?.trim();

  if (!displayName) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  const [firstName, ...lastNameParts] = displayName.split(/\s+/);

  return {
    firstName: firstName ?? '',
    lastName: lastNameParts.join(' '),
  };
}

function formatUserDisplayName(
  firstName: string | null,
  lastName: string | null,
  fallback: string,
): string {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || fallback;
}
