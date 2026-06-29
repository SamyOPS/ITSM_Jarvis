import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
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
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  User,
  Users,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';

import type { PlanningTask } from '../../domain/planning/planning-task';

import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';

import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';

import { translateTicketStatus } from '../../domain/i18n/ticketing-labels';

import { fetchUserDirectory } from '../../infrastructure/api/auth-api';

import {
  createGroupChatMessage,
  fetchGroupChatMessages,
} from '../../infrastructure/api/group-chat-api';

import {
  createPlanningTask,
  deletePlanningTask,
  fetchPlanningTasks,
  updatePlanningTask,
} from '../../infrastructure/api/planning-api';

import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

import type {
  ReportingBreakdown,
  ReportingBreakdownItem,
  ReportingOverview,
  ReportingTimelineItem,
} from '../../infrastructure/api/reporting-api';

import {
  fetchReportingBreakdown,
  fetchReportingOverview,
} from '../../infrastructure/api/reporting-api';

import { searchTickets } from '../../infrastructure/api/ticketing-api';

import { navigateTo } from '../../infrastructure/routing/browser-router';

import { PlanningPage } from './planning-page';
import { formatEquipmentIdentifier } from './park-page.helpers';
import {
  applyPeriodPreset,
  buildPersonalTicketPreview,
  buildReportingFilters,
  buildStatusDistributionItems,
  clampNumber,
  formatAssignedUserName,
  formatChartValue,
  formatDateInputValue,
  formatGroupChatInitials,
  formatGroupChatTimestamp,
  formatGroupMemberRole,
  formatNumber,
  formatPersonalPlanningLongDate,
  formatPersonalPlanningTaskInterval,
  formatPersonalPlanningTechnicianName,
  formatPeriodLabel,
  formatTicketDisplayNumber,
  formatTooltipPeriod,
  formatUserName,
  getChannelDisplayName,
  getGroupChatAuthorUserId,
  getGroupMemberColorClass,
  getInitialReportsView,
  getOverviewOverdueTotal,
  getUserGroupIds,
  groupPersonalPlanningTasksByDate,
  isUserMemberOfGroup,
  mapGroupChatMessageSnapshot,
  parsePlanningDateTime,
  sortPersonalTickets,
} from './reports-page.helpers';
import type {
  GroupChatMessage,
  PeriodPreset,
  PersonalEquipmentItem,
  PersonalTicketSort,
  ReportsFilterState,
  ReportsPageProps,
  ReportsPlanningContext,
  ReportsView,
} from './reports-page.types';

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

const PERSONAL_EQUIPMENT_LIMIT = 8;

const GROUP_TICKET_LIMIT = 8;

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

const EMPTY_OVERVIEW_TOTALS: ReportingOverview['totals'] = {
  assigned: 0,

  closed: 0,

  incidents: 0,

  inProgress: 0,

  open: 0,

  overdue: 0,

  pending: 0,

  requests: 0,

  resolved: 0,

  resolutionOverdue: 0,

  responseOverdue: 0,

  total: 0,

  unassigned: 0,
};

export function ReportsPage({ session }: ReportsPageProps) {
  const [activeView, setActiveView] = useState<ReportsView>(() =>
    getInitialReportsView(),
  );

  const [planningContext, setPlanningContext] =
    useState<ReportsPlanningContext | null>(null);

  const [isGroupChatExpanded, setIsGroupChatExpanded] = useState(false);

  const [planningTasks, setPlanningTasks] = useState<PlanningTask[]>([]);

  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<ReportsFilterState>(INITIAL_FILTERS);

  const [isLoading, setIsLoading] = useState(true);

  const [overview, setOverview] = useState<ReportingOverview | null>(null);

  const [breakdown, setBreakdown] = useState<ReportingBreakdown | null>(null);

  const [personalTickets, setPersonalTickets] = useState<
    TicketSummarySnapshot[]
  >([]);

  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState('');

  const groupSelectorTrackRef = useRef<HTMLDivElement | null>(null);

  const [groupSelectorScrollState, setGroupSelectorScrollState] = useState({
    canScrollLeft: false,

    canScrollRight: false,
  });

  const [groupChatDraft, setGroupChatDraft] = useState('');

  const [groupChatMessages, setGroupChatMessages] = useState<
    GroupChatMessage[]
  >([]);

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
        const reportingFilters = buildReportingFilters(nextFilters);

        const [
          nextOverview,

          nextBreakdown,

          nextPersonalTickets,

          nextCatalog,

          nextPlanningTasks,

          nextUsers,
        ] = await Promise.all([
          fetchReportingOverview(session.accessToken, reportingFilters),

          fetchReportingBreakdown(session.accessToken, reportingFilters),

          searchTickets(session.accessToken, {
            includeArchived: false,
          }),

          fetchReferentialCatalog(),

          session.user.role === 'DEMANDEUR'
            ? Promise.resolve([])
            : fetchPlanningTasks(session.accessToken).catch(() => []),

          session.user.role === 'DEMANDEUR'
            ? Promise.resolve([])
            : fetchUserDirectory(session.accessToken),
        ]);

        setOverview(nextOverview);

        setBreakdown(nextBreakdown);

        setPersonalTickets(nextPersonalTickets);

        setCatalog(nextCatalog);

        setPlanningTasks(nextPlanningTasks);

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
    function showDashboardView(): void {
      setPlanningContext(null);
      setActiveView('DASHBOARD');
    }

    window.addEventListener('reports:show-dashboard', showDashboardView);

    return () => {
      window.removeEventListener('reports:show-dashboard', showDashboardView);
    };
  }, []);

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

  const categoryWidgetItems = useMemo(
    () => breakdown?.ticketsByCategory ?? [],

    [breakdown],
  );

  const channelWidgetItems = useMemo(
    () =>
      (breakdown?.ticketsByChannel ?? []).map((item) => ({
        ...item,

        name: getChannelDisplayName(item, catalog),
      })),

    [breakdown, catalog],
  );

  const agentWidgetItems = useMemo(
    () => breakdown?.ticketsByAgent ?? [],

    [breakdown],
  );

  const overviewTotals = overview?.totals ?? EMPTY_OVERVIEW_TOTALS;

  const overdueTotal = getOverviewOverdueTotal(overviewTotals);

  const timelineItems = breakdown?.ticketActivityTimeline ?? [];

  const statusDistributionItems = useMemo(
    () => buildStatusDistributionItems(breakdown?.ticketsByStatus ?? []),

    [breakdown],
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

  const personalEquipment = useMemo<PersonalEquipmentItem[]>(() => {
    const ciTypesById = new Map(
      catalog.ciTypes.map((ciType) => [ciType.id, ciType.name]),
    );

    return catalog.cis
      .filter((ci) => ci.assignedUserId === session.user.id)
      .map((ci) => ({
        displayId: formatEquipmentIdentifier(ci),
        id: ci.id,
        name: ci.name,
        serialNumber: ci.serialNumber ?? 'Non renseigne',
        type: ciTypesById.get(ci.ciTypeId) ?? 'Non renseigne',
      }));
  }, [catalog.cis, catalog.ciTypes, session.user.id]);

  const assignedToMeTickets = useMemo(
    () =>
      buildPersonalTicketPreview(
        personalTickets,

        (ticket) => ticket.assignedToUserId === session.user.id,
      ),

    [personalTickets, session.user.id],
  );

  const requesterTickets = useMemo(
    () =>
      buildPersonalTicketPreview(
        personalTickets,

        (ticket) =>
          (ticket.requestedForUserId ?? ticket.createdByUserId) ===
          session.user.id,
      ),

    [personalTickets, session.user.id],
  );

  const currentUserSummary = useMemo(
    () => users.find((user) => user.id === session.user.id) ?? null,

    [session.user.id, users],
  );

  const availableReportGroups = useMemo(() => {
    const currentUserGroupIds = currentUserSummary
      ? getUserGroupIds(currentUserSummary)
      : [];

    return catalog.groups.filter((group) =>
      currentUserGroupIds.includes(group.id),
    );
  }, [catalog.groups, currentUserSummary]);

  const updateGroupSelectorScrollState = useCallback(() => {
    const track = groupSelectorTrackRef.current;

    if (!track) {
      setGroupSelectorScrollState({
        canScrollLeft: false,

        canScrollRight: false,
      });

      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;

    setGroupSelectorScrollState({
      canScrollLeft: track.scrollLeft > 2,

      canScrollRight: track.scrollLeft < maxScrollLeft - 2,
    });
  }, []);

  const scrollGroupSelector = useCallback(
    (direction: 'LEFT' | 'RIGHT') => {
      const track = groupSelectorTrackRef.current;

      if (!track) {
        return;
      }

      const groupItems = Array.from(
        track.querySelectorAll<HTMLElement>('.group-view-selector-item'),
      );

      const currentScrollLeft = track.scrollLeft;

      const targetItem =
        direction === 'RIGHT'
          ? groupItems.find(
              (item) =>
                item.offsetLeft + item.offsetWidth >
                currentScrollLeft + track.clientWidth + 1,
            )
          : groupItems
              .slice()
              .reverse()
              .find((item) => item.offsetLeft < currentScrollLeft - 1);

      const maxScrollLeft = track.scrollWidth - track.clientWidth;

      const nextScrollLeft =
        direction === 'RIGHT'
          ? (targetItem?.offsetLeft ?? maxScrollLeft)
          : Math.max(
              0,
              targetItem
                ? targetItem.offsetLeft +
                    targetItem.offsetWidth -
                    track.clientWidth
                : 0,
            );

      track.scrollTo({
        behavior: 'smooth',

        left: Math.min(Math.max(nextScrollLeft, 0), maxScrollLeft),
      });
    },

    [],
  );

  useEffect(() => {
    if (activeView !== 'GROUP') {
      setGroupSelectorScrollState({
        canScrollLeft: false,

        canScrollRight: false,
      });

      return;
    }

    updateGroupSelectorScrollState();

    const animationFrameId = window.requestAnimationFrame(
      updateGroupSelectorScrollState,
    );

    const track = groupSelectorTrackRef.current;

    if (!track) {
      window.cancelAnimationFrame(animationFrameId);

      return;
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateGroupSelectorScrollState);

    resizeObserver?.observe(track);

    window.addEventListener('resize', updateGroupSelectorScrollState);

    return () => {
      window.cancelAnimationFrame(animationFrameId);

      resizeObserver?.disconnect();

      window.removeEventListener('resize', updateGroupSelectorScrollState);
    };
  }, [
    activeView,
    availableReportGroups.length,
    updateGroupSelectorScrollState,
  ]);

  useEffect(() => {
    if (availableReportGroups.length === 0) {
      if (selectedGroupId) {
        setSelectedGroupId('');
      }

      return;
    }

    if (!availableReportGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(availableReportGroups[0].id);
    }
  }, [availableReportGroups, selectedGroupId]);

  useEffect(() => {
    if (activeView !== 'GROUP' || !selectedGroupId) {
      setGroupChatMessages([]);

      return;
    }

    let isCancelled = false;

    async function loadGroupChatMessages(): Promise<void> {
      try {
        const nextMessages = await fetchGroupChatMessages(
          session.accessToken,
          selectedGroupId,
        );

        if (!isCancelled) {
          setGroupChatMessages(nextMessages.map(mapGroupChatMessageSnapshot));
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement du chat de groupe',
          );
        }
      }
    }

    void loadGroupChatMessages();

    const intervalId = window.setInterval(
      () => void loadGroupChatMessages(),
      10000,
    );

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeView, selectedGroupId, session.accessToken]);

  const selectedReportGroup = useMemo(
    () =>
      availableReportGroups.find((group) => group.id === selectedGroupId) ??
      null,

    [availableReportGroups, selectedGroupId],
  );

  const groupTickets = useMemo(
    () =>
      personalTickets.filter(
        (ticket) =>
          !ticket.archivedAt && ticket.assignmentGroupId === selectedGroupId,
      ),

    [personalTickets, selectedGroupId],
  );

  const unassignedGroupTickets = useMemo(
    () => groupTickets.filter((ticket) => !ticket.assignedToUserId),

    [groupTickets],
  );

  const groupMembers = useMemo(
    () =>
      technicians.filter((technician) =>
        isUserMemberOfGroup(technician, selectedGroupId),
      ),

    [selectedGroupId, technicians],
  );

  const groupPlanningTasks = useMemo(
    () => planningTasks.filter((task) => task.groupId === selectedGroupId),

    [planningTasks, selectedGroupId],
  );

  const personalPlanningTasks = useMemo(
    () => planningTasks.filter((task) => task.technicianId === session.user.id),

    [planningTasks, session.user.id],
  );

  async function handlePlanningTaskSave(task: PlanningTask): Promise<void> {
    const payload = {
      description: task.description,

      durationMinutes: task.durationMinutes,

      groupId: task.groupId ?? null,

      start: task.start,

      status: task.status,

      technicianId: task.technicianId,

      title: task.title,
    };

    const existingTask = planningTasks.find(
      (currentTask) => currentTask.id === task.id,
    );

    const savedTask = existingTask
      ? await updatePlanningTask(session.accessToken, task.id, payload)
      : await createPlanningTask(session.accessToken, payload);

    setPlanningTasks((currentTasks) =>
      existingTask
        ? currentTasks.map((currentTask) =>
            currentTask.id === savedTask.id ? savedTask : currentTask,
          )
        : [...currentTasks, savedTask],
    );
  }

  async function handlePlanningTaskDelete(taskId: string): Promise<void> {
    await deletePlanningTask(session.accessToken, taskId);

    setPlanningTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    );
  }

  async function handlePersonalPlanningStatusToggle(
    taskId: string,
  ): Promise<void> {
    const task = planningTasks.find((currentTask) => currentTask.id === taskId);

    if (!task) {
      return;
    }

    const nextTask = {
      ...task,

      status: task.status === 'DONE' ? ('TODO' as const) : ('DONE' as const),
    };

    await handlePlanningTaskSave(nextTask);
  }

  async function handleGroupChatSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const body = groupChatDraft.trim();

    if (!selectedGroupId || !body) {
      return;
    }

    setGroupChatDraft('');

    try {
      const nextMessage = await createGroupChatMessage(
        session.accessToken,
        selectedGroupId,
        body,
      );

      setGroupChatMessages((currentMessages) => [
        ...currentMessages,
        mapGroupChatMessageSnapshot(nextMessage),
      ]);
    } catch (error) {
      setGroupChatDraft(body);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'envoi du message",
      );
    }
  }

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

  if (planningContext) {
    const isGroupPlanning = planningContext.type === 'GROUP';
    const planningGroupId = isGroupPlanning ? planningContext.groupId : null;
    const planningGroupUsers = isGroupPlanning ? groupMembers : technicians;
    const defaultTechnicianId = planningGroupUsers.some(
      (user) => user.id === session.user.id,
    )
      ? session.user.id
      : (planningGroupUsers[0]?.id ?? session.user.id);

    return (
      <PlanningPage
        backLabel={
          isGroupPlanning
            ? 'Retour a la vue groupe'
            : 'Retour a la vue personnelle'
        }
        defaultTechnicianId={defaultTechnicianId}
        groupId={planningGroupId}
        groupUsers={planningGroupUsers}
        onBack={() => setPlanningContext(null)}
        onDeleteTask={handlePlanningTaskDelete}
        onSaveTask={handlePlanningTaskSave}
        onToggleTaskStatus={handlePersonalPlanningStatusToggle}
        session={session}
        tasks={isGroupPlanning ? groupPlanningTasks : personalPlanningTasks}
        technicians={technicians}
        variant={isGroupPlanning ? 'GROUP' : 'PERSONAL'}
      />
    );
  }

  if (isGroupChatExpanded && activeView === 'GROUP' && selectedReportGroup) {
    return (
      <section className="reports-page group-chat-page">
        <GroupChatPanel
          currentUserId={session.user.id}
          draft={groupChatDraft}
          groupMembers={groupMembers}
          isExpanded
          knownUsers={users}
          messages={groupChatMessages}
          onDraftChange={setGroupChatDraft}
          onExpandedChange={setIsGroupChatExpanded}
          onSubmit={handleGroupChatSubmit}
        />
      </section>
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
                value={formatNumber(overviewTotals.total)}
              />

              <DashboardPrimaryKpiCard
                label="Tickets en retard"
                tone="orange"
                value={formatNumber(overdueTotal)}
              />

              <DashboardPrimaryKpiCard
                label="Incidents"
                tone="salmon"
                value={formatNumber(overviewTotals.incidents)}
              />

              <DashboardPrimaryKpiCard
                label="Demandes"
                tone="green"
                value={formatNumber(overviewTotals.requests)}
              />

              <DashboardMiniKpiCard
                label="Tickets en cours"
                tone="mint"
                value={formatNumber(overviewTotals.inProgress)}
              />

              <DashboardMiniKpiCard
                label="Tickets assignes"
                tone="sky"
                value={formatNumber(overviewTotals.assigned)}
              />

              <DashboardMiniKpiCard
                label="Tickets resolus"
                tone="silver"
                value={formatNumber(overviewTotals.resolved)}
              />

              <DashboardMiniKpiCard
                label="Tickets non assignes"
                tone="white"
                value={formatNumber(overviewTotals.unassigned)}
              />

              <DashboardMiniKpiCard
                label="Tickets en attente"
                tone="amber"
                value={formatNumber(overviewTotals.pending)}
              />

              <DashboardMiniKpiCard
                label="Tickets fermes"
                tone="charcoal"
                value={formatNumber(overviewTotals.closed)}
              />
            </div>

            <div className="reports-dashboard-charts">
              <DashboardPanel title="Evolution des tickets">
                <DashboardTimelineChart items={timelineItems} />
              </DashboardPanel>

              <DashboardPanel title="Repartition des statuts">
                <DashboardStatusDistributionChart
                  items={statusDistributionItems}
                />
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
              navigateTo(`/agent/tickets/${ticketId}?from=reports-personal`)
            }
            prioritiesById={personalPrioritiesById}
            title="Assignés à moi"
            tickets={assignedToMeTickets}
            users={users}
          />

          <PersonalTicketPanel
            isLoading={isLoading}
            onOpenTicket={(ticketId) =>
              navigateTo(`/agent/tickets/${ticketId}?from=reports-personal`)
            }
            prioritiesById={personalPrioritiesById}
            title="Mes tickets"
            tickets={requesterTickets}
            users={users}
          />

          <PersonalPlanningPanel
            onOpenPlanning={() => setPlanningContext({ type: 'PERSONAL' })}
            onToggleStatus={handlePersonalPlanningStatusToggle}
            tasks={personalPlanningTasks}
            technicians={technicians}
          />

          <PersonalEquipmentPanel equipment={personalEquipment} />
        </section>
      ) : (
        <section aria-label="Vue groupe" className="group-view">
          <div className="group-view-selector" aria-label="Selection du groupe">
            <button
              aria-label="Voir les groupes precedents"
              className="group-view-selector-arrow"
              disabled={!groupSelectorScrollState.canScrollLeft}
              onClick={() => scrollGroupSelector('LEFT')}
              type="button"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>

            <div
              className="group-view-selector-track"
              onScroll={updateGroupSelectorScrollState}
              ref={groupSelectorTrackRef}
            >
              {availableReportGroups.length === 0 ? (
                <span className="group-view-selector-empty">
                  Aucun groupe disponible
                </span>
              ) : (
                availableReportGroups.map((group) => (
                  <button
                    aria-pressed={selectedGroupId === group.id}
                    className={
                      selectedGroupId === group.id
                        ? 'group-view-selector-item is-active'
                        : 'group-view-selector-item'
                    }
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    type="button"
                  >
                    {group.name}
                  </button>
                ))
              )}
            </div>

            <button
              aria-label="Voir les groupes suivants"
              className="group-view-selector-arrow"
              disabled={!groupSelectorScrollState.canScrollRight}
              onClick={() => scrollGroupSelector('RIGHT')}
              type="button"
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          </div>

          {selectedReportGroup ? (
            <div className="personal-view-grid group-view-grid">
              <GroupTicketPanel
                isLoading={isLoading}
                onOpenTicket={(ticketId) =>
                  navigateTo(`/agent/tickets/${ticketId}?from=reports-group`)
                }
                prioritiesById={personalPrioritiesById}
                showAssignedTo
                title="Tickets assignes au groupe"
                tickets={groupTickets}
                users={users}
              />

              <GroupTicketPanel
                isLoading={isLoading}
                onOpenTicket={(ticketId) =>
                  navigateTo(`/agent/tickets/${ticketId}?from=reports-group`)
                }
                prioritiesById={personalPrioritiesById}
                showAssignedTo={false}
                title="Tickets du groupe non assignes"
                tickets={unassignedGroupTickets}
                users={users}
              />

              <GroupPlanningPanel
                onOpenPlanning={() =>
                  setPlanningContext({
                    groupId: selectedReportGroup.id,

                    type: 'GROUP',
                  })
                }
                onToggleStatus={handlePersonalPlanningStatusToggle}
                tasks={groupPlanningTasks}
                technicians={groupMembers}
              />

              <GroupChatPanel
                currentUserId={session.user.id}
                draft={groupChatDraft}
                groupMembers={groupMembers}
                knownUsers={users}
                messages={groupChatMessages}
                onDraftChange={setGroupChatDraft}
                onExpandedChange={setIsGroupChatExpanded}
                onSubmit={handleGroupChatSubmit}
              />
            </div>
          ) : (
            <p className="reports-empty-view group-view-empty">
              Aucun groupe n'est rattache a votre compte.
            </p>
          )}
        </section>
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

function PersonalEquipmentPanel({
  equipment,
}: {
  equipment: PersonalEquipmentItem[];
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(
    1,

    Math.ceil(equipment.length / PERSONAL_EQUIPMENT_LIMIT),
  );

  const visiblePage = Math.min(page, totalPages);

  const visibleEquipment = equipment.slice(
    (visiblePage - 1) * PERSONAL_EQUIPMENT_LIMIT,

    visiblePage * PERSONAL_EQUIPMENT_LIMIT,
  );

  return (
    <article className="personal-panel personal-equipment-panel">
      <header className="personal-panel-header">
        <h3>Mon équipement</h3>

        <div className="ticket-list-count" aria-live="polite">
          <strong>{equipment.length}</strong>

          <span>équipements</span>
        </div>
      </header>

      <div className="personal-table-scroll">
        <div className="personal-equipment-viewport">
          <table className="personal-ticket-table personal-equipment-table">
            <thead>
              <tr>
                <th>ID</th>

                <th>Nom</th>

                <th>Type</th>

                <th>Numéro de série</th>
              </tr>
            </thead>

            <tbody>
              {visibleEquipment.length === 0 ? (
                <tr className="personal-equipment-empty-row">
                  <td colSpan={4}>Aucun équipement à afficher.</td>
                </tr>
              ) : (
                visibleEquipment.map((item) => (
                  <tr key={item.id}>
                    <td className="personal-ticket-id">{item.displayId}</td>

                    <td>{item.name}</td>

                    <td>{item.type}</td>

                    <td>{item.serialNumber}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <nav
          aria-label="Pagination Mon équipement"
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
    </article>
  );
}

function PersonalPlanningPanel({
  onOpenPlanning,

  onToggleStatus,

  tasks,

  technicians,
}: {
  onOpenPlanning: () => void;

  onToggleStatus: (taskId: string) => Promise<void> | void;

  tasks: PlanningTask[];

  technicians: AdminUserSummary[];
}) {
  const today = new Date();

  const tomorrow = new Date(today);

  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayKey = formatDateInputValue(today);

  const tomorrowKey = formatDateInputValue(tomorrow);

  const visibleTasks = tasks

    .filter((task) => {
      const taskDate = task.start.slice(0, 10);

      return taskDate === todayKey || taskDate === tomorrowKey;
    })

    .sort((first, second) => first.start.localeCompare(second.start));

  const taskGroups = groupPersonalPlanningTasksByDate(visibleTasks);

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
          Aucune tache planifiee aujourd'hui ou demain.
        </p>
      ) : (
        <div className="personal-planning-agenda-scroll">
          <div className="planning-agenda-list personal-planning-agenda-list">
            {taskGroups.map((group) => (
              <section className="planning-agenda-group" key={group.date}>
                <h4
                  className={
                    group.date === todayKey
                      ? 'personal-planning-date is-today'
                      : 'personal-planning-date'
                  }
                >
                  {formatPersonalPlanningLongDate(
                    parsePlanningDateTime(group.tasks[0].start),
                  )}
                </h4>

                {group.tasks.map((task) => (
                  <div
                    className="planning-agenda-row"
                    key={task.id}
                    onClick={onOpenPlanning}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();

                        onOpenPlanning();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="planning-agenda-time">
                      {formatPersonalPlanningTaskInterval(task)}
                    </span>

                    <span>{task.title}</span>

                    <span>
                      {formatPersonalPlanningTechnicianName(
                        task.technicianId,

                        technicians,
                      )}
                    </span>

                    <button
                      className={[
                        'planning-status-toggle',

                        'planning-agenda-status-toggle',

                        task.status === 'DONE'
                          ? 'planning-status-toggle--done'
                          : '',
                      ]

                        .filter(Boolean)

                        .join(' ')}
                      onClick={(event) => {
                        event.stopPropagation();

                        onToggleStatus(task.id);
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                      }}
                      type="button"
                    >
                      {task.status === 'DONE' ? 'Fait' : 'A faire'}
                    </button>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function GroupTicketPanel({
  isLoading,

  onOpenTicket,

  prioritiesById,

  showAssignedTo = true,

  tickets,

  title,

  users,
}: {
  isLoading: boolean;

  onOpenTicket: (ticketId: string) => void;

  prioritiesById: Map<string, { level: number; name: string }>;

  showAssignedTo?: boolean;

  tickets: TicketSummarySnapshot[];

  title: string;

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
    Math.ceil(sortedTickets.length / GROUP_TICKET_LIMIT),
  );

  const visiblePage = Math.min(page, totalPages);

  const visibleTickets = sortedTickets.slice(
    (visiblePage - 1) * GROUP_TICKET_LIMIT,

    visiblePage * GROUP_TICKET_LIMIT,
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
    <article className="personal-panel personal-ticket-panel group-ticket-panel">
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

      {isLoading ? (
        <p className="personal-panel-empty">Chargement des tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="personal-panel-empty">Aucun ticket a afficher.</p>
      ) : (
        <div className="personal-table-scroll">
          <div className="personal-ticket-viewport">
            <table className="personal-ticket-table group-ticket-table">
              <thead>
                <tr>
                  <th>ID</th>

                  <th>Titre</th>

                  <th>Statut</th>

                  <th>Demandeur</th>

                  {showAssignedTo ? <th>Assigne a</th> : null}
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

                    {showAssignedTo ? (
                      <td>
                        {formatAssignedUserName(ticket.assignedToUserId, users)}
                      </td>
                    ) : null}
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
              Precedent
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

function GroupPlanningPanel({
  onOpenPlanning,

  onToggleStatus,

  tasks,

  technicians,
}: {
  onOpenPlanning: () => void;

  onToggleStatus: (taskId: string) => Promise<void> | void;

  tasks: PlanningTask[];

  technicians: AdminUserSummary[];
}) {
  const today = new Date();

  const tomorrow = new Date(today);

  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayKey = formatDateInputValue(today);

  const tomorrowKey = formatDateInputValue(tomorrow);

  const visibleTasks = tasks

    .filter((task) => {
      const taskDate = task.start.slice(0, 10);

      return taskDate === todayKey || taskDate === tomorrowKey;
    })

    .sort((first, second) => first.start.localeCompare(second.start));

  const taskGroups = groupPersonalPlanningTasksByDate(visibleTasks);

  return (
    <article className="personal-panel personal-planning-panel group-planning-panel">
      <header className="personal-panel-header">
        <h3>Planning de groupe</h3>

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
          Aucune tache de groupe aujourd'hui ou demain.
        </p>
      ) : (
        <div className="personal-planning-agenda-scroll">
          <div className="planning-agenda-list personal-planning-agenda-list">
            {taskGroups.map((group) => (
              <section className="planning-agenda-group" key={group.date}>
                <h4 className="personal-planning-date">
                  {formatPersonalPlanningLongDate(
                    parsePlanningDateTime(group.tasks[0].start),
                  )}
                </h4>

                {group.tasks.map((task) => (
                  <div
                    className="planning-agenda-row"
                    key={task.id}
                    onClick={onOpenPlanning}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();

                        onOpenPlanning();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="planning-agenda-time">
                      {formatPersonalPlanningTaskInterval(task)}
                    </span>

                    <span>{task.title}</span>

                    <span>
                      {formatPersonalPlanningTechnicianName(
                        task.technicianId,

                        technicians,
                      )}
                    </span>

                    <button
                      className={[
                        'planning-status-toggle',

                        'planning-agenda-status-toggle',

                        task.status === 'DONE'
                          ? 'planning-status-toggle--done'
                          : '',
                      ]

                        .filter(Boolean)

                        .join(' ')}
                      onClick={(event) => {
                        event.stopPropagation();

                        onToggleStatus(task.id);
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                      }}
                      type="button"
                    >
                      {task.status === 'DONE' ? 'Fait' : 'A faire'}
                    </button>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function GroupChatPanel({
  currentUserId,

  draft,

  groupMembers,

  isExpanded = false,

  knownUsers,

  messages,

  onDraftChange,

  onExpandedChange,

  onSubmit,
}: {
  currentUserId: string;

  draft: string;

  groupMembers: AdminUserSummary[];

  isExpanded?: boolean;

  knownUsers: AdminUserSummary[];

  messages: GroupChatMessage[];

  onDraftChange: (value: string) => void;

  onExpandedChange?: (value: boolean) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
}) {
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const [isMembersPanelOpen, setIsMembersPanelOpen] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const messagesElement = messagesRef.current;

    if (!messagesElement) {
      return;
    }

    messagesElement.scrollTop = messagesElement.scrollHeight;
  }, [messages.length]);

  function handleMemberInfoOpen(memberId: string): void {
    setSelectedMemberId(memberId);
  }

  return (
    <article
      className={[
        'personal-panel',
        'group-chat-panel',
        isExpanded ? 'is-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="personal-panel-header">
        <h3>Chat box de groupe</h3>

        <div className="group-chat-header-actions">
          <button
            aria-expanded={isMembersPanelOpen}
            aria-label="Afficher les membres du groupe"
            className="group-chat-members-toggle"
            onClick={() => setIsMembersPanelOpen((isOpen) => !isOpen)}
            type="button"
          >
            <Users size={16} />

            <span>Voir le groupe</span>
          </button>

          <button
            aria-label={
              isExpanded ? 'Reduire la chatbox' : 'Agrandir la chatbox'
            }
            className="group-chat-expand-toggle"
            onClick={() => onExpandedChange?.(!isExpanded)}
            type="button"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      <div
        className={[
          'group-chat-content',
          isMembersPanelOpen ? 'has-members-panel' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className="group-chat-messages"
          aria-live="polite"
          ref={messagesRef}
        >
          {messages.length === 0 ? (
            <div className="personal-panel-empty group-chat-empty">
              Aucun message pour ce groupe.
            </div>
          ) : (
            messages.map((message) => {
              const authorUserId = getGroupChatAuthorUserId(
                message,
                groupMembers,
              );
              const author = authorUserId
                ? knownUsers.find((user) => user.id === authorUserId)
                : null;
              const isOwnMessage = authorUserId === currentUserId;
              const colorClass = getGroupMemberColorClass(
                authorUserId,
                groupMembers,
                currentUserId,
              );
              const authorName = author
                ? formatUserName(author)
                : message.authorName;

              return (
                <div
                  className={[
                    'group-chat-message-row',
                    isOwnMessage ? 'is-own' : '',
                    colorClass,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={message.id}
                >
                  {!isOwnMessage ? (
                    <span className="group-chat-avatar">
                      {formatGroupChatInitials(authorName)}
                    </span>
                  ) : null}

                  <div className="group-chat-message">
                    <div className="group-chat-message-meta">
                      <strong>{isOwnMessage ? 'Vous' : authorName}</strong>

                      <span>{formatGroupChatTimestamp(message.createdAt)}</span>
                    </div>

                    <p>{message.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {isMembersPanelOpen ? (
          <aside className="group-chat-members-panel">
            {selectedMemberId ? (
              <GroupChatMemberInfo
                currentUserId={currentUserId}
                member={
                  groupMembers.find(
                    (member) => member.id === selectedMemberId,
                  ) ?? null
                }
                onBack={() => setSelectedMemberId(null)}
              />
            ) : (
              <>
                <header>
                  <strong>{groupMembers.length} membres</strong>
                </header>

                <div className="group-chat-members-list">
                  {groupMembers.map((member) => {
                    const isCurrentUser = member.id === currentUserId;
                    const memberName = formatUserName(member);

                    return (
                      <button
                        className={[
                          'group-chat-member-item',
                          isCurrentUser ? 'is-own' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        key={member.id}
                        onClick={() => handleMemberInfoOpen(member.id)}
                        type="button"
                      >
                        <span className="group-chat-avatar">
                          {formatGroupChatInitials(memberName)}
                        </span>

                        <span>
                          <strong>{isCurrentUser ? 'Vous' : memberName}</strong>

                          <small>{formatGroupMemberRole(member.role)}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </aside>
        ) : null}
      </div>

      <form className="group-chat-form" onSubmit={onSubmit}>
        <input
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ecrire un message au groupe..."
          value={draft}
        />

        <button className="primary-button" disabled={!draft.trim()}>
          Envoyer
        </button>
      </form>
    </article>
  );
}

function GroupChatMemberInfo({
  currentUserId,

  member,

  onBack,
}: {
  currentUserId: string;

  member: AdminUserSummary | null;

  onBack: () => void;
}) {
  if (!member) {
    return (
      <>
        <header className="group-chat-member-info-header">
          <button onClick={onBack} type="button">
            <ChevronLeft size={16} />
          </button>

          <strong>Info du membre</strong>
        </header>

        <p className="personal-panel-empty group-chat-empty">
          Membre introuvable.
        </p>
      </>
    );
  }

  const isCurrentUser = member.id === currentUserId;
  const memberName = formatUserName(member);

  return (
    <>
      <header className="group-chat-member-info-header">
        <button aria-label="Retour aux membres" onClick={onBack} type="button">
          <ChevronLeft size={16} />
        </button>

        <strong>Info du membre</strong>
      </header>

      <div className="group-chat-member-info">
        <span className="group-chat-avatar group-chat-member-info-avatar">
          {formatGroupChatInitials(memberName)}
        </span>

        <h4>{isCurrentUser ? 'Vous' : memberName}</h4>

        <p>{formatGroupMemberRole(member.role)}</p>

        <div className="group-chat-member-info-detail">
          <span>Email</span>

          <strong>{member.email ?? 'Non renseigne'}</strong>
        </div>
      </div>
    </>
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

function DashboardStatusDistributionChart({
  items,
}: {
  items: Array<{
    color: string;

    count: number;

    key: 'closed' | 'open' | 'pending' | 'progress' | 'resolved';

    label: string;
  }>;
}) {
  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="reports-status-distribution-chart">
      <div className="reports-chart-legend">
        {items.map((item) => (
          <span key={item.key}>
            <i
              className={`reports-status-key reports-status-key--${item.key}`}
            />

            {item.label}
          </span>
        ))}
      </div>

      <div className="reports-status-distribution-bars">
        {items.map((item) => (
          <div className="reports-status-distribution-row" key={item.key}>
            <div className="reports-status-distribution-label">
              <i
                className={`reports-status-key reports-status-key--${item.key}`}
              />

              <span>{item.label}</span>
            </div>

            <div className="reports-status-distribution-track">
              <i
                className={`reports-status-distribution-fill reports-status-distribution-fill--${item.key}`}
                style={
                  {
                    width: `${(item.count / maxCount) * 100}%`,
                  } as CSSProperties
                }
              />
            </div>

            <strong>{item.count}</strong>
          </div>
        ))}
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
