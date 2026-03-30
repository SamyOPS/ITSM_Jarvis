import { ReferentialService } from '../../../domain/referentials/referential-service';
import { ListServicesUseCase } from './list-services.use-case';

describe('ListServicesUseCase', () => {
  it('lists services from the read repository', async () => {
    const useCase = new ListServicesUseCase({
      listServices: jest
        .fn()
        .mockResolvedValue([
          new ReferentialService('service-1', 'Messaging', 'Messagerie'),
        ]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual([
      new ReferentialService('service-1', 'Messaging', 'Messagerie'),
    ]);
  });
});
