import { ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type {
  ReferentialCatalogSnapshot,
  ReferentialCi,
  ReferentialCiType,
} from '../../domain/referentials/referential-catalog';
import { translateCiStatus } from '../../domain/i18n/ticketing-labels';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';
import { AppPagination } from '../components/app-pagination';
import {
  CI_STATUS_OPTIONS,
  EMPTY_CATALOG,
  INITIAL_FILTERS,
} from './park-page.constants';
import {
  filterEquipment,
  formatEquipmentIdentifier,
  formatUserName,
  handleFilterInput,
} from './park-page.helpers';
import type { EquipmentFilters } from './park-page.types';

const MY_EQUIPMENT_PER_PAGE = 15;

type EquipmentSortOption = 'CREATED_AT_ASC' | 'CREATED_AT_DESC';

const EQUIPMENT_SORT_OPTIONS = [
  {
    icon: ArrowDown,
    label: "Plus recents d'abord",
    value: 'CREATED_AT_DESC',
  },
  {
    icon: ArrowUp,
    label: "Plus anciens d'abord",
    value: 'CREATED_AT_ASC',
  },
] as const;

type MyEquipmentPageProps = {
  session: AuthSessionSnapshot;
};

function toTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildCurrentUserSummary(
  session: AuthSessionSnapshot,
): AdminUserSummary {
  return {
    accountStatus: 'ACTIVE',
    canManageAssets: Boolean(session.user.canManageAssets),
    canManageKnowledgeBase: Boolean(session.user.canManageKnowledgeBase),
    canValidateKnowledgeBase: Boolean(session.user.canValidateKnowledgeBase),
    displayName: [session.user.firstName, session.user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim(),
    email: session.user.email,
    firstName: session.user.firstName,
    groupId: null,
    groupIds: [],
    id: session.user.id,
    isActive: true,
    isVip: Boolean(session.user.isVip),
    lastName: session.user.lastName,
    role: session.user.role,
  };
}

export function MyEquipmentPage({ session }: MyEquipmentPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [filters, setFilters] = useState<EquipmentFilters>(INITIAL_FILTERS);
  const [equipmentPage, setEquipmentPage] = useState(1);
  const [equipmentSortBy, setEquipmentSortBy] =
    useState<EquipmentSortOption>('CREATED_AT_DESC');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const currentUser = useMemo(
    () => buildCurrentUserSummary(session),
    [session],
  );
  const usersById = useMemo(
    () => new Map([[session.user.id, currentUser]]),
    [currentUser, session.user.id],
  );
  const ciTypesById = useMemo(
    () => new Map(catalog.ciTypes.map((ciType) => [ciType.id, ciType])),
    [catalog.ciTypes],
  );
  const parkCiTypes = catalog.ciTypes;
  const assignedEquipment = useMemo(
    () => catalog.cis.filter((ci) => ci.assignedUserId === session.user.id),
    [catalog.cis, session.user.id],
  );
  const filteredEquipment = useMemo(
    () => filterEquipment(assignedEquipment, filters, usersById),
    [assignedEquipment, filters, usersById],
  );
  const sortedEquipment = useMemo(() => {
    return [...filteredEquipment].sort((left, right) => {
      const leftTimestamp = toTimestamp(left.createdAt);
      const rightTimestamp = toTimestamp(right.createdAt);

      if (equipmentSortBy === 'CREATED_AT_ASC') {
        return leftTimestamp - rightTimestamp;
      }

      return rightTimestamp - leftTimestamp;
    });
  }, [equipmentSortBy, filteredEquipment]);
  const totalEquipmentPages = Math.max(
    1,
    Math.ceil(sortedEquipment.length / MY_EQUIPMENT_PER_PAGE),
  );
  const paginatedEquipment = useMemo(() => {
    const startIndex = (equipmentPage - 1) * MY_EQUIPMENT_PER_PAGE;
    return sortedEquipment.slice(
      startIndex,
      startIndex + MY_EQUIPMENT_PER_PAGE,
    );
  }, [equipmentPage, sortedEquipment]);
  function handleEquipmentFilterChange(field: keyof EquipmentFilters) {
    return handleFilterInput(setFilters, field);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadEquipment(): Promise<void> {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextCatalog = await fetchReferentialCatalog(session.accessToken);

        if (isMounted) {
          setCatalog(nextCatalog);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Le chargement de vos equipements a echoue.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEquipment();

    return () => {
      isMounted = false;
    };
  }, [session.accessToken]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      const target = event.target as Node;

      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setIsSortMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    setEquipmentPage(1);
  }, [filters, equipmentSortBy]);

  useEffect(() => {
    if (equipmentPage > totalEquipmentPages) {
      setEquipmentPage(totalEquipmentPages);
    }
  }, [equipmentPage, totalEquipmentPages]);

  return (
    <section className="reports-page">
      {errorMessage ? (
        <p className="referentials-error">{errorMessage}</p>
      ) : null}

      <section className="park-layout">
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
                    <div className="ticket-sort-popover-label">Trier par</div>

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
            <p className="referentials-empty-state">Chargement du parc...</p>
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
                      <MyEquipmentRow
                        ci={ci}
                        ciType={ciTypesById.get(ci.ciTypeId) ?? null}
                        key={ci.id}
                        user={currentUser}
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
      </section>
    </section>
  );
}

function MyEquipmentRow({
  ci,
  ciType,
  user,
}: {
  ci: ReferentialCi;
  ciType: ReferentialCiType | null;
  user: AdminUserSummary;
}) {
  const displayIdentifier = formatEquipmentIdentifier(ci);
  const [identifierPrefix, identifierSuffix] = displayIdentifier.split('-');

  return (
    <tr className="ticket-table-row park-equipment-row">
      <td>
        <strong className="ticket-table-number">
          {identifierPrefix && identifierSuffix ? (
            <>
              <span>{identifierPrefix}-</span>
              <span>{identifierSuffix}</span>
            </>
          ) : (
            <span>{displayIdentifier}</span>
          )}
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
      <td>{formatUserName(user)}</td>
    </tr>
  );
}
