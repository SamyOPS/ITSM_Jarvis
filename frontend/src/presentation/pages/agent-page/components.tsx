import { ArrowLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  Dispatch,
  FormEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from 'react';
import type { UserRole } from '../../../domain/auth/user-role';
import {
  translateChannel,
  translateIncidentSeverity,
  translatePriority,
  translateRequestType,
  translateTicketStatus,
  translateTicketType,
} from '../../../domain/i18n/ticketing-labels';
import {
  INCIDENT_SEVERITIES,
  type IncidentSeverity,
} from '../../../domain/ticketing/incident-severity';
import type { TicketAttachmentSnapshot } from '../../../domain/ticketing/ticket-attachment';
import type { TicketCommentSnapshot } from '../../../domain/ticketing/ticket-comment';
import type { TicketDetailSnapshot } from '../../../domain/ticketing/ticket-detail';
import type {
  ReferentialCatalogSnapshot,
  ReferentialCi,
  ReferentialGroup,
} from '../../../domain/referentials/referential-catalog';
import type { AdminUserSummary } from '../../../domain/auth/admin-user-summary';
import type { TicketSummarySnapshot } from '../../../domain/ticketing/ticket-summary';
import type {
  AssignmentDraftState,
  IncidentLookupSearchField,
  TicketSearchFiltersState,
  TicketEditDraftState,
  TicketStatus,
} from './types';

type SortOption = {
  icon: LucideIcon;
  label: string;
  value: 'CREATED_AT_ASC' | 'CREATED_AT_DESC' | 'OPERATIONAL_PRIORITY';
};

type TicketDetailTopbarProps = {
  canDeleteTickets: boolean;
  canManageTicket: boolean;
  detailBackPath: string;
  handleDeleteTicket: () => Promise<void>;
  handleStatusSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isDeletingTicket: boolean;
  isEditingInfo: boolean;
  isSubmittingStatus: boolean;
  navigateTo: (path: string) => void;
  selectedTicketDetail: TicketDetailSnapshot | null;
  setStatusDraft: Dispatch<SetStateAction<TicketStatus>>;
  statusDraft: TicketStatus;
};

type TicketInformationCardProps = {
  assignableTechnicians: AdminUserSummary[];
  assignmentDraft: AssignmentDraftState;
  canEditTicket: boolean;
  canManageTicket: boolean;
  catalog: ReferentialCatalogSnapshot;
  categoriesById: Map<string, { name: string }>;
  channelsById: Map<string, { name: string }>;
  cisById: Map<string, { name: string }>;
  detailActionErrorMessage: string | null;
  detailActionSuccessMessage: string | null;
  formatKnownUserName: (
    user: AdminUserSummary | undefined,
    fallback: string,
  ) => string;
  groupsById: Map<string, { name: string }>;
  handleAssignmentFieldChange: (
    field: keyof AssignmentDraftState,
    value: string,
  ) => void;
  handleCancelEditInfo: () => void;
  handleSaveInfoEdits: () => Promise<void>;
  handleTicketEditFieldChange: <Field extends keyof TicketEditDraftState>(
    field: Field,
    value: TicketEditDraftState[Field],
  ) => void;
  isEditingInfo: boolean;
  isSavingInfo: boolean;
  selectedTicketDetail: TicketDetailSnapshot;
  setIsEditingInfo: Dispatch<SetStateAction<boolean>>;
  ticketEditDraft: TicketEditDraftState;
  userDirectory: AdminUserSummary[];
  usersById: Map<string, AdminUserSummary>;
};

type TicketDetailHeroProps = {
  canEditTicket: boolean;
  formatTicketDate: (value: string) => string;
  handleTicketEditFieldChange: <Field extends keyof TicketEditDraftState>(
    field: Field,
    value: TicketEditDraftState[Field],
  ) => void;
  isEditingInfo: boolean;
  prioritiesById: Map<
    string,
    { level: number; name: string; resolutionHours?: number | null }
  >;
  selectedTicketDetail: TicketDetailSnapshot;
  ticketEditDraft: TicketEditDraftState;
};

type TicketDescriptionCardProps = {
  canEditTicket: boolean;
  handleTicketEditFieldChange: <Field extends keyof TicketEditDraftState>(
    field: Field,
    value: TicketEditDraftState[Field],
  ) => void;
  isEditingInfo: boolean;
  selectedTicketDetail: TicketDetailSnapshot;
  ticketEditDraft: TicketEditDraftState;
};

type TicketListPanelProps = {
  catalog: ReferentialCatalogSnapshot;
  categoriesById: Map<string, { name: string }>;
  formatKnownUserName: (
    user: AdminUserSummary | undefined,
    fallback: string,
  ) => string;
  formatTicketDate: (value: string) => string;
  handleSearchFilterChange: (
    field: keyof TicketSearchFiltersState,
    value: string,
  ) => void;
  isLoadingTickets: boolean;
  isSortMenuOpen: boolean;
  loadTicketsErrorMessage: string | null;
  onOpenTicket: (ticketId: string) => void;
  paginatedTickets: TicketSummarySnapshot[];
  prioritiesById: Map<
    string,
    { level: number; name: string; resolutionHours?: number | null }
  >;
  renderOverdueMarker: (ticket: TicketSummarySnapshot) => ReactNode;
  renderPriorityBadge: (
    ticket: TicketSummarySnapshot,
    prioritiesById: Map<string, { name: string }>,
  ) => ReactNode;
  renderStatusBadge: (status: string) => ReactNode;
  renderTicketDisplayNumber: (ticket: TicketSummarySnapshot) => ReactNode;
  searchedTicketsCount: number;
  searchFilters: TicketSearchFiltersState;
  setIsSortMenuOpen: Dispatch<SetStateAction<boolean>>;
  setTicketPage: Dispatch<SetStateAction<number>>;
  sortMenuRef: RefObject<HTMLDivElement | null>;
  sortOptions: SortOption[];
  ticketListDescription: string;
  ticketListEmptyMessage: string;
  ticketListTitle: string;
  ticketPage: number;
  totalTicketPages: number;
  usersById: Map<string, AdminUserSummary>;
};

export function TicketListPanel({
  catalog,
  categoriesById,
  formatKnownUserName,
  formatTicketDate,
  handleSearchFilterChange,
  isLoadingTickets,
  isSortMenuOpen,
  loadTicketsErrorMessage,
  onOpenTicket,
  paginatedTickets,
  prioritiesById,
  renderOverdueMarker,
  renderPriorityBadge,
  renderStatusBadge,
  renderTicketDisplayNumber,
  searchedTicketsCount,
  searchFilters,
  setIsSortMenuOpen,
  setTicketPage,
  sortMenuRef,
  sortOptions,
  ticketListDescription,
  ticketListEmptyMessage,
  ticketListTitle,
  ticketPage,
  totalTicketPages,
  usersById,
}: TicketListPanelProps) {
  return (
    <section className="ticket-list-card">
      <div className="ticket-list-header">
        <div>
          <h3>{ticketListTitle}</h3>
          <p>{ticketListDescription}</p>
        </div>

        <div className="ticket-list-toolbar">
          <div className="ticket-list-count" aria-live="polite">
            <strong>{searchedTicketsCount}</strong>
            <span>tickets</span>
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
              onClick={() => setIsSortMenuOpen((currentState) => !currentState)}
              type="button"
            >
              <span>Trier par</span>
              <SlidersHorizontal size={18} strokeWidth={2} />
            </button>

            {isSortMenuOpen ? (
              <div className="ticket-sort-popover" role="menu">
                <div className="ticket-sort-popover-label">Trier par</div>

                <div className="ticket-sort-option-list">
                  {sortOptions.map((option) => {
                    const Icon = option.icon;

                    return (
                      <button
                        className={
                          searchFilters.sortBy === option.value
                            ? 'ticket-sort-option is-active'
                            : 'ticket-sort-option'
                        }
                        key={option.value}
                        onClick={() => {
                          handleSearchFilterChange('sortBy', option.value);
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
                            {searchFilters.sortBy === option.value
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
      </div>

      <div className="ticket-list-filters">
        <label className="field ticket-filter-search">
          <span>Recherche</span>

          <div className="ticket-list-target-search">
            <select
              aria-label="Categorie de recherche"
              onChange={(event) =>
                handleSearchFilterChange('searchField', event.target.value)
              }
              value={searchFilters.searchField}
            >
              <option value="TITLE">Titre</option>
              <option value="REQUESTER">Demandeur</option>
              <option value="TECHNICIAN">Assigné à</option>
            </select>

            <div className="ticket-list-target-search-input">
              <input
                onChange={(event) =>
                  handleSearchFilterChange('q', event.target.value)
                }
                placeholder="Rechercher"
                value={searchFilters.q}
              />
            </div>
          </div>
        </label>

        <label className="field">
          <span>Type</span>

          <select
            onChange={(event) =>
              handleSearchFilterChange('type', event.target.value)
            }
            value={searchFilters.type}
          >
            <option value="">Tous</option>
            <option value="INCIDENT">Incident</option>
            <option value="REQUEST">Demande</option>
          </select>
        </label>

        <label className="field">
          <span>Statut</span>

          <select
            onChange={(event) =>
              handleSearchFilterChange('status', event.target.value)
            }
            value={searchFilters.status}
          >
            <option value="">Tous</option>
            <option value="OPEN">Nouveau</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="PENDING">En attente</option>
            <option value="RESOLVED">Resolu</option>
            <option value="CLOSED">Clos</option>
          </select>
        </label>

        <label className="field">
          <span>Categorie</span>

          <select
            onChange={(event) =>
              handleSearchFilterChange('categoryId', event.target.value)
            }
            value={searchFilters.categoryId}
          >
            <option value="">Toutes</option>

            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Priorite</span>

          <select
            onChange={(event) =>
              handleSearchFilterChange('priorityId', event.target.value)
            }
            value={searchFilters.priorityId}
          >
            <option value="">Toutes</option>

            {catalog.priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {translatePriority(priority.name)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoadingTickets ? (
        <p className="ticket-form-message">Chargement des tickets...</p>
      ) : loadTicketsErrorMessage ? (
        <p className="ticket-form-error">{loadTicketsErrorMessage}</p>
      ) : searchedTicketsCount === 0 ? (
        <p className="ticket-form-message">{ticketListEmptyMessage}</p>
      ) : (
        <>
          <div className="ticket-results">
            <div className="ticket-table-scroll">
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Titre</th>
                    <th>Statut</th>
                    <th>Date de création</th>
                    <th>Priorité</th>
                    <th>Demandeur</th>
                    <th>Assigné à</th>
                    <th>Catégorie</th>
                    <th>Temps de résolution</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map((ticket) => (
                    <tr
                      className="ticket-table-row"
                      key={ticket.id}
                      onClick={() => onOpenTicket(ticket.id)}
                    >
                      <td>
                        <div className="ticket-table-primary">
                          {renderTicketDisplayNumber(ticket)}
                        </div>
                      </td>
                      <td>
                        <div className="ticket-table-primary">
                          <div className="ticket-table-title-row">
                            <strong>{ticket.title}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{renderStatusBadge(ticket.status)}</td>
                      <td>{formatTicketDate(ticket.createdAt)}</td>
                      <td>{renderPriorityBadge(ticket, prioritiesById)}</td>
                      <td>
                        {formatKnownUserName(
                          usersById.get(
                            ticket.requestedForUserId ?? ticket.createdByUserId,
                          ),
                          ticket.requestedForUserId ?? ticket.createdByUserId,
                        )}
                      </td>
                      <td>
                        {ticket.assignedToUserId
                          ? formatKnownUserName(
                              usersById.get(ticket.assignedToUserId),
                              ticket.assignedToUserId,
                            )
                          : 'Non assigné'}
                      </td>
                      <td>
                        {categoriesById.get(ticket.categoryId)?.name ??
                          'Non définie'}
                      </td>
                      <td>
                        <div className="ticket-resolution-cell">
                          <span className="ticket-resolution-value">
                            {prioritiesById.get(ticket.priorityId)
                              ?.resolutionHours !== null &&
                            prioritiesById.get(ticket.priorityId)
                              ?.resolutionHours !== undefined
                              ? `${prioritiesById.get(ticket.priorityId)!.resolutionHours} h`
                              : '?'}
                          </span>
                          {renderOverdueMarker(ticket)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ticket-pagination">
            <p className="ticket-form-helper">
              Page {ticketPage} sur {totalTicketPages} - {searchedTicketsCount}{' '}
              tickets
            </p>

            <div className="ticket-pagination-actions">
              <button
                className="secondary-button"
                disabled={ticketPage <= 1}
                onClick={() =>
                  setTicketPage((currentPage) => currentPage - 1)
                }
                type="button"
              >
                Precedent
              </button>

              <div className="ticket-pagination-pages">
                {Array.from({ length: totalTicketPages }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <button
                      className={
                        pageNumber === ticketPage
                          ? 'ticket-workspace-view-button is-active'
                          : 'ticket-workspace-view-button'
                      }
                      key={pageNumber}
                      onClick={() => setTicketPage(pageNumber)}
                      type="button"
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button
                className="secondary-button"
                disabled={ticketPage >= totalTicketPages}
                onClick={() =>
                  setTicketPage((currentPage) => currentPage + 1)
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
  );
}

export function TicketDetailTopbar({
  canDeleteTickets,
  canManageTicket,
  detailBackPath,
  handleDeleteTicket,
  handleStatusSubmit,
  isDeletingTicket,
  isEditingInfo,
  isSubmittingStatus,
  navigateTo,
  selectedTicketDetail,
  setStatusDraft,
  statusDraft,
}: TicketDetailTopbarProps) {
  return (
    <div className="tdp-topbar">
      <button
        className="tdp-back-btn"
        onClick={() => navigateTo(detailBackPath)}
        type="button"
      >
        <ArrowLeft size={15} />
        Retour a la liste
      </button>

      <div className="tdp-topbar-right">
        {selectedTicketDetail ? (
          <span className="tdp-ticket-number">
            {selectedTicketDetail.ticket.number}
          </span>
        ) : null}

        {selectedTicketDetail && canManageTicket ? (
          <form className="tdp-status-form" onSubmit={handleStatusSubmit}>
            <select
              onChange={(event) =>
                setStatusDraft((event.target.value as TicketStatus) ?? 'OPEN')
              }
              value={statusDraft}
            >
              <option value="OPEN">Nouveau</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="PENDING">En attente</option>
              <option value="RESOLVED">Resolu</option>
              <option value="CLOSED">Clos</option>
            </select>

            <button
              className="tdp-status-apply-btn"
              disabled={isSubmittingStatus || isEditingInfo}
            >
              {isSubmittingStatus ? '...' : 'Appliquer'}
            </button>
          </form>
        ) : null}

        {selectedTicketDetail && canDeleteTickets ? (
          <button
            className="danger-button"
            disabled={isDeletingTicket}
            onClick={() => void handleDeleteTicket()}
            type="button"
          >
            {isDeletingTicket ? 'Suppression...' : 'Supprimer'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TicketDetailHero({
  canEditTicket,
  formatTicketDate,
  handleTicketEditFieldChange,
  isEditingInfo,
  prioritiesById,
  selectedTicketDetail,
  ticketEditDraft,
}: TicketDetailHeroProps) {
  return (
    <div className="tdp-hero">
      {isEditingInfo && canEditTicket ? (
        <input
          className="tdp-title-edit"
          onChange={(event) =>
            handleTicketEditFieldChange('title', event.target.value)
          }
          value={ticketEditDraft.title}
        />
      ) : (
        <h2 className="tdp-title">{selectedTicketDetail.ticket.title}</h2>
      )}

      <div className="tdp-badges">
        <span
          className={`tdp-badge tdp-badge--status tdp-badge--${selectedTicketDetail.ticket.status.toLowerCase().replace(/_/g, '-')}`}
        >
          {translateTicketStatus(selectedTicketDetail.ticket.status)}
        </span>

        <span className="tdp-badge tdp-badge--type">
          {translateTicketType(selectedTicketDetail.ticket.type)}
        </span>

        <span className="tdp-badge tdp-badge--priority">
          {selectedTicketDetail.priorityName
            ? translatePriority(selectedTicketDetail.priorityName)
            : prioritiesById.get(selectedTicketDetail.ticket.priorityId)
              ? translatePriority(
                  prioritiesById.get(selectedTicketDetail.ticket.priorityId)!.name,
                )
              : 'Priorite non definie'}
        </span>

        <span className="tdp-badge tdp-badge--date">
          Cree le {formatTicketDate(selectedTicketDetail.ticket.createdAt)}
        </span>
      </div>
    </div>
  );
}

export function TicketDescriptionCard({
  canEditTicket,
  handleTicketEditFieldChange,
  isEditingInfo,
  selectedTicketDetail,
  ticketEditDraft,
}: TicketDescriptionCardProps) {
  return (
    <div className="tdp-card">
      <div className="tdp-card-header">
        <h3 className="tdp-card-title">Description</h3>
      </div>

      {isEditingInfo && canEditTicket ? (
        <textarea
          className="tdp-description-edit"
          onChange={(event) =>
            handleTicketEditFieldChange('description', event.target.value)
          }
          rows={4}
          value={ticketEditDraft.description}
        />
      ) : (
        <p className="tdp-description">
          {selectedTicketDetail.ticket.description}
        </p>
      )}
    </div>
  );
}

export function TicketInformationCard({
  assignableTechnicians,
  assignmentDraft,
  canEditTicket,
  canManageTicket,
  catalog,
  categoriesById,
  channelsById,
  cisById,
  detailActionErrorMessage,
  detailActionSuccessMessage,
  formatKnownUserName,
  groupsById,
  handleAssignmentFieldChange,
  handleCancelEditInfo,
  handleSaveInfoEdits,
  handleTicketEditFieldChange,
  isEditingInfo,
  isSavingInfo,
  selectedTicketDetail,
  setIsEditingInfo,
  ticketEditDraft,
  userDirectory,
  usersById,
}: TicketInformationCardProps) {
  return (
    <div className="tdp-card">
      <div className="tdp-card-header">
        <h3 className="tdp-card-title">Informations</h3>

        {!isEditingInfo && (canEditTicket || canManageTicket) ? (
          <button
            className="tdp-edit-toggle-btn"
            onClick={() => setIsEditingInfo(true)}
            type="button"
          >
            Modifier
          </button>
        ) : isEditingInfo ? (
          <div className="tdp-edit-header-actions">
            <button
              className="tdp-save-btn"
              disabled={isSavingInfo}
              onClick={() => void handleSaveInfoEdits()}
              type="button"
            >
              {isSavingInfo ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>

            <button
              className="tdp-cancel-btn"
              disabled={isSavingInfo}
              onClick={handleCancelEditInfo}
              type="button"
            >
              Annuler
            </button>
          </div>
        ) : null}
      </div>

      <div className="tdp-info-grid">
        <div className="tdp-info-item">
          <span>Categorie</span>

          {isEditingInfo && canEditTicket ? (
            <select
              onChange={(event) =>
                handleTicketEditFieldChange('categoryId', event.target.value)
              }
              value={ticketEditDraft.categoryId}
            >
              <option value="">Choisir une categorie</option>

              {catalog.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>
              {categoriesById.get(selectedTicketDetail.ticket.categoryId)
                ?.name ?? 'Non definie'}
            </strong>
          )}
        </div>

        <div className="tdp-info-item">
          <span>Canal</span>

          {isEditingInfo && canEditTicket ? (
            <select
              onChange={(event) =>
                handleTicketEditFieldChange('channelId', event.target.value)
              }
              value={ticketEditDraft.channelId}
            >
              <option value="">Non renseigne</option>

              {catalog.channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {translateChannel(channel.name)}
                </option>
              ))}
            </select>
          ) : (
            <strong>
              {selectedTicketDetail.ticket.channelId
                ? translateChannel(
                    channelsById.get(selectedTicketDetail.ticket.channelId)
                      ?.name ?? selectedTicketDetail.ticket.channelId,
                  )
                : 'Non renseigne'}
            </strong>
          )}
        </div>

        <div className="tdp-info-item">
          <span>Equipement concerne</span>

          {isEditingInfo && canEditTicket ? (
            <select
              onChange={(event) =>
                handleTicketEditFieldChange('ciId', event.target.value)
              }
              value={ticketEditDraft.ciId}
            >
              <option value="">Non renseigne</option>

              {catalog.cis.map((ci) => (
                <option key={ci.id} value={ci.id}>
                  {ci.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>
              {selectedTicketDetail.ticket.ciId
                ? cisById.get(selectedTicketDetail.ticket.ciId)?.name ??
                  selectedTicketDetail.ticket.ciId
                : 'Non renseigne'}
            </strong>
          )}
        </div>

        <div className="tdp-info-item">
          <span>{"Groupe d'affectation"}</span>

          {isEditingInfo && canManageTicket ? (
            <select
              onChange={(event) =>
                handleAssignmentFieldChange(
                  'assignmentGroupId',
                  event.target.value,
                )
              }
              value={assignmentDraft.assignmentGroupId}
            >
              <option value="">Aucun groupe</option>

              {catalog.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>
              {selectedTicketDetail.ticket.assignmentGroupId
                ? groupsById.get(selectedTicketDetail.ticket.assignmentGroupId)
                    ?.name ?? selectedTicketDetail.ticket.assignmentGroupId
                : 'Non affecte'}
            </strong>
          )}
        </div>

        <div className="tdp-info-item">
          <span>Agent assigne</span>

          {isEditingInfo && canManageTicket ? (
            <select
              onChange={(event) =>
                handleAssignmentFieldChange('assignedToUserId', event.target.value)
              }
              value={assignmentDraft.assignedToUserId}
            >
              <option value="">Aucun technicien</option>

              {assignableTechnicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {formatKnownUserName(technician, technician.id)}
                </option>
              ))}
            </select>
          ) : (
            <strong>
              {selectedTicketDetail.ticket.assignedToUserId
                ? formatKnownUserName(
                    usersById.get(selectedTicketDetail.ticket.assignedToUserId),
                    selectedTicketDetail.ticket.assignedToUserId,
                  )
                : 'Non assigne'}
            </strong>
          )}
        </div>

        {selectedTicketDetail.ticket.requestedForUserId ||
        (isEditingInfo && canEditTicket) ? (
          <div className="tdp-info-item">
            <span>Demandeur</span>

            {isEditingInfo && canEditTicket ? (
              <select
                onChange={(event) =>
                  handleTicketEditFieldChange(
                    'requestedForUserId',
                    event.target.value,
                  )
                }
                value={ticketEditDraft.requestedForUserId}
              >
                <option value="">Non renseigne</option>

                {userDirectory
                  .filter((user) => user.isActive)
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {formatKnownUserName(user, user.id)}
                    </option>
                  ))}
              </select>
            ) : (
              <strong>
                {formatKnownUserName(
                  usersById.get(selectedTicketDetail.ticket.requestedForUserId!),
                  selectedTicketDetail.ticket.requestedForUserId!,
                )}
              </strong>
            )}
          </div>
        ) : null}

        {selectedTicketDetail.incident ? (
          <>
            <div className="tdp-info-item">
              <span>Impact</span>
              {isEditingInfo && canEditTicket ? (
                <select
                  onChange={(event) =>
                    handleTicketEditFieldChange(
                      'impact',
                      event.target.value as IncidentSeverity,
                    )
                  }
                  value={ticketEditDraft.impact}
                >
                  {INCIDENT_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {translateIncidentSeverity(severity)}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>
                  {translateIncidentSeverity(selectedTicketDetail.incident.impact)}
                </strong>
              )}
            </div>

            <div className="tdp-info-item">
              <span>Urgence</span>
              {isEditingInfo && canEditTicket ? (
                <select
                  onChange={(event) =>
                    handleTicketEditFieldChange(
                      'urgency',
                      event.target.value as IncidentSeverity,
                    )
                  }
                  value={ticketEditDraft.urgency}
                >
                  {INCIDENT_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {translateIncidentSeverity(severity)}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>
                  {translateIncidentSeverity(selectedTicketDetail.incident.urgency)}
                </strong>
              )}
            </div>

            {isEditingInfo && canEditTicket ? (
              <div className="tdp-info-item tdp-info-item--full">
                <span>Cause racine</span>
                <textarea
                  onChange={(event) =>
                    handleTicketEditFieldChange('rootCause', event.target.value)
                  }
                  placeholder="Cause racine"
                  rows={3}
                  value={ticketEditDraft.rootCause}
                />
              </div>
            ) : selectedTicketDetail.incident.rootCause ? (
              <div className="tdp-info-item tdp-info-item--full">
                <span>Cause racine</span>
                <strong>{selectedTicketDetail.incident.rootCause}</strong>
              </div>
            ) : null}

            {isEditingInfo && canEditTicket ? (
              <div className="tdp-info-item tdp-info-item--full">
                <span>Contournement</span>
                <textarea
                  onChange={(event) =>
                    handleTicketEditFieldChange('workaround', event.target.value)
                  }
                  placeholder="Contournement"
                  rows={3}
                  value={ticketEditDraft.workaround}
                />
              </div>
            ) : selectedTicketDetail.incident.workaround ? (
              <div className="tdp-info-item tdp-info-item--full">
                <span>Contournement</span>
                <strong>{selectedTicketDetail.incident.workaround}</strong>
              </div>
            ) : null}
          </>
        ) : null}

        {selectedTicketDetail.request ? (
          <>
            <div className="tdp-info-item">
              <span>Type de demande</span>
              <strong>
                {translateRequestType(selectedTicketDetail.request.requestType)}
              </strong>
            </div>

            <div className="tdp-info-item">
              <span>Approbation</span>
              <strong>
                {selectedTicketDetail.request.approvalStatus ?? 'Non definie'}
              </strong>
            </div>
          </>
        ) : null}
      </div>

      {detailActionErrorMessage ? (
        <p className="tdp-form-error">{detailActionErrorMessage}</p>
      ) : null}

      {detailActionSuccessMessage ? (
        <p className="tdp-form-success">{detailActionSuccessMessage}</p>
      ) : null}
    </div>
  );
}

type TicketConversationPanelProps = {
  attachmentDraft: { file: File | null };
  attachmentErrorMessage: string | null;
  attachmentInputKey: number;
  attachmentSuccessMessage: string | null;
  canCreateInternalComments: boolean;
  canDeleteTicketComment: (
    role: UserRole,
    currentUserId: string,
    authorUserId: string,
  ) => boolean;
  commentDraft: { body: string; isInternal: boolean };
  commentErrorMessage: string | null;
  commentSuccessMessage: string | null;
  deletingAttachmentId: string | null;
  deletingCommentId: string | null;
  formatFileSize: (sizeBytes: number) => string;
  formatKnownUserName: (
    user: AdminUserSummary | undefined,
    fallback: string,
  ) => string;
  formatTicketDate: (value: string) => string;
  handleAttachmentSelection: (file: File | null) => void;
  handleAttachmentSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  handleCommentBodyChange: (value: string) => void;
  handleCommentInternalToggle: (isInternal: boolean) => void;
  handleCommentSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  handleDeleteAttachment: (attachment: TicketAttachmentSnapshot) => void | Promise<void>;
  handleDeleteComment: (commentId: string) => void | Promise<void>;
  handleDownloadAttachment: (attachment: TicketAttachmentSnapshot) => void | Promise<void>;
  isLoadingAttachments: boolean;
  isLoadingComments: boolean;
  isSubmittingAttachment: boolean;
  isSubmittingComment: boolean;
  loadAttachmentsErrorMessage: string | null;
  loadCommentsErrorMessage: string | null;
  selectedTicketAttachments: TicketAttachmentSnapshot[];
  selectedTicketComments: TicketCommentSnapshot[];
  sessionUserId: string;
  sessionUserRole: UserRole;
  usersById: Map<string, AdminUserSummary>;
};

export function TicketConversationPanel({
  attachmentDraft,
  attachmentErrorMessage,
  attachmentInputKey,
  attachmentSuccessMessage,
  canCreateInternalComments,
  canDeleteTicketComment,
  commentDraft,
  commentErrorMessage,
  commentSuccessMessage,
  deletingAttachmentId,
  deletingCommentId,
  formatFileSize,
  formatKnownUserName,
  formatTicketDate,
  handleAttachmentSelection,
  handleAttachmentSubmit,
  handleCommentBodyChange,
  handleCommentInternalToggle,
  handleCommentSubmit,
  handleDeleteAttachment,
  handleDeleteComment,
  handleDownloadAttachment,
  isLoadingAttachments,
  isLoadingComments,
  isSubmittingAttachment,
  isSubmittingComment,
  loadAttachmentsErrorMessage,
  loadCommentsErrorMessage,
  selectedTicketAttachments,
  selectedTicketComments,
  sessionUserId,
  sessionUserRole,
  usersById,
}: TicketConversationPanelProps) {
  return (
    <div className="tdp-card">
      <div className="tdp-card-header">
        <h3 className="tdp-card-title">Conversation</h3>
        <span className="tdp-tab-count">{selectedTicketComments.length}</span>
      </div>

      {isLoadingComments ? (
        <p className="tdp-state">Chargement des commentaires...</p>
      ) : loadCommentsErrorMessage ? (
        <p className="tdp-state tdp-state--error">
          {loadCommentsErrorMessage}
        </p>
      ) : selectedTicketComments.length === 0 ? (
        <p className="tdp-empty">Aucun commentaire pour ce ticket.</p>
      ) : (
        <div className="tdp-comment-thread">
          {selectedTicketComments.map((comment) => {
            const canDeleteCommentForCurrentUser = canDeleteTicketComment(
              sessionUserRole,
              sessionUserId,
              comment.authorUserId,
            );
            const initial =
              formatKnownUserName(
                usersById.get(comment.authorUserId),
                comment.authorUserId,
              )
                .charAt(0)
                .toUpperCase() || '?';

            return (
              <div
                className={
                  comment.isInternal
                    ? 'tdp-comment tdp-comment--internal'
                    : 'tdp-comment'
                }
                key={comment.id}
              >
                <div className="tdp-comment-avatar">{initial}</div>

                <div className="tdp-comment-body">
                  <div className="tdp-comment-header">
                    <strong>
                      {formatKnownUserName(
                        usersById.get(comment.authorUserId),
                        comment.authorUserId,
                      )}
                    </strong>

                    <span>{formatTicketDate(comment.createdAt)}</span>

                    <span
                      className={
                        comment.isInternal
                          ? 'tdp-comment-badge tdp-comment-badge--internal'
                          : 'tdp-comment-badge'
                      }
                    >
                      {comment.isInternal ? 'Interne' : 'Public'}
                    </span>

                    {canDeleteCommentForCurrentUser ? (
                      <button
                        className="tdp-delete-btn"
                        disabled={deletingCommentId === comment.id}
                        onClick={() => void handleDeleteComment(comment.id)}
                        type="button"
                      >
                        {deletingCommentId === comment.id
                          ? 'Suppression...'
                          : 'Supprimer'}
                      </button>
                    ) : null}
                  </div>

                  <p className="tdp-comment-text">{comment.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTicketAttachments.length > 0 ? (
        <div className="tdp-attachment-section">
          <p className="tdp-subsection-label">
            Pièces jointes ({selectedTicketAttachments.length})
          </p>

          {isLoadingAttachments ? (
            <p className="tdp-state">Chargement des pièces jointes...</p>
          ) : loadAttachmentsErrorMessage ? (
            <p className="tdp-state tdp-state--error">
              {loadAttachmentsErrorMessage}
            </p>
          ) : (
            <div className="tdp-attachment-list">
              {selectedTicketAttachments.map((attachment) => (
                <div className="tdp-attachment-item" key={attachment.id}>
                  <div className="tdp-attachment-info">
                    <strong>{attachment.fileName}</strong>

                    <span>
                      Ajouté le {formatTicketDate(attachment.createdAt)} ·{' '}
                      {formatFileSize(attachment.sizeBytes)}
                    </span>
                  </div>

                  <div className="tdp-attachment-actions">
                    <button
                      className="secondary-button"
                      onClick={() => void handleDownloadAttachment(attachment)}
                      type="button"
                    >
                      Télécharger
                    </button>

                    <button
                      className="tdp-delete-btn"
                      disabled={deletingAttachmentId === attachment.id}
                      onClick={() => void handleDeleteAttachment(attachment)}
                      type="button"
                    >
                      {deletingAttachmentId === attachment.id
                        ? 'Suppression...'
                        : 'Supprimer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <hr className="tdp-divider" />
      <div className="tdp-reply-area">
        <form
          className="tdp-reply-comment-form"
          onSubmit={(event) => void handleCommentSubmit(event)}
        >
          <label className="field">
            <span>Commentaire</span>

            <textarea
              className="tdp-reply-textarea"
              onChange={(event) => handleCommentBodyChange(event.target.value)}
              placeholder="Ajoute une note utile au traitement du ticket."
              rows={4}
              value={commentDraft.body}
            />
          </label>

          <div className="tdp-reply-footer">
            {canCreateInternalComments ? (
              <label className="tdp-toggle">
                <input
                  checked={commentDraft.isInternal}
                  onChange={(event) =>
                    handleCommentInternalToggle(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>Note interne</span>
              </label>
            ) : (
              <span className="tdp-form-hint">
                Les notes internes sont réservées aux agents et admins.
              </span>
            )}

            <button
              className="secondary-button"
              disabled={isSubmittingComment}
            >
              {isSubmittingComment ? 'Envoi...' : 'Publier'}
            </button>
          </div>

          {commentErrorMessage ? (
            <p className="tdp-form-error">{commentErrorMessage}</p>
          ) : null}

          {commentSuccessMessage ? (
            <p className="tdp-form-success">{commentSuccessMessage}</p>
          ) : null}
        </form>

        <form
          className="tdp-reply-attachment-form"
          onSubmit={(event) => void handleAttachmentSubmit(event)}
        >
          <div className="field">
            <span>Pièces jointes</span>

            <div className="ticket-upload-zone tdp-upload-zone">
              <div className="ticket-upload-actions">
                <label className="ticket-upload-button">
                  Choisir un fichier
                  <input
                    accept="*/*"
                    key={attachmentInputKey}
                    onChange={(event) =>
                      handleAttachmentSelection(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                </label>

                <span className="ticket-upload-note">
                  {attachmentDraft.file
                    ? `${attachmentDraft.file.name} (${formatFileSize(attachmentDraft.file.size)})`
                    : 'Aucun fichier sélectionné'}
                </span>
              </div>

              <div className="ticket-upload-note ticket-upload-note--stacked">
                <span>Formats acceptés : PDF, PNG, JPG, DOCX.</span>
                <span>2 Mo max par fichier.</span>
              </div>
            </div>
          </div>

          <div className="tdp-reply-footer tdp-reply-footer--end">
            <button
              className="secondary-button"
              disabled={isSubmittingAttachment}
            >
              {isSubmittingAttachment ? 'Envoi...' : 'Joindre'}
            </button>
          </div>

          {attachmentErrorMessage ? (
            <p className="tdp-form-error">{attachmentErrorMessage}</p>
          ) : null}

          {attachmentSuccessMessage ? (
            <p className="tdp-form-success">{attachmentSuccessMessage}</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

type IncidentLookupDialogProps = {
  ciTypesById: Map<string, { name: string }>;
  closeIncidentLookup: () => void;
  formatKnownUserName: (
    user: AdminUserSummary | undefined,
    fallback: string,
  ) => string;
  groupsById: Map<string, { name: string }>;
  handleIncidentEquipmentLookupSelect: (ci: ReferentialCi) => void;
  handleIncidentGroupLookupSelect: (group: ReferentialGroup) => void;
  handleIncidentLookupSelect: (user: AdminUserSummary) => void;
  incidentLookupKind: 'ASSIGNEE' | 'ASSIGNMENT_GROUP' | 'INCIDENT_EQUIPMENT' | 'REQUEST_EQUIPMENT' | 'REQUESTER';
  incidentLookupPage: number;
  incidentLookupResultCount: number;
  incidentLookupSearch: string;
  incidentLookupSearchField: IncidentLookupSearchField;
  incidentLookupTotalPages: number;
  paginatedIncidentLookupEquipment: ReferentialCi[];
  paginatedIncidentLookupGroups: ReferentialGroup[];
  paginatedIncidentLookupUsers: AdminUserSummary[];
  selectedIncidentLookupEquipmentId: string;
  selectedIncidentLookupGroupId: string;
  selectedIncidentLookupUserId: string;
  setIncidentLookupPage: React.Dispatch<React.SetStateAction<number>>;
  setIncidentLookupSearch: React.Dispatch<React.SetStateAction<string>>;
  setIncidentLookupSearchField: React.Dispatch<
    React.SetStateAction<IncidentLookupSearchField>
  >;
};

export function IncidentLookupDialog({
  ciTypesById,
  closeIncidentLookup,
  formatKnownUserName,
  groupsById,
  handleIncidentEquipmentLookupSelect,
  handleIncidentGroupLookupSelect,
  handleIncidentLookupSelect,
  incidentLookupKind,
  incidentLookupPage,
  incidentLookupResultCount,
  incidentLookupSearch,
  incidentLookupSearchField,
  incidentLookupTotalPages,
  paginatedIncidentLookupEquipment,
  paginatedIncidentLookupGroups,
  paginatedIncidentLookupUsers,
  selectedIncidentLookupEquipmentId,
  selectedIncidentLookupGroupId,
  selectedIncidentLookupUserId,
  setIncidentLookupPage,
  setIncidentLookupSearch,
  setIncidentLookupSearchField,
}: IncidentLookupDialogProps) {
  return (
    <div aria-modal="true" className="incident-lookup-overlay" role="dialog">
      <section className="incident-lookup-dialog">
        <header className="incident-lookup-header">
          <div>
            <h3>
              {incidentLookupKind === 'ASSIGNMENT_GROUP'
                ? 'Selectionner un groupe'
                : incidentLookupKind === 'INCIDENT_EQUIPMENT' ||
                    incidentLookupKind === 'REQUEST_EQUIPMENT'
                  ? 'Selectionner un equipement'
                  : incidentLookupKind === 'ASSIGNEE'
                    ? 'Selectionner un technicien'
                    : 'Selectionner un demandeur'}
            </h3>
          </div>

          <button
            aria-label="Fermer la selection"
            className="incident-lookup-close"
            onClick={closeIncidentLookup}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <label className="incident-lookup-search">
          <select
            aria-label="Categorie de recherche"
            onChange={(event) =>
              setIncidentLookupSearchField(
                event.target.value as IncidentLookupSearchField,
              )
            }
            value={incidentLookupSearchField}
          >
            <option value="IDENTIFIER">Identifiant</option>
            {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
              <>
                <option value="NAME">Nom</option>
                <option value="LEVEL">Niveau</option>
              </>
            ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ||
              incidentLookupKind === 'REQUEST_EQUIPMENT' ? (
              <>
                <option value="NAME">Nom</option>
                <option value="TYPE">Type</option>
                <option value="STATUS">Statut</option>
                <option value="SERIAL_NUMBER">Numero de serie</option>
              </>
            ) : (
              <>
                <option value="FIRST_NAME">Prenom</option>
                <option value="LAST_NAME">Nom</option>
                {incidentLookupKind === 'ASSIGNEE' ? (
                  <option value="GROUP">Groupe</option>
                ) : null}
              </>
            )}
          </select>
          <div className="incident-lookup-search-input">
            <Search size={16} strokeWidth={2} />
            <input
              autoFocus
              onChange={(event) => setIncidentLookupSearch(event.target.value)}
              placeholder="Rechercher"
              value={incidentLookupSearch}
            />
          </div>
        </label>

        <div className="incident-lookup-table-scroll">
          <table className="incident-lookup-table">
            <thead>
              {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
                <tr>
                  <th>Identifiant</th>
                  <th>Nom</th>
                  <th>Niveau</th>
                  <th>Description</th>
                </tr>
              ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ||
                incidentLookupKind === 'REQUEST_EQUIPMENT' ? (
                <tr>
                  <th>Identifiant</th>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Numero de serie</th>
                </tr>
              ) : (
                <tr>
                  <th>Identifiant</th>
                  <th>Prenom</th>
                  <th>Nom</th>
                  <th>Mail</th>
                  {incidentLookupKind === 'ASSIGNEE' ? <th>Groupe</th> : null}
                </tr>
              )}
            </thead>

            <tbody>
              {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
                paginatedIncidentLookupGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      Aucun groupe ne correspond a la recherche.
                    </td>
                  </tr>
                ) : (
                  paginatedIncidentLookupGroups.map((group) => (
                    <tr
                      aria-selected={group.id === selectedIncidentLookupGroupId}
                      className={
                        group.id === selectedIncidentLookupGroupId
                          ? 'incident-lookup-row is-selected'
                          : 'incident-lookup-row'
                      }
                      key={group.id}
                      onClick={() => handleIncidentGroupLookupSelect(group)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleIncidentGroupLookupSelect(group);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td className="incident-lookup-identity">{group.name}</td>
                      <td>{group.name}</td>
                      <td>{group.level ?? '-'}</td>
                      <td>{group.description ?? '-'}</td>
                    </tr>
                  ))
                )
              ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ||
                incidentLookupKind === 'REQUEST_EQUIPMENT' ? (
                paginatedIncidentLookupEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      {incidentLookupKind === 'INCIDENT_EQUIPMENT'
                        ? 'Aucun equipement disponible dans le parc informatique pour le moment.'
                        : 'Aucun equipement ne correspond a la recherche.'}
                    </td>
                  </tr>
                ) : (
                  paginatedIncidentLookupEquipment.map((ci) => {
                    const ciType = ciTypesById.get(ci.ciTypeId);

                    return (
                      <tr
                        aria-selected={ci.id === selectedIncidentLookupEquipmentId}
                        className={
                          ci.id === selectedIncidentLookupEquipmentId
                            ? 'incident-lookup-row is-selected'
                            : 'incident-lookup-row'
                        }
                        key={ci.id}
                        onClick={() => handleIncidentEquipmentLookupSelect(ci)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleIncidentEquipmentLookupSelect(ci);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="incident-lookup-identity">{ci.name}</td>
                        <td>{ci.name}</td>
                        <td>{ciType?.name ?? 'Type inconnu'}</td>
                        <td>{ci.status}</td>
                        <td>{ci.serialNumber ?? '-'}</td>
                      </tr>
                    );
                  })
                )
              ) : paginatedIncidentLookupUsers.length === 0 ? (
                <tr>
                  <td colSpan={incidentLookupKind === 'ASSIGNEE' ? 5 : 4}>
                    Aucun utilisateur ne correspond a la recherche.
                  </td>
                </tr>
              ) : (
                paginatedIncidentLookupUsers.map((user) => {
                  const group = user.groupId ? groupsById.get(user.groupId) : null;

                  return (
                    <tr
                      aria-selected={user.id === selectedIncidentLookupUserId}
                      className={
                        user.id === selectedIncidentLookupUserId
                          ? 'incident-lookup-row is-selected'
                          : 'incident-lookup-row'
                      }
                      key={user.id}
                      onClick={() => handleIncidentLookupSelect(user)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleIncidentLookupSelect(user);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td className="incident-lookup-identity">
                        {formatKnownUserName(user, user.id)}
                      </td>
                      <td>{user.firstName ?? 'Non renseigne'}</td>
                      <td>{user.lastName ?? 'Non renseigne'}</td>
                      <td>{user.email ?? '-'}</td>
                      {incidentLookupKind === 'ASSIGNEE' ? (
                        <td>{group?.name ?? 'Non assigne'}</td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="incident-lookup-pagination">
          <span>
            Page {incidentLookupPage} sur {incidentLookupTotalPages} -{' '}
            {incidentLookupResultCount} resultat
            {incidentLookupResultCount > 1 ? 's' : ''}
          </span>

          <div>
            <button
              className="secondary-button incident-lookup-page-button"
              disabled={incidentLookupPage <= 1}
              onClick={() =>
                setIncidentLookupPage((currentPage) =>
                  Math.max(1, currentPage - 1),
                )
              }
              type="button"
            >
              Precedent
            </button>

            <span className="incident-lookup-current-page">
              {incidentLookupPage}
            </span>

            <button
              className="secondary-button incident-lookup-page-button"
              disabled={incidentLookupPage >= incidentLookupTotalPages}
              onClick={() =>
                setIncidentLookupPage((currentPage) =>
                  Math.min(incidentLookupTotalPages, currentPage + 1),
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
  );
}
