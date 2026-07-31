import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  History,
  type LucideIcon,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
} from '../../domain/auth/password-policy';
import { isManagerRole, type UserRole } from '../../domain/auth/user-role';
import { translateUserRole } from '../../domain/i18n/ticketing-labels';
import { AppPagination } from '../components/app-pagination';
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
import {
  EMPTY_CATALOG,
  EMPTY_USER_FORM,
  filterUserLookupGroups,
  filterUsers,
  formatUserIdentifier,
  getUserGroupIds,
  inferUserNameParts,
  mapCreateUserErrorMessage,
  normalizeOptionalText,
  normalizeSearchText,
  normalizeUserGroupIds,
  sortUsers,
  USER_GROUPS_PER_PAGE,
  USER_ROLES,
  USERS_PER_PAGE,
} from './users-page.helpers';
import type {
  UserFormMode,
  UserFormState,
  UserGroupSearchField,
  UserRoleFilter,
  UserSortOption,
  UsersPageProps,
  UserSearchField,
} from './users-page.types';

const USER_SORT_OPTIONS: Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  value: UserSortOption;
}> = [
  {
    description: 'Appliquer ce tri',
    icon: History,
    label: "Plus recents d'abord",
    value: 'CREATED_AT_DESC',
  },
  {
    description: 'Appliquer ce tri',
    icon: History,
    label: "Plus anciens d'abord",
    value: 'CREATED_AT_ASC',
  },
  {
    description: 'Appliquer ce tri',
    icon: ArrowUpDown,
    label: 'Par ordre croissant',
    value: 'IDENTIFIER_ASC',
  },
  {
    description: 'Appliquer ce tri',
    icon: ArrowUpDown,
    label: 'Par ordre decroissant',
    value: 'IDENTIFIER_DESC',
  },
];

function isProtectedTrashUser(user: AdminUserSummary): boolean {
  return user.accountStatus === 'DELETED';
}

function filterUsersBySearchAndRole(
  users: AdminUserSummary[],
  searchText: string,
  searchField: UserSearchField,
  roleFilter: UserRoleFilter,
): AdminUserSummary[] {
  const normalizedSearch = normalizeSearchText(searchText);

  return users.filter((user) => {
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

export function UsersPage({ mode = 'LIST', session }: UsersPageProps) {
  const isProtectedTrashMode = mode === 'PROTECTED_TRASH';
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState>(EMPTY_USER_FORM);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<UserFormMode>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
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
  const [sortBy, setSortBy] = useState<UserSortOption>('CREATED_AT_DESC');
  const [userPage, setUserPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('ALL');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const nonDeletedUsers = users.filter(
    (user) => user.accountStatus !== 'DELETED',
  );
  const activeUsers = nonDeletedUsers.filter(
    (user) =>
      (user.accountStatus ?? (user.isActive ? 'ACTIVE' : 'TRASHED')) ===
      'ACTIVE',
  ).length;
  const agentUsers = nonDeletedUsers.filter(
    (user) => user.role === 'AGENT',
  ).length;
  const managerUsers = nonDeletedUsers.filter(
    (user) => user.role === 'MANAGER',
  ).length;
  const adminUsers = nonDeletedUsers.filter(
    (user) => user.role === 'ADMIN',
  ).length;
  const selectedUser = selectedUserId
    ? (users.find((user) => user.id === selectedUserId) ?? null)
    : null;
  const isSelectedCurrentUser = selectedUserId === session.user.id;
  const isSelectedSuperAdmin = selectedUser?.role === 'SUPER_ADMIN';
  const canManageSelectedUser =
    !selectedUser ||
    session.user.role === 'SUPER_ADMIN' ||
    selectedUser.role !== 'SUPER_ADMIN';
  const isRoleProtectedFromManager =
    session.user.role === 'MANAGER' &&
    selectedUser !== null &&
    (selectedUser.role === 'ADMIN' || isManagerRole(selectedUser.role));
  const canChangeSelectedUserRole =
    canManageSelectedUser &&
    !isSelectedCurrentUser &&
    !isSelectedSuperAdmin &&
    !isRoleProtectedFromManager;
  const canChangeSelectedUserGroups =
    canManageSelectedUser &&
    !(
      session.user.role === 'MANAGER' &&
      selectedUser !== null &&
      isManagerRole(selectedUser.role)
    );
  const userRoleOptions = useMemo(() => {
    if (selectedUser?.role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN'] satisfies UserRole[];
    }

    if (
      session.user.role === 'MANAGER' &&
      selectedUser &&
      (selectedUser.role === 'ADMIN' || isManagerRole(selectedUser.role))
    ) {
      return [selectedUser.role] satisfies UserRole[];
    }

    if (session.user.role === 'SUPER_ADMIN') {
      return USER_ROLES;
    }

    if (formState.role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN'] satisfies UserRole[];
    }

    return USER_ROLES.filter((role) => role !== 'SUPER_ADMIN');
  }, [formState.role, selectedUser, session.user.role]);
  const filteredUsers = useMemo(() => {
    if (isProtectedTrashMode) {
      return filterUsersBySearchAndRole(
        users.filter(isProtectedTrashUser),
        searchText,
        searchField,
        roleFilter,
      );
    }

    const nextUsers = filterUsers(
      users,
      searchText,
      searchField,
      roleFilter,
      showTrash,
    );

    return showTrash
      ? nextUsers.filter((user) => !isProtectedTrashUser(user))
      : nextUsers;
  }, [
    isProtectedTrashMode,
    roleFilter,
    searchField,
    searchText,
    showTrash,
    users,
  ]);
  const sortedUsers = useMemo(
    () => sortUsers(filteredUsers, sortBy),
    [filteredUsers, sortBy],
  );
  const totalUserPages = Math.max(
    1,
    Math.ceil(sortedUsers.length / USERS_PER_PAGE),
  );
  const paginatedUsers = sortedUsers.slice(
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
        fetchReferentialCatalog(session.accessToken),
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
  }, [roleFilter, searchField, searchText, showTrash, sortBy]);

  useEffect(() => {
    if (!isSortMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event: globalThis.MouseEvent): void {
      if (
        sortMenuRef.current &&
        event.target instanceof Node &&
        !sortMenuRef.current.contains(event.target)
      ) {
        setIsSortMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isSortMenuOpen]);

  function handleSelectSortOption(nextSortBy: UserSortOption): void {
    setSortBy(nextSortBy);
    setIsSortMenuOpen(false);
  }

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
    const passwordPolicyError = validatePasswordPolicy(formState.password);

    if (passwordPolicyError) {
      setFormMessage(passwordPolicyError);

      return;
    }

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

    if (!canManageSelectedUser) {
      setFormMessage('Seul un super administrateur peut modifier ce compte.');

      return;
    }

    if (
      selectedUser &&
      formState.role !== selectedUser.role &&
      !canChangeSelectedUserRole
    ) {
      setFormMessage(
        'Un manager ne peut pas modifier le role d un admin ou d un manager.',
      );

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

    if (!canManageSelectedUser) {
      setFormMessage(
        'Seul un super administrateur peut mettre ce compte a la corbeille.',
      );

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

    if (!canManageSelectedUser) {
      setFormMessage('Seul un super administrateur peut restaurer ce compte.');

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

    if (!canManageSelectedUser) {
      setFormMessage('Seul un super administrateur peut supprimer ce compte.');

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

    if (!canManageSelectedUser) {
      setFormMessage(
        'Seul un super administrateur peut modifier les groupes de ce compte.',
      );

      return;
    }

    if (!canChangeSelectedUserGroups) {
      setFormMessage(
        'Un manager ne peut pas modifier les groupes d un autre manager.',
      );

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

    if (!canManageSelectedUser) {
      setFormMessage(
        'Seul un super administrateur peut modifier les groupes de ce compte.',
      );

      return;
    }

    if (!canChangeSelectedUserGroups) {
      setFormMessage(
        'Un manager ne peut pas modifier les groupes d un autre manager.',
      );

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
              !isSelectedCurrentUser &&
              canManageSelectedUser ? (
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
              !isSelectedCurrentUser &&
              canManageSelectedUser ? (
                <>
                  {selectedUser.accountStatus === 'DELETED' ? null : (
                    <button
                      className="admin-user-delete-button"
                      disabled={isSubmitting}
                      onClick={() => void handleDeleteUserPermanently()}
                      type="button"
                    >
                      <Trash2 size={16} strokeWidth={2.2} />
                      <span className="admin-action-label-desktop">
                        Supprimer definitivement
                      </span>
                      <span className="admin-action-label-mobile">
                        Supprimer
                      </span>
                    </button>
                  )}
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
                disabled={isSubmitting || !canManageSelectedUser}
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
                      minLength={PASSWORD_MIN_LENGTH}
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
                    disabled={!canChangeSelectedUserRole}
                    onChange={(event) =>
                      handleFieldChange('role', event.target.value as UserRole)
                    }
                    value={formState.role}
                  >
                    {userRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {translateUserRole(role)}
                      </option>
                    ))}
                  </select>
                </label>
                {isSelectedCurrentUser ? (
                  <p className="ticket-form-helper">
                    Votre propre role ne peut pas etre modifie depuis ce
                    formulaire.
                  </p>
                ) : null}
                {!isSelectedCurrentUser && isSelectedSuperAdmin ? (
                  <p className="ticket-form-helper">
                    Le role super admin ne peut pas etre retire depuis ce
                    formulaire.
                  </p>
                ) : null}
                {isRoleProtectedFromManager ? (
                  <p className="ticket-form-helper">
                    Un manager ne peut pas modifier le role d'un admin ou d'un
                    manager.
                  </p>
                ) : null}
                {!isSelectedCurrentUser && !canManageSelectedUser ? (
                  <p className="ticket-form-helper">
                    Seul un super administrateur peut modifier ce compte.
                  </p>
                ) : null}
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
                        disabled={
                          isMembershipSaving || !canChangeSelectedUserGroups
                        }
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

                  {!canChangeSelectedUserGroups ? (
                    <p className="ticket-form-helper">
                      Un manager ne peut pas modifier les groupes d'un autre
                      manager.
                    </p>
                  ) : null}

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

                        <AppPagination
                          onPageChange={setGroupLookupPage}
                          page={groupLookupPage}
                          summary={`Page ${groupLookupPage} sur ${totalGroupLookupPages} - ${availableGroups.length} resultats`}
                          totalPages={totalGroupLookupPages}
                        />
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
                                  disabled={
                                    isMembershipSaving ||
                                    !canChangeSelectedUserGroups
                                  }
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

          {isProtectedTrashMode ? null : (
            <div className="referentials-summary">
              <article>
                <span>Total utilisateurs</span>
                <strong>{nonDeletedUsers.length}</strong>
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
                <span>Managers</span>
                <strong>{managerUsers}</strong>
              </article>
              <article>
                <span>Admins</span>
                <strong>{adminUsers}</strong>
              </article>
            </div>
          )}

          <section className="admin-users-card">
            <header className="referentials-card-header">
              <div>
                <h3>
                  {isProtectedTrashMode
                    ? 'Corbeille super admin'
                    : 'Liste des utilisateurs'}
                </h3>
              </div>
              <div className="ticket-list-toolbar">
                <div className="ticket-list-count" aria-live="polite">
                  <strong>
                    {isProtectedTrashMode
                      ? filteredUsers.length
                      : sortedUsers.length}
                  </strong>
                  <span>utilisateurs</span>
                </div>

                {isProtectedTrashMode ? null : (
                  <button
                    className="primary-button admin-user-save-button admin-group-add-button"
                    onClick={handleOpenCreateForm}
                    type="button"
                  >
                    <Plus
                      size={16}
                      strokeWidth={2.3}
                      style={{ marginRight: 8 }}
                    />
                    Ajouter
                  </button>
                )}

                <div className="ticket-list-sort-menu" ref={sortMenuRef}>
                  <button
                    aria-expanded={isSortMenuOpen}
                    aria-haspopup="menu"
                    className={
                      isSortMenuOpen
                        ? 'ticket-filter-trigger is-open'
                        : 'ticket-filter-trigger'
                    }
                    onClick={() =>
                      setIsSortMenuOpen((currentValue) => !currentValue)
                    }
                    type="button"
                  >
                    <span>Trier par</span>
                    <SlidersHorizontal size={18} strokeWidth={2} />
                  </button>

                  {isSortMenuOpen ? (
                    <div className="ticket-sort-popover" role="menu">
                      <div className="ticket-sort-popover-label">Trier par</div>

                      {USER_SORT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isActive = sortBy === option.value;

                        return (
                          <button
                            className={
                              isActive
                                ? 'ticket-sort-option is-active'
                                : 'ticket-sort-option'
                            }
                            key={option.value}
                            onClick={() => handleSelectSortOption(option.value)}
                            role="menuitemradio"
                            type="button"
                          >
                            <span className="ticket-sort-option-icon">
                              <Icon size={16} strokeWidth={2} />
                            </span>
                            <span className="ticket-sort-option-copy">
                              <strong>{option.label}</strong>
                              <span>
                                {isActive
                                  ? 'Selection actuelle'
                                  : option.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
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

              {isProtectedTrashMode ? null : (
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
              )}
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

                <AppPagination
                  onPageChange={setUserPage}
                  page={userPage}
                  summary={`Page ${userPage} sur ${totalUserPages} - ${filteredUsers.length} utilisateurs`}
                  totalPages={totalUserPages}
                />
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}
