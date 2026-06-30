import { Test, TestingModule } from '@nestjs/testing';
import { GetReferentialCatalogUseCase } from '../../../application/referentials/use-cases/get-referential-catalog.use-case';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ReferentialsController } from './referentials.controller';

describe('ReferentialsController', () => {
  let controller: ReferentialsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferentialsController],
      providers: [
        {
          provide: GetReferentialCatalogUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              categories: [],
              channels: [],
              cis: [],
              ciTypes: [],
              groups: [],
              priorities: [],
            }),
          },
        },
      ],
    })
      .overrideGuard(BearerAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<ReferentialsController>(ReferentialsController);
  });

  it('returns the referential catalog payload', async () => {
    await expect(controller.getCatalog()).resolves.toEqual({
      categories: [],
      channels: [],
      cis: [],
      ciTypes: [],
      groups: [],
      priorities: [],
    });
  });
});
