import {
  type FormEvent,
  type ReactNode,
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
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { ProfileAvatar } from '../../components/ui/default-profile-avatar';
import { isAdminRole, isSupportRole } from '../../domain/auth/user-role';
import { AppPagination } from '../components/app-pagination';

import type { PlanningTask } from '../../domain/planning/planning-task';

import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';

import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';

import {
  translatePriority,
  translateTicketStatus,
} from '../../domain/i18n/ticketing-labels';

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

import type { ReportingOverview } from '../../infrastructure/api/reporting-api';

import { fetchReportingOverview } from '../../infrastructure/api/reporting-api';

import { searchTickets } from '../../infrastructure/api/ticketing-api';

import { navigateTo } from '../../infrastructure/routing/browser-router';
import {
  getDefaultTicketSortPreference,
  subscribeToDefaultSortPreferences,
} from '../preferences/default-sort-preferences';

import { PlanningPage } from './planning-page';
import { formatEquipmentIdentifier } from './park-page.helpers';
import {
  buildDashboardTimelineItems,
  buildSlaDistributionItems,
  buildSlaDistributionItemsFromTotals,
  buildTicketsByAgentItems,
  buildTicketsByCategoryItems,
  buildTicketsByChannelItems,
  buildTicketsByGroupItems,
  buildTicketsByPriorityItems,
  buildTicketsByTypeItems,
  DashboardBarWidget,
  DashboardDonutWidget,
  DashboardKpiCard,
  DashboardLookupDialog,
  DashboardPanel,
  DashboardTimelineChart,
  filterTicketsByActivityMode,
  filterTicketsForDashboard,
  INITIAL_DASHBOARD_ACTIVITY_MODES,
  type DashboardActivityChartKey,
} from './reports-page.dashboard';
import {
  applyPeriodPreset,
  buildPersonalTicketPreview,
  buildReportingFilters,
  formatAssignedUserName,
  formatDateInputValue,
  formatGroupChatTimestamp,
  formatGroupMemberRole,
  formatNumber,
  formatPersonalPlanningLongDate,
  formatPersonalPlanningTaskInterval,
  formatPersonalPlanningTechnicianName,
  formatTicketDisplayNumber,
  formatUserName,
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
  PersonalTicketColumn,
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

  periodPreset: 'THIS_YEAR',

  priorityId: '',

  status: '',

  to: '',

  type: '',
};

const REQUEST_DEFAULT_CATEGORY_NAME = 'Demande';

const PERSONAL_TICKET_LIMIT = 8;

const PERSONAL_EQUIPMENT_LIMIT = 8;

const GROUP_TICKET_LIMIT = 8;

const ASSIGNED_TO_ME_COLUMNS: PersonalTicketColumn[] = [
  'ID',
  'TITLE',
  'STATUS',
  'PRIORITY',
  'REQUESTER',
];

const REQUESTER_TICKET_COLUMNS: PersonalTicketColumn[] = [
  'ID',
  'TITLE',
  'STATUS',
  'CATEGORY',
  'PRIORITY',
];

const PERSONAL_TICKET_COLUMN_LABELS: Record<PersonalTicketColumn, string> = {
  ASSIGNED_TO: 'Assigné à',
  CATEGORY: 'Catégorie',
  ID: 'ID',
  PRIORITY: 'Priorité',
  REQUESTER: 'Demandeur',
  STATUS: 'Statut',
  TITLE: 'Titre',
};

const PERSONAL_TICKET_COLUMN_CLASSNAMES: Record<PersonalTicketColumn, string> =
  {
    ASSIGNED_TO: 'personal-ticket-col--assigned-to',
    CATEGORY: 'personal-ticket-col--category',
    ID: 'personal-ticket-col--id',
    PRIORITY: 'personal-ticket-col--priority',
    REQUESTER: 'personal-ticket-col--requester',
    STATUS: 'personal-ticket-col--status',
    TITLE: 'personal-ticket-col--title',
  };

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

  slaTtrOnTime: 0,

  slaTtrOverdue: 0,

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

  const [defaultTicketSort, setDefaultTicketSort] =
    useState<PersonalTicketSort>(() =>
      getDefaultTicketSortPreference(session.user.id),
    );

  const [dashboardActivityModes, setDashboardActivityModes] = useState(
    INITIAL_DASHBOARD_ACTIVITY_MODES,
  );

  const [dashboardLookup, setDashboardLookup] = useState<
    'AGENT' | 'GROUP' | null
  >(null);

  const [isLoading, setIsLoading] = useState(true);

  const [overview, setOverview] = useState<ReportingOverview | null>(null);

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

  useEffect(() => {
    function applyDefaultTicketSort(): void {
      setDefaultTicketSort(getDefaultTicketSortPreference(session.user.id));
    }

    applyDefaultTicketSort();

    return subscribeToDefaultSortPreferences(
      session.user.id,
      applyDefaultTicketSort,
    );
  }, [session.user.id]);

  const technicians = useMemo(
    () => users.filter((user) => user.isActive && isSupportRole(user.role)),

    [users],
  );

  const isRestrictedAgentReporting = !isAdminRole(session.user.role);

  const effectiveDashboardFilters = useMemo<ReportsFilterState>(
    () =>
      isRestrictedAgentReporting
        ? {
            ...filters,
            assignedToUserId: session.user.id,
          }
        : filters,

    [filters, isRestrictedAgentReporting, session.user.id],
  );

  const loadReports = useCallback(
    async (nextFilters: ReportsFilterState): Promise<void> => {
      setIsLoading(true);

      setErrorMessage(null);

      try {
        const reportingFilters = buildReportingFilters(nextFilters);

        if (session.user.role === 'DEMANDEUR') {
          const [nextPersonalTickets, nextCatalog, nextUsers] =
            await Promise.all([
              searchTickets(session.accessToken, {
                includeArchived: false,
              }),

              fetchReferentialCatalog(session.accessToken),

              fetchUserDirectory(session.accessToken),
            ]);

          setOverview(null);

          setPersonalTickets(nextPersonalTickets);

          setCatalog(nextCatalog);

          setPlanningTasks([]);

          setUsers(nextUsers);

          return;
        }

        const [
          nextOverview,

          nextPersonalTickets,

          nextCatalog,

          nextPlanningTasks,

          nextUsers,
        ] = await Promise.all([
          fetchReportingOverview(session.accessToken, reportingFilters),

          searchTickets(session.accessToken, {
            includeArchived: false,
            includeClosed: isRestrictedAgentReporting,
          }),

          fetchReferentialCatalog(session.accessToken),

          fetchPlanningTasks(session.accessToken).catch(() => []),

          fetchUserDirectory(session.accessToken),
        ]);

        setOverview(nextOverview);

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

    [isRestrictedAgentReporting, session],
  );

  useEffect(() => {
    setFilters((currentFilters) => applyPeriodPreset(currentFilters));
  }, []);

  useEffect(() => {
    void loadReports(effectiveDashboardFilters);
  }, [effectiveDashboardFilters, loadReports]);

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

          periodPreset: 'CUSTOM',
        };
      }

      return {
        ...currentFilters,

        [field]: value,
      };
    });
  }

  function handleDashboardActivityModeChange(
    chartKey: DashboardActivityChartKey,

    isActive: boolean,
  ): void {
    setDashboardActivityModes((currentModes) => ({
      ...currentModes,

      [chartKey]: isActive ? 'ACTIVE' : 'ALL',
    }));
  }

  const dashboardFilteredTickets = useMemo(
    () => filterTicketsForDashboard(personalTickets, effectiveDashboardFilters),

    [effectiveDashboardFilters, personalTickets],
  );

  const getDashboardTicketsForChart = useCallback(
    (chartKey: DashboardActivityChartKey) =>
      filterTicketsByActivityMode(
        dashboardFilteredTickets,
        dashboardActivityModes[chartKey],
      ),

    [dashboardActivityModes, dashboardFilteredTickets],
  );

  const categoryWidgetItems = useMemo(
    () =>
      buildTicketsByCategoryItems(
        getDashboardTicketsForChart('CATEGORY'),
        catalog,
      ),

    [catalog, getDashboardTicketsForChart],
  );

  const agentWidgetItems = useMemo(
    () => buildTicketsByAgentItems(getDashboardTicketsForChart('AGENT'), users),

    [getDashboardTicketsForChart, users],
  );

  const groupWidgetItems = useMemo(
    () =>
      buildTicketsByGroupItems(getDashboardTicketsForChart('GROUP'), catalog),

    [catalog, getDashboardTicketsForChart],
  );

  const priorityWidgetItems = useMemo(
    () =>
      buildTicketsByPriorityItems(
        getDashboardTicketsForChart('PRIORITY'),
        catalog,
      ),

    [catalog, getDashboardTicketsForChart],
  );

  const sourceWidgetItems = useMemo(
    () =>
      buildTicketsByChannelItems(
        getDashboardTicketsForChart('SOURCE'),
        catalog,
      ),

    [catalog, getDashboardTicketsForChart],
  );

  const typeWidgetItems = useMemo(
    () => buildTicketsByTypeItems(getDashboardTicketsForChart('TYPE')),

    [getDashboardTicketsForChart],
  );

  const overviewTotals = overview?.totals ?? EMPTY_OVERVIEW_TOTALS;

  const overdueTotal = getOverviewOverdueTotal(overviewTotals);
  const canViewOperationalBreakdowns = session.user.role !== 'AGENT';

  const slaWidgetItems = useMemo(
    () =>
      dashboardActivityModes.SLA === 'ALL'
        ? buildSlaDistributionItemsFromTotals(overviewTotals)
        : buildSlaDistributionItems(getDashboardTicketsForChart('SLA')),

    [dashboardActivityModes.SLA, getDashboardTicketsForChart, overviewTotals],
  );

  const timelineItems = useMemo(
    () =>
      buildDashboardTimelineItems(
        dashboardFilteredTickets,
        effectiveDashboardFilters,
      ),

    [dashboardFilteredTickets, effectiveDashboardFilters],
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

  const personalCategoriesById = useMemo(
    () =>
      new Map(catalog.categories.map((category) => [category.id, category])),

    [catalog.categories],
  );

  const dashboardCategoryOptions = useMemo(
    () =>
      catalog.categories.filter(
        (category) => category.name !== REQUEST_DEFAULT_CATEGORY_NAME,
      ),

    [catalog.categories],
  );

  const selectedDashboardAgent = useMemo(
    () =>
      users.find(
        (user) => user.id === effectiveDashboardFilters.assignedToUserId,
      ) ?? null,

    [effectiveDashboardFilters.assignedToUserId, users],
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
        model: ci.model ?? 'Non renseigne',
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

  const dashboardGroupOptions = useMemo(
    () => (isRestrictedAgentReporting ? availableReportGroups : catalog.groups),

    [availableReportGroups, catalog.groups, isRestrictedAgentReporting],
  );

  const selectedDashboardGroup = useMemo(
    () =>
      dashboardGroupOptions.find(
        (group) => group.id === filters.assignmentGroupId,
      ) ?? null,

    [dashboardGroupOptions, filters.assignmentGroupId],
  );

  useEffect(() => {
    if (
      !isRestrictedAgentReporting ||
      !currentUserSummary ||
      !filters.assignmentGroupId
    ) {
      return;
    }

    if (
      availableReportGroups.some(
        (group) => group.id === filters.assignmentGroupId,
      )
    ) {
      return;
    }

    setFilters((currentFilters) =>
      currentFilters.assignmentGroupId === filters.assignmentGroupId
        ? { ...currentFilters, assignmentGroupId: '' }
        : currentFilters,
    );
  }, [
    availableReportGroups,
    currentUserSummary,
    filters.assignmentGroupId,
    isRestrictedAgentReporting,
  ]);

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

  if (session.user.role === 'DEMANDEUR') {
    return (
      <section className="reports-page">
        {errorMessage ? (
          <p className="referentials-error">{errorMessage}</p>
        ) : null}

        <section
          aria-label="Accueil demandeur"
          className="personal-view-grid requester-home-grid"
        >
          <PersonalTicketPanel
            categoriesById={personalCategoriesById}
            columns={REQUESTER_TICKET_COLUMNS}
            defaultSort={defaultTicketSort}
            isLoading={isLoading}
            onOpenTicket={(ticketId) =>
              navigateTo(`/agent/tickets/${ticketId}?from=reports-personal`)
            }
            prioritiesById={personalPrioritiesById}
            title="Mes tickets demandés"
            tickets={requesterTickets}
            users={users}
          />

          <PersonalEquipmentPanel equipment={personalEquipment} />
        </section>
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
          <form
            className="reports-filter-band reports-filter-band--dashboard"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="reports-filters">
              <label className="field">
                <span>Periode</span>

                <select
                  onChange={(event) =>
                    handleFilterChange('periodPreset', event.target.value)
                  }
                  value={filters.periodPreset}
                >
                  <option value="TODAY">Aujourd'hui</option>

                  <option value="THIS_WEEK">Cette semaine</option>

                  <option value="THIS_MONTH">Ce mois</option>

                  <option value="THIS_YEAR">Cette annee</option>

                  <option value="CUSTOM">Personnalise</option>
                </select>
              </label>

              {filters.periodPreset === 'CUSTOM' ? (
                <>
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
                </>
              ) : null}

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
                <span>Categorie</span>

                <select
                  onChange={(event) =>
                    handleFilterChange('categoryId', event.target.value)
                  }
                  value={filters.categoryId}
                >
                  <option value="">Toutes</option>

                  {dashboardCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Agent</span>

                <div className="incident-lookup-field">
                  <input
                    disabled={isRestrictedAgentReporting}
                    readOnly
                    value={
                      isRestrictedAgentReporting
                        ? selectedDashboardAgent
                          ? formatUserName(selectedDashboardAgent)
                          : 'Moi uniquement'
                        : selectedDashboardAgent
                          ? formatUserName(selectedDashboardAgent)
                          : 'Tous'
                    }
                  />

                  {filters.assignedToUserId && !isRestrictedAgentReporting ? (
                    <button
                      aria-label="Retirer l'agent"
                      onClick={() => handleFilterChange('assignedToUserId', '')}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  ) : null}

                  <button
                    aria-label="Choisir un agent"
                    disabled={isRestrictedAgentReporting}
                    onClick={() => setDashboardLookup('AGENT')}
                    type="button"
                  >
                    <Search size={17} />
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Groupe</span>

                <div className="incident-lookup-field">
                  <input
                    disabled={dashboardGroupOptions.length === 0}
                    readOnly
                    value={
                      dashboardGroupOptions.length === 0
                        ? 'Aucun groupe'
                        : (selectedDashboardGroup?.name ?? 'Tous')
                    }
                  />

                  {filters.assignmentGroupId ? (
                    <button
                      aria-label="Retirer le groupe"
                      onClick={() =>
                        handleFilterChange('assignmentGroupId', '')
                      }
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  ) : null}

                  <button
                    aria-label="Choisir un groupe"
                    disabled={dashboardGroupOptions.length === 0}
                    onClick={() => setDashboardLookup('GROUP')}
                    type="button"
                  >
                    <Search size={17} />
                  </button>
                </div>
              </label>
            </div>
          </form>

          {dashboardLookup ? (
            <DashboardLookupDialog
              groups={
                dashboardLookup === 'GROUP'
                  ? dashboardGroupOptions
                  : catalog.groups
              }
              kind={dashboardLookup}
              onClose={() => setDashboardLookup(null)}
              onSelect={(id) => {
                handleFilterChange(
                  dashboardLookup === 'AGENT'
                    ? 'assignedToUserId'
                    : 'assignmentGroupId',
                  id,
                );
                setDashboardLookup(null);
              }}
              selectedId={
                dashboardLookup === 'AGENT'
                  ? filters.assignedToUserId
                  : filters.assignmentGroupId
              }
              users={technicians}
            />
          ) : null}

          {errorMessage ? (
            <p className="referentials-error">{errorMessage}</p>
          ) : null}

          <section className="reports-dashboard">
            <div className="reports-dashboard-kpis">
              <DashboardKpiCard
                label="Tickets total"
                tone="blue"
                value={formatNumber(overviewTotals.total)}
              />

              <DashboardKpiCard
                label="Nouveaux"
                tone="sky"
                value={formatNumber(overviewTotals.open)}
              />

              <DashboardKpiCard
                label="En cours"
                tone="green"
                value={formatNumber(overviewTotals.inProgress)}
              />

              <DashboardKpiCard
                label="En attente"
                tone="amber"
                value={formatNumber(overviewTotals.pending)}
              />

              <DashboardKpiCard
                label="Tickets en retard"
                tone="red"
                value={formatNumber(overdueTotal)}
              />

              <DashboardKpiCard
                label="Tickets non assignes"
                tone="silver"
                value={formatNumber(overviewTotals.unassigned)}
              />

              <DashboardKpiCard
                label="Resolus"
                tone="mint"
                value={formatNumber(overviewTotals.resolved)}
              />

              <DashboardKpiCard
                label="Clos"
                tone="slate"
                value={formatNumber(overviewTotals.closed)}
              />
            </div>

            <div className="reports-dashboard-graph-grid">
              <DashboardPanel title="Evolution des tickets">
                <DashboardTimelineChart items={timelineItems} />
              </DashboardPanel>

              <DashboardPanel
                activityMode={dashboardActivityModes.CATEGORY}
                onActivityModeChange={(isActive) =>
                  handleDashboardActivityModeChange('CATEGORY', isActive)
                }
                title="Tickets par categorie"
              >
                <DashboardBarWidget
                  items={categoryWidgetItems}
                  variant="category"
                />
              </DashboardPanel>

              <DashboardPanel
                activityMode={dashboardActivityModes.SLA}
                onActivityModeChange={(isActive) =>
                  handleDashboardActivityModeChange('SLA', isActive)
                }
                title="Respect SLA/TTR"
              >
                <DashboardDonutWidget
                  colorByKey={{
                    overdue: '#65a196',
                  }}
                  colors={['#6254d9', '#65a196']}
                  items={slaWidgetItems}
                />
              </DashboardPanel>

              <DashboardPanel
                activityMode={dashboardActivityModes.PRIORITY}
                onActivityModeChange={(isActive) =>
                  handleDashboardActivityModeChange('PRIORITY', isActive)
                }
                title="Tickets par priorite"
              >
                <DashboardDonutWidget
                  colorByKey={{
                    Basse: '#65a196',
                    Critique: '#ce626a',
                    Haute: '#c18b38',
                    Moyenne: '#6254d9',
                  }}
                  colors={['#6254d9', '#c18b38', '#65a196', '#ce626a']}
                  items={priorityWidgetItems}
                />
              </DashboardPanel>

              <DashboardPanel
                activityMode={dashboardActivityModes.TYPE}
                onActivityModeChange={(isActive) =>
                  handleDashboardActivityModeChange('TYPE', isActive)
                }
                title="Tickets par type"
              >
                <DashboardDonutWidget
                  colorByKey={{
                    Demande: '#65a196',
                    Incident: '#6254d9',
                  }}
                  colors={['#6254d9', '#65a196']}
                  items={typeWidgetItems}
                />
              </DashboardPanel>

              <DashboardPanel
                activityMode={dashboardActivityModes.SOURCE}
                onActivityModeChange={(isActive) =>
                  handleDashboardActivityModeChange('SOURCE', isActive)
                }
                title="Sources des tickets"
              >
                <DashboardBarWidget items={sourceWidgetItems} />
              </DashboardPanel>

              {canViewOperationalBreakdowns ? (
                <>
                  <DashboardPanel
                    activityMode={dashboardActivityModes.GROUP}
                    onActivityModeChange={(isActive) =>
                      handleDashboardActivityModeChange('GROUP', isActive)
                    }
                    title="Tickets par groupe"
                  >
                    <DashboardBarWidget items={groupWidgetItems} />
                  </DashboardPanel>

                  <DashboardPanel
                    activityMode={dashboardActivityModes.AGENT}
                    onActivityModeChange={(isActive) =>
                      handleDashboardActivityModeChange('AGENT', isActive)
                    }
                    title="Tickets par agent"
                  >
                    <DashboardBarWidget items={agentWidgetItems} />
                  </DashboardPanel>
                </>
              ) : null}
            </div>
          </section>
        </>
      ) : activeView === 'PERSONAL' ? (
        <section aria-label="Vue personnelle" className="personal-view-grid">
          <PersonalTicketPanel
            categoriesById={personalCategoriesById}
            columns={ASSIGNED_TO_ME_COLUMNS}
            defaultSort={defaultTicketSort}
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
            categoriesById={personalCategoriesById}
            columns={REQUESTER_TICKET_COLUMNS}
            defaultSort={defaultTicketSort}
            isLoading={isLoading}
            onOpenTicket={(ticketId) =>
              navigateTo(`/agent/tickets/${ticketId}?from=reports-personal`)
            }
            prioritiesById={personalPrioritiesById}
            title="Mes tickets demandés"
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
                defaultSort={defaultTicketSort}
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
                defaultSort={defaultTicketSort}
                isLoading={isLoading}
                onOpenTicket={(ticketId) =>
                  navigateTo(`/agent/tickets/${ticketId}?from=reports-group`)
                }
                prioritiesById={personalPrioritiesById}
                showAssignedTo={false}
                showPriority
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
  categoriesById,

  columns = ['ID', 'TITLE', 'STATUS', 'REQUESTER'],

  defaultSort,

  isLoading,

  onOpenTicket,

  prioritiesById,

  title,

  tickets,

  users,
}: {
  categoriesById?: Map<string, { name: string }>;

  columns?: PersonalTicketColumn[];

  defaultSort: PersonalTicketSort;

  isLoading: boolean;

  onOpenTicket: (ticketId: string) => void;

  prioritiesById: Map<string, { level: number; name: string }>;

  title: string;

  tickets: TicketSummarySnapshot[];

  users: AdminUserSummary[];
}) {
  const [page, setPage] = useState(1);

  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const [sortBy, setSortBy] = useState<PersonalTicketSort>(defaultSort);

  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSortBy(defaultSort);
  }, [defaultSort]);

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
                  {columns.map((column) => (
                    <th
                      className={PERSONAL_TICKET_COLUMN_CLASSNAMES[column]}
                      key={column}
                    >
                      {PERSONAL_TICKET_COLUMN_LABELS[column]}
                    </th>
                  ))}
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
                    {columns.map((column) => (
                      <td
                        className={`personal-ticket-col ${PERSONAL_TICKET_COLUMN_CLASSNAMES[column]} ${
                          column === 'ID'
                            ? 'personal-ticket-id'
                            : column === 'TITLE'
                              ? 'personal-ticket-title'
                              : ''
                        }`}
                        key={column}
                      >
                        {renderPersonalTicketCell({
                          categoriesById,
                          column,
                          prioritiesById,
                          ticket,
                          users,
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AppPagination
            onPageChange={setPage}
            page={visiblePage}
            summary={`Page ${visiblePage} sur ${totalPages}`}
            totalPages={totalPages}
          />
        </div>
      )}
    </article>
  );
}

function renderPersonalTicketCell({
  categoriesById,
  column,
  prioritiesById,
  ticket,
  users,
}: {
  categoriesById?: Map<string, { name: string }>;
  column: PersonalTicketColumn;
  prioritiesById: Map<string, { level: number; name: string }>;
  ticket: TicketSummarySnapshot;
  users: AdminUserSummary[];
}): ReactNode {
  switch (column) {
    case 'ASSIGNED_TO':
      return formatAssignedUserName(ticket.assignedToUserId, users);

    case 'CATEGORY':
      return categoriesById?.get(ticket.categoryId)?.name ?? 'Non renseigné';

    case 'ID':
      return formatTicketDisplayNumber(ticket);

    case 'PRIORITY':
      return translatePriority(
        ticket.priorityName ??
          prioritiesById.get(ticket.priorityId)?.name ??
          'Non renseigné',
      );

    case 'REQUESTER':
      return formatAssignedUserName(
        ticket.requestedForUserId ?? ticket.createdByUserId,
        users,
      );

    case 'STATUS':
      return (
        <span
          className={`personal-status personal-status--${ticket.status.toLowerCase()}`}
        >
          <i aria-hidden="true" />

          {translateTicketStatus(ticket.status)}
        </span>
      );

    case 'TITLE':
      return ticket.title;

    default:
      return null;
  }
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

                <th>Modèle</th>

                <th>Numéro de série</th>
              </tr>
            </thead>

            <tbody>
              {visibleEquipment.length === 0 ? (
                <tr className="personal-equipment-empty-row">
                  <td colSpan={5}>Aucun équipement à afficher.</td>
                </tr>
              ) : (
                visibleEquipment.map((item) => (
                  <tr key={item.id}>
                    <td className="personal-ticket-id">{item.displayId}</td>

                    <td>{item.name}</td>

                    <td>{item.type}</td>

                    <td>{item.model}</td>

                    <td>{item.serialNumber}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AppPagination
          onPageChange={setPage}
          page={visiblePage}
          summary={`Page ${visiblePage} sur ${totalPages}`}
          totalPages={totalPages}
        />
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
  defaultSort,

  isLoading,

  onOpenTicket,

  prioritiesById,

  showAssignedTo = true,

  showPriority = false,

  tickets,

  title,

  users,
}: {
  defaultSort: PersonalTicketSort;

  isLoading: boolean;

  onOpenTicket: (ticketId: string) => void;

  prioritiesById: Map<string, { level: number; name: string }>;

  showAssignedTo?: boolean;

  showPriority?: boolean;

  tickets: TicketSummarySnapshot[];

  title: string;

  users: AdminUserSummary[];
}) {
  const [page, setPage] = useState(1);

  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const [sortBy, setSortBy] = useState<PersonalTicketSort>(defaultSort);

  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSortBy(defaultSort);
  }, [defaultSort]);

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

                  {showPriority ? <th>Priorité</th> : null}

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

                    {showPriority ? (
                      <td>
                        {translatePriority(
                          ticket.priorityName ??
                            prioritiesById.get(ticket.priorityId)?.name ??
                            'Non renseigné',
                        )}
                      </td>
                    ) : null}

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
          <AppPagination
            onPageChange={setPage}
            page={visiblePage}
            summary={`Page ${visiblePage} sur ${totalPages}`}
            totalPages={totalPages}
          />
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
                    <ProfileAvatar
                      className="group-chat-avatar"
                      profilePhotoUrl={author?.profilePhotoUrl}
                      seed={author?.id ?? authorName}
                    />
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
                        <ProfileAvatar
                          className="group-chat-avatar"
                          profilePhotoUrl={member.profilePhotoUrl}
                          seed={member.id}
                        />

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
        <ProfileAvatar
          className="group-chat-avatar group-chat-member-info-avatar"
          profilePhotoUrl={member.profilePhotoUrl}
          seed={member.id}
        />

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
