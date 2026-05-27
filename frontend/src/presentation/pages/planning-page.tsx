import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
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
const DAY_END_HOUR = 19;
const SLOT_MINUTES = 30;
const HOURS_IN_WORKDAY = DAY_END_HOUR - DAY_START_HOUR;
const TECHNICIAN_PAGE_SIZE = 6;

const PLANNING_MODES = [
  { icon: CalendarDays, label: 'Semaine', value: 'WEEK' as const },
  { icon: CalendarDays, label: 'Mois', value: 'MONTH' as const },
  { icon: Clock3, label: 'Jour', value: 'DAY' as const },
  { icon: List, label: 'Planning', value: 'AGENDA' as const },
];

const DURATION_OPTIONS = Array.from(
  { length: (48 * 60) / SLOT_MINUTES },
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
  const [isTechnicianPickerOpen, setIsTechnicianPickerOpen] = useState(false);
  const [technicianPage, setTechnicianPage] = useState(1);
  const [technicianQuery, setTechnicianQuery] = useState('');

  const segments = useMemo(
    () => tasks.flatMap((task) => buildWorkingSegments(task)),
    [tasks],
  );

  function openNewTask(day: Date, hour = DAY_START_HOUR, minute = 0): void {
    const selectedStart = setDateTime(day, hour, minute);

    setDraft({
      description: '',
      durationMinutes: SLOT_MINUTES,
      start: formatDateTimeInput(selectedStart),
      status: 'TODO',
      technicianId: session.user.id,
      title: '',
    });
  }

  function openTask(task: PlanningTask): void {
    setDraft({ ...task });
  }

  function closeEditor(): void {
    setDraft(null);
    setIsTechnicianPickerOpen(false);
    setTechnicianQuery('');
    setTechnicianPage(1);
  }

  function saveTask(): void {
    if (!draft || !draft.title.trim() || !draft.technicianId) {
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

  const selectedTechnician =
    technicians.find((technician) => technician.id === draft?.technicianId) ??
    null;

  return (
    <section className="planning-page">
      <header className="planning-page-header">
        <button className="tdp-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={15} />
          Retour a la vue personnelle
        </button>

        <div>
          <h2>Planning</h2>
          <p>Organisation des taches et interventions planifiees.</p>
        </div>
      </header>

      <section className="planning-workspace">
        <header className="planning-toolbar">
          <div className="planning-period-controls">
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
            onCreate={openNewTask}
            onOpenTask={openTask}
            segments={segments}
          />
        ) : null}

        {mode === 'DAY' ? (
          <DayPlanningView
            anchorDate={anchorDate}
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
            onCreate={() => openNewTask(anchorDate)}
            onOpenTask={openTask}
            tasks={tasks}
            technicians={technicians}
          />
        ) : null}
      </section>

      {draft ? (
        <PlanningEditor
          draft={draft}
          isTechnicianPickerOpen={isTechnicianPickerOpen}
          onChange={setDraft}
          onClose={closeEditor}
          onDelete={deleteTask}
          onOpenTechnicianPicker={() => setIsTechnicianPickerOpen(true)}
          onSave={saveTask}
          onTechnicianPickerClose={() => setIsTechnicianPickerOpen(false)}
          onTechnicianSelect={(technicianId) => {
            setDraft((currentDraft) =>
              currentDraft ? { ...currentDraft, technicianId } : currentDraft,
            );
            setIsTechnicianPickerOpen(false);
          }}
          selectedTechnician={selectedTechnician}
          technicianPage={technicianPage}
          technicianQuery={technicianQuery}
          technicians={technicians}
          onTechnicianPageChange={setTechnicianPage}
          onTechnicianQueryChange={(query) => {
            setTechnicianQuery(query);
            setTechnicianPage(1);
          }}
        />
      ) : null}
    </section>
  );
}

function WeekPlanningView({
  anchorDate,
  onCreate,
  onOpenTask,
  segments,
}: {
  anchorDate: Date;
  onCreate: (day: Date, hour?: number, minute?: number) => void;
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
        <span />
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
  onCreate,
  onOpenTask,
  segments,
}: {
  anchorDate: Date;
  onCreate: (day: Date, hour?: number, minute?: number) => void;
  onOpenTask: (task: PlanningTask) => void;
  segments: TaskSegment[];
}) {
  return (
    <div className="planning-time-view planning-day-view">
      <div className="planning-time-header">
        <span />
        <strong className={isSameDay(anchorDate, new Date()) ? 'is-today' : ''}>
          {formatLongDate(anchorDate)}
        </strong>
      </div>

      <div className="planning-time-body">
        <TimeScale />
        <PlanningDayColumn
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
  return (
    <div className="planning-time-scale">
      {Array.from({ length: HOURS_IN_WORKDAY + 1 }, (_, index) => (
        <span key={index}>
          {String(DAY_START_HOUR + index).padStart(2, '0')}:00
        </span>
      ))}
    </div>
  );
}

function PlanningDayColumn({
  day,
  onCreate,
  onOpenTask,
  segments,
}: {
  day: Date;
  onCreate: (day: Date, hour?: number, minute?: number) => void;
  onOpenTask: (task: PlanningTask) => void;
  segments: TaskSegment[];
}) {
  const slotCount = HOURS_IN_WORKDAY * (60 / SLOT_MINUTES);

  return (
    <div className="planning-day-column">
      {Array.from({ length: slotCount }, (_, index) => {
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

      {segments.map((segment) => (
        <button
          className={`planning-event planning-event--${segment.task.status.toLowerCase()}`}
          key={`${segment.task.id}-${segment.start.toISOString()}`}
          onClick={() => onOpenTask(segment.task)}
          style={getSegmentStyle(segment)}
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
  onCreate: (day: Date, hour?: number, minute?: number) => void;
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
                className={
                  day.getMonth() === anchorDate.getMonth()
                    ? 'planning-month-day'
                    : 'planning-month-day is-outside'
                }
                key={formatDateInput(day)}
              >
                <button
                  className={isSameDay(day, new Date()) ? 'is-today' : ''}
                  onClick={() => onCreate(day)}
                  type="button"
                >
                  {day.getDate()}
                </button>
                <div>
                  {daySegments.slice(0, 3).map((segment) => (
                    <button
                      className={`planning-month-task planning-event--${segment.task.status.toLowerCase()}`}
                      key={`${segment.task.id}-${segment.start.toISOString()}`}
                      onClick={() => onOpenTask(segment.task)}
                      type="button"
                    >
                      <span>{formatClock(segment.start)}</span>
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
  onCreate,
  onOpenTask,
  tasks,
  technicians,
}: {
  onCreate: () => void;
  onOpenTask: (task: PlanningTask) => void;
  tasks: PlanningTask[];
  technicians: AdminUserSummary[];
}) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 1);
  const visibleTasks = tasks
    .filter((task) => getTaskEnd(task) >= cutoffDate)
    .sort((first, second) => first.start.localeCompare(second.start));

  return (
    <div className="planning-agenda-view">
      <div className="planning-agenda-header">
        <h3>Liste des taches</h3>
        <button className="primary-button" onClick={onCreate} type="button">
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {visibleTasks.length === 0 ? (
        <p className="planning-empty">Aucune tache planifiee a afficher.</p>
      ) : (
        <div className="planning-agenda-list">
          {visibleTasks.map((task) => (
            <button
              className="planning-agenda-row"
              key={task.id}
              onClick={() => onOpenTask(task)}
              type="button"
            >
              <strong>{formatLongDate(parseDateTime(task.start))}</strong>
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
        </div>
      )}
    </div>
  );
}

function PlanningEditor({
  draft,
  isTechnicianPickerOpen,
  onChange,
  onClose,
  onDelete,
  onOpenTechnicianPicker,
  onSave,
  onTechnicianPageChange,
  onTechnicianPickerClose,
  onTechnicianQueryChange,
  onTechnicianSelect,
  selectedTechnician,
  technicianPage,
  technicianQuery,
  technicians,
}: {
  draft: PlanningDraft;
  isTechnicianPickerOpen: boolean;
  onChange: Dispatch<SetStateAction<PlanningDraft | null>>;
  onClose: () => void;
  onDelete: () => void;
  onOpenTechnicianPicker: () => void;
  onSave: () => void;
  onTechnicianPageChange: (page: number) => void;
  onTechnicianPickerClose: () => void;
  onTechnicianQueryChange: (query: string) => void;
  onTechnicianSelect: (technicianId: string) => void;
  selectedTechnician: AdminUserSummary | null;
  technicianPage: number;
  technicianQuery: string;
  technicians: AdminUserSummary[];
}) {
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
            <p>Planification sur les horaires autorises de 08:00 a 19:00.</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="planning-editor-form">
          <label className="field">
            <span>Titre</span>
            <input
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              placeholder="Titre de la tache"
              value={draft.title}
            />
          </label>

          <label className="field">
            <span>Technicien</span>
            <div
              className={
                draft.technicianId
                  ? 'incident-lookup-field has-clear'
                  : 'incident-lookup-field'
              }
            >
              <input
                className={draft.technicianId ? '' : 'lookup-placeholder'}
                placeholder="Choisir le technicien"
                readOnly
                value={
                  selectedTechnician
                    ? formatUserName(selectedTechnician)
                    : draft.technicianId
                      ? 'Utilisateur connecte'
                      : ''
                }
              />
              {draft.technicianId ? (
                <button
                  aria-label="Effacer le technicien"
                  onClick={() => onChange({ ...draft, technicianId: '' })}
                  type="button"
                >
                  <X size={16} />
                </button>
              ) : null}
              <button
                aria-label="Rechercher un technicien"
                onClick={onOpenTechnicianPicker}
                type="button"
              >
                <Search size={17} />
              </button>
            </div>
          </label>

          <label className="field">
            <span>Statut</span>
            <select
              onChange={(event) =>
                onChange({
                  ...draft,
                  status: event.target.value as PlanningTask['status'],
                })
              }
              value={draft.status}
            >
              <option value="TODO">A faire</option>
              <option value="DONE">Fait</option>
            </select>
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
              max="18:30"
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

          <label className="field">
            <span>Duree</span>
            <select
              onChange={(event) =>
                onChange({
                  ...draft,
                  durationMinutes: Number(event.target.value),
                })
              }
              value={draft.durationMinutes}
            >
              {DURATION_OPTIONS.map((duration) => (
                <option key={duration} value={duration}>
                  {formatDuration(duration)}
                </option>
              ))}
            </select>
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

      {isTechnicianPickerOpen ? (
        <TechnicianPicker
          onClose={onTechnicianPickerClose}
          onPageChange={onTechnicianPageChange}
          onQueryChange={onTechnicianQueryChange}
          onSelect={onTechnicianSelect}
          page={technicianPage}
          query={technicianQuery}
          selectedId={draft.technicianId}
          technicians={technicians}
        />
      ) : null}
    </div>
  );
}

function TechnicianPicker({
  onClose,
  onPageChange,
  onQueryChange,
  onSelect,
  page,
  query,
  selectedId,
  technicians,
}: {
  onClose: () => void;
  onPageChange: (page: number) => void;
  onQueryChange: (query: string) => void;
  onSelect: (technicianId: string) => void;
  page: number;
  query: string;
  selectedId: string;
  technicians: AdminUserSummary[];
}) {
  const normalizedQuery = query.toLowerCase().trim();
  const filteredTechnicians = technicians.filter((technician) =>
    [formatUserName(technician), technician.email ?? '', technician.role]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTechnicians.length / TECHNICIAN_PAGE_SIZE),
  );
  const visiblePage = Math.min(page, totalPages);
  const visibleTechnicians = filteredTechnicians.slice(
    (visiblePage - 1) * TECHNICIAN_PAGE_SIZE,
    visiblePage * TECHNICIAN_PAGE_SIZE,
  );

  return (
    <div className="incident-lookup-overlay planning-technician-overlay">
      <section
        aria-label="Selectionner un technicien"
        aria-modal="true"
        className="incident-lookup-dialog"
        role="dialog"
      >
        <header className="incident-lookup-header">
          <h3>Selectionner un technicien</h3>
          <button
            className="incident-lookup-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <label className="incident-lookup-search">
          <select aria-label="Champ de recherche" defaultValue="all">
            <option value="all">Tous</option>
          </select>
          <span className="incident-lookup-search-input">
            <Search size={17} />
            <input
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Rechercher un technicien"
              value={query}
            />
          </span>
        </label>

        <div className="incident-lookup-table-scroll">
          <table className="incident-lookup-table incident-lookup-table--assignee">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Role</th>
                <th>Groupe</th>
                <th>Email</th>
                <th>Selection</th>
              </tr>
            </thead>
            <tbody>
              {visibleTechnicians.map((technician) => (
                <tr
                  className={
                    technician.id === selectedId
                      ? 'incident-lookup-row is-selected'
                      : 'incident-lookup-row'
                  }
                  key={technician.id}
                  onClick={() => onSelect(technician.id)}
                  tabIndex={0}
                >
                  <td className="incident-lookup-identity">
                    {formatUserName(technician)}
                  </td>
                  <td>{technician.role}</td>
                  <td>{technician.groupId ?? '-'}</td>
                  <td>{technician.email ?? '-'}</td>
                  <td>{technician.id === selectedId ? 'Selectionne' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="incident-lookup-pagination">
          <span>{filteredTechnicians.length} technicien(s)</span>
          <div>
            <button
              className="secondary-button incident-lookup-page-button"
              disabled={visiblePage === 1}
              onClick={() => onPageChange(visiblePage - 1)}
              type="button"
            >
              Precedent
            </button>
            <span className="incident-lookup-current-page">{visiblePage}</span>
            <button
              className="secondary-button incident-lookup-page-button"
              disabled={visiblePage === totalPages}
              onClick={() => onPageChange(visiblePage + 1)}
              type="button"
            >
              Suivant
            </button>
          </div>
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
    const endOfWorkday = setDateTime(cursor, DAY_END_HOUR, 0);
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
  const dayEnd = setDateTime(date, DAY_END_HOUR, 0);

  if (date < dayStart) {
    return dayStart;
  }

  if (date >= dayEnd) {
    return setDateTime(addDays(date, 1), DAY_START_HOUR, 0);
  }

  return date;
}

function getSegmentStyle(segment: TaskSegment) {
  const startMinutes =
    segment.start.getHours() * 60 +
    segment.start.getMinutes() -
    DAY_START_HOUR * 60;
  const durationMinutes = differenceInMinutes(segment.end, segment.start);

  return {
    height: `calc(${(durationMinutes / SLOT_MINUTES) * 34}px - 4px)`,
    top: `${(startMinutes / SLOT_MINUTES) * 34 + 2}px`,
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
  if (minutes === 48 * 60) {
    return '2 jours (48 h)';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes} min`;
  }

  if (!remainingMinutes) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
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
