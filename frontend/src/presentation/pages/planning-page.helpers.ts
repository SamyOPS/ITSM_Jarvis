import type { CSSProperties } from 'react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { PlanningTask } from '../../domain/planning/planning-task';
import type { PlanningMode, TaskSegment } from './planning-page.types';

export const DAY_START_HOUR = 8;
export const WORKDAY_END_HOUR = 20;
export const SLOT_MINUTES = 30;
export const PLANNING_DAY_DURATION_MINUTES = 12 * 60;
export const MONTH_DEFAULT_DURATION_MINUTES = PLANNING_DAY_DURATION_MINUTES;
export const DISPLAY_SLOT_COUNT =
  ((WORKDAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;

const GROUP_PLANNING_COLOR_COUNT = 10;

export function buildWorkingSegments(task: PlanningTask): TaskSegment[] {
  const segments: TaskSegment[] = [];
  let cursor = normalizeWorkingStart(parseDateTime(task.start));
  let remainingMinutes = task.durationMinutes;

  while (remainingMinutes > 0) {
    const endOfWorkday = setDateTime(cursor, WORKDAY_END_HOUR, 0);
    const availableMinutes = differenceInMinutes(endOfWorkday, cursor);
    const segmentMinutes = Math.min(remainingMinutes, availableMinutes);
    const end = addMinutes(cursor, segmentMinutes);

    segments.push({
      day: startOfDay(cursor),
      end,
      start: cursor,
      task,
    });

    remainingMinutes -= segmentMinutes;
    cursor = setDateTime(addDays(cursor, 1), DAY_START_HOUR, 0);
  }

  return segments;
}

export function getTaskEnd(task: PlanningTask): Date {
  const segments = buildWorkingSegments(task);

  return segments[segments.length - 1]?.end ?? parseDateTime(task.start);
}

export function normalizeWorkingStart(date: Date): Date {
  const dayStart = setDateTime(date, DAY_START_HOUR, 0);
  const dayEnd = setDateTime(date, WORKDAY_END_HOUR, 0);

  if (date < dayStart) {
    return dayStart;
  }

  if (date >= dayEnd) {
    return setDateTime(addDays(date, 1), DAY_START_HOUR, 0);
  }

  return date;
}

export function getSegmentStyle(
  segment: TaskSegment,
  column = 0,
  columnCount = 1,
): CSSProperties {
  const startMinutes =
    segment.start.getHours() * 60 +
    segment.start.getMinutes() -
    DAY_START_HOUR * 60;

  const durationMinutes = differenceInMinutes(segment.end, segment.start);

  return {
    height: `calc(${(durationMinutes / SLOT_MINUTES) * 34}px - 4px)`,
    left:
      columnCount > 1
        ? `calc(${(column / columnCount) * 100}% + 4px)`
        : undefined,
    right: columnCount > 1 ? 'auto' : undefined,
    top: `${(startMinutes / SLOT_MINUTES) * 34 + 2}px`,
    width: columnCount > 1 ? `calc(${100 / columnCount}% - 8px)` : undefined,
  };
}

export function isShortSegment(segment: TaskSegment): boolean {
  return differenceInMinutes(segment.end, segment.start) <= SLOT_MINUTES;
}

export function buildPositionedSegments(
  segments: TaskSegment[],
): Array<{ column: number; columnCount: number; segment: TaskSegment }> {
  const sortedSegments = [...segments].sort(
    (first, second) => first.start.getTime() - second.start.getTime(),
  );

  const positionedSegments: Array<{
    column: number;
    columnCount: number;
    segment: TaskSegment;
  }> = [];

  let overlappingGroup: TaskSegment[] = [];
  let groupEnd: Date | null = null;

  function addGroup(): void {
    if (overlappingGroup.length === 0) {
      return;
    }

    const columnEnds: Date[] = [];

    const groupPositions = overlappingGroup.map((segment) => {
      const availableColumn = columnEnds.findIndex(
        (end) => end <= segment.start,
      );

      const column =
        availableColumn === -1 ? columnEnds.length : availableColumn;

      columnEnds[column] = segment.end;

      return { column, segment };
    });

    const columnCount = columnEnds.length;

    positionedSegments.push(
      ...groupPositions.map(({ column, segment }) => ({
        column,
        columnCount,
        segment,
      })),
    );
  }

  sortedSegments.forEach((segment) => {
    if (groupEnd && segment.start >= groupEnd) {
      addGroup();
      overlappingGroup = [];
      groupEnd = null;
    }

    overlappingGroup.push(segment);

    if (!groupEnd || segment.end > groupEnd) {
      groupEnd = segment.end;
    }
  });

  addGroup();

  return positionedSegments;
}

export function getCurrentTimeIndicatorStyle(date: Date) {
  const startMinutes = DAY_START_HOUR * 60;
  const endMinutes = WORKDAY_END_HOUR * 60;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return null;
  }

  return {
    top: `${((currentMinutes - startMinutes) / SLOT_MINUTES) * 34}px`,
  };
}

export function buildMonthWeeks(anchorDate: Date): Date[][] {
  const firstDay = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const lastDay = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth() + 1,
    0,
  );
  const firstWeekStart = startOfWeek(firstDay);
  const lastWeekEnd = addDays(startOfWeek(lastDay), 6);
  const weeks: Date[][] = [];

  for (
    let cursor = firstWeekStart;
    cursor <= lastWeekEnd;
    cursor = addDays(cursor, 7)
  ) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
  }

  return weeks;
}

export function getIsoWeekNumber(date: Date): number {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNumber = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

export function startOfWeek(date: Date): Date {
  const dayNumber = date.getDay() || 7;

  return addDays(startOfDay(date), 1 - dayNumber);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function differenceInMinutes(end: Date, start: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (60 * 1000));
}

export function setDateTime(date: Date, hour: number, minute: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
  );
}

export function isSameDay(first: Date, second: Date): boolean {
  return formatDateInput(first) === formatDateInput(second);
}

export function parseDateTime(dateTime: string): Date {
  const [dateValue, timeValue] = dateTime.split('T');
  const [year, month, date] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);

  return new Date(year, month - 1, date, hour, minute);
}

export function formatDateTimeInput(date: Date): string {
  return `${formatDateInput(date)}T${formatClock(date)}`;
}

export function formatDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatWeekdayDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  }).format(date);
}

export function formatPeriodTitle(date: Date, mode: PlanningMode): string {
  if (mode === 'WEEK') {
    const weekStart = startOfWeek(date);
    const weekEnd = addDays(weekStart, 6);

    return `${new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
    }).format(weekStart)} - ${new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(weekEnd)}`;
  }

  if (mode === 'MONTH') {
    return new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  if (mode === 'DAY') {
    return formatLongDate(date);
  }

  return 'Liste des taches';
}

export function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / PLANNING_DAY_DURATION_MINUTES);
  const hours = Math.floor((minutes % PLANNING_DAY_DURATION_MINUTES) / 60);
  const remainingMinutes = minutes % 60;
  const units: string[] = [];

  if (days) {
    units.push(`${days} journée${days > 1 ? 's' : ''}`);
  }

  if (hours) {
    units.push(`${hours} h`);
  }

  if (remainingMinutes) {
    units.push(`${remainingMinutes} min`);
  }

  return units.join(' ') || '0 min';
}

export function formatTaskInterval(task: PlanningTask): string {
  const start = parseDateTime(task.start);
  const end = getTaskEnd(task);

  return `${formatClock(start)} - ${formatClock(end)} (${formatDuration(task.durationMinutes)})`;
}

export function formatAssignedUserLabel(
  technicianId: string,
  technicians: AdminUserSummary[],
): string {
  const technician = technicians.find((user) => user.id === technicianId);

  if (!technician) {
    return 'Utilisateur';
  }

  return formatPlanningUserIdentifier(technician);
}

export function getGroupPlanningColorClass(
  technicianId: string,
  technicians: AdminUserSummary[],
  currentUserId: string,
  isGroupPlanning: boolean,
): string {
  if (!isGroupPlanning || technicianId === currentUserId) {
    return '';
  }

  const sortedTechnicians = [...technicians]
    .filter((technician) => technician.id !== currentUserId)
    .sort((first, second) =>
      formatPlanningUserIdentifier(first).localeCompare(
        formatPlanningUserIdentifier(second),
        'fr',
        { sensitivity: 'base' },
      ),
    );

  const technicianIndex = sortedTechnicians.findIndex(
    (technician) => technician.id === technicianId,
  );

  if (technicianIndex < 0) {
    return 'planning-user-color-1';
  }

  return `planning-user-color-${
    (technicianIndex % GROUP_PLANNING_COLOR_COUNT) + 1
  }`;
}

export function filterPlanningUsers(
  users: AdminUserSummary[],
  search: string,
): AdminUserSummary[] {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return users;
  }

  return users.filter((user) =>
    [
      formatUserName(user),
      formatPlanningUserIdentifier(user),
      user.firstName ?? '',
      user.lastName ?? '',
      user.email ?? '',
      user.role,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch),
  );
}

export function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return user.displayName || fullName || user.email || user.id;
}

export function formatPlanningUserIdentifier(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.displayName || user.email || user.id;
}
