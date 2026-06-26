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
        brand: null,
        model: null,
        operatingSystem: null,
        location: null,
        purchaseDate: null,
        warrantyEndDate: null,
        ipAddress: null,
        macAddress: null,
        cpuName: null,
        diskSpaceGb: null,
        ramMb: null,
        keyboardLayout: null,
        osVersion: null,
        comment: null,
        archivedAt: null,
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
      brand: ' Dell ',
      model: ' Latitude 5440 ',
      operatingSystem: ' Windows ',
      location: ' Bureau 101 ',
      purchaseDate: '2026-05-01',
      warrantyEndDate: '2029-05-01',
      ipAddress: ' 10.0.0.5 ',
      macAddress: ' AA:BB:CC:DD:EE:FF ',
      cpuName: ' Intel Core i5 ',
      diskSpaceGb: 512,
      ramMb: 16384,
      keyboardLayout: ' AZERTY ',
      osVersion: ' 11 Pro ',
      comment: ' Poste principal ',
      archivedAt: null,
    });

    expect(repository.createCi).toHaveBeenCalledWith({
      name: 'Laptop N1',
      ciTypeId: '11111111-1111-4111-8111-111111111111',
      status: CiStatus.IN_SERVICE,
      assignedUserId: null,
      serialNumber: 'ABC-123',
      brand: 'Dell',
      model: 'Latitude 5440',
      operatingSystem: 'Windows',
      location: 'Bureau 101',
      purchaseDate: '2026-05-01',
      warrantyEndDate: '2029-05-01',
      ipAddress: '10.0.0.5',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      cpuName: 'Intel Core i5',
      diskSpaceGb: 512,
      ramMb: 16384,
      keyboardLayout: 'AZERTY',
      osVersion: '11 Pro',
      comment: 'Poste principal',
      archivedAt: null,
    });
  });

  it('rejects warranty dates earlier than purchase date', async () => {
    const useCase = new ManageCisUseCase(repository as never);

    await expect(
      useCase.create({
        name: 'Laptop N1',
        ciTypeId: '11111111-1111-4111-8111-111111111111',
        status: CiStatus.IN_SERVICE,
        assignedUserId: null,
        serialNumber: null,
        brand: null,
        model: null,
        operatingSystem: null,
        location: null,
        purchaseDate: '2026-05-10',
        warrantyEndDate: '2026-05-01',
        ipAddress: null,
        macAddress: null,
        cpuName: null,
        diskSpaceGb: null,
        ramMb: null,
        keyboardLayout: null,
        osVersion: null,
        comment: null,
        archivedAt: null,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repository.createCi).not.toHaveBeenCalled();
  });
});
