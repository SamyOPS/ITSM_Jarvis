import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import {
  translatePriority,
  translateTicketStatus,
} from '../../domain/i18n/ticketing-labels';
import { fetchUserDirectory } from '../../infrastructure/api/auth-api';
import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';
import {
  fetchAgentPerformanceReport,
  fetchReportingBreakdown,
  fetchReportingOverview,
  type AgentPerformanceReport,
  type ReportingBreakdown,
  type ReportingFilters,
  type ReportingOverview,
} from '../../infrastructure/api/reporting-api';

type ReportsPageProps = {
  session: AuthSessionSnapshot;
};

type ReportsFilterState = {
  assignedToUserId: string;
  categoryId: string;
  from: string;
  priorityId: string;
  status: '' | 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  to: string;
  type: '' | 'INCIDENT' | 'REQUEST';
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

const INITIAL_FILTERS: ReportsFilterState = {
  assignedToUserId: '',
  categoryId: '',
  from: '',
  priorityId: '',
  status: '',
  to: '',
  type: '',
};

export function ReportsPage({ session }: ReportsPageProps) {
  const [agentPerformance, setAgentPerformance] =
    useState<AgentPerformanceReport | null>(null);
  const [breakdown, setBreakdown] = useState<ReportingBreakdown | null>(null);
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportsFilterState>(INITIAL_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<ReportingOverview | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const technicians = useMemo(
    () =>
      users.filter(
        (user) =>
          user.isActive && (user.role === 'AGENT' || user.role === 'ADMIN'),
      ),
    [users],
  );
  const isPersonalAgentReporting = session.user.role === 'AGENT';

  const loadReports = useCallback(
    async (nextFilters: ReportsFilterState): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const payload = toReportingFilters(nextFilters, session);
        const [
          nextOverview,
          nextBreakdown,
          nextAgentPerformance,
          nextCatalog,
          nextUsers,
        ] = await Promise.all([
          fetchReportingOverview(session.accessToken, payload),
          fetchReportingBreakdown(session.accessToken, payload),
          fetchAgentPerformanceReport(session.accessToken, payload),
          fetchReferentialCatalog(),
          fetchUserDirectory(session.accessToken),
        ]);

        setOverview(nextOverview);
        setBreakdown(nextBreakdown);
        setAgentPerformance(nextAgentPerformance);
        setCatalog(nextCatalog);
        setUsers(nextUsers);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Erreur inconnue lors du chargement du tableau de bord',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void loadReports(filters);
  }, [filters, loadReports]);

  function handleFilterChange(
    field: keyof ReportsFilterState,
    value: string,
  ): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void loadReports(filters);
  }

  function handleResetFilters(): void {
    setFilters(INITIAL_FILTERS);
  }

  const overdueTickets =
    (overview?.totals.responseOverdue ?? 0) +
    (overview?.totals.resolutionOverdue ?? 0);
  const resolutionRate = getResolutionRate(overview);
  const statusChartItems =
    breakdown?.ticketsByStatus.map((item) => ({
      count: item.count,
      id: item.id,
      name: translateTicketStatus(item.name),
    })) ?? [];
  const priorityChartItems = breakdown?.ticketsByPriority ?? [];
  const categoryChartItems = breakdown?.ticketsByCategory ?? [];
  const dayChartItems =
    breakdown?.ticketsByDay.map((item) => ({
      count: item.count,
      id: item.date,
      name: formatChartDate(item.date),
    })) ?? [];

  return (
    <section className="reports-page">
      <form className="reports-filters" onSubmit={handleSubmit}>
        <label className="field">
          <span>Du</span>
          <input
            onChange={(event) => handleFilterChange('from', event.target.value)}
            type="date"
            value={filters.from}
          />
        </label>

        <label className="field">
          <span>Au</span>
          <input
            onChange={(event) => handleFilterChange('to', event.target.value)}
            type="date"
            value={filters.to}
          />
        </label>

        <label className="field">
          <span>Type</span>
          <select
            onChange={(event) => handleFilterChange('type', event.target.value)}
            value={filters.type}
          >
            <option value="">Tous</option>
            <option value="INCIDENT">Incident</option>
            <option value="REQUEST">Demande</option>
          </select>
        </label>

        <label className="field">
          <span>Priorite</span>
          <select
            onChange={(event) =>
              handleFilterChange('priorityId', event.target.value)
            }
            value={filters.priorityId}
          >
            <option value="">Toutes</option>
            {catalog.priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {translatePriority(priority.name)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Agent</span>
          <select
            disabled={isPersonalAgentReporting}
            onChange={(event) =>
              handleFilterChange('assignedToUserId', event.target.value)
            }
            value={filters.assignedToUserId}
          >
            <option value="">
              {isPersonalAgentReporting ? 'Moi uniquement' : 'Tous'}
            </option>
            {technicians.map((user) => (
              <option key={user.id} value={user.id}>
                {formatUserName(user)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Categorie</span>
          <select
            onChange={(event) =>
              handleFilterChange('categoryId', event.target.value)
            }
            value={filters.categoryId}
          >
            <option value="">Toutes</option>
            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="reports-filter-actions">
          <button className="primary-button" disabled={isLoading}>
            Actualiser
          </button>
          <button
            className="secondary-button"
            onClick={handleResetFilters}
            type="button"
          >
            Reinitialiser
          </button>
        </div>
      </form>

      {errorMessage ? (
        <p className="referentials-error">{errorMessage}</p>
      ) : null}

      <section className="reports-kpi-grid">
        <KpiCard
          label="Tickets ouverts"
          tone="blue"
          value={formatNumber(overview?.totals.open)}
        />
        <KpiCard
          label="Tickets en retard"
          tone="red"
          value={formatNumber(overdueTickets)}
        />
        <KpiCard
          label="Taux de resolution"
          tone="green"
          value={resolutionRate === null ? '-' : `${resolutionRate} %`}
        />
        <KpiCard
          label="Temps moyen de reponse"
          tone="orange"
          value={formatDuration(overview?.kpis.averageResponseTimeMinutes)}
        />
        <KpiCard
          label="Temps moyen de resolution"
          tone="purple"
          value={formatDuration(overview?.kpis.averageResolutionTimeMinutes)}
        />
      </section>

      <section className="reports-charts-grid">
        <ChartCard title="Tickets par statut">
          <HorizontalChart items={statusChartItems} />
        </ChartCard>

        <ChartCard title="Tickets par priorite">
          <HorizontalChart items={priorityChartItems} />
        </ChartCard>

        <ChartCard title="Tickets par categorie">
          <HorizontalChart items={categoryChartItems} />
        </ChartCard>

        <ChartCard title="Evolution par jour">
          <TrendChart items={dayChartItems} />
        </ChartCard>
      </section>

      <section className="reports-agent-performance-card">
        <header>
          <div>
            <h3>Performance agents</h3>
            <p>
              Compare les volumes assignes, les resolutions, les retards et le
              temps moyen de resolution sur la periode filtree.
            </p>
          </div>
        </header>

        <div className="reports-agent-performance-table">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Tickets assignes</th>
                <th>Tickets resolus</th>
                <th>Tickets en retard</th>
                <th>Temps moyen de resolution</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformance?.agents.length ? (
                agentPerformance.agents.map((agent) => (
                  <tr key={agent.agentId}>
                    <td>{agent.agentName}</td>
                    <td>{agent.ticketsAssigned}</td>
                    <td>{agent.ticketsResolved}</td>
                    <td>{agent.ticketsOverdue}</td>
                    <td>
                      {formatDuration(agent.averageResolutionTimeMinutes)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Aucune donnee agent.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reports-breakdown-grid">
        <BreakdownCard
          items={breakdown?.ticketsByAgent ?? []}
          title="Par agent"
        />
        <BreakdownCard
          items={breakdown?.ticketsByCategory ?? []}
          title="Par categorie"
        />
        <BreakdownCard
          items={breakdown?.ticketsByPriority ?? []}
          title="Par priorite"
        />
        <BreakdownCard
          items={
            breakdown?.ticketsByStatus.map((item) => ({
              ...item,
              name: translateTicketStatus(item.name),
            })) ?? []
          }
          title="Par statut"
        />
        <BreakdownCard
          items={
            breakdown?.ticketsByDay.map((item) => ({
              count: item.count,
              id: item.date,
              name: item.date,
            })) ?? []
          }
          title="Par periode"
        />
      </section>
    </section>
  );
}

function ChartCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <article className="reports-chart-card">
      <header>
        <h3>{title}</h3>
        <span>Graphique</span>
      </header>
      {children}
    </article>
  );
}

function HorizontalChart({
  items,
}: {
  items: Array<{ count: number; id: string | null; name: string }>;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 0);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  return (
    <div className="reports-horizontal-chart">
      {items.slice(0, 8).map((item) => {
        const percent = max > 0 ? (item.count / max) * 100 : 0;
        const share = total > 0 ? Math.round((item.count / total) * 100) : 0;

        return (
          <div className="reports-chart-row" key={item.id ?? item.name}>
            <div>
              <span>{item.name}</span>
              <strong>
                {item.count} ticket{item.count > 1 ? 's' : ''} - {share} %
              </strong>
            </div>
            <div className="reports-chart-track">
              <span
                style={
                  {
                    '--bar-value': `${Math.max(7, percent)}%`,
                  } as CSSProperties
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({
  items,
}: {
  items: Array<{ count: number; id: string; name: string }>;
}) {
  const max = Math.max(...items.map((item) => item.count), 0);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  return (
    <div className="reports-trend-chart">
      {items.slice(-10).map((item) => {
        const percent = max > 0 ? (item.count / max) * 100 : 0;

        return (
          <div className="reports-trend-column" key={item.id}>
            <div>
              <span
                style={
                  {
                    '--bar-value': `${Math.max(10, percent)}%`,
                  } as CSSProperties
                }
              />
            </div>
            <strong>{item.count}</strong>
            <span>{item.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <article className={`reports-kpi-card reports-kpi-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function BreakdownCard({
  items,
  title,
}: {
  items: Array<{ count: number; id: string | null; name: string }>;
  title: string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <article className="reports-breakdown-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>Aucune donnee.</p>
      ) : (
        <div className="reports-breakdown-list">
          {items.slice(0, 8).map((item) => (
            <div className="reports-breakdown-row" key={item.id ?? item.name}>
              <span>{item.name}</span>
              <strong>{item.count}</strong>
              <div>
                <span
                  style={{
                    width: `${total > 0 ? Math.max(8, (item.count / total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function toReportingFilters(
  filters: ReportsFilterState,
  session: AuthSessionSnapshot,
): ReportingFilters {
  return {
    assignedToUserId:
      session.user.role === 'AGENT'
        ? session.user.id
        : normalizeOptionalText(filters.assignedToUserId),
    categoryId: normalizeOptionalText(filters.categoryId),
    from: normalizeOptionalText(filters.from),
    priorityId: normalizeOptionalText(filters.priorityId),
    status: filters.status || null,
    to: normalizeOptionalText(filters.to),
    type: filters.type || null,
  };
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();

  return normalized ? normalized : null;
}

function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || user.email || user.id;
}

function getResolutionRate(overview: ReportingOverview | null): number | null {
  if (!overview || overview.totals.total === 0) {
    return null;
  }

  return Math.round(
    ((overview.totals.resolved + overview.totals.closed) /
      overview.totals.total) *
      100,
  );
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) {
    return '-';
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : String(value);
}

function formatChartDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}
