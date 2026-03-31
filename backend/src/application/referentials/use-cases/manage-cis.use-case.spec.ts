import { BadRequestException } from '@nestjs/common';
import { CiStatus } from '../../../domain/ticketing/ci-status';
import { ManageCisUseCase } from './manage-cis.use-case';

describe('ManageCisUseCase', () => {
  const repository = {
    createCi: jest.fn(),
    updateCi: jest.fn(),
    deleteCi: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a CI with an invalid assigned user id', async () => {
    const useCase = new ManageCisUseCase(repository as never);

    await expect(
      useCase.create({
        name: 'Laptop N1',
        ciTypeId: '11111111-1111-4111-8111-111111111111',
        status: CiStatus.IN_SERVICE,
        assignedUserId: 'not-a-uuid',
        serialNumber: 'ABC-123',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repository.createCi).not.toHaveBeenCalled();
  });

  it('delegates a valid CI creation to the repository', async () => {
    repository.createCi.mockResolvedValue({ id: 'ci-1' });
    const useCase = new ManageCisUseCase(repository as never);

    await useCase.create({
      name: 'Laptop N1',
      ciTypeId: '11111111-1111-4111-8111-111111111111',
      status: CiStatus.IN_SERVICE,
      assignedUserId: null,
      serialNumber: 'ABC-123',
    });

    expect(repository.createCi).toHaveBeenCalledWith({
      name: 'Laptop N1',
      ciTypeId: '11111111-1111-4111-8111-111111111111',
      status: CiStatus.IN_SERVICE,
      assignedUserId: null,
      serialNumber: 'ABC-123',
    });
  });
});
