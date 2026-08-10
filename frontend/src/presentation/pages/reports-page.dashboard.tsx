/* eslint-disable react-refresh/only-export-components */
import {
  type CSSProperties,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SetStateAction,
  useMemo,
  useState,
} from 'react';
import { X } from 'lucide-react';
import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import {
  translatePriority,
  translateTicketType,
} from '../../domain/i18n/ticketing-labels';
import type { ReferentialCatalogSnapshot } from '../../domain/referentials/referential-catalog';
import type { TicketSummarySnapshot } from '../../domain/ticketing/ticket-summary';
import type {
  ReportingBreakdownItem,
  ReportingOverview,
  ReportingTimelineItem,
} from '../../infrastructure/api/reporting-api';
import { AppPagination } from '../components/app-pagination';
import {
  clampNumber,
  formatAssignedUserName,
  formatChartValue,
  formatNumber,
  formatPeriodLabel,
  formatTooltipPeriod,
  formatUserName,
  getChannelDisplayName,
} from './reports-page.helpers';
import type { ReportsFilterState } from './reports-page.types';

const TIMELINE_TOOLTIP_WIDTH = 190;

export type DashboardActivityChartKey =
  | 'AGENT'
  | 'CATEGORY'
  | 'GROUP'
  | 'PRIORITY'
  | 'SLA'
  | 'SOURCE'
  | 'TYPE';

export type DashboardTicketActivityMode = 'ACTIVE' | 'ALL';

export const INITIAL_DASHBOARD_ACTIVITY_MODES: Record<
  DashboardActivityChartKey,
  DashboardTicketActivityMode
> = {
  AGENT: 'ACTIVE',
  CATEGORY: 'ACTIVE',
  GROUP: 'ACTIVE',
  PRIORITY: 'ACTIVE',
  SLA: 'ACTIVE',
  SOURCE: 'ACTIVE',
  TYPE: 'ACTIVE',
};
export function DashboardPanel({
  activityMode,

  children,

  className,

  onActivityModeChange,

  title,
}: {
  activityMode?: DashboardTicketActivityMode;

  children: ReactNode;

  className?: string;

  onActivityModeChange?: (isActive: boolean) => void;

  title: string;
}) {
  const descriptions: Record<string, string> = {
    'Evolution des tickets': 'Tendance sur la periode selectionnee',
    'Respect SLA/TTR': 'Performance des delais de resolution',
    'Sources des tickets': 'Repartition par source de creation',
    'Tickets par agent': 'Repartition des tickets actifs par technicien',
    'Tickets par categorie': 'Volume par domaine de support',
    'Tickets par groupe': 'Repartition des tickets actifs par equipe',
    'Tickets par priorite': 'Repartition par niveau de priorite',
    'Tickets par type': 'Repartition incidents et demandes',
  };

  return (
    <article
      className={
        className
          ? `reports-dashboard-panel ${className}`
          : 'reports-dashboard-panel'
      }
    >
      <header className="reports-dashboard-panel-header">
        <div>
          <h3>{title}</h3>

          <p>{descriptions[title]}</p>
        </div>

        {activityMode && onActivityModeChange ? (
          <label className="reports-dashboard-activity-toggle">
            <span>
              {activityMode === 'ACTIVE'
                ? 'tickets actifs'
                : 'tous les tickets'}
            </span>

            <input
              checked={activityMode === 'ACTIVE'}
              onChange={(event) =>
                onActivityModeChange(event.currentTarget.checked)
              }
              type="checkbox"
            />

            <i aria-hidden="true" />
          </label>
        ) : null}
      </header>

      {children}
    </article>
  );
}

export function DashboardKpiCard({
  label,

  tone,

  value,
}: {
  label: string;

  tone: string;

  value: string;
}) {
  return (
    <article className={`reports-dashboard-kpi reports-dashboard-kpi--${tone}`}>
      <header>
        <span>{label}</span>

        <i aria-hidden="true" />
      </header>

      <strong>{value}</strong>
    </article>
  );
}

type DashboardLookupSearchField =
  | 'FIRST_NAME'
  | 'IDENTIFIER'
  | 'LAST_NAME'
  | 'NAME';

export function DashboardLookupDialog({
  groups,

  kind,

  onClose,

  onSelect,

  selectedId,

  users,
}: {
  groups: ReferentialCatalogSnapshot['groups'];

  kind: 'AGENT' | 'GROUP';

  onClose: () => void;

  onSelect: (id: string) => void;

  selectedId: string;

  users: AdminUserSummary[];
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const [searchField, setSearchField] =
    useState<DashboardLookupSearchField>('IDENTIFIER');

  const [page, setPage] = useState(1);

  const pageSize = 8;

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('fr-FR');

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const searchableText = getDashboardUserLookupSearchValue(
          user,
          searchField,
        ).toLocaleLowerCase('fr-FR');

        return searchableText.includes(normalizedSearch);
      }),

    [normalizedSearch, searchField, users],
  );

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) => {
        const searchableText = getDashboardGroupLookupSearchValue(
          group,
          searchField,
        ).toLocaleLowerCase('fr-FR');

        return searchableText.includes(normalizedSearch);
      }),

    [groups, normalizedSearch, searchField],
  );

  const rows = kind === 'AGENT' ? filteredUsers : filteredGroups;

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const currentPage = Math.min(page, totalPages);

  const pageItems = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div
      className="incident-lookup-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby="reports-dashboard-lookup-title"
        aria-modal="true"
        className="incident-lookup-dialog"
        role="dialog"
      >
        <header className="incident-lookup-header">
          <h3 id="reports-dashboard-lookup-title">
            {kind === 'AGENT'
              ? 'Selectionner un agent'
              : 'Selectionner un groupe'}
          </h3>

          <button
            aria-label="Fermer"
            className="incident-lookup-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <label className="incident-lookup-search">
          <select
            aria-label="Categorie de recherche"
            onChange={(event) => {
              setSearchField(event.target.value as DashboardLookupSearchField);
              setPage(1);
            }}
            value={searchField}
          >
            <option value="IDENTIFIER">Identifiant</option>
            {kind === 'GROUP' ? (
              <option value="NAME">Nom</option>
            ) : (
              <>
                <option value="FIRST_NAME">Prenom</option>
                <option value="LAST_NAME">Nom</option>
              </>
            )}
          </select>

          <div className="incident-lookup-search-input">
            <input
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher"
              type="search"
              value={searchTerm}
            />
          </div>
        </label>

        <div className="incident-lookup-table-scroll">
          {kind === 'AGENT' ? (
            <table className="incident-lookup-table">
              <thead>
                <tr>
                  <th>Identifiant</th>

                  <th>Prenom</th>

                  <th>Nom</th>

                  <th>Email</th>

                  <th>Role</th>
                </tr>
              </thead>

              <tbody>
                {(pageItems as AdminUserSummary[]).map((user) => (
                  <tr
                    aria-selected={selectedId === user.id}
                    className="incident-lookup-row"
                    key={user.id}
                    onClick={() => onSelect(user.id)}
                  >
                    <td>{formatUserName(user)}</td>

                    <td>{user.firstName ?? 'Non renseigne'}</td>

                    <td>{user.lastName ?? 'Non renseigne'}</td>

                    <td>{user.email}</td>

                    <td>{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="incident-lookup-table">
              <thead>
                <tr>
                  <th>Identifiant</th>

                  <th>Nom</th>

                  <th>Description</th>
                </tr>
              </thead>

              <tbody>
                {(pageItems as ReferentialCatalogSnapshot['groups']).map(
                  (group) => (
                    <tr
                      aria-selected={selectedId === group.id}
                      className="incident-lookup-row"
                      key={group.id}
                      onClick={() => onSelect(group.id)}
                    >
                      <td>{group.name}</td>

                      <td>{group.name}</td>

                      <td>{group.description ?? '-'}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}

          {rows.length === 0 ? (
            <p className="incident-lookup-empty">Aucun resultat.</p>
          ) : null}
        </div>

        <AppPagination
          className="incident-lookup-pagination"
          onPageChange={setPage}
          page={currentPage}
          scrollToTop={false}
          summary={`${rows.length} element(s)`}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}

function getDashboardUserLookupSearchValue(
  user: AdminUserSummary,
  searchField: DashboardLookupSearchField,
): string {
  switch (searchField) {
    case 'FIRST_NAME':
      return user.firstName ?? '';
    case 'LAST_NAME':
      return user.lastName ?? '';
    case 'IDENTIFIER':
    case 'NAME':
      return formatUserName(user);
    default:
      return '';
  }
}

function getDashboardGroupLookupSearchValue(
  group: ReferentialCatalogSnapshot['groups'][number],
  searchField: DashboardLookupSearchField,
): string {
  switch (searchField) {
    case 'IDENTIFIER':
    case 'NAME':
      return group.name;
    default:
      return '';
  }
}

export function DashboardTimelineChart({
  items,
}: {
  items: ReportingTimelineItem[];
}) {
  const [tooltipState, setTooltipState] = useState<{
    align: 'center' | 'left' | 'right';

    index: number;

    left: string;

    top: string;
  } | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<
    Record<'closed' | 'open' | 'overdue' | 'resolved', boolean>
  >({
    closed: true,
    open: true,
    overdue: true,
    resolved: true,
  });
  const [seriesAnimationKey, setSeriesAnimationKey] = useState<
    Record<'closed' | 'open' | 'overdue' | 'resolved', number>
  >({
    closed: 0,
    open: 0,
    overdue: 0,
    resolved: 0,
  });

  const hideTooltip = () => setTooltipState(null);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const width = 820;

  const height = 318;

  const paddingLeft = 52;

  const paddingRight = 18;

  const paddingTop = 18;

  const paddingBottom = 46;

  const rawMaxValue = Math.max(
    ...items.flatMap((item) => [
      item.open,

      item.resolved,

      item.overdue,

      item.closed,
    ]),

    1,
  );
  const axis = buildChartAxis(rawMaxValue);

  const chartWidth = width - paddingLeft - paddingRight;

  const chartHeight = height - paddingTop - paddingBottom;

  const baselineY = paddingTop + chartHeight;

  const activeItem = tooltipState ? items[tooltipState.index] : null;

  const yTicks = axis.ticks;

  const series = [
    {
      key: 'open' as const,

      color: '#4f7fb5',

      fill: 'rgba(79, 127, 181, 0.12)',

      label: 'Actifs',
    },

    {
      key: 'resolved' as const,

      color: '#f28b22',

      fill: 'rgba(242, 139, 34, 0.1)',

      label: 'Resolus',
    },

    {
      key: 'overdue' as const,

      color: '#df5c64',

      fill: 'rgba(223, 92, 100, 0.09)',

      label: 'En retard',
    },

    {
      key: 'closed' as const,

      color: '#78b7b3',

      fill: 'rgba(120, 183, 179, 0.09)',

      label: 'Clos',
    },
  ];

  return (
    <div className="reports-timeline-card" onMouseLeave={hideTooltip}>
      <div className="reports-chart-legend">
        {series.map((item) => (
          <button
            aria-pressed={visibleSeries[item.key]}
            className={
              visibleSeries[item.key]
                ? 'reports-chart-legend-item is-active'
                : 'reports-chart-legend-item'
            }
            key={item.key}
            onClick={() => {
              hideTooltip();
              setVisibleSeries((current) => {
                const nextValue = !current[item.key];

                if (nextValue) {
                  setSeriesAnimationKey((currentKeys) => ({
                    ...currentKeys,

                    [item.key]: currentKeys[item.key] + 1,
                  }));
                }

                return {
                  ...current,

                  [item.key]: nextValue,
                };
              });
            }}
            type="button"
          >
            <i className={`reports-line-key reports-line-key--${item.key}`} />

            {item.label}
          </button>
        ))}
      </div>

      <svg className="reports-timeline-svg" viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((tickValue, index) => {
          const y = paddingTop + (chartHeight / (yTicks.length - 1)) * index;

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

            axis.max,

            chartWidth,

            chartHeight,

            paddingLeft,

            paddingRight,

            paddingTop,

            baselineY,

            item.color,

            item.fill,

            seriesAnimationKey[item.key],

            visibleSeries[item.key],

            setTooltipState,

            hideTooltip,
          ),
        )}

        {items.map((item, index) => {
          if (!shouldShowTimelineAxisLabel(index, items.length)) {
            return null;
          }

          const denominator = Math.max(1, items.length - 1);
          const labelX =
            items.length === 1
              ? paddingLeft + chartWidth / 2
              : paddingLeft + (chartWidth / denominator) * index;

          return (
            <text
              className="reports-axis-label"
              key={item.period}
              x={labelX}
              y={height - 10}
            >
              {formatTimelinePeriodLabel(item.period)}
            </text>
          );
        })}
      </svg>

      {activeItem ? (
        <ChartTooltip
          align={tooltipState?.align ?? 'center'}
          className="reports-chart-tooltip--timeline"
          items={[
            visibleSeries.open
              ? {
                  color: '#4f7fb5',

                  label: 'Actifs',

                  value: activeItem.open,
                }
              : null,

            visibleSeries.resolved
              ? {
                  color: '#f28b22',

                  label: 'Resolus',

                  value: activeItem.resolved,
                }
              : null,

            visibleSeries.overdue
              ? {
                  color: '#df5c64',

                  label: 'En retard',

                  value: activeItem.overdue,
                }
              : null,

            visibleSeries.closed
              ? {
                  color: '#78b7b3',

                  label: 'Clos',

                  value: activeItem.closed,
                }
              : null,
          ].filter((item) => item !== null)}
          left={tooltipState?.left ?? '50%'}
          top={tooltipState?.top}
          title={formatTimelineTooltipPeriod(activeItem.period)}
        />
      ) : null}
    </div>
  );
}

function shouldShowTimelineAxisLabel(
  index: number,
  totalItems: number,
): boolean {
  if (totalItems <= 12) {
    return true;
  }

  if (index === 0 || index === totalItems - 1) {
    return true;
  }

  const targetLabelCount =
    totalItems <= 18 ? 9 : totalItems <= 31 ? 8 : totalItems <= 62 ? 7 : 6;
  const step = Math.ceil((totalItems - 1) / Math.max(1, targetLabelCount - 1));

  return index % step === 0;
}

function renderTimelineSeries(
  items: ReportingTimelineItem[],

  key: 'closed' | 'open' | 'overdue' | 'resolved',

  maxValue: number,

  chartWidth: number,

  chartHeight: number,

  paddingLeft: number,

  paddingRight: number,

  paddingTop: number,

  baselineY: number,

  color: string,

  fill: string,

  animationKey: number,

  isVisible: boolean,

  setTooltipState: Dispatch<
    SetStateAction<{
      align: 'center' | 'left' | 'right';

      index: number;

      left: string;

      top: string;
    } | null>
  >,

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
    <g
      className={
        isVisible ? 'reports-timeline-series' : 'reports-timeline-series is-off'
      }
      key={key}
    >
      <path className="reports-area-path" d={areaPath} fill={fill} />

      <path
        className={
          isVisible
            ? 'reports-line-path is-entering'
            : 'reports-line-path is-off'
        }
        d={linePath}
        fill="none"
        key={isVisible ? `${key}-${animationKey}` : key}
        stroke={color}
      />

      {points.map((point, index) => {
        if (!isVisible) {
          return null;
        }

        const showTooltip = (
          event: ReactMouseEvent<SVGCircleElement>,
        ): void => {
          const container = event.currentTarget.closest(
            '.reports-timeline-card',
          );

          if (!(container instanceof HTMLDivElement)) {
            return;
          }

          const containerRect = container.getBoundingClientRect();
          const svgWidth = paddingLeft + chartWidth + paddingRight;
          const tooltipLeft = clampNumber(
            point.x,

            paddingLeft + 8,

            svgWidth - paddingRight - 8,
          );
          const align =
            tooltipLeft + TIMELINE_TOOLTIP_WIDTH > svgWidth - paddingRight
              ? 'right'
              : tooltipLeft - TIMELINE_TOOLTIP_WIDTH / 2 < paddingLeft
                ? 'left'
                : 'center';
          const topPx = clampNumber(
            event.clientY - containerRect.top - 20,

            56,

            Math.max(56, containerRect.height - 170),
          );

          setTooltipState({
            align,

            index,

            left: `${tooltipLeft}px`,

            top: `${topPx}px`,
          });
        };

        return (
          <g key={`${key}-${index}`}>
            <circle
              className="reports-line-point-hitbox"
              cx={point.x}
              cy={point.y}
              fill="transparent"
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
              onMouseMove={showTooltip}
              r="9"
            />

            <circle
              className="reports-line-point"
              cx={point.x}
              cy={point.y}
              fill={color}
              r="4.5"
            />
          </g>
        );
      })}
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
    const x =
      items.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (chartWidth / denominator) * index;

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

function buildChartAxis(maxValue: number): { max: number; ticks: number[] } {
  const normalizedMax = Math.max(1, Math.ceil(maxValue));
  const targetTicks = 5;
  const desiredInterval = normalizedMax / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(desiredInterval));
  const multipliers = [1, 2, 3, 4, 5, 6, 8, 10];
  const interval =
    multipliers.find(
      (multiplier) => multiplier * magnitude >= desiredInterval,
    ) ?? 10 * magnitude;
  const baseMax = Math.ceil(normalizedMax / interval) * interval;
  const paddedMax = baseMax + interval;
  const tickCount = Math.max(3, Math.min(6, Math.round(paddedMax / interval)));

  return {
    max: interval * tickCount,
    ticks: Array.from(
      { length: tickCount + 1 },
      (_, index) => interval * (tickCount - index),
    ),
  };
}

export function buildDashboardTimelineItems(
  tickets: TicketSummarySnapshot[],

  filters: ReportsFilterState,
): ReportingTimelineItem[] {
  const bucketMode = resolveTimelineBucketMode(filters);
  const buckets = initializeTimelineBuckets(filters, bucketMode);

  for (const ticket of tickets) {
    const date = new Date(ticket.createdAt);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const period = formatTimelineBucketKey(date, bucketMode);
    const current = buckets.get(period) ?? createEmptyTimelineItem(period);

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

    if (ticket.resolutionSlaStatus === 'OVERDUE') {
      current.overdue += 1;
    }

    buckets.set(period, current);
  }

  return [...buckets.values()].sort((left, right) =>
    left.period.localeCompare(right.period),
  );
}

function resolveTimelineBucketMode(
  filters: ReportsFilterState,
): 'day' | 'hour' | 'month' | 'week' {
  if (filters.periodPreset === 'TODAY') {
    return 'hour';
  }

  if (filters.periodPreset === 'THIS_YEAR') {
    return 'month';
  }

  if (filters.periodPreset === 'THIS_MONTH') {
    return 'week';
  }

  if (filters.periodPreset === 'THIS_WEEK') {
    return 'day';
  }

  const fromTime = filters.from ? new Date(filters.from).getTime() : null;
  const toTime = filters.to ? new Date(filters.to).getTime() : null;

  if (fromTime !== null && toTime !== null) {
    const daySpan = Math.abs(toTime - fromTime) / 86_400_000;

    if (daySpan > 92) {
      return 'month';
    }

    if (daySpan > 31) {
      return 'week';
    }
  }

  return 'day';
}

function initializeTimelineBuckets(
  filters: ReportsFilterState,

  mode: 'day' | 'hour' | 'month' | 'week',
): Map<string, ReportingTimelineItem> {
  const buckets = new Map<string, ReportingTimelineItem>();
  const range = resolveTimelineRange(filters);

  if (!range) {
    return buckets;
  }

  if (mode === 'hour') {
    const day = new Date(
      range.from.getFullYear(),
      range.from.getMonth(),
      range.from.getDate(),
    );

    for (let hour = 0; hour < 24; hour += 2) {
      const period = formatTimelineHourBucketKey(day, hour);

      buckets.set(period, createEmptyTimelineItem(period));
    }

    return buckets;
  }

  if (mode === 'month') {
    const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
    const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1);

    while (cursor <= end) {
      const period = formatTimelineBucketKey(cursor, mode);

      buckets.set(period, createEmptyTimelineItem(period));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
  }

  if (mode === 'week' && filters.periodPreset === 'THIS_MONTH') {
    const year = range.from.getFullYear();
    const month = String(range.from.getMonth() + 1).padStart(2, '0');

    for (let week = 1; week <= 4; week += 1) {
      const period = `${year}-${month}-S${week}`;

      buckets.set(period, createEmptyTimelineItem(period));
    }

    return buckets;
  }

  const cursor = new Date(
    range.from.getFullYear(),
    range.from.getMonth(),
    range.from.getDate(),
  );

  while (cursor <= range.to) {
    const period = formatTimelineBucketKey(cursor, mode);

    if (!buckets.has(period)) {
      buckets.set(period, createEmptyTimelineItem(period));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function createEmptyTimelineItem(period: string): ReportingTimelineItem {
  return {
    closed: 0,
    open: 0,
    overdue: 0,
    period,
    resolved: 0,
  };
}

function resolveTimelineRange(
  filters: ReportsFilterState,
): { from: Date; to: Date } | null {
  const from = parseDateOnly(filters.from);
  const to = parseDateOnly(filters.to);

  if (!from || !to) {
    return null;
  }

  return from <= to ? { from, to } : { from: to, to: from };
}

function parseDateOnly(value: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTimelineBucketKey(
  date: Date,

  mode: 'day' | 'hour' | 'month' | 'week',
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (mode === 'month') {
    return `${year}-${month}`;
  }

  if (mode === 'hour') {
    return formatTimelineHourBucketKey(
      date,
      Math.floor(date.getHours() / 2) * 2,
    );
  }

  if (mode === 'week') {
    const weekOfMonth = Math.min(4, Math.ceil(date.getDate() / 7));

    return `${year}-${month}-S${weekOfMonth}`;
  }

  return `${year}-${month}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimelineHourBucketKey(date: Date, hour: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const startHour = String(hour).padStart(2, '0');

  return `${year}-${month}-${day}-H${startHour}`;
}

function formatTimelinePeriodLabel(value: string): string {
  const hourMatch = /^(\d{4})-(\d{2})-(\d{2})-H(\d{2})$/.exec(value);

  if (hourMatch) {
    const startHour = Number(hourMatch[4]);
    const endHour = (startHour + 2) % 24;

    return `${String(startHour).padStart(2, '0')}h-${String(endHour).padStart(2, '0')}h`;
  }

  const weekMatch = /^(\d{4})-(\d{2})-S(\d+)$/.exec(value);

  if (weekMatch) {
    const { end, start } = resolveMonthWeekBounds(
      Number(weekMatch[1]),
      Number(weekMatch[2]),
      Number(weekMatch[3]),
    );

    return `${formatShortDayMonth(start)}-${formatShortDayMonth(end)}`;
  }

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dayMatch) {
    return `${dayMatch[3]}/${dayMatch[2]}`;
  }

  return formatPeriodLabel(value);
}

function formatTimelineTooltipPeriod(value: string): string {
  const hourMatch = /^(\d{4})-(\d{2})-(\d{2})-H(\d{2})$/.exec(value);

  if (hourMatch) {
    return `${hourMatch[3]}/${hourMatch[2]}/${hourMatch[1]} - ${formatTimelinePeriodLabel(value)}`;
  }

  const weekMatch = /^(\d{4})-(\d{2})-S(\d+)$/.exec(value);

  if (weekMatch) {
    const { end, start } = resolveMonthWeekBounds(
      Number(weekMatch[1]),
      Number(weekMatch[2]),
      Number(weekMatch[3]),
    );

    return `Semaine du ${formatLongDayMonthYear(start)} au ${formatLongDayMonthYear(end)}`;
  }

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dayMatch) {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    }
  }

  return formatTooltipPeriod(value);
}

function resolveMonthWeekBounds(
  year: number,
  month: number,
  week: number,
): { end: Date; start: Date } {
  const monthIndex = month - 1;
  const lastDay = new Date(year, month, 0).getDate();
  const startDay = Math.min(lastDay, (Math.max(1, week) - 1) * 7 + 1);
  const endDay =
    week >= 4 ? lastDay : Math.min(lastDay, Math.max(startDay, week * 7));

  return {
    end: new Date(year, monthIndex, endDay),
    start: new Date(year, monthIndex, startDay),
  };
}

function formatShortDayMonth(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}`;
}

function formatLongDayMonthYear(date: Date): string {
  return `${formatShortDayMonth(date)}/${date.getFullYear()}`;
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
      <strong>{title}</strong>

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

export function DashboardDonutWidget({
  colorByKey = {},
  colors = ['#6254d9', '#7c6ff0', '#9d93fa', '#c0b9ff', '#e2dfff'],
  items,
}: {
  colorByKey?: Record<string, string>;
  colors?: string[];
  items: ReportingBreakdownItem[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const topItems = items.slice(0, 8);

  const total = topItems.reduce((sum, item) => sum + item.count, 0);
  const activeItem = activeIndex === null ? null : topItems[activeIndex];
  const centerValue = activeItem ? activeItem.count : total;

  const radius = 72;

  const segments = topItems.reduce<
    Array<{
      color: string;
      percentage: number;
      path: string;
    }>
  >((accumulator, item, index) => {
    const percentage = total > 0 ? (item.count / total) * 100 : 0;
    const startPercentage = accumulator.reduce(
      (sum, segment) => sum + segment.percentage,
      0,
    );

    accumulator.push({
      color: getDonutItemColor(item, index, colors, colorByKey),
      percentage,
      path: buildDonutSegmentPath(
        100,
        100,
        radius,
        startPercentage,
        startPercentage + percentage,
      ),
    });

    return accumulator;
  }, []);

  return (
    <div className="reports-donut-widget">
      <div className="reports-donut-visual-wrap">
        <div className="reports-donut-visual">
          <svg
            aria-label="Repartition des tickets"
            onMouseLeave={() => setActiveIndex(null)}
            viewBox="0 0 200 200"
          >
            <circle
              className="reports-donut-track"
              cx="100"
              cy="100"
              r={radius}
            />

            {segments.map((segment, index) => (
              <path
                className="reports-donut-segment-hitbox"
                d={segment.path}
                key={`${topItems[index].id ?? topItems[index].name}-hitbox`}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                role="img"
                stroke="transparent"
                tabIndex={0}
              />
            ))}

            {segments.map((segment, index) => (
              <path
                className={
                  activeIndex === null || activeIndex === index
                    ? 'reports-donut-segment'
                    : 'reports-donut-segment is-muted'
                }
                d={segment.path}
                key={topItems[index].id ?? topItems[index].name}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                role="img"
                stroke={segment.color}
                tabIndex={0}
              />
            ))}
          </svg>

          <span className="reports-donut-center">
            <strong>{formatNumber(centerValue)}</strong>
          </span>
        </div>
      </div>

      <div className="reports-widget-list reports-widget-list--donut">
        {topItems.map((item, index) => {
          const percentage =
            total > 0 ? Math.round((item.count / total) * 100) : 0;

          return (
            <button
              className={
                activeIndex === index
                  ? 'reports-widget-row reports-widget-row--donut is-active'
                  : 'reports-widget-row reports-widget-row--donut'
              }
              key={item.id ?? item.name}
              onBlur={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              type="button"
            >
              <span>
                <i
                  style={
                    {
                      background: getDonutItemColor(
                        item,
                        index,
                        colors,
                        colorByKey,
                      ),
                    } as CSSProperties
                  }
                />

                {item.name}
              </span>

              <strong>
                {formatNumber(item.count)}

                <small>{percentage}%</small>
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getDonutItemColor(
  item: ReportingBreakdownItem,

  index: number,

  colors: string[],

  colorByKey: Record<string, string>,
): string {
  return (
    colorByKey[item.id ?? ''] ??
    colorByKey[item.name] ??
    colors[index % colors.length]
  );
}

export function DashboardBarWidget({
  axisValueFormatter = formatChartValue,
  items,
  valueFormatter = formatNumber,
  valueLabel = 'ticket(s)',
  variant = 'default',
}: {
  axisValueFormatter?: (value: number) => string;
  items: ReportingBreakdownItem[];
  valueFormatter?: (value: number) => string;
  valueLabel?: string;
  variant?: 'category' | 'default';
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return <p className="reports-chart-empty">Aucune donnee.</p>;
  }

  const topItems = items.slice(0, 8);

  const rawMaxValue = Math.max(...topItems.map((item) => item.count), 1);

  const axis = buildChartAxis(rawMaxValue);

  const yTicks = axis.ticks;

  return (
    <div
      className={
        variant === 'category'
          ? 'reports-vertical-bar-widget reports-vertical-bar-widget--category'
          : 'reports-vertical-bar-widget'
      }
    >
      <div className="reports-vertical-bar-scale" aria-hidden="true">
        {yTicks.map((tick, index) => (
          <span
            key={tick}
            style={
              {
                top: `${(index / Math.max(yTicks.length - 1, 1)) * 100}%`,
              } as CSSProperties
            }
          >
            {axisValueFormatter(tick)}
          </span>
        ))}
      </div>

      <div className="reports-vertical-bar-plot">
        <div className="reports-vertical-grid" aria-hidden="true">
          {yTicks.map((tick) => (
            <i key={tick} />
          ))}
        </div>

        <div
          className="reports-vertical-bar-list"
          style={
            {
              '--reports-bar-item-count': topItems.length,
            } as CSSProperties
          }
        >
          {topItems.map((item, index) => {
            const percent = (item.count / axis.max) * 100;

            return (
              <div
                className={
                  activeIndex === index
                    ? 'reports-vertical-bar-item is-active'
                    : 'reports-vertical-bar-item'
                }
                key={item.id ?? item.name}
              >
                <div className="reports-vertical-bar-track">
                  <button
                    aria-label={`${item.name}, ${valueFormatter(
                      item.count,
                    )} ${valueLabel}`}
                    className="reports-vertical-bar-fill"
                    onBlur={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    style={{ height: `${percent}%` } as CSSProperties}
                    type="button"
                  />

                  {activeIndex === index ? (
                    <span className="reports-bar-tooltip" role="status">
                      <strong>{valueFormatter(item.count)}</strong>
                    </span>
                  ) : null}
                </div>

                <span className="reports-vertical-bar-label">{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildDonutSegmentPath(
  centerX: number,

  centerY: number,

  radius: number,

  startPercentage: number,

  endPercentage: number,
): string {
  const normalizedEndPercentage =
    endPercentage - startPercentage >= 99.999
      ? startPercentage + 99.999
      : endPercentage;
  const start = polarToCartesian(
    centerX,
    centerY,
    radius,
    percentageToAngle(normalizedEndPercentage),
  );
  const end = polarToCartesian(
    centerX,
    centerY,
    radius,
    percentageToAngle(startPercentage),
  );
  const largeArcFlag = normalizedEndPercentage - startPercentage > 50 ? 1 : 0;

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

function percentageToAngle(percentage: number): number {
  return (percentage / 100) * 360;
}

function polarToCartesian(
  centerX: number,

  centerY: number,

  radius: number,

  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function filterTicketsForDashboard(
  tickets: TicketSummarySnapshot[],

  filters: ReportsFilterState,
): TicketSummarySnapshot[] {
  return tickets.filter((ticket) => {
    if (ticket.archivedAt) {
      return false;
    }

    if (filters.type && ticket.type !== filters.type) {
      return false;
    }

    if (filters.categoryId && ticket.categoryId !== filters.categoryId) {
      return false;
    }

    if (
      filters.assignmentGroupId &&
      ticket.assignmentGroupId !== filters.assignmentGroupId
    ) {
      return false;
    }

    if (
      filters.assignedToUserId &&
      ticket.assignedToUserId !== filters.assignedToUserId
    ) {
      return false;
    }

    if (filters.priorityId && ticket.priorityId !== filters.priorityId) {
      return false;
    }

    const createdDate = ticket.createdAt.slice(0, 10);

    if (filters.from && createdDate < filters.from) {
      return false;
    }

    if (filters.to && createdDate > filters.to) {
      return false;
    }

    return true;
  });
}

export function filterTicketsByActivityMode(
  tickets: TicketSummarySnapshot[],

  mode: DashboardTicketActivityMode,
): TicketSummarySnapshot[] {
  return mode === 'ACTIVE' ? tickets.filter(isActiveTicket) : tickets;
}

function isActiveTicket(ticket: TicketSummarySnapshot): boolean {
  return ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
}

export function buildTicketsByCategoryItems(
  tickets: TicketSummarySnapshot[],

  catalog: ReferentialCatalogSnapshot,
): ReportingBreakdownItem[] {
  const categoriesById = new Map(
    catalog.categories.map((category) => [category.id, category]),
  );

  return countTicketsByKey(
    tickets,
    (ticket) => ticket.categoryId,
    (categoryId) =>
      categoryId
        ? (categoriesById.get(categoryId)?.name ?? categoryId)
        : 'Non definie',
  );
}

export function buildTicketsByAgentItems(
  tickets: TicketSummarySnapshot[],

  users: AdminUserSummary[],
): ReportingBreakdownItem[] {
  return countTicketsByKey(
    tickets,
    (ticket) => ticket.assignedToUserId,
    (agentId) =>
      agentId ? formatAssignedUserName(agentId, users) : 'Non assigne',
  );
}

export function buildTicketsByGroupItems(
  tickets: TicketSummarySnapshot[],

  catalog: ReferentialCatalogSnapshot,
): ReportingBreakdownItem[] {
  const groupsById = new Map(catalog.groups.map((group) => [group.id, group]));

  const countsByGroup = new Map<string, ReportingBreakdownItem>();

  tickets.forEach((ticket) => {
    const groupId = ticket.assignmentGroupId ?? 'unassigned';

    const existingItem = countsByGroup.get(groupId);

    if (existingItem) {
      countsByGroup.set(groupId, {
        ...existingItem,
        count: existingItem.count + 1,
      });
      return;
    }

    countsByGroup.set(groupId, {
      count: 1,
      id: groupId,
      name:
        groupId === 'unassigned'
          ? 'Aucun groupe'
          : (groupsById.get(groupId)?.name ?? 'Groupe inconnu'),
    });
  });

  return Array.from(countsByGroup.values()).sort(
    (firstItem, secondItem) => secondItem.count - firstItem.count,
  );
}

export function buildTicketsByPriorityItems(
  tickets: TicketSummarySnapshot[],

  catalog: ReferentialCatalogSnapshot,
): ReportingBreakdownItem[] {
  const prioritiesById = new Map(
    catalog.priorities.map((priority) => [priority.id, priority]),
  );

  return countTicketsByKey(
    tickets,
    (ticket) => ticket.priorityId,
    (priorityId) =>
      priorityId
        ? translatePriority(prioritiesById.get(priorityId)?.name ?? priorityId)
        : 'Non definie',
  );
}

export function buildTicketsByChannelItems(
  tickets: TicketSummarySnapshot[],

  catalog: ReferentialCatalogSnapshot,
): ReportingBreakdownItem[] {
  return countTicketsByKey(
    tickets,
    (ticket) => ticket.channelId,
    (channelId) =>
      getChannelDisplayName(
        {
          count: 0,
          id: channelId,
          name: channelId ?? 'Non renseigne',
        },
        catalog,
      ),
  );
}

export function buildTicketsByTypeItems(
  tickets: TicketSummarySnapshot[],
): ReportingBreakdownItem[] {
  return countTicketsByKey(
    tickets,
    (ticket) => ticket.type,
    (type) => (type ? translateTicketType(type) : 'Non defini'),
  );
}

export function buildSlaDistributionItems(
  tickets: TicketSummarySnapshot[],
): ReportingBreakdownItem[] {
  const overdueTotal = tickets.filter(
    (ticket) => ticket.resolutionSlaStatus === 'OVERDUE',
  ).length;

  return buildSlaDistributionItemsFromCounts(
    Math.max(tickets.length - overdueTotal, 0),
    overdueTotal,
  );
}

export function buildSlaDistributionItemsFromTotals(
  totals: ReportingOverview['totals'],
): ReportingBreakdownItem[] {
  return buildSlaDistributionItemsFromCounts(
    totals.slaTtrOnTime,
    totals.slaTtrOverdue,
  );
}

function buildSlaDistributionItemsFromCounts(
  onTimeTotal: number,
  overdueTotal: number,
): ReportingBreakdownItem[] {
  return [
    {
      count: onTimeTotal,
      id: 'on-time',
      name: 'Dans les delais',
    },
    {
      count: overdueTotal,
      id: 'overdue',
      name: 'En retard',
    },
  ];
}

function countTicketsByKey(
  tickets: TicketSummarySnapshot[],

  getKey: (ticket: TicketSummarySnapshot) => string | null,

  getName: (key: string | null) => string,
): ReportingBreakdownItem[] {
  const countsByKey = new Map<string, ReportingBreakdownItem>();

  tickets.forEach((ticket) => {
    const id = getKey(ticket);
    const key = id ?? '__null__';
    const existingItem = countsByKey.get(key);

    if (existingItem) {
      countsByKey.set(key, {
        ...existingItem,
        count: existingItem.count + 1,
      });
      return;
    }

    countsByKey.set(key, {
      count: 1,
      id,
      name: getName(id),
    });
  });

  return Array.from(countsByKey.values()).sort(
    (firstItem, secondItem) =>
      secondItem.count - firstItem.count ||
      firstItem.name.localeCompare(secondItem.name),
  );
}
