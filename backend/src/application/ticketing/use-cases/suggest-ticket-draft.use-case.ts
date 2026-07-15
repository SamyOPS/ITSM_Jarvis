import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getBackendRuntimeConfig } from '../../../infrastructure/config/app-config';
import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { RequestType } from '../../../domain/ticketing/request-type';
import { TicketType } from '../../../domain/ticketing/ticket-type';

export type SuggestTicketDraftCommand = {
  categories?: string[];
  currentMode?: TicketType | null;
  priorities?: string[];
  userInput: string;
};

export type TicketDraftSuggestion = {
  categoryName: string | null;
  confidence: number;
  description: string;
  impact: IncidentSeverity | null;
  priorityName: PriorityName | null;
  requestType: RequestType | null;
  title: string;
  type: TicketType;
  urgency: IncidentSeverity | null;
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

@Injectable()
export class SuggestTicketDraftUseCase {
  async execute(command: SuggestTicketDraftCommand): Promise<TicketDraftSuggestion> {
    const userInput = command.userInput.trim();

    if (userInput.length < 10) {
      throw new BadRequestException(
        'Decrivez le besoin en quelques mots avant de demander une suggestion.',
      );
    }

    if (userInput.length > 3000) {
      throw new BadRequestException(
        'La description est trop longue pour une suggestion IA.',
      );
    }

    const config = getBackendRuntimeConfig();

    if (!config.openaiApiKey) {
      throw new ServiceUnavailableException(
        "L'assistance IA n'est pas configuree sur le backend.",
      );
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openaiModel,
        input: [
          {
            role: 'system',
            content:
              'Tu aides a preparer un ticket ITSM. Reponds uniquement avec le JSON demande. Ne cree aucune information factuelle non fournie. Reste concis, professionnel et en francais.',
          },
          {
            role: 'user',
            content: this.buildPrompt(command, userInput),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'ticket_draft_suggestion',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                categoryName: { type: ['string', 'null'] },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                description: { type: 'string' },
                impact: {
                  type: ['string', 'null'],
                  enum: ['LOW', 'MEDIUM', 'HIGH', null],
                },
                priorityName: {
                  type: ['string', 'null'],
                  enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', null],
                },
                requestType: {
                  type: ['string', 'null'],
                  enum: ['ACCESS', 'HARDWARE', 'SOFTWARE', 'OTHER', null],
                },
                title: { type: 'string' },
                type: { type: 'string', enum: ['INCIDENT', 'REQUEST'] },
                urgency: {
                  type: ['string', 'null'],
                  enum: ['LOW', 'MEDIUM', 'HIGH', null],
                },
              },
              required: [
                'categoryName',
                'confidence',
                'description',
                'impact',
                'priorityName',
                'requestType',
                'title',
                'type',
                'urgency',
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        "La generation IA du ticket a echoue.",
      );
    }

    const body = (await response.json()) as OpenAiResponse;
    return this.normalizeSuggestion(this.extractText(body));
  }

  private buildPrompt(command: SuggestTicketDraftCommand, userInput: string): string {
    const categories = command.categories?.filter(Boolean).slice(0, 80) ?? [];
    const priorities = command.priorities?.filter(Boolean).slice(0, 20) ?? [];

    return [
      `Mode actuellement affiche: ${command.currentMode ?? 'non precise'}.`,
      `Categories disponibles: ${categories.length ? categories.join(', ') : 'non fournies'}.`,
      `Priorites disponibles: ${priorities.length ? priorities.join(', ') : 'LOW, MEDIUM, HIGH, CRITICAL'}.`,
      '',
      'Objectif:',
      '- choisir INCIDENT si un service/equipement ne fonctionne plus ou est degrade;',
      '- choisir REQUEST si la personne demande un acces, une installation, un materiel ou un service;',
      '- proposer un titre de 40 caracteres maximum;',
      '- reformuler une description claire et exploitable pour le support;',
      '- si une categorie semble evidente, reprendre exactement son nom depuis la liste fournie.',
      '',
      `Description utilisateur: ${userInput}`,
    ].join('\n');
  }

  private extractText(response: OpenAiResponse): string {
    if (response.output_text?.trim()) {
      return response.output_text;
    }

    const text = response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? '')
      .find((value) => value.trim());

    if (!text) {
      throw new ServiceUnavailableException(
        "La reponse IA ne contient pas de suggestion exploitable.",
      );
    }

    return text;
  }

  private normalizeSuggestion(rawText: string): TicketDraftSuggestion {
    let parsed: TicketDraftSuggestion;

    try {
      parsed = JSON.parse(rawText) as TicketDraftSuggestion;
    } catch {
      throw new ServiceUnavailableException(
        "La reponse IA n'a pas pu etre interpretee.",
      );
    }

    return {
      categoryName: this.normalizeNullableText(parsed.categoryName),
      confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
      description: parsed.description?.trim() || '',
      impact: this.normalizeEnum(parsed.impact, IncidentSeverity),
      priorityName: this.normalizeEnum(parsed.priorityName, PriorityName),
      requestType: this.normalizeEnum(parsed.requestType, RequestType),
      title: (parsed.title?.trim() || 'Ticket a qualifier').slice(0, 40),
      type:
        parsed.type === TicketType.REQUEST ? TicketType.REQUEST : TicketType.INCIDENT,
      urgency: this.normalizeEnum(parsed.urgency, IncidentSeverity),
    };
  }

  private normalizeNullableText(value: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeEnum<T extends Record<string, string>>(
    value: string | null,
    values: T,
  ): T[keyof T] | null {
    if (!value) {
      return null;
    }

    return Object.values(values).includes(value) ? (value as T[keyof T]) : null;
  }
}
