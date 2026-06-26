import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticleAttachmentReadRepository } from '../repositories/knowledge-article-attachment-read.repository';
import { KnowledgeArticleAttachmentWriteRepository } from '../repositories/knowledge-article-attachment-write.repository';
import { GetKnowledgeArticleUseCase } from './get-knowledge-article.use-case';

export type DeleteKnowledgeArticleAttachmentCommand = {
  actorRole: UserRole;
  actorUserId: string;
  articleId: string;
  attachmentId: string;
};

@Injectable()
export class DeleteKnowledgeArticleAttachmentUseCase {
  constructor(
    @Inject(KnowledgeArticleAttachmentWriteRepository)
    private readonly knowledgeArticleAttachmentWriteRepository: KnowledgeArticleAttachmentWriteRepository,
    @Inject(KnowledgeArticleAttachmentReadRepository)
    private readonly knowledgeArticleAttachmentReadRepository: KnowledgeArticleAttachmentReadRepository,
    private readonly getKnowledgeArticleUseCase: GetKnowledgeArticleUseCase,
  ) {}

  async execute(command: DeleteKnowledgeArticleAttachmentCommand): Promise<void> {
    const normalizedArticleId = command.articleId.trim();
    const normalizedAttachmentId = command.attachmentId.trim();
    const normalizedActorUserId = command.actorUserId.trim();

    if (!normalizedArticleId) {
      throw new BadRequestException('articleId is required.');
    }

    if (!normalizedAttachmentId) {
      throw new BadRequestException('attachmentId is required.');
    }

    if (!normalizedActorUserId) {
      throw new BadRequestException('actorUserId is required.');
    }

    await this.getKnowledgeArticleUseCase.execute(
      normalizedArticleId,
      command.actorRole,
      normalizedActorUserId,
    );

    const attachment =
      await this.knowledgeArticleAttachmentReadRepository.getKnowledgeArticleAttachmentById(
        normalizedArticleId,
        normalizedAttachmentId,
      );

    if (!attachment) {
      throw new NotFoundException('Knowledge article attachment not found.');
    }

    await this.knowledgeArticleAttachmentWriteRepository.deleteKnowledgeArticleAttachment(
      normalizedArticleId,
      normalizedAttachmentId,
    );
  }
}
