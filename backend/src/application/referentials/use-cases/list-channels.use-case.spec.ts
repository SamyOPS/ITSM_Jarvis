import { ReferentialChannel } from '../../../domain/referentials/referential-channel';
import { ListChannelsUseCase } from './list-channels.use-case';

describe('ListChannelsUseCase', () => {
  it('lists channels from the read repository', async () => {
    const useCase = new ListChannelsUseCase({
      listChannels: jest
        .fn()
        .mockResolvedValue([new ReferentialChannel('channel-1', 'PORTAL')]),
    } as never);

    await expect(useCase.execute()).resolves.toEqual([
      new ReferentialChannel('channel-1', 'PORTAL'),
    ]);
  });
});
