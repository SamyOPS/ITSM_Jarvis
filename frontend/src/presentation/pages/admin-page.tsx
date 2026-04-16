import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type {
  ReferentialCatalogSnapshot,
  ReferentialCategory,
  ReferentialChannel,
  ReferentialCi,
  ReferentialCiType,
  ReferentialGroup,
  ReferentialPriority,
  ReferentialService,
} from '../../domain/referentials/referential-catalog';
import {
  type AdminReferentialKind,
  createAdminReferential,
  deleteAdminReferential,
  fetchReferentialCatalog,
  updateAdminReferential,
} from '../../infrastructure/api/referentials-api';
import {
  translateCiStatus,
  translatePriority,
  translateUserRole,
} from '../../domain/i18n/ticketing-labels';

type AdminPageProps = {
  session: AuthSessionSnapshot;
};

type FormState = {
  categoryParentId: string;
  ciStatus: string;
  ciTypeId: string;
  description: string;
  groupLevel: string;
  name: string;
  priorityLevel: string;
  priorityName: string;
  resolutionHours: string;
  responseHours: string;
  serialNumber: string;
};

type ReferentialListItem =
  | ReferentialCategory
  | ReferentialChannel
  | ReferentialCi
  | ReferentialCiType
  | ReferentialGroup
  | ReferentialPriority
  | ReferentialService;

const REFERENTIAL_SECTIONS: Array<{
  description: string;
  kind: AdminReferentialKind;
  title: string;
}> = [
  {
    description: 'Catégories et sous-catégories pour qualifier les tickets.',
    kind: 'categories',
    title: 'Catégories',
  },
  {
    description:
      'Canaux de création des tickets : portail, email ou téléphone.',
    kind: 'channels',
    title: 'Canaux',
  },
  {
    description: 'Types de CI utilisés pour classer les actifs de la CMDB.',
    kind: 'ci-types',
    title: 'Types de CI',
  },
  {
    description: 'Éléments de configuration disponibles pour les tickets.',
    kind: 'cis',
    title: 'CIs',
  },
  {
    description: 'Équipes de support et niveaux d’escalade.',
    kind: 'groups',
    title: 'Groupes',
  },
  {
    description: 'Catalogue des priorités avec niveaux et SLA.',
    kind: 'priorities',
    title: 'Priorités',
  },
  {
    description: 'Services métier ou techniques impactés par les tickets.',
    kind: 'services',
    title: 'Services',
  },
];

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
  services: [],
};

const PRIORITY_NAMES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const GROUP_LEVELS = ['N1', 'N2', 'N3'] as const;
const CI_STATUSES = ['IN_SERVICE', 'MAINTENANCE', 'OUT_OF_SERVICE'] as const;

export function AdminPage({ session }: AdminPageProps) {
  const [activeKind, setActiveKind] =
    useState<AdminReferentialKind>('categories');
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(createEmptyFormState());
  const [isMutating, setIsMutating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currentItems = useMemo(
    () => getItemsForKind(activeKind, catalog),
    [activeKind, catalog],
  );

  const loadCatalog = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadErrorMessage(null);

    try {
      const nextCatalog = await fetchReferentialCatalog();
      setCatalog(nextCatalog);
    } catch (error) {
      setLoadErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du chargement des référentiels',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    setSelectedId(null);
    setFormState(createEmptyFormState());
    setFeedbackMessage(null);
  }, [activeKind]);

  function handleSelectItem(item: ReferentialListItem): void {
    setSelectedId(item.id);
    setFeedbackMessage(null);
    setFormState(buildFormState(activeKind, item));
  }

  function handleCreateNew(): void {
    setSelectedId(null);
    setFeedbackMessage(null);
    setFormState(createEmptyFormState());
  }

  function handleFieldChange(field: keyof FormState, value: string): void {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsMutating(true);
    setFeedbackMessage(null);

    try {
      const payload = buildPayload(activeKind, formState);

      if (selectedId) {
        await updateAdminReferential(
          activeKind,
          selectedId,
          session.accessToken,
          payload,
        );
      } else {
        await createAdminReferential(activeKind, session.accessToken, payload);
      }

      await loadCatalog();
      setSelectedId(null);
      setFormState(createEmptyFormState());
      setFeedbackMessage(
        selectedId
          ? 'Référentiel mis à jour avec succès.'
          : 'Référentiel créé avec succès.',
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la sauvegarde du référentiel',
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!selectedId) {
      return;
    }

    setIsMutating(true);
    setFeedbackMessage(null);

    try {
      await deleteAdminReferential(activeKind, selectedId, session.accessToken);
      await loadCatalog();
      setSelectedId(null);
      setFormState(createEmptyFormState());
      setFeedbackMessage('Référentiel supprimé avec succès.');
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la suppression du referentiel',
      );
    } finally {
      setIsMutating(false);
    }
  }

  const activeSection = REFERENTIAL_SECTIONS.find(
    (section) => section.kind === activeKind,
  );

  return (
    <section className="panel referentials-panel">
      <span className="panel-tag">P2.4</span>
      <h2>Écran admin des référentiels</h2>
      <p>
        Gère les catalogues de la V1 ticketing depuis un écran réservé aux
        administrateurs. Le flux reste simple : choisir un référentiel,
        consulter les éléments existants, puis créer ou modifier une entrée avec
        un formulaire léger.
      </p>

      <div className="referentials-summary">
        <article>
          <span>Session admin</span>
          <strong>
            {formatUserDisplayName(
              session.user.firstName,
              session.user.lastName,
              session.user.email,
            )}
          </strong>
        </article>
        <article>
          <span>Rôle</span>
          <strong>{translateUserRole(session.user.role)}</strong>
        </article>
        <article>
          <span>Catalogues chargés</span>
          <strong>{REFERENTIAL_SECTIONS.length}</strong>
        </article>
        <article>
          <span>Éléments affichés</span>
          <strong>{currentItems.length}</strong>
        </article>
      </div>

      <div className="referentials-layout">
        <aside className="referentials-sidebar">
          <div className="referentials-sidebar-header">
            <h3>Référentiels</h3>
            <p>Choisis le jeu de données que tu veux administrer.</p>
          </div>
          <div className="referentials-nav">
            {REFERENTIAL_SECTIONS.map((section) => (
              <button
                className={
                  section.kind === activeKind
                    ? 'referentials-nav-button is-active'
                    : 'referentials-nav-button'
                }
                key={section.kind}
                onClick={() => setActiveKind(section.kind)}
                type="button"
              >
                <strong>{section.title}</strong>
                <span>
                  {getItemsForKind(section.kind, catalog).length} éléments
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="referentials-content">
          <section className="referentials-catalog-card">
            <header className="referentials-card-header">
              <div>
                <h3>{activeSection?.title}</h3>
                <p>{activeSection?.description}</p>
              </div>
              <button
                className="secondary-button"
                onClick={handleCreateNew}
                type="button"
              >
                Nouvel élément
              </button>
            </header>

            {isLoading ? (
              <p className="referentials-empty-state">
                Chargement des référentiels...
              </p>
            ) : loadErrorMessage ? (
              <p className="referentials-error">{loadErrorMessage}</p>
            ) : currentItems.length === 0 ? (
              <p className="referentials-empty-state">
                Aucune donnée chargée pour ce référentiel.
              </p>
            ) : (
              <div className="referentials-list">
                {currentItems.map((item) => (
                  <button
                    className={
                      item.id === selectedId
                        ? 'referential-card is-selected'
                        : 'referential-card'
                    }
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    type="button"
                  >
                    <strong>{getItemTitle(activeKind, item)}</strong>
                    <span>{getItemMeta(activeKind, item, catalog)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="referentials-form-card">
            <header className="referentials-card-header">
              <div>
                <h3>
                  {selectedId ? 'Modifier une entrée' : 'Créer une entrée'}
                </h3>
                <p>
                  {selectedId
                    ? 'Modifie l’élément de référentiel sélectionné.'
                    : 'Ajoute un Nouvel élément au referentiel choisi.'}
                </p>
              </div>
            </header>

            <form
              className="referentials-form"
              onSubmit={(event) => void handleSubmit(event)}
            >
              {renderFormFields(
                activeKind,
                formState,
                catalog,
                handleFieldChange,
              )}

              <div className="referentials-actions">
                <button
                  className="primary-button"
                  disabled={isMutating}
                  type="submit"
                >
                  {isMutating
                    ? 'Enregistrement...'
                    : selectedId
                      ? 'Enregistrer les modifications'
                      : 'Créer l’élément'}
                </button>
                <button
                  className="secondary-button"
                  onClick={handleCreateNew}
                  type="button"
                >
                  Réinitialiser le formulaire
                </button>
                {selectedId ? (
                  <button
                    className="danger-button"
                    disabled={isMutating}
                    onClick={() => void handleDelete()}
                    type="button"
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
            </form>

            {feedbackMessage ? (
              <p className="referentials-feedback">{feedbackMessage}</p>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  );
}

function renderFormFields(
  kind: AdminReferentialKind,
  formState: FormState,
  catalog: ReferentialCatalogSnapshot,
  onFieldChange: (field: keyof FormState, value: string) => void,
) {
  switch (kind) {
    case 'categories':
      return (
        <>
          <label className="field">
            <span>Nom</span>
            <input
              onChange={(event) => onFieldChange('name', event.target.value)}
              required
              value={formState.name}
            />
          </label>
          <label className="field">
            <span>Catégorie parente</span>
            <select
              onChange={(event) =>
                onFieldChange('categoryParentId', event.target.value)
              }
              value={formState.categoryParentId}
            >
              <option value="">Catégorie racine</option>
              {catalog.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </>
      );
    case 'channels':
    case 'ci-types':
      return (
        <label className="field">
          <span>Nom</span>
          <input
            onChange={(event) => onFieldChange('name', event.target.value)}
            required
            value={formState.name}
          />
        </label>
      );
    case 'groups':
      return (
        <>
          <label className="field">
            <span>Nom</span>
            <input
              onChange={(event) => onFieldChange('name', event.target.value)}
              required
              value={formState.name}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onFieldChange('description', event.target.value)
              }
              rows={3}
              value={formState.description}
            />
          </label>
          <label className="field">
            <span>Niveau de support</span>
            <select
              onChange={(event) =>
                onFieldChange('groupLevel', event.target.value)
              }
              value={formState.groupLevel}
            >
              <option value="">Aucun niveau</option>
              {GROUP_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </>
      );
    case 'priorities':
      return (
        <>
          <label className="field">
            <span>Nom de priorité</span>
            <select
              onChange={(event) =>
                onFieldChange('priorityName', event.target.value)
              }
              value={formState.priorityName}
            >
              {PRIORITY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {translatePriority(name)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Niveau</span>
            <input
              min="1"
              onChange={(event) =>
                onFieldChange('priorityLevel', event.target.value)
              }
              required
              type="number"
              value={formState.priorityLevel}
            />
          </label>
          <label className="field">
            <span>SLA de réponse (heures)</span>
            <input
              min="0"
              onChange={(event) =>
                onFieldChange('responseHours', event.target.value)
              }
              type="number"
              value={formState.responseHours}
            />
          </label>
          <label className="field">
            <span>SLA de résolution (heures)</span>
            <input
              min="0"
              onChange={(event) =>
                onFieldChange('resolutionHours', event.target.value)
              }
              type="number"
              value={formState.resolutionHours}
            />
          </label>
        </>
      );
    case 'services':
      return (
        <>
          <label className="field">
            <span>Nom</span>
            <input
              onChange={(event) => onFieldChange('name', event.target.value)}
              required
              value={formState.name}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onFieldChange('description', event.target.value)
              }
              rows={3}
              value={formState.description}
            />
          </label>
        </>
      );
    case 'cis':
      return (
        <>
          <label className="field">
            <span>Nom</span>
            <input
              onChange={(event) => onFieldChange('name', event.target.value)}
              required
              value={formState.name}
            />
          </label>
          <label className="field">
            <span>Type de CI</span>
            <select
              onChange={(event) =>
                onFieldChange('ciTypeId', event.target.value)
              }
              required
              value={formState.ciTypeId}
            >
              <option value="">Choisir un type de CI</option>
              {catalog.ciTypes.map((ciType) => (
                <option key={ciType.id} value={ciType.id}>
                  {ciType.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Statut</span>
            <select
              onChange={(event) =>
                onFieldChange('ciStatus', event.target.value)
              }
              value={formState.ciStatus}
            >
              {CI_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {translateCiStatus(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Numéro de série</span>
            <input
              onChange={(event) =>
                onFieldChange('serialNumber', event.target.value)
              }
              value={formState.serialNumber}
            />
          </label>
        </>
      );
    default:
      return null;
  }
}

function createEmptyFormState(): FormState {
  return {
    categoryParentId: '',
    ciStatus: 'IN_SERVICE',
    ciTypeId: '',
    description: '',
    groupLevel: '',
    name: '',
    priorityLevel: '1',
    priorityName: 'LOW',
    resolutionHours: '',
    responseHours: '',
    serialNumber: '',
  };
}

function getItemsForKind(
  kind: AdminReferentialKind,
  catalog: ReferentialCatalogSnapshot,
): ReferentialListItem[] {
  switch (kind) {
    case 'categories':
      return catalog.categories;
    case 'channels':
      return catalog.channels;
    case 'ci-types':
      return catalog.ciTypes;
    case 'cis':
      return catalog.cis;
    case 'groups':
      return catalog.groups;
    case 'priorities':
      return catalog.priorities;
    case 'services':
      return catalog.services;
    default:
      return [];
  }
}

function buildFormState(
  kind: AdminReferentialKind,
  item: ReferentialListItem,
): FormState {
  const base = createEmptyFormState();

  switch (kind) {
    case 'categories': {
      const category = item as ReferentialCategory;
      return {
        ...base,
        categoryParentId: category.parentId ?? '',
        name: category.name,
      };
    }
    case 'channels': {
      const channel = item as ReferentialChannel;
      return {
        ...base,
        name: channel.name,
      };
    }
    case 'ci-types': {
      const ciType = item as ReferentialCiType;
      return {
        ...base,
        name: ciType.name,
      };
    }
    case 'cis': {
      const ci = item as ReferentialCi;
      return {
        ...base,
        ciStatus: ci.status,
        ciTypeId: ci.ciTypeId,
        name: ci.name,
        serialNumber: ci.serialNumber ?? '',
      };
    }
    case 'groups': {
      const group = item as ReferentialGroup;
      return {
        ...base,
        description: group.description ?? '',
        groupLevel: group.level ?? '',
        name: group.name,
      };
    }
    case 'priorities': {
      const priority = item as ReferentialPriority;
      return {
        ...base,
        priorityLevel: String(priority.level),
        priorityName: priority.name,
        resolutionHours:
          priority.resolutionHours === null
            ? ''
            : String(priority.resolutionHours),
        responseHours:
          priority.responseHours === null ? '' : String(priority.responseHours),
      };
    }
    case 'services': {
      const service = item as ReferentialService;
      return {
        ...base,
        description: service.description ?? '',
        name: service.name,
      };
    }
    default:
      return base;
  }
}

function buildPayload(
  kind: AdminReferentialKind,
  formState: FormState,
): Record<string, unknown> {
  switch (kind) {
    case 'categories':
      return {
        name: formState.name.trim(),
        parentId: formState.categoryParentId || null,
      };
    case 'channels':
    case 'ci-types':
      return {
        name: formState.name.trim(),
      };
    case 'groups':
      return {
        description: formState.description.trim() || null,
        level: formState.groupLevel || null,
        name: formState.name.trim(),
      };
    case 'priorities':
      return {
        level: Number(formState.priorityLevel),
        name: formState.priorityName,
        resolutionHours: toNullableNumber(formState.resolutionHours),
        responseHours: toNullableNumber(formState.responseHours),
      };
    case 'services':
      return {
        description: formState.description.trim() || null,
        name: formState.name.trim(),
      };
    case 'cis':
      return {
        assignedUserId: null,
        ciTypeId: formState.ciTypeId,
        name: formState.name.trim(),
        serialNumber: formState.serialNumber.trim() || null,
        status: formState.ciStatus,
      };
    default:
      return {};
  }
}

function toNullableNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  return Number(value);
}

function getItemTitle(
  kind: AdminReferentialKind,
  item: ReferentialListItem,
): string {
  switch (kind) {
    case 'priorities':
      return translatePriority((item as ReferentialPriority).name);
    default:
      return item.name;
  }
}

function getItemMeta(
  kind: AdminReferentialKind,
  item: ReferentialListItem,
  catalog: ReferentialCatalogSnapshot,
): string {
  switch (kind) {
    case 'categories': {
      const category = item as ReferentialCategory;
      if (!category.parentId) {
        return 'Catégorie racine';
      }

      const parent = catalog.categories.find(
        (candidate) => candidate.id === category.parentId,
      );
      return `Parent : ${parent?.name ?? 'Catégorie inconnue'}`;
    }
    case 'channels':
      return 'Canal de création de ticket';
    case 'ci-types':
      return 'Type d’élément de configuration';
    case 'cis': {
      const ci = item as ReferentialCi;
      const ciType = catalog.ciTypes.find(
        (candidate) => candidate.id === ci.ciTypeId,
      );
      return ` - ${ciType?.name ?? 'Type inconnu'}`;
    }
    case 'groups': {
      const group = item as ReferentialGroup;
      return group.level ? `Groupe support ${group.level}` : 'Groupe support';
    }
    case 'priorities': {
      const priority = item as ReferentialPriority;
      return `L${priority.level} - R${priority.responseHours ?? '-'}h / ${
        priority.resolutionHours ?? '-'
      }h`;
    }
    case 'services': {
      const service = item as ReferentialService;
      return service.description ?? 'Aucune description';
    }
    default:
      return item.id;
  }
}

function formatUserDisplayName(
  firstName: string | null,
  lastName: string | null,
  fallback: string,
): string {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || fallback;
}
