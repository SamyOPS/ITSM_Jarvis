import {
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

export type PlanningTask = {
  description: string;
  durationMinutes: number;
  id: string;
  start: string;
  status: 'DONE' | 'TODO';
  technicianId: string;
  title: string;
};

type PlanningPageProps = {
  onBack: () => void;
  onTasksChange: Dispatch<SetStateAction<PlanningTask[]>>;
  session: AuthSessionSnapshot;
  tasks: PlanningTask[];
  technicians: AdminUserSummary[];
};

type PlanningMode = 'DAY' | 'MONTH' | 'AGENDA' | 'WEEK';

type PlanningDraft = Omit<PlanningTask, 'id'> & { id?: string };

type TaskSegment = {
  day: Date;
  end: Date;
  start: Date;
  task: PlanningTask;
};

const DAY_START_HOUR = 8;
const WORKDAY_END_HOUR = 20;
const SLOT_MINUTES = 30;
const PLANNING_DAY_DURATION_MINUTES = 12 * 60;
const MONTH_DEFAULT_DURATION_MINUTES = PLANNING_DAY_DURATION_MINUTES;
const DISPLAY_SLOT_COUNT =
  ((WORKDAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;

const PLANNING_MODES = [
  { icon: Clock3, label: 'Jour', value: 'DAY' as const },
  { icon: CalendarDays, label: 'Semaine', value: 'WEEK' as const },
  { icon: CalendarDays, label: 'Mois', value: 'MONTH' as const },
  { icon: List, label: 'Planning', value: 'AGENDA' as const },
];

const DURATION_OPTIONS = Array.from(
  { length: (PLANNING_DAY_DURATION_MINUTES * 2) / SLOT_MINUTES },
  (_, index) => (index + 1) * SLOT_MINUTES,
);

export function PlanningPage({
  onBack,
  onTasksChange,
  session,
  tasks,
  technicians,
}: PlanningPageProps) {
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [draft, setDraft] = useState<PlanningDraft | null>(null);
  const [mode, setMode] = useState<PlanningMode>('WEEK');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setCurrentTime(new Date()),
      60000,
    );

    return () => window.clearInterval(intervalId);
  }, []);

  const segments = useMemo(
    () => tasks.flatMap((task) => buildWorkingSegments(task)),
    [tasks],
  );

  function openNewTask(
    day: Date,
    hour = DAY_START_HOUR,
    minute = 0,
    durationMinutes = SLOT_MINUTES,
  ): void {
    const selectedStart = setDateTime(day, hour, minute);

    setTitleError(null);
    setDraft({
      description: '',
      durationMinutes,
      start: formatDateTimeInput(selectedStart),
      status: 'TODO',
      technicianId: session.user.id,
      title: '',
    });
  }

  function openTask(task: PlanningTask): void {
    setTitleError(null);
    setDraft({ ...task });
  }

  function closeEditor(): void {
    setDraft(null);
    setTitleError(null);
  }

  function saveTask(): void {
    if (!draft) {
      return;
    }

    if (!draft.title.trim()) {
      setTitleError('Titre obligatoire');
      return;
    }

    if (!draft.technicianId) {
      return;
    }

    const parsedStart = parseDateTime(draft.start);

    if (Number.isNaN(parsedStart.getTime())) {
      return;
    }

    const nextTask: PlanningTask = {
      description: draft.description.trim(),
      durationMinutes: draft.durationMinutes,
      id: draft.id ?? window.crypto.randomUUID(),
      start: formatDateTimeInput(normalizeWorkingStart(parsedStart)),
      status: draft.status,
      technicianId: draft.technicianId,
      title: draft.title.trim(),
    };

    onTasksChange((currentTasks) => {
      const taskExists = currentTasks.some((task) => task.id === nextTask.id);

      return taskExists
        ? currentTasks.map((task) =>
            task.id === nextTask.id ? nextTask : task,
          )
        : [...currentTasks, nextTask];
    });
    setAnchorDate(startOfDay(parseDateTime(nextTask.start)));
    closeEditor();
  }

  function deleteTask(): void {
    if (!draft?.id) {
      return;
    }

    onTasksChange((currentTasks) =>
      currentTasks.filter((task) => task.id !== draft.id),
    );
    closeEditor();
  }

  function movePeriod(direction: -1 | 1): void {
    setAnchorDate((currentDate) => {
      if (mode === 'MONTH') {
        return new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + direction,
          1,
        );
      }

      if (mode === 'WEEK') {
        return addDays(currentDate, 7 * direction);
      }

      return addDays(currentDate, direction);
    });
  }

  return (
    <section className="planning-page">
      <section className="planning-workspace">
        <header className="planning-toolbar">
          <div className="planning-period-controls">
            <button
              className="tdp-back-btn planning-back-button"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft size={15} />
              Retour a la vue personnelle
            </button>
            <button
              aria-label="Periode precedente"
              onClick={() => movePeriod(-1)}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="planning-today-button"
              onClick={() => setAnchorDate(startOfDay(new Date()))}
              type="button"
            >
              Aujourd'hui
            </button>
            <button
              aria-label="Periode suivante"
              onClick={() => movePeriod(1)}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <strong className="planning-period-title">
            {formatPeriodTitle(anchorDate, mode)}
          </strong>

          <nav aria-label="Modes du planning" className="planning-mode-tabs">
            {PLANNING_MODES.map((option) => {
              const Icon = option.icon;

              return (
                <button
                  className={
                    option.value === mode
                      ? 'planning-mode-tab is-active'
                      : 'planning-mode-tab'
                  }
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  type="button"
                >
                  <Icon size={15} />
                  {option.label}
                </button>
              );
            })}
          </nav>
        </header>

        {mode === 'WEEK' ? (
          <WeekPlanningView
            anchorDate={anchorDate}
            currentTime={currentTime}
            onCreate={openNewTask}
            onOpenTask={openTask}
            segments={segments}
          />
        ) : null}

        {mode === 'DAY' ? (
          <DayPlanningView
            anchorDate={anchorDate}
            currentTime={currentTime}
            onCreate={openNewTask}
            onOpenTask={openTask}
            segments={segments}
          />
        ) : null}

        {mode === 'MONTH' ? (
          <MonthPlanningView
            anchorDate={anchorDate}
            onCreate={openNewTask}
            onOpenTask={openTask}
            segments={segments}
          />
        ) : null}

        {mode === 'AGENDA' ? (
          <AgendaPlanningView
            onOpenTask={openTask}
            tasks={tasks}
            technicians={technicians}
          />
        ) : null}
      </section>

      {draft ? (
        <PlanningEditor
          draft={draft}
          onChange={(nextDraft) => {
            setDraft(nextDraft);
          }}
          onClose={closeEditor}
          onDelete={deleteTask}
          onSave={saveTask}
          onTitleChange={(title) => {
            setDraft((currentDraft) =>
              currentDraft ? { ...currentDraft, title } : currentDraft,
            );
            setTitleError(null);
          }}
          titleError={titleError}
        />
      ) : null}
    </section>
  );
}

function WeekPlanningView({
  anchorDate,
  currentTime,
  onCreate,
  onOpenTask,
  segments,
}: {
  anchorDate: Date;
  currentTime: Date;
  onCreate: (
    day: Date,
    hour?: number,
    minute?: number,
    durationMinutes?: number,
  ) => void;
  onOpenTask: (task: PlanningTask) => void;
  segments: TaskSegment[];
}) {
  const weekStart = startOfWeek(anchorDate);
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  return (
    <div className="planning-time-view planning-week-view">
      <div className="planning-time-header">
        <span className="planning-time-week-label">
          Sem. {getIsoWeekNumber(weekStart)}
        </span>
        {days.map((day) => (
          <strong
            className={isSameDay(day, new Date()) ? 'is-today' : ''}
            key={formatDateInput(day)}
          >
            {formatWeekdayDate(day)}
          </strong>
        ))}
      </div>

      <div className="planning-time-body">
        <TimeScale />
        {days.map((day) => (
          <PlanningDayColumn
            currentTime={currentTime}
            day={day}
            key={formatDateInput(day)}
            onCreate={onCreate}
            onOpenTask={onOpenTask}
            segments={segments.filter((segment) => isSameDay(segment.day, day))}
          />
        ))}
      </div>
    </div>
  );
}

function DayPlanningView({
  anchorDate,
  currentTime,
  onCreate,
  onOpenTask,
  segments,
}: {
  anchorDate: Date;
  currentTime: Date;
  onCreate: (
    day: Date,
    hour?: number,
    minute?: number,
    durationMinutes?: number,
  ) => void;
  onOpenTask: (task: PlanningTask) => void;
  segments: TaskSegment[];
}) {
  return (
    <div className="planning-time-view planning-day-view">
      <div className="planning-time-header">
        <span className="planning-time-week-label">
          Sem. {getIsoWeekNumber(anchorDate)}
        </span>
        <strong className={isSameDay(anchorDate, new Date()) ? 'is-today' : ''}>
          {formatLongDate(anchorDate)}
        </strong>
      </div>

      <div className="planning-time-body">
        <TimeScale />
        <PlanningDayColumn
          currentTime={currentTime}
          day={anchorDate}
          onCreate={onCreate}
          onOpenTask={onOpenTask}
          segments={segments.filter((segment) =>
            isSameDay(segment.day, anchorDate),
          )}
        />
      </div>
    </div>
  );
}

function TimeScale() {
  const marks = Array.from(
    { length: WORKDAY_END_HOUR - DAY_START_HOUR },
    (_, index) => (DAY_START_HOUR + index) * 60,
  );

  return (
    <div className="planning-time-scale">
      {marks.map((minutes, index) => (
        <span key={minutes} style={{ gridRow: index * 2 + 1 }}>
          {formatMinutes(minutes)}
        </span>
      ))}
    </div>
  );
}

function PlanningDayColumn({
  currentTime,
  day,
  onCreate,
  onOpenTask,
  segments,
}: {
  currentTime: Date;
  day: Date;
  onCreate: (
    day: Date,
    hour?: number,
    minute?: number,
    durationMinutes?: number,
  ) => void;
  onOpenTask: (task: PlanningTask) => void;
  segments: TaskSegment[];
}) {
  const isCurrentDay = isSameDay(day, currentTime);
  const currentTimeStyle = isCurrentDay
    ? getCurrentTimeIndicatorStyle(currentTime)
    : null;
  const positionedSegments = buildPositionedSegments(segments);

  return (
    <div
      className={
        isCurrentDay
          ? 'planning-day-column is-current-day'
          : 'planning-day-column'
      }
    >
      {Array.from({ length: DISPLAY_SLOT_COUNT }, (_, index) => {
        const totalMinutes = DAY_START_HOUR * 60 + index * SLOT_MINUTES;

        return (
          <button
            aria-label={`Ajouter une tache le ${formatLongDate(day)} a ${formatMinutes(totalMinutes)}`}
            className="planning-slot"
            key={index}
            onClick={() =>
              onCreate(day, Math.floor(totalMinutes / 60), totalMinutes % 60)
            }
            type="button"
          />
        );
      })}

      {currentTimeStyle ? (
        <span
          aria-hidden="true"
          className="planning-current-time-line"
          style={currentTimeStyle}
        />
      ) : null}

      {positionedSegments.map(({ column, columnCount, segment }) => (
        <button
          className={`planning-event planning-event--${segment.task.status.toLowerCase()}`}
          key={`${segment.task.id}-${segment.start.toISOString()}`}
          onClick={() => onOpenTask(segment.task)}
          style={getSegmentStyle(segment, column, columnCount)}
          type="button"
        >
          <strong>{segment.task.title}</strong>
          <span>
            {formatClock(segment.start)} - {formatClock(segment.end)}
          </span>
        </button>
      ))}
    </div>
  );
}

function MonthPlanningView({
  anchorDate,
  onCreate,
  onOpenTask,
  segments,
}: {
  anchorDate: Date;
  onCreate: (
    day: Date,
    hour?: number,
    minute?: number,
    durationMinutes?: number,
  ) => void;
  onOpenTask: (task: PlanningTask) => void;
  segments: TaskSegment[];
}) {
  const monthWeeks = buildMonthWeeks(anchorDate);

  return (
    <div className="planning-month-view">
      <div className="planning-month-header">
        <span>Sem.</span>
        {['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(
          (weekday) => (
            <strong key={weekday}>{weekday}</strong>
          ),
        )}
      </div>

      {monthWeeks.map((week) => (
        <div className="planning-month-week" key={formatDateInput(week[0])}>
          <strong className="planning-week-number">
            {getIsoWeekNumber(week[0])}
          </strong>
          {week.map((day) => {
            const daySegments = segments
              .filter((segment) => isSameDay(segment.day, day))
              .sort(
                (first, second) =>
                  first.start.getTime() - second.start.getTime(),
              );

            return (
              <div
                className={[
                  'planning-month-day',
                  day.getMonth() === anchorDate.getMonth() ? '' : 'is-outside',
                  isSameDay(day, new Date()) ? 'is-current-day' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={formatDateInput(day)}
                onClick={() =>
                  onCreate(
                    day,
                    DAY_START_HOUR,
                    0,
                    MONTH_DEFAULT_DURATION_MINUTES,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCreate(
                      day,
                      DAY_START_HOUR,
                      0,
                      MONTH_DEFAULT_DURATION_MINUTES,
                    );
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className={isSameDay(day, new Date()) ? 'is-today' : ''}>
                  {day.getDate()}
                </span>
                <div>
                  {daySegments.slice(0, 3).map((segment) => (
                    <button
                      className={`planning-month-task planning-event--${segment.task.status.toLowerCase()}`}
                      key={`${segment.task.id}-${segment.start.toISOString()}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenTask(segment.task);
                      }}
                      type="button"
                    >
                      <span>
                        {formatClock(segment.start)} -{' '}
                        {formatClock(segment.end)}
                      </span>
                      {segment.task.title}
                    </button>
                  ))}
                  {daySegments.length > 3 ? (
                    <small>+ {daySegments.length - 3} autre(s)</small>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AgendaPlanningView({
  onOpenTask,
  tasks,
  technicians,
}: {
  onOpenTask: (task: PlanningTask) => void;
  tasks: PlanningTask[];
  technicians: AdminUserSummary[];
}) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 1);
  const visibleTasks = tasks
    .filter((task) => getTaskEnd(task) >= cutoffDate)
    .sort((first, second) => first.start.localeCompare(second.start));
  const taskGroups = groupTasksByDate(visibleTasks);

  return (
    <div className="planning-agenda-view">
      {visibleTasks.length === 0 ? (
        <p className="planning-empty">Aucune tache planifiee a afficher.</p>
      ) : (
        <div className="planning-agenda-list">
          {taskGroups.map((group) => (
            <section className="planning-agenda-group" key={group.date}>
              <h4>{formatLongDate(parseDateTime(group.tasks[0].start))}</h4>
              {group.tasks.map((task) => (
                <button
                  className={
                    isSameDay(parseDateTime(task.start), new Date())
                      ? 'planning-agenda-row is-today'
                      : 'planning-agenda-row'
                  }
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  type="button"
                >
                  <span className="planning-agenda-time">
                    {formatTaskInterval(task)}
                  </span>
                  <span>{task.title}</span>
                  <span>
                    {formatTechnicianName(task.technicianId, technicians)}
                  </span>
                  <i
                    className={`planning-status planning-status--${task.status.toLowerCase()}`}
                  >
                    {task.status === 'DONE' ? 'Fait' : 'A faire'}
                  </i>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupTasksByDate(
  tasks: PlanningTask[],
): Array<{ date: string; tasks: PlanningTask[] }> {
  const groups = new Map<string, PlanningTask[]>();

  tasks.forEach((task) => {
    const date = task.start.slice(0, 10);
    const groupedTasks = groups.get(date) ?? [];

    groupedTasks.push(task);
    groups.set(date, groupedTasks);
  });

  return Array.from(groups, ([date, groupedTasks]) => ({
    date,
    tasks: groupedTasks,
  }));
}

function PlanningEditor({
  draft,
  onChange,
  onClose,
  onDelete,
  onSave,
  onTitleChange,
  titleError,
}: {
  draft: PlanningDraft;
  onChange: Dispatch<SetStateAction<PlanningDraft | null>>;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  onTitleChange: (title: string) => void;
  titleError: string | null;
}) {
  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false);
  const [startDate, startTime] = draft.start.split('T');

  return (
    <div className="planning-editor-overlay">
      <section
        aria-label={draft.id ? 'Modifier une tache' : 'Ajouter une tache'}
        aria-modal="true"
        className="planning-editor"
        role="dialog"
      >
        <header className="planning-editor-header">
          <div>
            <h3>{draft.id ? 'Modifier la tache' : 'Ajouter une tache'}</h3>
            <p>Planification sur les horaires autorises de 08:00 a 20:00.</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="planning-editor-form">
          <label className="field">
            <span>Titre</span>
            <input
              aria-invalid={Boolean(titleError)}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Titre de la tache"
              value={draft.title}
            />
            {titleError ? (
              <small className="field-error">{titleError}</small>
            ) : null}
          </label>

          <fieldset className="planning-start-field">
            <legend>Date de debut</legend>
            <input
              aria-label="Date de debut"
              onChange={(event) =>
                onChange({
                  ...draft,
                  start: `${event.target.value}T${startTime}`,
                })
              }
              type="date"
              value={startDate}
            />
            <input
              aria-label="Heure de debut"
              max="19:30"
              min="08:00"
              onChange={(event) =>
                onChange({
                  ...draft,
                  start: `${startDate}T${event.target.value}`,
                })
              }
              step={SLOT_MINUTES * 60}
              type="time"
              value={startTime}
            />
          </fieldset>

          <label className="field planning-duration-field">
            <span>Duree</span>
            <button
              aria-expanded={isDurationMenuOpen}
              className="planning-duration-trigger"
              onClick={() => setIsDurationMenuOpen((isOpen) => !isOpen)}
              type="button"
            >
              <span>{formatDuration(draft.durationMinutes)}</span>
              <ChevronDown size={16} />
            </button>
            {isDurationMenuOpen ? (
              <div className="planning-duration-options">
                {DURATION_OPTIONS.map((duration) => (
                  <button
                    className={
                      duration === draft.durationMinutes ? 'is-selected' : ''
                    }
                    key={duration}
                    onClick={() => {
                      onChange({ ...draft, durationMinutes: duration });
                      setIsDurationMenuOpen(false);
                    }}
                    type="button"
                  >
                    {formatDuration(duration)}
                  </button>
                ))}
              </div>
            ) : null}
          </label>

          <label className="field planning-description-field">
            <span>Description</span>
            <textarea
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              placeholder="Detail de la tache"
              rows={4}
              value={draft.description}
            />
          </label>
        </div>

        <footer className="planning-editor-actions">
          {draft.id ? (
            <button
              className="danger-button planning-delete-button"
              onClick={onDelete}
              type="button"
            >
              <Trash2 size={16} />
              Supprimer
            </button>
          ) : null}
          <button className="primary-button" onClick={onSave} type="button">
            <Plus size={16} />
            {draft.id ? 'Enregistrer' : 'Ajouter'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function buildWorkingSegments(task: PlanningTask): TaskSegment[] {
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

function getTaskEnd(task: PlanningTask): Date {
  const segments = buildWorkingSegments(task);

  return segments[segments.length - 1]?.end ?? parseDateTime(task.start);
}

function normalizeWorkingStart(date: Date): Date {
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

function getSegmentStyle(
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

function buildPositionedSegments(
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

function getCurrentTimeIndicatorStyle(date: Date) {
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

function buildMonthWeeks(anchorDate: Date): Date[][] {
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

function getIsoWeekNumber(date: Date): number {
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

function startOfWeek(date: Date): Date {
  const dayNumber = date.getDay() || 7;

  return addDays(startOfDay(date), 1 - dayNumber);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function differenceInMinutes(end: Date, start: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (60 * 1000));
}

function setDateTime(date: Date, hour: number, minute: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
  );
}

function isSameDay(first: Date, second: Date): boolean {
  return formatDateInput(first) === formatDateInput(second);
}

function parseDateTime(dateTime: string): Date {
  const [dateValue, timeValue] = dateTime.split('T');
  const [year, month, date] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);

  return new Date(year, month - 1, date, hour, minute);
}

function formatDateTimeInput(date: Date): string {
  return `${formatDateInput(date)}T${formatClock(date)}`;
}

function formatDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(date);
}

function formatWeekdayDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  }).format(date);
}

function formatPeriodTitle(date: Date, mode: PlanningMode): string {
  if (mode === 'WEEK') {
    const weekStart = startOfWeek(date);
    const weekEnd = addDays(weekStart, 6);

    return `${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(weekStart)} - ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(weekEnd)}`;
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

function formatDuration(minutes: number): string {
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

function formatTaskInterval(task: PlanningTask): string {
  const start = parseDateTime(task.start);
  const end = getTaskEnd(task);

  return `${formatClock(start)} - ${formatClock(end)} (${formatDuration(task.durationMinutes)})`;
}

function formatTechnicianName(
  technicianId: string,
  technicians: AdminUserSummary[],
): string {
  const technician = technicians.find((user) => user.id === technicianId);

  return technician ? formatUserName(technician) : 'Technicien non renseigne';
}

function formatUserName(user: AdminUserSummary): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return user.displayName || fullName || user.email || user.id;
}
