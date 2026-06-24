import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { PlanningTask } from '../../domain/planning/planning-task';
import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';
import { translateChannel } from '../../domain/i18n/ticketing-labels';
import type { GroupChatMessageSnapshot } from '../../infrastructure/api/group-chat-api';
import type {
  ReportingBreakdownItem,
  ReportingFilters,
  ReportingOverview,
} from '../../infrastructure/api/reporting-api';
import type {
  GroupChatMessage,
  PeriodPreset,
  PersonalTicketSort,
  ReportsFilterState,
  ReportsView,
} from './reports-page.types';

const GROUP_MEMBER_COLOR_COUNT = 12;

export function applyPeriodPreset(
  filters: ReportsFilterState,
): ReportsFilterState {
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

export function getInitialReportsView(): ReportsView {
  const searchParams = new URLSearchParams(window.location.search);
  const requestedView = searchParams.get('view');

  if (requestedView === 'PERSONAL' || requestedView === 'GROUP') {
    return requestedView;
  }

  return 'DASHBOARD';
}

export function getPeriodPresetRange(preset: Exclude<PeriodPreset, ''>): {
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

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getUserGroupIds(user: AdminUserSummary): string[] {
  const groupIds = new Set<string>();

  user.groupIds?.forEach((groupId) => {
    if (groupId) {
      groupIds.add(groupId);
    }
  });

  if (user.groupId) {
    groupIds.add(user.groupId);
  }

  return Array.from(groupIds);
}

export function isUserMemberOfGroup(
  user: AdminUserSummary,
  groupId: string,
): boolean {
  if (!groupId) {
    return false;
  }

  return getUserGroupIds(user).includes(groupId);
}

export function mapGroupChatMessageSnapshot(
  message: GroupChatMessageSnapshot,
): GroupChatMessage {
  return {
    authorName: '',
    authorUserId: message.authorUserId,
    body: message.body,
    createdAt: message.createdAt,
    groupId: message.groupId,
    id: message.id,
  };
}

export function parsePlanningDateTime(dateTime: string): Date {
  return new Date(dateTime);
}

export function formatPersonalPlanningLongDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatPersonalPlanningClock(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getPersonalPlanningTaskEnd(task: PlanningTask): Date {
  const end = new Date(task.start);

  end.setMinutes(end.getMinutes() + task.durationMinutes);

  return end;
}

export function formatPersonalPlanningTaskInterval(task: PlanningTask): string {
  const start = parsePlanningDateTime(task.start);
  const end = getPersonalPlanningTaskEnd(task);

  return `${formatPersonalPlanningClock(start)} - ${formatPersonalPlanningClock(end)}`;
}

export function formatPersonalPlanningTechnicianName(
  technicianId: string,
  technicians: AdminUserSummary[],
): string {
  const technician = technicians.find((user) => user.id === technicianId);

  return technician ? formatUserName(technician) : 'Technicien non renseigne';
}

export function groupPersonalPlanningTasksByDate(
  tasks: PlanningTask[],
): Array<{ date: string; tasks: PlanningTask[] }> {
  const groups = new Map<string, PlanningTask[]>();

  tasks.forEach((task) => {
    const date = task.start.slice(0, 10);
    const groupedTasks = groups.get(date) ?? [];

    groupedTasks.push(task);
    groups.set(date, groupedTasks);
  });

  return Array.from(groups, ([date, groupedTasks]) => ({
    date,
    tasks: groupedTasks,
  }));
}

export function buildPersonalTicketPreview(
  tickets: TicketSummarySnapshot[],
  predicate: (ticket: TicketSummarySnapshot) => boolean,
): TicketSummarySnapshot[] {
  return tickets.filter((ticket) => !ticket.archivedAt && predicate(ticket));
}

export function sortPersonalTickets(
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

export function formatTicketDisplayNumber(
  ticket: TicketSummarySnapshot,
): string {
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

export function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

export function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || user.email || user.id;
}

export function formatAssignedUserName(
  userId: string | null | undefined,
  users: AdminUserSummary[],
): string {
  if (!userId) {
    return 'aucun';
  }

  const user = users.find((candidate) => candidate.id === userId);

  return user ? formatUserName(user) : userId;
}

export function getGroupMemberColorClass(
  userId: string | undefined,
  users: AdminUserSummary[],
  currentUserId: string,
): string {
  if (!userId || userId === currentUserId) {
    return '';
  }

  const sortedUsers = [...users]
    .filter((user) => user.id !== currentUserId)
    .sort((first, second) =>
      formatUserName(first).localeCompare(formatUserName(second), 'fr', {
        sensitivity: 'base',
      }),
    );

  const userIndex = sortedUsers.findIndex((user) => user.id === userId);

  if (userIndex < 0) {
    return 'planning-user-color-1';
  }

  return `planning-user-color-${(userIndex % GROUP_MEMBER_COLOR_COUNT) + 1}`;
}

export function getGroupChatAuthorUserId(
  message: GroupChatMessage,
  users: AdminUserSummary[],
): string | undefined {
  if (message.authorUserId) {
    return message.authorUserId;
  }

  return users.find((user) => formatUserName(user) === message.authorName)?.id;
}

export function formatGroupChatInitials(value: string): string {
  const normalizedParts = value.trim().split(/\s+/).filter(Boolean);

  if (normalizedParts.length === 0) {
    return '?';
  }

  if (normalizedParts.length === 1) {
    return normalizedParts[0].slice(0, 2).toUpperCase();
  }

  return `${normalizedParts[0][0] ?? ''}${
    normalizedParts[normalizedParts.length - 1][0] ?? ''
  }`.toUpperCase();
}

export function formatGroupMemberRole(role: AdminUserSummary['role']): string {
  if (role === 'ADMIN') {
    return 'Admin';
  }

  if (role === 'AGENT') {
    return 'Agent';
  }

  return 'Demandeur';
}

export function formatGroupChatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function getOverviewOverdueTotal(
  totals: ReportingOverview['totals'],
): number | null {
  if (typeof totals.overdue === 'number') {
    return totals.overdue;
  }

  return Math.max(totals.responseOverdue, totals.resolutionOverdue);
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : String(value);
}

export function formatChartValue(value: number): string {
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

export function formatTooltipPeriod(value: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatPeriodLabel(value: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

export function getChannelDisplayName(
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

export function buildStatusDistributionItems(
  items: ReportingBreakdownItem[],
): Array<{
  color: string;
  count: number;
  key: 'closed' | 'open' | 'pending' | 'progress' | 'resolved';
  label: string;
}> {
  const countsByStatus = new Map(
    items.map((item) => [item.id ?? item.name, item.count]),
  );

  return [
    {
      color: '#4f7fb5',
      count: countsByStatus.get('OPEN') ?? 0,
      key: 'open',
      label: 'Ouvert',
    },
    {
      color: '#22c55e',
      count: countsByStatus.get('IN_PROGRESS') ?? 0,
      key: 'progress',
      label: 'En cours',
    },
    {
      color: '#f59e0b',
      count: countsByStatus.get('PENDING') ?? 0,
      key: 'pending',
      label: 'En attente',
    },
    {
      color: '#2bb8c9',
      count: countsByStatus.get('RESOLVED') ?? 0,
      key: 'resolved',
      label: 'Resolu',
    },
    {
      color: '#64748b',
      count: countsByStatus.get('CLOSED') ?? 0,
      key: 'closed',
      label: 'Clos',
    },
  ];
}

export function buildReportingFilters(
  filters: ReportsFilterState,
): ReportingFilters {
  return {
    assignedToUserId: normalizeOptionalText(filters.assignedToUserId),
    assignmentGroupId: normalizeOptionalText(filters.assignmentGroupId),
    categoryId: normalizeOptionalText(filters.categoryId),
    from: normalizeOptionalText(filters.from),
    priorityId: normalizeOptionalText(filters.priorityId),
    status: filters.status || null,
    to: normalizeOptionalText(filters.to),
    type: filters.type || null,
  };
}
