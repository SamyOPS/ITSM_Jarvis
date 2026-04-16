import { getFrontendRuntimeConfig } from '../config/env';

export type ReportingFilters = {
  assignedToUserId?: string | null;
  categoryId?: string | null;
  from?: string | null;
  priorityId?: string | null;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null;
  to?: string | null;
  type?: 'INCIDENT' | 'REQUEST' | null;
};

export type ReportingOverview = {
  filters: {
    assignedToUserId: string | null;
    categoryId: string | null;
    from: string | null;
    priorityId: string | null;
    status: string | null;
    to: string | null;
    type: string | null;
  };
  kpis: {
    averageResolutionTimeMinutes: number | null;
    averageResponseTimeMinutes: number | null;
  };
  totals: {
    closed: number;
    inProgress: number;
    open: number;
    resolved: number;
    responseOverdue: number;
    resolutionOverdue: number;
    total: number;
  };
};

export type ReportingBreakdownItem = {
  count: number;
  id: string | null;
  name: string;
};

export type ReportingBreakdownDayItem = {
  count: number;
  date: string;
};

export type ReportingBreakdown = {
  filters: ReportingOverview['filters'];
  ticketsByAgent: ReportingBreakdownItem[];
  ticketsByCategory: ReportingBreakdownItem[];
  ticketsByDay: ReportingBreakdownDayItem[];
  ticketsByPriority: ReportingBreakdownItem[];
  ticketsByStatus: ReportingBreakdownItem[];
};

export async function fetchReportingOverview(
  accessToken: string,
  filters: ReportingFilters,
): Promise<ReportingOverview> {
  return fetchReporting<ReportingOverview>('overview', accessToken, filters);
}

export async function fetchReportingBreakdown(
  accessToken: string,
  filters: ReportingFilters,
): Promise<ReportingBreakdown> {
  return fetchReporting<ReportingBreakdown>('breakdown', accessToken, filters);
}

async function fetchReporting<T>(
  endpoint: 'breakdown' | 'overview',
  accessToken: string,
  filters: ReportingFilters,
): Promise<T> {
  const { apiUrl } = getFrontendRuntimeConfig();
  const query = buildReportingQuery(filters);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${apiUrl}/reports/${endpoint}${suffix}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message ||
        `Le chargement du reporting a echoue avec le statut ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function buildReportingQuery(filters: ReportingFilters): URLSearchParams {
  const query = new URLSearchParams();

  setOptionalQueryParam(query, 'assignedToUserId', filters.assignedToUserId);
  setOptionalQueryParam(query, 'categoryId', filters.categoryId);
  setOptionalQueryParam(query, 'from', filters.from);
  setOptionalQueryParam(query, 'priorityId', filters.priorityId);
  setOptionalQueryParam(query, 'status', filters.status);
  setOptionalQueryParam(query, 'to', filters.to);
  setOptionalQueryParam(query, 'type', filters.type);

  return query;
}

function setOptionalQueryParam(
  query: URLSearchParams,
  key: string,
  value: string | null | undefined,
): void {
  const normalized = value?.trim();

  if (normalized) {
    query.set(key, normalized);
  }
}
