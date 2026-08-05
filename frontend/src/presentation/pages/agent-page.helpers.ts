import { createElement } from 'react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import {
  isSupportManagerRole,
  isSupportRole,
  type UserRole,
} from '../../domain/auth/user-role';
import {
  translatePriority,
  translateTicketStatus,
} from '../../domain/i18n/ticketing-labels';
import type {
  ReferentialCatalogSnapshot,
  ReferentialCi,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';
import type { TicketDetailSnapshot } from '../../domain/ticketing/ticket-detail';
import type { TicketHistoryEntrySnapshot } from '../../domain/ticketing/ticket-history-entry';
import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';
import type {
  AgentPageProps,
  IncidentDraftState,
  IncidentLookupSearchField,
  IncidentValidationErrors,
  RequestDraftState,
  RequestValidationErrors,
  TicketListSearchField,
  TicketStatus,
} from './agent-page.types';

export const TICKET_TITLE_MAX_LENGTH = 50;
const VIP_TTR_MULTIPLIER = 0.75;

export function isTicketCommentHistoryEntry(
  entry: TicketHistoryEntrySnapshot,
): boolean {
  const eventType = entry.eventType.toLowerCase();

  return eventType.includes('comment');
}

export function validateIncidentDraft(
  draft: IncidentDraftState,
): IncidentValidationErrors {
  const errors: IncidentValidationErrors = {};

  if (!draft.title.trim()) {
    errors.title = 'Le titre est obligatoire.';
  } else if (draft.title.trim().length > TICKET_TITLE_MAX_LENGTH) {
    errors.title = '50 caracteres max.';
  }

  if (!draft.description.trim()) {
    errors.description = 'La description est obligatoire.';
  }

  if (!draft.categoryId.trim()) {
    errors.categoryId = 'La categorie est obligatoire.';
  }

  if (!draft.impact) {
    errors.impact = "L'impact est obligatoire.";
  }

  if (!draft.urgency) {
    errors.urgency = "L'urgence est obligatoire.";
  }

  return errors;
}

export function validateRequestDraft(
  draft: RequestDraftState,
): RequestValidationErrors {
  const errors: RequestValidationErrors = {};

  if (!draft.title.trim()) {
    errors.title = 'Le titre est obligatoire.';
  } else if (draft.title.trim().length > TICKET_TITLE_MAX_LENGTH) {
    errors.title = '50 caracteres max.';
  }

  if (!draft.description.trim()) {
    errors.description = 'La description est obligatoire.';
  }

  if (!draft.categoryId.trim()) {
    errors.categoryId = 'La categorie est obligatoire.';
  }

  if (!draft.priorityId.trim()) {
    errors.priorityId = 'La priorite est obligatoire.';
  }

  return errors;
}

export function normalizeOptionalId(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

export function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

export function formatTicketDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTicketResolutionDueAt(
  ticket: TicketSummarySnapshot,
  prioritiesById: Map<string, { resolutionHours: number | null }>,
  isRequesterVip = false,
): string {
  const resolutionHours = getVipAwareResolutionHours(
    prioritiesById.get(ticket.priorityId)?.resolutionHours,
    isRequesterVip,
  );

  if (resolutionHours === null || resolutionHours === undefined) {
    return '?';
  }

  const createdAt = new Date(ticket.createdAt);

  if (Number.isNaN(createdAt.getTime())) {
    return '?';
  }

  const resolutionDueAt = new Date(
    createdAt.getTime() + resolutionHours * 60 * 60 * 1000,
  );

  return formatTicketDate(resolutionDueAt.toISOString());
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} o`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} Ko`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function getLocalFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function formatSelectedFilesLabel(fileCount: number): string {
  if (fileCount === 0) {
    return 'Aucun fichier selectionne';
  }

  const suffix = fileCount > 1 ? 's' : '';

  return `${fileCount} fichier${suffix} selectionne${suffix}`;
}

export function buildTicketAttachmentStoragePath(
  userId: string,
  ticketId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');

  return `${userId}/${ticketId}/${timestamp}-${sanitizedFileName}`;
}

export function canManageTicketActions(role: UserRole): boolean {
  return isSupportRole(role);
}

export function canChangeTicketStatus(
  role: UserRole,
  currentUserId: string,
  ticketDetail: TicketDetailSnapshot,
): boolean {
  if (isSupportManagerRole(role)) {
    return true;
  }

  if (isSupportRole(role)) {
    return ticketDetail.ticket.status !== 'CLOSED';
  }

  return (
    role === 'DEMANDEUR' &&
    ticketDetail.ticket.status === 'RESOLVED' &&
    (ticketDetail.ticket.createdByUserId === currentUserId ||
      ticketDetail.ticket.requestedForUserId === currentUserId)
  );
}

export function getStatusOptionsForRole(
  role: UserRole,
  ticketDetail: TicketDetailSnapshot,
): Array<{ label: string; value: TicketStatus }> {
  if (isSupportManagerRole(role)) {
    return [
      { label: 'Nouveau', value: 'OPEN' },
      { label: 'En cours', value: 'IN_PROGRESS' },
      { label: 'En attente', value: 'PENDING' },
      { label: 'Resolu', value: 'RESOLVED' },
      { label: 'Clos', value: 'CLOSED' },
    ];
  }

  if (role === 'DEMANDEUR' && ticketDetail.ticket.status === 'RESOLVED') {
    return [
      { label: 'Resolu', value: 'RESOLVED' },
      { label: 'Refuser et remettre en cours', value: 'IN_PROGRESS' },
      { label: 'Accepter et clore', value: 'CLOSED' },
    ];
  }

  return [
    { label: 'Nouveau', value: 'OPEN' },
    { label: 'En cours', value: 'IN_PROGRESS' },
    { label: 'En attente', value: 'PENDING' },
    { label: 'Resolu', value: 'RESOLVED' },
  ];
}

export function asTicketStatus(value: string): TicketStatus | null {
  if (
    value === 'OPEN' ||
    value === 'IN_PROGRESS' ||
    value === 'PENDING' ||
    value === 'RESOLVED' ||
    value === 'CLOSED'
  ) {
    return value;
  }

  return null;
}

export function getTicketListTitle(
  section: AgentPageProps['section'],
  userRole: UserRole,
): string {
  if (section === 'ARCHIVES') {
    return 'Liste des tickets archives';
  }

  if (section === 'MY_TICKETS') {
    return 'Mes tickets demandés';
  }

  if (section === 'LIST' && userRole === 'DEMANDEUR') {
    return 'Mes tickets demandés';
  }

  return 'Liste des tickets';
}

export function getTicketListDescription(
  section: AgentPageProps['section'],
): string {
  if (section === 'ARCHIVES') {
    return 'Vue dediee aux tickets sortis de la liste active.';
  }

  if (section === 'MY_TICKETS') {
    return 'Tickets crees par votre compte utilisateur.';
  }

  return 'Vue compacte des tickets avec les colonnes principales de suivi.';
}

export function getTicketListEmptyMessage(
  section: AgentPageProps['section'],
): string {
  if (section === 'ARCHIVES') {
    return 'Aucun ticket archive ne correspond aux filtres actuels.';
  }

  if (section === 'MY_TICKETS') {
    return 'Aucun ticket cree par votre compte ne correspond aux filtres actuels.';
  }

  return 'Aucun ticket ne correspond aux filtres actuels.';
}

export function canDeleteTicketComment(
  _role: UserRole,
  currentUserId: string,
  authorUserId: string,
): boolean {
  return currentUserId === authorUserId;
}

export function formatKnownUserName(
  user: AdminUserSummary | undefined,
  fallback: string,
): string {
  if (!user) {
    return fallback;
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || fallback;
}

export function formatCommentAuthorInitials(value: string): string {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
}

export function formatHistoryEventInitial(
  eventType: TicketHistoryEntrySnapshot['eventType'],
): string {
  const labels: Record<TicketHistoryEntrySnapshot['eventType'], string> = {
    ASSIGNED: 'A',
    ATTACHMENT_ADDED: 'P',
    ATTACHMENT_DELETED: 'P',
    CATEGORY_CHANGED: 'C',
    CLOSED: 'F',
    COMMENT_ADDED: 'M',
    COMMENT_DELETED: 'M',
    CREATED: 'C',
    ESCALATED: 'E',
    PRIORITY_CHANGED: 'P',
    RESOLVED: 'R',
    STATUS_CHANGED: 'S',
    UNASSIGNED: 'A',
  };

  return labels[eventType] ?? '?';
}

export function getTicketHistoryEntryClassName(
  entry: TicketHistoryEntrySnapshot,
): string {
  const classByEventType: Record<
    TicketHistoryEntrySnapshot['eventType'],
    string
  > = {
    ASSIGNED: 'tdp-history-entry--assignment',
    ATTACHMENT_ADDED: 'tdp-history-entry--attachment-added',
    ATTACHMENT_DELETED: 'tdp-history-entry--attachment-deleted',
    CATEGORY_CHANGED: 'tdp-history-entry--category',
    CLOSED: 'tdp-history-entry--closed',
    COMMENT_ADDED: 'tdp-history-entry--default',
    COMMENT_DELETED: 'tdp-history-entry--default',
    CREATED: 'tdp-history-entry--created',
    ESCALATED: 'tdp-history-entry--default',
    PRIORITY_CHANGED: 'tdp-history-entry--priority',
    RESOLVED: 'tdp-history-entry--resolved',
    STATUS_CHANGED: 'tdp-history-entry--status',
    UNASSIGNED: 'tdp-history-entry--unassigned',
  };

  return `tdp-history-entry ${classByEventType[entry.eventType]}`;
}

export function formatTicketHistoryEvent(
  eventType: TicketHistoryEntrySnapshot['eventType'],
): string {
  const labels: Record<TicketHistoryEntrySnapshot['eventType'], string> = {
    ASSIGNED: 'Assignation modifiee',
    ATTACHMENT_ADDED: 'Piece jointe ajoutee',
    ATTACHMENT_DELETED: 'Piece jointe supprimee',
    CATEGORY_CHANGED: 'Categorie modifiee',
    CLOSED: 'Ticket clos',
    COMMENT_ADDED: 'Commentaire ajoute',
    COMMENT_DELETED: 'Commentaire supprime',
    CREATED: 'Ticket cree',
    ESCALATED: 'Ticket escalade',
    PRIORITY_CHANGED: 'Priorite modifiee',
    RESOLVED: 'Ticket resolu',
    STATUS_CHANGED: 'Statut modifie',
    UNASSIGNED: 'Assignation retiree',
  };

  return labels[eventType] ?? eventType;
}

export function formatTicketHistoryTitle(
  entry: TicketHistoryEntrySnapshot,
): string {
  if (entry.eventType === 'ASSIGNED') {
    return formatTicketHistoryEvent(entry.eventType);
  }

  if (entry.eventType === 'UNASSIGNED') {
    return "Ticket en attente d'assignation";
  }

  return formatTicketHistoryEvent(entry.eventType);
}

export function formatTicketHistoryPayload(
  entry: TicketHistoryEntrySnapshot,
): string {
  const payload = entry.payload ?? {};

  if (entry.eventType === 'STATUS_CHANGED') {
    return `${translatePayloadStatus(payload.fromStatus)} -> ${translatePayloadStatus(payload.toStatus)}`;
  }

  if (entry.eventType === 'ASSIGNED') {
    return "L'assignation du ticket a ete mise a jour.";
  }

  if (entry.eventType === 'UNASSIGNED') {
    return "Le ticket n'a plus de groupe ou de technicien assigne.";
  }

  if (entry.eventType === 'PRIORITY_CHANGED') {
    return 'La priorite et les echeances SLA ont ete recalculees.';
  }

  if (entry.eventType === 'COMMENT_ADDED') {
    return 'Un commentaire a ete ajoute.';
  }

  if (entry.eventType === 'COMMENT_DELETED') {
    return 'Un commentaire a ete supprime.';
  }

  if (entry.eventType === 'ATTACHMENT_ADDED') {
    return 'Une piece jointe a ete ajoutee au ticket.';
  }

  if (entry.eventType === 'ATTACHMENT_DELETED') {
    return 'Une piece jointe a ete supprimee du ticket.';
  }

  if (entry.eventType === 'CREATED') {
    return 'Le ticket a ete cree.';
  }

  return 'Evenement enregistre sur le ticket.';
}

function translatePayloadStatus(value: unknown): string {
  return typeof value === 'string'
    ? translateTicketStatus(value)
    : 'Non defini';
}

export function getUserSupportGroupIds(
  user: AdminUserSummary | undefined,
): string[] {
  if (!user) {
    return [];
  }

  return [
    ...new Set([
      ...(user.groupIds ?? []),
      ...(user.groupId ? [user.groupId] : []),
    ]),
  ];
}

export function isUserInSupportGroup(
  user: AdminUserSummary,
  groupId: string,
): boolean {
  if (!groupId) {
    return true;
  }

  return getUserSupportGroupIds(user).includes(groupId);
}

export function filterIncidentLookupUsers(
  users: AdminUserSummary[],
  searchText: string,
  searchField: IncidentLookupSearchField,
  groupsById: Map<string, { name: string }>,
): AdminUserSummary[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return users;
  }

  return users.filter((user) => {
    const groupName = formatUserSupportGroupNames(user, groupsById);
    const searchableValue = getIncidentLookupSearchValue(
      user,
      searchField,
      groupName,
    );

    return normalizeSearchText(searchableValue).includes(normalizedSearch);
  });
}

export function formatUserSupportGroupNames(
  user: AdminUserSummary,
  groupsById: Map<string, { name: string }>,
): string {
  const groupNames = getUserSupportGroupIds(user).map(
    (groupId) => groupsById.get(groupId)?.name ?? groupId,
  );

  return groupNames.length > 0 ? groupNames.join(', ') : 'Non assigne';
}

function getIncidentLookupSearchValue(
  user: AdminUserSummary,
  searchField: IncidentLookupSearchField,
  groupName: string,
): string {
  switch (searchField) {
    case 'IDENTIFIER':
      return formatKnownUserName(user, user.id);
    case 'FIRST_NAME':
      return user.firstName ?? '';
    case 'LAST_NAME':
      return user.lastName ?? '';
    case 'GROUP':
      return groupName;
    default:
      return '';
  }
}

export function filterIncidentLookupGroups(
  groups: ReferentialGroup[],
  searchText: string,
  searchField: IncidentLookupSearchField,
): ReferentialGroup[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return groups;
  }

  return groups.filter((group) =>
    normalizeSearchText(
      getIncidentLookupGroupSearchValue(group, searchField),
    ).includes(normalizedSearch),
  );
}

function getIncidentLookupGroupSearchValue(
  group: ReferentialGroup,
  searchField: IncidentLookupSearchField,
): string {
  switch (searchField) {
    case 'IDENTIFIER':
    case 'NAME':
      return group.name;
    default:
      return '';
  }
}

export function filterIncidentLookupEquipment(
  cis: ReferentialCi[],
  searchText: string,
  searchField: IncidentLookupSearchField,
  ciTypesById: Map<string, { name: string }>,
): ReferentialCi[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return cis;
  }

  return cis.filter((ci) =>
    normalizeSearchText(
      getIncidentLookupEquipmentSearchValue(ci, searchField, ciTypesById),
    ).includes(normalizedSearch),
  );
}

function getIncidentLookupEquipmentSearchValue(
  ci: ReferentialCi,
  searchField: IncidentLookupSearchField,
  ciTypesById: Map<string, { name: string }>,
): string {
  switch (searchField) {
    case 'IDENTIFIER':
    case 'NAME':
      return ci.name;
    case 'TYPE':
      return ciTypesById.get(ci.ciTypeId)?.name ?? '';
    case 'STATUS':
      return ci.status;
    case 'SERIAL_NUMBER':
      return ci.serialNumber ?? '';
    default:
      return '';
  }
}

export function filterTicketsByListSearch(
  tickets: TicketSummarySnapshot[],
  searchText: string,
  users: AdminUserSummary[],
  groups: ReferentialCatalogSnapshot['groups'],
  searchField: TicketListSearchField,
): TicketSummarySnapshot[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return tickets;
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  return tickets.filter((ticket) => {
    const requesterId = ticket.requestedForUserId ?? ticket.createdByUserId;
    const requesterName = formatKnownUserName(
      usersById.get(requesterId),
      requesterId,
    );
    const technicianName = ticket.assignedToUserId
      ? formatKnownUserName(
          usersById.get(ticket.assignedToUserId),
          ticket.assignedToUserId,
        )
      : 'aucun';
    const groupName = ticket.assignmentGroupId
      ? (groupsById.get(ticket.assignmentGroupId)?.name ??
        ticket.assignmentGroupId)
      : 'aucun';

    const searchableValues: string[] = (() => {
      switch (searchField) {
        case 'GROUP':
          return [groupName];
        case 'REQUESTER':
          return [requesterName];
        case 'TECHNICIAN':
          return [technicianName];
        case 'TITLE':
        default:
          return [ticket.title];
      }
    })();

    return searchableValues.some((value) =>
      normalizeSearchText(value).includes(normalizedSearch),
    );
  });
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
}

export function sortTicketsByOperationalPriority(
  tickets: TicketSummarySnapshot[],
  prioritiesById: Map<
    string,
    { level: number; name: string; resolutionHours?: number | null }
  >,
  vipRequesterIds: ReadonlySet<string> = new Set(),
): TicketSummarySnapshot[] {
  return [...tickets].sort((left, right) => {
    const leftIsVip = isTicketRequesterVip(left, vipRequesterIds);
    const rightIsVip = isTicketRequesterVip(right, vipRequesterIds);
    const leftScore = getTicketOperationalScore(
      left,
      prioritiesById,
      leftIsVip,
    );
    const rightScore = getTicketOperationalScore(
      right,
      prioritiesById,
      rightIsVip,
    );

    return (
      leftScore.completionRank - rightScore.completionRank ||
      rightScore.criticalRank - leftScore.criticalRank ||
      leftScore.slaRank - rightScore.slaRank ||
      rightScore.priorityLevel - leftScore.priorityLevel ||
      Number(rightIsVip) - Number(leftIsVip) ||
      leftScore.statusRank - rightScore.statusRank ||
      leftScore.nextDueAt - rightScore.nextDueAt ||
      leftScore.createdAt - rightScore.createdAt
    );
  });
}

export function isTicketRequesterVip(
  ticket: TicketSummarySnapshot,
  vipRequesterIds: ReadonlySet<string>,
): boolean {
  return vipRequesterIds.has(
    ticket.requestedForUserId ?? ticket.createdByUserId,
  );
}

export function sortTicketsByCreatedAtDesc(
  tickets: TicketSummarySnapshot[],
): TicketSummarySnapshot[] {
  return [...tickets].sort(
    (left, right) =>
      getCompletionRank(left.status) - getCompletionRank(right.status) ||
      toTimestamp(right.createdAt) - toTimestamp(left.createdAt),
  );
}

export function sortTicketsByCreatedAtAsc(
  tickets: TicketSummarySnapshot[],
): TicketSummarySnapshot[] {
  return [...tickets].sort(
    (left, right) =>
      getCompletionRank(left.status) - getCompletionRank(right.status) ||
      toTimestamp(left.createdAt) - toTimestamp(right.createdAt),
  );
}

function getTicketOperationalScore(
  ticket: TicketSummarySnapshot,
  prioritiesById: Map<
    string,
    { level: number; name: string; resolutionHours?: number | null }
  >,
  isRequesterVip: boolean,
): {
  completionRank: number;
  createdAt: number;
  nextDueAt: number;
  criticalRank: number;
  priorityLevel: number;
  slaRank: number;
  statusRank: number;
} {
  const priorityLevel = prioritiesById.get(ticket.priorityId)?.level ?? 0;
  const priorityName = prioritiesById.get(ticket.priorityId)?.name ?? '';
  const nextDueAt = getNextDueTimestamp(ticket, prioritiesById, isRequesterVip);

  return {
    completionRank: getCompletionRank(ticket.status),
    createdAt: toTimestamp(ticket.createdAt),
    nextDueAt,
    criticalRank: isCriticalPriority(priorityName, priorityLevel) ? 1 : 0,
    priorityLevel,
    slaRank: getSlaRank(ticket, nextDueAt),
    statusRank: getStatusRank(ticket.status),
  };
}

function isCriticalPriority(
  priorityName: string,
  priorityLevel: number,
): boolean {
  return (
    priorityLevel >= 4 ||
    normalizeSearchText(priorityName).includes('critique') ||
    normalizeSearchText(priorityName).includes('critical')
  );
}

function getCompletionRank(status: string): number {
  if (status === 'RESOLVED') {
    return 1;
  }

  if (status === 'CLOSED') {
    return 2;
  }

  return 0;
}

function getStatusRank(status: string): number {
  if (status === 'OPEN') {
    return 0;
  }

  if (status === 'IN_PROGRESS') {
    return 1;
  }

  if (status === 'PENDING') {
    return 2;
  }

  if (status === 'RESOLVED') {
    return 3;
  }

  if (status === 'CLOSED') {
    return 4;
  }

  return 5;
}

function getSlaRank(ticket: TicketSummarySnapshot, ttrDueAt: number): number {
  if (ticket.status === 'PENDING') {
    return 2;
  }

  if (!Number.isFinite(ttrDueAt)) {
    return 2;
  }

  const now = Date.now();

  if (ttrDueAt <= now) {
    return 0;
  }

  const createdAt = toTimestamp(ticket.createdAt);
  const initialDuration = ttrDueAt - createdAt;
  const remainingDuration = ttrDueAt - now;

  if (
    Number.isFinite(createdAt) &&
    initialDuration > 0 &&
    remainingDuration <= initialDuration * 0.25
  ) {
    return 1;
  }

  return 2;
}

function getNextDueTimestamp(
  ticket: TicketSummarySnapshot,
  prioritiesById: Map<string, { resolutionHours?: number | null }>,
  isRequesterVip = false,
): number {
  const resolutionHours = getVipAwareResolutionHours(
    prioritiesById.get(ticket.priorityId)?.resolutionHours,
    isRequesterVip,
  );

  if (resolutionHours !== null && resolutionHours !== undefined) {
    const createdAt = toTimestamp(ticket.createdAt);

    return Number.isFinite(createdAt)
      ? createdAt + resolutionHours * 60 * 60 * 1000
      : Number.POSITIVE_INFINITY;
  }

  if (ticket.resolutionDueAt) {
    return toTimestamp(ticket.resolutionDueAt);
  }

  return ticket.responseDueAt
    ? toTimestamp(ticket.responseDueAt)
    : Number.POSITIVE_INFINITY;
}

function getVipAwareResolutionHours(
  resolutionHours: number | null | undefined,
  isRequesterVip: boolean,
): number | null {
  if (resolutionHours === null || resolutionHours === undefined) {
    return null;
  }

  return isRequesterVip
    ? resolutionHours * VIP_TTR_MULTIPLIER
    : resolutionHours;
}

function toTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export function formatTicketDisplayNumber(ticket: {
  number: string;
  type: string;
}): string {
  const numberSuffix = ticket.number.split('-').at(-1) ?? ticket.number;

  if (ticket.type === 'INCIDENT') {
    return `INC-${numberSuffix}`;
  }

  if (ticket.type === 'REQUEST') {
    return `DEM-${numberSuffix}`;
  }

  return ticket.number;
}

export function renderTicketDisplayNumber(ticket: TicketSummarySnapshot) {
  const displayNumber = formatTicketDisplayNumber(ticket);
  const [prefix, suffix] = displayNumber.split('-');

  if (!prefix || !suffix) {
    return createElement('strong', null, displayNumber);
  }

  return createElement(
    'strong',
    { className: 'ticket-table-number' },
    createElement('span', null, `${prefix}-`),
    createElement('span', null, suffix),
  );
}

export function renderPriorityBadge(
  ticket: TicketSummarySnapshot,
  prioritiesById: Map<string, { name: string }>,
) {
  const priorityName =
    ticket.priorityName ?? prioritiesById.get(ticket.priorityId)?.name ?? null;

  if (!priorityName) {
    return createElement(
      'span',
      { className: 'ticket-priority-badge' },
      'Non definie',
    );
  }

  return createElement(
    'span',
    {
      className: `ticket-priority-badge ticket-priority-badge--${priorityName.toLowerCase()}`,
    },
    translatePriority(priorityName),
  );
}

export function renderOverdueMarker(
  ticket: TicketSummarySnapshot,
  prioritiesById?: Map<string, { resolutionHours?: number | null }>,
  isRequesterVip = false,
) {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return null;
  }

  const displayedResolutionDueAt = prioritiesById
    ? getNextDueTimestamp(ticket, prioritiesById, isRequesterVip)
    : Number.POSITIVE_INFINITY;
  const comparisonTimestamp =
    ticket.status === 'PENDING' && ticket.slaPausedAt
      ? toTimestamp(ticket.slaPausedAt)
      : Date.now();
  const isDisplayedTtrOverdue =
    Number.isFinite(displayedResolutionDueAt) &&
    Number.isFinite(comparisonTimestamp) &&
    displayedResolutionDueAt <= comparisonTimestamp;

  if (!isDisplayedTtrOverdue && ticket.resolutionSlaStatus !== 'OVERDUE') {
    return null;
  }

  return createElement(
    'span',
    { className: 'ticket-overdue-marker' },
    'Retard',
  );
}

export function renderStatusBadge(status: string) {
  return createElement(
    'span',
    {
      className: `ticket-status-badge ticket-status-badge--${status.toLowerCase()}`,
    },
    createElement('span', {
      'aria-hidden': 'true',
      className: 'ticket-status-badge-icon',
    }),
    translateTicketStatus(status),
  );
}
