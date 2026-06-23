import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ArrowLeft, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { UserRole } from '../../domain/auth/user-role';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';
import type {
  ReferentialCatalogSnapshot,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  updateAdminUserGroups,
  updateAdminUserStatus,
} from '../../infrastructure/api/auth-api';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

type UsersPageProps = {
  session: AuthSessionSnapshot;
};

type UserFormState = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
};

type UserFormMode = 'create' | 'edit' | null;

type UserSearchField = 'IDENTIFIER' | 'FIRST_NAME' | 'LAST_NAME';

type UserRoleFilter = UserRole | 'ALL';

type UserGroupSearchField = 'DESCRIPTION' | 'IDENTIFIER' | 'NAME';

const USER_ROLES: UserRole[] = ['DEMANDEUR', 'AGENT', 'ADMIN'];
const USERS_PER_PAGE = 12;
const USER_GROUPS_PER_PAGE = 5;

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
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);
  const [isMembershipSaving, setIsMembershipSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [groupLookupPage, setGroupLookupPage] = useState(1);
  const [groupLookupSearch, setGroupLookupSearch] = useState('');
  const [groupLookupSearchField, setGroupLookupSearchField] =
    useState<UserGroupSearchField>('IDENTIFIER');
  const [searchField, setSearchField] = useState<UserSearchField>('IDENTIFIER');
  const [searchText, setSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('ALL');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const activeUsers = users.filter((user) => user.isActive).length;
  const agentUsers = users.filter((user) => user.role === 'AGENT').length;
  const adminUsers = users.filter((user) => user.role === 'ADMIN').length;
  const selectedUser = selectedUserId
    ? (users.find((user) => user.id === selectedUserId) ?? null)
    : null;
  const isSelectedCurrentUser = selectedUserId === session.user.id;
  const filteredUsers = useMemo(
    () => filterUsers(users, searchText, searchField, roleFilter, showTrash),
    [roleFilter, searchField, searchText, showTrash, users],
  );
  const totalUserPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USERS_PER_PAGE),
  );
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * USERS_PER_PAGE,
    userPage * USERS_PER_PAGE,
  );
  const selectedUserGroupIds = useMemo(
    () => (selectedUser ? getUserGroupIds(selectedUser) : []),
    [selectedUser],
  );
  const selectedUserGroups = useMemo(
    () =>
      selectedUserGroupIds
        .map((groupId) => catalog.groups.find((group) => group.id === groupId))
        .filter((group): group is ReferentialGroup => Boolean(group)),
    [catalog.groups, selectedUserGroupIds],
  );
  const availableGroups = useMemo(
    () =>
      filterUserLookupGroups(
        catalog.groups.filter(
          (group) => !selectedUserGroupIds.includes(group.id),
        ),
        groupLookupSearch,
        groupLookupSearchField,
      ),
    [
      catalog.groups,
      groupLookupSearch,
      groupLookupSearchField,
      selectedUserGroupIds,
    ],
  );
  const totalGroupLookupPages = Math.max(
    1,
    Math.ceil(availableGroups.length / USER_GROUPS_PER_PAGE),
  );
  const paginatedAvailableGroups = availableGroups.slice(
    (groupLookupPage - 1) * USER_GROUPS_PER_PAGE,
    groupLookupPage * USER_GROUPS_PER_PAGE,
  );

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
    if (groupLookupPage > totalGroupLookupPages) {
      setGroupLookupPage(totalGroupLookupPages);
    }
  }, [groupLookupPage, totalGroupLookupPages]);

  function handleFieldChange(field: keyof UserFormState, value: string): void {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFormMessage(null);
  }

  function handleSelectUser(user: AdminUserSummary): void {
    const inferredName = inferUserNameParts(user);

    setFormMode('edit');
    setSelectedUserId(user.id);
    setFormMessage(null);
    setIsGroupPickerOpen(false);
    setGroupLookupPage(1);
    setGroupLookupSearch('');
    setFormState({
      email: user.email ?? '',
      firstName: inferredName.firstName,
      lastName: inferredName.lastName,
      password: '',
      role: user.role,
    });
  }

  function handleResetForm(): void {
    setFormMode(null);
    setSelectedUserId(null);
    setFormState(EMPTY_USER_FORM);
    setFormMessage(null);
    setIsGroupPickerOpen(false);
    setGroupLookupPage(1);
    setGroupLookupSearch('');
  }

  function handleOpenCreateForm(): void {
    setFormMode('create');
    setSelectedUserId(null);
    setFormState(EMPTY_USER_FORM);
    setFormMessage(null);
    setIsGroupPickerOpen(false);
    setGroupLookupPage(1);
    setGroupLookupSearch('');
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
        groupId: null,
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
        groupId: selectedUser?.groupId ?? null,
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

    if (selectedUserId === session.user.id) {
      setFormMessage(
        'Vous ne pouvez pas mettre votre propre compte a la corbeille.',
      );

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

    if (selectedUserId === session.user.id) {
      setFormMessage('Vous ne pouvez pas supprimer votre propre compte.');

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

  async function handleAddUserGroup(group: ReferentialGroup): Promise<void> {
    if (!selectedUser) {
      return;
    }

    const nextGroupIds = normalizeUserGroupIds([
      ...getUserGroupIds(selectedUser),
      group.id,
    ]);
    const didUpdate = await updateUserGroups(selectedUser, nextGroupIds);

    if (didUpdate) {
      setIsGroupPickerOpen(false);
      setGroupLookupPage(1);
      setGroupLookupSearch('');
    }
  }

  async function handleRemoveUserGroup(groupId: string): Promise<void> {
    if (!selectedUser) {
      return;
    }

    const shouldRemove = window.confirm(
      'Voulez-vous vraiment retirer du groupe ?',
    );

    if (!shouldRemove) {
      return;
    }

    await updateUserGroups(
      selectedUser,
      normalizeUserGroupIds(
        getUserGroupIds(selectedUser).filter(
          (currentGroupId) => currentGroupId !== groupId,
        ),
      ),
    );
  }

  async function updateUserGroups(
    user: AdminUserSummary,
    nextGroupIds: string[],
  ): Promise<boolean> {
    const normalizedGroupIds = normalizeUserGroupIds(nextGroupIds);

    setIsMembershipSaving(true);
    setFormMessage(null);

    try {
      const updatedUser = await updateAdminUserGroups(
        session.accessToken,
        user.id,
        normalizedGroupIds,
      );

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...updatedUser,
                groupId: normalizedGroupIds[0] ?? null,
                groupIds: normalizedGroupIds,
              }
            : currentUser,
        ),
      );

      return true;
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la modification des groupes de l'utilisateur",
      );

      return false;
    } finally {
      setIsMembershipSaving(false);
    }
  }

  const isSubmitting =
    isCreating || isDeleting || isUpdating || isMembershipSaving;
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
              {selectedUserId &&
              selectedUser?.isActive &&
              !isSelectedCurrentUser ? (
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

              {selectedUserId &&
              selectedUser?.isActive === false &&
              !isSelectedCurrentUser ? (
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
                  {selectedUserId ? null : (
                    <p>
                      Ajoute un utilisateur dans Supabase Auth et dans le
                      repertoire applicatif.
                    </p>
                  )}
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
                {selectedUserId ? null : (
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
                )}

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

                {selectedUserId ? null : (
                  <label className="field">
                    <span>Prenom</span>
                    <input
                      onChange={(event) =>
                        handleFieldChange('firstName', event.target.value)
                      }
                      value={formState.firstName}
                    />
                  </label>
                )}

                {selectedUserId ? null : (
                  <label className="field">
                    <span>Nom</span>
                    <input
                      onChange={(event) =>
                        handleFieldChange('lastName', event.target.value)
                      }
                      value={formState.lastName}
                    />
                  </label>
                )}

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
              </form>

              {formMessage ? (
                <p className="referentials-feedback">{formMessage}</p>
              ) : null}

              {selectedUser ? (
                <section className="admin-group-members-card">
                  <header className="admin-group-members-header">
                    <div>
                      <h4>Groupes de l'utilisateur</h4>
                    </div>

                    <div className="ticket-list-toolbar">
                      <div className="ticket-list-count" aria-live="polite">
                        <strong>{selectedUserGroups.length}</strong>
                        <span>groupes</span>
                      </div>

                      <button
                        className="primary-button admin-user-save-button admin-group-add-button"
                        disabled={isMembershipSaving}
                        onClick={() => {
                          setIsGroupPickerOpen(true);
                          setGroupLookupPage(1);
                        }}
                        type="button"
                      >
                        <Plus
                          size={16}
                          strokeWidth={2.3}
                          style={{ marginRight: 8 }}
                        />
                        Ajouter
                      </button>
                    </div>
                  </header>

                  {isGroupPickerOpen ? (
                    <div
                      aria-modal="true"
                      className="incident-lookup-overlay"
                      role="dialog"
                    >
                      <section className="incident-lookup-dialog">
                        <header className="incident-lookup-header">
                          <h3>Selectionner un groupe</h3>

                          <button
                            aria-label="Fermer"
                            className="incident-lookup-close"
                            onClick={() => setIsGroupPickerOpen(false)}
                            type="button"
                          >
                            <X size={18} strokeWidth={2.1} />
                          </button>
                        </header>

                        <label className="incident-lookup-search">
                          <select
                            aria-label="Champ de recherche"
                            onChange={(event) => {
                              setGroupLookupSearchField(
                                event.target.value as UserGroupSearchField,
                              );
                              setGroupLookupPage(1);
                            }}
                            value={groupLookupSearchField}
                          >
                            <option value="IDENTIFIER">Identifiant</option>
                            <option value="NAME">Nom</option>
                            <option value="DESCRIPTION">Description</option>
                          </select>

                          <div className="incident-lookup-search-input">
                            <input
                              autoFocus
                              onChange={(event) => {
                                setGroupLookupSearch(event.target.value);
                                setGroupLookupPage(1);
                              }}
                              placeholder="Rechercher"
                              type="search"
                              value={groupLookupSearch}
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
                              {paginatedAvailableGroups.length === 0 ? (
                                <tr>
                                  <td colSpan={3}>
                                    Aucun groupe ne correspond a la recherche.
                                  </td>
                                </tr>
                              ) : (
                                paginatedAvailableGroups.map((group) => (
                                  <tr
                                    className="incident-lookup-row"
                                    key={group.id}
                                    onClick={() =>
                                      void handleAddUserGroup(group)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                      ) {
                                        event.preventDefault();
                                        void handleAddUserGroup(group);
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
                          <p>
                            Page {groupLookupPage} sur {totalGroupLookupPages} -{' '}
                            {availableGroups.length} resultats
                          </p>

                          <div>
                            <button
                              className="secondary-button incident-lookup-page-button"
                              disabled={groupLookupPage === 1}
                              onClick={() =>
                                setGroupLookupPage((current) =>
                                  Math.max(1, current - 1),
                                )
                              }
                              type="button"
                            >
                              Precedent
                            </button>
                            <span className="incident-lookup-current-page">
                              {groupLookupPage}
                            </span>
                            <button
                              className="secondary-button incident-lookup-page-button"
                              disabled={
                                groupLookupPage === totalGroupLookupPages
                              }
                              onClick={() =>
                                setGroupLookupPage((current) =>
                                  Math.min(totalGroupLookupPages, current + 1),
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

                  <div className="ticket-table-scroll admin-group-members-scroll">
                    <table className="ticket-table admin-user-groups-table">
                      <thead>
                        <tr>
                          <th>Identifiant</th>
                          <th>Nom</th>
                          <th>Description</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUserGroups.length === 0 ? (
                          <tr>
                            <td colSpan={4}>
                              Aucun groupe pour cet utilisateur.
                            </td>
                          </tr>
                        ) : (
                          selectedUserGroups.map((group) => (
                            <tr key={group.id}>
                              <td>
                                <div className="admin-users-identifier">
                                  {group.name}
                                </div>
                              </td>
                              <td>{group.name}</td>
                              <td>{group.description ?? '-'}</td>
                              <td>
                                <button
                                  className="admin-user-delete-button admin-group-remove-member-button"
                                  disabled={isMembershipSaving}
                                  onClick={() =>
                                    void handleRemoveUserGroup(group.id)
                                  }
                                  type="button"
                                >
                                  <Trash2 size={15} strokeWidth={2.2} />
                                  Retirer du groupe
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </section>
          </div>
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
                  className="primary-button admin-user-save-button admin-group-add-button"
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
          : (user.lastName ?? '');

    return normalizeSearchText(value).includes(normalizedSearch);
  });
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
}

function getUserGroupIds(user: AdminUserSummary): string[] {
  const groupIds = user.groupIds ?? [];

  if (user.groupId && !groupIds.includes(user.groupId)) {
    return normalizeUserGroupIds([user.groupId, ...groupIds]);
  }

  return normalizeUserGroupIds(groupIds);
}

function normalizeUserGroupIds(groupIds: string[]): string[] {
  return [...new Set(groupIds.map((groupId) => groupId.trim()))].filter(
    Boolean,
  );
}

function filterUserLookupGroups(
  groups: ReferentialGroup[],
  searchText: string,
  searchField: UserGroupSearchField,
): ReferentialGroup[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return groups;
  }

  return groups.filter((group) =>
    normalizeSearchText(
      getUserLookupGroupSearchValue(group, searchField),
    ).includes(normalizedSearch),
  );
}

function getUserLookupGroupSearchValue(
  group: ReferentialGroup,
  searchField: UserGroupSearchField,
): string {
  if (searchField === 'NAME' || searchField === 'IDENTIFIER') {
    return group.name;
  }

  return group.description ?? '';
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
