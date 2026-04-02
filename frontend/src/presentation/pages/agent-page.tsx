import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
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
import {
  REQUEST_TYPES,
  type RequestType,
} from '../../domain/ticketing/request-type';
import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';
import {
  createIncident,
  createRequest,
  searchTickets,
} from '../../infrastructure/api/ticketing-api';

type AgentPageProps = {
  session: AuthSessionSnapshot;
};

type TicketMode = 'INCIDENT' | 'REQUEST';

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

type IncidentValidationErrors = Partial<
  Record<keyof IncidentDraftState, string>
>;
type RequestValidationErrors = Partial<Record<keyof RequestDraftState, string>>;

type TicketSearchFiltersState = {
  categoryId: string;
  priorityId: string;
  q: string;
  status: '' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [loadTicketsErrorMessage, setLoadTicketsErrorMessage] = useState<
    string | null
  >(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
    null,
  );
  const [tickets, setTickets] = useState<TicketSummarySnapshot[]>([]);
  const [incidentValidationErrors, setIncidentValidationErrors] =
    useState<IncidentValidationErrors>({});
  const [requestValidationErrors, setRequestValidationErrors] =
    useState<RequestValidationErrors>({});

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
        if (cancelled) {
          return;
        }

        setLoadErrorMessage(
          error instanceof Error
            ? error.message
            : 'Erreur inconnue lors du chargement des referentiels ticket',
        );
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
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadTicketsErrorMessage(
          error instanceof Error
            ? error.message
            : 'Erreur inconnue lors du chargement des tickets',
        );
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
    session.accessToken,
  ]);

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
        setSearchFilters((currentFilters) => ({
          ...currentFilters,
          type: 'INCIDENT',
        }));
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
      setSearchFilters((currentFilters) => ({
        ...currentFilters,
        type: 'REQUEST',
      }));
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

  return (
    <section className="panel ticket-form-panel">
      <span className="panel-tag">P3.6 / P3.7</span>
      <h2>Creation de ticket</h2>
      <p>
        La page gere maintenant les deux parcours frontend du lot P3 : incident
        avec priorite calculee, et demande avec priorite choisie manuellement.
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
              {mode === 'INCIDENT' && incidentValidationErrors.categoryId ? (
                <small className="field-error">
                  {incidentValidationErrors.categoryId}
                </small>
              ) : null}
              {mode === 'REQUEST' && requestValidationErrors.categoryId ? (
                <small className="field-error">
                  {requestValidationErrors.categoryId}
                </small>
              ) : null}
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
                  {requestValidationErrors.priorityId ? (
                    <small className="field-error">
                      {requestValidationErrors.priorityId}
                    </small>
                  ) : null}
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

            <ul className="checklist">
              <li>Le formulaire consomme toujours les referentiels backend.</li>
              <li>
                Incident : impact et urgence sont obligatoires cote metier.
              </li>
              <li>Demande : la priorite est choisie manuellement.</li>
            </ul>
          </aside>
        </div>
      )}

      <section className="ticket-list-card">
        <div className="ticket-list-header">
          <div>
            <h3>Liste des tickets</h3>
            <p>
              Recherche texte et filtres simples branchés sur l endpoint `GET
              /tickets`.
            </p>
          </div>
          <div className="ticket-list-meta">
            <span>Résultats</span>
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
              placeholder="Numéro, titre ou description"
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
              <option value="RESOLVED">Résolu</option>
              <option value="CLOSED">Clos</option>
            </select>
          </label>

          <label className="field">
            <span>Catégorie</span>
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
            <span>Priorité</span>
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
                    <dt>Priorité</dt>
                    <dd>
                      {ticket.priorityName
                        ? translatePriority(ticket.priorityName)
                        : prioritiesById.get(ticket.priorityId)
                          ? translatePriority(
                              prioritiesById.get(ticket.priorityId)!.name,
                            )
                          : 'Non définie'}
                    </dd>
                  </div>
                  <div>
                    <dt>Catégorie</dt>
                    <dd>
                      {categoriesById.get(ticket.categoryId)?.name ??
                        'Non définie'}
                    </dd>
                  </div>
                  <div>
                    <dt>Créé le</dt>
                    <dd>{formatTicketDate(ticket.createdAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
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
