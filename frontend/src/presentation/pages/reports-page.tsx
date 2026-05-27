import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  BadgeAlert,
  BarChart3,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';

import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';

import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';

import {
  translateChannel,
  translateTicketStatus,
} from '../../domain/i18n/ticketing-labels';

import { fetchUserDirectory } from '../../infrastructure/api/auth-api';

import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

import type {
  ReportingBreakdownItem,
  ReportingStatusPeriodItem,
  ReportingTimelineItem,
} from '../../infrastructure/api/reporting-api';

import { searchTickets } from '../../infrastructure/api/ticketing-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';
import { PlanningPage, type PlanningTask } from './planning-page';

type ReportsPageProps = {
  session: AuthSessionSnapshot;
};

type PeriodPreset =
  | ''
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_3_MONTHS'
  | 'LAST_6_MONTHS';

type ReportsFilterState = {
  assignedToUserId: string;

  assignmentGroupId: string;

  categoryId: string;

  from: string;

  periodPreset: PeriodPreset;

  priorityId: string;

  status: '' | 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

  to: string;

  type: '' | 'INCIDENT' | 'REQUEST';
};

type ReportsView = 'DASHBOARD' | 'PERSONAL' | 'GROUP';

type PersonalTicketSort =
  | 'CREATED_AT_ASC'
  | 'CREATED_AT_DESC'
  | 'OPERATIONAL_PRIORITY';

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],

  channels: [],

  cis: [],

  ciTypes: [],

  groups: [],

  priorities: [],
};

const INITIAL_FILTERS: ReportsFilterState = {
  assignedToUserId: '',

  assignmentGroupId: '',

  categoryId: '',

  from: '',

  periodPreset: 'LAST_30_DAYS',

  priorityId: '',

  status: '',

  to: '',

  type: '',
};

const PERSONAL_TICKET_LIMIT = 8;
const PERSONAL_TICKET_SORT_OPTIONS = [
  {
    icon: BadgeAlert,
    label: 'Priorité opérationnelle',
    value: 'OPERATIONAL_PRIORITY' as const,
  },
  {
    icon: ArrowDown,
    label: "Plus récents d'abord",
    value: 'CREATED_AT_DESC' as const,
  },
  {
    icon: ArrowUp,
    label: "Plus anciens d'abord",
    value: 'CREATED_AT_ASC' as const,
  },
];

export function ReportsPage({ session }: ReportsPageProps) {
  const [activeView, setActiveView] = useState<ReportsView>('DASHBOARD');
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [planningTasks, setPlanningTasks] = useState<PlanningTask[]>(() =>
    readStoredPlanningTasks(session.user.id),
  );

  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<ReportsFilterState>(INITIAL_FILTERS);

  const [isLoading, setIsLoading] = useState(true);

  const [tickets, setTickets] = useState<TicketSummarySnapshot[]>([]);

  const [personalTickets, setPersonalTickets] = useState<
    TicketSummarySnapshot[]
  >([]);

  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const technicians = useMemo(
    () =>
      users.filter(
        (user) =>
          user.isActive && (user.role === 'AGENT' || user.role === 'ADMIN'),
      ),

    [users],
  );

  const isPersonalAgentReporting = session.user.role === 'AGENT';

  const loadReports = useCallback(
    async (nextFilters: ReportsFilterState): Promise<void> => {
      setIsLoading(true);

      setErrorMessage(null);

      try {
        const [nextTickets, nextPersonalTickets, nextCatalog, nextUsers] =
          await Promise.all([
            searchTickets(session.accessToken, {
              categoryId: normalizeOptionalText(nextFilters.categoryId),

              includeArchived: false,

              priorityId: normalizeOptionalText(nextFilters.priorityId),

              status: nextFilters.status || null,

              type: nextFilters.type || null,
            }),

            searchTickets(session.accessToken, {
              includeArchived: false,
            }),

            fetchReferentialCatalog(),

            fetchUserDirectory(session.accessToken),
          ]);

        setTickets(nextTickets);

        setPersonalTickets(nextPersonalTickets);

        setCatalog(nextCatalog);

        setUsers(nextUsers);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Erreur inconnue lors du chargement du tableau de bord',
        );
      } finally {
        setIsLoading(false);
      }
    },

    [session],
  );

  useEffect(() => {
    setFilters((currentFilters) => applyPeriodPreset(currentFilters));
  }, []);

  useEffect(() => {
    void loadReports(filters);
  }, [filters, loadReports]);

  useEffect(() => {
    window.localStorage.setItem(
      getPlanningStorageKey(session.user.id),
      JSON.stringify(planningTasks),
    );
  }, [planningTasks, session.user.id]);

  function handleFilterChange(
    field: keyof ReportsFilterState,

    value: string,
  ): void {
    setFilters((currentFilters) => {
      if (field === 'periodPreset') {
        return applyPeriodPreset({
          ...currentFilters,

          periodPreset: value as PeriodPreset,
        });
      }

      if (field === 'from' || field === 'to') {
        return {
          ...currentFilters,

          [field]: value,

          periodPreset: '',
        };
      }

      return {
        ...currentFilters,

        [field]: value,
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    void loadReports(filters);
  }

  function handleResetFilters(): void {
    setFilters(applyPeriodPreset(INITIAL_FILTERS));
  }

  const scopedTickets = useMemo(
    () => filterTicketsForDashboard(tickets, filters, session),

    [filters, session, tickets],
  );

  const overview = useMemo(
    () => buildDashboardOverview(scopedTickets),

    [scopedTickets],
  );

  const timelineItems = useMemo(
    () => buildTicketActivityTimeline(scopedTickets),

    [scopedTickets],
  );

  const statusPeriodItems = useMemo(
    () => buildTicketStatusPeriod(scopedTickets),

    [scopedTickets],
  );

  const categoryWidgetItems = useMemo(
    () =>
      countDashboardBreakdown(
        scopedTickets,

        (ticket) => ticket.categoryId,

        (categoryId) =>
          categoryId
            ? (catalog.categories.find((category) => category.id === categoryId)
                ?.name ?? categoryId)
            : 'Non definie',
      ),

    [catalog.categories, scopedTickets],
  );

  const channelWidgetItems = useMemo(
    () =>
      countDashboardBreakdown(
        scopedTickets,

        (ticket) => ticket.channelId,

        (channelId) =>
          channelId
            ? getChannelDisplayName(
                {
                  count: 0,

                  id: channelId,

                  name: channelId,
                },

                catalog,
              )
            : 'Non renseigne',
      ),

    [catalog, scopedTickets],
  );

  const agentWidgetItems = useMemo(
    () =>
      countDashboardBreakdown(
        scopedTickets,

        (ticket) => ticket.assignedToUserId,

        (userId) => formatAssignedUserName(userId, users),
      ),

    [scopedTickets, users],
  );

  const personalPrioritiesById = useMemo(
    () =>
      new Map(
        catalog.priorities.map((priority) => [
          priority.id,
          { level: priority.level, name: priority.name },
        ]),
      ),
    [catalog.priorities],
  );

  const assignedToMeTickets = useMemo(
    () =>
      buildPersonalTicketPreview(
        personalTickets,
        (ticket) => ticket.assignedToUserId === session.user.id,
      ),
    [personalTickets, session.user.id],
  );

  const createdByMeTickets = useMemo(
    () =>
      buildPersonalTicketPreview(
        personalTickets,
        (ticket) => ticket.createdByUserId === session.user.id,
      ),
    [personalTickets, session.user.id],
  );

  const reportViews = [
    {
      icon: BarChart3,
      key: 'DASHBOARD' as const,
      label: 'Tableau de bord',
    },
    {
      icon: User,
      key: 'PERSONAL' as const,
      label: 'Vue personnelle',
    },
    {
      icon: Users,
      key: 'GROUP' as const,
      label: 'Vue groupe',
    },
  ];

  if (isPlanningOpen) {
    return (
      <PlanningPage
        onBack={() => setIsPlanningOpen(false)}
        onTasksChange={setPlanningTasks}
        session={session}
        tasks={planningTasks}
        technicians={technicians}
      />
    );
  }

  return (
    <section className="reports-page">
      <nav
        aria-label="Navigation du tableau de bord"
        className="reports-view-tabs"
      >
        {reportViews.map((view) => {
          const Icon = view.icon;

          return (
            <button
              aria-pressed={activeView === view.key}
              className={
                activeView === view.key
                  ? 'reports-view-tab reports-view-tab--active'
                  : 'reports-view-tab'
              }
              key={view.key}
              onClick={() => setActiveView(view.key)}
              type="button"
            >
              <Icon aria-hidden="true" className="reports-view-tab-icon" />
              <span>{view.label}</span>
            </button>
          );
        })}
      </nav>

      {activeView === 'DASHBOARD' ? (
        <>
          <form className="reports-filter-band" onSubmit={handleSubmit}>
            <div className="reports-filters">
              <label className="field">
                <span>Periode</span>

                <select
                  onChange={(event) =>
                    handleFilterChange('periodPreset', event.target.value)
                  }
                  value={filters.periodPreset}
                >
                  <option value="">Personnalisée</option>

                  <option value="LAST_7_DAYS">7 jours</option>

                  <option value="LAST_30_DAYS">30 jours</option>

                  <option value="LAST_3_MONTHS">3 mois</option>

                  <option value="LAST_6_MONTHS">6 mois</option>
                </select>
              </label>

              <label className="field">
                <span>Du</span>

                <input
                  onChange={(event) =>
                    handleFilterChange('from', event.target.value)
                  }
                  type="date"
                  value={filters.from}
                />
              </label>

              <label className="field">
                <span>Au</span>

                <input
                  onChange={(event) =>
                    handleFilterChange('to', event.target.value)
                  }
                  type="date"
                  value={filters.to}
                />
              </label>

              <label className="field">
                <span>Type de ticket</span>

                <select
                  onChange={(event) =>
                    handleFilterChange('type', event.target.value)
                  }
                  value={filters.type}
                >
                  <option value="">Tous</option>

                  <option value="INCIDENT">Incident</option>

                  <option value="REQUEST">Demande</option>
                </select>
              </label>

              <label className="field">
                <span>Priorite</span>

                <select
                  onChange={(event) =>
                    handleFilterChange('priorityId', event.target.value)
                  }
                  value={filters.priorityId}
                >
                  <option value="">Toutes</option>

                  {catalog.priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Categorie</span>

                <select
                  onChange={(event) =>
                    handleFilterChange('categoryId', event.target.value)
                  }
                  value={filters.categoryId}
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
                <span>Agent</span>

                <select
                  disabled={isPersonalAgentReporting}
                  onChange={(event) =>
                    handleFilterChange('assignedToUserId', event.target.value)
                  }
                  value={filters.assignedToUserId}
                >
                  <option value="">
                    {isPersonalAgentReporting ? 'Moi uniquement' : 'Tous'}
                  </option>

                  {technicians.map((user) => (
                    <option key={user.id} value={user.id}>
                      {formatUserName(user)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Groupe</span>

                <select
                  disabled={isPersonalAgentReporting}
                  onChange={(event) =>
                    handleFilterChange('assignmentGroupId', event.target.value)
                  }
                  value={filters.assignmentGroupId}
                >
                  <option value="">Tous</option>

                  {catalog.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="reports-filter-actions">
                <button className="primary-button" disabled={isLoading}>
                  Actualiser
                </button>

                <button
                  className="secondary-button"
                  onClick={handleResetFilters}
                  type="button"
                >
                  Reinitialiser
                </button>
              </div>
            </div>
          </form>

          {errorMessage ? (
            <p className="referentials-error">{errorMessage}</p>
          ) : null}

          <section className="reports-dashboard">
            <div className="reports-dashboard-kpis">
              <DashboardPrimaryKpiCard
                label="Tickets"
                tone="yellow"
                value={formatNumber(overview.total)}
              />

              <DashboardPrimaryKpiCard
                label="Tickets en retard"
                tone="orange"
                value={formatNumber(overview.overdue)}
              />

              <DashboardPrimaryKpiCard
                label="Incidents"
                tone="salmon"
                value={formatNumber(overview.incidents)}
              />

              <DashboardPrimaryKpiCard
                label="Demandes"
                tone="green"
                value={formatNumber(overview.requests)}
              />

              <DashboardMiniKpiCard
                label="Tickets entrants"
                tone="mint"
                value={formatNumber(overview.total)}
              />

              <DashboardMiniKpiCard
                label="Tickets assignes"
                tone="sky"
                value={formatNumber(overview.assigned)}
              />

              <DashboardMiniKpiCard
                label="Tickets resolus"
                tone="silver"
                value={formatNumber(overview.resolved)}
              />

              <DashboardMiniKpiCard
                label="Tickets non assignes"
                tone="white"
                value={formatNumber(overview.unassigned)}
              />

              <DashboardMiniKpiCard
                label="Tickets en attente"
                tone="amber"
                value={formatNumber(overview.pending)}
              />

              <DashboardMiniKpiCard
                label="Tickets fermes"
                tone="charcoal"
                value={formatNumber(overview.closed)}
              />
            </div>

            <div className="reports-dashboard-charts">
              <DashboardPanel title="Evolution des tickets">
                <DashboardTimelineChart items={timelineItems} />
              </DashboardPanel>

              <DashboardPanel title="Statuts des tickets par mois">
                <DashboardStackedStatusChart items={statusPeriodItems} />
              </DashboardPanel>
            </div>

            <div className="reports-dashboard-tops">
              <DashboardPanel title="Top categories de tickets">
                <DashboardDonutWidget items={categoryWidgetItems} />
              </DashboardPanel>

              <DashboardPanel title="Top sources de tickets">
                <DashboardBarWidget items={channelWidgetItems} />
              </DashboardPanel>

              <DashboardPanel title="Top agents assignes">
                <DashboardDonutWidget items={agentWidgetItems} />
              </DashboardPanel>
            </div>
          </section>
        </>
      ) : activeView === 'PERSONAL' ? (
        <section aria-label="Vue personnelle" className="personal-view-grid">
          <PersonalTicketPanel
            isLoading={isLoading}
            onOpenTicket={(ticketId) =>
              navigateTo(`/agent/tickets/${ticketId}`)
            }
            prioritiesById={personalPrioritiesById}
            title="Assignés à moi"
            tickets={assignedToMeTickets}
            users={users}
          />

          <PersonalTicketPanel
            isLoading={isLoading}
            onOpenTicket={(ticketId) =>
              navigateTo(`/agent/tickets/${ticketId}`)
            }
            prioritiesById={personalPrioritiesById}
            title="Mes tickets créés"
            tickets={createdByMeTickets}
            users={users}
          />

          <PersonalPlanningPanel
            onOpenPlanning={() => setIsPlanningOpen(true)}
            tasks={planningTasks}
          />
        </section>
      ) : (
        <section aria-label="Vue groupe" className="reports-empty-view" />
      )}
    </section>
  );
}

function PersonalTicketPanel({
  isLoading,
  onOpenTicket,
  prioritiesById,
  title,
  tickets,
  users,
}: {
  isLoading: boolean;
  onOpenTicket: (ticketId: string) => void;
  prioritiesById: Map<string, { level: number; name: string }>;
  title: string;
  tickets: TicketSummarySnapshot[];
  users: AdminUserSummary[];
}) {
  const [page, setPage] = useState(1);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<PersonalTicketSort>(
    'OPERATIONAL_PRIORITY',
  );
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const sortedTickets = useMemo(
    () => sortPersonalTickets(tickets, sortBy, prioritiesById),
    [prioritiesById, sortBy, tickets],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(sortedTickets.length / PERSONAL_TICKET_LIMIT),
  );
  const visiblePage = Math.min(page, totalPages);
  const visibleTickets = sortedTickets.slice(
    (visiblePage - 1) * PERSONAL_TICKET_LIMIT,
    visiblePage * PERSONAL_TICKET_LIMIT,
  );

  useEffect(() => {
    if (!isSortMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (
        sortMenuRef.current &&
        event.target instanceof Node &&
        !sortMenuRef.current.contains(event.target)
      ) {
        setIsSortMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSortMenuOpen]);

  return (
    <article className="personal-panel personal-ticket-panel">
      <header className="personal-panel-header">
        <h3>{title}</h3>
        <div className="ticket-list-toolbar">
          <div className="ticket-list-count" aria-live="polite">
            <strong>{tickets.length}</strong>
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
                  {PERSONAL_TICKET_SORT_OPTIONS.map((option) => {
                    const Icon = option.icon;

                    return (
                      <button
                        className={
                          sortBy === option.value
                            ? 'ticket-sort-option is-active'
                            : 'ticket-sort-option'
                        }
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setPage(1);
                          setIsSortMenuOpen(false);
                        }}
                        role="menuitemradio"
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className="ticket-sort-option-icon"
                        >
                          <Icon size={16} strokeWidth={2} />
                        </span>
                        <span className="ticket-sort-option-copy">
                          <strong>{option.label}</strong>
                          <span>
                            {sortBy === option.value
                              ? 'Sélection actuelle'
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

      {isLoading ? (
        <p className="personal-panel-empty">Chargement des tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="personal-panel-empty">Aucun ticket à afficher.</p>
      ) : (
        <div className="personal-table-scroll">
          <div className="personal-ticket-viewport">
            <table className="personal-ticket-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Demandeur</th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => onOpenTicket(ticket.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenTicket(ticket.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="personal-ticket-id">
                      {formatTicketDisplayNumber(ticket)}
                    </td>
                    <td className="personal-ticket-title">{ticket.title}</td>
                    <td>
                      <span
                        className={`personal-status personal-status--${ticket.status.toLowerCase()}`}
                      >
                        <i aria-hidden="true" />
                        {translateTicketStatus(ticket.status)}
                      </span>
                    </td>
                    <td>
                      {formatAssignedUserName(
                        ticket.requestedForUserId ?? ticket.createdByUserId,
                        users,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav
            aria-label={`Pagination ${title}`}
            className="personal-ticket-pagination"
          >
            <button
              disabled={visiblePage === 1}
              onClick={() => setPage(visiblePage - 1)}
              type="button"
            >
              Précédent
            </button>
            <span aria-current="page">{visiblePage}</span>
            <button
              disabled={visiblePage === totalPages}
              onClick={() => setPage(visiblePage + 1)}
              type="button"
            >
              Suivant
            </button>
          </nav>
        </div>
      )}
    </article>
  );
}

function PersonalPlanningPanel({
  onOpenPlanning,
  tasks,
}: {
  onOpenPlanning: () => void;
  tasks: PlanningTask[];
}) {
  const today = formatDateInputValue(new Date());
  const visibleTasks = tasks.filter(
    (task) => task.start.slice(0, 10) === today,
  );

  return (
    <article className="personal-panel personal-planning-panel">
      <header className="personal-panel-header">
        <h3>Votre planning</h3>
        <button
          className="secondary-button personal-planning-open-button"
          onClick={onOpenPlanning}
          type="button"
        >
          Voir le planning
        </button>
      </header>

      {visibleTasks.length === 0 ? (
        <p className="personal-panel-empty personal-planning-empty">
          Aucune tâche planifiée aujourd'hui.
        </p>
      ) : (
        <div className="personal-task-list">
          {visibleTasks.map((task) => (
            <p key={task.id}>
              <strong>{formatPlanningPreviewTime(task.start)}</strong>
              {task.title}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

function DashboardPanel({
  children,

  className,

  title,
}: {
  children: React.ReactNode;

  className?: string;

  title: string;
}) {
  return (
    <article
      className={
        className
          ? `reports-dashboard-panel ${className}`
          : 'reports-dashboard-panel'
      }
    >
      <header className="reports-dashboard-panel-header">
        <h3>{title}</h3>
      </header>

      {children}
    </article>
  );
}

function DashboardPrimaryKpiCard({
  label,

  tone,

  value,
}: {
  label: string;

  tone: string;

  value: string;
}) {
  return (
    <article className={`reports-primary-kpi reports-primary-kpi--${tone}`}>
      <strong>{value}</strong>

      <span>{label}</span>
    </article>
  );
}

function DashboardMiniKpiCard({
  label,

  tone,

  value,
}: {
  label: string;

  tone: string;

  value: string;
}) {
  return (
    <article className={`reports-mini-kpi reports-mini-kpi--${tone}`}>
      <strong>{value}</strong>

      <span>{label}</span>
    </article>
  );
}

function DashboardTimelineChart({ items }: { items: ReportingTimelineItem[] }) {
  const [tooltipState, setTooltipState] = useState<{
    align: 'center' | 'left' | 'right';
    index: number;
    left: string;
    top: string;
  } | null>(null);
  const hideTooltip = () => setTooltipState(null);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const width = 820;
  const height = 304;
  const paddingLeft = 52;
  const paddingRight = 18;
  const paddingTop = 14;
  const paddingBottom = 18;

  const maxValue = Math.max(
    ...items.flatMap((item) => [
      item.open,
      item.resolved,
      item.overdue,
      item.closed,
    ]),
    1,
  );
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const baselineY = paddingTop + chartHeight;
  const activeItem = tooltipState ? items[tooltipState.index] : null;
  const yTicks = Array.from({ length: 6 }, (_, index) =>
    Math.round((maxValue / 5) * (5 - index)),
  );
  const series = [
    {
      key: 'open' as const,
      color: '#4f7fb5',
      fill: 'rgba(79, 127, 181, 0.14)',
      label: 'Ouverts',
    },
    {
      key: 'resolved' as const,
      color: '#f09a34',
      fill: 'rgba(240, 154, 52, 0.12)',
      label: 'Resolus',
    },
    {
      key: 'overdue' as const,
      color: '#e55d59',
      fill: 'rgba(229, 93, 89, 0.1)',
      label: 'En retard',
    },
    {
      key: 'closed' as const,
      color: '#7cc3c6',
      fill: 'rgba(124, 195, 198, 0.1)',
      label: 'Clos',
    },
  ];
  return (
    <div className="reports-timeline-card" onMouseLeave={hideTooltip}>
      <div className="reports-chart-legend">
        {series.map((item) => (
          <span key={item.key}>
            <i className={`reports-line-key reports-line-key--${item.key}`} />
            {item.label}
          </span>
        ))}
      </div>

      <svg className="reports-timeline-svg" viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((tickValue, index) => {
          const y = paddingTop + (chartHeight / 5) * index;

          return (
            <g key={tickValue}>
              <line
                className="reports-grid-line"
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
              />
              <text
                className="reports-grid-label"
                x={paddingLeft - 10}
                y={y + 4}
              >
                {formatChartValue(tickValue)}
              </text>
            </g>
          );
        })}

        {series.map((item) =>
          renderTimelineSeries(
            items,
            item.key,
            maxValue,
            chartWidth,
            chartHeight,
            paddingLeft,
            paddingTop,
            baselineY,
            item.color,
            item.fill,
            setTooltipState,
            items.length,
            hideTooltip,
          ),
        )}
      </svg>

      {activeItem ? (
        <ChartTooltip
          align={tooltipState?.align ?? 'center'}
          className="reports-chart-tooltip--timeline"
          items={[
            {
              color: '#4f7fb5',
              label: 'Ouverts',
              value: activeItem.open,
            },
            {
              color: '#f09a34',
              label: 'Resolus',
              value: activeItem.resolved,
            },
            {
              color: '#e55d59',
              label: 'En retard',
              value: activeItem.overdue,
            },
            {
              color: '#7cc3c6',
              label: 'Clos',
              value: activeItem.closed,
            },
          ]}
          left={tooltipState?.left ?? '50%'}
          top={tooltipState?.top}
          title={activeItem.period}
        />
      ) : null}

      <div className="reports-timeline-labels">
        {items.map((item) => (
          <span key={item.period}>{formatPeriodLabel(item.period)}</span>
        ))}
      </div>
    </div>
  );
}

function renderTimelineSeries(
  items: ReportingTimelineItem[],
  key: 'closed' | 'open' | 'overdue' | 'resolved',
  maxValue: number,
  chartWidth: number,
  chartHeight: number,
  paddingLeft: number,
  paddingTop: number,
  baselineY: number,
  color: string,
  fill: string,
  setTooltipState: Dispatch<
    SetStateAction<{
      align: 'center' | 'left' | 'right';
      index: number;
      left: string;
      top: string;
    } | null>
  >,
  itemCount: number,
  hideTooltip: () => void,
) {
  const points = buildTimelinePoints(
    items,
    key,
    maxValue,
    chartWidth,
    chartHeight,
    paddingLeft,
    paddingTop,
  );
  const linePath = buildSmoothSvgPath(points);
  const areaPath = buildAreaSvgPath(points, baselineY);

  return (
    <g key={key}>
      <path className="reports-area-path" d={areaPath} fill={fill} />
      <path
        className="reports-line-path"
        d={linePath}
        fill="none"
        stroke={color}
      />
      {points.map((point, index) => (
        <g key={`${key}-${index}`}>
          <circle
            className="reports-line-point-hitbox"
            cx={point.x}
            cy={point.y}
            fill="transparent"
            onMouseLeave={hideTooltip}
            onMouseMove={(event) => {
              const container = event.currentTarget.closest(
                '.reports-timeline-card',
              );

              if (!(container instanceof HTMLDivElement)) {
                return;
              }

              const containerRect = container.getBoundingClientRect();
              const align = index >= itemCount - 1 ? 'right' : 'left';
              const topPx = clampNumber(
                event.clientY - containerRect.top - 16,
                52,
                Math.max(52, containerRect.height - 160),
              );
              const horizontalOffsetPx = align === 'left' ? 28 : -28;

              setTooltipState({
                align,
                index,
                left: `${point.x + horizontalOffsetPx}px`,
                top: `${topPx}px`,
              });
            }}
            r="16"
          />
          <circle
            className="reports-line-point"
            cx={point.x}
            cy={point.y}
            fill={color}
            r="4"
          />
        </g>
      ))}
    </g>
  );
}

function buildTimelinePoints(
  items: ReportingTimelineItem[],
  key: 'closed' | 'open' | 'overdue' | 'resolved',
  maxValue: number,
  chartWidth: number,
  chartHeight: number,
  paddingLeft: number,
  paddingTop: number,
): Array<{ x: number; y: number }> {
  const denominator = Math.max(1, items.length - 1);

  return items.map((item, index) => {
    const x = paddingLeft + (chartWidth / denominator) * index;
    const y =
      paddingTop +
      chartHeight -
      (Math.max(0, item[key]) / maxValue) * chartHeight;

    return { x, y };
  });
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const distanceX = current.x - previous.x;
    const tension = 0.32;
    const controlX1 = previous.x + distanceX * tension;
    const controlX2 = current.x - distanceX * tension;

    path += ` C ${controlX1} ${previous.y}, ${controlX2} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
}

function buildAreaSvgPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number,
): string {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildSmoothSvgPath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

function DashboardStackedStatusChart({
  items,
}: {
  items: ReportingStatusPeriodItem[];
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [tooltipState, setTooltipState] = useState<{
    align: 'left' | 'right';
    index: number;
    left: string;
    segment: {
      color: string;
      label: string;
      value: number;
    };
    top: string;
  } | null>(null);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const maxTotal = Math.max(
    ...items.map(
      (item) =>
        item.open +
        item.inProgress +
        item.pending +
        item.resolved +
        item.closed,
    ),

    1,
  );
  const chartHeightPx = 220;
  const activeItem = tooltipState ? items[tooltipState.index] : null;

  return (
    <div className="reports-status-period-chart" ref={chartRef}>
      <div className="reports-chart-legend">
        <span>
          <i className="reports-status-key reports-status-key--open" />
          Ouvert
        </span>

        <span>
          <i className="reports-status-key reports-status-key--progress" />
          En cours
        </span>

        <span>
          <i className="reports-status-key reports-status-key--pending" />
          En attente
        </span>

        <span>
          <i className="reports-status-key reports-status-key--resolved" />
          Resolu
        </span>

        <span>
          <i className="reports-status-key reports-status-key--closed" />
          Clos
        </span>
      </div>

      {activeItem ? (
        <ChartTooltip
          align={tooltipState?.align ?? 'left'}
          className="reports-chart-tooltip--status"
          items={tooltipState ? [tooltipState.segment] : []}
          left={tooltipState?.left ?? '50%'}
          top={tooltipState?.top}
          title={activeItem.period}
        />
      ) : null}

      <div className="reports-status-period-columns">
        {items.map((item, index) => {
          const total =
            item.open +
            item.inProgress +
            item.pending +
            item.resolved +
            item.closed;

          const height = `${total <= 0 ? 0 : (total / maxTotal) * chartHeightPx}px`;

          return (
            <div className="reports-status-period-column" key={item.period}>
              <strong>{total}</strong>
              <div
                className="reports-status-period-stack"
                style={{ height } as CSSProperties}
              >
                {renderStackSegment(
                  item.open,
                  total,
                  'open',
                  'Ouvert',
                  '#3b6ca8',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.inProgress,
                  total,
                  'progress',
                  'En cours',
                  '#f1972c',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.pending,
                  total,
                  'pending',
                  'En attente',
                  '#6bb45a',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.resolved,
                  total,
                  'resolved',
                  'Resolu',
                  '#f2cb4d',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.closed,
                  total,
                  'closed',
                  'Clos',
                  '#b07ca7',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}
              </div>

              <span>{formatPeriodLabel(item.period)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartTooltip({
  align = 'center',
  className,
  items,
  left,
  top,
  title,
}: {
  align?: 'center' | 'left' | 'right';
  className?: string;
  items: Array<{ color: string; label: string; value: number }>;
  left: string;
  top?: string;
  title: string;
}) {
  return (
    <div
      className={
        className
          ? `reports-chart-tooltip reports-chart-tooltip--${align} ${className}`
          : 'reports-chart-tooltip'
      }
      style={{ left, top } as CSSProperties}
    >
      <strong>{formatTooltipPeriod(title)}</strong>
      <div className="reports-chart-tooltip-list">
        {items.map((item) => (
          <div className="reports-chart-tooltip-row" key={item.label}>
            <span>
              <i style={{ background: item.color } as CSSProperties} />
              {item.label}
            </span>
            <b>{formatNumber(item.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderStackSegment(
  value: number,

  total: number,

  tone: 'closed' | 'open' | 'pending' | 'progress' | 'resolved',
  label: string,
  color: string,
  columnIndex: number,
  itemCount: number,
  chartRef: RefObject<HTMLDivElement | null>,
  setTooltipState: Dispatch<
    SetStateAction<{
      align: 'left' | 'right';
      index: number;
      left: string;
      segment: {
        color: string;
        label: string;
        value: number;
      };
      top: string;
    } | null>
  >,
) {
  if (value <= 0 || total <= 0) {
    return null;
  }

  return (
    <span
      className={`reports-stack-segment reports-stack-segment--${tone}`}
      onMouseLeave={() => setTooltipState(null)}
      onMouseMove={(event) => {
        if (!chartRef.current) {
          return;
        }

        const chartRect = chartRef.current.getBoundingClientRect();
        const segmentRect = event.currentTarget.getBoundingClientRect();
        const align = columnIndex >= itemCount - 1 ? 'right' : 'left';
        const horizontalOffsetPx = 20;
        const leftPx =
          align === 'left'
            ? segmentRect.right - chartRect.left + horizontalOffsetPx
            : segmentRect.left - chartRect.left - horizontalOffsetPx;
        const estimatedTooltipHeightPx = 86;
        const topPx = clampNumber(
          event.clientY - chartRect.top - 14,
          56,
          Math.max(56, chartRect.height - estimatedTooltipHeightPx),
        );

        setTooltipState({
          align,
          index: columnIndex,
          left: `${leftPx}px`,
          segment: {
            color,
            label,
            value,
          },
          top: `${topPx}px`,
        });
      }}
      style={{ height: `${(value / total) * 100}%` } as CSSProperties}
    />
  );
}

function DashboardDonutWidget({ items }: { items: ReportingBreakdownItem[] }) {
  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const topItems = items.slice(0, 5);

  const total = topItems.reduce((sum, item) => sum + item.count, 0);

  const colors = ['#3a8f18', '#68c62e', '#95de6f', '#b6e7a1', '#d5f1cd'];

  const segments = topItems

    .reduce<{ nextOffset: number; parts: string[] }>(
      (accumulator, item, index) => {
        const value = total > 0 ? (item.count / total) * 100 : 0;

        const currentOffset = accumulator.nextOffset;

        accumulator.parts.push(
          `${colors[index % colors.length]} ${currentOffset}% ${currentOffset + value}%`,
        );

        return {
          nextOffset: currentOffset + value,

          parts: accumulator.parts,
        };
      },

      { nextOffset: 0, parts: [] },
    )

    .parts.join(', ');

  return (
    <div className="reports-donut-widget">
      <div
        className="reports-donut-visual"
        style={{ background: `conic-gradient(${segments})` } as CSSProperties}
      >
        <span>{formatNumber(total)}</span>
      </div>

      <div className="reports-widget-list">
        {topItems.map((item, index) => (
          <div className="reports-widget-row" key={item.id ?? item.name}>
            <span>
              <i
                style={
                  { background: colors[index % colors.length] } as CSSProperties
                }
              />

              {item.name}
            </span>

            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardBarWidget({ items }: { items: ReportingBreakdownItem[] }) {
  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const topItems = items.slice(0, 5);

  const maxValue = Math.max(...topItems.map((item) => item.count), 1);

  return (
    <div className="reports-widget-bars">
      {topItems.map((item) => (
        <div className="reports-widget-bar-row" key={item.id ?? item.name}>
          <span>{item.name}</span>

          <div>
            <strong>{item.count}</strong>

            <i
              style={
                { width: `${(item.count / maxValue) * 100}%` } as CSSProperties
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function applyPeriodPreset(filters: ReportsFilterState): ReportsFilterState {
  if (!filters.periodPreset) {
    return filters;
  }

  const range = getPeriodPresetRange(filters.periodPreset);

  return {
    ...filters,

    from: range.from,

    to: range.to,
  };
}

function getPeriodPresetRange(preset: Exclude<PeriodPreset, ''>): {
  from: string;

  to: string;
} {
  const today = new Date();
  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (preset === 'LAST_3_MONTHS') {
    return {
      from: formatDateInputValue(
        new Date(endOfToday.getFullYear(), endOfToday.getMonth() - 2, 1),
      ),
      to: formatDateInputValue(endOfToday),
    };
  }

  if (preset === 'LAST_6_MONTHS') {
    return {
      from: formatDateInputValue(
        new Date(endOfToday.getFullYear(), endOfToday.getMonth() - 5, 1),
      ),
      to: formatDateInputValue(endOfToday),
    };
  }

  const days = preset === 'LAST_7_DAYS' ? 6 : 29;
  const start = new Date(endOfToday);

  start.setDate(start.getDate() - days);

  return {
    from: formatDateInputValue(start),
    to: formatDateInputValue(endOfToday),
  };
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getPlanningStorageKey(userId: string): string {
  return `vision:planning:${userId}`;
}

function readStoredPlanningTasks(userId: string): PlanningTask[] {
  try {
    const rawValue = window.localStorage.getItem(getPlanningStorageKey(userId));

    if (!rawValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isPlanningTask);
  } catch {
    return [];
  }
}

function isPlanningTask(value: unknown): value is PlanningTask {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const task = value as Partial<PlanningTask>;

  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    typeof task.technicianId === 'string' &&
    (task.status === 'TODO' || task.status === 'DONE') &&
    typeof task.start === 'string' &&
    typeof task.durationMinutes === 'number' &&
    typeof task.description === 'string'
  );
}

function formatPlanningPreviewTime(start: string): string {
  return start.slice(11, 16);
}

function buildPersonalTicketPreview(
  tickets: TicketSummarySnapshot[],
  predicate: (ticket: TicketSummarySnapshot) => boolean,
): TicketSummarySnapshot[] {
  return tickets.filter((ticket) => !ticket.archivedAt && predicate(ticket));
}

function sortPersonalTickets(
  tickets: TicketSummarySnapshot[],
  sortBy: PersonalTicketSort,
  prioritiesById: Map<string, { level: number; name: string }>,
): TicketSummarySnapshot[] {
  const matchingTickets = [...tickets];

  if (sortBy === 'CREATED_AT_DESC') {
    return [...matchingTickets].sort(
      (left, right) =>
        personalToTimestamp(right.createdAt) -
        personalToTimestamp(left.createdAt),
    );
  }

  if (sortBy === 'CREATED_AT_ASC') {
    return [...matchingTickets].sort(
      (left, right) =>
        personalToTimestamp(left.createdAt) -
        personalToTimestamp(right.createdAt),
    );
  }

  return [...matchingTickets].sort((left, right) => {
    const leftScore = getPersonalTicketOperationalScore(left, prioritiesById);
    const rightScore = getPersonalTicketOperationalScore(right, prioritiesById);

    return (
      leftScore.statusRank - rightScore.statusRank ||
      leftScore.slaRank - rightScore.slaRank ||
      leftScore.nextDueAt - rightScore.nextDueAt ||
      rightScore.priorityLevel - leftScore.priorityLevel ||
      leftScore.createdAt - rightScore.createdAt
    );
  });
}

function formatTicketDisplayNumber(ticket: TicketSummarySnapshot): string {
  const numberSuffix = ticket.number.split('-').at(-1) ?? ticket.number;

  if (ticket.type === 'INCIDENT') {
    return `INC-${numberSuffix}`;
  }

  if (ticket.type === 'REQUEST') {
    return `DEM-${numberSuffix}`;
  }

  return ticket.number;
}

function getPersonalTicketOperationalScore(
  ticket: TicketSummarySnapshot,
  prioritiesById: Map<string, { level: number; name: string }>,
): {
  createdAt: number;
  nextDueAt: number;
  priorityLevel: number;
  slaRank: number;
  statusRank: number;
} {
  return {
    createdAt: personalToTimestamp(ticket.createdAt),
    nextDueAt: getPersonalNextDueTimestamp(ticket),
    priorityLevel: prioritiesById.get(ticket.priorityId)?.level ?? 0,
    slaRank: getPersonalSlaRank(ticket),
    statusRank: getPersonalStatusRank(ticket.status),
  };
}

function getPersonalStatusRank(status: string): number {
  const ranks: Record<string, number> = {
    IN_PROGRESS: 0,
    PENDING: 1,
    OPEN: 2,
    RESOLVED: 3,
    CLOSED: 4,
  };

  return ranks[status] ?? 5;
}

function getPersonalSlaRank(ticket: TicketSummarySnapshot): number {
  if (
    ticket.responseSlaStatus === 'OVERDUE' ||
    ticket.resolutionSlaStatus === 'OVERDUE'
  ) {
    return 0;
  }

  if (
    ticket.responseSlaStatus === 'AT_RISK' ||
    ticket.resolutionSlaStatus === 'AT_RISK'
  ) {
    return 1;
  }

  return 2;
}

function getPersonalNextDueTimestamp(ticket: TicketSummarySnapshot): number {
  const timestamps = [ticket.responseDueAt, ticket.resolutionDueAt]
    .map((value) =>
      value ? personalToTimestamp(value) : Number.POSITIVE_INFINITY,
    )
    .filter((value) => Number.isFinite(value));

  return Math.min(...timestamps, Number.POSITIVE_INFINITY);
}

function personalToTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName]

    .filter(Boolean)

    .join(' ')

    .trim();

  return fullName || user.displayName || user.email || user.id;
}

function formatAssignedUserName(
  userId: string | null,

  users: AdminUserSummary[],
): string {
  if (!userId) {
    return 'Non assigne';
  }

  return formatUserName(
    users.find((user) => user.id === userId) ?? {
      displayName: null,

      email: null,

      firstName: null,

      groupId: null,

      id: userId,

      isActive: true,

      lastName: null,

      role: 'AGENT',
    },
  );
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : String(value);
}

function formatChartValue(value: number): string {
  if (value >= 1000) {
    return (
      new Intl.NumberFormat('fr-FR', {
        maximumFractionDigits: 1,
        minimumFractionDigits: value % 1000 === 0 ? 0 : 1,
      }).format(value / 1000) + 'K'
    );
  }

  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatTooltipPeriod(value: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatPeriodLabel(value: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: '2-digit',

    year: '2-digit',
  }).format(date);
}

function getChannelDisplayName(
  item: ReportingBreakdownItem,

  catalog: ReferentialCatalogSnapshot,
): string {
  if (!item.id) {
    return item.name;
  }

  const channelName = catalog.channels.find(
    (channel) => channel.id === item.id,
  )?.name;

  return channelName ? translateChannel(channelName) : item.name;
}

function filterTicketsForDashboard(
  tickets: TicketSummarySnapshot[],

  filters: ReportsFilterState,

  session: AuthSessionSnapshot,
): TicketSummarySnapshot[] {
  const fromTime = getDateBoundaryTimestamp(filters.from, 'start');

  const toTime = getDateBoundaryTimestamp(filters.to, 'end');

  const assignedToUserId =
    session.user.role === 'AGENT'
      ? session.user.id
      : normalizeOptionalText(filters.assignedToUserId);

  const assignmentGroupId = normalizeOptionalText(filters.assignmentGroupId);

  return tickets.filter((ticket) => {
    const createdAtTime = new Date(ticket.createdAt).getTime();

    if (
      fromTime !== null &&
      (Number.isNaN(createdAtTime) || createdAtTime < fromTime)
    ) {
      return false;
    }

    if (
      toTime !== null &&
      (Number.isNaN(createdAtTime) || createdAtTime > toTime)
    ) {
      return false;
    }

    if (assignedToUserId && ticket.assignedToUserId !== assignedToUserId) {
      return false;
    }

    if (assignmentGroupId && ticket.assignmentGroupId !== assignmentGroupId) {
      return false;
    }

    return true;
  });
}

function getDateBoundaryTimestamp(
  value: string,

  boundary: 'end' | 'start',
): number | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const [yearText, monthText, dayText] = normalized.split('-');

  const year = Number(yearText);

  const month = Number(monthText);

  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  const date =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);

  return date.getTime();
}

function buildDashboardOverview(tickets: TicketSummarySnapshot[]) {
  return {
    assigned: tickets.filter((ticket) => Boolean(ticket.assignedToUserId))
      .length,

    closed: tickets.filter((ticket) => ticket.status === 'CLOSED').length,

    incidents: tickets.filter((ticket) => ticket.type === 'INCIDENT').length,

    overdue: tickets.filter(isTicketOverdue).length,

    pending: tickets.filter((ticket) => ticket.status === 'PENDING').length,

    requests: tickets.filter((ticket) => ticket.type === 'REQUEST').length,

    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,

    total: tickets.length,

    unassigned: tickets.filter((ticket) => !ticket.assignedToUserId).length,
  };
}

function buildTicketActivityTimeline(
  tickets: TicketSummarySnapshot[],
): ReportingTimelineItem[] {
  const buckets = new Map<string, ReportingTimelineItem>();

  for (const ticket of tickets) {
    const period = ticket.createdAt.slice(0, 7);

    const current = buckets.get(period) ?? {
      closed: 0,

      open: 0,

      overdue: 0,

      period,

      resolved: 0,
    };

    if (
      ticket.status === 'OPEN' ||
      ticket.status === 'IN_PROGRESS' ||
      ticket.status === 'PENDING'
    ) {
      current.open += 1;
    }

    if (ticket.status === 'RESOLVED') {
      current.resolved += 1;
    }

    if (ticket.status === 'CLOSED') {
      current.closed += 1;
    }

    if (isTicketOverdue(ticket)) {
      current.overdue += 1;
    }

    buckets.set(period, current);
  }

  return [...buckets.values()].sort((left, right) =>
    left.period.localeCompare(right.period),
  );
}

function buildTicketStatusPeriod(
  tickets: TicketSummarySnapshot[],
): ReportingStatusPeriodItem[] {
  const buckets = new Map<string, ReportingStatusPeriodItem>();

  for (const ticket of tickets) {
    const period = ticket.createdAt.slice(0, 7);

    const current = buckets.get(period) ?? {
      closed: 0,

      inProgress: 0,

      open: 0,

      pending: 0,

      period,

      resolved: 0,
    };

    if (ticket.status === 'OPEN') {
      current.open += 1;
    } else if (ticket.status === 'IN_PROGRESS') {
      current.inProgress += 1;
    } else if (ticket.status === 'PENDING') {
      current.pending += 1;
    } else if (ticket.status === 'RESOLVED') {
      current.resolved += 1;
    } else if (ticket.status === 'CLOSED') {
      current.closed += 1;
    }

    buckets.set(period, current);
  }

  return [...buckets.values()].sort((left, right) =>
    left.period.localeCompare(right.period),
  );
}

function countDashboardBreakdown(
  tickets: TicketSummarySnapshot[],

  getKey: (ticket: TicketSummarySnapshot) => string | null,

  getName: (key: string | null) => string,
): ReportingBreakdownItem[] {
  const counters = new Map<string, { count: number; id: string | null }>();

  for (const ticket of tickets) {
    const id = getKey(ticket);

    const key = id ?? '__null__';

    const current = counters.get(key) ?? { count: 0, id };

    counters.set(key, {
      ...current,

      count: current.count + 1,
    });
  }

  return [...counters.values()]

    .map((item) => ({
      count: item.count,

      id: item.id,

      name: getName(item.id),
    }))

    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name),
    );
}

function isTicketOverdue(ticket: TicketSummarySnapshot): boolean {
  return (
    ticket.responseSlaStatus === 'OVERDUE' ||
    ticket.resolutionSlaStatus === 'OVERDUE'
  );
}
