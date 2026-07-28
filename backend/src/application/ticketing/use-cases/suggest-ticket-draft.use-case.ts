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
import { resolveIncidentPriorityName } from '../incident-priority';

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

    if (!userInput) {
      throw new BadRequestException('Le message ne peut pas etre vide.');
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
        'La generation IA du ticket a echoue.',
      );
    }

    const body = (await response.json()) as OpenAiResponse;
    return this.normalizeAssistantResponse(this.extractText(body), userInput);
  }

  private buildPrompt(
    command: SuggestTicketDraftCommand,
    userInput: string,
  ): string {
    const categories = command.categories?.filter(Boolean).slice(0, 80) ?? [];
    const priorities = command.priorities?.filter(Boolean).slice(0, 20) ?? [];

    return [
      `Mode actuellement affiche: ${command.currentMode ?? 'non precise'}.`,
      `Categories disponibles: ${categories.length ? categories.join(', ') : 'non fournies'}.`,
      `Priorites disponibles: ${priorities.length ? priorities.join(', ') : 'LOW, MEDIUM, HIGH, CRITICAL'}.`,
      '',
      'Objectif:',
      "- raisonne comme un assistant ITSM conversationnel: comprendre, aider un peu si c'est raisonnable, puis preparer un brouillon de ticket;",
      '- si le message est seulement une salutation ou ne contient aucun probleme/demande identifiable, action=ASK_QUESTION avec une question naturelle pour connaitre le sujet;',
      '- phase diagnostic: tu peux poser 0 a 3 questions utiles pour mieux qualifier le ticket et enrichir la description;',
      '- phase aide simple: tu peux proposer 0 a 3 actions simples si un utilisateur normal peut les tenter sans risque et sans procedure complexe;',
      "- adapte le nombre de questions/actions a la situation: 0 si le probleme est complexe, urgent, risque, ou clairement a traiter par le support; 1 a 3 si c'est simple et utile;",
      "- pour les problemes simples et frequents comme PC qui ne s'allume pas, Wi-Fi/Internet, application bloquee, imprimante ou accessoire, fais au moins une aide simple avant le brouillon si aucune tentative de resolution n'est deja mentionnee;",
      "- exemple PC qui ne s'allume pas: avant le brouillon, proposer de brancher le chargeur/secteur, tester une autre prise ou un autre cable, patienter quelques minutes si batterie vide, puis demander ce que cela donne;",
      "- Vision est l'application actuelle de ticketing/portail; si l'utilisateur parle de mdp Vision, compte Vision ou mot de passe de cette appli, ne demande pas quelle application est concernee;",
      "- si l'utilisateur parle seulement d'un mot de passe oublie sans nommer Vision, ne suppose jamais que c'est Vision; demande d'abord de quel compte/service il s'agit: session PC, messagerie, application, VPN, Vision ou autre;",
      "- pour un mot de passe oublie Vision/portail, proposer d'abord d'utiliser le lien Mot de passe oublie sur l'ecran de connexion et de verifier l'email de reinitialisation; si cela ne marche pas, preparer une demande;",
      "- apres quelques questions/actions ou des que l'utilisateur donne assez d'elements, action=SUGGEST_TICKET;",
      "- si l'utilisateur dit que tes conseils ne changent rien, qu'il ne peut pas les faire, ou qu'il veut un ticket, action=SUGGEST_TICKET;",
      "- ne force pas toujours une proposition apres un seul message d'aide; ne prolonge pas non plus la conversation inutilement;",
      "- ne demande jamais de repondre en une phrase; l'utilisateur peut donner autant de details qu'il le souhaite;",
      "- n'ecris jamais l'expression exacte: le probleme persiste-t-il;",
      '- ne fais jamais une longue procedure de diagnostic technique;',
      "- si l'utilisateur demande une modification de la proposition, produis une nouvelle proposition corrigee avec action=SUGGEST_TICKET;",
      '- si le probleme est urgent, bloquant, securite, perte de donnees, ou impacte plusieurs utilisateurs, action=SUGGEST_TICKET sans triage;',
      '- si une information secondaire manque, fais une hypothese raisonnable avec une confidence plus basse au lieu de prolonger la conversation;',
      '- choisir INCIDENT si un service/equipement ne fonctionne plus ou est degrade;',
      '- choisir REQUEST si la personne demande un acces, une installation, un materiel ou un service;',
      "- pour un INCIDENT, renseigner impact et urgency: la priorite sera calculee a partir de ces deux valeurs, pas l'inverse;",
      '- pour un INCIDENT, priorityName doit rester coherent avec impact et urgency, mais impact et urgency sont les donnees sources;',
      "- n'utilise une priorite CRITICAL que si plusieurs utilisateurs, un service global, la production, la securite ou des donnees sont fortement impactes;",
      '- pour un poste utilisateur seul, un ecran, un cable, une imprimante ou un probleme individuel sans contexte critique, ne depasse generalement pas HIGH;',
      '- pour une REQUEST, renseigner priorityName directement;',
      '- proposer un titre de 40 caracteres maximum quand action=SUGGEST_TICKET;',
      "- quand action=SUGGEST_TICKET, la description doit seulement decrire le probleme ou la demande avec les informations deja donnees par l'utilisateur;",
      '- la description ne doit jamais contenir de questions, de checklist, de consignes au technicien, ni de phrases comme informations a preciser, a confirmer, besoin urgent ou delai souhaite;',
      '- si des informations manquent, ne les invente pas et ne les liste pas dans la description; garde une description simple du besoin connu;',
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
        'La reponse IA ne contient pas de suggestion exploitable.',
      );
    }

    return text;
  }

  private normalizeAssistantResponse(
    rawText: string,
    userInput: string,
  ): TicketDraftAssistantResponse {
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
          this.normalizeAssistantQuestion(parsed.question, userInput) ??
          'Pouvez-vous apporter une precision supplementaire ?',
        suggestion: null,
      };
    }

    const type =
      parsed.type === TicketType.REQUEST
        ? TicketType.REQUEST
        : TicketType.INCIDENT;

    const troubleshootingQuestion =
      this.getMissingSimpleTroubleshootingQuestion(userInput);

    if (troubleshootingQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: troubleshootingQuestion,
        suggestion: null,
      };
    }

    const impact = this.normalizeEnum(parsed.impact, IncidentSeverity);
    const urgency = this.normalizeEnum(parsed.urgency, IncidentSeverity);
    const [incidentImpact, incidentUrgency] = this.normalizeIncidentSeverity(
      impact ?? IncidentSeverity.MEDIUM,
      urgency ?? IncidentSeverity.MEDIUM,
      [userInput, parsed.title, parsed.description].filter(Boolean).join('\n'),
    );
    const priorityName =
      type === TicketType.INCIDENT
        ? resolveIncidentPriorityName(incidentImpact, incidentUrgency)
        : this.normalizeEnum(parsed.priorityName, PriorityName);

    return {
      action: 'SUGGEST_TICKET',
      question: null,
      suggestion: {
        categoryName: this.normalizeNullableText(parsed.categoryName),
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
        description: this.normalizeTicketDescription(parsed.description),
        impact: type === TicketType.INCIDENT ? incidentImpact : null,
        priorityName,
        requestType: this.normalizeEnum(parsed.requestType, RequestType),
        title: (parsed.title?.trim() || 'Ticket a qualifier').slice(0, 40),
        type,
        urgency: type === TicketType.INCIDENT ? incidentUrgency : null,
      },
    };
  }

  private normalizeNullableText(value: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeTicketDescription(value: string | null | undefined): string {
    const description = value?.trim() ?? '';
    const normalizedDescription = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const stopPatterns = [
      'informations a preciser',
      'a preciser',
      'a confirmer',
      'questions a poser',
      'pour quel',
      'besoin urgent',
      'delai souhaite',
      'Informations a preciser',
      'Informations à préciser',
      'A preciser',
      'À préciser',
      'A confirmer',
      'À confirmer',
      'Questions a poser',
      'Questions à poser',
      'Pour quel',
      'Besoin urgent',
      'Delai souhaite',
      'Délai souhaité',
    ];
    const firstStopIndex = stopPatterns
      .map((pattern) => normalizedDescription.indexOf(pattern))
      .filter((index) => index >= 0)
      .sort((left, right) => left - right)[0];

    return (
      firstStopIndex === undefined
        ? description
        : description.slice(0, firstStopIndex)
    )
      .replace(/\s*[-:;,.]\s*$/u, '')
      .trim();
  }

  private normalizeAssistantQuestion(
    value: string | null,
    conversation: string,
  ): string | null {
    const normalized = this.normalizeNullableText(value);

    if (!normalized) {
      return null;
    }

    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedQuestion = this.normalizeForMatching(normalized);
    const mentionsPasswordIssue =
      /(mdp|mot de passe|password|connexion|connecter|login|identifiant)/u.test(
        normalizedConversation,
      );
    const userMentionedVision =
      /\b(vision|portail|cette appli|application actuelle|appli de ticketing|ticketing)\b/u.test(
        normalizedConversation,
      );
    const questionAssumesVision =
      /\b(vision|portail)\b/u.test(normalizedQuestion) &&
      /(mdp|mot de passe|password|connexion|connecter|login|reinitialisation|reinitialiser|mot de passe oublie)/u.test(
        normalizedQuestion,
      );

    if (
      mentionsPasswordIssue &&
      questionAssumesVision &&
      !userMentionedVision
    ) {
      return "De quel mot de passe s'agit-il : session du PC, messagerie, application, VPN, Vision ou autre service ?";
    }

    const question = normalized
      .replace(/le probl[eè]me persiste-t-il\s*\?/giu, '')
      .replace(/le probleme persiste-t-il\s*\?/giu, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*[-:;,.]\s*$/u, '')
      .trim();

    return question || 'Dites-moi ce que donnent ces verifications.';
  }

  private getMissingSimpleTroubleshootingQuestion(
    conversation: string,
  ): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const mentionsVisionPasswordIssue =
      /(vision|portail|cette appli|application actuelle|appli de ticketing|ticketing).*(mdp|mot de passe|password|connexion|connecter|login)/u.test(
        normalizedConversation,
      ) ||
      /(mdp|mot de passe|password|connexion|connecter|login).*(vision|portail|cette appli|application actuelle|appli de ticketing|ticketing)/u.test(
        normalizedConversation,
      );

    if (mentionsVisionPasswordIssue) {
      const alreadySuggestedPasswordReset =
        /(mot de passe oublie|mdp oublie|reinitialisation|reinitialiser|email de reinitialisation|mail de reinitialisation|lien de reinitialisation)/u.test(
          normalizedConversation,
        );

      if (!alreadySuggestedPasswordReset) {
        return "Vision est bien l'application actuelle. Avant de creer une demande, essayez le lien Mot de passe oublie sur l'ecran de connexion, puis verifiez l'email de reinitialisation. Si vous ne recevez rien ou si cela ne fonctionne pas, dites-le-moi et je preparerai la demande.";
      }
    }

    const mentionsComputerPowerIssue =
      /(pc|ordinateur|portable|poste|ecran).*(s[' ]?allume pas|demarre pas|ne demarre pas|aucun voyant|pas de voyant|ventilateur)/u.test(
        normalizedConversation,
      ) ||
      /(s[' ]?allume pas|demarre pas|ne demarre pas|aucun voyant|pas de voyant|ventilateur).*(pc|ordinateur|portable|poste|ecran)/u.test(
        normalizedConversation,
      );

    if (!mentionsComputerPowerIssue) {
      return null;
    }

    const alreadySuggestedPowerCheck =
      /(chargeur|batterie|secteur|prise|cable d alimentation|cable alimentation|alimentation|brancher|branche|autre prise|laisser charger)/u.test(
        normalizedConversation,
      );

    if (alreadySuggestedPowerCheck) {
      return null;
    }

    return 'Avant de creer le ticket, pouvez-vous brancher le PC au chargeur/secteur, tester une autre prise si possible, puis attendre quelques minutes si la batterie etait vide ? Dites-moi ensuite ce que cela donne.';
  }

  private normalizeIncidentSeverity(
    impact: IncidentSeverity,
    urgency: IncidentSeverity,
    context: string,
  ): [IncidentSeverity, IncidentSeverity] {
    const priorityName = resolveIncidentPriorityName(impact, urgency);

    if (
      priorityName !== PriorityName.CRITICAL ||
      this.hasCriticalIncidentSignal(context)
    ) {
      return [impact, urgency];
    }

    return [IncidentSeverity.HIGH, IncidentSeverity.MEDIUM];
  }

  private hasCriticalIncidentSignal(context: string): boolean {
    const normalizedContext = this.normalizeForMatching(context);
    const criticalPatterns = [
      'plusieurs utilisateurs',
      'tous les utilisateurs',
      'tout le monde',
      'equipe entiere',
      'site complet',
      'panne generale',
      'service global',
      'service indisponible',
      'production',
      'securite',
      'cyber',
      'virus',
      'ransom',
      'intrusion',
      'fuite de donnees',
      'perte de donnees',
      'donnees perdues',
      'serveur',
      'reseau general',
      'application metier indisponible',
    ];

    return criticalPatterns.some((pattern) =>
      normalizedContext.includes(pattern),
    );
  }

  private normalizeForMatching(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
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
