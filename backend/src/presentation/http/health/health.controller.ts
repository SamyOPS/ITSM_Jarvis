import { Controller, Get } from '@nestjs/common';
import { GetHealthUseCase } from '../../../application/health/use-cases/get-health.use-case';
import type { HealthSnapshot } from '../../../domain/health/health-status';

@Controller('health')
export class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  @Get()
  getHealth(): HealthSnapshot {
    return this.getHealthUseCase.execute();
  }
}
