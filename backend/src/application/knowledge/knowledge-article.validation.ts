import { BadRequestException } from '@nestjs/common';
import { type KnowledgeArticleStatus } from '../../domain/knowledge/knowledge-article';

export type KnowledgeArticleInput = {
  category?: unknown;
  content?: unknown;
  status?: unknown;
  title?: unknown;
};

export type ValidKnowledgeArticleInput = {
  category: string;
  content: string;
  slug: string;
  status: KnowledgeArticleStatus;
  title: string;
};

export function validateKnowledgeArticleInput(
  input: KnowledgeArticleInput,
): ValidKnowledgeArticleInput {
  const title = normalizeRequiredText(input.title, 'title');
  const category = normalizeRequiredText(input.category, 'category');
  const content = normalizeRequiredText(input.content, 'content');
  const status = normalizeStatus(input.status);

  return {
    category,
    content,
    slug: createSlug(title),
    status,
    title,
  };
}

function normalizeRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`${field} is required.`);
  }

  return normalized;
}

function normalizeStatus(value: unknown): KnowledgeArticleStatus {
  if (value === 'DRAFT' || value === 'PUBLISHED') {
    return value;
  }

  throw new BadRequestException('status must be one of DRAFT or PUBLISHED.');
}

function createSlug(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || crypto.randomUUID();
}
