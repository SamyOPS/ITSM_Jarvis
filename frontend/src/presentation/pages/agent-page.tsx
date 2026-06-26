import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeAlert,
  History,
  Paperclip,
  Plus,
  Search,
  SlidersHorizontal,
  Ticket as TicketIcon,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';

import {
  translateChannel,
  translateIncidentSeverity,
  translatePriority,
  translateRequestType,
  translateTicketStatus,
  translateTicketType,
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
  type IncidentSeverity,
} from '../../domain/ticketing/incident-severity';

import type { TicketAttachmentSnapshot } from '../../domain/ticketing/ticket-attachment';
import type { TicketCommentSnapshot } from '../../domain/ticketing/ticket-comment';
import type { TicketDetailSnapshot } from '../../domain/ticketing/ticket-detail';
import type { TicketHistoryEntrySnapshot } from '../../domain/ticketing/ticket-history-entry';

import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';

import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';
import { fetchUserDirectory } from '../../infrastructure/api/auth-api';

import {
  addTicketComment,
  addTicketAttachment,
  assignTicket,
  changeTicketPriority,
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
  getTicketHistory,
  searchTickets,
  updateTicket,
  uploadTicketAttachmentBinary,
} from '../../infrastructure/api/ticketing-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';
import { TicketDetailSectionPanel } from './agent-page.components';
import {
  asTicketStatus,
  buildTicketAttachmentStoragePath,
  canChangeTicketStatus,
  canDeleteTicketComment,
  canManageTicketActions,
  filterIncidentLookupEquipment,
  filterIncidentLookupGroups,
  filterIncidentLookupUsers,
  filterTicketsByListSearch,
  formatCommentAuthorInitials,
  formatFileSize,
  formatHistoryEventInitial,
  formatKnownUserName,
  formatSelectedFilesLabel,
  formatTicketDate,
  formatTicketDisplayNumber,
  formatTicketHistoryPayload,
  formatTicketHistoryTitle,
  formatTicketResolutionDueAt,
  getLocalFileKey,
  getStatusOptionsForRole,
  getTicketHistoryEntryClassName,
  getTicketListDescription,
  getTicketListEmptyMessage,
  getTicketListTitle,
  getUserSupportGroupIds,
  isTicketCommentHistoryEntry,
  isUserInSupportGroup,
  normalizeOptionalId,
  normalizeOptionalText,
  normalizeSearchText,
  renderOverdueMarker,
  renderPriorityBadge,
  renderStatusBadge,
  renderTicketDisplayNumber,
  sortTicketsByCreatedAtAsc,
  sortTicketsByCreatedAtDesc,
  sortTicketsByOperationalPriority,
  TICKET_TITLE_MAX_LENGTH,
  validateIncidentDraft,
  validateRequestDraft,
} from './agent-page.helpers';
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
  TicketChatMessage,
  TicketDetailLookupKind,
  TicketDetailSectionKey,
  TicketMode,
  TicketSearchFiltersState,
  TicketStatus,
  TicketEditDraftState,
} from './agent-page.types';

function RequiredMark() {
  return <span className="park-required-mark">*</span>;
}

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],

  channels: [],

  cis: [],

  ciTypes: [],

  groups: [],

  priorities: [],
};

const INITIAL_INCIDENT_DRAFT: IncidentDraftState = {
  assignmentGroupId: '',

  assignedToUserId: '',

  categoryId: '',

  channelId: '',

  ciId: '',

  description: '',

  impact: '',

  requestedForUserId: '',

  title: '',

  urgency: '',
};

const INITIAL_REQUEST_DRAFT: RequestDraftState = {
  assignmentGroupId: '',

  assignedToUserId: '',

  categoryId: '',

  channelId: '',

  ciId: '',

  description: '',

  priorityId: '',

  requestedForUserId: '',

  requestType: '',

  title: '',
};

const REQUEST_DEFAULT_CATEGORY_NAME = 'Demande';

const INITIAL_SEARCH_FILTERS: TicketSearchFiltersState = {
  categoryId: '',

  priorityId: '',

  q: '',

  searchField: 'TITLE',

  sortBy: 'OPERATIONAL_PRIORITY',

  status: '',

  type: '',
};

const INITIAL_ASSIGNMENT_DRAFT: AssignmentDraftState = {
  assignedToUserId: '',

  assignmentGroupId: '',
};

const INITIAL_TICKET_EDIT_DRAFT: TicketEditDraftState = {
  categoryId: '',
  channelId: '',
  ciId: '',
  description: '',
  impact: 'MEDIUM',
  priorityId: '',
  requestedForUserId: '',
  rootCause: '',
  title: '',
  urgency: 'MEDIUM',
  workaround: '',
};

const INITIAL_COMMENT_DRAFT: CommentDraftState = {
  body: '',

  isInternal: false,
};

const INITIAL_ATTACHMENT_DRAFT: AttachmentDraftState = {
  files: [],
};

const TICKET_ATTACHMENTS_BUCKET_ID = 'ticket-attachments';
const INCIDENT_LOOKUP_PAGE_SIZE = 10;
const TICKETS_PER_PAGE = 15;
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

  const seededTicketComments = useMemo<TicketChatMessage[]>(() => {
    if (!selectedTicketDetail) {
      return selectedTicketComments;
    }

    const description = selectedTicketDetail.ticket.description.trim();

    if (!description) {
      return selectedTicketComments;
    }

    const authorUserId =
      selectedTicketDetail.ticket.requestedForUserId ??
      selectedTicketDetail.ticket.createdByUserId;
    const seedCommentId = `seed-description-${selectedTicketDetail.ticket.id}`;

    return [
      {
        authorUserId,
        body: description,
        createdAt: selectedTicketDetail.ticket.createdAt,
        id: seedCommentId,
        isInternal: false,
        isSeedDescription: true,
        ticketId: selectedTicketDetail.ticket.id,
      },
      ...selectedTicketComments.filter(
        (comment) => comment.id !== seedCommentId,
      ),
    ];
  }, [selectedTicketComments, selectedTicketDetail]);

  const [selectedTicketAttachments, setSelectedTicketAttachments] = useState<
    TicketAttachmentSnapshot[]
  >([]);

  const [selectedTicketHistory, setSelectedTicketHistory] = useState<
    TicketHistoryEntrySnapshot[]
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

  const [isDeletingTicket, setIsDeletingTicket] = useState(false);

  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const [loadHistoryErrorMessage, setLoadHistoryErrorMessage] = useState<
    string | null
  >(null);

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

  const [openTicketDetailSections, setOpenTicketDetailSections] = useState<
    Record<TicketDetailSectionKey, boolean>
  >({
    ACTORS: true,
    ATTACHMENTS: true,
    HISTORY: false,
    TICKET: true,
  });

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
  const [ticketDetailLookupKind, setTicketDetailLookupKind] =
    useState<TicketDetailLookupKind | null>(null);
  const [ticketDetailLookupPage, setTicketDetailLookupPage] = useState(1);
  const [ticketDetailLookupSearch, setTicketDetailLookupSearch] = useState('');
  const [ticketDetailLookupSearchField, setTicketDetailLookupSearchField] =
    useState<IncidentLookupSearchField>('IDENTIFIER');

  const [incidentValidationErrors, setIncidentValidationErrors] =
    useState<IncidentValidationErrors>({});

  const [requestValidationErrors, setRequestValidationErrors] =
    useState<RequestValidationErrors>({});

  const canManageTicket = canManageTicketActions(session.user.role);
  const canChangeSelectedTicketStatus =
    selectedTicketDetail &&
    canChangeTicketStatus(
      session.user.role,
      session.user.id,
      selectedTicketDetail,
    );
  const statusOptions = selectedTicketDetail
    ? getStatusOptionsForRole(session.user.role, selectedTicketDetail)
    : [];
  const showIncidentAdvancedFields =
    mode === 'INCIDENT' && canManageTicketActions(session.user.role);
  const showRequestAdvancedFields =
    mode === 'REQUEST' && canManageTicketActions(session.user.role);
  const showCreationChannelField = canManageTicketActions(session.user.role);

  const canDeleteTickets = session.user.role === 'ADMIN';
  const canEditTicket = session.user.role === 'ADMIN';

  const isIncidentCreatePage = section === 'INCIDENT_CREATE';
  const isArchiveListPage = section === 'ARCHIVES';
  const isArchiveDetailPage = section === 'ARCHIVE_DETAIL';
  const isMyTicketsPage = section === 'MY_TICKETS';
  const isRequestCreatePage = section === 'REQUEST_CREATE';
  const isListPage = section === 'LIST';
  const isDetailPage = section === 'DETAIL';
  const showCreationPanel = isIncidentCreatePage || isRequestCreatePage;
  const showCreationRequesterField = showCreationPanel;
  const showListPanel = isListPage || isArchiveListPage || isMyTicketsPage;
  const showDetailPanel = isDetailPage || isArchiveDetailPage;
  const detailOrigin =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('from')
      : null;
  const creationAttachmentFiles =
    mode === 'INCIDENT'
      ? incidentCreationAttachmentFiles
      : requestCreationAttachmentFiles;
  const detailBackPath = isArchiveDetailPage
    ? '/agent/archives'
    : detailOrigin === 'reports-personal'
      ? '/reports?view=PERSONAL'
      : detailOrigin === 'reports-group'
        ? '/reports?view=GROUP'
        : '/agent/tickets';
  const searchedTickets = useMemo(
    () =>
      filterTicketsByListSearch(
        tickets,
        searchFilters.q,
        userDirectory,
        catalog.groups,
        searchFilters.searchField,
      ),
    [
      catalog.groups,
      searchFilters.q,
      searchFilters.searchField,
      tickets,
      userDirectory,
    ],
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
      if (session.user.role === 'DEMANDEUR') {
        if (!cancelled) {
          setUserDirectory([]);
        }
        return;
      }

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
  }, [session.accessToken, session.user.role]);

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
    isListPage,
    isMyTicketsPage,
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

      setSelectedTicketHistory([]);

      setCommentDraft(INITIAL_COMMENT_DRAFT);

      setAttachmentDraft(INITIAL_ATTACHMENT_DRAFT);

      setAttachmentInputKey(0);

      setDeletingAttachmentId(null);

      setDeletingCommentId(null);

      setLoadDetailErrorMessage(null);

      setLoadCommentsErrorMessage(null);

      setLoadAttachmentsErrorMessage(null);

      setLoadHistoryErrorMessage(null);

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
          priorityId: nextTicket.ticket.priorityId,
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

    async function loadSelectedTicketHistory(): Promise<void> {
      setIsLoadingHistory(true);

      setLoadHistoryErrorMessage(null);

      try {
        const nextHistory = await getTicketHistory(
          session.accessToken,
          currentTicketId,
        );

        if (cancelled) {
          return;
        }

        setSelectedTicketHistory(nextHistory);
      } catch (error) {
        if (!cancelled) {
          setLoadHistoryErrorMessage(
            error instanceof Error
              ? error.message
              : "Erreur inconnue lors du chargement de l'historique",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadSelectedTicketHistory();

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
          user.isActive &&
          (user.role === 'AGENT' || user.role === 'ADMIN') &&
          getUserSupportGroupIds(user).length > 0,
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
          isUserInSupportGroup(technician, assignmentDraft.assignmentGroupId),
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
          isUserInSupportGroup(technician, selectedCreationAssignmentGroupId),
      ),
    [selectedCreationAssignmentGroupId, technicians],
  );
  const incidentLookupGroups = useMemo(() => {
    const selectedTechnicianGroupIds = getUserSupportGroupIds(
      selectedCreationTechnician,
    );

    if (selectedTechnicianGroupIds.length === 0) {
      return catalog.groups;
    }

    return catalog.groups.filter((group) =>
      selectedTechnicianGroupIds.includes(group.id),
    );
  }, [catalog.groups, selectedCreationTechnician]);

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
      : incidentLookupKind === 'INCIDENT_EQUIPMENT'
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
  const selectedTicketDetailTechnician = usersById.get(
    assignmentDraft.assignedToUserId,
  );
  const selectedTicketDetailGroup = groupsById.get(
    assignmentDraft.assignmentGroupId,
  );
  const selectedTicketDetailRequester = usersById.get(
    ticketEditDraft.requestedForUserId,
  );
  const selectedTicketDetailEquipment = cisById.get(ticketEditDraft.ciId);
  const ticketDetailLookupTechnicians = useMemo(
    () =>
      technicians.filter(
        (technician) =>
          !assignmentDraft.assignmentGroupId ||
          technician.groupId === assignmentDraft.assignmentGroupId,
      ),
    [assignmentDraft.assignmentGroupId, technicians],
  );
  const ticketDetailLookupGroups = useMemo(
    () =>
      selectedTicketDetailTechnician?.groupId
        ? catalog.groups.filter(
            (group) => group.id === selectedTicketDetailTechnician.groupId,
          )
        : catalog.groups,
    [catalog.groups, selectedTicketDetailTechnician?.groupId],
  );
  const ticketDetailLookupUsers =
    ticketDetailLookupKind === 'ASSIGNEE'
      ? ticketDetailLookupTechnicians
      : requesters;
  const filteredTicketDetailLookupUsers = useMemo(
    () =>
      filterIncidentLookupUsers(
        ticketDetailLookupUsers,
        ticketDetailLookupSearch,
        ticketDetailLookupSearchField,
        groupsById,
      ),
    [
      groupsById,
      ticketDetailLookupSearch,
      ticketDetailLookupSearchField,
      ticketDetailLookupUsers,
    ],
  );
  const filteredTicketDetailLookupGroups = useMemo(
    () =>
      filterIncidentLookupGroups(
        ticketDetailLookupGroups,
        ticketDetailLookupSearch,
        ticketDetailLookupSearchField,
      ),
    [
      ticketDetailLookupGroups,
      ticketDetailLookupSearch,
      ticketDetailLookupSearchField,
    ],
  );
  const filteredTicketDetailLookupEquipment = useMemo(
    () =>
      filterIncidentLookupEquipment(
        catalog.cis,
        ticketDetailLookupSearch,
        ticketDetailLookupSearchField,
        ciTypesById,
      ),
    [
      catalog.cis,
      ciTypesById,
      ticketDetailLookupSearch,
      ticketDetailLookupSearchField,
    ],
  );
  const ticketDetailLookupResultCount =
    ticketDetailLookupKind === 'ASSIGNMENT_GROUP'
      ? filteredTicketDetailLookupGroups.length
      : ticketDetailLookupKind === 'EQUIPMENT'
        ? filteredTicketDetailLookupEquipment.length
        : filteredTicketDetailLookupUsers.length;
  const ticketDetailLookupTotalPages = Math.max(
    1,
    Math.ceil(ticketDetailLookupResultCount / INCIDENT_LOOKUP_PAGE_SIZE),
  );
  const paginatedTicketDetailLookupUsers =
    filteredTicketDetailLookupUsers.slice(
      (ticketDetailLookupPage - 1) * INCIDENT_LOOKUP_PAGE_SIZE,
      ticketDetailLookupPage * INCIDENT_LOOKUP_PAGE_SIZE,
    );
  const paginatedTicketDetailLookupGroups =
    filteredTicketDetailLookupGroups.slice(
      (ticketDetailLookupPage - 1) * INCIDENT_LOOKUP_PAGE_SIZE,
      ticketDetailLookupPage * INCIDENT_LOOKUP_PAGE_SIZE,
    );
  const paginatedTicketDetailLookupEquipment =
    filteredTicketDetailLookupEquipment.slice(
      (ticketDetailLookupPage - 1) * INCIDENT_LOOKUP_PAGE_SIZE,
      ticketDetailLookupPage * INCIDENT_LOOKUP_PAGE_SIZE,
    );
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
    incidentLookupKind === 'INCIDENT_EQUIPMENT' ? incidentDraft.ciId : '';
  const selectedTicketDetailLookupUserId =
    ticketDetailLookupKind === 'ASSIGNEE'
      ? assignmentDraft.assignedToUserId
      : ticketDetailLookupKind === 'REQUESTER'
        ? ticketEditDraft.requestedForUserId
        : '';
  const selectedTicketDetailLookupGroupId =
    ticketDetailLookupKind === 'ASSIGNMENT_GROUP'
      ? assignmentDraft.assignmentGroupId
      : '';
  const selectedTicketDetailLookupEquipmentId =
    ticketDetailLookupKind === 'EQUIPMENT' ? ticketEditDraft.ciId : '';

  useEffect(() => {
    if (incidentLookupPage > incidentLookupTotalPages) {
      setIncidentLookupPage(incidentLookupTotalPages);
    }
  }, [incidentLookupPage, incidentLookupTotalPages]);

  useEffect(() => {
    if (ticketDetailLookupPage > ticketDetailLookupTotalPages) {
      setTicketDetailLookupPage(ticketDetailLookupTotalPages);
    }
  }, [ticketDetailLookupPage, ticketDetailLookupTotalPages]);

  function handleIncidentFieldChange(
    field: keyof IncidentDraftState,

    value: string,
  ): void {
    if (field === 'title' && value.length > TICKET_TITLE_MAX_LENGTH) {
      setIncidentValidationErrors((currentErrors) => ({
        ...currentErrors,

        title: '40 caracteres max.',
      }));

      return;
    }

    setIncidentDraft((currentDraft) => {
      if (field === 'assignedToUserId') {
        return {
          ...currentDraft,

          assignedToUserId: value,
        };
      }

      if (field === 'assignmentGroupId') {
        const selectedTechnician = usersById.get(currentDraft.assignedToUserId);

        return {
          ...currentDraft,

          assignedToUserId:
            selectedTechnician &&
            isUserInSupportGroup(selectedTechnician, value)
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
    if (field === 'title' && value.length > TICKET_TITLE_MAX_LENGTH) {
      setRequestValidationErrors((currentErrors) => ({
        ...currentErrors,

        title: '40 caracteres max.',
      }));

      return;
    }

    setRequestDraft((currentDraft) => {
      if (field === 'assignedToUserId') {
        return {
          ...currentDraft,

          assignedToUserId: value,
        };
      }

      if (field === 'assignmentGroupId') {
        const selectedTechnician = usersById.get(currentDraft.assignedToUserId);

        return {
          ...currentDraft,

          assignedToUserId:
            selectedTechnician &&
            isUserInSupportGroup(selectedTechnician, value)
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
    if (kind === 'INCIDENT_EQUIPMENT') {
      const selectedEquipmentIndex = filterIncidentLookupEquipment(
        [],
        '',
        'IDENTIFIER',
        ciTypesById,
      ).findIndex((ci) => ci.id === incidentDraft.ciId);

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

  function openTicketDetailLookup(kind: TicketDetailLookupKind): void {
    if (kind === 'EQUIPMENT') {
      const selectedEquipmentIndex = filterIncidentLookupEquipment(
        catalog.cis,
        '',
        'IDENTIFIER',
        ciTypesById,
      ).findIndex((ci) => ci.id === ticketEditDraft.ciId);

      setTicketDetailLookupKind(kind);
      setTicketDetailLookupSearch('');
      setTicketDetailLookupSearchField('IDENTIFIER');
      setTicketDetailLookupPage(
        selectedEquipmentIndex >= 0
          ? Math.floor(selectedEquipmentIndex / INCIDENT_LOOKUP_PAGE_SIZE) + 1
          : 1,
      );

      return;
    }

    if (kind === 'ASSIGNMENT_GROUP') {
      const selectedGroupIndex = filterIncidentLookupGroups(
        ticketDetailLookupGroups,
        '',
        'IDENTIFIER',
      ).findIndex((group) => group.id === assignmentDraft.assignmentGroupId);

      setTicketDetailLookupKind(kind);
      setTicketDetailLookupSearch('');
      setTicketDetailLookupSearchField('IDENTIFIER');
      setTicketDetailLookupPage(
        selectedGroupIndex >= 0
          ? Math.floor(selectedGroupIndex / INCIDENT_LOOKUP_PAGE_SIZE) + 1
          : 1,
      );

      return;
    }

    const source =
      kind === 'ASSIGNEE' ? ticketDetailLookupTechnicians : requesters;
    const selectedUserId =
      kind === 'ASSIGNEE'
        ? assignmentDraft.assignedToUserId
        : ticketEditDraft.requestedForUserId;
    const selectedUserIndex = filterIncidentLookupUsers(
      source,
      '',
      'IDENTIFIER',
      groupsById,
    ).findIndex((user) => user.id === selectedUserId);

    setTicketDetailLookupKind(kind);
    setTicketDetailLookupSearch('');
    setTicketDetailLookupSearchField('IDENTIFIER');
    setTicketDetailLookupPage(
      selectedUserIndex >= 0
        ? Math.floor(selectedUserIndex / INCIDENT_LOOKUP_PAGE_SIZE) + 1
        : 1,
    );
  }

  function closeTicketDetailLookup(): void {
    setTicketDetailLookupKind(null);
    setTicketDetailLookupSearch('');
    setTicketDetailLookupSearchField('IDENTIFIER');
    setTicketDetailLookupPage(1);
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
    handleIncidentFieldChange('ciId', ci.id);

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

  function handleTicketDetailLookupSelect(user: AdminUserSummary): void {
    if (ticketDetailLookupKind === 'ASSIGNEE') {
      handleAssignmentFieldChange('assignedToUserId', user.id);
    }

    if (ticketDetailLookupKind === 'REQUESTER') {
      handleTicketEditFieldChange('requestedForUserId', user.id);
    }

    closeTicketDetailLookup();
  }

  function handleTicketDetailEquipmentLookupSelect(ci: ReferentialCi): void {
    handleTicketEditFieldChange('ciId', ci.id);
    closeTicketDetailLookup();
  }

  function handleTicketDetailGroupLookupSelect(group: ReferentialGroup): void {
    handleAssignmentFieldChange('assignmentGroupId', group.id);
    closeTicketDetailLookup();
  }

  function toggleTicketDetailSection(section: TicketDetailSectionKey): void {
    setOpenTicketDetailSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section],
    }));
  }

  function handleAssignmentFieldChange(
    field: keyof AssignmentDraftState,

    value: string,
  ): void {
    setAssignmentDraft((currentDraft) => {
      if (field === 'assignedToUserId') {
        return {
          ...currentDraft,

          assignedToUserId: value,
        };
      }

      if (field === 'assignmentGroupId') {
        const selectedTechnician = usersById.get(currentDraft.assignedToUserId);

        return {
          ...currentDraft,

          assignedToUserId:
            selectedTechnician &&
            isUserInSupportGroup(selectedTechnician, value)
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
          try {
            const updatedTicket = await assignTicket(
              session.accessToken,
              result.ticket.id,
              {
                assignedToUserId: incidentAssignedToUserId,
                assignmentGroupId: incidentAssignmentGroupId,
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
        try {
          const updatedTicket = await assignTicket(
            session.accessToken,
            result.ticket.id,
            {
              assignedToUserId: requestAssignedToUserId,
              assignmentGroupId: requestAssignmentGroupId,
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
    if (field === 'title' && value.length > TICKET_TITLE_MAX_LENGTH) {
      setDetailActionErrorMessage('40 caracteres max.');

      return;
    }

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
      let nextSelectedTicketDetail = selectedTicketDetail;

      if (
        canChangeSelectedTicketStatus &&
        statusDraft !==
          (asTicketStatus(selectedTicketDetail.ticket.status) ?? 'OPEN')
      ) {
        const statusUpdatedTicket = await changeTicketStatus(
          session.accessToken,
          selectedTicketDetail.ticket.id,
          {
            status: statusDraft,
          },
        );

        nextSelectedTicketDetail = statusUpdatedTicket;
        setSelectedTicketDetail(statusUpdatedTicket);
        setStatusDraft(
          asTicketStatus(statusUpdatedTicket.ticket.status) ?? 'OPEN',
        );
        await refreshSelectedTicketHistory(statusUpdatedTicket.ticket.id);
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket.id === statusUpdatedTicket.ticket.id
              ? {
                  ...ticket,
                  assignedToUserId: statusUpdatedTicket.ticket.assignedToUserId,
                  assignmentGroupId:
                    statusUpdatedTicket.ticket.assignmentGroupId,
                  status: statusUpdatedTicket.ticket.status,
                }
              : ticket,
          ),
        );
      }

      if (canEditTicket) {
        const updatedTicket = await updateTicket(
          session.accessToken,
          nextSelectedTicketDetail.ticket.id,
          {
            categoryId: ticketEditDraft.categoryId.trim(),
            channelId: normalizeOptionalId(ticketEditDraft.channelId),
            ciId: selectedTicketDetail.incident
              ? normalizeOptionalId(ticketEditDraft.ciId)
              : undefined,
            description: selectedTicketDetail.ticket.description,
            impact: selectedTicketDetail.incident
              ? ticketEditDraft.impact
              : undefined,
            requestedForUserId: normalizeOptionalId(
              ticketEditDraft.requestedForUserId,
            ),
            rootCause: selectedTicketDetail.incident
              ? normalizeOptionalText(ticketEditDraft.rootCause)
              : undefined,
            title: selectedTicketDetail.ticket.title,
            urgency: selectedTicketDetail.incident
              ? ticketEditDraft.urgency
              : undefined,
            workaround: selectedTicketDetail.incident
              ? normalizeOptionalText(ticketEditDraft.workaround)
              : undefined,
          },
        );
        const reprioritizedTicket =
          !selectedTicketDetail.incident &&
          ticketEditDraft.priorityId.trim() &&
          ticketEditDraft.priorityId !== updatedTicket.ticket.priorityId
            ? await changeTicketPriority(
                session.accessToken,
                nextSelectedTicketDetail.ticket.id,
                {
                  priorityId: ticketEditDraft.priorityId.trim(),
                },
              )
            : updatedTicket;
        nextSelectedTicketDetail = reprioritizedTicket;
        setSelectedTicketDetail(reprioritizedTicket);
        setTicketEditDraft({
          categoryId: reprioritizedTicket.ticket.categoryId,
          channelId: reprioritizedTicket.ticket.channelId ?? '',
          ciId: reprioritizedTicket.ticket.ciId ?? '',
          description: reprioritizedTicket.ticket.description,
          impact: reprioritizedTicket.incident?.impact ?? 'MEDIUM',
          priorityId: reprioritizedTicket.ticket.priorityId,
          requestedForUserId:
            reprioritizedTicket.ticket.requestedForUserId ?? '',
          rootCause: reprioritizedTicket.incident?.rootCause ?? '',
          title: reprioritizedTicket.ticket.title,
          urgency: reprioritizedTicket.incident?.urgency ?? 'MEDIUM',
          workaround: reprioritizedTicket.incident?.workaround ?? '',
        });
        setTickets((currentTickets) =>
          currentTickets.map((ticket) =>
            ticket.id === reprioritizedTicket.ticket.id
              ? {
                  ...ticket,
                  status: reprioritizedTicket.ticket.status,
                  categoryId: reprioritizedTicket.ticket.categoryId,
                  channelId: reprioritizedTicket.ticket.channelId,
                  ciId: reprioritizedTicket.ticket.ciId,
                  priorityId: reprioritizedTicket.ticket.priorityId,
                  requestedForUserId:
                    reprioritizedTicket.ticket.requestedForUserId,
                  resolutionDueAt: reprioritizedTicket.ticket.resolutionDueAt,
                  responseDueAt: reprioritizedTicket.ticket.responseDueAt,
                  title: reprioritizedTicket.ticket.title,
                }
              : ticket,
          ),
        );
      }

      if (canManageTicket) {
        const updatedTicket = await assignTicket(
          session.accessToken,
          nextSelectedTicketDetail.ticket.id,
          {
            assignedToUserId: normalizeOptionalId(
              assignmentDraft.assignedToUserId,
            ),
            assignmentGroupId: normalizeOptionalId(
              assignmentDraft.assignmentGroupId,
            ),
          },
        );
        nextSelectedTicketDetail = updatedTicket;
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
        priorityId: selectedTicketDetail.ticket.priorityId,
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

  function handleCommentBodyChange(value: string): void {
    setCommentDraft((currentDraft) => ({
      ...currentDraft,

      body: value,
    }));

    setCommentErrorMessage(null);

    setCommentSuccessMessage(null);
  }

  function handleAttachmentSelection(fileList: FileList | null): void {
    const incomingFiles = Array.from(fileList ?? []);

    if (incomingFiles.length === 0) {
      return;
    }

    setAttachmentDraft((currentDraft) => {
      const knownFileKeys = new Set(currentDraft.files.map(getLocalFileKey));
      const nextFiles = [...currentDraft.files];

      for (const file of incomingFiles) {
        const fileKey = getLocalFileKey(file);

        if (!knownFileKeys.has(fileKey)) {
          knownFileKeys.add(fileKey);
          nextFiles.push(file);
        }
      }

      return { files: nextFiles };
    });
    setAttachmentInputKey((currentKey) => currentKey + 1);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);
  }

  function handleRemoveAttachmentDraftFile(fileKey: string): void {
    setAttachmentDraft((currentDraft) => ({
      files: currentDraft.files.filter(
        (file) => getLocalFileKey(file) !== fileKey,
      ),
    }));
    setAttachmentInputKey((currentKey) => currentKey + 1);
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

    if (normalizedCommentId.startsWith('seed-description-')) {
      return;
    }

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

      await refreshSelectedTicketHistory(selectedTicketDetail.ticket.id);
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
          isInternal: false,
        },
      );

      setSelectedTicketComments((currentComments) => [
        ...currentComments,
        createdComment,
      ]);

      setCommentDraft(INITIAL_COMMENT_DRAFT);

      setDeletingCommentId(null);

      setCommentSuccessMessage('Commentaire ajoute.');

      await refreshSelectedTicketHistory(selectedTicketDetail.ticket.id);
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

    const files = attachmentDraft.files;

    if (files.length === 0) {
      setAttachmentErrorMessage('Selectionne au moins un fichier a envoyer.');
      return;
    }

    setIsSubmittingAttachment(true);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);

    try {
      const createdAttachments: TicketAttachmentSnapshot[] = [];

      for (const file of files) {
        const storagePath = buildTicketAttachmentStoragePath(
          session.user.id,
          selectedTicketDetail.ticket.id,
          file.name,
        );

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

        createdAttachments.push(createdAttachment);
      }

      setSelectedTicketAttachments((currentAttachments) => [
        ...createdAttachments,
        ...currentAttachments,
      ]);
      setAttachmentDraft(INITIAL_ATTACHMENT_DRAFT);
      setAttachmentInputKey((currentKey) => currentKey + 1);
      setAttachmentSuccessMessage(
        createdAttachments.length > 1
          ? 'Pieces jointes ajoutees.'
          : 'Piece jointe ajoutee.',
      );

      await refreshSelectedTicketHistory(selectedTicketDetail.ticket.id);
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

      await refreshSelectedTicketHistory(selectedTicketDetail.ticket.id);
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

  async function refreshSelectedTicketHistory(ticketId: string): Promise<void> {
    try {
      const nextHistory = await getTicketHistory(session.accessToken, ticketId);

      setSelectedTicketHistory(nextHistory);
      setLoadHistoryErrorMessage(null);
    } catch (error) {
      setLoadHistoryErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors du chargement de l'historique",
      );
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
                    <span>
                      Titre <RequiredMark />
                    </span>

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
                    <span>
                      Description <RequiredMark />
                    </span>

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
                      <span>
                        Categorie <RequiredMark />
                      </span>

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

                  {mode === 'INCIDENT' ? (
                    <>
                      <label className="field ticket-create-order-incident-impact">
                        <span>
                          Impact <RequiredMark />
                        </span>

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
                        <span>
                          Urgence <RequiredMark />
                        </span>

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
                          <span>
                            Demandeur <RequiredMark />
                          </span>

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
                    </>
                  ) : (
                    <>
                      <label className="field ticket-create-order-request-priority">
                        <span>
                          Priorite <RequiredMark />
                        </span>

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
                          <span>
                            Demandeur <RequiredMark />
                          </span>

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

                      <label className="field ticket-create-order-request-category">
                        <span>
                          Categorie <RequiredMark />
                        </span>

                        <select
                          className={
                            requestDraft.categoryId ? '' : 'select-placeholder'
                          }
                          onChange={(event) =>
                            handleRequestFieldChange(
                              'categoryId',
                              event.target.value,
                            )
                          }
                          value={requestDraft.categoryId}
                        >
                          <option disabled hidden value="">
                            Choisir une categorie
                          </option>

                          {catalog.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
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
                  <div
                    aria-modal="true"
                    className="incident-lookup-overlay"
                    role="dialog"
                  >
                    <section className="incident-lookup-dialog">
                      <header className="incident-lookup-header">
                        <div>
                          <h3>
                            {incidentLookupKind === 'ASSIGNMENT_GROUP'
                              ? 'Selectionner un groupe'
                              : incidentLookupKind === 'INCIDENT_EQUIPMENT'
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
                            </>
                          ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ? (
                            <>
                              <option value="NAME">Nom</option>
                              <option value="TYPE">Type</option>
                              <option value="STATUS">Statut</option>
                              <option value="SERIAL_NUMBER">
                                Numero de serie
                              </option>
                            </>
                          ) : (
                            <>
                              <option value="FIRST_NAME">Prenom</option>
                              <option value="LAST_NAME">Nom</option>
                            </>
                          )}
                        </select>
                        <div className="incident-lookup-search-input">
                          <input
                            autoFocus
                            onChange={(event) =>
                              setIncidentLookupSearch(event.target.value)
                            }
                            placeholder="Rechercher"
                            value={incidentLookupSearch}
                          />
                        </div>
                      </label>

                      <div className="incident-lookup-table-scroll">
                        <table
                          className={
                            incidentLookupKind === 'ASSIGNMENT_GROUP' ||
                            incidentLookupKind === 'INCIDENT_EQUIPMENT'
                              ? 'incident-lookup-table'
                              : incidentLookupKind === 'ASSIGNEE'
                                ? 'incident-lookup-table incident-lookup-table--assignee'
                                : 'incident-lookup-table incident-lookup-table--users'
                          }
                        >
                          <thead>
                            {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
                              <tr>
                                <th>Identifiant</th>
                                <th>Nom</th>
                                <th>Description</th>
                              </tr>
                            ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ? (
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
                                <th>Email</th>
                              </tr>
                            )}
                          </thead>

                          <tbody>
                            {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
                              paginatedIncidentLookupGroups.length === 0 ? (
                                <tr>
                                  <td colSpan={3}>
                                    Aucun groupe ne correspond a la recherche.
                                  </td>
                                </tr>
                              ) : (
                                paginatedIncidentLookupGroups.map((group) => (
                                  <tr
                                    aria-selected={
                                      group.id === selectedIncidentLookupGroupId
                                    }
                                    className={
                                      group.id === selectedIncidentLookupGroupId
                                        ? 'incident-lookup-row is-selected'
                                        : 'incident-lookup-row'
                                    }
                                    key={group.id}
                                    onClick={() =>
                                      handleIncidentGroupLookupSelect(group)
                                    }
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                      ) {
                                        event.preventDefault();
                                        handleIncidentGroupLookupSelect(group);
                                      }
                                    }}
                                  >
                                    <td className="incident-lookup-identity">
                                      {group.name}
                                    </td>
                                    <td>{group.name}</td>
                                    <td>{group.description ?? '-'}</td>
                                  </tr>
                                ))
                              )
                            ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ? (
                              paginatedIncidentLookupEquipment.length === 0 ? (
                                <tr>
                                  <td colSpan={5}>
                                    Aucun equipement disponible dans le parc
                                    informatique pour le moment.
                                  </td>
                                </tr>
                              ) : (
                                paginatedIncidentLookupEquipment.map((ci) => {
                                  const ciType = ciTypesById.get(ci.ciTypeId);

                                  return (
                                    <tr
                                      aria-selected={
                                        ci.id ===
                                        selectedIncidentLookupEquipmentId
                                      }
                                      className={
                                        ci.id ===
                                        selectedIncidentLookupEquipmentId
                                          ? 'incident-lookup-row is-selected'
                                          : 'incident-lookup-row'
                                      }
                                      key={ci.id}
                                      onClick={() =>
                                        handleIncidentEquipmentLookupSelect(ci)
                                      }
                                      tabIndex={0}
                                      onKeyDown={(event) => {
                                        if (
                                          event.key === 'Enter' ||
                                          event.key === ' '
                                        ) {
                                          event.preventDefault();
                                          handleIncidentEquipmentLookupSelect(
                                            ci,
                                          );
                                        }
                                      }}
                                    >
                                      <td className="incident-lookup-identity">
                                        {ci.name}
                                      </td>
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
                                <td colSpan={4}>
                                  Aucun utilisateur ne correspond a la
                                  recherche.
                                </td>
                              </tr>
                            ) : (
                              paginatedIncidentLookupUsers.map((user) => (
                                <tr
                                  aria-selected={
                                    user.id === selectedIncidentLookupUserId
                                  }
                                  className={
                                    user.id === selectedIncidentLookupUserId
                                      ? 'incident-lookup-row is-selected'
                                      : 'incident-lookup-row'
                                  }
                                  key={user.id}
                                  onClick={() =>
                                    handleIncidentLookupSelect(user)
                                  }
                                  tabIndex={0}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === 'Enter' ||
                                      event.key === ' '
                                    ) {
                                      event.preventDefault();
                                      handleIncidentLookupSelect(user);
                                    }
                                  }}
                                >
                                  <td className="incident-lookup-identity">
                                    {formatKnownUserName(user, user.id)}
                                  </td>
                                  <td>{user.firstName ?? 'Non renseigne'}</td>
                                  <td>{user.lastName ?? 'Non renseigne'}</td>
                                  <td>{user.email ?? '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <footer className="incident-lookup-pagination">
                        <span>
                          Page {incidentLookupPage} sur{' '}
                          {incidentLookupTotalPages} -{' '}
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
                            disabled={
                              incidentLookupPage >= incidentLookupTotalPages
                            }
                            onClick={() =>
                              setIncidentLookupPage((currentPage) =>
                                Math.min(
                                  incidentLookupTotalPages,
                                  currentPage + 1,
                                ),
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
              <section className="ticket-list-card">
                <div className="ticket-list-header">
                  <div>
                    <h3>{ticketListTitle}</h3>

                    <p>{ticketListDescription}</p>
                  </div>

                  <div className="ticket-list-toolbar">
                    <div className="ticket-list-count" aria-live="polite">
                      <strong>{searchedTickets.length}</strong>
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
                            {TICKET_SORT_OPTIONS.map((option) => {
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
                                    handleSearchFilterChange(
                                      'sortBy',
                                      option.value,
                                    );
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
                          handleSearchFilterChange(
                            'searchField',
                            event.target.value,
                          )
                        }
                        value={searchFilters.searchField}
                      >
                        <option value="TITLE">Titre</option>
                        <option value="REQUESTER">Demandeur</option>
                        <option value="GROUP">Groupe</option>
                        <option value="TECHNICIAN">Assigne a</option>
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
                        handleSearchFilterChange(
                          'categoryId',
                          event.target.value,
                        )
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
                        handleSearchFilterChange(
                          'priorityId',
                          event.target.value,
                        )
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
                  <p className="ticket-form-message">
                    Chargement des tickets...
                  </p>
                ) : loadTicketsErrorMessage ? (
                  <p className="ticket-form-error">{loadTicketsErrorMessage}</p>
                ) : searchedTickets.length === 0 ? (
                  <p className="ticket-form-message">
                    {ticketListEmptyMessage}
                  </p>
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
                              <th>Date de creation</th>
                              <th>Priorite</th>
                              <th>Demandeur</th>
                              <th>Assigne a</th>
                              <th>Categorie</th>
                              <th>Groupe</th>
                              <th>TTR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedTickets.map((ticket) => (
                              <tr
                                className="ticket-table-row"
                                key={ticket.id}
                                onClick={() =>
                                  navigateTo(
                                    isArchiveListPage
                                      ? `/agent/archives/${ticket.id}`
                                      : `/agent/tickets/${ticket.id}`,
                                  )
                                }
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
                                <td>
                                  {renderPriorityBadge(ticket, prioritiesById)}
                                </td>
                                <td>
                                  {formatKnownUserName(
                                    usersById.get(
                                      ticket.requestedForUserId ??
                                        ticket.createdByUserId,
                                    ),
                                    ticket.requestedForUserId ??
                                      ticket.createdByUserId,
                                  )}
                                </td>
                                <td>
                                  {ticket.assignedToUserId
                                    ? formatKnownUserName(
                                        usersById.get(ticket.assignedToUserId),
                                        ticket.assignedToUserId,
                                      )
                                    : 'aucun'}
                                </td>
                                <td>
                                  {categoriesById.get(ticket.categoryId)
                                    ?.name ?? 'Non définie'}
                                </td>
                                <td>
                                  {ticket.assignmentGroupId
                                    ? (groupsById.get(ticket.assignmentGroupId)
                                        ?.name ?? ticket.assignmentGroupId)
                                    : 'aucun'}
                                </td>
                                <td>
                                  <div className="ticket-resolution-cell">
                                    <span className="ticket-resolution-value">
                                      {formatTicketResolutionDueAt(
                                        ticket,
                                        prioritiesById,
                                      )}
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
                        Page {ticketPage} sur {totalTicketPages} -{' '}
                        {searchedTickets.length} tickets
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
                          {Array.from(
                            { length: totalTicketPages },
                            (_, index) => {
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
                            },
                          )}
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
            ) : null}

            {showDetailPanel ? (
              <aside className="tdp-shell">
                <div className="tdp-topbar">
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

                  {selectedTicketDetail ? (
                    <strong className="tdp-topbar-ticket-title">
                      {selectedTicketDetail.ticket.title}
                    </strong>
                  ) : null}

                  <div className="tdp-topbar-right">
                    {selectedTicketDetail ? (
                      <span className="tdp-ticket-number">
                        {formatTicketDisplayNumber(selectedTicketDetail.ticket)}
                      </span>
                    ) : null}
                    {selectedTicketDetail && canChangeSelectedTicketStatus ? (
                      <div className="tdp-status-form">
                        <select
                          disabled={isSavingInfo}
                          onChange={(event) =>
                            setStatusDraft(
                              asTicketStatus(event.target.value) ?? 'OPEN',
                            )
                          }
                          value={statusDraft}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {selectedTicketDetail &&
                    (canEditTicket || canManageTicket) ? (
                      <button
                        className="primary-button admin-user-save-button"
                        disabled={isSavingInfo}
                        onClick={() => void handleSaveInfoEdits()}
                        type="button"
                      >
                        <Plus
                          size={16}
                          strokeWidth={2.3}
                          style={{ marginRight: 8 }}
                        />
                        {isSavingInfo ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    ) : null}

                    {selectedTicketDetail && canDeleteTickets ? (
                      <button
                        className="admin-user-delete-button"
                        disabled={isDeletingTicket}
                        onClick={() => void handleDeleteTicket()}
                        type="button"
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                        {isDeletingTicket ? 'Suppression...' : 'Supprimer'}
                      </button>
                    ) : null}
                  </div>
                </div>

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
                  <>
                    <div className="tdp-modern-content">
                      <section className="tdp-chat-panel">
                        <div className="tdp-chat-thread">
                          {isLoadingComments ? (
                            <p className="tdp-state">
                              Chargement des commentaires...
                            </p>
                          ) : loadCommentsErrorMessage ? (
                            <p className="tdp-state tdp-state--error">
                              {loadCommentsErrorMessage}
                            </p>
                          ) : seededTicketComments.length === 0 ? (
                            <p className="tdp-empty">
                              Aucun commentaire pour ce ticket.
                            </p>
                          ) : (
                            seededTicketComments.map((comment) => {
                              const canDeleteComment =
                                !comment.isSeedDescription &&
                                canDeleteTicketComment(
                                  session.user.role,
                                  session.user.id,
                                  comment.authorUserId,
                                );
                              const authorName = formatKnownUserName(
                                usersById.get(comment.authorUserId),
                                comment.authorUserId,
                              );
                              const isOwnComment =
                                comment.authorUserId === session.user.id;
                              const initials =
                                formatCommentAuthorInitials(authorName);
                              const messageClassName = [
                                'tdp-chat-message',
                                isOwnComment ? 'is-own' : null,
                                comment.isSeedDescription ? 'is-seed' : null,
                              ]
                                .filter(Boolean)
                                .join(' ');

                              return (
                                <article
                                  className={messageClassName}
                                  key={comment.id}
                                >
                                  {isOwnComment ? null : (
                                    <div className="tdp-comment-avatar">
                                      {initials}
                                    </div>
                                  )}

                                  <div className="tdp-chat-bubble">
                                    <div className="tdp-chat-message-header">
                                      <strong>
                                        {isOwnComment ? 'Vous' : authorName}
                                      </strong>

                                      <span>
                                        {formatTicketDate(comment.createdAt)}
                                      </span>

                                      {canDeleteComment ? (
                                        <button
                                          className="tdp-delete-btn"
                                          disabled={
                                            deletingCommentId === comment.id
                                          }
                                          onClick={() =>
                                            void handleDeleteComment(comment.id)
                                          }
                                          type="button"
                                        >
                                          {deletingCommentId === comment.id
                                            ? 'Suppression...'
                                            : 'Supprimer'}
                                        </button>
                                      ) : null}
                                    </div>

                                    <p>
                                      {comment.isSeedDescription ? (
                                        <>
                                          <strong>Description :</strong>
                                          <br />
                                          {comment.body}
                                        </>
                                      ) : (
                                        comment.body
                                      )}
                                    </p>
                                  </div>
                                </article>
                              );
                            })
                          )}
                        </div>

                        <form
                          className="tdp-chat-composer"
                          onSubmit={handleCommentSubmit}
                        >
                          <input
                            onChange={(event) =>
                              handleCommentBodyChange(event.target.value)
                            }
                            placeholder="Ecrire un message sur le ticket..."
                            value={commentDraft.body}
                          />

                          <button
                            className="secondary-button"
                            disabled={isSubmittingComment}
                          >
                            {isSubmittingComment ? 'Envoi...' : 'Envoyer'}
                          </button>

                          {commentErrorMessage ? (
                            <p className="tdp-form-error">
                              {commentErrorMessage}
                            </p>
                          ) : null}

                          {commentSuccessMessage ? (
                            <p className="tdp-form-success">
                              {commentSuccessMessage}
                            </p>
                          ) : null}
                        </form>
                      </section>

                      <section className="tdp-editor-panel">
                        {detailActionErrorMessage ? (
                          <p className="tdp-form-error">
                            {detailActionErrorMessage}
                          </p>
                        ) : null}

                        {detailActionSuccessMessage ? (
                          <p className="tdp-form-success">
                            {detailActionSuccessMessage}
                          </p>
                        ) : null}

                        <TicketDetailSectionPanel
                          icon={<TicketIcon size={16} />}
                          isOpen={openTicketDetailSections.TICKET}
                          onToggle={() => toggleTicketDetailSection('TICKET')}
                          title="Ticket"
                        >
                          <div className="tdp-side-form">
                            <label className="field tdp-detail-field">
                              <span>Categorie</span>
                              {canEditTicket ? (
                                <select
                                  onChange={(event) =>
                                    handleTicketEditFieldChange(
                                      'categoryId',
                                      event.target.value,
                                    )
                                  }
                                  value={ticketEditDraft.categoryId}
                                >
                                  {catalog.categories.map((category) => (
                                    <option
                                      key={category.id}
                                      value={category.id}
                                    >
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <strong>
                                  {categoriesById.get(
                                    selectedTicketDetail.ticket.categoryId,
                                  )?.name ?? 'Non definie'}
                                </strong>
                              )}
                            </label>

                            <label className="field tdp-detail-field">
                              <span>Canal</span>
                              {canEditTicket ? (
                                <select
                                  onChange={(event) =>
                                    handleTicketEditFieldChange(
                                      'channelId',
                                      event.target.value,
                                    )
                                  }
                                  value={ticketEditDraft.channelId}
                                >
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
                                        channelsById.get(
                                          selectedTicketDetail.ticket.channelId,
                                        )?.name ??
                                          selectedTicketDetail.ticket.channelId,
                                      )
                                    : 'Non renseigne'}
                                </strong>
                              )}
                            </label>

                            {selectedTicketDetail.incident ? (
                              <>
                                <label className="field tdp-detail-field">
                                  <span>Impact</span>
                                  {canEditTicket ? (
                                    <select
                                      onChange={(event) =>
                                        handleTicketEditFieldChange(
                                          'impact',
                                          event.target
                                            .value as IncidentSeverity,
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
                                      {translateIncidentSeverity(
                                        selectedTicketDetail.incident.impact,
                                      )}
                                    </strong>
                                  )}
                                </label>

                                <label className="field tdp-detail-field">
                                  <span>Urgence</span>
                                  {canEditTicket ? (
                                    <select
                                      onChange={(event) =>
                                        handleTicketEditFieldChange(
                                          'urgency',
                                          event.target
                                            .value as IncidentSeverity,
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
                                      {translateIncidentSeverity(
                                        selectedTicketDetail.incident.urgency,
                                      )}
                                    </strong>
                                  )}
                                </label>
                              </>
                            ) : null}

                            {selectedTicketDetail.incident ? (
                              <label className="field tdp-detail-field">
                                <span>Equipement concerne</span>
                                {canEditTicket ? (
                                  <div
                                    className={
                                      ticketEditDraft.ciId
                                        ? 'incident-lookup-field has-clear'
                                        : 'incident-lookup-field'
                                    }
                                  >
                                    <input
                                      className={
                                        ticketEditDraft.ciId
                                          ? ''
                                          : 'lookup-placeholder'
                                      }
                                      placeholder="Choisir l'equipement"
                                      readOnly
                                      value={
                                        selectedTicketDetailEquipment?.name ??
                                        ''
                                      }
                                    />

                                    {ticketEditDraft.ciId ? (
                                      <button
                                        aria-label="Retirer l'equipement"
                                        onClick={() =>
                                          handleTicketEditFieldChange(
                                            'ciId',
                                            '',
                                          )
                                        }
                                        type="button"
                                      >
                                        <X size={16} />
                                      </button>
                                    ) : null}

                                    <button
                                      aria-label="Rechercher un equipement"
                                      onClick={() =>
                                        openTicketDetailLookup('EQUIPMENT')
                                      }
                                      type="button"
                                    >
                                      <Search size={18} />
                                    </button>
                                  </div>
                                ) : (
                                  <strong>
                                    {selectedTicketDetail.ticket.ciId
                                      ? (cisById.get(
                                          selectedTicketDetail.ticket.ciId,
                                        )?.name ??
                                        selectedTicketDetail.ticket.ciId)
                                      : 'Non renseigne'}
                                  </strong>
                                )}
                              </label>
                            ) : (
                              <label className="field tdp-detail-field">
                                <span>Priorite</span>
                                {canEditTicket ? (
                                  <select
                                    onChange={(event) =>
                                      handleTicketEditFieldChange(
                                        'priorityId',
                                        event.target.value,
                                      )
                                    }
                                    value={ticketEditDraft.priorityId}
                                  >
                                    {catalog.priorities.map((priority) => (
                                      <option
                                        key={priority.id}
                                        value={priority.id}
                                      >
                                        {translatePriority(priority.name)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <strong>
                                    {selectedTicketDetail.priorityName
                                      ? translatePriority(
                                          selectedTicketDetail.priorityName,
                                        )
                                      : prioritiesById.get(
                                            selectedTicketDetail.ticket
                                              .priorityId,
                                          )
                                        ? translatePriority(
                                            prioritiesById.get(
                                              selectedTicketDetail.ticket
                                                .priorityId,
                                            )!.name,
                                          )
                                        : 'Priorite non definie'}
                                  </strong>
                                )}
                              </label>
                            )}
                          </div>
                        </TicketDetailSectionPanel>

                        <TicketDetailSectionPanel
                          icon={<Users size={16} />}
                          isOpen={openTicketDetailSections.ACTORS}
                          onToggle={() => toggleTicketDetailSection('ACTORS')}
                          title="Acteurs"
                        >
                          <div className="tdp-side-form">
                            <label className="field tdp-detail-field">
                              <span>Demandeur</span>
                              {canEditTicket ? (
                                <div className="incident-lookup-field">
                                  <input
                                    className={
                                      ticketEditDraft.requestedForUserId
                                        ? ''
                                        : 'lookup-placeholder'
                                    }
                                    placeholder="Choisir un demandeur"
                                    readOnly
                                    value={
                                      selectedTicketDetailRequester
                                        ? formatKnownUserName(
                                            selectedTicketDetailRequester,
                                            selectedTicketDetailRequester.id,
                                          )
                                        : ''
                                    }
                                  />

                                  <button
                                    aria-label="Rechercher un demandeur"
                                    onClick={() =>
                                      openTicketDetailLookup('REQUESTER')
                                    }
                                    type="button"
                                  >
                                    <Search size={18} />
                                  </button>
                                </div>
                              ) : (
                                <strong>
                                  {selectedTicketDetail.ticket
                                    .requestedForUserId
                                    ? formatKnownUserName(
                                        usersById.get(
                                          selectedTicketDetail.ticket
                                            .requestedForUserId,
                                        ),
                                        selectedTicketDetail.ticket
                                          .requestedForUserId,
                                      )
                                    : 'Non renseigne'}
                                </strong>
                              )}
                            </label>

                            <label className="field tdp-detail-field">
                              <span>Agent assigne</span>
                              {canManageTicket ? (
                                <div
                                  className={
                                    assignmentDraft.assignedToUserId
                                      ? 'incident-lookup-field has-clear'
                                      : 'incident-lookup-field'
                                  }
                                >
                                  <input
                                    className={
                                      assignmentDraft.assignedToUserId
                                        ? ''
                                        : 'lookup-placeholder'
                                    }
                                    placeholder="Choisir un technicien"
                                    readOnly
                                    value={
                                      selectedTicketDetailTechnician
                                        ? formatKnownUserName(
                                            selectedTicketDetailTechnician,
                                            selectedTicketDetailTechnician.id,
                                          )
                                        : ''
                                    }
                                  />

                                  {assignmentDraft.assignedToUserId ? (
                                    <button
                                      aria-label="Retirer l'assignation"
                                      onClick={() =>
                                        handleAssignmentFieldChange(
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
                                    onClick={() =>
                                      openTicketDetailLookup('ASSIGNEE')
                                    }
                                    type="button"
                                  >
                                    <Search size={18} />
                                  </button>
                                </div>
                              ) : (
                                <strong>
                                  {selectedTicketDetail.ticket.assignedToUserId
                                    ? formatKnownUserName(
                                        usersById.get(
                                          selectedTicketDetail.ticket
                                            .assignedToUserId,
                                        ),
                                        selectedTicketDetail.ticket
                                          .assignedToUserId,
                                      )
                                    : 'aucun'}
                                </strong>
                              )}
                            </label>

                            <label className="field tdp-detail-field">
                              <span>Groupe d'affectation</span>
                              {canManageTicket ? (
                                <div
                                  className={
                                    assignmentDraft.assignmentGroupId
                                      ? 'incident-lookup-field has-clear'
                                      : 'incident-lookup-field'
                                  }
                                >
                                  <input
                                    className={
                                      assignmentDraft.assignmentGroupId
                                        ? ''
                                        : 'lookup-placeholder'
                                    }
                                    placeholder="Choisir un groupe"
                                    readOnly
                                    value={
                                      selectedTicketDetailGroup?.name ?? ''
                                    }
                                  />

                                  {assignmentDraft.assignmentGroupId ? (
                                    <button
                                      aria-label="Retirer le groupe"
                                      onClick={() =>
                                        handleAssignmentFieldChange(
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
                                      openTicketDetailLookup('ASSIGNMENT_GROUP')
                                    }
                                    type="button"
                                  >
                                    <Search size={18} />
                                  </button>
                                </div>
                              ) : (
                                <strong>
                                  {selectedTicketDetail.ticket.assignmentGroupId
                                    ? (groupsById.get(
                                        selectedTicketDetail.ticket
                                          .assignmentGroupId,
                                      )?.name ??
                                      selectedTicketDetail.ticket
                                        .assignmentGroupId)
                                    : 'Aucun groupe'}
                                </strong>
                              )}
                            </label>
                          </div>
                        </TicketDetailSectionPanel>

                        <TicketDetailSectionPanel
                          count={selectedTicketAttachments.length}
                          icon={<Paperclip size={16} />}
                          isOpen={openTicketDetailSections.ATTACHMENTS}
                          onToggle={() =>
                            toggleTicketDetailSection('ATTACHMENTS')
                          }
                          title="Pieces jointes"
                        >
                          {isLoadingAttachments ? (
                            <p className="tdp-state">
                              Chargement des pieces jointes...
                            </p>
                          ) : loadAttachmentsErrorMessage ? (
                            <p className="tdp-state tdp-state--error">
                              {loadAttachmentsErrorMessage}
                            </p>
                          ) : selectedTicketAttachments.length === 0 ? (
                            <p className="tdp-empty">Aucune piece jointe.</p>
                          ) : (
                            <div className="tdp-attachment-list">
                              {selectedTicketAttachments.map((attachment) => (
                                <div
                                  className="tdp-attachment-item"
                                  key={attachment.id}
                                >
                                  <div className="tdp-attachment-info">
                                    <button
                                      className="tdp-attachment-link"
                                      onClick={() =>
                                        void handleDownloadAttachment(
                                          attachment,
                                        )
                                      }
                                      type="button"
                                    >
                                      {attachment.fileName}
                                    </button>
                                    <span>
                                      {formatFileSize(attachment.sizeBytes)} -
                                      ajoute le{' '}
                                      {formatTicketDate(attachment.createdAt)}
                                    </span>
                                  </div>

                                  <button
                                    aria-label="Supprimer la piece jointe"
                                    className="tdp-attachment-remove-btn"
                                    disabled={
                                      deletingAttachmentId === attachment.id
                                    }
                                    onClick={() =>
                                      void handleDeleteAttachment(attachment)
                                    }
                                    type="button"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <form
                            className="tdp-reply-attachment-form"
                            onSubmit={handleAttachmentSubmit}
                          >
                            <div className="ticket-upload-zone tdp-upload-zone">
                              <div className="ticket-upload-actions">
                                <label className="ticket-upload-button">
                                  Choisir des fichiers
                                  <input
                                    accept="*/*"
                                    key={attachmentInputKey}
                                    onChange={(event) =>
                                      handleAttachmentSelection(
                                        event.target.files,
                                      )
                                    }
                                    multiple
                                    type="file"
                                  />
                                </label>

                                <span className="ticket-upload-note">
                                  {formatSelectedFilesLabel(
                                    attachmentDraft.files.length,
                                  )}
                                </span>
                              </div>

                              {attachmentDraft.files.length > 0 ? (
                                <div className="ticket-file-list">
                                  {attachmentDraft.files.map((file) => {
                                    const fileKey = getLocalFileKey(file);

                                    return (
                                      <span
                                        className="ticket-file-chip"
                                        key={fileKey}
                                      >
                                        <span>
                                          {file.name} (
                                          {formatFileSize(file.size)})
                                        </span>
                                        <button
                                          aria-label={`Retirer ${file.name}`}
                                          onClick={() =>
                                            handleRemoveAttachmentDraftFile(
                                              fileKey,
                                            )
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

                              <div className="ticket-upload-note ticket-upload-note--stacked">
                                <span>
                                  Glissez et deposez vos fichiers ici, ou
                                  selectionnez des fichiers.
                                </span>
                                <span>2 Mo max par fichier.</span>
                              </div>
                            </div>

                            <div className="tdp-reply-footer tdp-reply-footer--end">
                              <button
                                className="secondary-button"
                                disabled={isSubmittingAttachment}
                              >
                                {isSubmittingAttachment
                                  ? 'Envoi...'
                                  : 'Joindre'}
                              </button>
                            </div>

                            {attachmentErrorMessage ? (
                              <p className="tdp-form-error">
                                {attachmentErrorMessage}
                              </p>
                            ) : null}

                            {attachmentSuccessMessage ? (
                              <p className="tdp-form-success">
                                {attachmentSuccessMessage}
                              </p>
                            ) : null}
                          </form>
                        </TicketDetailSectionPanel>

                        <TicketDetailSectionPanel
                          count={
                            selectedTicketHistory.filter(
                              (entry) => !isTicketCommentHistoryEntry(entry),
                            ).length
                          }
                          icon={<History size={16} />}
                          isOpen={openTicketDetailSections.HISTORY}
                          onToggle={() => toggleTicketDetailSection('HISTORY')}
                          title="Historique"
                        >
                          {isLoadingHistory ? (
                            <p className="tdp-state">
                              Chargement de l'historique...
                            </p>
                          ) : loadHistoryErrorMessage ? (
                            <p className="tdp-state tdp-state--error">
                              {loadHistoryErrorMessage}
                            </p>
                          ) : selectedTicketHistory.filter(
                              (entry) => !isTicketCommentHistoryEntry(entry),
                            ).length === 0 ? (
                            <p className="tdp-empty">
                              Aucun evenement historise pour ce ticket.
                            </p>
                          ) : (
                            <div className="tdp-history-timeline">
                              {selectedTicketHistory
                                .filter(
                                  (entry) =>
                                    !isTicketCommentHistoryEntry(entry),
                                )
                                .map((entry) => (
                                  <div
                                    className={getTicketHistoryEntryClassName(
                                      entry,
                                    )}
                                    key={entry.id}
                                  >
                                    <span className="tdp-history-dot" />
                                    <div className="tdp-history-meta">
                                      <div className="tdp-history-heading">
                                        <strong>
                                          {formatTicketHistoryTitle(entry)}
                                        </strong>
                                        <span className="tdp-history-actor">
                                          {formatKnownUserName(
                                            usersById.get(entry.actorUserId),
                                            entry.actorUserId,
                                          )}
                                        </span>
                                      </div>
                                      <span className="tdp-history-date">
                                        {formatTicketDate(entry.createdAt)}
                                      </span>
                                    </div>
                                    <p className="tdp-history-payload">
                                      {formatTicketHistoryPayload(entry)}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          )}
                        </TicketDetailSectionPanel>
                      </section>
                    </div>

                    {ticketDetailLookupKind ? (
                      <div
                        aria-modal="true"
                        className="incident-lookup-overlay"
                        role="dialog"
                      >
                        <section className="incident-lookup-dialog">
                          <header className="incident-lookup-header">
                            <div>
                              <h3>
                                {ticketDetailLookupKind === 'ASSIGNMENT_GROUP'
                                  ? 'Selectionner un groupe'
                                  : ticketDetailLookupKind === 'EQUIPMENT'
                                    ? 'Selectionner un equipement'
                                    : ticketDetailLookupKind === 'ASSIGNEE'
                                      ? 'Selectionner un technicien'
                                      : 'Selectionner un demandeur'}
                              </h3>
                            </div>

                            <button
                              aria-label="Fermer la selection"
                              className="incident-lookup-close"
                              onClick={closeTicketDetailLookup}
                              type="button"
                            >
                              <X size={18} />
                            </button>
                          </header>

                          <label className="incident-lookup-search">
                            <select
                              aria-label="Categorie de recherche"
                              onChange={(event) =>
                                setTicketDetailLookupSearchField(
                                  event.target
                                    .value as IncidentLookupSearchField,
                                )
                              }
                              value={ticketDetailLookupSearchField}
                            >
                              <option value="IDENTIFIER">Identifiant</option>
                              {ticketDetailLookupKind === 'ASSIGNMENT_GROUP' ? (
                                <option value="NAME">Nom</option>
                              ) : ticketDetailLookupKind === 'EQUIPMENT' ? (
                                <>
                                  <option value="NAME">Nom</option>
                                  <option value="TYPE">Type</option>
                                  <option value="STATUS">Statut</option>
                                  <option value="SERIAL_NUMBER">
                                    Numero de serie
                                  </option>
                                </>
                              ) : (
                                <>
                                  <option value="FIRST_NAME">Prenom</option>
                                  <option value="LAST_NAME">Nom</option>
                                </>
                              )}
                            </select>

                            <div className="incident-lookup-search-input">
                              <input
                                autoFocus
                                onChange={(event) =>
                                  setTicketDetailLookupSearch(
                                    event.target.value,
                                  )
                                }
                                placeholder="Rechercher"
                                value={ticketDetailLookupSearch}
                              />
                            </div>
                          </label>

                          <div className="incident-lookup-table-scroll">
                            <table
                              className={
                                ticketDetailLookupKind === 'ASSIGNMENT_GROUP' ||
                                ticketDetailLookupKind === 'EQUIPMENT'
                                  ? 'incident-lookup-table'
                                  : ticketDetailLookupKind === 'ASSIGNEE'
                                    ? 'incident-lookup-table incident-lookup-table--assignee'
                                    : 'incident-lookup-table incident-lookup-table--users'
                              }
                            >
                              <thead>
                                {ticketDetailLookupKind ===
                                'ASSIGNMENT_GROUP' ? (
                                  <tr>
                                    <th>Identifiant</th>
                                    <th>Nom</th>
                                    <th>Description</th>
                                  </tr>
                                ) : ticketDetailLookupKind === 'EQUIPMENT' ? (
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
                                    <th>Email</th>
                                  </tr>
                                )}
                              </thead>

                              <tbody>
                                {ticketDetailLookupKind ===
                                'ASSIGNMENT_GROUP' ? (
                                  paginatedTicketDetailLookupGroups.length ===
                                  0 ? (
                                    <tr>
                                      <td colSpan={3}>
                                        Aucun groupe ne correspond a la
                                        recherche.
                                      </td>
                                    </tr>
                                  ) : (
                                    paginatedTicketDetailLookupGroups.map(
                                      (group) => (
                                        <tr
                                          aria-selected={
                                            group.id ===
                                            selectedTicketDetailLookupGroupId
                                          }
                                          className={
                                            group.id ===
                                            selectedTicketDetailLookupGroupId
                                              ? 'incident-lookup-row is-selected'
                                              : 'incident-lookup-row'
                                          }
                                          key={group.id}
                                          onClick={() =>
                                            handleTicketDetailGroupLookupSelect(
                                              group,
                                            )
                                          }
                                          tabIndex={0}
                                          onKeyDown={(event) => {
                                            if (
                                              event.key === 'Enter' ||
                                              event.key === ' '
                                            ) {
                                              event.preventDefault();
                                              handleTicketDetailGroupLookupSelect(
                                                group,
                                              );
                                            }
                                          }}
                                        >
                                          <td className="incident-lookup-identity">
                                            {group.name}
                                          </td>
                                          <td>{group.name}</td>
                                          <td>{group.description ?? '-'}</td>
                                        </tr>
                                      ),
                                    )
                                  )
                                ) : ticketDetailLookupKind === 'EQUIPMENT' ? (
                                  paginatedTicketDetailLookupEquipment.length ===
                                  0 ? (
                                    <tr>
                                      <td colSpan={5}>
                                        Aucun equipement ne correspond a la
                                        recherche.
                                      </td>
                                    </tr>
                                  ) : (
                                    paginatedTicketDetailLookupEquipment.map(
                                      (ci) => {
                                        const ciType = ciTypesById.get(
                                          ci.ciTypeId,
                                        );

                                        return (
                                          <tr
                                            aria-selected={
                                              ci.id ===
                                              selectedTicketDetailLookupEquipmentId
                                            }
                                            className={
                                              ci.id ===
                                              selectedTicketDetailLookupEquipmentId
                                                ? 'incident-lookup-row is-selected'
                                                : 'incident-lookup-row'
                                            }
                                            key={ci.id}
                                            onClick={() =>
                                              handleTicketDetailEquipmentLookupSelect(
                                                ci,
                                              )
                                            }
                                            tabIndex={0}
                                            onKeyDown={(event) => {
                                              if (
                                                event.key === 'Enter' ||
                                                event.key === ' '
                                              ) {
                                                event.preventDefault();
                                                handleTicketDetailEquipmentLookupSelect(
                                                  ci,
                                                );
                                              }
                                            }}
                                          >
                                            <td className="incident-lookup-identity">
                                              {ci.name}
                                            </td>
                                            <td>{ci.name}</td>
                                            <td>
                                              {ciType?.name ?? 'Type inconnu'}
                                            </td>
                                            <td>{ci.status}</td>
                                            <td>{ci.serialNumber ?? '-'}</td>
                                          </tr>
                                        );
                                      },
                                    )
                                  )
                                ) : paginatedTicketDetailLookupUsers.length ===
                                  0 ? (
                                  <tr>
                                    <td colSpan={4}>
                                      Aucun utilisateur ne correspond a la
                                      recherche.
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedTicketDetailLookupUsers.map(
                                    (user) => (
                                      <tr
                                        aria-selected={
                                          user.id ===
                                          selectedTicketDetailLookupUserId
                                        }
                                        className={
                                          user.id ===
                                          selectedTicketDetailLookupUserId
                                            ? 'incident-lookup-row is-selected'
                                            : 'incident-lookup-row'
                                        }
                                        key={user.id}
                                        onClick={() =>
                                          handleTicketDetailLookupSelect(user)
                                        }
                                        tabIndex={0}
                                        onKeyDown={(event) => {
                                          if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                          ) {
                                            event.preventDefault();
                                            handleTicketDetailLookupSelect(
                                              user,
                                            );
                                          }
                                        }}
                                      >
                                        <td className="incident-lookup-identity">
                                          {formatKnownUserName(user, user.id)}
                                        </td>
                                        <td>
                                          {user.firstName ?? 'Non renseigne'}
                                        </td>
                                        <td>
                                          {user.lastName ?? 'Non renseigne'}
                                        </td>
                                        <td>{user.email ?? '-'}</td>
                                      </tr>
                                    ),
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>

                          <footer className="incident-lookup-pagination">
                            <span>
                              Page {ticketDetailLookupPage} sur{' '}
                              {ticketDetailLookupTotalPages} -{' '}
                              {ticketDetailLookupResultCount} resultat
                              {ticketDetailLookupResultCount > 1 ? 's' : ''}
                            </span>

                            <div>
                              <button
                                className="secondary-button incident-lookup-page-button"
                                disabled={ticketDetailLookupPage <= 1}
                                onClick={() =>
                                  setTicketDetailLookupPage((currentPage) =>
                                    Math.max(1, currentPage - 1),
                                  )
                                }
                                type="button"
                              >
                                Precedent
                              </button>

                              <span className="incident-lookup-current-page">
                                {ticketDetailLookupPage}
                              </span>

                              <button
                                className="secondary-button incident-lookup-page-button"
                                disabled={
                                  ticketDetailLookupPage >=
                                  ticketDetailLookupTotalPages
                                }
                                onClick={() =>
                                  setTicketDetailLookupPage((currentPage) =>
                                    Math.min(
                                      ticketDetailLookupTotalPages,
                                      currentPage + 1,
                                    ),
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
                    ) : null}

                    <div className="tdp-content tdp-legacy-content">
                      <div className="tdp-hero">
                        <h2 className="tdp-title">
                          {selectedTicketDetail.ticket.title}
                        </h2>

                        <div className="tdp-badges">
                          <span
                            className={`tdp-badge tdp-badge--status tdp-badge--${selectedTicketDetail.ticket.status.toLowerCase().replace(/_/g, '-')}`}
                          >
                            {translateTicketStatus(
                              selectedTicketDetail.ticket.status,
                            )}
                          </span>

                          <span className="tdp-badge tdp-badge--type">
                            {translateTicketType(
                              selectedTicketDetail.ticket.type,
                            )}
                          </span>

                          <span className="tdp-badge tdp-badge--priority">
                            {selectedTicketDetail.priorityName
                              ? translatePriority(
                                  selectedTicketDetail.priorityName,
                                )
                              : prioritiesById.get(
                                    selectedTicketDetail.ticket.priorityId,
                                  )
                                ? translatePriority(
                                    prioritiesById.get(
                                      selectedTicketDetail.ticket.priorityId,
                                    )!.name,
                                  )
                                : 'Priorité non définie'}
                          </span>

                          <span className="tdp-badge tdp-badge--date">
                            Créé le{' '}
                            {formatTicketDate(
                              selectedTicketDetail.ticket.createdAt,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="tdp-card">
                        <div className="tdp-card-header">
                          <h3 className="tdp-card-title">Description</h3>
                        </div>

                        <p className="tdp-description">
                          {selectedTicketDetail.ticket.description}
                        </p>
                      </div>

                      <div className="tdp-card">
                        <div className="tdp-card-header">
                          <h3 className="tdp-card-title">Informations</h3>

                          {!isEditingInfo &&
                          (canEditTicket || canManageTicket) ? (
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
                            <span>Catégorie</span>

                            {canEditTicket ? (
                              <select
                                onChange={(event) =>
                                  handleTicketEditFieldChange(
                                    'categoryId',
                                    event.target.value,
                                  )
                                }
                                value={ticketEditDraft.categoryId}
                              >
                                <option value="">Choisir une catégorie</option>

                                {catalog.categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <strong>
                                {categoriesById.get(
                                  selectedTicketDetail.ticket.categoryId,
                                )?.name ?? 'Non définie'}
                              </strong>
                            )}
                          </div>

                          <div className="tdp-info-item">
                            <span>Canal</span>

                            {canEditTicket ? (
                              <select
                                onChange={(event) =>
                                  handleTicketEditFieldChange(
                                    'channelId',
                                    event.target.value,
                                  )
                                }
                                value={ticketEditDraft.channelId}
                              >
                                <option value="">Non renseigné</option>

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
                                      channelsById.get(
                                        selectedTicketDetail.ticket.channelId,
                                      )?.name ??
                                        selectedTicketDetail.ticket.channelId,
                                    )
                                  : 'Non renseigné'}
                              </strong>
                            )}
                          </div>

                          <div className="tdp-info-item">
                            <span>Équipement concerné</span>

                            {canEditTicket ? (
                              <select
                                onChange={(event) =>
                                  handleTicketEditFieldChange(
                                    'ciId',
                                    event.target.value,
                                  )
                                }
                                value={ticketEditDraft.ciId}
                              >
                                <option value="">Non renseigné</option>

                                {catalog.cis.map((ci) => (
                                  <option key={ci.id} value={ci.id}>
                                    {ci.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <strong>
                                {selectedTicketDetail.ticket.ciId
                                  ? (cisById.get(
                                      selectedTicketDetail.ticket.ciId,
                                    )?.name ?? selectedTicketDetail.ticket.ciId)
                                  : 'Non renseigné'}
                              </strong>
                            )}
                          </div>

                          <div className="tdp-info-item">
                            <span>{"Groupe d'affectation"}</span>

                            {canManageTicket ? (
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
                                  ? (groupsById.get(
                                      selectedTicketDetail.ticket
                                        .assignmentGroupId,
                                    )?.name ??
                                    selectedTicketDetail.ticket
                                      .assignmentGroupId)
                                  : 'Non affecté'}
                              </strong>
                            )}
                          </div>

                          <div className="tdp-info-item">
                            <span>Agent assigné</span>

                            {canManageTicket ? (
                              <select
                                onChange={(event) =>
                                  handleAssignmentFieldChange(
                                    'assignedToUserId',
                                    event.target.value,
                                  )
                                }
                                value={assignmentDraft.assignedToUserId}
                              >
                                <option value="">Aucun technicien</option>

                                {assignableTechnicians.map((technician) => (
                                  <option
                                    key={technician.id}
                                    value={technician.id}
                                  >
                                    {formatKnownUserName(
                                      technician,
                                      technician.id,
                                    )}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <strong>
                                {selectedTicketDetail.ticket.assignedToUserId
                                  ? formatKnownUserName(
                                      usersById.get(
                                        selectedTicketDetail.ticket
                                          .assignedToUserId,
                                      ),
                                      selectedTicketDetail.ticket
                                        .assignedToUserId,
                                    )
                                  : 'aucun'}
                              </strong>
                            )}
                          </div>

                          {selectedTicketDetail.ticket.requestedForUserId ||
                          canEditTicket ? (
                            <div className="tdp-info-item">
                              <span>Demandeur</span>

                              {canEditTicket ? (
                                <select
                                  onChange={(event) =>
                                    handleTicketEditFieldChange(
                                      'requestedForUserId',
                                      event.target.value,
                                    )
                                  }
                                  value={ticketEditDraft.requestedForUserId}
                                >
                                  <option value="">Non renseigné</option>

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
                                    usersById.get(
                                      selectedTicketDetail.ticket
                                        .requestedForUserId!,
                                    ),
                                    selectedTicketDetail.ticket
                                      .requestedForUserId!,
                                  )}
                                </strong>
                              )}
                            </div>
                          ) : null}

                          {selectedTicketDetail.incident ? (
                            <>
                              <div className="tdp-info-item">
                                <span>Impact</span>
                                {canEditTicket ? (
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
                                    {translateIncidentSeverity(
                                      selectedTicketDetail.incident.impact,
                                    )}
                                  </strong>
                                )}
                              </div>

                              <div className="tdp-info-item">
                                <span>Urgence</span>
                                {canEditTicket ? (
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
                                    {translateIncidentSeverity(
                                      selectedTicketDetail.incident.urgency,
                                    )}
                                  </strong>
                                )}
                              </div>

                              {canEditTicket ? (
                                <div className="tdp-info-item tdp-info-item--full">
                                  <span>Cause racine</span>
                                  <textarea
                                    onChange={(event) =>
                                      handleTicketEditFieldChange(
                                        'rootCause',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Cause racine"
                                    rows={3}
                                    value={ticketEditDraft.rootCause}
                                  />
                                </div>
                              ) : selectedTicketDetail.incident.rootCause ? (
                                <div className="tdp-info-item tdp-info-item--full">
                                  <span>Cause racine</span>
                                  <strong>
                                    {selectedTicketDetail.incident.rootCause}
                                  </strong>
                                </div>
                              ) : null}

                              {canEditTicket ? (
                                <div className="tdp-info-item tdp-info-item--full">
                                  <span>Contournement</span>
                                  <textarea
                                    onChange={(event) =>
                                      handleTicketEditFieldChange(
                                        'workaround',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Contournement"
                                    rows={3}
                                    value={ticketEditDraft.workaround}
                                  />
                                </div>
                              ) : selectedTicketDetail.incident.workaround ? (
                                <div className="tdp-info-item tdp-info-item--full">
                                  <span>Contournement</span>
                                  <strong>
                                    {selectedTicketDetail.incident.workaround}
                                  </strong>
                                </div>
                              ) : null}
                            </>
                          ) : null}

                          {selectedTicketDetail.request ? (
                            <>
                              <div className="tdp-info-item">
                                <span>Type de demande</span>
                                <strong>
                                  {translateRequestType(
                                    selectedTicketDetail.request.requestType,
                                  )}
                                </strong>
                              </div>

                              <div className="tdp-info-item">
                                <span>Approbation</span>
                                <strong>
                                  {selectedTicketDetail.request
                                    .approvalStatus ?? 'Non d?finie'}
                                </strong>
                              </div>
                            </>
                          ) : null}
                        </div>

                        {detailActionErrorMessage ? (
                          <p className="tdp-form-error">
                            {detailActionErrorMessage}
                          </p>
                        ) : null}

                        {detailActionSuccessMessage ? (
                          <p className="tdp-form-success">
                            {detailActionSuccessMessage}
                          </p>
                        ) : null}
                      </div>

                      <div className="tdp-card">
                        <div className="tdp-card-header">
                          <h3 className="tdp-card-title">Historique</h3>
                          <span className="tdp-tab-count">
                            {selectedTicketHistory.length}
                          </span>
                        </div>

                        {isLoadingHistory ? (
                          <p className="tdp-state">
                            Chargement de l'historique...
                          </p>
                        ) : loadHistoryErrorMessage ? (
                          <p className="tdp-state tdp-state--error">
                            {loadHistoryErrorMessage}
                          </p>
                        ) : selectedTicketHistory.length === 0 ? (
                          <p className="tdp-empty">
                            Aucun evenement historise pour ce ticket.
                          </p>
                        ) : (
                          <div className="tdp-comment-thread">
                            {selectedTicketHistory.map((entry) => (
                              <div className="tdp-comment" key={entry.id}>
                                <div className="tdp-comment-avatar">
                                  {formatHistoryEventInitial(entry.eventType)}
                                </div>

                                <div className="tdp-comment-body">
                                  <div className="tdp-comment-header">
                                    <div className="tdp-history-heading">
                                      <strong>
                                        {formatTicketHistoryTitle(entry)}
                                      </strong>
                                      <span className="tdp-comment-badge">
                                        {formatKnownUserName(
                                          usersById.get(entry.actorUserId),
                                          entry.actorUserId,
                                        )}
                                      </span>
                                    </div>

                                    <span>
                                      {formatTicketDate(entry.createdAt)}
                                    </span>
                                  </div>

                                  <p className="tdp-comment-text">
                                    {formatTicketHistoryPayload(entry)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="tdp-card">
                        <div className="tdp-card-header">
                          <h3 className="tdp-card-title">Conversation</h3>
                          <span className="tdp-tab-count">
                            {seededTicketComments.length}
                          </span>
                        </div>

                        {isLoadingComments ? (
                          <p className="tdp-state">
                            Chargement des commentaires...
                          </p>
                        ) : loadCommentsErrorMessage ? (
                          <p className="tdp-state tdp-state--error">
                            {loadCommentsErrorMessage}
                          </p>
                        ) : seededTicketComments.length === 0 ? (
                          <p className="tdp-empty">
                            Aucun commentaire pour ce ticket.
                          </p>
                        ) : (
                          <div className="tdp-comment-thread">
                            {seededTicketComments.map((comment) => {
                              const canDeleteComment =
                                !comment.isSeedDescription &&
                                canDeleteTicketComment(
                                  session.user.role,
                                  session.user.id,
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
                                  <div className="tdp-comment-avatar">
                                    {initial}
                                  </div>

                                  <div className="tdp-comment-body">
                                    <div className="tdp-comment-header">
                                      <strong>
                                        {formatKnownUserName(
                                          usersById.get(comment.authorUserId),
                                          comment.authorUserId,
                                        )}
                                      </strong>

                                      <span>
                                        {formatTicketDate(comment.createdAt)}
                                      </span>

                                      <span
                                        className={
                                          comment.isInternal
                                            ? 'tdp-comment-badge tdp-comment-badge--internal'
                                            : 'tdp-comment-badge'
                                        }
                                      >
                                        {comment.isInternal
                                          ? 'Interne'
                                          : 'Public'}
                                      </span>

                                      {canDeleteComment ? (
                                        <button
                                          className="tdp-delete-btn"
                                          disabled={
                                            deletingCommentId === comment.id
                                          }
                                          onClick={() =>
                                            void handleDeleteComment(comment.id)
                                          }
                                          type="button"
                                        >
                                          {deletingCommentId === comment.id
                                            ? 'Suppression...'
                                            : 'Supprimer'}
                                        </button>
                                      ) : null}
                                    </div>

                                    <p className="tdp-comment-text">
                                      {comment.isSeedDescription ? (
                                        <>
                                          <strong>Description :</strong>
                                          <br />
                                          {comment.body}
                                        </>
                                      ) : (
                                        comment.body
                                      )}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {selectedTicketAttachments.length > 0 ? (
                          <div className="tdp-attachment-section">
                            <p className="tdp-subsection-label">
                              Pieces jointes ({selectedTicketAttachments.length}
                              )
                            </p>

                            {isLoadingAttachments ? (
                              <p className="tdp-state">
                                Chargement des pièces jointes...
                              </p>
                            ) : loadAttachmentsErrorMessage ? (
                              <p className="tdp-state tdp-state--error">
                                {loadAttachmentsErrorMessage}
                              </p>
                            ) : (
                              <div className="tdp-attachment-list">
                                {selectedTicketAttachments.map((attachment) => (
                                  <div
                                    className="tdp-attachment-item"
                                    key={attachment.id}
                                  >
                                    <div className="tdp-attachment-info">
                                      <button
                                        className="tdp-attachment-link"
                                        onClick={() =>
                                          void handleDownloadAttachment(
                                            attachment,
                                          )
                                        }
                                        type="button"
                                      >
                                        {attachment.fileName}
                                      </button>

                                      <span>
                                        Ajoute le{' '}
                                        {formatTicketDate(attachment.createdAt)}{' '}
                                        - {formatFileSize(attachment.sizeBytes)}
                                      </span>
                                    </div>

                                    <div className="tdp-attachment-actions">
                                      <button
                                        className="secondary-button"
                                        onClick={() =>
                                          void handleDownloadAttachment(
                                            attachment,
                                          )
                                        }
                                        type="button"
                                      >
                                        Télécharger
                                      </button>

                                      <button
                                        className="tdp-delete-btn"
                                        disabled={
                                          deletingAttachmentId === attachment.id
                                        }
                                        onClick={() =>
                                          void handleDeleteAttachment(
                                            attachment,
                                          )
                                        }
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
                            onSubmit={handleCommentSubmit}
                          >
                            <label className="field">
                              <span>Commentaire</span>

                              <textarea
                                className="tdp-reply-textarea"
                                onChange={(event) =>
                                  handleCommentBodyChange(event.target.value)
                                }
                                placeholder="Ajoute une note utile au traitement du ticket."
                                rows={4}
                                value={commentDraft.body}
                              />
                            </label>

                            <div className="tdp-reply-footer tdp-reply-footer--end">
                              <button
                                className="secondary-button"
                                disabled={isSubmittingComment}
                              >
                                {isSubmittingComment ? 'Envoi...' : 'Publier'}
                              </button>
                            </div>

                            {commentErrorMessage ? (
                              <p className="tdp-form-error">
                                {commentErrorMessage}
                              </p>
                            ) : null}

                            {commentSuccessMessage ? (
                              <p className="tdp-form-success">
                                {commentSuccessMessage}
                              </p>
                            ) : null}
                          </form>

                          <form
                            className="tdp-reply-attachment-form"
                            onSubmit={handleAttachmentSubmit}
                          >
                            <div className="field">
                              <span>Pièces jointes</span>

                              <div className="ticket-upload-zone tdp-upload-zone">
                                <div className="ticket-upload-actions">
                                  <label className="ticket-upload-button">
                                    Choisir des fichiers
                                    <input
                                      accept="*/*"
                                      key={attachmentInputKey}
                                      onChange={(event) =>
                                        handleAttachmentSelection(
                                          event.target.files,
                                        )
                                      }
                                      multiple
                                      type="file"
                                    />
                                  </label>

                                  <span className="ticket-upload-note">
                                    {formatSelectedFilesLabel(
                                      attachmentDraft.files.length,
                                    )}
                                  </span>
                                </div>

                                {attachmentDraft.files.length > 0 ? (
                                  <div className="ticket-file-list">
                                    {attachmentDraft.files.map((file) => {
                                      const fileKey = getLocalFileKey(file);

                                      return (
                                        <span
                                          className="ticket-file-chip"
                                          key={fileKey}
                                        >
                                          <span>
                                            {file.name} (
                                            {formatFileSize(file.size)})
                                          </span>
                                          <button
                                            aria-label={`Retirer ${file.name}`}
                                            onClick={() =>
                                              handleRemoveAttachmentDraftFile(
                                                fileKey,
                                              )
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

                                <div className="ticket-upload-note ticket-upload-note--stacked">
                                  <span>
                                    Formats acceptés : PDF, PNG, JPG, DOCX.
                                  </span>
                                  <span>2 Mo max par fichier.</span>
                                </div>
                              </div>
                            </div>

                            <div className="tdp-reply-footer tdp-reply-footer--end">
                              <button
                                className="secondary-button"
                                disabled={isSubmittingAttachment}
                              >
                                {isSubmittingAttachment
                                  ? 'Envoi...'
                                  : 'Joindre'}
                              </button>
                            </div>

                            {attachmentErrorMessage ? (
                              <p className="tdp-form-error">
                                {attachmentErrorMessage}
                              </p>
                            ) : null}

                            {attachmentSuccessMessage ? (
                              <p className="tdp-form-success">
                                {attachmentSuccessMessage}
                              </p>
                            ) : null}
                          </form>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </aside>
            ) : null}
          </section>
        ) : null}
      </section>
    </section>
  );
}
