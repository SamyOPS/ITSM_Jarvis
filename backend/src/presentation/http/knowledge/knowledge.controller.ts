import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateKnowledgeArticleUseCase } from '../../../application/knowledge/use-cases/create-knowledge-article.use-case';
import { GetKnowledgeArticleUseCase } from '../../../application/knowledge/use-cases/get-knowledge-article.use-case';
import { ListKnowledgeArticlesUseCase } from '../../../application/knowledge/use-cases/list-knowledge-articles.use-case';
import { type AuthenticatedUser } from '../../../domain/auth/authenticated-user';
import { UserRole } from '../../../domain/auth/user-role';
import { KnowledgeArticle } from '../../../domain/knowledge/knowledge-article';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

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
    private readonly createKnowledgeArticleUseCase: CreateKnowledgeArticleUseCase,
    private readonly getKnowledgeArticleUseCase: GetKnowledgeArticleUseCase,
    private readonly listKnowledgeArticlesUseCase: ListKnowledgeArticlesUseCase,
  ) {}

  @Get()
  listArticles(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle[]> {
    return this.listKnowledgeArticlesUseCase.execute(user.role);
  }

  @Get(':id')
  getArticle(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle> {
    return this.getKnowledgeArticleUseCase.execute(id, user.role);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createArticle(
    @Body() body: KnowledgeArticleBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeArticle> {
    return this.createKnowledgeArticleUseCase.execute(body, user.id);
  }
}
