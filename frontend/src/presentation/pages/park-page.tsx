import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  type LucideIcon,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { AppPagination } from '../components/app-pagination';
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
  updateAdminReferential,
} from '../../infrastructure/api/referentials-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';
import {
  getPageQueryParam,
  withPageQuery,
  withReturnPageQuery,
} from '../helpers/pagination-route.helpers';
import {
  CI_STATUS_OPTIONS,
  EMPTY_CATALOG,
  EMPTY_EQUIPMENT_FORM,
  INITIAL_FILTERS,
  PARK_HARDWARE_REQUIRED_CI_TYPE_NAMES,
  PARK_CI_TYPE_NAMES,
} from './park-page.constants';
import {
  filterEquipment,
  formatEquipmentIdentifier,
  formatUserName,
  handleEquipmentFieldChange,
  normalizeOptionalNumber,
  normalizeOptionalText,
} from './park-page.helpers';
import type {
  EquipmentFilters,
  EquipmentFormState,
  ParkPageProps,
} from './park-page.types';

const EQUIPMENT_PER_PAGE = 15;
const EQUIPMENT_FORM_ID = 'park-equipment-form';
const USER_LOOKUP_PER_PAGE = 10;
type EquipmentSortOption = 'CREATED_AT_ASC' | 'CREATED_AT_DESC';
type UserLookupSearchField =
  | 'EMAIL'
  | 'FIRST_NAME'
  | 'IDENTIFIER'
  | 'LAST_NAME';
const EQUIPMENT_SORT_OPTIONS: Array<{
  value: EquipmentSortOption;
  label: string;
  icon: LucideIcon;
}> = [
  {
    value: 'CREATED_AT_DESC',
    label: "Plus recents d'abord",
    icon: ArrowDown,
  },
  {
    value: 'CREATED_AT_ASC',
    label: "Plus anciens d'abord",
    icon: ArrowUp,
  },
];

function toTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function RequiredMark() {
  return (
    <span className="field-required" aria-hidden="true">
      *
    </span>
  );
}

function buildCiPayload(form: EquipmentFormState): Record<string, unknown> {
  return {
    name: form.name.trim(),
    ciTypeId: form.ciTypeId,
    status: form.status,
    assignedUserId: normalizeOptionalText(form.assignedUserId),
    serialNumber: normalizeOptionalText(form.serialNumber),
    brand: normalizeOptionalText(form.brand),
    model: normalizeOptionalText(form.model),
    operatingSystem: normalizeOptionalText(form.operatingSystem),
    location: normalizeOptionalText(form.location),
    purchaseDate: normalizeOptionalText(form.purchaseDate),
    warrantyEndDate: normalizeOptionalText(form.warrantyEndDate),
    cpuName: normalizeOptionalText(form.cpuName),
    diskSpaceGb: normalizeOptionalNumber(form.diskSpaceGb),
    ramMb: normalizeOptionalNumber(form.ramMb),
    keyboardLayout: normalizeOptionalText(form.keyboardLayout),
    osVersion: normalizeOptionalText(form.osVersion),
    price: normalizeOptionalNumber(form.price),
    comment: normalizeOptionalText(form.comment),
    archivedAt: normalizeOptionalText(form.archivedAt),
  };
}

function mapEquipmentToForm(ci: ReferentialCi): EquipmentFormState {
  return {
    archivedAt: ci.archivedAt ?? '',
    assignedUserId: ci.assignedUserId ?? '',
    brand: ci.brand ?? '',
    comment: ci.comment ?? '',
    ciTypeId: ci.ciTypeId,
    cpuName: ci.cpuName ?? '',
    diskSpaceGb: ci.diskSpaceGb === null ? '' : String(ci.diskSpaceGb),
    keyboardLayout: ci.keyboardLayout ?? '',
    location: ci.location ?? '',
    model: ci.model ?? '',
    name: ci.name,
    operatingSystem: ci.operatingSystem ?? '',
    osVersion: ci.osVersion ?? '',
    price: ci.price === null ? '' : String(ci.price),
    purchaseDate: ci.purchaseDate ?? '',
    ramMb: ci.ramMb === null ? '' : String(ci.ramMb),
    serialNumber: ci.serialNumber ?? '',
    status: ci.status,
    warrantyEndDate: ci.warrantyEndDate ?? '',
  };
}

export function ParkPage({ ciId, mode, session }: ParkPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [filters, setFilters] = useState<EquipmentFilters>(INITIAL_FILTERS);
  const [equipmentPage, setEquipmentPage] = useState(() => getPageQueryParam());
  const [equipmentSortBy, setEquipmentSortBy] =
    useState<EquipmentSortOption>('CREATED_AT_DESC');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);
  const [userLookupPage, setUserLookupPage] = useState(1);
  const [userLookupSearchField, setUserLookupSearchField] =
    useState<UserLookupSearchField>('IDENTIFIER');
  const [userLookupSearchText, setUserLookupSearchText] = useState('');
  const [equipmentForm, setEquipmentForm] =
    useState<EquipmentFormState>(EMPTY_EQUIPMENT_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingEquipmentId, setDeletingEquipmentId] = useState<string | null>(
    null,
  );
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const loadParkData = useCallback(async (): Promise<void> => {
    const [nextCatalog, nextUsers] = await Promise.all([
      fetchReferentialCatalog(session.accessToken),
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
          fetchReferentialCatalog(session.accessToken),
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

  const selectedEquipmentType = useMemo(
    () =>
      equipmentForm.ciTypeId
        ? (ciTypesById.get(equipmentForm.ciTypeId) ?? null)
        : null,
    [ciTypesById, equipmentForm.ciTypeId],
  );

  const requiresHardwareDetails = useMemo(
    () =>
      selectedEquipmentType
        ? PARK_HARDWARE_REQUIRED_CI_TYPE_NAMES.includes(
            selectedEquipmentType.name as (typeof PARK_HARDWARE_REQUIRED_CI_TYPE_NAMES)[number],
          )
        : false,
    [selectedEquipmentType],
  );

  const filteredEquipment = useMemo(
    () => filterEquipment(catalog.cis, filters, usersById),
    [catalog.cis, filters, usersById],
  );

  const sortedEquipment = useMemo(() => {
    return [...filteredEquipment].sort((leftEquipment, rightEquipment) => {
      const leftCreatedAt = toTimestamp(leftEquipment.createdAt);
      const rightCreatedAt = toTimestamp(rightEquipment.createdAt);

      if (equipmentSortBy === 'CREATED_AT_ASC') {
        return leftCreatedAt - rightCreatedAt;
      }

      return rightCreatedAt - leftCreatedAt;
    });
  }, [equipmentSortBy, filteredEquipment]);

  const selectedEquipment = useMemo(
    () => catalog.cis.find((ci) => ci.id === ciId) ?? null,
    [catalog.cis, ciId],
  );

  useEffect(() => {
    if (mode === 'CREATE') {
      setEquipmentForm(EMPTY_EQUIPMENT_FORM);
      setFormMessage(null);
      setIsUserPickerOpen(false);
      setUserLookupSearchText('');
      setUserLookupPage(1);
    }

    if (mode === 'DETAIL' && selectedEquipment) {
      setEquipmentForm(mapEquipmentToForm(selectedEquipment));
      setFormMessage(null);
    }
  }, [mode, selectedEquipment]);

  const totalEquipmentPages = Math.max(
    1,
    Math.ceil(sortedEquipment.length / EQUIPMENT_PER_PAGE),
  );

  const paginatedEquipment = useMemo(() => {
    const startIndex = (equipmentPage - 1) * EQUIPMENT_PER_PAGE;
    return sortedEquipment.slice(startIndex, startIndex + EQUIPMENT_PER_PAGE);
  }, [equipmentPage, sortedEquipment]);

  const filteredUserLookupResults = useMemo(() => {
    const normalizedSearch = userLookupSearchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) => {
      const identifier = formatUserName(user);
      const searchableValues: Record<UserLookupSearchField, string> = {
        EMAIL: user.email ?? '',
        FIRST_NAME: user.firstName ?? '',
        IDENTIFIER: identifier,
        LAST_NAME: user.lastName ?? '',
      };

      return searchableValues[userLookupSearchField]
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [userLookupSearchField, userLookupSearchText, users]);

  const totalUserLookupPages = Math.max(
    1,
    Math.ceil(filteredUserLookupResults.length / USER_LOOKUP_PER_PAGE),
  );

  const paginatedUserLookupResults = useMemo(() => {
    const startIndex = (userLookupPage - 1) * USER_LOOKUP_PER_PAGE;
    return filteredUserLookupResults.slice(
      startIndex,
      startIndex + USER_LOOKUP_PER_PAGE,
    );
  }, [filteredUserLookupResults, userLookupPage]);

  useEffect(() => {
    setEquipmentPage(1);
  }, [equipmentSortBy, filters]);

  useEffect(() => {
    if (equipmentPage > totalEquipmentPages) {
      setEquipmentPage(totalEquipmentPages);
    }
  }, [equipmentPage, totalEquipmentPages]);

  useEffect(() => {
    if (userLookupPage > totalUserLookupPages) {
      setUserLookupPage(totalUserLookupPages);
    }
  }, [totalUserLookupPages, userLookupPage]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setIsSortMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function handleEquipmentFilterChange(field: keyof EquipmentFilters) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setFilters((currentFilters) => ({
        ...currentFilters,
        [field]: value,
      }));
    };
  }

  async function handleCreateEquipment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setIsSaving(true);
    setFormMessage(null);

    try {
      await createAdminReferential(
        'cis',
        session.accessToken,
        buildCiPayload(equipmentForm),
      );

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

  async function handleUpdateEquipment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedEquipment) {
      return;
    }

    setIsSaving(true);
    setFormMessage(null);

    try {
      await updateAdminReferential(
        'cis',
        selectedEquipment.id,
        session.accessToken,
        buildCiPayload(equipmentForm),
      );

      await loadParkData();
      setFormMessage('Equipement sauvegarde.');
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'La sauvegarde de l equipement a echoue.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleSelectAssignedUser(user: AdminUserSummary): void {
    setEquipmentForm((currentForm) => ({
      ...currentForm,
      assignedUserId: user.id,
    }));
    setIsUserPickerOpen(false);
    setUserLookupPage(1);
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
      if (mode === 'DETAIL') {
        navigateTo(detailBackPath);
      }
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

  const isCreateMode = mode === 'CREATE';
  const isDetailMode = mode === 'DETAIL';
  const detailBackPath = withPageQuery(
    '/parc/cis',
    getPageQueryParam('fromPage'),
  );

  return (
    <section className="reports-page">
      {errorMessage ? (
        <p className="referentials-error">{errorMessage}</p>
      ) : null}

      <section className="park-layout">
        {isCreateMode || isDetailMode ? (
          <section
            className={
              isDetailMode ? 'park-panel park-panel--detail' : 'park-panel'
            }
          >
            {isDetailMode ? (
              <header className="tdp-topbar park-detail-topbar">
                <div className="tdp-topbar-left">
                  <button
                    className="tdp-back-btn"
                    onClick={() => navigateTo(detailBackPath)}
                    type="button"
                  >
                    <ArrowLeft size={15} />
                    Retour a la liste
                  </button>
                </div>

                {selectedEquipment ? (
                  <strong className="tdp-topbar-ticket-title">
                    {selectedEquipment.name}
                  </strong>
                ) : null}

                <div className="tdp-topbar-right">
                  {selectedEquipment ? (
                    <span className="tdp-ticket-number">
                      {formatEquipmentIdentifier(selectedEquipment)}
                    </span>
                  ) : null}

                  {selectedEquipment ? (
                    <div className="tdp-status-form">
                      <select
                        className={
                          equipmentForm.status ? '' : 'select-placeholder'
                        }
                        disabled={isSaving}
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'status',
                        )}
                        required
                        value={equipmentForm.status}
                      >
                        <option disabled hidden value="">
                          Choisir un statut
                        </option>
                        {CI_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {translateCiStatus(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {selectedEquipment ? (
                    <button
                      className="primary-button admin-user-save-button"
                      disabled={isSaving}
                      form={EQUIPMENT_FORM_ID}
                      type="submit"
                    >
                      <Plus
                        size={16}
                        strokeWidth={2.3}
                        style={{ marginRight: 8 }}
                      />
                      {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  ) : null}

                  {selectedEquipment ? (
                    <button
                      className="admin-user-delete-button"
                      disabled={deletingEquipmentId === selectedEquipment.id}
                      onClick={() =>
                        void handleDeleteEquipment(selectedEquipment)
                      }
                      type="button"
                    >
                      <Trash2 size={16} strokeWidth={2.2} />
                      {deletingEquipmentId === selectedEquipment.id
                        ? 'Suppression...'
                        : 'Supprimer'}
                    </button>
                  ) : null}
                </div>
              </header>
            ) : (
              <header className="park-panel-header">
                <div>
                  <h3>Ajouter un equipement</h3>
                </div>
              </header>
            )}

            {isDetailMode && !isLoading && !selectedEquipment ? (
              <p className="referentials-empty-state">
                Equipement introuvable.
              </p>
            ) : null}

            {isDetailMode && isLoading ? (
              <p className="referentials-empty-state">
                Chargement de l equipement...
              </p>
            ) : null}

            {isCreateMode || selectedEquipment ? (
              <form
                className="park-create-form"
                id={EQUIPMENT_FORM_ID}
                onSubmit={(event) =>
                  isCreateMode
                    ? void handleCreateEquipment(event)
                    : void handleUpdateEquipment(event)
                }
              >
                <section className="park-form-section">
                  <h4>Informations principales</h4>

                  <div className="park-form-section-fields">
                    <label className="field">
                      <span>
                        Nom <RequiredMark />
                      </span>
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
                      <span>
                        Type <RequiredMark />
                      </span>
                      <select
                        className={
                          equipmentForm.ciTypeId ? '' : 'select-placeholder'
                        }
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'ciTypeId',
                        )}
                        required
                        value={equipmentForm.ciTypeId}
                      >
                        <option disabled hidden value="">
                          Choisir un type
                        </option>
                        {parkCiTypes.map((ciType) => (
                          <option key={ciType.id} value={ciType.id}>
                            {ciType.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isCreateMode ? (
                      <label className="field">
                        <span>
                          Statut <RequiredMark />
                        </span>
                        <select
                          className={
                            equipmentForm.status ? '' : 'select-placeholder'
                          }
                          onChange={handleEquipmentFieldChange(
                            setEquipmentForm,
                            'status',
                          )}
                          required
                          value={equipmentForm.status}
                        >
                          <option disabled hidden value="">
                            Choisir un statut
                          </option>
                          {CI_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {translateCiStatus(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </section>

                <section className="park-form-section">
                  <h4>Informations materiel</h4>

                  <div className="park-form-section-fields">
                    <label className="field">
                      <span>
                        Marque/Constructeur{' '}
                        {requiresHardwareDetails ? <RequiredMark /> : null}
                      </span>
                      <input
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'brand',
                        )}
                        required={requiresHardwareDetails}
                        value={equipmentForm.brand}
                      />
                    </label>

                    <label className="field">
                      <span>
                        Modele{' '}
                        {requiresHardwareDetails ? <RequiredMark /> : null}
                      </span>
                      <input
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'model',
                        )}
                        required={requiresHardwareDetails}
                        value={equipmentForm.model}
                      />
                    </label>

                    <label className="field">
                      <span>
                        Numero de serie{' '}
                        {requiresHardwareDetails ? <RequiredMark /> : null}
                      </span>
                      <input
                        onInvalid={(event) => {
                          if (!requiresHardwareDetails) {
                            event.currentTarget.setCustomValidity('');
                            return;
                          }

                          if (!event.currentTarget.value.trim()) {
                            event.currentTarget.setCustomValidity(
                              'Numero de serie obligatoire pour ce type d equipement.',
                            );
                          }
                        }}
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'serialNumber',
                        )}
                        onInput={(event) =>
                          event.currentTarget.setCustomValidity('')
                        }
                        required={requiresHardwareDetails}
                        value={equipmentForm.serialNumber}
                      />
                    </label>

                    <label className="field">
                      <span>Systeme d'exploitation</span>
                      <input
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'operatingSystem',
                        )}
                        value={equipmentForm.operatingSystem}
                      />
                    </label>
                  </div>
                </section>

                <section className="park-form-section">
                  <h4>Affectation</h4>

                  <div className="park-form-section-fields">
                    <label className="field">
                      <span>Utilisateur assigne</span>
                      <div
                        className={
                          equipmentForm.assignedUserId
                            ? 'incident-lookup-field has-clear'
                            : 'incident-lookup-field'
                        }
                      >
                        <input
                          className={
                            equipmentForm.assignedUserId
                              ? ''
                              : 'lookup-placeholder'
                          }
                          readOnly
                          value={
                            equipmentForm.assignedUserId
                              ? formatUserName(
                                  usersById.get(equipmentForm.assignedUserId) ??
                                    ({
                                      displayName: null,
                                      email: null,
                                      firstName: null,
                                      groupId: null,
                                      id: equipmentForm.assignedUserId,
                                      isActive: true,
                                      lastName: null,
                                      role: 'DEMANDEUR',
                                    } satisfies AdminUserSummary),
                                )
                              : 'Selectionner un utilisateur'
                          }
                        />
                        {equipmentForm.assignedUserId ? (
                          <button
                            aria-label="Retirer l'utilisateur assigne"
                            onClick={() =>
                              setEquipmentForm((currentForm) => ({
                                ...currentForm,
                                assignedUserId: '',
                              }))
                            }
                            type="button"
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                        <button
                          aria-label="Selectionner un utilisateur"
                          onClick={() => {
                            setIsUserPickerOpen(true);
                            setUserLookupPage(1);
                          }}
                          type="button"
                        >
                          <Search size={18} strokeWidth={2.1} />
                        </button>
                      </div>
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
                  </div>
                </section>

                <section className="park-form-section">
                  <h4>Suivi</h4>

                  <div className="park-form-section-fields">
                    <label className="field">
                      <span>Date d'achat</span>
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
                  </div>
                </section>

                <section className="park-form-section">
                  <h4>Information complementaire</h4>

                  <div className="park-form-section-fields">
                    <label className="field">
                      <span>CPU</span>
                      <input
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'cpuName',
                        )}
                        value={equipmentForm.cpuName}
                      />
                    </label>

                    <label className="field">
                      <span>Espace Disque dur (GB)</span>
                      <input
                        min="0"
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'diskSpaceGb',
                        )}
                        type="number"
                        value={equipmentForm.diskSpaceGb}
                      />
                    </label>

                    <label className="field">
                      <span>RAM (MB)</span>
                      <input
                        min="0"
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'ramMb',
                        )}
                        type="number"
                        value={equipmentForm.ramMb}
                      />
                    </label>

                    <label className="field">
                      <span>Clavier (langue/type)</span>
                      <input
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'keyboardLayout',
                        )}
                        value={equipmentForm.keyboardLayout}
                      />
                    </label>

                    <label className="field">
                      <span>OS version</span>
                      <input
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'osVersion',
                        )}
                        value={equipmentForm.osVersion}
                      />
                    </label>

                    <label className="field">
                      <span>Prix</span>
                      <input
                        min="0"
                        onChange={handleEquipmentFieldChange(
                          setEquipmentForm,
                          'price',
                        )}
                        step="0.01"
                        type="number"
                        value={equipmentForm.price}
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
                  </div>
                </section>

                {isCreateMode ? (
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
                ) : null}
              </form>
            ) : null}

            {formMessage ? (
              <p className="referentials-feedback">{formMessage}</p>
            ) : null}

            {isUserPickerOpen ? (
              <div
                aria-modal="true"
                className="incident-lookup-overlay"
                role="dialog"
              >
                <section className="incident-lookup-dialog">
                  <header className="incident-lookup-header">
                    <h3>Selectionner un utilisateur</h3>

                    <button
                      aria-label="Fermer"
                      className="incident-lookup-close"
                      onClick={() => setIsUserPickerOpen(false)}
                      type="button"
                    >
                      <X size={18} strokeWidth={2.1} />
                    </button>
                  </header>

                  <label className="incident-lookup-search">
                    <select
                      aria-label="Champ de recherche"
                      onChange={(event) => {
                        setUserLookupSearchField(
                          event.target.value as UserLookupSearchField,
                        );
                        setUserLookupPage(1);
                      }}
                      value={userLookupSearchField}
                    >
                      <option value="IDENTIFIER">Identifiant</option>
                      <option value="FIRST_NAME">Prenom</option>
                      <option value="LAST_NAME">Nom</option>
                      <option value="EMAIL">Email</option>
                    </select>

                    <div className="incident-lookup-search-input">
                      <input
                        onChange={(event) => {
                          setUserLookupSearchText(event.target.value);
                          setUserLookupPage(1);
                        }}
                        placeholder="Rechercher"
                        type="search"
                        value={userLookupSearchText}
                      />
                    </div>
                  </label>

                  <div className="incident-lookup-table-scroll">
                    <table className="incident-lookup-table incident-lookup-table--users">
                      <thead>
                        <tr>
                          <th>Identifiant</th>
                          <th>Prenom</th>
                          <th>Nom</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUserLookupResults.length === 0 ? (
                          <tr>
                            <td colSpan={4}>
                              Aucun utilisateur ne correspond a la recherche.
                            </td>
                          </tr>
                        ) : (
                          paginatedUserLookupResults.map((user) => (
                            <tr
                              className={
                                user.id === equipmentForm.assignedUserId
                                  ? 'incident-lookup-row is-selected'
                                  : 'incident-lookup-row'
                              }
                              key={user.id}
                              onClick={() => handleSelectAssignedUser(user)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === 'Enter' ||
                                  event.key === ' '
                                ) {
                                  event.preventDefault();
                                  handleSelectAssignedUser(user);
                                }
                              }}
                              tabIndex={0}
                            >
                              <td className="incident-lookup-identity">
                                {formatUserName(user)}
                              </td>
                              <td>{user.firstName ?? '-'}</td>
                              <td>{user.lastName ?? '-'}</td>
                              <td>{user.email ?? '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <AppPagination
                    onPageChange={setUserLookupPage}
                    page={userLookupPage}
                    summary={`Page ${userLookupPage} sur ${totalUserLookupPages} - ${filteredUserLookupResults.length} resultats`}
                    totalPages={totalUserLookupPages}
                  />
                </section>
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <section className="park-panel">
              <header className="park-panel-header">
                <div>
                  <h3>Liste des equipements</h3>
                </div>

                <div className="ticket-list-toolbar">
                  <div className="ticket-list-count" aria-live="polite">
                    <strong>{sortedEquipment.length}</strong>
                    <span>equipements</span>
                  </div>

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
                        setIsSortMenuOpen((currentState) => !currentState)
                      }
                      type="button"
                    >
                      <span>Trier par</span>
                      <SlidersHorizontal size={18} strokeWidth={2} />
                    </button>

                    {isSortMenuOpen ? (
                      <div className="ticket-sort-popover" role="menu">
                        <div className="ticket-sort-popover-label">
                          Trier par
                        </div>

                        <div className="ticket-sort-option-list">
                          {EQUIPMENT_SORT_OPTIONS.map((option) => {
                            const Icon = option.icon;

                            return (
                              <button
                                className={
                                  equipmentSortBy === option.value
                                    ? 'ticket-sort-option is-active'
                                    : 'ticket-sort-option'
                                }
                                key={option.value}
                                onClick={() => {
                                  setEquipmentSortBy(option.value);
                                  setIsSortMenuOpen(false);
                                }}
                                role="menuitemradio"
                                type="button"
                              >
                                <span
                                  className="ticket-sort-option-icon"
                                  aria-hidden="true"
                                >
                                  <Icon size={16} strokeWidth={2} />
                                </span>

                                <span className="ticket-sort-option-copy">
                                  <strong>{option.label}</strong>
                                  <span>
                                    {equipmentSortBy === option.value
                                      ? 'Selection actuelle'
                                      : 'Appliquer ce tri'}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </header>

              <div className="park-filter-grid">
                <label className="field">
                  <span>Recherche</span>
                  <div className="ticket-list-target-search park-filter-search">
                    <select
                      aria-label="Champ de recherche"
                      onChange={handleEquipmentFilterChange('searchField')}
                      value={filters.searchField}
                    >
                      <option value="NAME">Nom</option>
                      <option value="BRAND">Marque</option>
                      <option value="MODEL">Modele</option>
                      <option value="SERIAL_NUMBER">Numero de serie</option>
                      <option value="ASSIGNED_USER">Utilisateur assigne</option>
                    </select>
                    <div className="ticket-list-target-search-input">
                      <input
                        onChange={handleEquipmentFilterChange('search')}
                        placeholder="Rechercher"
                        value={filters.search}
                      />
                    </div>
                  </div>
                </label>

                <label className="field">
                  <span>Type</span>
                  <select
                    onChange={handleEquipmentFilterChange('typeId')}
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
                    onChange={handleEquipmentFilterChange('status')}
                    value={filters.status}
                  >
                    <option value="">Tous</option>
                    {CI_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {translateCiStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isLoading ? (
                <p className="referentials-empty-state">
                  Chargement du parc...
                </p>
              ) : sortedEquipment.length === 0 ? (
                <p className="referentials-empty-state">
                  Aucun equipement ne correspond aux filtres.
                </p>
              ) : (
                <>
                  <div className="ticket-table-scroll">
                    <table className="ticket-table park-equipment-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nom</th>
                          <th>Type</th>
                          <th>Statut</th>
                          <th>Marque</th>
                          <th>Modele</th>
                          <th>Numero de serie</th>
                          <th>Utilisateur Assigne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedEquipment.map((ci) => (
                          <EquipmentRow
                            ci={ci}
                            ciType={ciTypesById.get(ci.ciTypeId) ?? null}
                            key={ci.id}
                            page={equipmentPage}
                            user={
                              ci.assignedUserId
                                ? (usersById.get(ci.assignedUserId) ?? null)
                                : null
                            }
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <AppPagination
                    onPageChange={setEquipmentPage}
                    page={equipmentPage}
                    summary={`Page ${equipmentPage} sur ${totalEquipmentPages} - ${sortedEquipment.length} equipements`}
                    totalPages={totalEquipmentPages}
                  />
                </>
              )}
            </section>
          </>
        )}
      </section>
    </section>
  );
}

function EquipmentRow({
  ci,
  ciType,
  page,
  user,
}: {
  ci: ReferentialCi;
  ciType: ReferentialCiType | null;
  page: number;
  user: AdminUserSummary | null;
}) {
  return (
    <tr
      className="ticket-table-row park-equipment-row park-equipment-row--clickable"
      onClick={() =>
        navigateTo(withReturnPageQuery(`/parc/cis/${ci.id}`, page))
      }
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateTo(withReturnPageQuery(`/parc/cis/${ci.id}`, page));
        }
      }}
      tabIndex={0}
    >
      <td>
        <strong className="ticket-table-number">
          <span>{formatEquipmentIdentifier(ci)}</span>
        </strong>
      </td>
      <td>{ci.name}</td>
      <td>{ciType?.name ?? '-'}</td>
      <td>
        <span
          className={`ticket-status-badge ticket-status-badge--${ci.status.toLowerCase()}`}
        >
          <i className="ticket-status-badge-icon" />
          {translateCiStatus(ci.status)}
        </span>
      </td>
      <td>{ci.brand ?? '-'}</td>
      <td>{ci.model ?? '-'}</td>
      <td>{ci.serialNumber ?? '-'}</td>
      <td>{user ? formatUserName(user) : 'Non assigne'}</td>
    </tr>
  );
}
