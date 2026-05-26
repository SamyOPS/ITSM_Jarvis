import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ArrowLeft, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { UserRole } from '../../domain/auth/user-role';
import type {
  ReferentialCatalogSnapshot,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
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

type UserFormMode = 'create' | 'edit' | null;

type UserSearchField = 'IDENTIFIER' | 'FIRST_NAME' | 'LAST_NAME' | 'GROUP';
type UserGroupLookupSearchField = 'IDENTIFIER' | 'NAME';

type UserRoleFilter = UserRole | 'ALL';

const USER_ROLES: UserRole[] = ['DEMANDEUR', 'AGENT', 'ADMIN'];
const USERS_PER_PAGE = 15;
const USER_GROUP_LOOKUP_PAGE_SIZE = 10;

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
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
  const [formMode, setFormMode] = useState<UserFormMode>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchField, setSearchField] = useState<UserSearchField>('IDENTIFIER');
  const [searchText, setSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [showGroupLookup, setShowGroupLookup] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userGroupLookupPage, setUserGroupLookupPage] = useState(1);
  const [userGroupLookupSearch, setUserGroupLookupSearch] = useState('');
  const [userGroupLookupSearchField, setUserGroupLookupSearchField] =
    useState<UserGroupLookupSearchField>('IDENTIFIER');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('ALL');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const groupsById = useMemo(
    () => new Map(catalog.groups.map((group) => [group.id, group])),
    [catalog.groups],
  );

  const activeUsers = users.filter((user) => user.isActive).length;
  const agentUsers = users.filter((user) => user.role === 'AGENT').length;
  const adminUsers = users.filter((user) => user.role === 'ADMIN').length;
  const selectedUser = selectedUserId
    ? (users.find((user) => user.id === selectedUserId) ?? null)
    : null;
  const filteredUsers = useMemo(
    () =>
      filterUsers(
        users,
        groupsById,
        searchText,
        searchField,
        roleFilter,
        showTrash,
      ),
    [groupsById, roleFilter, searchField, searchText, showTrash, users],
  );
  const totalUserPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PER_PAGE),
  );
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * USERS_PER_PAGE,
    userPage * USERS_PER_PAGE,
  );
  const filteredLookupGroups = useMemo(
    () =>
      filterLookupGroups(
        catalog.groups,
        userGroupLookupSearch,
        userGroupLookupSearchField,
      ),
    [catalog.groups, userGroupLookupSearch, userGroupLookupSearchField],
  );
  const totalUserGroupLookupPages = Math.max(
    1,
    Math.ceil(filteredLookupGroups.length / USER_GROUP_LOOKUP_PAGE_SIZE),
  );
  const paginatedLookupGroups = filteredLookupGroups.slice(
    (userGroupLookupPage - 1) * USER_GROUP_LOOKUP_PAGE_SIZE,
    userGroupLookupPage * USER_GROUP_LOOKUP_PAGE_SIZE,
  );
  const selectedFormGroup = formState.groupId
    ? (groupsById.get(formState.groupId) ?? null)
    : null;

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

  useEffect(() => {
    setUserPage(1);
  }, [roleFilter, searchField, searchText, showTrash]);

  useEffect(() => {
    if (userGroupLookupPage > totalUserGroupLookupPages) {
      setUserGroupLookupPage(totalUserGroupLookupPages);
    }
  }, [totalUserGroupLookupPages, userGroupLookupPage]);

  function handleFieldChange(field: keyof UserFormState, value: string): void {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFormMessage(null);
  }

  function handleSelectUser(user: AdminUserSummary): void {
    const inferredName = inferUserNameParts(user);

    closeGroupLookup();
    setFormMode('edit');
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
    closeGroupLookup();
    setFormMode(null);
    setSelectedUserId(null);
    setFormState(EMPTY_USER_FORM);
    setFormMessage(null);
  }

  function handleOpenCreateForm(): void {
    closeGroupLookup();
    setFormMode('create');
    setSelectedUserId(null);
    setFormState(EMPTY_USER_FORM);
    setFormMessage(null);
  }

  function openGroupLookup(): void {
    const selectedGroupIndex = filterLookupGroups(
      catalog.groups,
      '',
      'IDENTIFIER',
    ).findIndex((group) => group.id === formState.groupId);

    setShowGroupLookup(true);
    setUserGroupLookupSearch('');
    setUserGroupLookupSearchField('IDENTIFIER');
    setUserGroupLookupPage(
      selectedGroupIndex >= 0
        ? Math.floor(selectedGroupIndex / USER_GROUP_LOOKUP_PAGE_SIZE) + 1
        : 1,
    );
  }

  function closeGroupLookup(): void {
    setShowGroupLookup(false);
    setUserGroupLookupSearch('');
    setUserGroupLookupSearchField('IDENTIFIER');
    setUserGroupLookupPage(1);
  }

  function handleGroupLookupSelect(group: ReferentialGroup): void {
    handleFieldChange('groupId', group.id);
    closeGroupLookup();
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
      setFormMode(null);
      await loadUsers();
    } catch (error) {
      setFormMessage(mapCreateUserErrorMessage(error));
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
      setFormMode(null);
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

  async function handleMoveUserToTrash(): Promise<void> {
    if (!selectedUserId) {
      return;
    }

    setIsDeleting(true);
    setFormMessage(null);

    try {
      await updateAdminUserStatus(session.accessToken, selectedUserId, false);
      setSelectedUserId(null);
      setFormMode(null);
      setShowTrash(true);
      await loadUsers();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la mise a la corbeille',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRestoreUser(): Promise<void> {
    if (!selectedUserId) {
      return;
    }

    setIsDeleting(true);
    setFormMessage(null);

    try {
      await updateAdminUserStatus(session.accessToken, selectedUserId, true);
      setSelectedUserId(null);
      setFormMode(null);
      await loadUsers();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la restauration',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteUserPermanently(): Promise<void> {
    if (!selectedUserId) {
      return;
    }

    const shouldDelete = window.confirm(
      'Supprimer definitivement cet utilisateur ? Cette action est irreversible.',
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setFormMessage(null);

    try {
      await deleteAdminUser(session.accessToken, selectedUserId);
      setSelectedUserId(null);
      setFormMode(null);
      await loadUsers();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la suppression definitive',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const isSubmitting = isCreating || isDeleting || isUpdating;
  const userFormId = 'admin-user-form';
  const rootClassName = formMode
    ? 'panel admin-detail-panel referentials-panel admin-users-page'
    : 'panel referentials-panel admin-users-page';

  return (
    <section className={rootClassName}>
      {formMode ? (
        <section className="tdp-shell admin-user-detail-view">
          <div className="tdp-topbar">
            <button
              className="tdp-back-btn"
              onClick={handleResetForm}
              type="button"
            >
              <ArrowLeft size={15} />
              Retour à la liste
            </button>

            <div className="tdp-topbar-right">
              {selectedUserId && selectedUser?.isActive ? (
                <button
                  className="admin-user-trash-button"
                  disabled={isSubmitting}
                  onClick={() => void handleMoveUserToTrash()}
                  type="button"
                >
                  <Trash2 size={16} strokeWidth={2.2} />
                  Mettre a la corbeille
                </button>
              ) : null}

              {selectedUserId && selectedUser?.isActive === false ? (
                <>
                  <button
                    className="admin-user-delete-button"
                    disabled={isSubmitting}
                    onClick={() => void handleDeleteUserPermanently()}
                    type="button"
                  >
                    <Trash2 size={16} strokeWidth={2.2} />
                    Supprimer definitivement
                  </button>
                  <button
                    className="admin-user-restore-button"
                    disabled={isSubmitting}
                    onClick={() => void handleRestoreUser()}
                    type="button"
                  >
                    <RotateCcw size={16} strokeWidth={2.2} />
                    Restaurer
                  </button>
                </>
              ) : null}

              <button
                className="primary-button admin-user-save-button"
                disabled={isSubmitting}
                form={userFormId}
              >
                {selectedUserId
                  ? isUpdating
                    ? 'Mise a jour...'
                    : 'Sauvegarder'
                  : isCreating
                    ? 'Creation...'
                    : 'Sauvegarder'}
              </button>
            </div>
          </div>

          <div className="tdp-content">
            <section className="referentials-form-card admin-user-detail-card">
              <header className="referentials-card-header">
                <div>
                  <h3>
                    {selectedUserId
                      ? 'Modifier un compte'
                      : 'Ajouter un compte'}
                  </h3>
                  <p>
                    {selectedUserId
                      ? 'Modifie les informations principales du compte selectionne.'
                      : 'Ajoute un utilisateur dans Supabase Auth et dans le repertoire applicatif.'}
                  </p>
                </div>
              </header>

              <form
                className="referentials-form"
                id={userFormId}
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
                  <div
                    className={
                      formState.groupId
                        ? 'incident-lookup-field has-clear'
                        : 'incident-lookup-field'
                    }
                  >
                    <input
                      className={formState.groupId ? '' : 'lookup-placeholder'}
                      placeholder="Choisir le groupe"
                      readOnly
                      value={selectedFormGroup?.name ?? ''}
                    />

                    {formState.groupId ? (
                      <button
                        aria-label="Retirer le groupe"
                        onClick={() => handleFieldChange('groupId', '')}
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    ) : null}

                    <button
                      aria-label="Rechercher un groupe"
                      onClick={openGroupLookup}
                      type="button"
                    >
                      <Search size={18} />
                    </button>
                  </div>
                </label>
              </form>

              {formMessage ? (
                <p className="referentials-feedback">{formMessage}</p>
              ) : null}
            </section>
          </div>

          {showGroupLookup ? (
            <div
              aria-modal="true"
              className="incident-lookup-overlay"
              role="dialog"
            >
              <section className="incident-lookup-dialog">
                <header className="incident-lookup-header">
                  <div>
                    <h3>Selectionner un groupe</h3>
                  </div>

                  <button
                    aria-label="Fermer la selection"
                    className="incident-lookup-close"
                    onClick={closeGroupLookup}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </header>

                <label className="incident-lookup-search">
                  <select
                    aria-label="Categorie de recherche"
                    onChange={(event) =>
                      setUserGroupLookupSearchField(
                        event.target.value as UserGroupLookupSearchField,
                      )
                    }
                    value={userGroupLookupSearchField}
                  >
                    <option value="IDENTIFIER">Identifiant</option>
                    <option value="NAME">Nom</option>
                  </select>

                  <div className="incident-lookup-search-input">
                    <input
                      autoFocus
                      onChange={(event) =>
                        setUserGroupLookupSearch(event.target.value)
                      }
                      placeholder="Rechercher"
                      value={userGroupLookupSearch}
                    />
                  </div>
                </label>

                <div className="incident-lookup-table-scroll">
                  <table className="incident-lookup-table">
                    <thead>
                      <tr>
                        <th>Identifiant</th>
                        <th>Nom</th>
                        <th>Description</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedLookupGroups.length === 0 ? (
                        <tr>
                          <td colSpan={3}>
                            Aucun groupe ne correspond a la recherche.
                          </td>
                        </tr>
                      ) : (
                        paginatedLookupGroups.map((group) => (
                          <tr
                            aria-selected={group.id === formState.groupId}
                            className={
                              group.id === formState.groupId
                                ? 'incident-lookup-row is-selected'
                                : 'incident-lookup-row'
                            }
                            key={group.id}
                            onClick={() => handleGroupLookupSelect(group)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleGroupLookupSelect(group);
                              }
                            }}
                            tabIndex={0}
                          >
                            <td className="incident-lookup-identity">
                              {group.name}
                            </td>
                            <td>{group.name}</td>
                            <td>{group.description ?? '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <footer className="incident-lookup-pagination">
                  <span>
                    Page {userGroupLookupPage} sur {totalUserGroupLookupPages} -{' '}
                    {filteredLookupGroups.length} resultat
                    {filteredLookupGroups.length > 1 ? 's' : ''}
                  </span>

                  <div>
                    <button
                      className="secondary-button incident-lookup-page-button"
                      disabled={userGroupLookupPage <= 1}
                      onClick={() =>
                        setUserGroupLookupPage((currentPage) =>
                          Math.max(1, currentPage - 1),
                        )
                      }
                      type="button"
                    >
                      Precedent
                    </button>

                    <span className="incident-lookup-current-page">
                      {userGroupLookupPage}
                    </span>

                    <button
                      className="secondary-button incident-lookup-page-button"
                      disabled={
                        userGroupLookupPage >= totalUserGroupLookupPages
                      }
                      onClick={() =>
                        setUserGroupLookupPage((currentPage) =>
                          Math.min(totalUserGroupLookupPages, currentPage + 1),
                        )
                      }
                      type="button"
                    >
                      Suivant
                    </button>
                  </div>
                </footer>
              </section>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {formMessage ? (
            <p className="referentials-feedback">{formMessage}</p>
          ) : null}

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

          <section className="admin-users-card">
            <header className="referentials-card-header">
              <div>
                <h3>Liste des utilisateurs</h3>
                <p>
                  Controle les profils disponibles pour les droits et les
                  assignations.
                </p>
              </div>
              <div className="ticket-list-toolbar">
                <div className="ticket-list-count" aria-live="polite">
                  <strong>{users.length}</strong>
                  <span>utilisateurs</span>
                </div>

                <button
                  className="admin-users-add-button"
                  onClick={handleOpenCreateForm}
                  type="button"
                >
                  <Plus size={16} strokeWidth={2.3} />
                  Ajouter
                </button>
              </div>
            </header>

            <div className="admin-users-toolbar">
              <div className="admin-users-search-field">
                <span>Recherche</span>
                <label className="ticket-list-target-search">
                  <select
                    aria-label="Champ de recherche"
                    onChange={(event) =>
                      setSearchField(event.target.value as UserSearchField)
                    }
                    value={searchField}
                  >
                    <option value="IDENTIFIER">Identifiant</option>
                    <option value="FIRST_NAME">Prenom</option>
                    <option value="LAST_NAME">Nom</option>
                    <option value="GROUP">Groupe</option>
                  </select>

                  <div className="ticket-list-target-search-input">
                    <input
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Rechercher"
                      type="search"
                      value={searchText}
                    />
                  </div>
                </label>
              </div>

              <label className="admin-users-role-filter">
                <span>Role</span>
                <select
                  onChange={(event) =>
                    setRoleFilter(event.target.value as UserRoleFilter)
                  }
                  value={roleFilter}
                >
                  <option value="ALL">Tous</option>
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {translateUserRole(role)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-users-trash-toggle">
                <input
                  checked={showTrash}
                  onChange={(event) => setShowTrash(event.target.checked)}
                  type="checkbox"
                />
                <span className="admin-users-trash-label">
                  Montrer la corbeille
                </span>
              </label>
            </div>

            {isLoading ? (
              <p className="referentials-empty-state">
                Chargement des utilisateurs...
              </p>
            ) : errorMessage ? (
              <p className="referentials-error">{errorMessage}</p>
            ) : filteredUsers.length === 0 ? (
              <p className="referentials-empty-state">
                Aucun utilisateur disponible.
              </p>
            ) : (
              <>
                <div className="ticket-table-scroll">
                  <table className="ticket-table admin-users-table">
                    <thead>
                      <tr>
                        <th>Identifiant</th>
                        <th>Prenom</th>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Groupe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((user) => (
                        <tr
                          className={
                            user.isActive
                              ? 'ticket-table-row'
                              : 'ticket-table-row is-trash'
                          }
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                        >
                          <td>
                            <div className="admin-users-identifier">
                              {formatUserIdentifier(user)}
                            </div>
                          </td>
                          <td>{user.firstName ?? 'Non defini'}</td>
                          <td>{user.lastName ?? 'Non defini'}</td>
                          <td>{user.email ?? 'Email indisponible'}</td>
                          <td>{translateUserRole(user.role)}</td>
                          <td>{formatUserGroupName(user, groupsById)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ticket-pagination">
                  <p className="ticket-form-helper">
                    Page {userPage} sur {totalUserPages} -{' '}
                    {filteredUsers.length} utilisateurs
                  </p>
                  <div className="ticket-pagination-actions">
                    <button
                      className="secondary-button"
                      disabled={userPage === 1}
                      onClick={() =>
                        setUserPage((current) => Math.max(1, current - 1))
                      }
                      type="button"
                    >
                      Precedent
                    </button>
                    <span className="ticket-pagination-current">
                      {userPage}
                    </span>
                    <button
                      className="secondary-button"
                      disabled={userPage === totalUserPages}
                      onClick={() =>
                        setUserPage((current) =>
                          Math.min(totalUserPages, current + 1),
                        )
                      }
                      type="button"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function filterUsers(
  users: AdminUserSummary[],
  groupsById: Map<string, { name: string }>,
  searchText: string,
  searchField: UserSearchField,
  roleFilter: UserRoleFilter,
  showTrash: boolean,
): AdminUserSummary[] {
  const normalizedSearch = normalizeSearchText(searchText);

  return users.filter((user) => {
    if (showTrash ? user.isActive : !user.isActive) {
      return false;
    }

    if (roleFilter !== 'ALL' && user.role !== roleFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const value =
      searchField === 'IDENTIFIER'
        ? formatUserIdentifier(user)
        : searchField === 'FIRST_NAME'
          ? (user.firstName ?? '')
          : searchField === 'LAST_NAME'
            ? (user.lastName ?? '')
            : formatUserGroupName(user, groupsById);

    return normalizeSearchText(value).includes(normalizedSearch);
  });
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
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

function formatUserIdentifier(user: AdminUserSummary): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.displayName ||
    user.email ||
    user.id
  );
}

function formatUserGroupName(
  user: AdminUserSummary,
  groupsById: Map<string, { name: string }>,
): string {
  return user.groupId
    ? (groupsById.get(user.groupId)?.name ?? user.groupId)
    : 'Aucun groupe';
}

function filterLookupGroups(
  groups: ReferentialGroup[],
  searchText: string,
  searchField: UserGroupLookupSearchField,
): ReferentialGroup[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return groups;
  }

  return groups.filter((group) => {
    const value =
      searchField === 'IDENTIFIER' || searchField === 'NAME' ? group.name : '';

    return normalizeSearchText(value).includes(normalizedSearch);
  });
}

function mapCreateUserErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Erreur inconnue lors de la creation du compte';
  }

  const normalizedMessage = normalizeSearchText(error.message);

  if (
    normalizedMessage.includes('already') &&
    normalizedMessage.includes('registered')
  ) {
    return 'Un compte avec cette adresse email existe deja.';
  }

  if (
    normalizedMessage.includes('already') &&
    normalizedMessage.includes('exists')
  ) {
    return 'Un compte avec cette adresse email existe deja.';
  }

  if (
    normalizedMessage.includes('email') &&
    normalizedMessage.includes('duplicate')
  ) {
    return 'Un compte avec cette adresse email existe deja.';
  }

  return error.message;
}
