import { BadRequestException } from '@nestjs/common';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { ManagePrioritiesUseCase } from './manage-priorities.use-case';

describe('ManagePrioritiesUseCase', () => {
  const repository = {
    createPriority: jest.fn(),
    updatePriority: jest.fn(),
    deletePriority: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates SLA ordering before creating a priority', async () => {
    const useCase = new ManagePrioritiesUseCase(repository as never);

    await expect(
      useCase.create({
        name: PriorityName.HIGH,
        level: 3,
        responseHours: 8,
        resolutionHours: 4,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repository.createPriority).not.toHaveBeenCalled();
  });

  it('delegates a valid priority update to the repository', async () => {
    repository.updatePriority.mockResolvedValue({ id: 'priority-1' });
    const useCase = new ManagePrioritiesUseCase(repository as never);

    await useCase.update({
      id: '11111111-1111-4111-8111-111111111111',
      name: PriorityName.MEDIUM,
      level: 2,
      responseHours: 8,
      resolutionHours: 24,
    });

    expect(repository.updatePriority).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      name: PriorityName.MEDIUM,
      level: 2,
      responseHours: 8,
      resolutionHours: 24,
    });
  });
});
