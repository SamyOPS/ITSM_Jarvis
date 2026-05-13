import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';

import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';

import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';

import { translateChannel } from '../../domain/i18n/ticketing-labels';

import { fetchUserDirectory } from '../../infrastructure/api/auth-api';

import { fetchReferentialCatalog } from '../../infrastructure/api/referentials-api';

import type {
  ReportingBreakdownItem,
  ReportingStatusPeriodItem,
  ReportingTimelineItem,
} from '../../infrastructure/api/reporting-api';

import { searchTickets } from '../../infrastructure/api/ticketing-api';

type ReportsPageProps = {
  session: AuthSessionSnapshot;
};

type PeriodPreset =
  | ''
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_3_MONTHS'
  | 'LAST_6_MONTHS';

type ReportsFilterState = {
  assignedToUserId: string;

  assignmentGroupId: string;

  categoryId: string;

  from: string;

  periodPreset: PeriodPreset;

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
};

const INITIAL_FILTERS: ReportsFilterState = {
  assignedToUserId: '',

  assignmentGroupId: '',

  categoryId: '',

  from: '',

  periodPreset: 'LAST_30_DAYS',

  priorityId: '',

  status: '',

  to: '',

  type: '',
};

export function ReportsPage({ session }: ReportsPageProps) {
  const [catalog, setCatalog] =
    useState<ReferentialCatalogSnapshot>(EMPTY_CATALOG);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<ReportsFilterState>(INITIAL_FILTERS);

  const [isLoading, setIsLoading] = useState(true);

  const [tickets, setTickets] = useState<TicketSummarySnapshot[]>([]);

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
        const [nextTickets, nextCatalog, nextUsers] = await Promise.all([
          searchTickets(session.accessToken, {
            categoryId: normalizeOptionalText(nextFilters.categoryId),

            includeArchived: false,

            priorityId: normalizeOptionalText(nextFilters.priorityId),

            status: nextFilters.status || null,

            type: nextFilters.type || null,
          }),

          fetchReferentialCatalog(),

          fetchUserDirectory(session.accessToken),
        ]);

        setTickets(nextTickets);

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
    setFilters((currentFilters) => applyPeriodPreset(currentFilters));
  }, []);

  useEffect(() => {
    void loadReports(filters);
  }, [filters, loadReports]);

  function handleFilterChange(
    field: keyof ReportsFilterState,

    value: string,
  ): void {
    setFilters((currentFilters) => {
      if (field === 'periodPreset') {
        return applyPeriodPreset({
          ...currentFilters,

          periodPreset: value as PeriodPreset,
        });
      }

      if (field === 'from' || field === 'to') {
        return {
          ...currentFilters,

          [field]: value,

          periodPreset: '',
        };
      }

      return {
        ...currentFilters,

        [field]: value,
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    void loadReports(filters);
  }

  function handleResetFilters(): void {
    setFilters(applyPeriodPreset(INITIAL_FILTERS));
  }

  const scopedTickets = useMemo(
    () => filterTicketsForDashboard(tickets, filters, session),

    [filters, session, tickets],
  );

  const overview = useMemo(
    () => buildDashboardOverview(scopedTickets),

    [scopedTickets],
  );

  const timelineItems = useMemo(
    () => buildTicketActivityTimeline(scopedTickets),

    [scopedTickets],
  );

  const statusPeriodItems = useMemo(
    () => buildTicketStatusPeriod(scopedTickets),

    [scopedTickets],
  );

  const categoryWidgetItems = useMemo(
    () =>
      countDashboardBreakdown(
        scopedTickets,

        (ticket) => ticket.categoryId,

        (categoryId) =>
          categoryId
            ? (catalog.categories.find((category) => category.id === categoryId)
                ?.name ?? categoryId)
            : 'Non definie',
      ),

    [catalog.categories, scopedTickets],
  );

  const channelWidgetItems = useMemo(
    () =>
      countDashboardBreakdown(
        scopedTickets,

        (ticket) => ticket.channelId,

        (channelId) =>
          channelId
            ? getChannelDisplayName(
                {
                  count: 0,

                  id: channelId,

                  name: channelId,
                },

                catalog,
              )
            : 'Non renseigne',
      ),

    [catalog, scopedTickets],
  );

  const agentWidgetItems = useMemo(
    () =>
      countDashboardBreakdown(
        scopedTickets,

        (ticket) => ticket.assignedToUserId,

        (userId) => formatAssignedUserName(userId, users),
      ),

    [scopedTickets, users],
  );

  return (
    <section className="reports-page">
      <form className="reports-filter-band" onSubmit={handleSubmit}>
        <header className="reports-filter-band-header">
          <div>
            <h2>Tableau de bord</h2>

            <p>Vue globale des indicateurs et tendances des tickets.</p>
          </div>
        </header>

        <div className="reports-filters">
          <label className="field">
            <span>Periode</span>

            <select
              onChange={(event) =>
                handleFilterChange('periodPreset', event.target.value)
              }
              value={filters.periodPreset}
            >
              <option value="">Personnalisée</option>

              <option value="LAST_7_DAYS">7 jours</option>

              <option value="LAST_30_DAYS">30 jours</option>

              <option value="LAST_3_MONTHS">3 mois</option>

              <option value="LAST_6_MONTHS">6 mois</option>
            </select>
          </label>

          <label className="field">
            <span>Du</span>

            <input
              onChange={(event) =>
                handleFilterChange('from', event.target.value)
              }
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
            <span>Type de ticket</span>

            <select
              onChange={(event) =>
                handleFilterChange('type', event.target.value)
              }
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
                  {priority.name}
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
            <span>Groupe</span>

            <select
              disabled={isPersonalAgentReporting}
              onChange={(event) =>
                handleFilterChange('assignmentGroupId', event.target.value)
              }
              value={filters.assignmentGroupId}
            >
              <option value="">Tous</option>

              {catalog.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
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
        </div>
      </form>

      {errorMessage ? (
        <p className="referentials-error">{errorMessage}</p>
      ) : null}

      <section className="reports-dashboard">
        <div className="reports-dashboard-kpis">
          <DashboardPrimaryKpiCard
            label="Tickets"
            tone="yellow"
            value={formatNumber(overview.total)}
          />

          <DashboardPrimaryKpiCard
            label="Tickets en retard"
            tone="orange"
            value={formatNumber(overview.overdue)}
          />

          <DashboardPrimaryKpiCard
            label="Incidents"
            tone="salmon"
            value={formatNumber(overview.incidents)}
          />

          <DashboardPrimaryKpiCard
            label="Demandes"
            tone="green"
            value={formatNumber(overview.requests)}
          />

          <DashboardMiniKpiCard
            label="Tickets entrants"
            tone="mint"
            value={formatNumber(overview.total)}
          />

          <DashboardMiniKpiCard
            label="Tickets assignes"
            tone="sky"
            value={formatNumber(overview.assigned)}
          />

          <DashboardMiniKpiCard
            label="Tickets resolus"
            tone="silver"
            value={formatNumber(overview.resolved)}
          />

          <DashboardMiniKpiCard
            label="Tickets non assignes"
            tone="white"
            value={formatNumber(overview.unassigned)}
          />

          <DashboardMiniKpiCard
            label="Tickets en attente"
            tone="amber"
            value={formatNumber(overview.pending)}
          />

          <DashboardMiniKpiCard
            label="Tickets fermes"
            tone="charcoal"
            value={formatNumber(overview.closed)}
          />
        </div>

        <div className="reports-dashboard-charts">
          <DashboardPanel title="Evolution des tickets">
            <DashboardTimelineChart items={timelineItems} />
          </DashboardPanel>

          <DashboardPanel title="Statuts des tickets par mois">
            <DashboardStackedStatusChart items={statusPeriodItems} />
          </DashboardPanel>
        </div>

        <div className="reports-dashboard-tops">
          <DashboardPanel title="Top categories de tickets">
            <DashboardDonutWidget items={categoryWidgetItems} />
          </DashboardPanel>

          <DashboardPanel title="Top sources de tickets">
            <DashboardBarWidget items={channelWidgetItems} />
          </DashboardPanel>

          <DashboardPanel title="Top agents assignes">
            <DashboardDonutWidget items={agentWidgetItems} />
          </DashboardPanel>
        </div>
      </section>
    </section>
  );
}

function DashboardPanel({
  children,

  className,

  title,
}: {
  children: React.ReactNode;

  className?: string;

  title: string;
}) {
  return (
    <article
      className={
        className
          ? `reports-dashboard-panel ${className}`
          : 'reports-dashboard-panel'
      }
    >
      <header className="reports-dashboard-panel-header">
        <h3>{title}</h3>
      </header>

      {children}
    </article>
  );
}

function DashboardPrimaryKpiCard({
  label,

  tone,

  value,
}: {
  label: string;

  tone: string;

  value: string;
}) {
  return (
    <article className={`reports-primary-kpi reports-primary-kpi--${tone}`}>
      <strong>{value}</strong>

      <span>{label}</span>
    </article>
  );
}

function DashboardMiniKpiCard({
  label,

  tone,

  value,
}: {
  label: string;

  tone: string;

  value: string;
}) {
  return (
    <article className={`reports-mini-kpi reports-mini-kpi--${tone}`}>
      <strong>{value}</strong>

      <span>{label}</span>
    </article>
  );
}

function DashboardTimelineChart({ items }: { items: ReportingTimelineItem[] }) {
  const [tooltipState, setTooltipState] = useState<{
    align: 'center' | 'left' | 'right';
    index: number;
    left: string;
    top: string;
  } | null>(null);
  const hideTooltip = () => setTooltipState(null);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const width = 820;
  const height = 304;
  const paddingLeft = 52;
  const paddingRight = 18;
  const paddingTop = 14;
  const paddingBottom = 18;

  const maxValue = Math.max(
    ...items.flatMap((item) => [
      item.open,
      item.resolved,
      item.overdue,
      item.closed,
    ]),
    1,
  );
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const baselineY = paddingTop + chartHeight;
  const activeItem = tooltipState ? items[tooltipState.index] : null;
  const yTicks = Array.from({ length: 6 }, (_, index) =>
    Math.round((maxValue / 5) * (5 - index)),
  );
  const series = [
    {
      key: 'open' as const,
      color: '#4f7fb5',
      fill: 'rgba(79, 127, 181, 0.14)',
      label: 'Ouverts',
    },
    {
      key: 'resolved' as const,
      color: '#f09a34',
      fill: 'rgba(240, 154, 52, 0.12)',
      label: 'Resolus',
    },
    {
      key: 'overdue' as const,
      color: '#e55d59',
      fill: 'rgba(229, 93, 89, 0.1)',
      label: 'En retard',
    },
    {
      key: 'closed' as const,
      color: '#7cc3c6',
      fill: 'rgba(124, 195, 198, 0.1)',
      label: 'Clos',
    },
  ];
  return (
    <div className="reports-timeline-card" onMouseLeave={hideTooltip}>
      <div className="reports-chart-legend">
        {series.map((item) => (
          <span key={item.key}>
            <i className={`reports-line-key reports-line-key--${item.key}`} />
            {item.label}
          </span>
        ))}
      </div>

      <svg className="reports-timeline-svg" viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((tickValue, index) => {
          const y = paddingTop + (chartHeight / 5) * index;

          return (
            <g key={tickValue}>
              <line
                className="reports-grid-line"
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
              />
              <text
                className="reports-grid-label"
                x={paddingLeft - 10}
                y={y + 4}
              >
                {formatChartValue(tickValue)}
              </text>
            </g>
          );
        })}

        {series.map((item) =>
          renderTimelineSeries(
            items,
            item.key,
            maxValue,
            chartWidth,
            chartHeight,
            paddingLeft,
            paddingTop,
            baselineY,
            item.color,
            item.fill,
            setTooltipState,
            items.length,
            hideTooltip,
          ),
        )}
      </svg>

      {activeItem ? (
        <ChartTooltip
          align={tooltipState?.align ?? 'center'}
          className="reports-chart-tooltip--timeline"
          items={[
            {
              color: '#4f7fb5',
              label: 'Ouverts',
              value: activeItem.open,
            },
            {
              color: '#f09a34',
              label: 'Resolus',
              value: activeItem.resolved,
            },
            {
              color: '#e55d59',
              label: 'En retard',
              value: activeItem.overdue,
            },
            {
              color: '#7cc3c6',
              label: 'Clos',
              value: activeItem.closed,
            },
          ]}
          left={tooltipState?.left ?? '50%'}
          top={tooltipState?.top}
          title={activeItem.period}
        />
      ) : null}

      <div className="reports-timeline-labels">
        {items.map((item) => (
          <span key={item.period}>{formatPeriodLabel(item.period)}</span>
        ))}
      </div>
    </div>
  );
}

function renderTimelineSeries(
  items: ReportingTimelineItem[],
  key: 'closed' | 'open' | 'overdue' | 'resolved',
  maxValue: number,
  chartWidth: number,
  chartHeight: number,
  paddingLeft: number,
  paddingTop: number,
  baselineY: number,
  color: string,
  fill: string,
  setTooltipState: Dispatch<
    SetStateAction<{
      align: 'center' | 'left' | 'right';
      index: number;
      left: string;
      top: string;
    } | null>
  >,
  itemCount: number,
  hideTooltip: () => void,
) {
  const points = buildTimelinePoints(
    items,
    key,
    maxValue,
    chartWidth,
    chartHeight,
    paddingLeft,
    paddingTop,
  );
  const linePath = buildSmoothSvgPath(points);
  const areaPath = buildAreaSvgPath(points, baselineY);

  return (
    <g key={key}>
      <path className="reports-area-path" d={areaPath} fill={fill} />
      <path
        className="reports-line-path"
        d={linePath}
        fill="none"
        stroke={color}
      />
      {points.map((point, index) => (
        <g key={`${key}-${index}`}>
          <circle
            className="reports-line-point-hitbox"
            cx={point.x}
            cy={point.y}
            fill="transparent"
            onMouseLeave={hideTooltip}
            onMouseMove={(event) => {
              const container = event.currentTarget.closest(
                '.reports-timeline-card',
              );

              if (!(container instanceof HTMLDivElement)) {
                return;
              }

              const containerRect = container.getBoundingClientRect();
              const align = index >= itemCount - 1 ? 'right' : 'left';
              const topPx = clampNumber(
                event.clientY - containerRect.top - 16,
                52,
                Math.max(52, containerRect.height - 160),
              );
              const horizontalOffsetPx = align === 'left' ? 28 : -28;

              setTooltipState({
                align,
                index,
                left: `${point.x + horizontalOffsetPx}px`,
                top: `${topPx}px`,
              });
            }}
            r="16"
          />
          <circle
            className="reports-line-point"
            cx={point.x}
            cy={point.y}
            fill={color}
            r="4"
          />
        </g>
      ))}
    </g>
  );
}

function buildTimelinePoints(
  items: ReportingTimelineItem[],
  key: 'closed' | 'open' | 'overdue' | 'resolved',
  maxValue: number,
  chartWidth: number,
  chartHeight: number,
  paddingLeft: number,
  paddingTop: number,
): Array<{ x: number; y: number }> {
  const denominator = Math.max(1, items.length - 1);

  return items.map((item, index) => {
    const x = paddingLeft + (chartWidth / denominator) * index;
    const y =
      paddingTop +
      chartHeight -
      (Math.max(0, item[key]) / maxValue) * chartHeight;

    return { x, y };
  });
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const distanceX = current.x - previous.x;
    const tension = 0.32;
    const controlX1 = previous.x + distanceX * tension;
    const controlX2 = current.x - distanceX * tension;

    path += ` C ${controlX1} ${previous.y}, ${controlX2} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
}

function buildAreaSvgPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number,
): string {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildSmoothSvgPath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

function DashboardStackedStatusChart({
  items,
}: {
  items: ReportingStatusPeriodItem[];
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [tooltipState, setTooltipState] = useState<{
    align: 'left' | 'right';
    index: number;
    left: string;
    segment: {
      color: string;
      label: string;
      value: number;
    };
    top: string;
  } | null>(null);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const maxTotal = Math.max(
    ...items.map(
      (item) =>
        item.open +
        item.inProgress +
        item.pending +
        item.resolved +
        item.closed,
    ),

    1,
  );
  const chartHeightPx = 220;
  const activeItem = tooltipState ? items[tooltipState.index] : null;

  return (
    <div className="reports-status-period-chart" ref={chartRef}>
      <div className="reports-chart-legend">
        <span>
          <i className="reports-status-key reports-status-key--open" />
          Ouvert
        </span>

        <span>
          <i className="reports-status-key reports-status-key--progress" />
          En cours
        </span>

        <span>
          <i className="reports-status-key reports-status-key--pending" />
          En attente
        </span>

        <span>
          <i className="reports-status-key reports-status-key--resolved" />
          Resolu
        </span>

        <span>
          <i className="reports-status-key reports-status-key--closed" />
          Clos
        </span>
      </div>

      {activeItem ? (
        <ChartTooltip
          align={tooltipState?.align ?? 'left'}
          className="reports-chart-tooltip--status"
          items={tooltipState ? [tooltipState.segment] : []}
          left={tooltipState?.left ?? '50%'}
          top={tooltipState?.top}
          title={activeItem.period}
        />
      ) : null}

      <div className="reports-status-period-columns">
        {items.map((item, index) => {
          const total =
            item.open +
            item.inProgress +
            item.pending +
            item.resolved +
            item.closed;

          const height = `${total <= 0 ? 0 : (total / maxTotal) * chartHeightPx}px`;

          return (
            <div className="reports-status-period-column" key={item.period}>
              <strong>{total}</strong>
              <div
                className="reports-status-period-stack"
                style={{ height } as CSSProperties}
              >
                {renderStackSegment(
                  item.open,
                  total,
                  'open',
                  'Ouvert',
                  '#3b6ca8',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.inProgress,
                  total,
                  'progress',
                  'En cours',
                  '#f1972c',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.pending,
                  total,
                  'pending',
                  'En attente',
                  '#6bb45a',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.resolved,
                  total,
                  'resolved',
                  'Resolu',
                  '#f2cb4d',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}

                {renderStackSegment(
                  item.closed,
                  total,
                  'closed',
                  'Clos',
                  '#b07ca7',
                  index,
                  items.length,
                  chartRef,
                  setTooltipState,
                )}
              </div>

              <span>{formatPeriodLabel(item.period)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartTooltip({
  align = 'center',
  className,
  items,
  left,
  top,
  title,
}: {
  align?: 'center' | 'left' | 'right';
  className?: string;
  items: Array<{ color: string; label: string; value: number }>;
  left: string;
  top?: string;
  title: string;
}) {
  return (
    <div
      className={
        className
          ? `reports-chart-tooltip reports-chart-tooltip--${align} ${className}`
          : 'reports-chart-tooltip'
      }
      style={{ left, top } as CSSProperties}
    >
      <strong>{formatTooltipPeriod(title)}</strong>
      <div className="reports-chart-tooltip-list">
        {items.map((item) => (
          <div className="reports-chart-tooltip-row" key={item.label}>
            <span>
              <i style={{ background: item.color } as CSSProperties} />
              {item.label}
            </span>
            <b>{formatNumber(item.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderStackSegment(
  value: number,

  total: number,

  tone: 'closed' | 'open' | 'pending' | 'progress' | 'resolved',
  label: string,
  color: string,
  columnIndex: number,
  itemCount: number,
  chartRef: RefObject<HTMLDivElement | null>,
  setTooltipState: Dispatch<
    SetStateAction<{
      align: 'left' | 'right';
      index: number;
      left: string;
      segment: {
        color: string;
        label: string;
        value: number;
      };
      top: string;
    } | null>
  >,
) {
  if (value <= 0 || total <= 0) {
    return null;
  }

  return (
    <span
      className={`reports-stack-segment reports-stack-segment--${tone}`}
      onMouseLeave={() => setTooltipState(null)}
      onMouseMove={(event) => {
        if (!chartRef.current) {
          return;
        }

        const chartRect = chartRef.current.getBoundingClientRect();
        const segmentRect = event.currentTarget.getBoundingClientRect();
        const align = columnIndex >= itemCount - 1 ? 'right' : 'left';
        const horizontalOffsetPx = 20;
        const leftPx =
          align === 'left'
            ? segmentRect.right - chartRect.left + horizontalOffsetPx
            : segmentRect.left - chartRect.left - horizontalOffsetPx;
        const estimatedTooltipHeightPx = 86;
        const topPx = clampNumber(
          event.clientY - chartRect.top - 14,
          56,
          Math.max(56, chartRect.height - estimatedTooltipHeightPx),
        );

        setTooltipState({
          align,
          index: columnIndex,
          left: `${leftPx}px`,
          segment: {
            color,
            label,
            value,
          },
          top: `${topPx}px`,
        });
      }}
      style={{ height: `${(value / total) * 100}%` } as CSSProperties}
    />
  );
}

function DashboardDonutWidget({ items }: { items: ReportingBreakdownItem[] }) {
  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const topItems = items.slice(0, 5);

  const total = topItems.reduce((sum, item) => sum + item.count, 0);

  const colors = ['#3a8f18', '#68c62e', '#95de6f', '#b6e7a1', '#d5f1cd'];

  const segments = topItems

    .reduce<{ nextOffset: number; parts: string[] }>(
      (accumulator, item, index) => {
        const value = total > 0 ? (item.count / total) * 100 : 0;

        const currentOffset = accumulator.nextOffset;

        accumulator.parts.push(
          `${colors[index % colors.length]} ${currentOffset}% ${currentOffset + value}%`,
        );

        return {
          nextOffset: currentOffset + value,

          parts: accumulator.parts,
        };
      },

      { nextOffset: 0, parts: [] },
    )

    .parts.join(', ');

  return (
    <div className="reports-donut-widget">
      <div
        className="reports-donut-visual"
        style={{ background: `conic-gradient(${segments})` } as CSSProperties}
      >
        <span>{formatNumber(total)}</span>
      </div>

      <div className="reports-widget-list">
        {topItems.map((item, index) => (
          <div className="reports-widget-row" key={item.id ?? item.name}>
            <span>
              <i
                style={
                  { background: colors[index % colors.length] } as CSSProperties
                }
              />

              {item.name}
            </span>

            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardBarWidget({ items }: { items: ReportingBreakdownItem[] }) {
  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const topItems = items.slice(0, 5);

  const maxValue = Math.max(...topItems.map((item) => item.count), 1);

  return (
    <div className="reports-widget-bars">
      {topItems.map((item) => (
        <div className="reports-widget-bar-row" key={item.id ?? item.name}>
          <span>{item.name}</span>

          <div>
            <strong>{item.count}</strong>

            <i
              style={
                { width: `${(item.count / maxValue) * 100}%` } as CSSProperties
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function applyPeriodPreset(filters: ReportsFilterState): ReportsFilterState {
  if (!filters.periodPreset) {
    return filters;
  }

  const range = getPeriodPresetRange(filters.periodPreset);

  return {
    ...filters,

    from: range.from,

    to: range.to,
  };
}

function getPeriodPresetRange(preset: Exclude<PeriodPreset, ''>): {
  from: string;

  to: string;
} {
  const today = new Date();
  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (preset === 'LAST_3_MONTHS') {
    return {
      from: formatDateInputValue(
        new Date(endOfToday.getFullYear(), endOfToday.getMonth() - 2, 1),
      ),
      to: formatDateInputValue(endOfToday),
    };
  }

  if (preset === 'LAST_6_MONTHS') {
    return {
      from: formatDateInputValue(
        new Date(endOfToday.getFullYear(), endOfToday.getMonth() - 5, 1),
      ),
      to: formatDateInputValue(endOfToday),
    };
  }

  const days = preset === 'LAST_7_DAYS' ? 6 : 29;
  const start = new Date(endOfToday);

  start.setDate(start.getDate() - days);

  return {
    from: formatDateInputValue(start),
    to: formatDateInputValue(endOfToday),
  };
}

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, '0');

  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

function formatAssignedUserName(
  userId: string | null,

  users: AdminUserSummary[],
): string {
  if (!userId) {
    return 'Non assigne';
  }

  return formatUserName(
    users.find((user) => user.id === userId) ?? {
      displayName: null,

      email: null,

      firstName: null,

      groupId: null,

      id: userId,

      isActive: true,

      lastName: null,

      role: 'AGENT',
    },
  );
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : String(value);
}

function formatChartValue(value: number): string {
  if (value >= 1000) {
    return (
      new Intl.NumberFormat('fr-FR', {
        maximumFractionDigits: 1,
        minimumFractionDigits: value % 1000 === 0 ? 0 : 1,
      }).format(value / 1000) + 'K'
    );
  }

  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatTooltipPeriod(value: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatPeriodLabel(value: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: '2-digit',

    year: '2-digit',
  }).format(date);
}

function getChannelDisplayName(
  item: ReportingBreakdownItem,

  catalog: ReferentialCatalogSnapshot,
): string {
  if (!item.id) {
    return item.name;
  }

  const channelName = catalog.channels.find(
    (channel) => channel.id === item.id,
  )?.name;

  return channelName ? translateChannel(channelName) : item.name;
}

function filterTicketsForDashboard(
  tickets: TicketSummarySnapshot[],

  filters: ReportsFilterState,

  session: AuthSessionSnapshot,
): TicketSummarySnapshot[] {
  const fromTime = getDateBoundaryTimestamp(filters.from, 'start');

  const toTime = getDateBoundaryTimestamp(filters.to, 'end');

  const assignedToUserId =
    session.user.role === 'AGENT'
      ? session.user.id
      : normalizeOptionalText(filters.assignedToUserId);

  const assignmentGroupId = normalizeOptionalText(filters.assignmentGroupId);

  return tickets.filter((ticket) => {
    const createdAtTime = new Date(ticket.createdAt).getTime();

    if (
      fromTime !== null &&
      (Number.isNaN(createdAtTime) || createdAtTime < fromTime)
    ) {
      return false;
    }

    if (
      toTime !== null &&
      (Number.isNaN(createdAtTime) || createdAtTime > toTime)
    ) {
      return false;
    }

    if (assignedToUserId && ticket.assignedToUserId !== assignedToUserId) {
      return false;
    }

    if (assignmentGroupId && ticket.assignmentGroupId !== assignmentGroupId) {
      return false;
    }

    return true;
  });
}

function getDateBoundaryTimestamp(
  value: string,

  boundary: 'end' | 'start',
): number | null {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const [yearText, monthText, dayText] = normalized.split('-');

  const year = Number(yearText);

  const month = Number(monthText);

  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  const date =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);

  return date.getTime();
}

function buildDashboardOverview(tickets: TicketSummarySnapshot[]) {
  return {
    assigned: tickets.filter((ticket) => Boolean(ticket.assignedToUserId))
      .length,

    closed: tickets.filter((ticket) => ticket.status === 'CLOSED').length,

    incidents: tickets.filter((ticket) => ticket.type === 'INCIDENT').length,

    overdue: tickets.filter(isTicketOverdue).length,

    pending: tickets.filter((ticket) => ticket.status === 'PENDING').length,

    requests: tickets.filter((ticket) => ticket.type === 'REQUEST').length,

    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,

    total: tickets.length,

    unassigned: tickets.filter((ticket) => !ticket.assignedToUserId).length,
  };
}

function buildTicketActivityTimeline(
  tickets: TicketSummarySnapshot[],
): ReportingTimelineItem[] {
  const buckets = new Map<string, ReportingTimelineItem>();

  for (const ticket of tickets) {
    const period = ticket.createdAt.slice(0, 7);

    const current = buckets.get(period) ?? {
      closed: 0,

      open: 0,

      overdue: 0,

      period,

      resolved: 0,
    };

    if (
      ticket.status === 'OPEN' ||
      ticket.status === 'IN_PROGRESS' ||
      ticket.status === 'PENDING'
    ) {
      current.open += 1;
    }

    if (ticket.status === 'RESOLVED') {
      current.resolved += 1;
    }

    if (ticket.status === 'CLOSED') {
      current.closed += 1;
    }

    if (isTicketOverdue(ticket)) {
      current.overdue += 1;
    }

    buckets.set(period, current);
  }

  return [...buckets.values()].sort((left, right) =>
    left.period.localeCompare(right.period),
  );
}

function buildTicketStatusPeriod(
  tickets: TicketSummarySnapshot[],
): ReportingStatusPeriodItem[] {
  const buckets = new Map<string, ReportingStatusPeriodItem>();

  for (const ticket of tickets) {
    const period = ticket.createdAt.slice(0, 7);

    const current = buckets.get(period) ?? {
      closed: 0,

      inProgress: 0,

      open: 0,

      pending: 0,

      period,

      resolved: 0,
    };

    if (ticket.status === 'OPEN') {
      current.open += 1;
    } else if (ticket.status === 'IN_PROGRESS') {
      current.inProgress += 1;
    } else if (ticket.status === 'PENDING') {
      current.pending += 1;
    } else if (ticket.status === 'RESOLVED') {
      current.resolved += 1;
    } else if (ticket.status === 'CLOSED') {
      current.closed += 1;
    }

    buckets.set(period, current);
  }

  return [...buckets.values()].sort((left, right) =>
    left.period.localeCompare(right.period),
  );
}

function countDashboardBreakdown(
  tickets: TicketSummarySnapshot[],

  getKey: (ticket: TicketSummarySnapshot) => string | null,

  getName: (key: string | null) => string,
): ReportingBreakdownItem[] {
  const counters = new Map<string, { count: number; id: string | null }>();

  for (const ticket of tickets) {
    const id = getKey(ticket);

    const key = id ?? '__null__';

    const current = counters.get(key) ?? { count: 0, id };

    counters.set(key, {
      ...current,

      count: current.count + 1,
    });
  }

  return [...counters.values()]

    .map((item) => ({
      count: item.count,

      id: item.id,

      name: getName(item.id),
    }))

    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name),
    );
}

function isTicketOverdue(ticket: TicketSummarySnapshot): boolean {
  return (
    ticket.responseSlaStatus === 'OVERDUE' ||
    ticket.resolutionSlaStatus === 'OVERDUE'
  );
}
