import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreatePlanningTaskUseCase } from '../../../application/planning/use-cases/create-planning-task.use-case';
import { DeletePlanningTaskUseCase } from '../../../application/planning/use-cases/delete-planning-task.use-case';
import { ListPlanningTasksUseCase } from '../../../application/planning/use-cases/list-planning-tasks.use-case';
import { UpdatePlanningTaskUseCase } from '../../../application/planning/use-cases/update-planning-task.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { UserRole } from '../../../domain/auth/user-role';
import { PlanningTask } from '../../../domain/planning/planning-task';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

type PlanningTaskBodyDto = {
  description?: unknown;
  durationMinutes?: unknown;
  start?: unknown;
  status?: unknown;
  technicianId?: unknown;
  title?: unknown;
};

@Controller('planning/tasks')
@UseGuards(BearerAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class PlanningController {
  constructor(
    private readonly createPlanningTaskUseCase: CreatePlanningTaskUseCase,
    private readonly deletePlanningTaskUseCase: DeletePlanningTaskUseCase,
    private readonly listPlanningTasksUseCase: ListPlanningTasksUseCase,
    private readonly updatePlanningTaskUseCase: UpdatePlanningTaskUseCase,
  ) {}

  @Get()
  listTasks(@CurrentUser() user: AuthenticatedUser): Promise<PlanningTask[]> {
    return this.listPlanningTasksUseCase.execute(user.id, user.role);
  }

  @Post()
  createTask(
    @Body() body: PlanningTaskBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlanningTask> {
    return this.createPlanningTaskUseCase.execute(body, user.id, user.role);
  }

  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body() body: PlanningTaskBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlanningTask> {
    return this.updatePlanningTaskUseCase.execute(id, body, user.id, user.role);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteTask(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.deletePlanningTaskUseCase.execute(id, user.id, user.role);
  }
}
