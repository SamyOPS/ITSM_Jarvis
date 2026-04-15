import { type FormEvent, useEffect, useMemo, useState } from 'react';

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
  uploadTicketAttachmentBinary,
} from '../../infrastructure/api/ticketing-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';

type AgentPageProps = {
  section: 'INCIDENT_CREATE' | 'REQUEST_CREATE' | 'LIST' | 'DETAIL';
  session: AuthSessionSnapshot;
  ticketId?: string;
};

type TicketMode = 'INCIDENT' | 'REQUEST';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

type DetailWorkspaceTab = 'COMMENTS' | 'ATTACHMENTS';

type IncidentDraftState = {
  categoryId: string;

  channelId: string;

  ciId: string;

  description: string;

  impact: IncidentSeverity;

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
  categoryId: '',

  channelId: '',

  ciId: '',

  description: '',

  impact: 'MEDIUM',

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

  status: '',

  type: '',
};

const INITIAL_ASSIGNMENT_DRAFT: AssignmentDraftState = {
  assignedToUserId: '',

  assignmentGroupId: '',
};

const INITIAL_COMMENT_DRAFT: CommentDraftState = {
  body: '',

  isInternal: false,
};

const INITIAL_ATTACHMENT_DRAFT: AttachmentDraftState = {
  file: null,
};

const TICKET_ATTACHMENTS_BUCKET_ID = 'ticket-attachments';
const TICKETS_PER_PAGE = 10;

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

  const [commentDraft, setCommentDraft] = useState<CommentDraftState>(
    INITIAL_COMMENT_DRAFT,
  );

  const [attachmentDraft, setAttachmentDraft] = useState<AttachmentDraftState>(
    INITIAL_ATTACHMENT_DRAFT,
  );

  const [statusDraft, setStatusDraft] = useState<TicketStatus>('OPEN');

  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

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

  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<
    Record<string, string>
  >({});

  const [detailWorkspaceTab, setDetailWorkspaceTab] =
    useState<DetailWorkspaceTab>('COMMENTS');

  const [tickets, setTickets] = useState<TicketSummarySnapshot[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [userDirectory, setUserDirectory] = useState<AdminUserSummary[]>([]);

  const [incidentValidationErrors, setIncidentValidationErrors] =
    useState<IncidentValidationErrors>({});

  const [requestValidationErrors, setRequestValidationErrors] =
    useState<RequestValidationErrors>({});

  const canManageTicket = canManageTicketActions(session.user.role);

  const canCreateInternalComments = canCreateInternalTicketComments(
    session.user.role,
  );

  const isIncidentCreatePage = section === 'INCIDENT_CREATE';
  const isRequestCreatePage = section === 'REQUEST_CREATE';
  const isListPage = section === 'LIST';
  const isDetailPage = section === 'DETAIL';
  const showCreationPanel = isIncidentCreatePage || isRequestCreatePage;
  const showListPanel = isListPage;
  const showDetailPanel = isDetailPage;
  const totalTicketPages = Math.max(
    1,
    Math.ceil(tickets.length / TICKETS_PER_PAGE),
  );
  const paginatedTickets = useMemo(() => {
    const startIndex = (ticketPage - 1) * TICKETS_PER_PAGE;
    return tickets.slice(startIndex, startIndex + TICKETS_PER_PAGE);
  }, [ticketPage, tickets]);

  useEffect(() => {
    if (isDetailPage) {
      setSelectedTicketId(ticketId ?? null);
      return;
    }

    setSelectedTicketId(null);
  }, [isDetailPage, ticketId]);

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
    searchFilters.status,
    searchFilters.type,
  ]);

  useEffect(() => {
    if (!isListPage) {
      return;
    }

    if (ticketPage > totalTicketPages) {
      setTicketPage(totalTicketPages);
    }
  }, [isListPage, ticketPage, totalTicketPages]);

  useEffect(() => {
    if (!isListPage) {
      return;
    }

    if (!selectedTicketId) {
      return;
    }

    const selectedIndex = tickets.findIndex(
      (ticket) => ticket.id === selectedTicketId,
    );

    if (selectedIndex === -1) {
      return;
    }

    const nextPage = Math.floor(selectedIndex / TICKETS_PER_PAGE) + 1;

    if (nextPage !== ticketPage) {
      setTicketPage(nextPage);
    }
  }, [isListPage, selectedTicketId, ticketPage, tickets]);

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
    if (!isListPage) {
      return;
    }

    let cancelled = false;

    async function loadTickets(): Promise<void> {
      setIsLoadingTickets(true);

      setLoadTicketsErrorMessage(null);

      try {
        const nextTickets = await searchTickets(session.accessToken, {
          categoryId: normalizeOptionalId(searchFilters.categoryId),

          priorityId: normalizeOptionalId(searchFilters.priorityId),

          q: normalizeOptionalSearch(searchFilters.q),

          status: searchFilters.status || null,

          type: searchFilters.type || null,
        });

        if (cancelled) {
          return;
        }

        setTickets(nextTickets);

        if (
          selectedTicketId &&
          !nextTickets.some((ticket) => ticket.id === selectedTicketId)
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
    isListPage,
    searchFilters.categoryId,

    searchFilters.priorityId,

    searchFilters.q,

    searchFilters.status,

    searchFilters.type,

    selectedTicketId,

    session.accessToken,
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

  const usersById = useMemo(
    () => new Map(userDirectory.map((user) => [user.id, user])),
    [userDirectory],
  );

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

  function handleAssignmentFieldChange(
    field: keyof AssignmentDraftState,

    value: string,
  ): void {
    setAssignmentDraft((currentDraft) => ({
      ...currentDraft,

      [field]: value,
    }));

    setDetailActionErrorMessage(null);

    setDetailActionSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

          serviceId: normalizeOptionalId(incidentDraft.serviceId),

          title: incidentDraft.title.trim(),

          urgency: incidentDraft.urgency,
        });

        setCreatedIncident(result);

        setSelectedTicketId(result.ticket.id);

        setSearchFilters((currentFilters) => ({
          ...currentFilters,

          type: 'INCIDENT',
        }));

        setTickets((currentTickets) => [
          {
            ...result.ticket,

            priorityName: result.priorityName,
          },

          ...currentTickets.filter((ticket) => ticket.id !== result.ticket.id),
        ]);

        setIncidentDraft((currentDraft) => ({
          ...currentDraft,

          description: '',

          title: '',
        }));
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

      setRequestDraft((currentDraft) => ({
        ...currentDraft,

        description: '',

        title: '',
      }));
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

  async function handleAssignmentSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedTicketDetail) {
      return;
    }

    setIsSubmittingAssignment(true);

    setDetailActionErrorMessage(null);

    setDetailActionSuccessMessage(null);

    try {
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

      setDetailActionSuccessMessage('Assignation mise a jour.');
    } catch (error) {
      setDetailActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la mise a jour de l assignation',
      );
    } finally {
      setIsSubmittingAssignment(false);
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
      setDetailWorkspaceTab('COMMENTS');
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
      setDetailWorkspaceTab('ATTACHMENTS');
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
      setDetailWorkspaceTab('ATTACHMENTS');
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
                    <h3>Liste des tickets</h3>

                    <p>
                      Vue compacte des tickets avec les colonnes principales de
                      suivi.
                    </p>
                  </div>

                  <div className="ticket-list-meta">
                    <span>Resultats</span>

                    <strong>{tickets.length}</strong>
                  </div>
                </div>

                <div className="ticket-list-filters">
                  <label className="field ticket-filter-search">
                    <span>Recherche</span>

                    <input
                      onChange={(event) =>
                        handleSearchFilterChange('q', event.target.value)
                      }
                      placeholder="Numero, titre ou description"
                      value={searchFilters.q}
                    />
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

                      <option value="OPEN">Ouvert</option>

                      <option value="IN_PROGRESS">En cours</option>

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
                ) : tickets.length === 0 ? (
                  <p className="ticket-form-message">
                    Aucun ticket ne correspond aux filtres actuels.
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
                              <th>Dernière modification</th>
                              <th>Date d’ouverture</th>
                              <th>Priorité</th>
                              <th>Demandeur</th>
                              <th>Technicien</th>
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
                                  navigateTo(`/agent/tickets/${ticket.id}`)
                                }
                              >
                                <td>
                                  <div className="ticket-table-primary">
                                    <strong>{ticket.number}</strong>
                                    <span>
                                      {translateTicketType(ticket.type)}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div className="ticket-table-primary">
                                    <strong>{ticket.title}</strong>
                                    <span>{ticket.id}</span>
                                  </div>
                                </td>
                                <td>
                                  {ticket.serviceId
                                    ? (servicesById.get(ticket.serviceId)
                                        ?.name ?? ticket.serviceId)
                                    : 'Service non défini'}
                                </td>
                                <td>{translateTicketStatus(ticket.status)}</td>
                                <td>{formatTicketDate(ticket.createdAt)}</td>
                                <td>{formatTicketDate(ticket.createdAt)}</td>
                                <td>
                                  {ticket.priorityName
                                    ? translatePriority(ticket.priorityName)
                                    : prioritiesById.get(ticket.priorityId)
                                      ? translatePriority(
                                          prioritiesById.get(ticket.priorityId)!
                                            .name,
                                        )
                                      : 'Non définie'}
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
                                  {prioritiesById.get(ticket.priorityId)
                                    ?.resolutionHours !== null &&
                                  prioritiesById.get(ticket.priorityId)
                                    ?.resolutionHours !== undefined
                                    ? `${prioritiesById.get(ticket.priorityId)!.resolutionHours} h`
                                    : '—'}
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
                        {tickets.length} tickets
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
              <aside className="ticket-detail-card ticket-detail-card--page">
                <div className="ticket-detail-header">
                  <div>
                    <h3>Detail du ticket</h3>

                    <p>
                      Lecture detaillee et actions agent pour l assignation et
                      le workflow.
                    </p>
                  </div>

                  <div className="ticket-detail-header-actions">
                    {selectedTicketDetail ? (
                      <span className="ticket-result-badge">
                        {selectedTicketDetail.ticket.number}
                      </span>
                    ) : null}
                    <button
                      className="secondary-button"
                      onClick={() => navigateTo('/agent/tickets')}
                      type="button"
                    >
                      Retour à la liste
                    </button>
                  </div>
                </div>

                {!selectedTicketId ? (
                  <p className="ticket-form-message">
                    Selectionne un ticket dans la liste pour afficher son
                    detail.
                  </p>
                ) : isLoadingDetail ? (
                  <p className="ticket-form-message">Chargement du detail...</p>
                ) : loadDetailErrorMessage ? (
                  <p className="ticket-form-error">{loadDetailErrorMessage}</p>
                ) : !selectedTicketDetail ? (
                  <p className="ticket-form-message">
                    Aucun detail ticket disponible.
                  </p>
                ) : (
                  <>
                    <div className="ticket-detail-summary">
                      <article>
                        <span>Type</span>

                        <strong>
                          {translateTicketType(
                            selectedTicketDetail.ticket.type,
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>Statut</span>

                        <strong>
                          {translateTicketStatus(
                            selectedTicketDetail.ticket.status,
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>Priorite</span>

                        <strong>
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
                              : 'Non definie'}
                        </strong>
                      </article>

                      <article>
                        <span>Cree le</span>

                        <strong>
                          {formatTicketDate(
                            selectedTicketDetail.ticket.createdAt,
                          )}
                        </strong>
                      </article>
                    </div>

                    <div className="ticket-detail-block">
                      <h4>{selectedTicketDetail.ticket.title}</h4>

                      <p>{selectedTicketDetail.ticket.description}</p>
                    </div>

                    <dl className="status-grid ticket-detail-grid">
                      <div>
                        <dt>Categorie</dt>

                        <dd>
                          {categoriesById.get(
                            selectedTicketDetail.ticket.categoryId,
                          )?.name ?? 'Non definie'}
                        </dd>
                      </div>

                      <div>
                        <dt>Canal</dt>

                        <dd>
                          {selectedTicketDetail.ticket.channelId
                            ? translateChannel(
                                channelsById.get(
                                  selectedTicketDetail.ticket.channelId,
                                )?.name ??
                                  selectedTicketDetail.ticket.channelId,
                              )
                            : 'Non renseigne'}
                        </dd>
                      </div>

                      <div>
                        <dt>Service</dt>

                        <dd>
                          {selectedTicketDetail.ticket.serviceId
                            ? (servicesById.get(
                                selectedTicketDetail.ticket.serviceId,
                              )?.name ?? selectedTicketDetail.ticket.serviceId)
                            : 'Non renseigne'}
                        </dd>
                      </div>

                      <div>
                        <dt>Equipement concerne</dt>

                        <dd>
                          {selectedTicketDetail.ticket.ciId
                            ? (cisById.get(selectedTicketDetail.ticket.ciId)
                                ?.name ?? selectedTicketDetail.ticket.ciId)
                            : 'Non renseigne'}
                        </dd>
                      </div>

                      <div>
                        <dt>Groupe d affectation</dt>

                        <dd>
                          {selectedTicketDetail.ticket.assignmentGroupId
                            ? (groupsById.get(
                                selectedTicketDetail.ticket.assignmentGroupId,
                              )?.name ??
                              selectedTicketDetail.ticket.assignmentGroupId)
                            : 'Non affecte'}
                        </dd>
                      </div>

                      <div>
                        <dt>Agent assigne</dt>

                        <dd>
                          {selectedTicketDetail.ticket.assignedToUserId ??
                            'Non assigne'}
                        </dd>
                      </div>
                    </dl>

                    {selectedTicketDetail.incident ? (
                      <dl className="status-grid ticket-detail-grid">
                        <div>
                          <dt>Impact</dt>

                          <dd>
                            {translateIncidentSeverity(
                              selectedTicketDetail.incident.impact,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>Urgence</dt>

                          <dd>
                            {translateIncidentSeverity(
                              selectedTicketDetail.incident.urgency,
                            )}
                          </dd>
                        </div>
                      </dl>
                    ) : null}

                    {selectedTicketDetail.request ? (
                      <dl className="status-grid ticket-detail-grid">
                        <div>
                          <dt>Type de demande</dt>

                          <dd>
                            {translateRequestType(
                              selectedTicketDetail.request.requestType,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>Approbation</dt>

                          <dd>
                            {selectedTicketDetail.request.approvalStatus ??
                              'Non definie'}
                          </dd>
                        </div>
                      </dl>
                    ) : null}

                    <div className="ticket-detail-tabbar">
                      <button
                        className={
                          detailWorkspaceTab === 'COMMENTS'
                            ? 'ticket-workspace-view-button is-active'
                            : 'ticket-workspace-view-button'
                        }
                        onClick={() => setDetailWorkspaceTab('COMMENTS')}
                        type="button"
                      >
                        Conversation
                      </button>

                      <button
                        className={
                          detailWorkspaceTab === 'ATTACHMENTS'
                            ? 'ticket-workspace-view-button is-active'
                            : 'ticket-workspace-view-button'
                        }
                        onClick={() => setDetailWorkspaceTab('ATTACHMENTS')}
                        type="button"
                      >
                        Pieces jointes
                      </button>
                    </div>

                    {detailWorkspaceTab === 'ATTACHMENTS' ? (
                      <section className="ticket-comments-card">
                        <div className="ticket-comments-header">
                          <div>
                            <h4>Pieces jointes</h4>

                            <p>
                              Liste des fichiers rattaches au ticket et ajout de
                              nouveaux documents.
                            </p>
                          </div>

                          <span className="ticket-result-badge">
                            {selectedTicketAttachments.length}
                          </span>
                        </div>

                        {isLoadingAttachments ? (
                          <p className="ticket-form-message">
                            Chargement des pieces jointes...
                          </p>
                        ) : loadAttachmentsErrorMessage ? (
                          <p className="ticket-form-error">
                            {loadAttachmentsErrorMessage}
                          </p>
                        ) : selectedTicketAttachments.length === 0 ? (
                          <p className="ticket-form-message">
                            Aucune piece jointe pour ce ticket.
                          </p>
                        ) : (
                          <div className="ticket-attachments-list">
                            {selectedTicketAttachments.map((attachment) => (
                              <article
                                className="ticket-attachment-card"
                                key={attachment.id}
                              >
                                <div className="ticket-attachment-meta">
                                  <div>
                                    <strong>{attachment.fileName}</strong>
                                    <span>
                                      Ajoute par {attachment.uploadedByUserId}{' '}
                                      le{' '}
                                      {formatTicketDate(attachment.createdAt)}
                                    </span>
                                  </div>

                                  <span className="ticket-comment-badge">
                                    {formatFileSize(attachment.sizeBytes)}
                                  </span>
                                </div>

                                <div className="ticket-attachment-actions">
                                  <button
                                    className="secondary-button"
                                    onClick={() =>
                                      void handleDownloadAttachment(attachment)
                                    }
                                    type="button"
                                  >
                                    Telecharger
                                  </button>

                                  <button
                                    className="ticket-comment-delete-button"
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

                                <dl className="ticket-attachment-grid">
                                  <div>
                                    <dt>Type MIME</dt>
                                    <dd>
                                      {attachment.mimeType ?? 'Non renseigne'}
                                    </dd>
                                  </div>

                                  <div>
                                    <dt>Bucket</dt>
                                    <dd>{attachment.bucketId}</dd>
                                  </div>

                                  <div className="ticket-attachment-path">
                                    <dt>Chemin de stockage</dt>
                                    <dd>{attachment.storagePath}</dd>
                                  </div>
                                </dl>
                              </article>
                            ))}
                          </div>
                        )}

                        <form
                          className="ticket-comment-form"
                          onSubmit={handleAttachmentSubmit}
                        >
                          <label className="field">
                            <span>Nouvelle piece jointe</span>

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
                          </label>

                          <div className="ticket-comment-actions">
                            <button
                              className="secondary-button"
                              disabled={isSubmittingAttachment}
                            >
                              {isSubmittingAttachment
                                ? 'Envoi...'
                                : 'Ajouter la piece jointe'}
                            </button>

                            <span className="ticket-form-helper">
                              {attachmentDraft.file
                                ? `${attachmentDraft.file.name} (${formatFileSize(attachmentDraft.file.size)})`
                                : 'Selectionne un fichier local a rattacher au ticket.'}
                            </span>
                          </div>
                        </form>

                        {attachmentErrorMessage ? (
                          <p className="ticket-form-error">
                            {attachmentErrorMessage}
                          </p>
                        ) : null}

                        {attachmentSuccessMessage ? (
                          <p className="ticket-form-message">
                            {attachmentSuccessMessage}
                          </p>
                        ) : null}
                      </section>
                    ) : null}

                    {detailWorkspaceTab === 'COMMENTS' ? (
                      <section className="ticket-comments-card">
                        <div className="ticket-comments-header">
                          <div>
                            <h4>Commentaires</h4>

                            <p>
                              Historique de discussion du ticket et ajout de
                              nouveaux commentaires.
                            </p>
                          </div>

                          <span className="ticket-result-badge">
                            {selectedTicketComments.length}
                          </span>
                        </div>

                        {isLoadingComments ? (
                          <p className="ticket-form-message">
                            Chargement des commentaires...
                          </p>
                        ) : loadCommentsErrorMessage ? (
                          <p className="ticket-form-error">
                            {loadCommentsErrorMessage}
                          </p>
                        ) : selectedTicketComments.length === 0 ? (
                          <p className="ticket-form-message">
                            Aucun commentaire pour ce ticket.
                          </p>
                        ) : (
                          <div className="ticket-comments-list">
                            {selectedTicketComments.map((comment) => {
                              const canDeleteComment = canDeleteTicketComment(
                                session.user.role,
                                session.user.id,
                                comment.authorUserId,
                              );

                              return (
                                <article
                                  className={
                                    comment.isInternal
                                      ? 'ticket-comment-card is-internal'
                                      : 'ticket-comment-card'
                                  }
                                  key={comment.id}
                                >
                                  <div className="ticket-comment-meta">
                                    <div className="ticket-comment-author">
                                      <strong>{comment.authorUserId}</strong>

                                      <span>
                                        {formatTicketDate(comment.createdAt)}
                                      </span>
                                    </div>

                                    <div className="ticket-comment-meta-actions">
                                      <span
                                        className={
                                          comment.isInternal
                                            ? 'ticket-comment-badge is-internal'
                                            : 'ticket-comment-badge'
                                        }
                                      >
                                        {comment.isInternal
                                          ? 'Interne'
                                          : 'Public'}
                                      </span>

                                      {canDeleteComment ? (
                                        <button
                                          className="ticket-comment-delete-button"
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
                                  </div>

                                  <p>{comment.body}</p>
                                </article>
                              );
                            })}
                          </div>
                        )}

                        <form
                          className="ticket-comment-form"
                          onSubmit={handleCommentSubmit}
                        >
                          <label className="field">
                            <span>Nouveau commentaire</span>

                            <textarea
                              className="ticket-comment-textarea"
                              onChange={(event) =>
                                handleCommentBodyChange(event.target.value)
                              }
                              placeholder="Ajouter un commentaire utile pour ce ticket"
                              rows={4}
                              value={commentDraft.body}
                            />
                          </label>

                          {canCreateInternalComments ? (
                            <label className="ticket-comment-toggle">
                              <span>Commentaire interne</span>

                              <input
                                checked={commentDraft.isInternal}
                                onChange={(event) =>
                                  handleCommentInternalToggle(
                                    event.target.checked,
                                  )
                                }
                                type="checkbox"
                              />
                            </label>
                          ) : null}

                          <div className="ticket-comment-actions">
                            <button
                              className="secondary-button"
                              disabled={isSubmittingComment}
                            >
                              {isSubmittingComment
                                ? 'Envoi...'
                                : 'Ajouter le commentaire'}
                            </button>

                            <span className="ticket-form-helper">
                              {canCreateInternalComments
                                ? 'Les agents et admins peuvent publier des notes internes.'
                                : 'Les commentaires internes restent reserves aux agents et admins.'}
                            </span>
                          </div>
                        </form>

                        {commentErrorMessage ? (
                          <p className="ticket-form-error">
                            {commentErrorMessage}
                          </p>
                        ) : null}

                        {commentSuccessMessage ? (
                          <p className="ticket-form-message">
                            {commentSuccessMessage}
                          </p>
                        ) : null}
                      </section>
                    ) : null}

                    {canManageTicket ? (
                      <div className="ticket-detail-actions">
                        <form
                          className="ticket-detail-action-card"
                          onSubmit={handleAssignmentSubmit}
                        >
                          <h4>Assignation</h4>

                          <label className="field">
                            <span>Groupe</span>

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
                          </label>

                          <label className="field">
                            <span>Id agent</span>

                            <input
                              onChange={(event) =>
                                handleAssignmentFieldChange(
                                  'assignedToUserId',

                                  event.target.value,
                                )
                              }
                              placeholder="Optionnel"
                              value={assignmentDraft.assignedToUserId}
                            />
                          </label>

                          <button
                            className="secondary-button"
                            disabled={isSubmittingAssignment}
                          >
                            {isSubmittingAssignment
                              ? 'Mise a jour...'
                              : 'Mettre a jour l assignation'}
                          </button>
                        </form>

                        <form
                          className="ticket-detail-action-card"
                          onSubmit={handleStatusSubmit}
                        >
                          <h4>Workflow</h4>

                          <label className="field">
                            <span>Nouveau statut</span>

                            <select
                              onChange={(event) =>
                                setStatusDraft(
                                  asTicketStatus(event.target.value) ?? 'OPEN',
                                )
                              }
                              value={statusDraft}
                            >
                              <option value="OPEN">Ouvert</option>

                              <option value="IN_PROGRESS">En cours</option>

                              <option value="RESOLVED">Resolu</option>

                              <option value="CLOSED">Clos</option>
                            </select>
                          </label>

                          <button
                            className="secondary-button"
                            disabled={isSubmittingStatus}
                          >
                            {isSubmittingStatus
                              ? 'Mise a jour...'
                              : 'Changer le statut'}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="ticket-form-message">
                        Les actions agent sont masquees pour le role demandeur.
                      </p>
                    )}

                    {detailActionErrorMessage ? (
                      <p className="ticket-form-error">
                        {detailActionErrorMessage}
                      </p>
                    ) : null}

                    {detailActionSuccessMessage ? (
                      <p className="ticket-form-message">
                        {detailActionSuccessMessage}
                      </p>
                    ) : null}
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

function normalizeOptionalSearch(value: string): string | null {
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
    value === 'RESOLVED' ||
    value === 'CLOSED'
  ) {
    return value;
  }

  return null;
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
