import { useEffect, useMemo, useState } from 'react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

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
      <h2>Formulaire ticket branche sur les referentiels</h2>
      <p>
        Cette etape valide l integration front : le formulaire consomme les
        referentiels admin deja configures et remplace les futurs champs libres
        par des listes coherentes pour la creation de ticket, y compris pour un
        compte demandeur.
      </p>

      <div className="ticket-form-summary">
        <article>
          <span>Utilisateur connecte</span>
          <strong>{session.user.email}</strong>
        </article>
        <article>
          <span>Role</span>
          <strong>{session.user.role}</strong>
        </article>
        <article>
          <span>Type de ticket</span>
          <strong>{draft.type}</strong>
        </article>
        <article>
          <span>Referentiels charges</span>
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
        <p className="ticket-form-message">Chargement des referentiels...</p>
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
                <option value="INCIDENT">INCIDENT</option>
                <option value="REQUEST">REQUEST</option>
              </select>
            </label>

            <label className="field ticket-form-span-2">
              <span>Titre</span>
              <input
                onChange={(event) =>
                  handleFieldChange('title', event.target.value)
                }
                placeholder="Ex : VPN inaccessible pour equipe finance"
                value={draft.title}
              />
            </label>

            <label className="field ticket-form-span-2">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  handleFieldChange('description', event.target.value)
                }
                placeholder="Decris le besoin ou l incident."
                rows={4}
                value={draft.description}
              />
            </label>

            <label className="field">
              <span>Categorie</span>
              <select
                onChange={(event) =>
                  handleFieldChange('categoryId', event.target.value)
                }
                value={draft.categoryId}
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
                  handleFieldChange('channelId', event.target.value)
                }
                value={draft.channelId}
              >
                <option value="">Choisir un canal</option>
                {catalog.channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
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
              <span>Priorite</span>
              <select
                onChange={(event) =>
                  handleFieldChange('priorityId', event.target.value)
                }
                value={draft.priorityId}
              >
                <option value="">Choisir une priorite</option>
                {catalog.priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
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
              <span>Equipement concerne</span>
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
            <h3>Apercu de la selection</h3>
            <p>
              Cette colonne montre ce que le formulaire consomme reellement dans
              les referentiels charges depuis le backend.
            </p>

            <dl className="status-grid ticket-preview-grid">
              <div>
                <dt>Categorie</dt>
                <dd>{selectedCategory?.name ?? 'Non selectionnee'}</dd>
              </div>
              <div>
                <dt>Canal</dt>
                <dd>{selectedChannel?.name ?? 'Non selectionne'}</dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{selectedService?.name ?? 'Non selectionne'}</dd>
              </div>
              <div>
                <dt>Priorite</dt>
                <dd>{selectedPriority?.name ?? 'Non selectionnee'}</dd>
              </div>
              <div>
                <dt>Groupe</dt>
                <dd>{selectedGroup?.name ?? 'Non selectionne'}</dd>
              </div>
              <div>
                <dt>Equipement concerne</dt>
                <dd>{selectedCi?.name ?? 'Non selectionne'}</dd>
              </div>
            </dl>

            <ul className="checklist">
              <li>Les listes viennent de `/referentials`.</li>
              <li>Le formulaire ne depend plus de valeurs ecrites en dur.</li>
              <li>
                Le demandeur peut maintenant preparer un ticket comme les autres
                roles.
              </li>
              <li>
                La vraie creation incident/demande viendra en `P3.6` et `P3.7`.
              </li>
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}
