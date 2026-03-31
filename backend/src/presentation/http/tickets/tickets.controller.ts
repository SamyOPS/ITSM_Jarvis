import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateIncidentUseCase } from '../../../application/ticketing/use-cases/create-incident.use-case';
import { CreateRequestUseCase } from '../../../application/ticketing/use-cases/create-request.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { CreatedIncident } from '../../../domain/ticketing/created-incident';
import { CreatedRequest } from '../../../domain/ticketing/created-request';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CreateIncidentDto } from './create-incident.dto';
import type { CreateRequestDto } from './create-request.dto';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly createIncidentUseCase: CreateIncidentUseCase,
    private readonly createRequestUseCase: CreateRequestUseCase,
  ) {}

  @Post('incidents')
  @UseGuards(BearerAuthGuard)
  createIncident(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateIncidentDto,
  ): Promise<CreatedIncident> {
    return this.createIncidentUseCase.execute({
      ...body,
      createdByUserId: user.id,
    });
  }

  @Post('requests')
  @UseGuards(BearerAuthGuard)
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRequestDto,
  ): Promise<CreatedRequest> {
    return this.createRequestUseCase.execute({
      ...body,
      createdByUserId: user.id,
    });
  }
}
