import { ReferentialCategory } from '../../../domain/referentials/referential-category';
import { ReferentialChannel } from '../../../domain/referentials/referential-channel';
import { ReferentialCi } from '../../../domain/referentials/referential-ci';
import { ReferentialCiType } from '../../../domain/referentials/referential-ci-type';
import { ReferentialGroup } from '../../../domain/referentials/referential-group';
import { ReferentialPriority } from '../../../domain/referentials/referential-priority';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { SupportLevel } from '../../../domain/ticketing/support-level';
import { GetReferentialCatalogUseCase } from './get-referential-catalog.use-case';

describe('GetReferentialCatalogUseCase', () => {
  it('returns the full referential catalog by composing list use cases', async () => {
    const useCase = new GetReferentialCatalogUseCase(
      {
        execute: jest
          .fn()
          .mockResolvedValue([
            new ReferentialCategory('cat-1', 'Hardware', null),
          ]),
      } as never,
      {
        execute: jest
          .fn()
          .mockResolvedValue([new ReferentialChannel('channel-1', 'PORTAL')]),
      } as never,
      {
        execute: jest
          .fn()
          .mockResolvedValue([
            new ReferentialCi(
              'ci-1',
              'Laptop N1',
              'ci-type-1',
              'IN_SERVICE',
              null,
              'ABC-123',
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            ),
          ]),
      } as never,
      {
        execute: jest
          .fn()
          .mockResolvedValue([new ReferentialCiType('ci-type-1', 'LAPTOP')]),
      } as never,
      {
        execute: jest
          .fn()
          .mockResolvedValue([
            new ReferentialGroup(
              'group-1',
              'Support N1',
              null,
              SupportLevel.N1,
            ),
          ]),
      } as never,
      {
        execute: jest
          .fn()
          .mockResolvedValue([
            new ReferentialPriority('priority-1', PriorityName.LOW, 1, 24, 72),
          ]),
      } as never,
    );

    await expect(useCase.execute()).resolves.toEqual({
      categories: [new ReferentialCategory('cat-1', 'Hardware', null)],
      channels: [new ReferentialChannel('channel-1', 'PORTAL')],
      cis: [
        new ReferentialCi(
          'ci-1',
          'Laptop N1',
          'ci-type-1',
          'IN_SERVICE',
          null,
          'ABC-123',
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ),
      ],
      ciTypes: [new ReferentialCiType('ci-type-1', 'LAPTOP')],
      groups: [
        new ReferentialGroup('group-1', 'Support N1', null, SupportLevel.N1),
      ],
      priorities: [
        new ReferentialPriority('priority-1', PriorityName.LOW, 1, 24, 72),
      ],
    });
  });
});
