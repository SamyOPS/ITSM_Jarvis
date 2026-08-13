import {
  type Dispatch,
  type MouseEvent,
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
  Search,
  Trash2,
  X,
} from 'lucide-react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import { AppPagination } from '../components/app-pagination';

import type { PlanningTask } from '../../domain/planning/planning-task';
import {
  addDays,
  buildMonthWeeks,
  buildPositionedSegments,
  buildWorkingSegments,
  DAY_START_HOUR,
  DISPLAY_SLOT_COUNT,
  filterPlanningUsers,
  formatAssignedUserLabel,
  formatClock,
  formatDateInput,
  formatDateTimeInput,
  formatDuration,
  formatLongDate,
  formatMinutes,
  formatPeriodTitle,
  formatPlanningUserIdentifier,
  formatTaskInterval,
  formatWeekdayDate,
  getCurrentTimeIndicatorStyle,
  getGroupPlanningColorClass,
  getIsoWeekNumber,
  getSegmentStyle,
  getTaskEnd,
  isSameDay,
  isShortSegment,
  MONTH_DEFAULT_DURATION_MINUTES,
  normalizeWorkingStart,
  parseDateTime,
  PLANNING_DAY_DURATION_MINUTES,
  setDateTime,
  SLOT_MINUTES,
  startOfDay,
  startOfWeek,
  WORKDAY_END_HOUR,
} from './planning-page.helpers';
import type {
  PlanningDraft,
  PlanningMode,
  PlanningPageProps,
  TaskSegment,
} from './planning-page.types';

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

const USER_PICKER_PAGE_SIZE = 10;

export function PlanningPage({
  onBack,

  backLabel = 'Retour a la vue personnelle',

  defaultTechnicianId,

  onDeleteTask,

  onSaveTask,

  onToggleTaskStatus,

  session,

  tasks,

  technicians,

  groupId = null,

  groupUsers = technicians,

  variant = 'PERSONAL',
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

      groupId,

      start: formatDateTimeInput(selectedStart),

      status: 'TODO',

      technicianId: defaultTechnicianId ?? session.user.id,

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

  async function saveTask(): Promise<void> {
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

      groupId: variant === 'GROUP' ? groupId : null,
    };

    await onSaveTask(nextTask);

    setAnchorDate(startOfDay(parseDateTime(nextTask.start)));

    closeEditor();
  }

  async function deleteTask(): Promise<void> {
    if (!draft?.id) {
      return;
    }

    await onDeleteTask(draft.id);

    closeEditor();
  }

  function toggleTaskStatus(taskId: string): void {
    void onToggleTaskStatus(taskId);
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
              {backLabel}
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
            currentUserId={session.user.id}
            isGroupPlanning={variant === 'GROUP'}
            onCreate={openNewTask}
            onOpenTask={openTask}
            onToggleStatus={toggleTaskStatus}
            segments={segments}
            technicians={technicians}
          />
        ) : null}

        {mode === 'DAY' ? (
          <DayPlanningView
            anchorDate={anchorDate}
            currentTime={currentTime}
            currentUserId={session.user.id}
            isGroupPlanning={variant === 'GROUP'}
            onCreate={openNewTask}
            onOpenTask={openTask}
            onToggleStatus={toggleTaskStatus}
            segments={segments}
            technicians={technicians}
          />
        ) : null}

        {mode === 'MONTH' ? (
          <MonthPlanningView
            anchorDate={anchorDate}
            currentUserId={session.user.id}
            isGroupPlanning={variant === 'GROUP'}
            onCreate={openNewTask}
            onOpenTask={openTask}
            segments={segments}
            technicians={technicians}
          />
        ) : null}

        {mode === 'AGENDA' ? (
          <AgendaPlanningView
            currentUserId={session.user.id}
            isGroupPlanning={variant === 'GROUP'}
            onOpenTask={openTask}
            onToggleStatus={toggleTaskStatus}
            tasks={tasks}
            technicians={technicians}
          />
        ) : null}
      </section>

      {draft ? (
        <PlanningEditor
          draft={draft}
          groupUsers={groupUsers}
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
          showUserField={variant === 'GROUP'}
          titleError={titleError}
        />
      ) : null}
    </section>
  );
}

function WeekPlanningView({
  anchorDate,

  currentTime,

  currentUserId,

  isGroupPlanning,

  onCreate,

  onOpenTask,

  onToggleStatus,

  segments,

  technicians,
}: {
  anchorDate: Date;

  currentTime: Date;

  currentUserId: string;

  isGroupPlanning: boolean;

  onCreate: (
    day: Date,

    hour?: number,

    minute?: number,

    durationMinutes?: number,
  ) => void;

  onOpenTask: (task: PlanningTask) => void;

  onToggleStatus: (taskId: string) => void;

  segments: TaskSegment[];

  technicians: AdminUserSummary[];
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
            currentUserId={currentUserId}
            day={day}
            isGroupPlanning={isGroupPlanning}
            key={formatDateInput(day)}
            onCreate={onCreate}
            onOpenTask={onOpenTask}
            onToggleStatus={onToggleStatus}
            segments={segments.filter((segment) => isSameDay(segment.day, day))}
            technicians={technicians}
          />
        ))}
      </div>
    </div>
  );
}

function DayPlanningView({
  anchorDate,

  currentTime,

  currentUserId,

  isGroupPlanning,

  onCreate,

  onOpenTask,

  onToggleStatus,

  segments,

  technicians,
}: {
  anchorDate: Date;

  currentTime: Date;

  currentUserId: string;

  isGroupPlanning: boolean;

  onCreate: (
    day: Date,

    hour?: number,

    minute?: number,

    durationMinutes?: number,
  ) => void;

  onOpenTask: (task: PlanningTask) => void;

  onToggleStatus: (taskId: string) => void;

  segments: TaskSegment[];

  technicians: AdminUserSummary[];
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
          currentUserId={currentUserId}
          day={anchorDate}
          isGroupPlanning={isGroupPlanning}
          onCreate={onCreate}
          onOpenTask={onOpenTask}
          onToggleStatus={onToggleStatus}
          segments={segments.filter((segment) =>
            isSameDay(segment.day, anchorDate),
          )}
          technicians={technicians}
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

  currentUserId,

  day,

  isGroupPlanning,

  onCreate,

  onOpenTask,

  onToggleStatus,

  segments,

  technicians,
}: {
  currentTime: Date;

  currentUserId: string;

  day: Date;

  isGroupPlanning: boolean;

  onCreate: (
    day: Date,

    hour?: number,

    minute?: number,

    durationMinutes?: number,
  ) => void;

  onOpenTask: (task: PlanningTask) => void;

  onToggleStatus: (taskId: string) => void;

  segments: TaskSegment[];

  technicians: AdminUserSummary[];
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
        <div
          className={[
            'planning-event',

            `planning-event--${segment.task.status.toLowerCase()}`,

            getGroupPlanningColorClass(
              segment.task.technicianId,
              technicians,
              currentUserId,
              isGroupPlanning,
            ),

            isShortSegment(segment) ? 'planning-event--compact' : '',
          ]

            .filter(Boolean)

            .join(' ')}
          key={`${segment.task.id}-${segment.start.toISOString()}`}
          onClick={() => onOpenTask(segment.task)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();

              onOpenTask(segment.task);
            }
          }}
          role="button"
          style={getSegmentStyle(segment, column, columnCount)}
          tabIndex={0}
        >
          <StatusToggleButton
            className="planning-event-status-toggle"
            status={segment.task.status}
            onToggle={(event) => {
              event.stopPropagation();

              onToggleStatus(segment.task.id);
            }}
          />

          <span className="planning-event-user">
            {formatAssignedUserLabel(segment.task.technicianId, technicians)}
          </span>

          <strong>{segment.task.title}</strong>

          <span>
            {formatClock(segment.start)} - {formatClock(segment.end)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MonthPlanningView({
  anchorDate,

  currentUserId,

  isGroupPlanning,

  onCreate,

  onOpenTask,

  segments,

  technicians,
}: {
  anchorDate: Date;

  currentUserId: string;

  isGroupPlanning: boolean;

  onCreate: (
    day: Date,

    hour?: number,

    minute?: number,

    durationMinutes?: number,
  ) => void;

  onOpenTask: (task: PlanningTask) => void;

  segments: TaskSegment[];

  technicians: AdminUserSummary[];
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
                      className={[
                        'planning-month-task',

                        `planning-event--${segment.task.status.toLowerCase()}`,

                        getGroupPlanningColorClass(
                          segment.task.technicianId,
                          technicians,
                          currentUserId,
                          isGroupPlanning,
                        ),
                      ]

                        .filter(Boolean)

                        .join(' ')}
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

                      <small>
                        {formatAssignedUserLabel(
                          segment.task.technicianId,

                          technicians,
                        )}
                      </small>

                      <strong>{segment.task.title}</strong>
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
  currentUserId,

  isGroupPlanning,

  onOpenTask,

  onToggleStatus,

  tasks,

  technicians,
}: {
  currentUserId: string;

  isGroupPlanning: boolean;

  onOpenTask: (task: PlanningTask) => void;

  onToggleStatus: (taskId: string) => void;

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
                <div
                  className={[
                    'planning-agenda-row',

                    isSameDay(parseDateTime(task.start), new Date())
                      ? 'is-today'
                      : '',

                    getGroupPlanningColorClass(
                      task.technicianId,
                      technicians,
                      currentUserId,
                      isGroupPlanning,
                    ),
                  ]

                    .filter(Boolean)

                    .join(' ')}
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();

                      onOpenTask(task);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="planning-agenda-time">
                    {formatTaskInterval(task)}
                  </span>

                  <span className="planning-agenda-task-title">
                    <strong>{task.title}</strong>
                  </span>

                  <span>
                    {formatAssignedUserLabel(task.technicianId, technicians)}
                  </span>

                  <StatusToggleButton
                    className="planning-agenda-status-toggle"
                    status={task.status}
                    onToggle={(event) => {
                      event.stopPropagation();

                      onToggleStatus(task.id);
                    }}
                  />
                </div>
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

function StatusToggleButton({
  className,

  onToggle,

  status,
}: {
  className?: string;

  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;

  status: PlanningTask['status'];
}) {
  return (
    <button
      aria-label={
        status === 'DONE'
          ? 'Marquer la tache comme a faire'
          : 'Marquer la tache comme faite'
      }
      className={[
        'planning-status-toggle',

        status === 'DONE' ? 'planning-status-toggle--done' : '',

        className ?? '',
      ]

        .filter(Boolean)

        .join(' ')}
      onClick={onToggle}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
      type="button"
    >
      {status === 'DONE' ? 'Fait' : 'A faire'}
    </button>
  );
}

function PlanningEditor({
  draft,

  groupUsers,

  onChange,

  onClose,

  onDelete,

  onSave,

  onTitleChange,

  showUserField,

  titleError,
}: {
  draft: PlanningDraft;

  groupUsers: AdminUserSummary[];

  onChange: Dispatch<SetStateAction<PlanningDraft | null>>;

  onClose: () => void;

  onDelete: () => void;

  onSave: () => void;

  onTitleChange: (title: string) => void;

  showUserField: boolean;

  titleError: string | null;
}) {
  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false);

  const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);

  const [userPage, setUserPage] = useState(1);

  const [userSearch, setUserSearch] = useState('');

  const [startDate, startTime] = draft.start.split('T');

  const selectedUser = groupUsers.find(
    (user) => user.id === draft.technicianId,
  );

  const filteredUsers = filterPlanningUsers(groupUsers, userSearch);
  const totalUserPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / USER_PICKER_PAGE_SIZE),
  );
  const visibleUserPage = Math.min(userPage, totalUserPages);
  const paginatedUsers = filteredUsers.slice(
    (visibleUserPage - 1) * USER_PICKER_PAGE_SIZE,
    visibleUserPage * USER_PICKER_PAGE_SIZE,
  );

  return (
    <div
      className="planning-editor-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
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

          {showUserField ? (
            <label className="field planning-user-field">
              <span>Utilisateur</span>

              <div className="planning-user-trigger">
                <input
                  readOnly
                  value={
                    selectedUser
                      ? formatPlanningUserIdentifier(selectedUser)
                      : 'Utilisateur non renseigne'
                  }
                />

                <button
                  aria-label="Selectionner un utilisateur"
                  onClick={() => setIsUserPickerOpen(true)}
                  type="button"
                >
                  <Search size={18} />
                </button>
              </div>
            </label>
          ) : null}

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

      {showUserField && isUserPickerOpen ? (
        <section
          aria-label="Selectionner un utilisateur"
          aria-modal="true"
          className="planning-user-picker"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="planning-user-picker-header">
            <h3>Selectionner un utilisateur</h3>

            <button
              aria-label="Fermer"
              onClick={() => setIsUserPickerOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
          </header>

          <div className="planning-user-picker-search">
            <Search size={17} />

            <input
              onChange={(event) => {
                setUserSearch(event.target.value);
                setUserPage(1);
              }}
              placeholder="Rechercher"
              value={userSearch}
            />
          </div>

          <div className="planning-user-picker-table-scroll">
            <table className="planning-user-picker-table">
              <thead>
                <tr>
                  <th>Identifiant</th>

                  <th>Prenom</th>

                  <th>Nom</th>

                  <th>Role</th>
                </tr>
              </thead>

              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    className={
                      user.id === draft.technicianId ? 'is-selected' : ''
                    }
                    key={user.id}
                    onClick={() => {
                      onChange({ ...draft, technicianId: user.id });

                      setIsUserPickerOpen(false);
                    }}
                  >
                    <td>{formatPlanningUserIdentifier(user)}</td>

                    <td>{user.firstName || '-'}</td>

                    <td>{user.lastName || '-'}</td>

                    <td>{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AppPagination
            className="planning-user-picker-pagination"
            onPageChange={setUserPage}
            page={visibleUserPage}
            scrollToTop={false}
            summary={`Page ${visibleUserPage} sur ${totalUserPages} - ${filteredUsers.length} utilisateurs`}
            totalPages={totalUserPages}
          />
        </section>
      ) : null}
    </div>
  );
}
