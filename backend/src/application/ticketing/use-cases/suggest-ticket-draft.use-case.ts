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

export type TicketDraftAssistantResponse = {
  action: 'ASK_QUESTION' | 'SUGGEST_TICKET';
  question: string | null;
  suggestion: TicketDraftSuggestion | null;
};

export type TicketDraftSuggestion = {
  categoryName: string | null;
  confidence: number;
  description: string;
  impact: IncidentSeverity | null;
  priorityName: PriorityName | null;
  requestType: RequestType | null;
  suggestedActions: string[];
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
  async execute(
    command: SuggestTicketDraftCommand,
  ): Promise<TicketDraftAssistantResponse> {
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
                action: {
                  type: 'string',
                  enum: ['ASK_QUESTION', 'SUGGEST_TICKET'],
                },
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
                question: { type: ['string', 'null'] },
                suggestedActions: {
                  type: 'array',
                  items: { type: 'string' },
                  maxItems: 4,
                },
                title: { type: 'string' },
                type: { type: 'string', enum: ['INCIDENT', 'REQUEST'] },
                urgency: {
                  type: ['string', 'null'],
                  enum: ['LOW', 'MEDIUM', 'HIGH', null],
                },
              },
              required: [
                'action',
                'categoryName',
                'confidence',
                'description',
                'impact',
                'priorityName',
                'question',
                'requestType',
                'suggestedActions',
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
    return this.normalizeAssistantResponse(this.extractText(body));
  }

  private buildPrompt(command: SuggestTicketDraftCommand, userInput: string): string {
    const categories = command.categories?.filter(Boolean).slice(0, 80) ?? [];
    const priorities = command.priorities?.filter(Boolean).slice(0, 20) ?? [];

    return [
      `Mode actuellement affiche: ${command.currentMode ?? 'non precise'}.`,
      `Categories disponibles: ${categories.length ? categories.join(', ') : 'non fournies'}.`,
      `Priorites disponibles: ${priorities.length ? priorities.join(', ') : 'LOW, MEDIUM, HIGH, CRITICAL'}.`,
      '',
      'Regles de decision:',
      '- INCIDENT = quelque chose ne fonctionne plus, est degrade, bloque ou provoque une erreur;',
      '- REQUEST = l utilisateur demande un equipement, un acces, une installation, une creation, une modification ou un service;',
      '- pour une REQUEST, ne propose pas de depannage inutile; collecte plutot les informations necessaires;',
      '- pour un INCIDENT, tu peux proposer 2 a 4 actions simples a essayer avant creation du ticket;',
      '',
      'Informations minimales avant action=SUGGEST_TICKET:',
      '- incident materiel: equipement concerne, symptome precis, niveau de blocage, depuis quand, et au moins un indice de diagnostic utile si pertinent (voyant, alimentation, ecran, bruit, message d erreur, modele/type fixe ou portable);',
      '- incident logiciel: logiciel concerne, erreur/comportement, depuis quand, impact utilisateur, et action deja tentee si pertinente;',
      '- demande materiel: objet demande, type/modele si utile, quantite, utilisateur concerne, justification ou urgence;',
      '- demande logiciel: nom du logiciel, poste/utilisateur concerne, justification, urgence;',
      "- demande acces: application/service, type ou niveau d'acces, utilisateur concerne, justification;",
      '',
      'Comportement attendu:',
      "- si une information minimale manque, action=ASK_QUESTION et tu poses une seule question courte, adaptee au contexte;",
      "- ne pose pas plusieurs questions a la fois sauf si elles sont naturellement liees, par exemple 'type ou modele';",
      "- si l utilisateur ne sait pas, accepte une reponse approximative et prepare le ticket avec cette incertitude;",
      "- si les informations sont suffisantes, action=SUGGEST_TICKET et tu prepares le ticket;",
      "- pour un INCIDENT, ne passe pas a SUGGEST_TICKET et ne propose pas suggestedActions tant qu'il manque le niveau de blocage ou un indice de diagnostic essentiel;",
      "- pour un incident 'PC ne s'allume pas', demande d'abord si c'est un fixe ou portable et si un voyant/bruit/ecran apparait quand il est branche;",
      '- quand action=SUGGEST_TICKET pour un INCIDENT, suggestedActions contient 2 a 4 actions prudentes, non destructrices et comprehensibles;',
      '- quand action=SUGGEST_TICKET pour une REQUEST, suggestedActions doit etre vide sauf verification administrative utile;',
      "- ne repose jamais une question dont la reponse est deja evidente dans la conversation;",
      "- par exemple si l'utilisateur parle deja de son ordinateur, ne demande pas quel equipement est concerne; demande plutot s'il s'allume, s'il y a un message d'erreur, ou si c'est portable/fixe si utile;",
      '- proposer un titre de 40 caracteres maximum quand action=SUGGEST_TICKET;',
      '- reformuler une description claire et exploitable pour le support quand action=SUGGEST_TICKET;',
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

  private normalizeAssistantResponse(rawText: string): TicketDraftAssistantResponse {
    let parsed: TicketDraftAssistantResponse & TicketDraftSuggestion;

    try {
      parsed = JSON.parse(rawText) as TicketDraftAssistantResponse &
        TicketDraftSuggestion;
    } catch {
      throw new ServiceUnavailableException(
        "La reponse IA n'a pas pu etre interpretee.",
      );
    }

    if (parsed.action === 'ASK_QUESTION') {
      return {
        action: 'ASK_QUESTION',
        question:
          this.normalizeNullableText(parsed.question) ??
          'Pouvez-vous apporter une precision supplementaire ?',
        suggestion: null,
      };
    }

    const type =
      parsed.type === TicketType.REQUEST ? TicketType.REQUEST : TicketType.INCIDENT;

    return {
      action: 'SUGGEST_TICKET',
      question: null,
      suggestion: {
        categoryName: this.normalizeNullableText(parsed.categoryName),
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
        description: parsed.description?.trim() || '',
        impact: this.normalizeEnum(parsed.impact, IncidentSeverity),
        priorityName: this.normalizeEnum(parsed.priorityName, PriorityName),
        requestType: this.normalizeEnum(parsed.requestType, RequestType),
        suggestedActions:
          type === TicketType.INCIDENT
            ? this.normalizeSuggestedActions(parsed.suggestedActions)
            : [],
        title: (parsed.title?.trim() || 'Ticket a qualifier').slice(0, 40),
        type,
        urgency: this.normalizeEnum(parsed.urgency, IncidentSeverity),
      },
    };
  }

  private normalizeNullableText(value: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeSuggestedActions(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, 4);
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
