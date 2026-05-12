import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type {
  ReferentialCatalogSnapshot,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';
import {
  createAdminReferential,
  deleteAdminReferential,
  fetchReferentialCatalog,
  updateAdminReferential,
} from '../../infrastructure/api/referentials-api';

type GroupsPageProps = {
  session: AuthSessionSnapshot;
};

type GroupFormMode = 'create' | 'edit' | null;
type GroupSearchField = 'IDENTIFIER' | 'NAME';

type GroupFormState = {
  description: string;
  name: string;
};

const GROUPS_PER_PAGE = 15;

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
};

const EMPTY_GROUP_FORM: GroupFormState = {
  description: '',
  name: '',
};

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
  const [searchField, setSearchField] =
    useState<GroupSearchField>('IDENTIFIER');
  const [searchText, setSearchText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const selectedGroup = selectedGroupId
    ? (catalog.groups.find((group) => group.id === selectedGroupId) ?? null)
    : null;
  const filteredGroups = useMemo(
    () => filterGroups(catalog.groups, searchText, searchField),
    [catalog.groups, searchField, searchText],
  );
  const totalGroupPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / GROUPS_PER_PAGE),
  );
  const paginatedGroups = filteredGroups.slice(
    (groupPage - 1) * GROUPS_PER_PAGE,
    groupPage * GROUPS_PER_PAGE,
  );

  const loadGroups = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setCatalog(await fetchReferentialCatalog());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du chargement des groupes',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    setGroupPage(1);
  }, [searchField, searchText]);

  useEffect(() => {
    if (groupPage > totalGroupPages) {
      setGroupPage(totalGroupPages);
    }
  }, [groupPage, totalGroupPages]);

  function handleFieldChange(field: keyof GroupFormState, value: string): void {
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
    setFormState(EMPTY_GROUP_FORM);
  }

  function handleSelectGroup(group: ReferentialGroup): void {
    setFormMode('edit');
    setSelectedGroupId(group.id);
    setFormMessage(null);
    setFormState({
      description: group.description ?? '',
      name: group.name,
    });
  }

  function handleResetForm(): void {
    setFormMode(null);
    setSelectedGroupId(null);
    setFormMessage(null);
    setFormState(EMPTY_GROUP_FORM);
  }

  async function handleSubmitGroup(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);

    const payload = {
      description: formState.description.trim() || null,
      level: selectedGroup?.level ?? null,
      name: formState.name.trim(),
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

  const isSubmitting = isDeleting || isSaving;
  const groupFormId = 'admin-group-form';

  return (
    <section className="panel referentials-panel admin-users-page admin-groups-page">
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
                className="primary-button"
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
                  <p>
                    {selectedGroupId
                      ? 'Modifie le nom et la description du groupe selectionne.'
                      : 'Ajoute un groupe disponible pour les assignations.'}
                  </p>
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
            </section>
          </div>
        </section>
      ) : (
        <section className="admin-users-card">
          <header className="referentials-card-header">
            <div>
              <h3>Liste des groupes</h3>
              <p>
                Controle les groupes disponibles pour les assignations et les
                droits de support.
              </p>
            </div>

            <div className="ticket-list-toolbar">
              <div className="ticket-list-count" aria-live="polite">
                <strong>{catalog.groups.length}</strong>
                <span>groupes</span>
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

              <div className="ticket-pagination">
                <p className="ticket-form-helper">
                  Page {groupPage} sur {totalGroupPages} -{' '}
                  {filteredGroups.length} groupes
                </p>
                <div className="ticket-pagination-actions">
                  <button
                    className="secondary-button"
                    disabled={groupPage === 1}
                    onClick={() =>
                      setGroupPage((current) => Math.max(1, current - 1))
                    }
                    type="button"
                  >
                    Precedent
                  </button>
                  <span className="ticket-pagination-current">{groupPage}</span>
                  <button
                    className="secondary-button"
                    disabled={groupPage === totalGroupPages}
                    onClick={() =>
                      setGroupPage((current) =>
                        Math.min(totalGroupPages, current + 1),
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
      )}
    </section>
  );
}

function filterGroups(
  groups: ReferentialGroup[],
  searchText: string,
  searchField: GroupSearchField,
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

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
}
