import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  type ReferentialCatalogSnapshot,
  type ReferentialCi,
  type ReferentialCiType,
} from '../../domain/referentials/referential-catalog';
import { translateCiStatus } from '../../domain/i18n/ticketing-labels';
import { fetchUserDirectory } from '../../infrastructure/api/auth-api';
import {
  createAdminReferential,
  deleteAdminReferential,
  fetchReferentialCatalog,
} from '../../infrastructure/api/referentials-api';

type ParkSection = 'CI_TYPES' | 'CIS';

type ParkPageProps = {
  section: ParkSection;
  session: AuthSessionSnapshot;
};

type EquipmentFilters = {
  assignedUserId: string;
  brand: string;
  location: string;
  search: string;
  status: string;
  typeId: string;
};

type EquipmentFormState = {
  archivedAt: string;
  assignedUserId: string;
  brand: string;
  comment: string;
  ciTypeId: string;
  ipAddress: string;
  location: string;
  macAddress: string;
  model: string;
  name: string;
  purchaseDate: string;
  serialNumber: string;
  status: string;
  warrantyEndDate: string;
};

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
};

const INITIAL_FILTERS: EquipmentFilters = {
  assignedUserId: '',
  brand: '',
  location: '',
  search: '',
  status: '',
  typeId: '',
};

const EMPTY_EQUIPMENT_FORM: EquipmentFormState = {
  archivedAt: '',
  assignedUserId: '',
  brand: '',
  comment: '',
  ciTypeId: '',
  ipAddress: '',
  location: '',
  macAddress: '',
  model: '',
  name: '',
  purchaseDate: '',
  serialNumber: '',
  status: 'IN_SERVICE',
  warrantyEndDate: '',
};

const CI_STATUS_OPTIONS = [
  'IN_SERVICE',
  'IN_STOCK',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
  'LOST',
  'RETIRED',
  'ARCHIVED',
] as const;

const PARK_CI_TYPE_NAMES = [
  'Ordinateur',
  'Serveur',
  'Imprimante',
  'Ecran',
  'Reseau',
  'Logiciel',
  'Peripherique',
  'Consommable',
  'Cable',
  'Telephone',
  'Autre',
] as const;

const PARK_SECTION_COPY: Record<
  ParkSection,
  { description: string; title: string }
> = {
  CI_TYPES: {
    description:
      'Structure les familles de materiel qui seront utilisees dans le nouveau module parc.',
    title: 'Types d equipements',
  },
  CIS: {
    description:
      'Consulte les equipements, leur affectation, leur statut et les principales informations techniques.',
    title: 'Equipements',
  },
};

export function ParkPage({ section, session }: ParkPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [filters, setFilters] = useState<EquipmentFilters>(INITIAL_FILTERS);
  const [equipmentForm, setEquipmentForm] =
    useState<EquipmentFormState>(EMPTY_EQUIPMENT_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEquipmentId, setDeletingEquipmentId] = useState<string | null>(
    null,
  );

  const loadParkData = useCallback(async (): Promise<void> => {
    const [nextCatalog, nextUsers] = await Promise.all([
      fetchReferentialCatalog(),
      fetchUserDirectory(session.accessToken),
    ]);

    setCatalog(nextCatalog);
    setUsers(nextUsers);
  }, [session.accessToken]);

  useEffect(() => {
    let isMounted = true;

    async function load(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [nextCatalog, nextUsers] = await Promise.all([
          fetchReferentialCatalog(),
          fetchUserDirectory(session.accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        setCatalog(nextCatalog);
        setUsers(nextUsers);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Le chargement du parc a echoue.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [session.accessToken]);

  const ciTypesById = useMemo(
    () => new Map(catalog.ciTypes.map((ciType) => [ciType.id, ciType])),
    [catalog.ciTypes],
  );

  const parkCiTypes = useMemo(
    () =>
      PARK_CI_TYPE_NAMES.map(
        (typeName) =>
          catalog.ciTypes.find((ciType) => ciType.name === typeName) ?? null,
      ).filter((ciType): ciType is ReferentialCiType => ciType !== null),
    [catalog.ciTypes],
  );

  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const activeEquipmentCount = useMemo(
    () => catalog.cis.filter((ci) => ci.archivedAt === null).length,
    [catalog.cis],
  );

  const assignedEquipmentCount = useMemo(
    () => catalog.cis.filter((ci) => ci.assignedUserId !== null).length,
    [catalog.cis],
  );

  const filteredEquipment = useMemo(
    () => filterEquipment(catalog.cis, filters, ciTypesById, usersById),
    [catalog.cis, filters, ciTypesById, usersById],
  );

  const visibleBrands = useMemo(
    () => buildUniqueValues(catalog.cis.map((ci) => ci.brand)),
    [catalog.cis],
  );

  const visibleLocations = useMemo(
    () => buildUniqueValues(catalog.cis.map((ci) => ci.location)),
    [catalog.cis],
  );

  const visibleStatuses = useMemo(
    () => buildUniqueValues(catalog.cis.map((ci) => ci.status)),
    [catalog.cis],
  );

  const copy = PARK_SECTION_COPY[section];

  async function handleCreateEquipment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);

    try {
      await createAdminReferential('cis', session.accessToken, {
        name: equipmentForm.name.trim(),
        ciTypeId: equipmentForm.ciTypeId,
        status: equipmentForm.status,
        assignedUserId: normalizeOptionalText(equipmentForm.assignedUserId),
        serialNumber: normalizeOptionalText(equipmentForm.serialNumber),
        brand: normalizeOptionalText(equipmentForm.brand),
        model: normalizeOptionalText(equipmentForm.model),
        location: normalizeOptionalText(equipmentForm.location),
        purchaseDate: normalizeOptionalText(equipmentForm.purchaseDate),
        warrantyEndDate: normalizeOptionalText(equipmentForm.warrantyEndDate),
        ipAddress: normalizeOptionalText(equipmentForm.ipAddress),
        macAddress: normalizeOptionalText(equipmentForm.macAddress),
        comment: normalizeOptionalText(equipmentForm.comment),
        archivedAt: normalizeOptionalText(equipmentForm.archivedAt),
      });

      setEquipmentForm(EMPTY_EQUIPMENT_FORM);
      await loadParkData();
      setFormMessage('Equipement cree.');
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'La creation de l equipement a echoue.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEquipment(ci: ReferentialCi): Promise<void> {
    const shouldDelete = window.confirm(
      `Supprimer definitivement l equipement ${ci.name} ?`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingEquipmentId(ci.id);
    setFormMessage(null);

    try {
      await deleteAdminReferential('cis', ci.id, session.accessToken);
      await loadParkData();
      setFormMessage('Equipement supprime.');
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'La suppression de l equipement a echoue.',
      );
    } finally {
      setDeletingEquipmentId(null);
    }
  }

  return (
    <section className="reports-page">
      <div className="page-header park-page-header">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
      </div>

      {errorMessage ? (
        <p className="referentials-error">{errorMessage}</p>
      ) : null}

      {section === 'CIS' ? (
        <section className="park-layout">
          <div className="park-summary">
            <article className="park-summary-card">
              <span>Equipements</span>
              <strong>{catalog.cis.length}</strong>
            </article>
            <article className="park-summary-card">
              <span>Actifs</span>
              <strong>{activeEquipmentCount}</strong>
            </article>
            <article className="park-summary-card">
              <span>Assignes</span>
              <strong>{assignedEquipmentCount}</strong>
            </article>
            <article className="park-summary-card">
              <span>Types</span>
              <strong>{parkCiTypes.length}</strong>
            </article>
          </div>

          <section className="park-panel">
            <header className="park-panel-header">
              <div>
                <h3>Filtres</h3>
                <p>Affinage rapide de la liste des equipements.</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => setFilters(INITIAL_FILTERS)}
                type="button"
              >
                Reinitialiser
              </button>
            </header>

            <div className="park-filter-grid">
              <label className="field">
                <span>Recherche</span>
                <input
                  onChange={handleFilterInput(setFilters, 'search')}
                  placeholder="Nom, modele, serie, IP, utilisateur..."
                  value={filters.search}
                />
              </label>

              <label className="field">
                <span>Type</span>
                <select
                  onChange={handleFilterInput(setFilters, 'typeId')}
                  value={filters.typeId}
                >
                  <option value="">Tous</option>
                  {parkCiTypes.map((ciType) => (
                    <option key={ciType.id} value={ciType.id}>
                      {ciType.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Statut</span>
                <select
                  onChange={handleFilterInput(setFilters, 'status')}
                  value={filters.status}
                >
                  <option value="">Tous</option>
                  {visibleStatuses.map((status) => (
                    <option key={status} value={status}>
                      {translateCiStatus(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Utilisateur</span>
                <select
                  onChange={handleFilterInput(setFilters, 'assignedUserId')}
                  value={filters.assignedUserId}
                >
                  <option value="">Tous</option>
                  <option value="__UNASSIGNED__">Non assigne</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {formatUserName(user)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Localisation</span>
                <select
                  onChange={handleFilterInput(setFilters, 'location')}
                  value={filters.location}
                >
                  <option value="">Toutes</option>
                  {visibleLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Marque</span>
                <select
                  onChange={handleFilterInput(setFilters, 'brand')}
                  value={filters.brand}
                >
                  <option value="">Toutes</option>
                  {visibleBrands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="park-panel">
            <header className="park-panel-header">
              <div>
                <h3>Creer un equipement</h3>
                <p>Ajoute un nouvel equipement au parc informatique.</p>
              </div>
            </header>

            <form
              className="park-create-form"
              onSubmit={(event) => void handleCreateEquipment(event)}
            >
              <label className="field">
                <span>Nom / code</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'name',
                  )}
                  required
                  value={equipmentForm.name}
                />
              </label>

              <label className="field">
                <span>Type</span>
                <select
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'ciTypeId',
                  )}
                  required
                  value={equipmentForm.ciTypeId}
                >
                  <option value="">Selectionner</option>
                  {parkCiTypes.map((ciType) => (
                    <option key={ciType.id} value={ciType.id}>
                      {ciType.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Statut</span>
                <select
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'status',
                  )}
                  value={equipmentForm.status}
                >
                  {CI_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {translateCiStatus(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Utilisateur assigne</span>
                <select
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'assignedUserId',
                  )}
                  value={equipmentForm.assignedUserId}
                >
                  <option value="">Non assigne</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {formatUserName(user)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Marque</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'brand',
                  )}
                  value={equipmentForm.brand}
                />
              </label>

              <label className="field">
                <span>Modele</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'model',
                  )}
                  value={equipmentForm.model}
                />
              </label>

              <label className="field">
                <span>Numero de serie</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'serialNumber',
                  )}
                  value={equipmentForm.serialNumber}
                />
              </label>

              <label className="field">
                <span>Localisation</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'location',
                  )}
                  value={equipmentForm.location}
                />
              </label>

              <label className="field">
                <span>Date d achat</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'purchaseDate',
                  )}
                  type="date"
                  value={equipmentForm.purchaseDate}
                />
              </label>

              <label className="field">
                <span>Fin de garantie</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'warrantyEndDate',
                  )}
                  type="date"
                  value={equipmentForm.warrantyEndDate}
                />
              </label>

              <label className="field">
                <span>Adresse IP</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'ipAddress',
                  )}
                  value={equipmentForm.ipAddress}
                />
              </label>

              <label className="field">
                <span>Adresse MAC</span>
                <input
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'macAddress',
                  )}
                  value={equipmentForm.macAddress}
                />
              </label>

              <label className="field park-create-form-comment">
                <span>Commentaire</span>
                <textarea
                  onChange={handleEquipmentFieldChange(
                    setEquipmentForm,
                    'comment',
                  )}
                  rows={4}
                  value={equipmentForm.comment}
                />
              </label>

              <div className="park-create-form-actions">
                <button
                  className="primary-button"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? 'Creation...' : 'Creer l equipement'}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setEquipmentForm(EMPTY_EQUIPMENT_FORM);
                    setFormMessage(null);
                  }}
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

          <section className="park-panel">
            <header className="park-panel-header">
              <div>
                <h3>Liste des equipements</h3>
                <p>{filteredEquipment.length} element(s) apres filtrage.</p>
              </div>
            </header>

            {isLoading ? (
              <p className="referentials-empty-state">Chargement du parc...</p>
            ) : filteredEquipment.length === 0 ? (
              <p className="referentials-empty-state">
                Aucun equipement ne correspond aux filtres.
              </p>
            ) : (
              <div className="park-equipment-grid">
                {filteredEquipment.map((ci) => (
                  <EquipmentCard
                    ci={ci}
                    ciType={ciTypesById.get(ci.ciTypeId) ?? null}
                    isDeleting={deletingEquipmentId === ci.id}
                    key={ci.id}
                    onDelete={() => void handleDeleteEquipment(ci)}
                    user={
                      ci.assignedUserId
                        ? (usersById.get(ci.assignedUserId) ?? null)
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      ) : (
        <section className="park-layout">
          <section className="park-panel">
            <header className="park-panel-header">
              <div>
                <h3>Types d equipements</h3>
                <p>Base de classification du nouveau module parc.</p>
              </div>
            </header>

            {isLoading ? (
              <p className="referentials-empty-state">
                Chargement des types...
              </p>
            ) : parkCiTypes.length === 0 ? (
              <p className="referentials-empty-state">
                Aucun type d equipement disponible.
              </p>
            ) : (
              <div className="park-type-grid">
                {parkCiTypes.map((ciType) => (
                  <EquipmentTypeCard
                    ciType={ciType}
                    count={
                      catalog.cis.filter((ci) => ci.ciTypeId === ciType.id)
                        .length
                    }
                    key={ciType.id}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </section>
  );
}

function EquipmentCard({
  ci,
  ciType,
  isDeleting,
  onDelete,
  user,
}: {
  ci: ReferentialCi;
  ciType: ReferentialCiType | null;
  isDeleting: boolean;
  onDelete: () => void;
  user: AdminUserSummary | null;
}) {
  return (
    <article className="park-equipment-card">
      <header className="park-equipment-card-header">
        <div>
          <h4>{ci.name}</h4>
          <p>{buildEquipmentSubtitle(ci)}</p>
        </div>
        <span
          className={`park-status-badge park-status-badge--${ci.status.toLowerCase()}`}
        >
          {translateCiStatus(ci.status)}
        </span>
      </header>

      <dl className="park-equipment-meta">
        <div>
          <dt>Type</dt>
          <dd>{ciType?.name ?? '-'}</dd>
        </div>
        <div>
          <dt>Assigne a</dt>
          <dd>{user ? formatUserName(user) : 'Non assigne'}</dd>
        </div>
        <div>
          <dt>Localisation</dt>
          <dd>{ci.location ?? '-'}</dd>
        </div>
        <div>
          <dt>Serie</dt>
          <dd>{ci.serialNumber ?? '-'}</dd>
        </div>
        <div>
          <dt>IP</dt>
          <dd>{ci.ipAddress ?? '-'}</dd>
        </div>
        <div>
          <dt>Garantie</dt>
          <dd>{formatDateValue(ci.warrantyEndDate)}</dd>
        </div>
      </dl>

      {ci.comment ? (
        <p className="park-equipment-comment">{ci.comment}</p>
      ) : null}

      <div className="park-equipment-actions">
        <button
          className="danger-button"
          disabled={isDeleting}
          onClick={onDelete}
          type="button"
        >
          {isDeleting ? 'Suppression...' : 'Supprimer'}
        </button>
      </div>
    </article>
  );
}

function EquipmentTypeCard({
  ciType,
  count,
}: {
  ciType: ReferentialCiType;
  count: number;
}) {
  return (
    <article className="park-type-card">
      <strong>{ciType.name}</strong>
      <span>{count} equipement(s)</span>
    </article>
  );
}

function handleFilterInput(
  setFilters: Dispatch<SetStateAction<EquipmentFilters>>,
  field: keyof EquipmentFilters,
) {
  return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };
}

function handleEquipmentFieldChange(
  setEquipmentForm: Dispatch<SetStateAction<EquipmentFormState>>,
  field: keyof EquipmentFormState,
) {
  return (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const value = event.target.value;
    setEquipmentForm((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };
}

function filterEquipment(
  cis: ReferentialCi[],
  filters: EquipmentFilters,
  ciTypesById: Map<string, ReferentialCiType>,
  usersById: Map<string, AdminUserSummary>,
): ReferentialCi[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return cis.filter((ci) => {
    if (filters.typeId && ci.ciTypeId !== filters.typeId) {
      return false;
    }

    if (filters.status && ci.status !== filters.status) {
      return false;
    }

    if (filters.brand && ci.brand !== filters.brand) {
      return false;
    }

    if (filters.location && ci.location !== filters.location) {
      return false;
    }

    if (
      filters.assignedUserId === '__UNASSIGNED__' &&
      ci.assignedUserId !== null
    ) {
      return false;
    }

    if (
      filters.assignedUserId &&
      filters.assignedUserId !== '__UNASSIGNED__' &&
      ci.assignedUserId !== filters.assignedUserId
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const assignedUser = ci.assignedUserId
      ? (usersById.get(ci.assignedUserId) ?? null)
      : null;
    const searchValue = [
      ci.name,
      ci.brand,
      ci.model,
      ci.serialNumber,
      ci.ipAddress,
      ci.macAddress,
      ci.location,
      ciTypeById(ciTypesById, ci.ciTypeId),
      assignedUser ? formatUserName(assignedUser) : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchValue.includes(normalizedSearch);
  });
}

function ciTypeById(
  ciTypesById: Map<string, ReferentialCiType>,
  ciTypeId: string,
): string {
  return ciTypesById.get(ciTypeId)?.name ?? '';
}

function buildEquipmentSubtitle(ci: ReferentialCi): string {
  const parts = [ci.brand, ci.model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Equipement non detaille';
}

function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || user.email || user.id;
}

function buildUniqueValues(values: Array<string | null>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort((left, right) => left.localeCompare(right, 'fr'));
}

function formatDateValue(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR').format(date);
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
