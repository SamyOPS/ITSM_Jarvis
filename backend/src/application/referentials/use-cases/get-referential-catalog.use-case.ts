import { Injectable } from '@nestjs/common';
import { type ReferentialCatalogSnapshot } from '../../../domain/referentials/referential-catalog';
import { SupabaseReferentialReaderService } from '../../../infrastructure/referentials/supabase-referential-reader.service';

@Injectable()
export class GetReferentialCatalogUseCase {
  constructor(
    private readonly referentialReader: SupabaseReferentialReaderService,
  ) {}

  async execute(): Promise<ReferentialCatalogSnapshot> {
    const [categories, channels, ciTypes, groups, priorities, services] =
      await Promise.all([
        this.referentialReader.listCategories(),
        this.referentialReader.listChannels(),
        this.referentialReader.listCiTypes(),
        this.referentialReader.listGroups(),
        this.referentialReader.listPriorities(),
        this.referentialReader.listServices(),
      ]);

    return {
      categories,
      channels,
      ciTypes,
      groups,
      priorities,
      services,
    };
  }
}
