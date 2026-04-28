import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeAlert,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

import type { UserRole } from '../../domain/auth/user-role';

import {
  translateChannel,
  translateIncidentSeverity,
  translatePriority,
  translateRequestType,
  translateTicketStatus,
  translateTicketType,
} from '../../domain/i18n/ticketing-labels';

import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';

import type { CreatedIncidentSnapshot } from '../../domain/ticketing/created-incident';

import type { CreatedRequestSnapshot } from '../../domain/ticketing/created-request';

import {
  INCIDENT_SEVERITIES,
  type IncidentSeverity,
} from '../../domain/ticketing/incident-severity';

import type { TicketCommentSnapshot } from '../../domain/ticketing/ticket-comment';
import type { TicketAttachmentSnapshot } from '../../domain/ticketing/ticket-attachment';
import type { TicketDetailSnapshot } from '../../domain/ticketing/ticket-detail';

import {
  REQUEST_TYPES,
  type RequestType,
} from '../../domain/ticketing/request-type';

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

type AgentPageProps = {
  section:
    | 'ARCHIVES'
    | 'ARCHIVE_DETAIL'
    | 'ASSIGNED_TO_ME'
    | 'INCIDENT_CREATE'
    | 'MY_TICKETS'
    | 'REQUEST_CREATE'
    | 'UNASSIGNED_TICKETS'
    | 'LIST'
    | 'DETAIL';
  session: AuthSessionSnapshot;
  ticketId?: string;
};

type TicketMode = 'INCIDENT' | 'REQUEST';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';

type IncidentLookupKind = 'ASSIGNEE' | 'REQUESTER';

type IncidentLookupSearchField =
  | 'IDENTIFIER'
  | 'FIRST_NAME'
  | 'LAST_NAME'
  | 'GROUP'
  | 'SERVICE';

type TicketListSearchField = 'TITLE' | 'REQUESTER' | 'TECHNICIAN';

type IncidentDraftState = {
  assignedToUserId: string;

  categoryId: string;

  channelId: string;

  ciId: string;

  comment: string;

  description: string;

  impact: IncidentSeverity;

  requestedForUserId: string;

  serviceId: string;

  title: string;

  urgency: IncidentSeverity;
};

type RequestDraftState = {
  categoryId: string;

  channelId: string;

  ciId: string;

  description: string;

  priorityId: string;

  requestType: RequestType;

  serviceId: string;

  title: string;
};

type AssignmentDraftState = {
  assignedToUserId: string;

  assignmentGroupId: string;
};

type TicketEditDraftState = {
  categoryId: string;
  channelId: string;
  ciId: string;
  description: string;
  impact: IncidentSeverity;
  requestedForUserId: string;
  rootCause: string;
  serviceId: string;
  title: string;
  urgency: IncidentSeverity;
  workaround: string;
};

type CommentDraftState = {
  body: string;

  isInternal: boolean;
};

type AttachmentDraftState = {
  file: File | null;
};

type IncidentValidationErrors = Partial<
  Record<keyof IncidentDraftState, string>
>;

type RequestValidationErrors = Partial<Record<keyof RequestDraftState, string>>;

type TicketSearchFiltersState = {
  categoryId: string;

  priorityId: string;

  q: string;

  searchField: TicketListSearchField;

  sortBy: 'CREATED_AT_ASC' | 'CREATED_AT_DESC' | 'OPERATIONAL_PRIORITY';

  status: '' | TicketStatus;

  type: '' | TicketMode;
};

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],

  channels: [],

  cis: [],

  ciTypes: [],

  groups: [],

  priorities: [],

  services: [],
};

const INITIAL_INCIDENT_DRAFT: IncidentDraftState = {
  assignedToUserId: '',

  categoryId: '',

  channelId: '',

  ciId: '',

  comment: '',

  description: '',

  impact: 'MEDIUM',

  requestedForUserId: '',

  serviceId: '',

  title: '',

  urgency: 'MEDIUM',
};

const INITIAL_REQUEST_DRAFT: RequestDraftState = {
  categoryId: '',

  channelId: '',

  ciId: '',

  description: '',

  priorityId: '',

  requestType: 'OTHER',

  serviceId: '',

  title: '',
};

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
  requestedForUserId: '',
  rootCause: '',
  serviceId: '',
  title: '',
  urgency: 'MEDIUM',
  workaround: '',
};

const INITIAL_COMMENT_DRAFT: CommentDraftState = {
  body: '',

  isInternal: false,
};

const INITIAL_ATTACHMENT_DRAFT: AttachmentDraftState = {
  file: null,
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

  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<
    Record<string, string>
  >({});

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

        setIncidentDraft((currentDraft) => ({
          ...currentDraft,

          categoryId:
            currentDraft.categoryId || nextCatalog.categories[0]?.id || '',

          channelId:
            currentDraft.channelId || nextCatalog.channels[0]?.id || '',

          ciId: currentDraft.ciId || nextCatalog.cis[0]?.id || '',

          serviceId:
            currentDraft.serviceId || nextCatalog.services[0]?.id || '',
        }));

        setRequestDraft((currentDraft) => ({
          ...currentDraft,

          categoryId:
            currentDraft.categoryId || nextCatalog.categories[0]?.id || '',

          channelId:
            currentDraft.channelId || nextCatalog.channels[0]?.id || '',

          ciId: currentDraft.ciId || nextCatalog.cis[0]?.id || '',

          priorityId:
            currentDraft.priorityId || nextCatalog.priorities[0]?.id || '',

          serviceId:
            currentDraft.serviceId || nextCatalog.services[0]?.id || '',
        }));
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
  }, [incidentLookupKind, incidentLookupSearch]);

  useEffect(() => {
    if (!showIncidentAdvancedFields) {
      return;
    }

    setIncidentDraft((currentDraft) => {
      if (currentDraft.requestedForUserId.trim()) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        requestedForUserId: session.user.id,
      };
    });
  }, [session.user.id, showIncidentAdvancedFields]);

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

      setAttachmentPreviewUrls({});

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
          serviceId: nextTicket.ticket.serviceId ?? '',
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
    const imageAttachments = selectedTicketAttachments.filter((attachment) =>
      attachment.mimeType?.startsWith('image/'),
    );

    if (imageAttachments.length === 0) {
      setAttachmentPreviewUrls((currentUrls) => {
        Object.values(currentUrls).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }

    let cancelled = false;
    const createdUrls: string[] = [];

    async function loadAttachmentPreviews(): Promise<void> {
      try {
        const nextEntries = await Promise.all(
          imageAttachments.map(async (attachment) => {
            const blob = await downloadTicketAttachmentBinary(
              session.accessToken,
              attachment.bucketId,
              attachment.storagePath,
            );
            const objectUrl = URL.createObjectURL(blob);
            createdUrls.push(objectUrl);

            return [attachment.id, objectUrl] as const;
          }),
        );

        if (cancelled) {
          createdUrls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }

        setAttachmentPreviewUrls((currentUrls) => {
          Object.values(currentUrls).forEach((url) => URL.revokeObjectURL(url));
          return Object.fromEntries(nextEntries);
        });
      } catch {
        if (!cancelled) {
          setAttachmentPreviewUrls((currentUrls) => {
            Object.values(currentUrls).forEach((url) =>
              URL.revokeObjectURL(url),
            );
            return {};
          });
        }
      }
    }

    void loadAttachmentPreviews();

    return () => {
      cancelled = true;
    };
  }, [selectedTicketAttachments, session.accessToken]);

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

  const servicesById = useMemo(
    () => new Map(catalog.services.map((service) => [service.id, service])),

    [catalog.services],
  );

  const cisById = useMemo(
    () => new Map(catalog.cis.map((ci) => [ci.id, ci])),

    [catalog.cis],
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

  const incidentLookupSource =
    incidentLookupKind === 'ASSIGNEE' ? technicians : requesters;
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
  const incidentLookupTotalPages = Math.max(
    1,
    Math.ceil(filteredIncidentLookupUsers.length / INCIDENT_LOOKUP_PAGE_SIZE),
  );
  const paginatedIncidentLookupUsers = filteredIncidentLookupUsers.slice(
    (incidentLookupPage - 1) * INCIDENT_LOOKUP_PAGE_SIZE,
    incidentLookupPage * INCIDENT_LOOKUP_PAGE_SIZE,
  );
  const selectedIncidentTechnician = usersById.get(
    incidentDraft.assignedToUserId,
  );
  const selectedIncidentRequester = usersById.get(
    incidentDraft.requestedForUserId,
  );
  const selectedIncidentLookupUserId =
    incidentLookupKind === 'ASSIGNEE'
      ? incidentDraft.assignedToUserId
      : incidentLookupKind === 'REQUESTER'
        ? incidentDraft.requestedForUserId
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
    setIncidentDraft((currentDraft) => ({
      ...currentDraft,

      [field]: value,
    }));

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
    setRequestDraft((currentDraft) => ({
      ...currentDraft,

      [field]: value,
    }));

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
    const source = kind === 'ASSIGNEE' ? technicians : requesters;
    const selectedUserId =
      kind === 'ASSIGNEE'
        ? incidentDraft.assignedToUserId
        : incidentDraft.requestedForUserId;
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
      handleIncidentFieldChange('assignedToUserId', user.id);
    }

    if (incidentLookupKind === 'REQUESTER') {
      handleIncidentFieldChange('requestedForUserId', user.id);
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
        const result = await createIncident(session.accessToken, {
          categoryId: incidentDraft.categoryId.trim(),

          channelId: normalizeOptionalId(incidentDraft.channelId),

          ciId: normalizeOptionalId(incidentDraft.ciId),

          description: incidentDraft.description.trim(),

          impact: incidentDraft.impact,

          requestedForUserId: showIncidentAdvancedFields
            ? (normalizeOptionalId(incidentDraft.requestedForUserId) ??
              session.user.id)
            : null,

          serviceId: normalizeOptionalId(incidentDraft.serviceId),

          title: incidentDraft.title.trim(),

          urgency: incidentDraft.urgency,
        });

        const postCreationWarnings: string[] = [];
        let ticketForList: TicketSummarySnapshot = {
          ...result.ticket,
          priorityName: result.priorityName,
        };

        if (
          showIncidentAdvancedFields &&
          incidentDraft.assignedToUserId.trim()
        ) {
          const selectedTechnician = usersById.get(
            incidentDraft.assignedToUserId,
          );

          try {
            const updatedTicket = await assignTicket(
              session.accessToken,
              result.ticket.id,
              {
                assignedToUserId: incidentDraft.assignedToUserId.trim(),
                assignmentGroupId: selectedTechnician?.groupId ?? null,
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
      const result = await createRequest(session.accessToken, {
        categoryId: requestDraft.categoryId.trim(),

        channelId: normalizeOptionalId(requestDraft.channelId),

        ciId: normalizeOptionalId(requestDraft.ciId),

        description: requestDraft.description.trim(),

        priorityId: requestDraft.priorityId.trim(),

        requestType: requestDraft.requestType,

        serviceId: normalizeOptionalId(requestDraft.serviceId),

        title: requestDraft.title.trim(),
      });

      setCreatedRequest(result);

      setSelectedTicketId(result.ticket.id);

      setSearchFilters((currentFilters) => ({
        ...currentFilters,

        type: 'REQUEST',
      }));

      setTickets((currentTickets) => [
        {
          ...result.ticket,

          priorityName: result.priorityName,
        },

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
      }));

      if (attachmentUploadErrorMessage) {
        setSubmitErrorMessage(attachmentUploadErrorMessage);
      } else {
        resetCreationAttachmentSelection('REQUEST');
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
            serviceId: normalizeOptionalId(ticketEditDraft.serviceId),
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
          serviceId: updatedTicket.ticket.serviceId ?? '',
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
                  serviceId: updatedTicket.ticket.serviceId,
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
        serviceId: selectedTicketDetail.ticket.serviceId ?? '',
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
      setAttachmentPreviewUrls((currentUrls) => {
        const nextUrls = { ...currentUrls };
        const previewUrl = nextUrls[attachment.id];

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          delete nextUrls[attachment.id];
        }

        return nextUrls;
      });

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
                  <label className="field ticket-form-span-2">
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
                          ? 'Ex. : VPN inaccessible pour l agence Nord'
                          : 'Ex. : Demande d acces VPN pour l agence Nord'
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

                  <label className="field ticket-form-span-2">
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

                  <label className="field">
                    <span>Categorie</span>

                    <select
                      onChange={(event) =>
                        mode === 'INCIDENT'
                          ? handleIncidentFieldChange(
                              'categoryId',

                              event.target.value,
                            )
                          : handleRequestFieldChange(
                              'categoryId',
                              event.target.value,
                            )
                      }
                      value={
                        mode === 'INCIDENT'
                          ? incidentDraft.categoryId
                          : requestDraft.categoryId
                      }
                    >
                      <option value="">Choisir une categorie</option>

                      {catalog.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Canal</span>

                    <select
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
                      <option value="">Choisir un canal</option>

                      {catalog.channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {translateChannel(channel.name)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Service</span>

                    <select
                      onChange={(event) =>
                        mode === 'INCIDENT'
                          ? handleIncidentFieldChange(
                              'serviceId',
                              event.target.value,
                            )
                          : handleRequestFieldChange(
                              'serviceId',
                              event.target.value,
                            )
                      }
                      value={
                        mode === 'INCIDENT'
                          ? incidentDraft.serviceId
                          : requestDraft.serviceId
                      }
                    >
                      <option value="">Choisir un service</option>

                      {catalog.services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Equipement concerne</span>

                    <select
                      onChange={(event) =>
                        mode === 'INCIDENT'
                          ? handleIncidentFieldChange(
                              'ciId',
                              event.target.value,
                            )
                          : handleRequestFieldChange('ciId', event.target.value)
                      }
                      value={
                        mode === 'INCIDENT'
                          ? incidentDraft.ciId
                          : requestDraft.ciId
                      }
                    >
                      <option value="">Choisir un equipement</option>

                      {catalog.cis.map((ci) => (
                        <option key={ci.id} value={ci.id}>
                          {ci.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {mode === 'INCIDENT' ? (
                    <>
                      <label className="field">
                        <span>Impact</span>

                        <select
                          onChange={(event) =>
                            handleIncidentFieldChange(
                              'impact',
                              event.target.value,
                            )
                          }
                          value={incidentDraft.impact}
                        >
                          {INCIDENT_SEVERITIES.map((severity) => (
                            <option key={severity} value={severity}>
                              {translateIncidentSeverity(severity)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Urgence</span>

                        <select
                          onChange={(event) =>
                            handleIncidentFieldChange(
                              'urgency',
                              event.target.value,
                            )
                          }
                          value={incidentDraft.urgency}
                        >
                          {INCIDENT_SEVERITIES.map((severity) => (
                            <option key={severity} value={severity}>
                              {translateIncidentSeverity(severity)}
                            </option>
                          ))}
                        </select>
                      </label>

                      {showIncidentAdvancedFields ? (
                        <>
                          <label className="field">
                            <span>Assigne a</span>

                            <div
                              className={
                                incidentDraft.assignedToUserId
                                  ? 'incident-lookup-field has-clear'
                                  : 'incident-lookup-field'
                              }
                            >
                              <input
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

                          <label className="field">
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

                          <label className="field ticket-form-span-2">
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
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label className="field">
                        <span>Priorite</span>

                        <select
                          onChange={(event) =>
                            handleRequestFieldChange(
                              'priorityId',
                              event.target.value,
                            )
                          }
                          value={requestDraft.priorityId}
                        >
                          <option value="">Choisir une priorite</option>

                          {catalog.priorities.map((priority) => (
                            <option key={priority.id} value={priority.id}>
                              {translatePriority(priority.name)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Type de demande</span>

                        <select
                          onChange={(event) =>
                            handleRequestFieldChange(
                              'requestType',

                              event.target.value,
                            )
                          }
                          value={requestDraft.requestType}
                        >
                          {REQUEST_TYPES.map((requestType) => (
                            <option key={requestType} value={requestType}>
                              {translateRequestType(requestType)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}

                  <div className="field ticket-form-span-2">
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

                  <div className="ticket-form-actions ticket-form-span-2">
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
                    <p className="ticket-form-error ticket-form-span-2">
                      {submitErrorMessage}
                    </p>
                  ) : null}
                </form>

                {showIncidentAdvancedFields && incidentLookupKind ? (
                  <div
                    aria-modal="true"
                    className="incident-lookup-overlay"
                    role="dialog"
                  >
                    <section className="incident-lookup-dialog">
                      <header className="incident-lookup-header">
                        <div>
                          <h3>
                            {incidentLookupKind === 'ASSIGNEE'
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
                          <option value="FIRST_NAME">Prenom</option>
                          <option value="LAST_NAME">Nom</option>
                          {incidentLookupKind === 'ASSIGNEE' ? (
                            <>
                              <option value="GROUP">Groupe</option>
                              <option value="SERVICE">Service</option>
                            </>
                          ) : null}
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
                        <table className="incident-lookup-table">
                          <thead>
                            <tr>
                              <th>Identifiant</th>
                              <th>Prenom</th>
                              <th>Nom</th>
                              <th>Mail</th>
                              {incidentLookupKind === 'ASSIGNEE' ? (
                                <>
                                  <th>Groupe</th>
                                  <th>Service</th>
                                </>
                              ) : null}
                            </tr>
                          </thead>

                          <tbody>
                            {paginatedIncidentLookupUsers.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={
                                    incidentLookupKind === 'ASSIGNEE' ? 6 : 4
                                  }
                                >
                                  Aucun utilisateur ne correspond a la
                                  recherche.
                                </td>
                              </tr>
                            ) : (
                              paginatedIncidentLookupUsers.map((user) => {
                                const group = user.groupId
                                  ? groupsById.get(user.groupId)
                                  : null;

                                return (
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
                                    {incidentLookupKind === 'ASSIGNEE' ? (
                                      <>
                                        <td>{group?.name ?? 'Non assigne'}</td>
                                        <td>Non defini</td>
                                      </>
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
                          Page {incidentLookupPage} sur{' '}
                          {incidentLookupTotalPages} -{' '}
                          {filteredIncidentLookupUsers.length} resultat
                          {filteredIncidentLookupUsers.length > 1 ? 's' : ''}
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
                              <th>Entité</th>
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
                                <td>
                                  {ticket.serviceId
                                    ? (servicesById.get(ticket.serviceId)
                                        ?.name ?? ticket.serviceId)
                                    : 'Service non défini'}
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
                                    : 'Non assigné'}
                                </td>
                                <td>
                                  {categoriesById.get(ticket.categoryId)
                                    ?.name ?? 'Non définie'}
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
                  <button
                    className="tdp-back-btn"
                    onClick={() => navigateTo(detailBackPath)}
                    type="button"
                  >
                    <ArrowLeft size={15} />
                    Retour à la liste
                  </button>

                  <div className="tdp-topbar-right">
                    {selectedTicketDetail ? (
                      <span className="tdp-ticket-number">
                        {selectedTicketDetail.ticket.number}
                      </span>
                    ) : null}
                    {selectedTicketDetail && canManageTicket ? (
                      <form
                        className="tdp-status-form"
                        onSubmit={handleStatusSubmit}
                      >
                        <select
                          onChange={(event) =>
                            setStatusDraft(
                              asTicketStatus(event.target.value) ?? 'OPEN',
                            )
                          }
                          value={statusDraft}
                        >
                          <option value="OPEN">Nouveau</option>
                          <option value="IN_PROGRESS">En cours</option>
                          <option value="PENDING">En attente</option>
                          <option value="RESOLVED">Résolu</option>
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
                    <div className="tdp-hero">
                      {isEditingInfo && canEditTicket ? (
                        <input
                          className="tdp-title-edit"
                          onChange={(event) =>
                            handleTicketEditFieldChange(
                              'title',
                              event.target.value,
                            )
                          }
                          value={ticketEditDraft.title}
                        />
                      ) : (
                        <h2 className="tdp-title">
                          {selectedTicketDetail.ticket.title}
                        </h2>
                      )}

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

                      {isEditingInfo && canEditTicket ? (
                        <textarea
                          className="tdp-description-edit"
                          onChange={(event) =>
                            handleTicketEditFieldChange(
                              'description',
                              event.target.value,
                            )
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

                          {isEditingInfo && canEditTicket ? (
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

                          {isEditingInfo && canEditTicket ? (
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
                          <span>Service</span>

                          {isEditingInfo && canEditTicket ? (
                            <select
                              onChange={(event) =>
                                handleTicketEditFieldChange(
                                  'serviceId',
                                  event.target.value,
                                )
                              }
                              value={ticketEditDraft.serviceId}
                            >
                              <option value="">Non renseigné</option>

                              {catalog.services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <strong>
                              {selectedTicketDetail.ticket.serviceId
                                ? (servicesById.get(
                                    selectedTicketDetail.ticket.serviceId,
                                  )?.name ??
                                  selectedTicketDetail.ticket.serviceId)
                                : 'Non renseigné'}
                            </strong>
                          )}
                        </div>

                        <div className="tdp-info-item">
                          <span>Équipement concerné</span>

                          {isEditingInfo && canEditTicket ? (
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
                                ? (cisById.get(selectedTicketDetail.ticket.ciId)
                                    ?.name ?? selectedTicketDetail.ticket.ciId)
                                : 'Non renseigné'}
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
                                ? (groupsById.get(
                                    selectedTicketDetail.ticket
                                      .assignmentGroupId,
                                  )?.name ??
                                  selectedTicketDetail.ticket.assignmentGroupId)
                                : 'Non affecté'}
                            </strong>
                          )}
                        </div>

                        <div className="tdp-info-item">
                          <span>Agent assigné</span>

                          {isEditingInfo && canManageTicket ? (
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
                                : 'Non assigné'}
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
                                  {translateIncidentSeverity(
                                    selectedTicketDetail.incident.impact,
                                  )}
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
                                  {translateIncidentSeverity(
                                    selectedTicketDetail.incident.urgency,
                                  )}
                                </strong>
                              )}
                            </div>

                            {isEditingInfo && canEditTicket ? (
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

                            {isEditingInfo && canEditTicket ? (
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
                                {selectedTicketDetail.request.approvalStatus ??
                                  'Non d?finie'}
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
                        <h3 className="tdp-card-title">Conversation</h3>
                        <span className="tdp-tab-count">
                          {selectedTicketComments.length}
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
                      ) : selectedTicketComments.length === 0 ? (
                        <p className="tdp-empty">
                          Aucun commentaire pour ce ticket.
                        </p>
                      ) : (
                        <div className="tdp-comment-thread">
                          {selectedTicketComments.map((comment) => {
                            const canDeleteComment = canDeleteTicketComment(
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
                                    {comment.body}
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
                            Pièces jointes ({selectedTicketAttachments.length})
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
                                    <strong>{attachment.fileName}</strong>

                                    <span>
                                      Ajouté le{' '}
                                      {formatTicketDate(attachment.createdAt)} ·{' '}
                                      {formatFileSize(attachment.sizeBytes)}
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
                                        void handleDeleteAttachment(attachment)
                                      }
                                      type="button"
                                    >
                                      {deletingAttachmentId === attachment.id
                                        ? 'Suppression...'
                                        : 'Supprimer'}
                                    </button>
                                  </div>

                                  {attachment.mimeType?.startsWith('image/') &&
                                  attachmentPreviewUrls[attachment.id] ? (
                                    <img
                                      alt={attachment.fileName}
                                      className="ticket-attachment-preview"
                                      src={attachmentPreviewUrls[attachment.id]}
                                    />
                                  ) : null}
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
                          <textarea
                            className="tdp-reply-textarea"
                            onChange={(event) =>
                              handleCommentBodyChange(event.target.value)
                            }
                            placeholder="Rédigez votre commentaire..."
                            rows={3}
                            value={commentDraft.body}
                          />

                          <div className="tdp-reply-footer">
                            {canCreateInternalComments ? (
                              <label className="tdp-toggle">
                                <input
                                  checked={commentDraft.isInternal}
                                  onChange={(event) =>
                                    handleCommentInternalToggle(
                                      event.target.checked,
                                    )
                                  }
                                  type="checkbox"
                                />
                                <span>Note interne</span>
                              </label>
                            ) : (
                              <span className="tdp-form-hint">
                                Les notes internes sont réservées aux agents et
                                admins.
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
                          <label className="tdp-file-zone">
                            <input
                              accept="*/*"
                              key={attachmentInputKey}
                              onChange={(event) =>
                                handleAttachmentSelection(
                                  event.target.files?.[0] ?? null,
                                )
                              }
                              type="file"
                            />

                            <span className="tdp-file-zone-hint">
                              {attachmentDraft.file
                                ? `${attachmentDraft.file.name} (${formatFileSize(attachmentDraft.file.size)})`
                                : 'Glissez un fichier ici ou cliquez pour sélectionner'}
                            </span>

                            <span className="tdp-form-hint">
                              Formats acceptés : PDF, PNG, JPG, DOCX. 2 Mo max
                              par fichier.
                            </span>
                          </label>

                          <div className="tdp-reply-footer">
                            <span />

                            <button
                              className="secondary-button"
                              disabled={isSubmittingAttachment}
                            >
                              {isSubmittingAttachment ? 'Envoi...' : 'Joindre'}
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

  if (!draft.categoryId.trim()) {
    errors.categoryId = 'La categorie est obligatoire.';
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
    case 'SERVICE':
      return 'Non defini';
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
