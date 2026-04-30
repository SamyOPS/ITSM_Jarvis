import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  ArrowDown,
  ArrowUp,
  BadgeAlert,
  Search,
  X,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { UserRole } from '../../domain/auth/user-role';

import {
  translateChannel,
  translateIncidentSeverity,
  translatePriority,
  translateTicketStatus,
} from '../../domain/i18n/ticketing-labels';

import type {
  ReferentialCatalogSnapshot,
  ReferentialCi,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';

import type { CreatedIncidentSnapshot } from '../../domain/ticketing/created-incident';

import type { CreatedRequestSnapshot } from '../../domain/ticketing/created-request';

import {
  INCIDENT_SEVERITIES,
} from '../../domain/ticketing/incident-severity';

import type { TicketCommentSnapshot } from '../../domain/ticketing/ticket-comment';
import type { TicketAttachmentSnapshot } from '../../domain/ticketing/ticket-attachment';
import type { TicketDetailSnapshot } from '../../domain/ticketing/ticket-detail';

import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';

import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';
import { fetchUserDirectory } from '../../infrastructure/api/auth-api';

import {
  addTicketComment,
  addTicketAttachment,
  assignTicket,
  deleteTicket,
  deleteTicketAttachment,
  deleteTicketAttachmentBinary,
  deleteTicketComment,
  changeTicketStatus,
  createIncident,
  createRequest,
  downloadTicketAttachmentBinary,
  getTicketAttachments,
  getTicketById,
  getTicketComments,
  searchTickets,
  updateTicket,
  uploadTicketAttachmentBinary,
} from '../../infrastructure/api/ticketing-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';
import {
  EMPTY_CATALOG,
  INCIDENT_LOOKUP_PAGE_SIZE,
  INITIAL_ASSIGNMENT_DRAFT,
  INITIAL_ATTACHMENT_DRAFT,
  INITIAL_COMMENT_DRAFT,
  INITIAL_INCIDENT_DRAFT,
  INITIAL_REQUEST_DRAFT,
  INITIAL_SEARCH_FILTERS,
  INITIAL_TICKET_EDIT_DRAFT,
  REQUEST_DEFAULT_CATEGORY_NAME,
  TICKET_ATTACHMENTS_BUCKET_ID,
  TICKETS_PER_PAGE,
} from './agent-page/constants';
import {
  IncidentLookupDialog,
  TicketConversationPanel,
  TicketDescriptionCard,
  TicketDetailHero,
  TicketDetailTopbar,
  TicketInformationCard,
  TicketListPanel,
} from './agent-page/components';
import type {
  AgentPageProps,
  AssignmentDraftState,
  AttachmentDraftState,
  CommentDraftState,
  IncidentDraftState,
  IncidentLookupKind,
  IncidentLookupSearchField,
  IncidentValidationErrors,
  RequestDraftState,
  RequestValidationErrors,
  TicketEditDraftState,
  TicketListSearchField,
  TicketMode,
  TicketSearchFiltersState,
  TicketStatus,
} from './agent-page/types';

const TICKET_SORT_OPTIONS = [
  {
    value: 'OPERATIONAL_PRIORITY' as const,
    label: 'Priorite operationnelle',
    icon: BadgeAlert,
  },
  {
    value: 'CREATED_AT_DESC' as const,
    label: "Plus recents d'abord",
    icon: ArrowDown,
  },
  {
    value: 'CREATED_AT_ASC' as const,
    label: "Plus anciens d'abord",
    icon: ArrowUp,
  },
];

export function AgentPage({ section, session, ticketId }: AgentPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);

  const [mode, setMode] = useState<TicketMode>('INCIDENT');

  const [incidentDraft, setIncidentDraft] = useState<IncidentDraftState>(
    INITIAL_INCIDENT_DRAFT,
  );

  const [requestDraft, setRequestDraft] = useState<RequestDraftState>(
    INITIAL_REQUEST_DRAFT,
  );

  const [createdIncident, setCreatedIncident] =
    useState<CreatedIncidentSnapshot | null>(null);

  const [createdRequest, setCreatedRequest] =
    useState<CreatedRequestSnapshot | null>(null);

  const [searchFilters, setSearchFilters] = useState<TicketSearchFiltersState>(
    INITIAL_SEARCH_FILTERS,
  );

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    ticketId ?? null,
  );

  const [selectedTicketDetail, setSelectedTicketDetail] =
    useState<TicketDetailSnapshot | null>(null);

  const [selectedTicketComments, setSelectedTicketComments] = useState<
    TicketCommentSnapshot[]
  >([]);

  const [selectedTicketAttachments, setSelectedTicketAttachments] = useState<
    TicketAttachmentSnapshot[]
  >([]);

  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraftState>(
    INITIAL_ASSIGNMENT_DRAFT,
  );
  const [ticketEditDraft, setTicketEditDraft] = useState<TicketEditDraftState>(
    INITIAL_TICKET_EDIT_DRAFT,
  );

  const [commentDraft, setCommentDraft] = useState<CommentDraftState>(
    INITIAL_COMMENT_DRAFT,
  );

  const [attachmentDraft, setAttachmentDraft] = useState<AttachmentDraftState>(
    INITIAL_ATTACHMENT_DRAFT,
  );

  const [incidentCreationAttachmentFiles, setIncidentCreationAttachmentFiles] =
    useState<File[]>([]);

  const [requestCreationAttachmentFiles, setRequestCreationAttachmentFiles] =
    useState<File[]>([]);

  const [statusDraft, setStatusDraft] = useState<TicketStatus>('OPEN');

  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const [isDeletingTicket, setIsDeletingTicket] = useState(false);

  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const [isSubmittingAttachment, setIsSubmittingAttachment] = useState(false);

  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);

  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );

  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const [loadTicketsErrorMessage, setLoadTicketsErrorMessage] = useState<
    string | null
  >(null);

  const [loadDetailErrorMessage, setLoadDetailErrorMessage] = useState<
    string | null
  >(null);

  const [loadCommentsErrorMessage, setLoadCommentsErrorMessage] = useState<
    string | null
  >(null);

  const [loadAttachmentsErrorMessage, setLoadAttachmentsErrorMessage] =
    useState<string | null>(null);

  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
    null,
  );

  const [detailActionErrorMessage, setDetailActionErrorMessage] = useState<
    string | null
  >(null);

  const [detailActionSuccessMessage, setDetailActionSuccessMessage] = useState<
    string | null
  >(null);

  const [commentErrorMessage, setCommentErrorMessage] = useState<string | null>(
    null,
  );

  const [commentSuccessMessage, setCommentSuccessMessage] = useState<
    string | null
  >(null);

  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState<
    string | null
  >(null);

  const [attachmentSuccessMessage, setAttachmentSuccessMessage] = useState<
    string | null
  >(null);

  const [attachmentInputKey, setAttachmentInputKey] = useState(0);

  const [creationAttachmentInputKey, setCreationAttachmentInputKey] =
    useState(0);

  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const [tickets, setTickets] = useState<TicketSummarySnapshot[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [userDirectory, setUserDirectory] = useState<AdminUserSummary[]>([]);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [incidentLookupKind, setIncidentLookupKind] =
    useState<IncidentLookupKind | null>(null);
  const [incidentLookupPage, setIncidentLookupPage] = useState(1);
  const [incidentLookupSearch, setIncidentLookupSearch] = useState('');
  const [incidentLookupSearchField, setIncidentLookupSearchField] =
    useState<IncidentLookupSearchField>('IDENTIFIER');

  const [incidentValidationErrors, setIncidentValidationErrors] =
    useState<IncidentValidationErrors>({});

  const [requestValidationErrors, setRequestValidationErrors] =
    useState<RequestValidationErrors>({});

  const canManageTicket = canManageTicketActions(session.user.role);
  const showIncidentAdvancedFields =
    mode === 'INCIDENT' && canManageTicketActions(session.user.role);
  const showRequestAdvancedFields =
    mode === 'REQUEST' && canManageTicketActions(session.user.role);
  const showCreationChannelField = canManageTicketActions(session.user.role);

  const canDeleteTickets = session.user.role === 'ADMIN';
  const canEditTicket = session.user.role === 'ADMIN';

  const canCreateInternalComments = canCreateInternalTicketComments(
    session.user.role,
  );

  const isIncidentCreatePage = section === 'INCIDENT_CREATE';
  const isArchiveListPage = section === 'ARCHIVES';
  const isArchiveDetailPage = section === 'ARCHIVE_DETAIL';
  const isAssignedToMePage = section === 'ASSIGNED_TO_ME';
  const isMyTicketsPage = section === 'MY_TICKETS';
  const isUnassignedTicketsPage = section === 'UNASSIGNED_TICKETS';
  const isRequestCreatePage = section === 'REQUEST_CREATE';
  const isListPage = section === 'LIST';
  const isDetailPage = section === 'DETAIL';
  const showCreationPanel = isIncidentCreatePage || isRequestCreatePage;
  const showCreationRequesterField = showCreationPanel;
  const showListPanel =
    isListPage ||
    isArchiveListPage ||
    isAssignedToMePage ||
    isMyTicketsPage ||
    isUnassignedTicketsPage;
  const showDetailPanel = isDetailPage || isArchiveDetailPage;
  const creationAttachmentFiles =
    mode === 'INCIDENT'
      ? incidentCreationAttachmentFiles
      : requestCreationAttachmentFiles;
  const detailBackPath = isArchiveDetailPage
    ? '/agent/archives'
    : '/agent/tickets';
  const searchedTickets = useMemo(
    () =>
      filterTicketsByListSearch(
        tickets,
        searchFilters.q,
        userDirectory,
        searchFilters.searchField,
      ),
    [searchFilters.q, searchFilters.searchField, tickets, userDirectory],
  );
  const totalTicketPages = Math.max(
    1,
    Math.ceil(searchedTickets.length / TICKETS_PER_PAGE),
  );
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const ticketListTitle = getTicketListTitle(section, session.user.role);
  const ticketListDescription = getTicketListDescription(section);
  const ticketListEmptyMessage = getTicketListEmptyMessage(section);

  useEffect(() => {
    if (showDetailPanel) {
      setSelectedTicketId(ticketId ?? null);
      return;
    }

    setSelectedTicketId(null);
  }, [showDetailPanel, ticketId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog(): Promise<void> {
      setIsLoading(true);

      setLoadErrorMessage(null);

      try {
        const nextCatalog = await fetchReferentialCatalog();

        if (cancelled) {
          return;
        }

        setCatalog(nextCatalog);
      } catch (error) {
        if (!cancelled) {
          setLoadErrorMessage(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement des referentiels ticket',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUserDirectory(): Promise<void> {
      try {
        const users = await fetchUserDirectory(session.accessToken);

        if (!cancelled) {
          setUserDirectory(users);
        }
      } catch {
        if (!cancelled) {
          setUserDirectory([]);
        }
      }
    }

    void loadUserDirectory();

    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  useEffect(() => {
    setTicketPage(1);
  }, [
    searchFilters.categoryId,
    searchFilters.priorityId,
    searchFilters.q,
    searchFilters.searchField,
    searchFilters.sortBy,
    searchFilters.status,
    searchFilters.type,
  ]);

  useEffect(() => {
    setIncidentLookupPage(1);
  }, [incidentLookupKind, incidentLookupSearch, incidentLookupSearchField]);

  useEffect(() => {
    if (!showCreationRequesterField) {
      return;
    }

    const ensureCurrentUserAsRequester = <
      TDraft extends IncidentDraftState | RequestDraftState,
    >(
      currentDraft: TDraft,
    ): TDraft => {
      if (currentDraft.requestedForUserId.trim()) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        requestedForUserId: session.user.id,
      };
    };

    if (mode === 'INCIDENT') {
      setIncidentDraft(ensureCurrentUserAsRequester);
      return;
    }

    setRequestDraft(ensureCurrentUserAsRequester);
  }, [mode, session.user.id, showCreationRequesterField]);

  useEffect(() => {
    if (!showListPanel) {
      return;
    }

    if (ticketPage > totalTicketPages) {
      setTicketPage(totalTicketPages);
    }
  }, [showListPanel, ticketPage, totalTicketPages]);

  useEffect(() => {
    if (!showListPanel) {
      return;
    }

    if (!selectedTicketId) {
      return;
    }

    const selectedIndex = searchedTickets.findIndex(
      (ticket) => ticket.id === selectedTicketId,
    );

    if (selectedIndex === -1) {
      return;
    }

    const nextPage = Math.floor(selectedIndex / TICKETS_PER_PAGE) + 1;

    if (nextPage !== ticketPage) {
      setTicketPage(nextPage);
    }
  }, [searchedTickets, showListPanel, selectedTicketId, ticketPage]);

  useEffect(() => {
    if (isIncidentCreatePage) {
      setMode('INCIDENT');
      return;
    }

    if (isRequestCreatePage) {
      setMode('REQUEST');
    }
  }, [isIncidentCreatePage, isRequestCreatePage]);

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

  useEffect(() => {
    if (!showListPanel) {
      return;
    }

    let cancelled = false;

    async function loadTickets(): Promise<void> {
      setIsLoadingTickets(true);

      setLoadTicketsErrorMessage(null);

      try {
        const nextTickets = await searchTickets(session.accessToken, {
          categoryId: normalizeOptionalId(searchFilters.categoryId),

          includeArchived: isArchiveListPage,

          priorityId: normalizeOptionalId(searchFilters.priorityId),

          q: null,

          status: searchFilters.status || null,

          type: searchFilters.type || null,
        });

        if (cancelled) {
          return;
        }

        const activeTickets = isArchiveListPage
          ? nextTickets.filter((ticket) => ticket.archivedAt)
          : nextTickets.filter((ticket) => !ticket.archivedAt);
        let displayedTickets = activeTickets;

        if (isMyTicketsPage) {
          displayedTickets = activeTickets.filter(
            (ticket) => ticket.createdByUserId === session.user.id,
          );
        } else if (isListPage && session.user.role === 'DEMANDEUR') {
          displayedTickets = activeTickets.filter(
            (ticket) =>
              ticket.createdByUserId === session.user.id ||
              ticket.requestedForUserId === session.user.id,
          );
        } else if (isAssignedToMePage) {
          displayedTickets = activeTickets.filter(
            (ticket) => ticket.assignedToUserId === session.user.id,
          );
        } else if (isUnassignedTicketsPage) {
          displayedTickets = activeTickets.filter(
            (ticket) => !ticket.assignedToUserId,
          );
        }

        setTickets(displayedTickets);

        if (
          selectedTicketId &&
          !displayedTickets.some((ticket) => ticket.id === selectedTicketId)
        ) {
          setSelectedTicketId(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadTicketsErrorMessage(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement des tickets',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTickets(false);
        }
      }
    }

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, [
    isArchiveListPage,
    isAssignedToMePage,
    isListPage,
    isMyTicketsPage,
    isUnassignedTicketsPage,
    searchFilters.categoryId,

    searchFilters.priorityId,

    searchFilters.status,

    searchFilters.type,

    selectedTicketId,

    session.accessToken,
    session.user.id,
    session.user.role,
    showListPanel,
  ]);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicketDetail(null);

      setSelectedTicketComments([]);

      setSelectedTicketAttachments([]);

      setCommentDraft(INITIAL_COMMENT_DRAFT);

      setAttachmentDraft(INITIAL_ATTACHMENT_DRAFT);

      setAttachmentInputKey(0);

      setDeletingAttachmentId(null);

      setDeletingCommentId(null);

      setLoadDetailErrorMessage(null);

      setLoadCommentsErrorMessage(null);

      setLoadAttachmentsErrorMessage(null);

      setDetailActionErrorMessage(null);

      setDetailActionSuccessMessage(null);

      setCommentErrorMessage(null);

      setCommentSuccessMessage(null);

      setAttachmentErrorMessage(null);

      setAttachmentSuccessMessage(null);

      setIsEditingInfo(false);

      return;
    }

    const currentTicketId = selectedTicketId;

    let cancelled = false;

    async function loadSelectedTicket(): Promise<void> {
      setIsLoadingDetail(true);

      setLoadDetailErrorMessage(null);

      try {
        const nextTicket = await getTicketById(
          session.accessToken,
          currentTicketId,
        );

        if (cancelled) {
          return;
        }

        setSelectedTicketDetail(nextTicket);

        setAssignmentDraft({
          assignedToUserId: nextTicket.ticket.assignedToUserId ?? '',

          assignmentGroupId: nextTicket.ticket.assignmentGroupId ?? '',
        });

        setTicketEditDraft({
          categoryId: nextTicket.ticket.categoryId,
          channelId: nextTicket.ticket.channelId ?? '',
          ciId: nextTicket.ticket.ciId ?? '',
          description: nextTicket.ticket.description,
          impact: nextTicket.incident?.impact ?? 'MEDIUM',
          requestedForUserId: nextTicket.ticket.requestedForUserId ?? '',
          rootCause: nextTicket.incident?.rootCause ?? '',
          title: nextTicket.ticket.title,
          urgency: nextTicket.incident?.urgency ?? 'MEDIUM',
          workaround: nextTicket.incident?.workaround ?? '',
        });

        setStatusDraft(asTicketStatus(nextTicket.ticket.status) ?? 'OPEN');
      } catch (error) {
        if (!cancelled) {
          setLoadDetailErrorMessage(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement du detail ticket',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadSelectedTicket();

    return () => {
      cancelled = true;
    };
  }, [selectedTicketId, session.accessToken]);

  useEffect(() => {
    if (!selectedTicketId) {
      return;
    }

    const currentTicketId = selectedTicketId;

    let cancelled = false;

    async function loadSelectedTicketComments(): Promise<void> {
      setIsLoadingComments(true);

      setLoadCommentsErrorMessage(null);

      try {
        const nextComments = await getTicketComments(
          session.accessToken,
          currentTicketId,
        );

        if (cancelled) {
          return;
        }

        setSelectedTicketComments(nextComments);
      } catch (error) {
        if (!cancelled) {
          setLoadCommentsErrorMessage(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement des commentaires',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingComments(false);
        }
      }
    }

    void loadSelectedTicketComments();

    return () => {
      cancelled = true;
    };
  }, [selectedTicketId, session.accessToken]);

  useEffect(() => {
    if (!selectedTicketId) {
      return;
    }

    const currentTicketId = selectedTicketId;

    let cancelled = false;

    async function loadSelectedTicketAttachments(): Promise<void> {
      setIsLoadingAttachments(true);

      setLoadAttachmentsErrorMessage(null);

      try {
        const nextAttachments = await getTicketAttachments(
          session.accessToken,
          currentTicketId,
        );

        if (cancelled) {
          return;
        }

        setSelectedTicketAttachments(nextAttachments);
      } catch (error) {
        if (!cancelled) {
          setLoadAttachmentsErrorMessage(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement des pieces jointes',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAttachments(false);
        }
      }
    }

    void loadSelectedTicketAttachments();

    return () => {
      cancelled = true;
    };
  }, [selectedTicketId, session.accessToken]);

  const categoriesById = useMemo(
    () =>
      new Map(catalog.categories.map((category) => [category.id, category])),

    [catalog.categories],
  );

  const requestDefaultCategory = useMemo(
    () =>
      catalog.categories.find(
        (category) =>
          normalizeSearchText(category.name) ===
          normalizeSearchText(REQUEST_DEFAULT_CATEGORY_NAME),
      ),
    [catalog.categories],
  );

  const incidentCategoryOptions = useMemo(
    () =>
      catalog.categories.filter(
        (category) =>
          normalizeSearchText(category.name) !==
          normalizeSearchText(REQUEST_DEFAULT_CATEGORY_NAME),
      ),
    [catalog.categories],
  );

  const prioritiesById = useMemo(
    () =>
      new Map(catalog.priorities.map((priority) => [priority.id, priority])),

    [catalog.priorities],
  );

  const sortedTickets = useMemo(() => {
    if (searchFilters.sortBy === 'CREATED_AT_DESC') {
      return sortTicketsByCreatedAtDesc(searchedTickets);
    }

    if (searchFilters.sortBy === 'CREATED_AT_ASC') {
      return sortTicketsByCreatedAtAsc(searchedTickets);
    }

    return sortTicketsByOperationalPriority(searchedTickets, prioritiesById);
  }, [prioritiesById, searchFilters.sortBy, searchedTickets]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (ticketPage - 1) * TICKETS_PER_PAGE;
    return sortedTickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);
  }, [sortedTickets, ticketPage]);

  const channelsById = useMemo(
    () => new Map(catalog.channels.map((channel) => [channel.id, channel])),

    [catalog.channels],
  );

  const portalChannel = useMemo(
    () =>
      catalog.channels.find((channel) => {
        const normalizedName = normalizeSearchText(channel.name);

        return normalizedName === 'portail' || normalizedName === 'portal';
      }),
    [catalog.channels],
  );

  const cisById = useMemo(
    () => new Map(catalog.cis.map((ci) => [ci.id, ci])),

    [catalog.cis],
  );

  const ciTypesById = useMemo(
    () => new Map(catalog.ciTypes.map((ciType) => [ciType.id, ciType])),

    [catalog.ciTypes],
  );

  const groupsById = useMemo(
    () => new Map(catalog.groups.map((group) => [group.id, group])),

    [catalog.groups],
  );

  const currentUserSummary = useMemo<AdminUserSummary>(
    () => ({
      displayName: null,
      email: session.user.email,
      firstName: session.user.firstName,
      groupId: null,
      id: session.user.id,
      isActive: true,
      lastName: session.user.lastName,
      role: session.user.role,
    }),
    [session.user],
  );

  const incidentSelectableUsers = useMemo(() => {
    if (userDirectory.some((user) => user.id === session.user.id)) {
      return userDirectory;
    }

    return [currentUserSummary, ...userDirectory];
  }, [currentUserSummary, session.user.id, userDirectory]);

  const usersById = useMemo(
    () => new Map(incidentSelectableUsers.map((user) => [user.id, user])),
    [incidentSelectableUsers],
  );

  const technicians = useMemo(
    () =>
      incidentSelectableUsers.filter(
        (user) =>
          user.isActive && (user.role === 'AGENT' || user.role === 'ADMIN'),
      ),
    [incidentSelectableUsers],
  );

  const requesters = useMemo(
    () => incidentSelectableUsers.filter((user) => user.isActive),
    [incidentSelectableUsers],
  );

  const assignableTechnicians = useMemo(
    () =>
      technicians.filter(
        (technician) =>
          !assignmentDraft.assignmentGroupId ||
          technician.groupId === assignmentDraft.assignmentGroupId,
      ),
    [assignmentDraft.assignmentGroupId, technicians],
  );

  const selectedCreationAssignmentGroupId =
    mode === 'INCIDENT'
      ? incidentDraft.assignmentGroupId
      : requestDraft.assignmentGroupId;
  const selectedCreationTechnicianId =
    mode === 'INCIDENT'
      ? incidentDraft.assignedToUserId
      : requestDraft.assignedToUserId;
  const selectedCreationTechnician = usersById.get(
    selectedCreationTechnicianId,
  );
  const incidentLookupTechnicians = useMemo(
    () =>
      technicians.filter(
        (technician) =>
          !selectedCreationAssignmentGroupId ||
          technician.groupId === selectedCreationAssignmentGroupId,
      ),
    [selectedCreationAssignmentGroupId, technicians],
  );
  const incidentLookupGroups = useMemo(
    () =>
      selectedCreationTechnician?.groupId
        ? catalog.groups.filter(
            (group) => group.id === selectedCreationTechnician.groupId,
          )
        : catalog.groups,
    [catalog.groups, selectedCreationTechnician?.groupId],
  );

  const incidentLookupSource =
    incidentLookupKind === 'ASSIGNEE' ? incidentLookupTechnicians : requesters;
  const filteredIncidentLookupUsers = useMemo(
    () =>
      filterIncidentLookupUsers(
        incidentLookupSource,
        incidentLookupSearch,
        incidentLookupSearchField,
        groupsById,
      ),
    [
      groupsById,
      incidentLookupSearch,
      incidentLookupSearchField,
      incidentLookupSource,
    ],
  );
  const filteredIncidentLookupGroups = useMemo(
    () =>
      filterIncidentLookupGroups(
        incidentLookupGroups,
        incidentLookupSearch,
        incidentLookupSearchField,
      ),
    [incidentLookupGroups, incidentLookupSearch, incidentLookupSearchField],
  );
  const filteredIncidentLookupEquipment = useMemo(() => {
    const equipmentSource =
      incidentLookupKind === 'INCIDENT_EQUIPMENT' ? [] : catalog.cis;

    return filterIncidentLookupEquipment(
      equipmentSource,
      incidentLookupSearch,
      incidentLookupSearchField,
      ciTypesById,
    );
  }, [
    catalog.cis,
    ciTypesById,
    incidentLookupKind,
    incidentLookupSearch,
    incidentLookupSearchField,
  ]);
  const incidentLookupResultCount =
    incidentLookupKind === 'ASSIGNMENT_GROUP'
      ? filteredIncidentLookupGroups.length
      : incidentLookupKind === 'INCIDENT_EQUIPMENT' ||
          incidentLookupKind === 'REQUEST_EQUIPMENT'
        ? filteredIncidentLookupEquipment.length
        : filteredIncidentLookupUsers.length;
  const incidentLookupTotalPages = Math.max(
    1,
    Math.ceil(incidentLookupResultCount / INCIDENT_LOOKUP_PAGE_SIZE),
  );
  const paginatedIncidentLookupUsers = filteredIncidentLookupUsers.slice(
    (incidentLookupPage - 1) * INCIDENT_LOOKUP_PAGE_SIZE,
    incidentLookupPage * INCIDENT_LOOKUP_PAGE_SIZE,
  );
  const paginatedIncidentLookupGroups = filteredIncidentLookupGroups.slice(
    (incidentLookupPage - 1) * INCIDENT_LOOKUP_PAGE_SIZE,
    incidentLookupPage * INCIDENT_LOOKUP_PAGE_SIZE,
  );
  const paginatedIncidentLookupEquipment =
    filteredIncidentLookupEquipment.slice(
      (incidentLookupPage - 1) * INCIDENT_LOOKUP_PAGE_SIZE,
      incidentLookupPage * INCIDENT_LOOKUP_PAGE_SIZE,
    );
  const selectedIncidentTechnician = usersById.get(
    incidentDraft.assignedToUserId,
  );
  const selectedIncidentGroup = groupsById.get(incidentDraft.assignmentGroupId);
  const selectedIncidentRequester = usersById.get(
    incidentDraft.requestedForUserId,
  );
  const selectedIncidentEquipment = cisById.get(incidentDraft.ciId);
  const selectedRequestTechnician = usersById.get(
    requestDraft.assignedToUserId,
  );
  const selectedRequestGroup = groupsById.get(requestDraft.assignmentGroupId);
  const selectedRequestRequester = usersById.get(
    requestDraft.requestedForUserId,
  );
  const selectedRequestEquipment = cisById.get(requestDraft.ciId);
  const selectedIncidentLookupUserId =
    incidentLookupKind === 'ASSIGNEE'
      ? mode === 'INCIDENT'
        ? incidentDraft.assignedToUserId
        : requestDraft.assignedToUserId
      : incidentLookupKind === 'REQUESTER'
        ? mode === 'INCIDENT'
          ? incidentDraft.requestedForUserId
          : requestDraft.requestedForUserId
        : '';
  const selectedIncidentLookupGroupId =
    incidentLookupKind === 'ASSIGNMENT_GROUP'
      ? mode === 'INCIDENT'
        ? incidentDraft.assignmentGroupId
        : requestDraft.assignmentGroupId
      : '';
  const selectedIncidentLookupEquipmentId =
    incidentLookupKind === 'INCIDENT_EQUIPMENT'
      ? incidentDraft.ciId
      : incidentLookupKind === 'REQUEST_EQUIPMENT'
        ? requestDraft.ciId
        : '';

  useEffect(() => {
    if (incidentLookupPage > incidentLookupTotalPages) {
      setIncidentLookupPage(incidentLookupTotalPages);
    }
  }, [incidentLookupPage, incidentLookupTotalPages]);

  function handleIncidentFieldChange(
    field: keyof IncidentDraftState,

    value: string,
  ): void {
    setIncidentDraft((currentDraft) => {
      if (field === 'assignedToUserId') {
        const selectedTechnician = usersById.get(value);

        return {
          ...currentDraft,

          assignedToUserId: value,

          assignmentGroupId:
            selectedTechnician?.groupId ?? currentDraft.assignmentGroupId,
        };
      }

      if (field === 'assignmentGroupId') {
        const selectedTechnician = usersById.get(currentDraft.assignedToUserId);

        return {
          ...currentDraft,

          assignedToUserId:
            selectedTechnician?.groupId === value
              ? currentDraft.assignedToUserId
              : '',

          assignmentGroupId: value,
        };
      }

      return {
        ...currentDraft,

        [field]: value,
      };
    });

    setIncidentValidationErrors((currentErrors) => ({
      ...currentErrors,

      [field]: undefined,
    }));

    setSubmitErrorMessage(null);
  }

  function handleRequestFieldChange(
    field: keyof RequestDraftState,

    value: string,
  ): void {
    setRequestDraft((currentDraft) => {
      if (field === 'assignedToUserId') {
        const selectedTechnician = usersById.get(value);

        return {
          ...currentDraft,

          assignedToUserId: value,

          assignmentGroupId:
            selectedTechnician?.groupId ?? currentDraft.assignmentGroupId,
        };
      }

      if (field === 'assignmentGroupId') {
        const selectedTechnician = usersById.get(currentDraft.assignedToUserId);

        return {
          ...currentDraft,

          assignedToUserId:
            selectedTechnician?.groupId === value
              ? currentDraft.assignedToUserId
              : '',

          assignmentGroupId: value,
        };
      }

      return {
        ...currentDraft,

        [field]: value,
      };
    });

    setRequestValidationErrors((currentErrors) => ({
      ...currentErrors,

      [field]: undefined,
    }));

    setSubmitErrorMessage(null);
  }

  function handleSearchFilterChange(
    field: keyof TicketSearchFiltersState,

    value: string,
  ): void {
    setSearchFilters((currentFilters) => ({
      ...currentFilters,

      [field]: value,
    }));
  }

  function openIncidentLookup(kind: IncidentLookupKind): void {
    if (kind === 'INCIDENT_EQUIPMENT' || kind === 'REQUEST_EQUIPMENT') {
      const selectedEquipmentId =
        kind === 'INCIDENT_EQUIPMENT' ? incidentDraft.ciId : requestDraft.ciId;
      const equipmentSource = kind === 'INCIDENT_EQUIPMENT' ? [] : catalog.cis;
      const selectedEquipmentIndex = filterIncidentLookupEquipment(
        equipmentSource,
        '',
        'IDENTIFIER',
        ciTypesById,
      ).findIndex((ci) => ci.id === selectedEquipmentId);

      setIncidentLookupKind(kind);
      setIncidentLookupSearch('');
      setIncidentLookupSearchField('IDENTIFIER');
      setIncidentLookupPage(
        selectedEquipmentIndex >= 0
          ? Math.floor(selectedEquipmentIndex / INCIDENT_LOOKUP_PAGE_SIZE) + 1
          : 1,
      );

      return;
    }

    if (kind === 'ASSIGNMENT_GROUP') {
      const selectedGroupId =
        mode === 'INCIDENT'
          ? incidentDraft.assignmentGroupId
          : requestDraft.assignmentGroupId;
      const selectedGroupIndex = filterIncidentLookupGroups(
        incidentLookupGroups,
        '',
        'IDENTIFIER',
      ).findIndex((group) => group.id === selectedGroupId);

      setIncidentLookupKind(kind);
      setIncidentLookupSearch('');
      setIncidentLookupSearchField('IDENTIFIER');
      setIncidentLookupPage(
        selectedGroupIndex >= 0
          ? Math.floor(selectedGroupIndex / INCIDENT_LOOKUP_PAGE_SIZE) + 1
          : 1,
      );

      return;
    }

    const source = kind === 'ASSIGNEE' ? incidentLookupTechnicians : requesters;
    const selectedUserId =
      kind === 'ASSIGNEE'
        ? mode === 'INCIDENT'
          ? incidentDraft.assignedToUserId
          : requestDraft.assignedToUserId
        : mode === 'INCIDENT'
          ? incidentDraft.requestedForUserId
          : requestDraft.requestedForUserId;
    const selectedUserIndex = filterIncidentLookupUsers(
      source,
      '',
      'IDENTIFIER',
      groupsById,
    ).findIndex((user) => user.id === selectedUserId);

    setIncidentLookupKind(kind);
    setIncidentLookupSearch('');
    setIncidentLookupSearchField('IDENTIFIER');
    setIncidentLookupPage(
      selectedUserIndex >= 0
        ? Math.floor(selectedUserIndex / INCIDENT_LOOKUP_PAGE_SIZE) + 1
        : 1,
    );
  }

  function closeIncidentLookup(): void {
    setIncidentLookupKind(null);
    setIncidentLookupSearch('');
    setIncidentLookupSearchField('IDENTIFIER');
    setIncidentLookupPage(1);
  }

  function handleIncidentLookupSelect(user: AdminUserSummary): void {
    if (incidentLookupKind === 'ASSIGNEE') {
      if (mode === 'INCIDENT') {
        handleIncidentFieldChange('assignedToUserId', user.id);
      } else {
        handleRequestFieldChange('assignedToUserId', user.id);
      }
    }

    if (incidentLookupKind === 'REQUESTER') {
      if (mode === 'INCIDENT') {
        handleIncidentFieldChange('requestedForUserId', user.id);
      } else {
        handleRequestFieldChange('requestedForUserId', user.id);
      }
    }

    closeIncidentLookup();
  }

  function handleIncidentEquipmentLookupSelect(ci: ReferentialCi): void {
    if (incidentLookupKind === 'INCIDENT_EQUIPMENT') {
      handleIncidentFieldChange('ciId', ci.id);
    } else {
      handleRequestFieldChange('ciId', ci.id);
    }

    closeIncidentLookup();
  }

  function handleIncidentGroupLookupSelect(group: ReferentialGroup): void {
    if (mode === 'INCIDENT') {
      handleIncidentFieldChange('assignmentGroupId', group.id);
    } else {
      handleRequestFieldChange('assignmentGroupId', group.id);
    }

    closeIncidentLookup();
  }

  function handleAssignmentFieldChange(
    field: keyof AssignmentDraftState,

    value: string,
  ): void {
    setAssignmentDraft((currentDraft) => {
      if (field === 'assignedToUserId') {
        const selectedTechnician = usersById.get(value);

        return {
          ...currentDraft,

          assignedToUserId: value,

          assignmentGroupId:
            selectedTechnician?.groupId ?? currentDraft.assignmentGroupId,
        };
      }

      if (field === 'assignmentGroupId') {
        const selectedTechnician = usersById.get(currentDraft.assignedToUserId);

        return {
          ...currentDraft,

          assignedToUserId:
            selectedTechnician?.groupId === value
              ? currentDraft.assignedToUserId
              : '',

          assignmentGroupId: value,
        };
      }

      return {
        ...currentDraft,

        [field]: value,
      };
    });

    setDetailActionErrorMessage(null);

    setDetailActionSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedCreationAttachmentFiles = creationAttachmentFiles;

    setSubmitErrorMessage(null);

    setCreatedIncident(null);

    setCreatedRequest(null);

    if (mode === 'INCIDENT') {
      const errors = validateIncidentDraft(incidentDraft);

      setIncidentValidationErrors(errors);

      setRequestValidationErrors({});

      if (Object.keys(errors).length > 0) {
        return;
      }

      setIsSubmitting(true);

      try {
        const incidentChannelId = showCreationChannelField
          ? normalizeOptionalId(incidentDraft.channelId)
          : (portalChannel?.id ?? null);

        if (!showCreationChannelField && !incidentChannelId) {
          throw new Error("Le canal 'Portail' est manquant dans Supabase.");
        }

        const result = await createIncident(session.accessToken, {
          categoryId: incidentDraft.categoryId.trim(),

          channelId: incidentChannelId,

          ciId: normalizeOptionalId(incidentDraft.ciId),

          description: incidentDraft.description.trim(),

          impact: incidentDraft.impact || 'MEDIUM',

          requestedForUserId: showCreationRequesterField
            ? (normalizeOptionalId(incidentDraft.requestedForUserId) ??
              session.user.id)
            : null,

          title: incidentDraft.title.trim(),

          urgency: incidentDraft.urgency || 'MEDIUM',
        });

        const postCreationWarnings: string[] = [];
        let ticketForList: TicketSummarySnapshot = {
          ...result.ticket,
          priorityName: result.priorityName,
        };

        const incidentAssignedToUserId = normalizeOptionalId(
          incidentDraft.assignedToUserId,
        );
        const incidentAssignmentGroupId = normalizeOptionalId(
          incidentDraft.assignmentGroupId,
        );

        if (
          showIncidentAdvancedFields &&
          (incidentAssignedToUserId || incidentAssignmentGroupId)
        ) {
          const selectedTechnician = incidentAssignedToUserId
            ? usersById.get(incidentAssignedToUserId)
            : null;

          try {
            const updatedTicket = await assignTicket(
              session.accessToken,
              result.ticket.id,
              {
                assignedToUserId: incidentAssignedToUserId,
                assignmentGroupId:
                  selectedTechnician?.groupId ?? incidentAssignmentGroupId,
              },
            );

            ticketForList = {
              ...updatedTicket.ticket,
              priorityName: result.priorityName,
            };
          } catch (error) {
            postCreationWarnings.push(
              error instanceof Error
                ? `l'assignation a echoue : ${error.message}`
                : "l'assignation a echoue",
            );
          }
        }

        if (showIncidentAdvancedFields && incidentDraft.comment.trim()) {
          try {
            await addTicketComment(session.accessToken, result.ticket.id, {
              body: incidentDraft.comment.trim(),
              isInternal: false,
            });
          } catch (error) {
            postCreationWarnings.push(
              error instanceof Error
                ? `l'ajout du commentaire a echoue : ${error.message}`
                : "l'ajout du commentaire a echoue",
            );
          }
        }

        setCreatedIncident(result);

        setSelectedTicketId(result.ticket.id);

        setSearchFilters((currentFilters) => ({
          ...currentFilters,

          type: 'INCIDENT',
        }));

        setTickets((currentTickets) => [
          ticketForList,

          ...currentTickets.filter((ticket) => ticket.id !== result.ticket.id),
        ]);

        const attachmentUploadErrorMessage =
          await uploadCreationAttachmentsIfNeeded(
            result.ticket.id,
            selectedCreationAttachmentFiles,
          );

        setIncidentDraft((currentDraft) => ({
          ...currentDraft,

          description: '',

          title: '',

          assignmentGroupId: '',

          assignedToUserId: '',

          comment: '',

          requestedForUserId: session.user.id,
        }));

        if (!attachmentUploadErrorMessage) {
          resetCreationAttachmentSelection('INCIDENT');
        }

        if (attachmentUploadErrorMessage || postCreationWarnings.length > 0) {
          setSubmitErrorMessage(
            [
              attachmentUploadErrorMessage,
              ...postCreationWarnings.map(
                (warning) => `Ticket cree, mais ${warning}.`,
              ),
            ]
              .filter(Boolean)
              .join(' '),
          );
        }
      } catch (error) {
        setSubmitErrorMessage(
          error instanceof Error
            ? error.message
            : 'Erreur inconnue lors de la creation de l incident',
        );
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const errors = validateRequestDraft(requestDraft);

    setRequestValidationErrors(errors);

    setIncidentValidationErrors({});

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const requestCategoryId =
        requestDraft.categoryId.trim() || requestDefaultCategory?.id || '';

      if (!requestCategoryId) {
        throw new Error(
          "La categorie technique 'Demande' est manquante dans Supabase.",
        );
      }

      const requestChannelId = showCreationChannelField
        ? normalizeOptionalId(requestDraft.channelId)
        : (portalChannel?.id ?? null);

      if (!showCreationChannelField && !requestChannelId) {
        throw new Error("Le canal 'Portail' est manquant dans Supabase.");
      }

      const result = await createRequest(session.accessToken, {
        categoryId: requestCategoryId,

        channelId: requestChannelId,

        ciId: normalizeOptionalId(requestDraft.ciId),

        description: requestDraft.description.trim(),

        priorityId: requestDraft.priorityId.trim(),

        requestedForUserId: showCreationRequesterField
          ? (normalizeOptionalId(requestDraft.requestedForUserId) ??
            session.user.id)
          : null,

        requestType: requestDraft.requestType || null,

        title: requestDraft.title.trim(),
      });

      const postCreationWarnings: string[] = [];
      let ticketForList: TicketSummarySnapshot = {
        ...result.ticket,
        priorityName: result.priorityName,
      };

      const requestAssignedToUserId = normalizeOptionalId(
        requestDraft.assignedToUserId,
      );
      const requestAssignmentGroupId = normalizeOptionalId(
        requestDraft.assignmentGroupId,
      );

      if (
        showRequestAdvancedFields &&
        (requestAssignedToUserId || requestAssignmentGroupId)
      ) {
        const selectedTechnician = requestAssignedToUserId
          ? usersById.get(requestAssignedToUserId)
          : null;

        try {
          const updatedTicket = await assignTicket(
            session.accessToken,
            result.ticket.id,
            {
              assignedToUserId: requestAssignedToUserId,
              assignmentGroupId:
                selectedTechnician?.groupId ?? requestAssignmentGroupId,
            },
          );

          ticketForList = {
            ...updatedTicket.ticket,
            priorityName: result.priorityName,
          };
        } catch (error) {
          postCreationWarnings.push(
            error instanceof Error
              ? `l'assignation a echoue : ${error.message}`
              : "l'assignation a echoue",
          );
        }
      }

      if (showRequestAdvancedFields && requestDraft.comment.trim()) {
        try {
          await addTicketComment(session.accessToken, result.ticket.id, {
            body: requestDraft.comment.trim(),
            isInternal: false,
          });
        } catch (error) {
          postCreationWarnings.push(
            error instanceof Error
              ? `l'ajout du commentaire a echoue : ${error.message}`
              : "l'ajout du commentaire a echoue",
          );
        }
      }

      setCreatedRequest(result);

      setSelectedTicketId(result.ticket.id);

      setSearchFilters((currentFilters) => ({
        ...currentFilters,

        type: 'REQUEST',
      }));

      setTickets((currentTickets) => [
        ticketForList,

        ...currentTickets.filter((ticket) => ticket.id !== result.ticket.id),
      ]);

      const attachmentUploadErrorMessage =
        await uploadCreationAttachmentsIfNeeded(
          result.ticket.id,
          selectedCreationAttachmentFiles,
        );

      setRequestDraft((currentDraft) => ({
        ...currentDraft,

        description: '',

        title: '',

        assignmentGroupId: '',

        assignedToUserId: '',

        comment: '',

        ciId: '',

        requestedForUserId: session.user.id,
      }));

      if (!attachmentUploadErrorMessage) {
        resetCreationAttachmentSelection('REQUEST');
      }

      if (attachmentUploadErrorMessage || postCreationWarnings.length > 0) {
        setSubmitErrorMessage(
          [
            attachmentUploadErrorMessage,
            ...postCreationWarnings.map(
              (warning) => `Ticket cree, mais ${warning}.`,
            ),
          ]
            .filter(Boolean)
            .join(' '),
        );
      }
    } catch (error) {
      setSubmitErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la creation de la demande',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadCreationAttachmentsIfNeeded(
    ticketId: string,
    files: File[],
  ): Promise<string | null> {
    if (files.length === 0) {
      return null;
    }

    try {
      for (const file of files) {
        const storagePath = buildTicketAttachmentStoragePath(
          session.user.id,
          ticketId,
          file.name,
        );

        await uploadTicketAttachmentBinary(
          session.accessToken,
          TICKET_ATTACHMENTS_BUCKET_ID,
          storagePath,
          file,
        );

        await addTicketAttachment(session.accessToken, ticketId, {
          bucketId: TICKET_ATTACHMENTS_BUCKET_ID,
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          storagePath,
        });
      }

      return null;
    } catch (error) {
      return error instanceof Error
        ? `Ticket cree, mais l'ajout des pieces jointes a echoue : ${error.message}`
        : "Ticket cree, mais l'ajout des pieces jointes a echoue.";
    }
  }

  function handleTicketEditFieldChange(
    field: keyof TicketEditDraftState,
    value: string,
  ): void {
    setTicketEditDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));

    setDetailActionErrorMessage(null);
    setDetailActionSuccessMessage(null);
  }

  async function handleSaveInfoEdits(): Promise<void> {
    if (!selectedTicketDetail || (!canEditTicket && !canManageTicket)) {
      return;
    }

    setIsSavingInfo(true);
    setDetailActionErrorMessage(null);
    setDetailActionSuccessMessage(null);

    try {
      if (canEditTicket) {
        const updatedTicket = await updateTicket(
          session.accessToken,
          selectedTicketDetail.ticket.id,
          {
            categoryId: ticketEditDraft.categoryId.trim(),
            channelId: normalizeOptionalId(ticketEditDraft.channelId),
            ciId: normalizeOptionalId(ticketEditDraft.ciId),
            description: ticketEditDraft.description.trim(),
            impact: selectedTicketDetail.incident
              ? ticketEditDraft.impact
              : undefined,
            requestedForUserId: normalizeOptionalId(
              ticketEditDraft.requestedForUserId,
            ),
            rootCause: selectedTicketDetail.incident
              ? normalizeOptionalText(ticketEditDraft.rootCause)
              : undefined,
            title: ticketEditDraft.title.trim(),
            urgency: selectedTicketDetail.incident
              ? ticketEditDraft.urgency
              : undefined,
            workaround: selectedTicketDetail.incident
              ? normalizeOptionalText(ticketEditDraft.workaround)
              : undefined,
          },
        );
        setSelectedTicketDetail(updatedTicket);
        setTicketEditDraft({
          categoryId: updatedTicket.ticket.categoryId,
          channelId: updatedTicket.ticket.channelId ?? '',
          ciId: updatedTicket.ticket.ciId ?? '',
          description: updatedTicket.ticket.description,
          impact: updatedTicket.incident?.impact ?? 'MEDIUM',
          requestedForUserId: updatedTicket.ticket.requestedForUserId ?? '',
          rootCause: updatedTicket.incident?.rootCause ?? '',
          title: updatedTicket.ticket.title,
          urgency: updatedTicket.incident?.urgency ?? 'MEDIUM',
          workaround: updatedTicket.incident?.workaround ?? '',
        });
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket.id === updatedTicket.ticket.id
              ? {
                  ...ticket,
                  categoryId: updatedTicket.ticket.categoryId,
                  channelId: updatedTicket.ticket.channelId,
                  ciId: updatedTicket.ticket.ciId,
                  priorityId: updatedTicket.ticket.priorityId,
                  requestedForUserId: updatedTicket.ticket.requestedForUserId,
                  resolutionDueAt: updatedTicket.ticket.resolutionDueAt,
                  responseDueAt: updatedTicket.ticket.responseDueAt,
                  title: updatedTicket.ticket.title,
                }
              : ticket,
          ),
        );
      }

      if (canManageTicket) {
        const updatedTicket = await assignTicket(
          session.accessToken,
          selectedTicketDetail.ticket.id,
          {
            assignedToUserId: normalizeOptionalId(
              assignmentDraft.assignedToUserId,
            ),
            assignmentGroupId: normalizeOptionalId(
              assignmentDraft.assignmentGroupId,
            ),
          },
        );
        setSelectedTicketDetail(updatedTicket);
        setAssignmentDraft({
          assignedToUserId: updatedTicket.ticket.assignedToUserId ?? '',
          assignmentGroupId: updatedTicket.ticket.assignmentGroupId ?? '',
        });
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket.id === updatedTicket.ticket.id
              ? {
                  ...ticket,
                  assignedToUserId: updatedTicket.ticket.assignedToUserId,
                  assignmentGroupId: updatedTicket.ticket.assignmentGroupId,
                  status: updatedTicket.ticket.status,
                }
              : ticket,
          ),
        );
      }

      setIsEditingInfo(false);
      setDetailActionSuccessMessage('Informations mises à jour.');
    } catch (error) {
      setDetailActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la mise à jour.',
      );
    } finally {
      setIsSavingInfo(false);
    }
  }

  function handleCancelEditInfo(): void {
    if (selectedTicketDetail) {
      setTicketEditDraft({
        categoryId: selectedTicketDetail.ticket.categoryId,
        channelId: selectedTicketDetail.ticket.channelId ?? '',
        ciId: selectedTicketDetail.ticket.ciId ?? '',
        description: selectedTicketDetail.ticket.description,
        impact: selectedTicketDetail.incident?.impact ?? 'MEDIUM',
        requestedForUserId:
          selectedTicketDetail.ticket.requestedForUserId ?? '',
        rootCause: selectedTicketDetail.incident?.rootCause ?? '',
        title: selectedTicketDetail.ticket.title,
        urgency: selectedTicketDetail.incident?.urgency ?? 'MEDIUM',
        workaround: selectedTicketDetail.incident?.workaround ?? '',
      });
      setAssignmentDraft({
        assignedToUserId: selectedTicketDetail.ticket.assignedToUserId ?? '',
        assignmentGroupId: selectedTicketDetail.ticket.assignmentGroupId ?? '',
      });
    }
    setIsEditingInfo(false);
    setDetailActionErrorMessage(null);
    setDetailActionSuccessMessage(null);
  }

  async function handleDeleteTicket(): Promise<void> {
    if (!selectedTicketDetail || !canDeleteTickets) {
      return;
    }

    const shouldDelete = window.confirm(
      `Supprimer definitivement le ticket ${selectedTicketDetail.ticket.number} ?`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingTicket(true);
    setDetailActionErrorMessage(null);
    setDetailActionSuccessMessage(null);

    try {
      const deletedTicketId = selectedTicketDetail.ticket.id;

      await deleteTicket(session.accessToken, deletedTicketId);

      setTickets((currentTickets) =>
        currentTickets.filter((ticket) => ticket.id !== deletedTicketId),
      );
      setSelectedTicketId(null);
      setSelectedTicketDetail(null);
      setSelectedTicketComments([]);
      setSelectedTicketAttachments([]);
      navigateTo('/agent/tickets');
    } catch (error) {
      setDetailActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la suppression du ticket',
      );
    } finally {
      setIsDeletingTicket(false);
    }
  }

  async function handleStatusSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedTicketDetail) {
      return;
    }

    setIsSubmittingStatus(true);

    setDetailActionErrorMessage(null);

    setDetailActionSuccessMessage(null);

    try {
      const updatedTicket = await changeTicketStatus(
        session.accessToken,

        selectedTicketDetail.ticket.id,

        {
          status: statusDraft,
        },
      );

      setSelectedTicketDetail(updatedTicket);

      setStatusDraft(asTicketStatus(updatedTicket.ticket.status) ?? 'OPEN');

      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === updatedTicket.ticket.id
            ? {
                ...ticket,

                assignedToUserId: updatedTicket.ticket.assignedToUserId,

                assignmentGroupId: updatedTicket.ticket.assignmentGroupId,

                status: updatedTicket.ticket.status,
              }
            : ticket,
        ),
      );

      setDetailActionSuccessMessage('Statut mis a jour.');
    } catch (error) {
      setDetailActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du changement de statut',
      );
    } finally {
      setIsSubmittingStatus(false);
    }
  }

  function handleCommentBodyChange(value: string): void {
    setCommentDraft((currentDraft) => ({
      ...currentDraft,

      body: value,
    }));

    setCommentErrorMessage(null);

    setCommentSuccessMessage(null);
  }

  function handleCommentInternalToggle(isInternal: boolean): void {
    setCommentDraft((currentDraft) => ({
      ...currentDraft,

      isInternal,
    }));

    setCommentErrorMessage(null);

    setCommentSuccessMessage(null);
  }

  function handleAttachmentSelection(file: File | null): void {
    setAttachmentDraft({ file });
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);
  }

  function handleCreationAttachmentSelection(fileList: FileList | null): void {
    const incomingFiles = Array.from(fileList ?? []);

    if (incomingFiles.length === 0) {
      return;
    }

    const setFiles =
      mode === 'INCIDENT'
        ? setIncidentCreationAttachmentFiles
        : setRequestCreationAttachmentFiles;

    setFiles((currentFiles) => {
      const knownFileKeys = new Set(currentFiles.map(getLocalFileKey));
      const nextFiles = [...currentFiles];

      for (const file of incomingFiles) {
        const fileKey = getLocalFileKey(file);

        if (!knownFileKeys.has(fileKey)) {
          knownFileKeys.add(fileKey);
          nextFiles.push(file);
        }
      }

      return nextFiles;
    });

    setCreationAttachmentInputKey((currentKey) => currentKey + 1);
    setSubmitErrorMessage(null);
  }

  function handleRemoveCreationAttachment(fileKey: string): void {
    const setFiles =
      mode === 'INCIDENT'
        ? setIncidentCreationAttachmentFiles
        : setRequestCreationAttachmentFiles;

    setFiles((currentFiles) =>
      currentFiles.filter((file) => getLocalFileKey(file) !== fileKey),
    );

    setCreationAttachmentInputKey((currentKey) => currentKey + 1);
  }

  function resetCreationAttachmentSelection(targetMode: TicketMode): void {
    const setFiles =
      targetMode === 'INCIDENT'
        ? setIncidentCreationAttachmentFiles
        : setRequestCreationAttachmentFiles;

    setFiles([]);
    setCreationAttachmentInputKey((currentKey) => currentKey + 1);
  }

  async function handleDeleteComment(commentId: string): Promise<void> {
    if (!selectedTicketDetail) {
      return;
    }

    const normalizedCommentId = commentId.trim();

    if (!normalizedCommentId) {
      return;
    }

    const shouldDelete = window.confirm(
      'Supprimer definitivement ce commentaire ?',
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingCommentId(normalizedCommentId);
    setCommentErrorMessage(null);
    setCommentSuccessMessage(null);

    try {
      await deleteTicketComment(
        session.accessToken,
        selectedTicketDetail.ticket.id,
        normalizedCommentId,
      );

      setSelectedTicketComments((currentComments) =>
        currentComments.filter((comment) => comment.id !== normalizedCommentId),
      );
      setCommentSuccessMessage('Commentaire supprime.');
    } catch (error) {
      setCommentErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la suppression du commentaire',
      );
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function handleCommentSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedTicketDetail) {
      return;
    }

    const body = commentDraft.body.trim();

    if (!body) {
      setCommentErrorMessage('Le commentaire ne peut pas etre vide.');
      return;
    }

    setIsSubmittingComment(true);

    setCommentErrorMessage(null);

    setCommentSuccessMessage(null);

    try {
      const createdComment = await addTicketComment(
        session.accessToken,
        selectedTicketDetail.ticket.id,
        {
          body,
          isInternal: canCreateInternalComments
            ? commentDraft.isInternal
            : false,
        },
      );

      setSelectedTicketComments((currentComments) => [
        ...currentComments,
        createdComment,
      ]);

      setCommentDraft(INITIAL_COMMENT_DRAFT);

      setDeletingCommentId(null);

      setCommentSuccessMessage(
        createdComment.isInternal
          ? 'Note interne ajoutee.'
          : 'Commentaire ajoute.',
      );
    } catch (error) {
      setCommentErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de l ajout du commentaire',
      );
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleAttachmentSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedTicketDetail) {
      return;
    }

    const file = attachmentDraft.file;

    if (!file) {
      setAttachmentErrorMessage('Selectionne un fichier a envoyer.');
      return;
    }

    setIsSubmittingAttachment(true);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);

    const storagePath = buildTicketAttachmentStoragePath(
      session.user.id,
      selectedTicketDetail.ticket.id,
      file.name,
    );

    try {
      await uploadTicketAttachmentBinary(
        session.accessToken,
        TICKET_ATTACHMENTS_BUCKET_ID,
        storagePath,
        file,
      );

      const createdAttachment = await addTicketAttachment(
        session.accessToken,
        selectedTicketDetail.ticket.id,
        {
          bucketId: TICKET_ATTACHMENTS_BUCKET_ID,
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          storagePath,
        },
      );

      setSelectedTicketAttachments((currentAttachments) => [
        createdAttachment,
        ...currentAttachments,
      ]);
      setAttachmentDraft(INITIAL_ATTACHMENT_DRAFT);
      setAttachmentInputKey((currentKey) => currentKey + 1);
      setAttachmentSuccessMessage('Piece jointe ajoutee.');
    } catch (error) {
      setAttachmentErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'ajout de la piece jointe",
      );
    } finally {
      setIsSubmittingAttachment(false);
    }
  }

  async function handleDeleteAttachment(
    attachment: TicketAttachmentSnapshot,
  ): Promise<void> {
    if (!selectedTicketDetail) {
      return;
    }

    const shouldDelete = window.confirm(
      'Supprimer definitivement cette piece jointe ?',
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingAttachmentId(attachment.id);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);

    try {
      await deleteTicketAttachmentBinary(
        session.accessToken,
        attachment.bucketId,
        attachment.storagePath,
      );

      await deleteTicketAttachment(
        session.accessToken,
        selectedTicketDetail.ticket.id,
        attachment.id,
      );

      setSelectedTicketAttachments((currentAttachments) =>
        currentAttachments.filter(
          (currentAttachment) => currentAttachment.id !== attachment.id,
        ),
      );

      const nextAttachments = await getTicketAttachments(
        session.accessToken,
        selectedTicketDetail.ticket.id,
      );

      setSelectedTicketAttachments(nextAttachments);
      setAttachmentSuccessMessage('Piece jointe supprimee.');
    } catch (error) {
      setAttachmentErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la suppression de la piece jointe',
      );
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function handleDownloadAttachment(
    attachment: TicketAttachmentSnapshot,
  ): Promise<void> {
    try {
      const blob = await downloadTicketAttachmentBinary(
        session.accessToken,
        attachment.bucketId,
        attachment.storagePath,
      );
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = downloadUrl;
      anchor.download = attachment.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setAttachmentErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du telechargement de la piece jointe',
      );
    }
  }

  return (
    <section className="ticket-page-shell">
      <section className="ticket-workspace-stage">
        {showCreationPanel ? (
          <section className="panel ticket-form-panel ticket-creation-panel">
            <div className="ticket-page-intro">
              <h2>
                {mode === 'INCIDENT'
                  ? 'Creer un incident'
                  : 'Creer une demande'}
              </h2>
              <p>
                {mode === 'INCIDENT'
                  ? 'Declare rapidement un incident avec les informations utiles au support.'
                  : 'Saisis une demande claire avec les informations essentielles pour traitement.'}
              </p>
            </div>

            {isLoading ? (
              <p className="ticket-form-message">
                Chargement des referentiels...
              </p>
            ) : loadErrorMessage ? (
              <p className="ticket-form-error">{loadErrorMessage}</p>
            ) : (
              <div className="ticket-form-layout ticket-form-layout--single">
                <form className="ticket-form-grid" onSubmit={handleSubmit}>
                  <label className="field ticket-form-span-2 ticket-create-order-title">
                    <span>Titre</span>

                    <input
                      onChange={(event) =>
                        mode === 'INCIDENT'
                          ? handleIncidentFieldChange(
                              'title',
                              event.target.value,
                            )
                          : handleRequestFieldChange(
                              'title',
                              event.target.value,
                            )
                      }
                      placeholder={
                        mode === 'INCIDENT'
                          ? 'Ex. : Imprimante RH hors service'
                          : 'Ex. : Installation d un nouveau logiciel'
                      }
                      value={
                        mode === 'INCIDENT'
                          ? incidentDraft.title
                          : requestDraft.title
                      }
                    />

                    {mode === 'INCIDENT' && incidentValidationErrors.title ? (
                      <small className="field-error">
                        {incidentValidationErrors.title}
                      </small>
                    ) : null}

                    {mode === 'REQUEST' && requestValidationErrors.title ? (
                      <small className="field-error">
                        {requestValidationErrors.title}
                      </small>
                    ) : null}
                  </label>

                  <label className="field ticket-form-span-2 ticket-create-order-description">
                    <span>Description</span>

                    <textarea
                      onChange={(event) =>
                        mode === 'INCIDENT'
                          ? handleIncidentFieldChange(
                              'description',

                              event.target.value,
                            )
                          : handleRequestFieldChange(
                              'description',

                              event.target.value,
                            )
                      }
                      placeholder={
                        mode === 'INCIDENT'
                          ? 'Decris le symptome, le contexte et les impacts.'
                          : 'Decris le besoin, le contexte et le resultat attendu.'
                      }
                      rows={5}
                      value={
                        mode === 'INCIDENT'
                          ? incidentDraft.description
                          : requestDraft.description
                      }
                    />

                    {mode === 'INCIDENT' &&
                    incidentValidationErrors.description ? (
                      <small className="field-error">
                        {incidentValidationErrors.description}
                      </small>
                    ) : null}

                    {mode === 'REQUEST' &&
                    requestValidationErrors.description ? (
                      <small className="field-error">
                        {requestValidationErrors.description}
                      </small>
                    ) : null}
                  </label>

                  {mode === 'INCIDENT' ? (
                    <label className="field ticket-create-order-incident-category">
                      <span>Categorie</span>

                      <select
                        className={
                          incidentDraft.categoryId ? '' : 'select-placeholder'
                        }
                        onChange={(event) =>
                          handleIncidentFieldChange(
                            'categoryId',

                            event.target.value,
                          )
                        }
                        value={incidentDraft.categoryId}
                      >
                        <option disabled hidden value="">
                          Choisir une catégorie
                        </option>

                        {incidentCategoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {incidentValidationErrors.categoryId ? (
                        <small className="field-error">
                          {incidentValidationErrors.categoryId}
                        </small>
                      ) : null}
                    </label>
                  ) : null}

                  {showCreationChannelField ? (
                    <label
                      className={
                        mode === 'INCIDENT'
                          ? 'field ticket-create-order-incident-channel'
                          : 'field ticket-create-order-request-channel'
                      }
                    >
                      <span>Canal</span>

                      <select
                        className={
                          (
                            mode === 'INCIDENT'
                              ? incidentDraft.channelId
                              : requestDraft.channelId
                          )
                            ? ''
                            : 'select-placeholder'
                        }
                        onChange={(event) =>
                          mode === 'INCIDENT'
                            ? handleIncidentFieldChange(
                                'channelId',
                                event.target.value,
                              )
                            : handleRequestFieldChange(
                                'channelId',
                                event.target.value,
                              )
                        }
                        value={
                          mode === 'INCIDENT'
                            ? incidentDraft.channelId
                            : requestDraft.channelId
                        }
                      >
                        <option disabled hidden value="">
                          Choisir un canal
                        </option>

                        {catalog.channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {translateChannel(channel.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {mode === 'INCIDENT' && session.user.role !== 'DEMANDEUR' ? (
                    <label className="field ticket-create-order-incident-equipment">
                      <span>Equipement concerne</span>

                      <div
                        className={
                          incidentDraft.ciId
                            ? 'incident-lookup-field has-clear'
                            : 'incident-lookup-field'
                        }
                      >
                        <input
                          className={
                            incidentDraft.ciId ? '' : 'lookup-placeholder'
                          }
                          placeholder="Choisir l'equipement"
                          readOnly
                          value={selectedIncidentEquipment?.name ?? ''}
                        />

                        {incidentDraft.ciId ? (
                          <button
                            aria-label="Retirer l'equipement concerne"
                            onClick={() =>
                              handleIncidentFieldChange('ciId', '')
                            }
                            type="button"
                          >
                            <X size={16} />
                          </button>
                        ) : null}

                        <button
                          aria-label="Rechercher un equipement"
                          onClick={() =>
                            openIncidentLookup('INCIDENT_EQUIPMENT')
                          }
                          type="button"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    </label>
                  ) : null}

                  {mode === 'REQUEST' ? (
                    <label className="field ticket-create-order-request-equipment">
                      <span>Equipement demande</span>

                      <div
                        className={
                          requestDraft.ciId
                            ? 'incident-lookup-field has-clear'
                            : 'incident-lookup-field'
                        }
                      >
                        <input
                          className={
                            requestDraft.ciId ? '' : 'lookup-placeholder'
                          }
                          placeholder="Choisir l'équipement"
                          readOnly
                          value={selectedRequestEquipment?.name ?? ''}
                        />

                        {requestDraft.ciId ? (
                          <button
                            aria-label="Retirer l'equipement demande"
                            onClick={() => handleRequestFieldChange('ciId', '')}
                            type="button"
                          >
                            <X size={16} />
                          </button>
                        ) : null}

                        <button
                          aria-label="Rechercher un equipement"
                          onClick={() =>
                            openIncidentLookup('REQUEST_EQUIPMENT')
                          }
                          type="button"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    </label>
                  ) : null}

                  {mode === 'INCIDENT' ? (
                    <>
                      <label className="field ticket-create-order-incident-impact">
                        <span>Impact</span>

                        <select
                          className={
                            incidentDraft.impact ? '' : 'select-placeholder'
                          }
                          onChange={(event) =>
                            handleIncidentFieldChange(
                              'impact',
                              event.target.value,
                            )
                          }
                          value={incidentDraft.impact}
                        >
                          <option disabled hidden value="">
                            Choisir l'impact
                          </option>
                          {INCIDENT_SEVERITIES.map((severity) => (
                            <option key={severity} value={severity}>
                              {translateIncidentSeverity(severity)}
                            </option>
                          ))}
                        </select>
                        {incidentValidationErrors.impact ? (
                          <small className="field-error">
                            {incidentValidationErrors.impact}
                          </small>
                        ) : null}
                      </label>

                      <label className="field ticket-create-order-incident-urgency">
                        <span>Urgence</span>

                        <select
                          className={
                            incidentDraft.urgency ? '' : 'select-placeholder'
                          }
                          onChange={(event) =>
                            handleIncidentFieldChange(
                              'urgency',
                              event.target.value,
                            )
                          }
                          value={incidentDraft.urgency}
                        >
                          <option disabled hidden value="">
                            Choisir l'urgence
                          </option>
                          {INCIDENT_SEVERITIES.map((severity) => (
                            <option key={severity} value={severity}>
                              {translateIncidentSeverity(severity)}
                            </option>
                          ))}
                        </select>
                        {incidentValidationErrors.urgency ? (
                          <small className="field-error">
                            {incidentValidationErrors.urgency}
                          </small>
                        ) : null}
                      </label>

                      {showIncidentAdvancedFields ? (
                        <label className="field ticket-create-order-incident-group">
                          <span>Assigné groupe</span>

                          <div
                            className={
                              incidentDraft.assignmentGroupId
                                ? 'incident-lookup-field has-clear'
                                : 'incident-lookup-field'
                            }
                          >
                            <input
                              className={
                                incidentDraft.assignmentGroupId
                                  ? ''
                                  : 'lookup-placeholder'
                              }
                              placeholder="Choisir le groupe"
                              readOnly
                              value={selectedIncidentGroup?.name ?? ''}
                            />

                            {incidentDraft.assignmentGroupId ? (
                              <button
                                aria-label="Retirer le groupe assigne"
                                onClick={() =>
                                  handleIncidentFieldChange(
                                    'assignmentGroupId',
                                    '',
                                  )
                                }
                                type="button"
                              >
                                <X size={16} />
                              </button>
                            ) : null}

                            <button
                              aria-label="Rechercher un groupe"
                              onClick={() =>
                                openIncidentLookup('ASSIGNMENT_GROUP')
                              }
                              type="button"
                            >
                              <Search size={18} />
                            </button>
                          </div>
                        </label>
                      ) : null}

                      {showIncidentAdvancedFields ? (
                        <label className="field ticket-create-order-incident-technician">
                          <span>Assigné technicien</span>

                          <div
                            className={
                              incidentDraft.assignedToUserId
                                ? 'incident-lookup-field has-clear'
                                : 'incident-lookup-field'
                            }
                          >
                            <input
                              className={
                                incidentDraft.assignedToUserId
                                  ? ''
                                  : 'lookup-placeholder'
                              }
                              placeholder="Choisir le technicien"
                              readOnly
                              value={
                                selectedIncidentTechnician
                                  ? formatKnownUserName(
                                      selectedIncidentTechnician,
                                      selectedIncidentTechnician.id,
                                    )
                                  : ''
                              }
                            />

                            {incidentDraft.assignedToUserId ? (
                              <button
                                aria-label="Retirer l'assignation"
                                onClick={() =>
                                  handleIncidentFieldChange(
                                    'assignedToUserId',
                                    '',
                                  )
                                }
                                type="button"
                              >
                                <X size={16} />
                              </button>
                            ) : null}

                            <button
                              aria-label="Rechercher un technicien"
                              onClick={() => openIncidentLookup('ASSIGNEE')}
                              type="button"
                            >
                              <Search size={18} />
                            </button>
                          </div>
                        </label>
                      ) : null}

                      {showCreationRequesterField ? (
                        <label className="field ticket-create-order-incident-requester">
                          <span>Demandeur</span>

                          <div className="incident-lookup-field">
                            <input
                              readOnly
                              value={
                                selectedIncidentRequester
                                  ? formatKnownUserName(
                                      selectedIncidentRequester,
                                      selectedIncidentRequester.id,
                                    )
                                  : ''
                              }
                            />

                            <button
                              aria-label="Rechercher un demandeur"
                              onClick={() => openIncidentLookup('REQUESTER')}
                              type="button"
                            >
                              <Search size={18} />
                            </button>
                          </div>

                          {incidentValidationErrors.requestedForUserId ? (
                            <small className="field-error">
                              {incidentValidationErrors.requestedForUserId}
                            </small>
                          ) : null}
                        </label>
                      ) : null}

                      {showIncidentAdvancedFields ? (
                        <label className="field ticket-form-span-2 ticket-create-order-incident-comment">
                          <span>Commentaire</span>

                          <textarea
                            onChange={(event) =>
                              handleIncidentFieldChange(
                                'comment',
                                event.target.value,
                              )
                            }
                            placeholder="Ajoute une note utile au traitement de l incident."
                            rows={4}
                            value={incidentDraft.comment}
                          />
                        </label>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label className="field ticket-create-order-request-priority">
                        <span>Priorite</span>

                        <select
                          className={
                            requestDraft.priorityId ? '' : 'select-placeholder'
                          }
                          onChange={(event) =>
                            handleRequestFieldChange(
                              'priorityId',
                              event.target.value,
                            )
                          }
                          value={requestDraft.priorityId}
                        >
                          <option disabled hidden value="">
                            Choisir la priorité
                          </option>

                          {catalog.priorities.map((priority) => (
                            <option key={priority.id} value={priority.id}>
                              {translatePriority(priority.name)}
                            </option>
                          ))}
                        </select>
                        {requestValidationErrors.priorityId ? (
                          <small className="field-error">
                            {requestValidationErrors.priorityId}
                          </small>
                        ) : null}
                      </label>

                      {showRequestAdvancedFields ? (
                        <label className="field ticket-create-order-request-group">
                          <span>Assigné groupe</span>

                          <div
                            className={
                              requestDraft.assignmentGroupId
                                ? 'incident-lookup-field has-clear'
                                : 'incident-lookup-field'
                            }
                          >
                            <input
                              className={
                                requestDraft.assignmentGroupId
                                  ? ''
                                  : 'lookup-placeholder'
                              }
                              placeholder="Choisir le groupe"
                              readOnly
                              value={selectedRequestGroup?.name ?? ''}
                            />

                            {requestDraft.assignmentGroupId ? (
                              <button
                                aria-label="Retirer le groupe assigne"
                                onClick={() =>
                                  handleRequestFieldChange(
                                    'assignmentGroupId',
                                    '',
                                  )
                                }
                                type="button"
                              >
                                <X size={16} />
                              </button>
                            ) : null}

                            <button
                              aria-label="Rechercher un groupe"
                              onClick={() =>
                                openIncidentLookup('ASSIGNMENT_GROUP')
                              }
                              type="button"
                            >
                              <Search size={18} />
                            </button>
                          </div>
                        </label>
                      ) : null}

                      {showRequestAdvancedFields ? (
                        <label className="field ticket-create-order-request-technician">
                          <span>Assigné technicien</span>

                          <div
                            className={
                              requestDraft.assignedToUserId
                                ? 'incident-lookup-field has-clear'
                                : 'incident-lookup-field'
                            }
                          >
                            <input
                              className={
                                requestDraft.assignedToUserId
                                  ? ''
                                  : 'lookup-placeholder'
                              }
                              placeholder="Choisir le technicien"
                              readOnly
                              value={
                                selectedRequestTechnician
                                  ? formatKnownUserName(
                                      selectedRequestTechnician,
                                      selectedRequestTechnician.id,
                                    )
                                  : ''
                              }
                            />

                            {requestDraft.assignedToUserId ? (
                              <button
                                aria-label="Retirer l'assignation"
                                onClick={() =>
                                  handleRequestFieldChange(
                                    'assignedToUserId',
                                    '',
                                  )
                                }
                                type="button"
                              >
                                <X size={16} />
                              </button>
                            ) : null}

                            <button
                              aria-label="Rechercher un technicien"
                              onClick={() => openIncidentLookup('ASSIGNEE')}
                              type="button"
                            >
                              <Search size={18} />
                            </button>
                          </div>
                        </label>
                      ) : null}

                      {showCreationRequesterField ? (
                        <label className="field ticket-create-order-request-requester">
                          <span>Demandeur</span>

                          <div className="incident-lookup-field">
                            <input
                              readOnly
                              value={
                                selectedRequestRequester
                                  ? formatKnownUserName(
                                      selectedRequestRequester,
                                      selectedRequestRequester.id,
                                    )
                                  : ''
                              }
                            />

                            <button
                              aria-label="Rechercher un demandeur"
                              onClick={() => openIncidentLookup('REQUESTER')}
                              type="button"
                            >
                              <Search size={18} />
                            </button>
                          </div>
                        </label>
                      ) : null}

                      {showRequestAdvancedFields ? (
                        <label className="field ticket-form-span-2 ticket-create-order-request-comment">
                          <span>Commentaire</span>

                          <textarea
                            onChange={(event) =>
                              handleRequestFieldChange(
                                'comment',
                                event.target.value,
                              )
                            }
                            placeholder="Ajoute une note utile au traitement de la demande."
                            rows={4}
                            value={requestDraft.comment}
                          />
                        </label>
                      ) : null}
                    </>
                  )}

                  <div className="field ticket-form-span-2 ticket-create-order-attachments">
                    <span>Pieces jointes</span>

                    <div className="ticket-upload-zone">
                      <div className="ticket-upload-actions">
                        <label className="ticket-upload-button">
                          Choisir des fichiers
                          <input
                            key={creationAttachmentInputKey}
                            multiple
                            onChange={(event) =>
                              handleCreationAttachmentSelection(
                                event.target.files,
                              )
                            }
                            type="file"
                          />
                        </label>

                        <span className="ticket-upload-note">
                          {formatSelectedFilesLabel(
                            creationAttachmentFiles.length,
                          )}
                        </span>
                      </div>

                      {creationAttachmentFiles.length > 0 ? (
                        <div className="ticket-file-list">
                          {creationAttachmentFiles.map((file) => {
                            const fileKey = getLocalFileKey(file);

                            return (
                              <span className="ticket-file-chip" key={fileKey}>
                                <span>{file.name}</span>
                                <button
                                  aria-label={`Retirer ${file.name}`}
                                  onClick={() =>
                                    handleRemoveCreationAttachment(fileKey)
                                  }
                                  type="button"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : null}

                      <span className="ticket-upload-note">
                        Formats acceptes: PDF, PNG, JPG, DOCX. 2 Mo max par
                        fichier.
                      </span>
                    </div>
                  </div>

                  <div className="ticket-form-actions ticket-form-span-2 ticket-create-order-actions">
                    <button className="primary-button" disabled={isSubmitting}>
                      {isSubmitting
                        ? 'Creation en cours...'
                        : mode === 'INCIDENT'
                          ? 'Creer incident'
                          : 'Creer demande'}
                    </button>

                    <span className="ticket-form-helper">
                      {mode === 'INCIDENT'
                        ? 'La priorite sera calculee automatiquement par le backend.'
                        : 'La priorite choisie sera envoyee telle quelle au backend.'}
                    </span>
                  </div>

                  {submitErrorMessage ? (
                    <p className="ticket-form-error ticket-form-span-2 ticket-create-order-error">
                      {submitErrorMessage}
                    </p>
                  ) : null}
                </form>

                {showCreationRequesterField && incidentLookupKind ? (
                  <IncidentLookupDialog
                    ciTypesById={ciTypesById}
                    closeIncidentLookup={closeIncidentLookup}
                    formatKnownUserName={formatKnownUserName}
                    groupsById={groupsById}
                    handleIncidentEquipmentLookupSelect={
                      handleIncidentEquipmentLookupSelect
                    }
                    handleIncidentGroupLookupSelect={
                      handleIncidentGroupLookupSelect
                    }
                    handleIncidentLookupSelect={handleIncidentLookupSelect}
                    incidentLookupKind={incidentLookupKind}
                    incidentLookupPage={incidentLookupPage}
                    incidentLookupResultCount={incidentLookupResultCount}
                    incidentLookupSearch={incidentLookupSearch}
                    incidentLookupSearchField={incidentLookupSearchField}
                    incidentLookupTotalPages={incidentLookupTotalPages}
                    paginatedIncidentLookupEquipment={
                      paginatedIncidentLookupEquipment
                    }
                    paginatedIncidentLookupGroups={
                      paginatedIncidentLookupGroups
                    }
                    paginatedIncidentLookupUsers={paginatedIncidentLookupUsers}
                    selectedIncidentLookupEquipmentId={
                      selectedIncidentLookupEquipmentId
                    }
                    selectedIncidentLookupGroupId={
                      selectedIncidentLookupGroupId
                    }
                    selectedIncidentLookupUserId={selectedIncidentLookupUserId}
                    setIncidentLookupPage={setIncidentLookupPage}
                    setIncidentLookupSearch={setIncidentLookupSearch}
                    setIncidentLookupSearchField={setIncidentLookupSearchField}
                  />
                ) : null}

                <div className="ticket-created-stack">
                  {createdIncident ? (
                    <article className="ticket-created-card">
                      <span>Incident cree</span>

                      <strong>{createdIncident.ticket.number}</strong>

                      <p>{createdIncident.ticket.title}</p>

                      <dl className="ticket-created-grid">
                        <div>
                          <dt>Statut</dt>

                          <dd>{createdIncident.ticket.status}</dd>
                        </div>

                        <div>
                          <dt>Priorite calculee</dt>

                          <dd>
                            {translatePriority(createdIncident.priorityName)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ) : null}

                  {createdRequest ? (
                    <article className="ticket-created-card">
                      <span>Demande creee</span>

                      <strong>{createdRequest.ticket.number}</strong>

                      <p>{createdRequest.ticket.title}</p>

                      <dl className="ticket-created-grid">
                        <div>
                          <dt>Statut</dt>

                          <dd>{createdRequest.ticket.status}</dd>
                        </div>

                        <div>
                          <dt>Priorite retenue</dt>

                          <dd>
                            {translatePriority(createdRequest.priorityName)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {showListPanel || showDetailPanel ? (
          <section
            className={
              showDetailPanel
                ? 'ticket-detail-layout ticket-workspace-detail-layout ticket-detail-layout--detail-only'
                : 'ticket-detail-layout ticket-workspace-detail-layout ticket-detail-layout--list-only'
            }
          >
            {showListPanel ? (
              <TicketListPanel
                catalog={catalog}
                categoriesById={categoriesById}
                formatKnownUserName={formatKnownUserName}
                formatTicketDate={formatTicketDate}
                handleSearchFilterChange={handleSearchFilterChange}
                isLoadingTickets={isLoadingTickets}
                isSortMenuOpen={isSortMenuOpen}
                loadTicketsErrorMessage={loadTicketsErrorMessage}
                onOpenTicket={(ticketId) =>
                  navigateTo(
                    isArchiveListPage
                      ? `/agent/archives/${ticketId}`
                      : `/agent/tickets/${ticketId}`,
                  )
                }
                paginatedTickets={paginatedTickets}
                prioritiesById={prioritiesById}
                renderOverdueMarker={renderOverdueMarker}
                renderPriorityBadge={renderPriorityBadge}
                renderStatusBadge={renderStatusBadge}
                renderTicketDisplayNumber={renderTicketDisplayNumber}
                searchedTicketsCount={searchedTickets.length}
                searchFilters={searchFilters}
                setIsSortMenuOpen={setIsSortMenuOpen}
                setTicketPage={setTicketPage}
                sortMenuRef={sortMenuRef}
                sortOptions={TICKET_SORT_OPTIONS}
                ticketListDescription={ticketListDescription}
                ticketListEmptyMessage={ticketListEmptyMessage}
                ticketListTitle={ticketListTitle}
                ticketPage={ticketPage}
                totalTicketPages={totalTicketPages}
                usersById={usersById}
              />
            ) : null}

            {showDetailPanel ? (
              <aside className="tdp-shell">
                <TicketDetailTopbar
                  canDeleteTickets={canDeleteTickets}
                  canManageTicket={canManageTicket}
                  detailBackPath={detailBackPath}
                  handleDeleteTicket={handleDeleteTicket}
                  handleStatusSubmit={handleStatusSubmit}
                  isDeletingTicket={isDeletingTicket}
                  isEditingInfo={isEditingInfo}
                  isSubmittingStatus={isSubmittingStatus}
                  navigateTo={navigateTo}
                  selectedTicketDetail={selectedTicketDetail}
                  setStatusDraft={setStatusDraft}
                  statusDraft={statusDraft}
                />

                {!selectedTicketId ? (
                  <p className="tdp-state">
                    Sélectionnez un ticket pour afficher son détail.
                  </p>
                ) : isLoadingDetail ? (
                  <p className="tdp-state">Chargement du ticket...</p>
                ) : loadDetailErrorMessage ? (
                  <p className="tdp-state tdp-state--error">
                    {loadDetailErrorMessage}
                  </p>
                ) : !selectedTicketDetail ? (
                  <p className="tdp-state">Aucun détail disponible.</p>
                ) : (
                  <div className="tdp-content">
                    <TicketDetailHero
                      canEditTicket={canEditTicket}
                      formatTicketDate={formatTicketDate}
                      handleTicketEditFieldChange={handleTicketEditFieldChange}
                      isEditingInfo={isEditingInfo}
                      prioritiesById={prioritiesById}
                      selectedTicketDetail={selectedTicketDetail}
                      ticketEditDraft={ticketEditDraft}
                    />

                    <TicketDescriptionCard
                      canEditTicket={canEditTicket}
                      handleTicketEditFieldChange={handleTicketEditFieldChange}
                      isEditingInfo={isEditingInfo}
                      selectedTicketDetail={selectedTicketDetail}
                      ticketEditDraft={ticketEditDraft}
                    />

                    <TicketInformationCard
                      assignableTechnicians={assignableTechnicians}
                      assignmentDraft={assignmentDraft}
                      canEditTicket={canEditTicket}
                      canManageTicket={canManageTicket}
                      catalog={catalog}
                      categoriesById={categoriesById}
                      channelsById={channelsById}
                      cisById={cisById}
                      detailActionErrorMessage={detailActionErrorMessage}
                      detailActionSuccessMessage={detailActionSuccessMessage}
                      formatKnownUserName={formatKnownUserName}
                      groupsById={groupsById}
                      handleAssignmentFieldChange={handleAssignmentFieldChange}
                      handleCancelEditInfo={handleCancelEditInfo}
                      handleSaveInfoEdits={handleSaveInfoEdits}
                      handleTicketEditFieldChange={handleTicketEditFieldChange}
                      isEditingInfo={isEditingInfo}
                      isSavingInfo={isSavingInfo}
                      selectedTicketDetail={selectedTicketDetail}
                      setIsEditingInfo={setIsEditingInfo}
                      ticketEditDraft={ticketEditDraft}
                      userDirectory={userDirectory}
                      usersById={usersById}
                    />

                    <TicketConversationPanel
                      attachmentDraft={attachmentDraft}
                      attachmentErrorMessage={attachmentErrorMessage}
                      attachmentInputKey={attachmentInputKey}
                      attachmentSuccessMessage={attachmentSuccessMessage}
                      canCreateInternalComments={canCreateInternalComments}
                      canDeleteTicketComment={canDeleteTicketComment}
                      commentDraft={commentDraft}
                      commentErrorMessage={commentErrorMessage}
                      commentSuccessMessage={commentSuccessMessage}
                      deletingAttachmentId={deletingAttachmentId}
                      deletingCommentId={deletingCommentId}
                      formatFileSize={formatFileSize}
                      formatKnownUserName={formatKnownUserName}
                      formatTicketDate={formatTicketDate}
                      handleAttachmentSelection={handleAttachmentSelection}
                      handleAttachmentSubmit={handleAttachmentSubmit}
                      handleCommentBodyChange={handleCommentBodyChange}
                      handleCommentInternalToggle={handleCommentInternalToggle}
                      handleCommentSubmit={handleCommentSubmit}
                      handleDeleteAttachment={handleDeleteAttachment}
                      handleDeleteComment={handleDeleteComment}
                      handleDownloadAttachment={handleDownloadAttachment}
                      isLoadingAttachments={isLoadingAttachments}
                      isLoadingComments={isLoadingComments}
                      isSubmittingAttachment={isSubmittingAttachment}
                      isSubmittingComment={isSubmittingComment}
                      loadAttachmentsErrorMessage={loadAttachmentsErrorMessage}
                      loadCommentsErrorMessage={loadCommentsErrorMessage}
                      selectedTicketAttachments={selectedTicketAttachments}
                      selectedTicketComments={selectedTicketComments}
                      sessionUserId={session.user.id}
                      sessionUserRole={session.user.role}
                      usersById={usersById}
                    />
                  </div>
                )}
              </aside>
            ) : null}
          </section>
        ) : null}
      </section>
    </section>
  );
}

function validateIncidentDraft(
  draft: IncidentDraftState,
): IncidentValidationErrors {
  const errors: IncidentValidationErrors = {};

  if (!draft.title.trim()) {
    errors.title = 'Le titre est obligatoire.';
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

function validateRequestDraft(
  draft: RequestDraftState,
): RequestValidationErrors {
  const errors: RequestValidationErrors = {};

  if (!draft.title.trim()) {
    errors.title = 'Le titre est obligatoire.';
  }

  if (!draft.description.trim()) {
    errors.description = 'La description est obligatoire.';
  }

  if (!draft.priorityId.trim()) {
    errors.priorityId = 'La priorite est obligatoire.';
  }

  return errors;
}

function normalizeOptionalId(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function formatTicketDate(value: string): string {
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

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} o`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} Ko`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getLocalFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatSelectedFilesLabel(fileCount: number): string {
  if (fileCount === 0) {
    return 'Aucun fichier selectionne';
  }

  const suffix = fileCount > 1 ? 's' : '';

  return `${fileCount} fichier${suffix} selectionne${suffix}`;
}

function buildTicketAttachmentStoragePath(
  userId: string,
  ticketId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');

  return `${userId}/${ticketId}/${timestamp}-${sanitizedFileName}`;
}

function canManageTicketActions(role: UserRole): boolean {
  return role === 'AGENT' || role === 'ADMIN';
}

function asTicketStatus(value: string): TicketStatus | null {
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

function getTicketListTitle(
  section: AgentPageProps['section'],
  userRole: UserRole,
): string {
  if (section === 'ARCHIVES') {
    return 'Liste des tickets archives';
  }

  if (section === 'ASSIGNED_TO_ME') {
    return 'Tickets assignés à moi';
  }

  if (section === 'MY_TICKETS') {
    return 'Mes tickets';
  }

  if (section === 'UNASSIGNED_TICKETS') {
    return 'Tickets non assignés';
  }

  if (section === 'LIST' && userRole === 'DEMANDEUR') {
    return 'Mes tickets';
  }

  return 'Liste des tickets';
}

function getTicketListDescription(section: AgentPageProps['section']): string {
  if (section === 'ARCHIVES') {
    return 'Vue dediee aux tickets sortis de la liste active.';
  }

  if (section === 'ASSIGNED_TO_ME') {
    return 'Tickets actifs dont vous etes le technicien assigne.';
  }

  if (section === 'MY_TICKETS') {
    return 'Tickets crees par votre compte utilisateur.';
  }

  if (section === 'UNASSIGNED_TICKETS') {
    return 'Tickets actifs sans technicien assigne.';
  }

  return 'Vue compacte des tickets avec les colonnes principales de suivi.';
}

function getTicketListEmptyMessage(section: AgentPageProps['section']): string {
  if (section === 'ARCHIVES') {
    return 'Aucun ticket archive ne correspond aux filtres actuels.';
  }

  if (section === 'ASSIGNED_TO_ME') {
    return 'Aucun ticket assigne a votre compte ne correspond aux filtres actuels.';
  }

  if (section === 'MY_TICKETS') {
    return 'Aucun ticket cree par votre compte ne correspond aux filtres actuels.';
  }

  if (section === 'UNASSIGNED_TICKETS') {
    return 'Aucun ticket non assigne ne correspond aux filtres actuels.';
  }

  return 'Aucun ticket ne correspond aux filtres actuels.';
}

function canCreateInternalTicketComments(role: UserRole): boolean {
  return role === 'AGENT' || role === 'ADMIN';
}

function canDeleteTicketComment(
  role: UserRole,
  currentUserId: string,
  authorUserId: string,
): boolean {
  if (role === 'AGENT' || role === 'ADMIN') {
    return true;
  }

  return role === 'DEMANDEUR' && currentUserId === authorUserId;
}

function formatKnownUserName(
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

function filterIncidentLookupUsers(
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
    const groupName = user.groupId
      ? (groupsById.get(user.groupId)?.name ?? 'Non assigne')
      : 'Non assigne';
    const searchableValue = getIncidentLookupSearchValue(
      user,
      searchField,
      groupName,
    );

    return normalizeSearchText(searchableValue).includes(normalizedSearch);
  });
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

function filterIncidentLookupGroups(
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
    case 'LEVEL':
      return group.level ?? '';
    default:
      return '';
  }
}

function filterIncidentLookupEquipment(
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

function filterTicketsByListSearch(
  tickets: TicketSummarySnapshot[],
  searchText: string,
  users: AdminUserSummary[],
  searchField: TicketListSearchField,
): TicketSummarySnapshot[] {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return tickets;
  }

  const usersById = new Map(users.map((user) => [user.id, user]));

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
      : '';

    const searchableValues: string[] = (() => {
      switch (searchField) {
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

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase('fr-FR');
}

function sortTicketsByOperationalPriority(
  tickets: TicketSummarySnapshot[],
  prioritiesById: Map<string, { level: number; name: string }>,
): TicketSummarySnapshot[] {
  return [...tickets].sort((left, right) => {
    const leftScore = getTicketOperationalScore(left, prioritiesById);
    const rightScore = getTicketOperationalScore(right, prioritiesById);

    return (
      leftScore.statusRank - rightScore.statusRank ||
      leftScore.slaRank - rightScore.slaRank ||
      leftScore.nextDueAt - rightScore.nextDueAt ||
      rightScore.priorityLevel - leftScore.priorityLevel ||
      leftScore.createdAt - rightScore.createdAt
    );
  });
}

function sortTicketsByCreatedAtDesc(
  tickets: TicketSummarySnapshot[],
): TicketSummarySnapshot[] {
  return [...tickets].sort(
    (left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt),
  );
}

function sortTicketsByCreatedAtAsc(
  tickets: TicketSummarySnapshot[],
): TicketSummarySnapshot[] {
  return [...tickets].sort(
    (left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt),
  );
}

function getTicketOperationalScore(
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
    createdAt: toTimestamp(ticket.createdAt),
    nextDueAt: getNextDueTimestamp(ticket),
    priorityLevel: prioritiesById.get(ticket.priorityId)?.level ?? 0,
    slaRank: getSlaRank(ticket),
    statusRank: getStatusRank(ticket.status),
  };
}

function getStatusRank(status: string): number {
  if (status === 'IN_PROGRESS') {
    return 0;
  }

  if (status === 'PENDING') {
    return 1;
  }

  if (status === 'OPEN') {
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

function getSlaRank(ticket: TicketSummarySnapshot): number {
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

function getNextDueTimestamp(ticket: TicketSummarySnapshot): number {
  const timestamps = [ticket.responseDueAt, ticket.resolutionDueAt]
    .map((value) => (value ? toTimestamp(value) : Number.POSITIVE_INFINITY))
    .filter((value) => Number.isFinite(value));

  return Math.min(...timestamps, Number.POSITIVE_INFINITY);
}

function toTimestamp(value: string): number {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
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

function renderTicketDisplayNumber(ticket: TicketSummarySnapshot) {
  const displayNumber = formatTicketDisplayNumber(ticket);
  const [prefix, suffix] = displayNumber.split('-');

  if (!prefix || !suffix) {
    return <strong>{displayNumber}</strong>;
  }

  return (
    <strong className="ticket-table-number">
      <span>{prefix}-</span>
      <span>{suffix}</span>
    </strong>
  );
}

function renderPriorityBadge(
  ticket: TicketSummarySnapshot,
  prioritiesById: Map<string, { name: string }>,
) {
  const priorityName =
    ticket.priorityName ?? prioritiesById.get(ticket.priorityId)?.name ?? null;

  if (!priorityName) {
    return <span className="ticket-priority-badge">Non definie</span>;
  }

  return (
    <span
      className={`ticket-priority-badge ticket-priority-badge--${priorityName.toLowerCase()}`}
    >
      {translatePriority(priorityName)}
    </span>
  );
}

function renderOverdueMarker(ticket: TicketSummarySnapshot) {
  if (
    ticket.responseSlaStatus !== 'OVERDUE' &&
    ticket.resolutionSlaStatus !== 'OVERDUE'
  ) {
    return null;
  }

  return <span className="ticket-overdue-marker">Retard</span>;
}

function renderStatusBadge(status: string) {
  return (
    <span
      className={`ticket-status-badge ticket-status-badge--${status.toLowerCase()}`}
    >
      <span className="ticket-status-badge-icon" aria-hidden="true" />
      {translateTicketStatus(status)}
    </span>
  );
}
