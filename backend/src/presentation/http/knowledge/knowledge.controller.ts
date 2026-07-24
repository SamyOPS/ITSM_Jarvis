import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AddKnowledgeArticleAttachmentUseCase } from '../../../application/knowledge/use-cases/add-knowledge-article-attachment.use-case';
import { CreateKnowledgeArticleUseCase } from '../../../application/knowledge/use-cases/create-knowledge-article.use-case';
import { DeleteKnowledgeArticleUseCase } from '../../../application/knowledge/use-cases/delete-knowledge-article.use-case';
import { DeleteKnowledgeArticleAttachmentUseCase } from '../../../application/knowledge/use-cases/delete-knowledge-article-attachment.use-case';
import { GetKnowledgeArticleUseCase } from '../../../application/knowledge/use-cases/get-knowledge-article.use-case';
import { ListKnowledgeArticlesUseCase } from '../../../application/knowledge/use-cases/list-knowledge-articles.use-case';
import { ListKnowledgeArticleAttachmentsUseCase } from '../../../application/knowledge/use-cases/list-knowledge-article-attachments.use-case';
import { ToggleKnowledgeArticleLikeUseCase } from '../../../application/knowledge/use-cases/toggle-knowledge-article-like.use-case';
import { UpdateKnowledgeArticleUseCase } from '../../../application/knowledge/use-cases/update-knowledge-article.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { KnowledgeArticleAttachment } from '../../../domain/knowledge/knowledge-article-attachment';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AddKnowledgeArticleAttachmentDto } from './add-knowledge-article-attachment.dto';

type KnowledgeArticleBodyDto = {
  category?: unknown;
  content?: unknown;
  status?: unknown;
  title?: unknown;
};

@Controller('knowledge/articles')
@UseGuards(BearerAuthGuard, RolesGuard)
@Roles(UserRole.DEMANDEUR, UserRole.AGENT, UserRole.ADMIN)
export class KnowledgeController {
  constructor(
    private readonly addKnowledgeArticleAttachmentUseCase: AddKnowledgeArticleAttachmentUseCase,
    private readonly createKnowledgeArticleUseCase: CreateKnowledgeArticleUseCase,
    private readonly deleteKnowledgeArticleUseCase: DeleteKnowledgeArticleUseCase,
    private readonly deleteKnowledgeArticleAttachmentUseCase: DeleteKnowledgeArticleAttachmentUseCase,
    private readonly getKnowledgeArticleUseCase: GetKnowledgeArticleUseCase,
    private readonly listKnowledgeArticleAttachmentsUseCase: ListKnowledgeArticleAttachmentsUseCase,
    private readonly listKnowledgeArticlesUseCase: ListKnowledgeArticlesUseCase,
    private readonly toggleKnowledgeArticleLikeUseCase: ToggleKnowledgeArticleLikeUseCase,
    private readonly updateKnowledgeArticleUseCase: UpdateKnowledgeArticleUseCase,
  ) {}

  @Get()
  listArticles(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle[]> {
    return this.listKnowledgeArticlesUseCase.execute(user.role, user.id);
  }

  @Get(':id')
  getArticle(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle> {
    return this.getKnowledgeArticleUseCase.execute(id, user.role, user.id);
  }

  @Get(':id/attachments')
  listAttachments(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticleAttachment[]> {
    return this.listKnowledgeArticleAttachmentsUseCase.execute(
      id,
      user.id,
      user.role,
    );
  }

  @Post(':id/like')
  toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle> {
    return this.toggleKnowledgeArticleLikeUseCase.execute(
      id,
      user.id,
      user.role,
    );
  }

  @Post()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  createArticle(
    @Body() body: KnowledgeArticleBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle> {
    return this.createKnowledgeArticleUseCase.execute(body, user.id, user.role);
  }

  @Post(':id/attachments')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  addAttachment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddKnowledgeArticleAttachmentDto,
  ): Promise<KnowledgeArticleAttachment> {
    return this.addKnowledgeArticleAttachmentUseCase.execute({
      articleId: id,
      bucketId: body.bucketId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storagePath: body.storagePath,
      uploaderRole: user.role,
      uploaderUserId: user.id,
    });
  }

  @Patch(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  updateArticle(
    @Param('id') id: string,
    @Body() body: KnowledgeArticleBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle> {
    return this.updateKnowledgeArticleUseCase.execute(
      id,
      user.id,
      user.role,
      body,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  deleteArticle(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.deleteKnowledgeArticleUseCase.execute(id, user.id, user.role);
  }

  @Delete(':articleId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  deleteAttachment(
    @Param('articleId') articleId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.deleteKnowledgeArticleAttachmentUseCase.execute({
      actorRole: user.role,
      actorUserId: user.id,
      articleId,
      attachmentId,
    });
  }
}
