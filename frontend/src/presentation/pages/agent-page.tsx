import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  translateChannel,
  translateIncidentSeverity,
  translatePriority,
  translateUserRole,
} from '../../domain/i18n/ticketing-labels';
import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import type { CreatedIncidentSnapshot } from '../../domain/ticketing/created-incident';
import {
  INCIDENT_SEVERITIES,
  type IncidentSeverity,
} from '../../domain/ticketing/incident-severity';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';
import { createIncident } from '../../infrastructure/api/ticketing-api';

type AgentPageProps = {
  session: AuthSessionSnapshot;
};

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

type ValidationErrors = Partial<Record<keyof IncidentDraftState, string>>;

const EMPTY_CATALOG: ReferentialCatalogSnapshot = {
  categories: [],
  channels: [],
  cis: [],
  ciTypes: [],
  groups: [],
  priorities: [],
  services: [],
};

const INITIAL_DRAFT: IncidentDraftState = {
  categoryId: '',
  channelId: '',
  ciId: '',
  description: '',
  impact: 'MEDIUM',
  serviceId: '',
  title: '',
  urgency: 'MEDIUM',
};

export function AgentPage({ session }: AgentPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [draft, setDraft] = useState<IncidentDraftState>(INITIAL_DRAFT);
  const [createdIncident, setCreatedIncident] =
    useState<CreatedIncidentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
    null,
  );
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );

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
        setDraft((currentDraft) => ({
          ...currentDraft,
          categoryId:
            currentDraft.categoryId || nextCatalog.categories[0]?.id || '',
          channelId:
            currentDraft.channelId || nextCatalog.channels[0]?.id || '',
          ciId: currentDraft.ciId || nextCatalog.cis[0]?.id || '',
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

  const selectedCategory = useMemo(
    () =>
      catalog.categories.find((item) => item.id === draft.categoryId) ?? null,
    [catalog.categories, draft.categoryId],
  );
  const selectedChannel = useMemo(
    () => catalog.channels.find((item) => item.id === draft.channelId) ?? null,
    [catalog.channels, draft.channelId],
  );
  const selectedCi = useMemo(
    () => catalog.cis.find((item) => item.id === draft.ciId) ?? null,
    [catalog.cis, draft.ciId],
  );
  const selectedService = useMemo(
    () => catalog.services.find((item) => item.id === draft.serviceId) ?? null,
    [catalog.services, draft.serviceId],
  );

  function handleFieldChange(
    field: keyof IncidentDraftState,
    value: string,
  ): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    setValidationErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setSubmitErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateIncidentDraft(draft);
    setValidationErrors(errors);
    setSubmitErrorMessage(null);
    setCreatedIncident(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createIncident(session.accessToken, {
        categoryId: draft.categoryId.trim(),
        channelId: normalizeOptionalId(draft.channelId),
        ciId: normalizeOptionalId(draft.ciId),
        description: draft.description.trim(),
        impact: draft.impact,
        serviceId: normalizeOptionalId(draft.serviceId),
        title: draft.title.trim(),
        urgency: draft.urgency,
      });

      setCreatedIncident(result);
      setDraft((currentDraft) => ({
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
  }

  return (
    <section className="panel ticket-form-panel">
      <span className="panel-tag">P3.6</span>
      <h2>Création d incident</h2>
      <p>
        Cette étape branche le formulaire frontend sur le backend de création d
        incident, avec validation des champs essentiels et calcul de priorité
        côté serveur à partir de l impact et de l urgence.
      </p>

      <div className="ticket-form-summary">
        <article>
          <span>Utilisateur connecté</span>
          <strong>{session.user.email}</strong>
        </article>
        <article>
          <span>Rôle</span>
          <strong>{translateUserRole(session.user.role)}</strong>
        </article>
        <article>
          <span>Mode actif</span>
          <strong>Création incident</strong>
        </article>
        <article>
          <span>Référentiels chargés</span>
          <strong>
            {catalog.categories.length +
              catalog.channels.length +
              catalog.cis.length +
              catalog.services.length}
          </strong>
        </article>
      </div>

      {isLoading ? (
        <p className="ticket-form-message">Chargement des référentiels...</p>
      ) : loadErrorMessage ? (
        <p className="ticket-form-error">{loadErrorMessage}</p>
      ) : (
        <div className="ticket-form-layout">
          <form className="ticket-form-grid" onSubmit={handleSubmit}>
            <label className="field ticket-form-span-2">
              <span>Titre</span>
              <input
                onChange={(event) =>
                  handleFieldChange('title', event.target.value)
                }
                placeholder="Ex. : VPN inaccessible pour l agence Nord"
                value={draft.title}
              />
              {validationErrors.title ? (
                <small className="field-error">{validationErrors.title}</small>
              ) : null}
            </label>

            <label className="field ticket-form-span-2">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  handleFieldChange('description', event.target.value)
                }
                placeholder="Décris le symptôme, le contexte et les impacts."
                rows={5}
                value={draft.description}
              />
              {validationErrors.description ? (
                <small className="field-error">
                  {validationErrors.description}
                </small>
              ) : null}
            </label>

            <label className="field">
              <span>Catégorie</span>
              <select
                onChange={(event) =>
                  handleFieldChange('categoryId', event.target.value)
                }
                value={draft.categoryId}
              >
                <option value="">Choisir une catégorie</option>
                {catalog.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {validationErrors.categoryId ? (
                <small className="field-error">
                  {validationErrors.categoryId}
                </small>
              ) : null}
            </label>

            <label className="field">
              <span>Canal</span>
              <select
                onChange={(event) =>
                  handleFieldChange('channelId', event.target.value)
                }
                value={draft.channelId}
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
                  handleFieldChange('serviceId', event.target.value)
                }
                value={draft.serviceId}
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
              <span>Équipement concerné</span>
              <select
                onChange={(event) =>
                  handleFieldChange('ciId', event.target.value)
                }
                value={draft.ciId}
              >
                <option value="">Choisir un équipement</option>
                {catalog.cis.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Impact</span>
              <select
                onChange={(event) =>
                  handleFieldChange('impact', event.target.value)
                }
                value={draft.impact}
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
                  handleFieldChange('urgency', event.target.value)
                }
                value={draft.urgency}
              >
                {INCIDENT_SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>
                    {translateIncidentSeverity(severity)}
                  </option>
                ))}
              </select>
            </label>

            <div className="ticket-form-actions ticket-form-span-2">
              <button className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Création en cours...' : 'Créer l incident'}
              </button>
              <span className="ticket-form-helper">
                La priorité sera calculée automatiquement par le backend.
              </span>
            </div>

            {submitErrorMessage ? (
              <p className="ticket-form-error ticket-form-span-2">
                {submitErrorMessage}
              </p>
            ) : null}
          </form>

          <aside className="ticket-preview-card">
            <h3>Préparation incident</h3>
            <p>
              Les référentiels alimentent les listes, puis le backend transforme
              l impact et l urgence en priorité métier au moment de la création.
            </p>

            <dl className="status-grid ticket-preview-grid">
              <div>
                <dt>Catégorie</dt>
                <dd>{selectedCategory?.name ?? 'Non sélectionnée'}</dd>
              </div>
              <div>
                <dt>Canal</dt>
                <dd>
                  {selectedChannel
                    ? translateChannel(selectedChannel.name)
                    : 'Non sélectionné'}
                </dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{selectedService?.name ?? 'Non sélectionné'}</dd>
              </div>
              <div>
                <dt>Équipement concerné</dt>
                <dd>{selectedCi?.name ?? 'Non sélectionné'}</dd>
              </div>
              <div>
                <dt>Impact</dt>
                <dd>{translateIncidentSeverity(draft.impact)}</dd>
              </div>
              <div>
                <dt>Urgence</dt>
                <dd>{translateIncidentSeverity(draft.urgency)}</dd>
              </div>
            </dl>

            {createdIncident ? (
              <article className="ticket-created-card">
                <span>Incident créé</span>
                <strong>{createdIncident.ticket.number}</strong>
                <p>{createdIncident.ticket.title}</p>
                <dl className="ticket-created-grid">
                  <div>
                    <dt>Statut</dt>
                    <dd>{createdIncident.ticket.status}</dd>
                  </div>
                  <div>
                    <dt>Priorité calculée</dt>
                    <dd>{translatePriority(createdIncident.priorityName)}</dd>
                  </div>
                </dl>
              </article>
            ) : null}

            <ul className="checklist">
              <li>Le formulaire consomme toujours les référentiels backend.</li>
              <li>
                Le mode incident est maintenant réellement soumis à l API.
              </li>
              <li>
                La priorité n est plus choisie à la main : elle dépend de l
                impact et de l urgence.
              </li>
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}

function validateIncidentDraft(draft: IncidentDraftState): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!draft.title.trim()) {
    errors.title = 'Le titre est obligatoire.';
  }

  if (!draft.description.trim()) {
    errors.description = 'La description est obligatoire.';
  }

  if (!draft.categoryId.trim()) {
    errors.categoryId = 'La catégorie est obligatoire.';
  }

  return errors;
}

function normalizeOptionalId(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}
