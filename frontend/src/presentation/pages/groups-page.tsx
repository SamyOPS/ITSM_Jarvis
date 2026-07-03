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
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { AppPagination } from '../components/app-pagination';
import type {
  ReferentialCatalogSnapshot,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';
import {
  fetchAdminUsers,
  updateAdminUserGroups,
} from '../../infrastructure/api/auth-api';
import {
  createAdminReferential,
  deleteAdminReferential,
  fetchReferentialCatalog,
  updateAdminReferential,
} from '../../infrastructure/api/referentials-api';
import {
  EMPTY_CATALOG,
  EMPTY_GROUP_FORM,
  GROUP_NAME_MAX_LENGTH,
  GROUPS_PER_PAGE,
  MEMBERS_PER_PAGE,
} from './groups-page.constants';
import {
  filterGroups,
  formatRoleLabel,
  formatUserIdentifier,
  getUserGroupIds,
  isUserInGroup,
  matchesMemberSearch,
  sortGroups,
} from './groups-page.helpers';
import type {
  GroupFormMode,
  GroupFormState,
  GroupSearchField,
  GroupSortOption,
  GroupsPageProps,
  MemberSearchField,
} from './groups-page.types';

const GROUP_SORT_OPTIONS: Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  value: GroupSortOption;
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

export function GroupsPage({ session }: GroupsPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<GroupFormMode>(null);
  const [formState, setFormState] = useState<GroupFormState>(EMPTY_GROUP_FORM);
  const [groupPage, setGroupPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false);
  const [isMembershipSaving, setIsMembershipSaving] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearchField, setMemberSearchField] =
    useState<MemberSearchField>('IDENTIFIER');
  const [memberSearchText, setMemberSearchText] = useState('');
  const [membersMessage, setMembersMessage] = useState<string | null>(null);
  const [searchField, setSearchField] =
    useState<GroupSearchField>('IDENTIFIER');
  const [searchText, setSearchText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<GroupSortOption>('CREATED_AT_DESC');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const selectedGroup = selectedGroupId
    ? (catalog.groups.find((group) => group.id === selectedGroupId) ?? null)
    : null;
  const filteredGroups = useMemo(
    () => filterGroups(catalog.groups, searchText, searchField),
    [catalog.groups, searchField, searchText],
  );
  const sortedGroups = useMemo(
    () => sortGroups(filteredGroups, sortBy),
    [filteredGroups, sortBy],
  );
  const totalGroupPages = Math.max(
    1,
    Math.ceil(sortedGroups.length / GROUPS_PER_PAGE),
  );
  const paginatedGroups = sortedGroups.slice(
    (groupPage - 1) * GROUPS_PER_PAGE,
    groupPage * GROUPS_PER_PAGE,
  );
  const selectedGroupMembers = useMemo(
    () =>
      selectedGroupId
        ? users.filter((user) => isUserInGroup(user, selectedGroupId))
        : [],
    [selectedGroupId, users],
  );
  const availableTechnicians = useMemo(
    () =>
      selectedGroupId
        ? users.filter(
            (user) =>
              user.isActive &&
              (user.role === 'AGENT' || user.role === 'ADMIN') &&
              !isUserInGroup(user, selectedGroupId) &&
              matchesMemberSearch(user, memberSearchText, memberSearchField),
          )
        : [],
    [memberSearchField, memberSearchText, selectedGroupId, users],
  );
  const totalMemberPages = Math.max(
    1,
    Math.ceil(availableTechnicians.length / MEMBERS_PER_PAGE),
  );
  const paginatedAvailableTechnicians = availableTechnicians.slice(
    (memberPage - 1) * MEMBERS_PER_PAGE,
    memberPage * MEMBERS_PER_PAGE,
  );

  const loadGroups = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextCatalog, nextUsers] = await Promise.all([
        fetchReferentialCatalog(session.accessToken),
        fetchAdminUsers(session.accessToken),
      ]);

      setCatalog(nextCatalog);
      setUsers(nextUsers);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du chargement des groupes',
      );
    } finally {
      setIsLoading(false);
    }
  }, [session.accessToken]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    setGroupPage(1);
  }, [searchField, searchText, sortBy]);

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

  function handleSelectSortOption(nextSortBy: GroupSortOption): void {
    setSortBy(nextSortBy);
    setIsSortMenuOpen(false);
  }

  useEffect(() => {
    if (groupPage > totalGroupPages) {
      setGroupPage(totalGroupPages);
    }
  }, [groupPage, totalGroupPages]);

  useEffect(() => {
    if (memberPage > totalMemberPages) {
      setMemberPage(totalMemberPages);
    }
  }, [memberPage, totalMemberPages]);

  function handleFieldChange(field: keyof GroupFormState, value: string): void {
    if (field === 'name' && value.length > GROUP_NAME_MAX_LENGTH) {
      setFormMessage('40 caracteres max.');

      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFormMessage(null);
  }

  function handleOpenCreateForm(): void {
    setFormMode('create');
    setSelectedGroupId(null);
    setFormMessage(null);
    setMembersMessage(null);
    setIsMemberPickerOpen(false);
    setMemberPage(1);
    setMemberSearchField('IDENTIFIER');
    setMemberSearchText('');
    setFormState(EMPTY_GROUP_FORM);
  }

  function handleSelectGroup(group: ReferentialGroup): void {
    setFormMode('edit');
    setSelectedGroupId(group.id);
    setFormMessage(null);
    setMembersMessage(null);
    setIsMemberPickerOpen(false);
    setMemberPage(1);
    setMemberSearchField('IDENTIFIER');
    setMemberSearchText('');
    setFormState({
      description: group.description ?? '',
      name: group.name,
    });
  }

  function handleResetForm(): void {
    setFormMode(null);
    setSelectedGroupId(null);
    setFormMessage(null);
    setMembersMessage(null);
    setIsMemberPickerOpen(false);
    setMemberPage(1);
    setMemberSearchField('IDENTIFIER');
    setMemberSearchText('');
    setFormState(EMPTY_GROUP_FORM);
  }

  async function handleSubmitGroup(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setFormMessage(null);

    const groupName = formState.name.trim();

    if (groupName.length > GROUP_NAME_MAX_LENGTH) {
      setFormMessage('40 caracteres max.');

      return;
    }

    setIsSaving(true);

    const payload = {
      description: formState.description.trim() || null,
      level: selectedGroup?.level ?? null,
      name: groupName,
    };

    try {
      if (selectedGroupId) {
        await updateAdminReferential(
          'groups',
          selectedGroupId,
          session.accessToken,
          payload,
        );
      } else {
        await createAdminReferential('groups', session.accessToken, payload);
      }

      handleResetForm();
      await loadGroups();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la sauvegarde du groupe',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteGroup(): Promise<void> {
    if (!selectedGroupId) {
      return;
    }

    const shouldDelete = window.confirm(
      'Supprimer definitivement ce groupe ? Cette action est irreversible.',
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setFormMessage(null);

    try {
      await deleteAdminReferential(
        'groups',
        selectedGroupId,
        session.accessToken,
      );
      handleResetForm();
      await loadGroups();
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

  async function handleAddMember(user: AdminUserSummary): Promise<void> {
    if (!selectedGroupId) {
      return;
    }

    const nextGroupIds = [...getUserGroupIds(user), selectedGroupId];

    const didUpdate = await updateUserMembership(user, nextGroupIds);

    if (didUpdate) {
      setIsMemberPickerOpen(false);
      setMemberSearchText('');
      setMemberPage(1);
    }
  }

  async function handleRemoveMember(user: AdminUserSummary): Promise<void> {
    if (!selectedGroupId) {
      return;
    }

    const shouldRemove = window.confirm(
      'Voulez-vous vraiment retirer du groupe ?',
    );

    if (!shouldRemove) {
      return;
    }

    const nextGroupIds = getUserGroupIds(user).filter(
      (groupId) => groupId !== selectedGroupId,
    );

    await updateUserMembership(user, nextGroupIds);
  }

  async function updateUserMembership(
    user: AdminUserSummary,
    nextGroupIds: string[],
  ): Promise<boolean> {
    if (!user.email) {
      setMembersMessage(
        'Impossible de modifier cet utilisateur: email manquant.',
      );

      return false;
    }

    setIsMembershipSaving(true);
    setMembersMessage(null);

    try {
      const updatedUser = await updateAdminUserGroups(
        session.accessToken,
        user.id,
        nextGroupIds,
      );

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...updatedUser,
                groupId: nextGroupIds[0] ?? null,
                groupIds: nextGroupIds,
              }
            : currentUser,
        ),
      );

      return true;
    } catch (error) {
      setMembersMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la modification des membres du groupe',
      );

      return false;
    } finally {
      setIsMembershipSaving(false);
    }
  }

  const isSubmitting = isDeleting || isSaving || isMembershipSaving;
  const groupFormId = 'admin-group-form';
  const rootClassName = formMode
    ? 'panel admin-detail-panel referentials-panel admin-users-page admin-groups-page'
    : 'panel referentials-panel admin-users-page admin-groups-page';

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
              Retour a la liste
            </button>

            <div className="tdp-topbar-right">
              {selectedGroupId ? (
                <button
                  className="admin-user-delete-button"
                  disabled={isSubmitting}
                  onClick={() => void handleDeleteGroup()}
                  type="button"
                >
                  <Trash2 size={16} strokeWidth={2.2} />
                  Supprimer definitivement
                </button>
              ) : null}

              <button
                className="primary-button admin-user-save-button"
                disabled={isSubmitting}
                form={groupFormId}
              >
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          <div className="tdp-content">
            <section className="referentials-form-card admin-user-detail-card">
              <header className="referentials-card-header">
                <div>
                  <h3>
                    {selectedGroupId
                      ? 'Modifier un groupe'
                      : 'Ajouter un groupe'}
                  </h3>
                </div>
              </header>

              <form
                className="referentials-form"
                id={groupFormId}
                onSubmit={(event) => void handleSubmitGroup(event)}
              >
                <label className="field">
                  <span>Nom</span>
                  <input
                    onChange={(event) =>
                      handleFieldChange('name', event.target.value)
                    }
                    required
                    value={formState.name}
                  />
                </label>

                <label className="field">
                  <span>Description</span>
                  <textarea
                    onChange={(event) =>
                      handleFieldChange('description', event.target.value)
                    }
                    rows={5}
                    value={formState.description}
                  />
                </label>
              </form>

              {formMessage ? (
                <p className="referentials-feedback">{formMessage}</p>
              ) : null}

              {selectedGroupId ? (
                <section className="admin-group-members-card">
                  <header className="admin-group-members-header">
                    <div>
                      <h4>Utilisateurs du groupe</h4>
                    </div>

                    <div className="ticket-list-toolbar">
                      <div className="ticket-list-count" aria-live="polite">
                        <strong>{selectedGroupMembers.length}</strong>
                        <span>utilisateurs</span>
                      </div>

                      <button
                        className="primary-button admin-user-save-button admin-group-add-button"
                        disabled={isMembershipSaving}
                        onClick={() => {
                          setIsMemberPickerOpen(true);
                          setMemberPage(1);
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

                  {isMemberPickerOpen ? (
                    <div
                      aria-modal="true"
                      className="incident-lookup-overlay"
                      role="dialog"
                    >
                      <section className="incident-lookup-dialog">
                        <header className="incident-lookup-header">
                          <h3>Selectionner un technicien</h3>

                          <button
                            aria-label="Fermer"
                            className="incident-lookup-close"
                            onClick={() => setIsMemberPickerOpen(false)}
                            type="button"
                          >
                            <X size={18} strokeWidth={2.1} />
                          </button>
                        </header>

                        <label className="incident-lookup-search">
                          <select
                            aria-label="Champ de recherche"
                            onChange={(event) => {
                              setMemberSearchField(
                                event.target.value as MemberSearchField,
                              );
                              setMemberPage(1);
                            }}
                            value={memberSearchField}
                          >
                            <option value="IDENTIFIER">Identifiant</option>
                            <option value="FIRST_NAME">Prenom</option>
                            <option value="LAST_NAME">Nom</option>
                            <option value="EMAIL">Email</option>
                            <option value="ROLE">Role</option>
                          </select>

                          <div className="incident-lookup-search-input">
                            <input
                              onChange={(event) => {
                                setMemberSearchText(event.target.value);
                                setMemberPage(1);
                              }}
                              placeholder="Rechercher"
                              type="search"
                              value={memberSearchText}
                            />
                          </div>
                        </label>

                        <div className="incident-lookup-table-scroll">
                          <table className="incident-lookup-table incident-lookup-table--group-members">
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
                              {paginatedAvailableTechnicians.length === 0 ? (
                                <tr>
                                  <td colSpan={5}>
                                    Aucun technicien ne correspond a la
                                    recherche.
                                  </td>
                                </tr>
                              ) : (
                                paginatedAvailableTechnicians.map((user) => (
                                  <tr
                                    className="incident-lookup-row"
                                    key={user.id}
                                    onClick={() => void handleAddMember(user)}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                      ) {
                                        event.preventDefault();
                                        void handleAddMember(user);
                                      }
                                    }}
                                    tabIndex={0}
                                  >
                                    <td className="incident-lookup-identity">
                                      {formatUserIdentifier(user)}
                                    </td>
                                    <td>{user.firstName ?? '-'}</td>
                                    <td>{user.lastName ?? '-'}</td>
                                    <td>{user.email ?? '-'}</td>
                                    <td>{formatRoleLabel(user.role)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        <AppPagination
                          onPageChange={setMemberPage}
                          page={memberPage}
                          summary={`Page ${memberPage} sur ${totalMemberPages} - ${availableTechnicians.length} resultats`}
                          totalPages={totalMemberPages}
                        />
                      </section>
                    </div>
                  ) : null}

                  {membersMessage ? (
                    <p className="referentials-feedback">{membersMessage}</p>
                  ) : null}

                  <div className="ticket-table-scroll admin-group-members-scroll">
                    <table className="ticket-table admin-group-members-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Prenom</th>
                          <th>Nom</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroupMembers.length === 0 ? (
                          <tr>
                            <td colSpan={6}>
                              Aucun utilisateur dans ce groupe.
                            </td>
                          </tr>
                        ) : (
                          selectedGroupMembers.map((user) => (
                            <tr key={user.id}>
                              <td>
                                <div className="admin-users-identifier">
                                  {formatUserIdentifier(user)}
                                </div>
                              </td>
                              <td>{user.firstName ?? '-'}</td>
                              <td>{user.lastName ?? '-'}</td>
                              <td>{user.email ?? '-'}</td>
                              <td>{formatRoleLabel(user.role)}</td>
                              <td>
                                <button
                                  className="admin-user-delete-button admin-group-remove-member-button"
                                  disabled={isMembershipSaving}
                                  onClick={() => void handleRemoveMember(user)}
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
        <section className="admin-users-card">
          <header className="referentials-card-header">
            <div>
              <h3>Liste des groupes</h3>
            </div>

            <div className="ticket-list-toolbar">
              <div className="ticket-list-count" aria-live="polite">
                <strong>{catalog.groups.length}</strong>
                <span>groupes</span>
              </div>

              <button
                className="primary-button admin-user-save-button admin-group-add-button"
                onClick={handleOpenCreateForm}
                type="button"
              >
                <Plus size={16} strokeWidth={2.3} style={{ marginRight: 8 }} />
                Ajouter
              </button>

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

                    {GROUP_SORT_OPTIONS.map((option) => {
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

          <div className="admin-groups-toolbar">
            <div className="admin-users-search-field">
              <span>Recherche</span>
              <label className="ticket-list-target-search">
                <select
                  aria-label="Champ de recherche"
                  onChange={(event) =>
                    setSearchField(event.target.value as GroupSearchField)
                  }
                  value={searchField}
                >
                  <option value="IDENTIFIER">Identifiant</option>
                  <option value="NAME">Nom</option>
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
          </div>

          {isLoading ? (
            <p className="referentials-empty-state">
              Chargement des groupes...
            </p>
          ) : errorMessage ? (
            <p className="referentials-error">{errorMessage}</p>
          ) : filteredGroups.length === 0 ? (
            <p className="referentials-empty-state">Aucun groupe disponible.</p>
          ) : (
            <>
              <div className="ticket-table-scroll">
                <table className="ticket-table admin-groups-table">
                  <thead>
                    <tr>
                      <th>Identifiant</th>
                      <th>Nom</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGroups.map((group) => (
                      <tr
                        className="ticket-table-row"
                        key={group.id}
                        onClick={() => handleSelectGroup(group)}
                      >
                        <td>
                          <div className="admin-users-identifier">
                            {group.name}
                          </div>
                        </td>
                        <td>{group.name}</td>
                        <td>{group.description ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <AppPagination
                onPageChange={setGroupPage}
                page={groupPage}
                summary={`Page ${groupPage} sur ${totalGroupPages} - ${filteredGroups.length} groupes`}
                totalPages={totalGroupPages}
              />
            </>
          )}
        </section>
      )}
    </section>
  );
}
