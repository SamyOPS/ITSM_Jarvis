import { type FormEvent, useEffect, useMemo, useState } from 'react';

import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

import type { UserRole } from '../../domain/auth/user-role';

import {
  translateChannel,
  translateIncidentSeverity,
  translatePriority,
  translateRequestType,
  translateTicketStatus,
  translateTicketType,
  translateUserRole,
} from '../../domain/i18n/ticketing-labels';

import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';

import type { CreatedIncidentSnapshot } from '../../domain/ticketing/created-incident';

import type { CreatedRequestSnapshot } from '../../domain/ticketing/created-request';

import {
  INCIDENT_SEVERITIES,
  type IncidentSeverity,
} from '../../domain/ticketing/incident-severity';

import type { TicketDetailSnapshot } from '../../domain/ticketing/ticket-detail';

import {
  REQUEST_TYPES,
  type RequestType,
} from '../../domain/ticketing/request-type';

import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';

import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

import {
  assignTicket,
  changeTicketStatus,
  createIncident,
  createRequest,
  getTicketById,
  searchTickets,
} from '../../infrastructure/api/ticketing-api';

type AgentPageProps = {
  session: AuthSessionSnapshot;
};

type TicketMode = 'INCIDENT' | 'REQUEST';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

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

export function AgentPage({ session }: AgentPageProps) {
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

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [selectedTicketDetail, setSelectedTicketDetail] =
    useState<TicketDetailSnapshot | null>(null);

  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraftState>(
    INITIAL_ASSIGNMENT_DRAFT,
  );

  const [statusDraft, setStatusDraft] = useState<TicketStatus>('OPEN');

  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

  const [loadTicketsErrorMessage, setLoadTicketsErrorMessage] = useState<
    string | null
  >(null);

  const [loadDetailErrorMessage, setLoadDetailErrorMessage] = useState<
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

  const [tickets, setTickets] = useState<TicketSummarySnapshot[]>([]);

  const [incidentValidationErrors, setIncidentValidationErrors] =
    useState<IncidentValidationErrors>({});

  const [requestValidationErrors, setRequestValidationErrors] =
    useState<RequestValidationErrors>({});

  const canManageTicket = canManageTicketActions(session.user.role);

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

      setLoadDetailErrorMessage(null);

      setDetailActionErrorMessage(null);

      setDetailActionSuccessMessage(null);

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

  const selectedCategory = useMemo(() => {
    const categoryId =
      mode === 'INCIDENT' ? incidentDraft.categoryId : requestDraft.categoryId;

    return catalog.categories.find((item) => item.id === categoryId) ?? null;
  }, [
    catalog.categories,

    incidentDraft.categoryId,

    mode,

    requestDraft.categoryId,
  ]);

  const selectedChannel = useMemo(() => {
    const channelId =
      mode === 'INCIDENT' ? incidentDraft.channelId : requestDraft.channelId;

    return catalog.channels.find((item) => item.id === channelId) ?? null;
  }, [catalog.channels, incidentDraft.channelId, mode, requestDraft.channelId]);

  const selectedCi = useMemo(() => {
    const ciId = mode === 'INCIDENT' ? incidentDraft.ciId : requestDraft.ciId;

    return catalog.cis.find((item) => item.id === ciId) ?? null;
  }, [catalog.cis, incidentDraft.ciId, mode, requestDraft.ciId]);

  const selectedService = useMemo(() => {
    const serviceId =
      mode === 'INCIDENT' ? incidentDraft.serviceId : requestDraft.serviceId;

    return catalog.services.find((item) => item.id === serviceId) ?? null;
  }, [catalog.services, incidentDraft.serviceId, mode, requestDraft.serviceId]);

  const selectedPriority = useMemo(
    () =>
      catalog.priorities.find((item) => item.id === requestDraft.priorityId) ??
      null,

    [catalog.priorities, requestDraft.priorityId],
  );

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

  return (
    <section className="panel ticket-form-panel">
      <span className="panel-tag">P3.9</span>

      <h2>Creation, liste et detail des tickets</h2>

      <p>
        La page couvre maintenant la creation front, la recherche ticket, le
        detail, puis les actions agent pour l assignation et le workflow.
      </p>

      <div className="ticket-form-summary">
        <article>
          <span>Utilisateur connecte</span>

          <strong>{session.user.email}</strong>
        </article>

        <article>
          <span>Role</span>

          <strong>{translateUserRole(session.user.role)}</strong>
        </article>

        <article>
          <span>Mode actif</span>

          <strong>{translateTicketType(mode)}</strong>
        </article>

        <article>
          <span>Referentiels charges</span>

          <strong>
            {catalog.categories.length +
              catalog.channels.length +
              catalog.cis.length +
              catalog.priorities.length +
              catalog.services.length}
          </strong>
        </article>
      </div>

      {isLoading ? (
        <p className="ticket-form-message">Chargement des referentiels...</p>
      ) : loadErrorMessage ? (
        <p className="ticket-form-error">{loadErrorMessage}</p>
      ) : (
        <div className="ticket-form-layout">
          <form className="ticket-form-grid" onSubmit={handleSubmit}>
            <div className="ticket-mode-switch ticket-form-span-2">
              <button
                className={
                  mode === 'INCIDENT' ? 'primary-button' : 'secondary-button'
                }
                onClick={() => setMode('INCIDENT')}
                type="button"
              >
                Incident
              </button>

              <button
                className={
                  mode === 'REQUEST' ? 'primary-button' : 'secondary-button'
                }
                onClick={() => setMode('REQUEST')}
                type="button"
              >
                Demande
              </button>
            </div>

            <label className="field ticket-form-span-2">
              <span>Titre</span>

              <input
                onChange={(event) =>
                  mode === 'INCIDENT'
                    ? handleIncidentFieldChange('title', event.target.value)
                    : handleRequestFieldChange('title', event.target.value)
                }
                placeholder={
                  mode === 'INCIDENT'
                    ? 'Ex. : VPN inaccessible pour l agence Nord'
                    : 'Ex. : Demande d acces VPN pour l agence Nord'
                }
                value={
                  mode === 'INCIDENT' ? incidentDraft.title : requestDraft.title
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

              {mode === 'INCIDENT' && incidentValidationErrors.description ? (
                <small className="field-error">
                  {incidentValidationErrors.description}
                </small>
              ) : null}

              {mode === 'REQUEST' && requestValidationErrors.description ? (
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
                    : handleRequestFieldChange('categoryId', event.target.value)
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
                    ? handleIncidentFieldChange('channelId', event.target.value)
                    : handleRequestFieldChange('channelId', event.target.value)
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
                    ? handleIncidentFieldChange('serviceId', event.target.value)
                    : handleRequestFieldChange('serviceId', event.target.value)
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
                    ? handleIncidentFieldChange('ciId', event.target.value)
                    : handleRequestFieldChange('ciId', event.target.value)
                }
                value={
                  mode === 'INCIDENT' ? incidentDraft.ciId : requestDraft.ciId
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
                      handleIncidentFieldChange('impact', event.target.value)
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
                      handleIncidentFieldChange('urgency', event.target.value)
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
                      handleRequestFieldChange('priorityId', event.target.value)
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

          <aside className="ticket-preview-card">
            <h3>
              {mode === 'INCIDENT'
                ? 'Preparation incident'
                : 'Preparation demande'}
            </h3>

            <p>
              {mode === 'INCIDENT'
                ? 'Le backend transformera impact et urgence en priorite metier.'
                : 'La demande utilise une priorite manuelle et un type de demande explicite.'}
            </p>

            <dl className="status-grid ticket-preview-grid">
              <div>
                <dt>Categorie</dt>

                <dd>{selectedCategory?.name ?? 'Non selectionnee'}</dd>
              </div>

              <div>
                <dt>Canal</dt>

                <dd>
                  {selectedChannel
                    ? translateChannel(selectedChannel.name)
                    : 'Non selectionne'}
                </dd>
              </div>

              <div>
                <dt>Service</dt>

                <dd>{selectedService?.name ?? 'Non selectionne'}</dd>
              </div>

              <div>
                <dt>Equipement concerne</dt>

                <dd>{selectedCi?.name ?? 'Non selectionne'}</dd>
              </div>

              {mode === 'INCIDENT' ? (
                <>
                  <div>
                    <dt>Impact</dt>

                    <dd>{translateIncidentSeverity(incidentDraft.impact)}</dd>
                  </div>

                  <div>
                    <dt>Urgence</dt>

                    <dd>{translateIncidentSeverity(incidentDraft.urgency)}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Priorite</dt>

                    <dd>
                      {selectedPriority
                        ? translatePriority(selectedPriority.name)
                        : 'Non selectionnee'}
                    </dd>
                  </div>

                  <div>
                    <dt>Type de demande</dt>

                    <dd>{translateRequestType(requestDraft.requestType)}</dd>
                  </div>
                </>
              )}
            </dl>

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

                    <dd>{translatePriority(createdIncident.priorityName)}</dd>
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

                    <dd>{translatePriority(createdRequest.priorityName)}</dd>
                  </div>
                </dl>
              </article>
            ) : null}
          </aside>
        </div>
      )}

      <section className="ticket-detail-layout">
        <section className="ticket-list-card">
          <div className="ticket-list-header">
            <div>
              <h3>Liste des tickets</h3>

              <p>
                Recherche texte et filtres simples branches sur l endpoint `GET
                /tickets`.
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
          ) : tickets.length === 0 ? (
            <p className="ticket-form-message">
              Aucun ticket ne correspond aux filtres actuels.
            </p>
          ) : (
            <div className="ticket-results">
              {tickets.map((ticket) => (
                <article className="ticket-result-card" key={ticket.id}>
                  <button
                    className={
                      selectedTicketId === ticket.id
                        ? 'ticket-result-overlay is-selected'
                        : 'ticket-result-overlay'
                    }
                    onClick={() => setSelectedTicketId(ticket.id)}
                    type="button"
                  >
                    Ouvrir le detail du ticket {ticket.number}
                  </button>

                  <div className="ticket-result-header">
                    <div>
                      <span className="ticket-result-number">
                        {ticket.number}
                      </span>

                      <h4>{ticket.title}</h4>
                    </div>

                    <span className="ticket-result-badge">
                      {translateTicketType(ticket.type)}
                    </span>
                  </div>

                  <dl className="ticket-result-grid">
                    <div>
                      <dt>Statut</dt>

                      <dd>{translateTicketStatus(ticket.status)}</dd>
                    </div>

                    <div>
                      <dt>Priorite</dt>

                      <dd>
                        {ticket.priorityName
                          ? translatePriority(ticket.priorityName)
                          : prioritiesById.get(ticket.priorityId)
                            ? translatePriority(
                                prioritiesById.get(ticket.priorityId)!.name,
                              )
                            : 'Non definie'}
                      </dd>
                    </div>

                    <div>
                      <dt>Categorie</dt>

                      <dd>
                        {categoriesById.get(ticket.categoryId)?.name ??
                          'Non definie'}
                      </dd>
                    </div>

                    <div>
                      <dt>Cree le</dt>

                      <dd>{formatTicketDate(ticket.createdAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="ticket-detail-card">
          <div className="ticket-detail-header">
            <div>
              <h3>Detail du ticket</h3>

              <p>
                Lecture detaillee et actions agent pour l assignation et le
                workflow.
              </p>
            </div>

            {selectedTicketDetail ? (
              <span className="ticket-result-badge">
                {selectedTicketDetail.ticket.number}
              </span>
            ) : null}
          </div>

          {!selectedTicketId ? (
            <p className="ticket-form-message">
              Selectionne un ticket dans la liste pour afficher son detail.
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
                    {translateTicketType(selectedTicketDetail.ticket.type)}
                  </strong>
                </article>

                <article>
                  <span>Statut</span>

                  <strong>
                    {translateTicketStatus(selectedTicketDetail.ticket.status)}
                  </strong>
                </article>

                <article>
                  <span>Priorite</span>

                  <strong>
                    {selectedTicketDetail.priorityName
                      ? translatePriority(selectedTicketDetail.priorityName)
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
                    {formatTicketDate(selectedTicketDetail.ticket.createdAt)}
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
                    {categoriesById.get(selectedTicketDetail.ticket.categoryId)
                      ?.name ?? 'Non definie'}
                  </dd>
                </div>

                <div>
                  <dt>Canal</dt>

                  <dd>
                    {selectedTicketDetail.ticket.channelId
                      ? translateChannel(
                          channelsById.get(
                            selectedTicketDetail.ticket.channelId,
                          )?.name ?? selectedTicketDetail.ticket.channelId,
                        )
                      : 'Non renseigne'}
                  </dd>
                </div>

                <div>
                  <dt>Service</dt>

                  <dd>
                    {selectedTicketDetail.ticket.serviceId
                      ? (servicesById.get(selectedTicketDetail.ticket.serviceId)
                          ?.name ?? selectedTicketDetail.ticket.serviceId)
                      : 'Non renseigne'}
                  </dd>
                </div>

                <div>
                  <dt>Equipement concerne</dt>

                  <dd>
                    {selectedTicketDetail.ticket.ciId
                      ? (cisById.get(selectedTicketDetail.ticket.ciId)?.name ??
                        selectedTicketDetail.ticket.ciId)
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
                <p className="ticket-form-error">{detailActionErrorMessage}</p>
              ) : null}

              {detailActionSuccessMessage ? (
                <p className="ticket-form-message">
                  {detailActionSuccessMessage}
                </p>
              ) : null}
            </>
          )}
        </aside>
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
