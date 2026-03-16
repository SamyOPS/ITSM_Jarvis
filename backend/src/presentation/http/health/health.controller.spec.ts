import { Test, TestingModule } from '@nestjs/testing';
import { GetHealthUseCase } from '../../../application/health/use-cases/get-health.use-case';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [GetHealthUseCase],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns the backend health snapshot', () => {
    expect(controller.getHealth()).toEqual({
      service: 'backend',
      status: 'ok',
    });
  });
});
