import { Injectable } from '@nestjs/common';
import { HealthSnapshot } from '../../../domain/health/health-status';

@Injectable()
export class GetHealthUseCase {
  execute(): HealthSnapshot {
    return {
      service: 'backend',
      status: 'ok',
    };
  }
}
