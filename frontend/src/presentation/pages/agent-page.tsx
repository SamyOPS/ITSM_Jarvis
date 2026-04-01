import { useEffect, useMemo, useState } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';
import {
  translateChannel,
  translatePriority,
  translateTicketType,
  translateUserRole,
} from '../../domain/i18n/ticketing-labels';

type AgentPageProps = {
  session: AuthSessionSnapshot;
};

type TicketDraftState = {
  categoryId: string;
  channelId: string;
  ciId: string;
  description: string;
  groupId: string;
  priorityId: string;
  serviceId: string;
  title: string;
  type: 'INCIDENT' | 'REQUEST';
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

export function AgentPage({ session }: AgentPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [draft, setDraft] = useState<TicketDraftState>({
    categoryId: '',
    channelId: '',
    ciId: '',
    description: '',
    groupId: '',
    priorityId: '',
    serviceId: '',
    title: '',
    type: 'INCIDENT',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);

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
          groupId: currentDraft.groupId || nextCatalog.groups[0]?.id || '',
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
            : 'Erreur inconnue lors du chargement des référentiels ticket',
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
  const selectedGroup = useMemo(
    () => catalog.groups.find((item) => item.id === draft.groupId) ?? null,
    [catalog.groups, draft.groupId],
  );
  const selectedPriority = useMemo(
    () =>
      catalog.priorities.find((item) => item.id === draft.priorityId) ?? null,
    [catalog.priorities, draft.priorityId],
  );
  const selectedService = useMemo(
    () => catalog.services.find((item) => item.id === draft.serviceId) ?? null,
    [catalog.services, draft.serviceId],
  );

  function handleFieldChange(
    field: keyof TicketDraftState,
    value: string,
  ): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  return (
    <section className="panel ticket-form-panel">
      <span className="panel-tag">P2.5</span>
      <h2>Formulaire ticket branché sur les référentiels</h2>
      <p>
        Cette étape valide l’intégration front : le formulaire consomme les
        référentiels d’administration déjà configurés et remplace les futurs
        champs libres par des listes cohérentes pour la création de ticket, y
        compris pour un compte demandeur.
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
          <span>Type de ticket</span>
          <strong>{translateTicketType(draft.type)}</strong>
        </article>
        <article>
          <span>référentiels chargés</span>
          <strong>
            {catalog.categories.length +
              catalog.channels.length +
              catalog.cis.length +
              catalog.groups.length +
              catalog.priorities.length +
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
          <form className="ticket-form-grid">
            <label className="field">
              <span>Type de ticket</span>
              <select
                onChange={(event) =>
                  handleFieldChange('type', event.target.value)
                }
                value={draft.type}
              >
                <option value="INCIDENT">Incident</option>
                <option value="REQUEST">Demande</option>
              </select>
            </label>

            <label className="field ticket-form-span-2">
              <span>Titre</span>
              <input
                onChange={(event) =>
                  handleFieldChange('title', event.target.value)
                }
                placeholder="Ex. : VPN inaccessible pour équipe finance"
                value={draft.title}
              />
            </label>

            <label className="field ticket-form-span-2">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  handleFieldChange('description', event.target.value)
                }
                placeholder="Décris le besoin ou l’incident."
                rows={4}
                value={draft.description}
              />
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
              <span>Priorité</span>
              <select
                onChange={(event) =>
                  handleFieldChange('priorityId', event.target.value)
                }
                value={draft.priorityId}
              >
                <option value="">Choisir une priorité</option>
                {catalog.priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {translatePriority(priority.name)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Groupe cible</span>
              <select
                onChange={(event) =>
                  handleFieldChange('groupId', event.target.value)
                }
                value={draft.groupId}
              >
                <option value="">Choisir un groupe</option>
                {catalog.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>CI lié</span>
              <select
                onChange={(event) =>
                  handleFieldChange('ciId', event.target.value)
                }
                value={draft.ciId}
              >
                <option value="">Choisir un CI</option>
                {catalog.cis.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.name}
                  </option>
                ))}
              </select>
            </label>
          </form>

          <aside className="ticket-preview-card">
            <h3>Aperçu de la sélection</h3>
            <p>
              Cette colonne montre ce que le formulaire consomme réellement dans
              les référentiels chargés depuis le backend.
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
                <dt>Priorité</dt>
                <dd>
                  {selectedPriority
                    ? translatePriority(selectedPriority.name)
                    : 'Non sélectionnée'}
                </dd>
              </div>
              <div>
                <dt>Groupe</dt>
                <dd>{selectedGroup?.name ?? 'Non sélectionné'}</dd>
              </div>
              <div>
                <dt>CI</dt>
                <dd>{selectedCi?.name ?? 'Non sélectionné'}</dd>
              </div>
            </dl>

            <ul className="checklist">
              <li>Les listes viennent de `/referentials`.</li>
              <li>Le formulaire ne dépend plus de valeurs écrites en dur.</li>
              <li>
                Le demandeur peut maintenant préparer un ticket comme les autres
                rôles.
              </li>
              <li>
                La vraie création incident/demande viendra en `P3.6` et `P3.7`.
              </li>
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}
