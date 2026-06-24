import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { PlanningTask } from '../../domain/planning/planning-task';

export type PlanningPageProps = {
  backLabel?: string;
  defaultTechnicianId?: string;
  groupId?: string | null;
  groupUsers?: AdminUserSummary[];
  onBack: () => void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
  onSaveTask: (
    task: PlanningTask,
  ) => Promise<PlanningTask | void> | PlanningTask | void;
  onToggleTaskStatus: (taskId: string) => Promise<void> | void;
  session: AuthSessionSnapshot;
  tasks: PlanningTask[];
  technicians: AdminUserSummary[];
  variant?: 'GROUP' | 'PERSONAL';
};

export type PlanningMode = 'DAY' | 'MONTH' | 'AGENDA' | 'WEEK';

export type PlanningDraft = Omit<PlanningTask, 'id'> & { id?: string };

export type TaskSegment = {
  day: Date;
  end: Date;
  start: Date;
  task: PlanningTask;
};
