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
  channels?: string[];
  currentMode?: TicketType | null;
  priorities?: string[];
  requesters?: string[];
  userInput: string;
};

export type TicketDraftAssistantResponse = {
  action: 'ASK_QUESTION' | 'SUGGEST_TICKET';
  question: string | null;
  suggestion: TicketDraftSuggestion | null;
};

export type TicketDraftSuggestion = {
  categoryName: string | null;
  channelName: string | null;
  confidence: number;
  description: string;
  impact: IncidentSeverity | null;
  priorityName: PriorityName | null;
  requesterName: string | null;
  requesterScope: 'SELF' | 'OTHER' | null;
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
                channelName: { type: ['string', 'null'] },
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
                requesterName: { type: ['string', 'null'] },
                requesterScope: {
                  type: ['string', 'null'],
                  enum: ['SELF', 'OTHER', null],
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
                'channelName',
                'confidence',
                'description',
                'impact',
                'priorityName',
                'question',
                'requesterName',
                'requesterScope',
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
    const channels = command.channels?.filter(Boolean).slice(0, 20) ?? [];
    const priorities = command.priorities?.filter(Boolean).slice(0, 20) ?? [];
    const requesters = command.requesters?.filter(Boolean).slice(0, 120) ?? [];

    return [
      `Mode actuellement affiche: ${command.currentMode ?? 'non precise'}.`,
      `Categories disponibles: ${categories.length ? categories.join(', ') : 'non fournies'}.`,
      `Canaux disponibles: ${channels.length ? channels.join(', ') : 'non fournis'}.`,
      `Priorites disponibles: ${priorities.length ? priorities.join(', ') : 'LOW, MEDIUM, HIGH, CRITICAL'}.`,
      `Utilisateurs demandeurs disponibles: ${requesters.length ? requesters.join(', ') : 'non fournis'}.`,
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
      "- si le mot de passe oublie concerne la session PC et que le ticket est pour l'utilisateur lui-meme, ne redemande pas l'identifiant exact ni le poste; ces informations sont utiles mais non bloquantes, prepare le ticket avec ce qui est connu;",
      "- si le mot de passe oublie concerne une messagerie ou une application avec mecanisme de reinitialisation simple, propose d'abord l'action simple Mot de passe oublie/reinitialisation avant de preparer le ticket;",
      "- pour un mot de passe oublie Vision/portail, proposer d'abord d'utiliser le lien Mot de passe oublie sur l'ecran de connexion et de verifier l'email de reinitialisation; si cela ne marche pas, preparer une demande;",
      "- avant action=SUGGEST_TICKET, identifie toujours si le ticket est pour l'utilisateur lui-meme ou pour un autre utilisateur de l'application;",
      "- si ce n'est pas clair, action=ASK_QUESTION avec: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?",
      '- si le ticket est pour lui-meme, requesterScope=SELF, requesterName=null, channelName=Portail;',
      "- si le ticket est pour quelqu'un d'autre, requesterScope=OTHER; si le nom/prenom manque, demande l'identite de cette personne;",
      "- si l'utilisateur repond seulement un autre, autre utilisateur ou equivalent, ce n'est pas un nom: requesterName doit rester null;",
      "- si seul le prenom est connu ou si l'utilisateur dit qu'il ne connait pas le nom, accepte ce prenom dans requesterName et avance; ne redemande pas le nom complet;",
      "- si requesterScope=OTHER et que le canal de demande manque, demande exactement: Pouvez-vous préciser comment on vous a fait la demande (Email, Chat, Téléphone, à l'oral, ...) ?",
      "- n'utilise pas le mot canal dans les questions a l'utilisateur; dis plutot comment la demande a ete faite;",
      "- si l'utilisateur demande ce que veut dire canal ou ce que tu demandes, explique simplement que c'est la facon dont la demande est arrivee: email, chat/message, telephone, oral, portail, etc.;",
      "- pour le canal interne, choisis un nom depuis les canaux disponibles quand c'est possible; mail/email=Email, message/chat=Chat, telephone/appel=Telephone, portail=Portail, oral/en face a face=Autre;",
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
      "- choisir INCIDENT si l'utilisateur ne peut pas se connecter, a oublie un mot de passe, a un compte bloque ou un probleme d'acces existant;",
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
      const requesterScope = this.inferRequesterScope(userInput);
      const requesterName =
        requesterScope === 'OTHER'
          ? (this.inferPartialRequesterName(userInput) ??
            this.normalizeRequesterName(parsed.requesterName))
          : null;
      const channelName =
        requesterScope === 'SELF'
          ? 'Portail'
          : this.inferChannelName(userInput);
      const requesterContextQuestion =
        requesterScope === 'OTHER'
          ? this.getMissingRequesterContextQuestion(
              requesterScope,
              requesterName,
              channelName,
            )
          : null;

      if (requesterContextQuestion) {
        return {
          action: 'ASK_QUESTION',
          question: requesterContextQuestion,
          suggestion: null,
        };
      }

      const forcedSuggestion = this.getForcedSuggestionFromConversation(
        userInput,
        parsed.question,
        parsed,
      );

      if (forcedSuggestion) {
        return forcedSuggestion;
      }

      return {
        action: 'ASK_QUESTION',
        question:
          this.normalizeAssistantQuestion(parsed.question, userInput) ??
          'Pouvez-vous apporter une precision supplementaire ?',
        suggestion: null,
      };
    }

    const passwordAccessIncident = this.isPasswordAccessIncident(userInput);
    const type = passwordAccessIncident
      ? TicketType.INCIDENT
      : parsed.type === TicketType.REQUEST
        ? TicketType.REQUEST
        : TicketType.INCIDENT;

    const requesterScope = this.inferRequesterScope(userInput);
    const requesterName =
      requesterScope === 'OTHER'
        ? (this.inferPartialRequesterName(userInput) ??
          this.normalizeRequesterName(parsed.requesterName))
        : null;
    const channelName =
      requesterScope === 'SELF'
        ? (this.normalizeNullableText(parsed.channelName) ?? 'Portail')
        : this.inferChannelName(userInput);
    const troubleshootingQuestion =
      this.getMissingSimpleTroubleshootingQuestion(userInput);

    if (troubleshootingQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: troubleshootingQuestion,
        suggestion: null,
      };
    }

    const requesterContextQuestion = this.getMissingRequesterContextQuestion(
      requesterScope,
      requesterName,
      channelName,
    );

    if (requesterContextQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: requesterContextQuestion,
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
        : (this.normalizeEnum(parsed.priorityName, PriorityName) ??
          PriorityName.MEDIUM);

    return {
      action: 'SUGGEST_TICKET',
      question: null,
      suggestion: {
        categoryName: this.normalizeNullableText(parsed.categoryName),
        channelName,
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
        description: this.normalizeTicketDescription(parsed.description),
        impact: type === TicketType.INCIDENT ? incidentImpact : null,
        priorityName,
        requesterName: requesterScope === 'OTHER' ? requesterName : null,
        requesterScope,
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

  private normalizeRequesterName(value: string | null): string | null {
    const normalized = this.normalizeNullableText(value);

    if (!normalized) {
      return null;
    }

    const normalizedForMatching = this.normalizeForMatching(normalized);
    const genericRequesterNames = new Set([
      'autre',
      'un autre',
      'une autre',
      'autre utilisateur',
      'un autre utilisateur',
      'une autre utilisateur',
      'quelqu un d autre',
      "quelqu'un d'autre",
      'collegue',
      'un collegue',
      'une collegue',
      'quel',
      'quelle',
      'demandeur',
      'utilisateur',
      'utilisateur concerne',
    ]);

    return genericRequesterNames.has(normalizedForMatching) ? null : normalized;
  }

  private getForcedSuggestionFromConversation(
    conversation: string,
    assistantQuestion: string | null,
    parsed: TicketDraftAssistantResponse & TicketDraftSuggestion,
  ): TicketDraftAssistantResponse | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedQuestion = this.normalizeForMatching(
      assistantQuestion ?? '',
    );
    const mentionsPasswordIssue =
      /(mdp|mot de passe|password|connexion|connecter|login)/u.test(
        normalizedConversation,
      );
    const mentionsPcSession =
      /(session pc|session windows|compte windows|poste|ordinateur|pc portable|pc du taf|pc travail|pc professionnel)/u.test(
        normalizedConversation,
      );
    const requesterScope = this.inferRequesterScope(conversation);
    const requesterName =
      requesterScope === 'OTHER'
        ? (this.inferPartialRequesterName(conversation) ??
          this.normalizeRequesterName(parsed.requesterName))
        : null;
    const channelName =
      requesterScope === 'SELF'
        ? 'Portail'
        : this.inferChannelName(conversation);
    const questionAsksOptionalPcDetails =
      /(identifiant|nom d utilisateur|nom utilisateur|compte de session|poste|ordinateur|numero d inventaire|pc concerne)/u.test(
        normalizedQuestion,
      );
    const questionAsksFullRequesterName =
      /(prenom|nom|utilisateur concerne|identite)/u.test(normalizedQuestion);
    const questionAsksChannelClarification =
      /(comment|preciser|confirmer|faite|fait|formulee|demande)/u.test(
        normalizedQuestion,
      ) &&
      /(canal|email|mail|chat|telephone|tel|portail|oral|face a face|autre)/u.test(
        normalizedQuestion,
      );

    if (
      mentionsPasswordIssue &&
      mentionsPcSession &&
      requesterScope === 'SELF' &&
      questionAsksOptionalPcDetails
    ) {
      return {
        action: 'SUGGEST_TICKET',
        question: null,
        suggestion: {
          categoryName: 'Accès',
          channelName: 'Portail',
          confidence: 0.78,
          description:
            "L'utilisateur ne connait plus le mot de passe de sa session PC professionnelle.",
          impact: IncidentSeverity.MEDIUM,
          priorityName: PriorityName.MEDIUM,
          requesterName: null,
          requesterScope: 'SELF',
          requestType: null,
          title: 'Mot de passe session PC oublie',
          type: TicketType.INCIDENT,
          urgency: IncidentSeverity.MEDIUM,
        },
      };
    }

    if (
      requesterScope === 'OTHER' &&
      requesterName &&
      channelName &&
      (questionAsksChannelClarification || questionAsksFullRequesterName)
    ) {
      const type =
        parsed.type === TicketType.REQUEST
          ? TicketType.REQUEST
          : TicketType.INCIDENT;
      const impact = this.normalizeEnum(parsed.impact, IncidentSeverity);
      const urgency = this.normalizeEnum(parsed.urgency, IncidentSeverity);
      const [incidentImpact, incidentUrgency] = this.normalizeIncidentSeverity(
        impact ?? IncidentSeverity.MEDIUM,
        urgency ?? IncidentSeverity.MEDIUM,
        [conversation, parsed.title, parsed.description]
          .filter(Boolean)
          .join('\n'),
      );

      return {
        action: 'SUGGEST_TICKET',
        question: null,
        suggestion: {
          categoryName:
            this.normalizeNullableText(parsed.categoryName) ?? 'Accès',
          channelName,
          confidence: Math.min(
            Math.max(Number(parsed.confidence) || 0.65, 0),
            1,
          ),
          description:
            this.normalizeTicketDescription(parsed.description) ||
            `Demande formulee pour un utilisateur prenomme ${requesterName}, nom non connu.`,
          impact: type === TicketType.INCIDENT ? incidentImpact : null,
          priorityName:
            type === TicketType.INCIDENT
              ? resolveIncidentPriorityName(incidentImpact, incidentUrgency)
              : this.normalizeEnum(parsed.priorityName, PriorityName),
          requesterName,
          requesterScope: 'OTHER',
          requestType: this.normalizeEnum(parsed.requestType, RequestType),
          title: (parsed.title?.trim() || 'Ticket a qualifier').slice(0, 40),
          type,
          urgency: type === TicketType.INCIDENT ? incidentUrgency : null,
        },
      };
    }

    return null;
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

  private inferRequesterScope(conversation: string): 'SELF' | 'OTHER' | null {
    const normalizedConversation = this.normalizeForMatching(conversation);

    if (
      /\b(pour moi|pour nous|me concerne|nous concerne|me concernant|nous concernant|mon ticket|notre ticket|moi-meme|moi meme|c'est pour moi|cest pour moi|c'est pour nous|cest pour nous)\b/u.test(
        normalizedConversation,
      ) ||
      /utilisateur:\s*(moi|nous|pour moi|pour nous|c'est pour moi|cest pour moi|c'est pour nous|cest pour nous)\b/u.test(
        normalizedConversation,
      )
    ) {
      return 'SELF';
    }

    if (
      /\b(un autre|une autre|pour quelqu'un d'autre|pour quelquun dautre|pour un autre|pour une autre|autre utilisateur|pour un collegue|pour une collegue|pour mon collegue|pour ma collegue)\b/u.test(
        normalizedConversation,
      ) ||
      /utilisateur:\s*(autre|quelqu'un d'autre|quelquun dautre|pour un autre|pour une autre)\b/u.test(
        normalizedConversation,
      )
    ) {
      return 'OTHER';
    }

    return null;
  }

  private inferPartialRequesterName(conversation: string): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const conversationLines = normalizedConversation
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const userMessages = conversationLines
      .filter((line) => line.startsWith('utilisateur:'))
      .map((line) => line.replace(/^utilisateur:\s*/u, '').trim())
      .filter(Boolean);
    const lastUserMessage = userMessages[userMessages.length - 1] ?? '';
    const lastAssistantQuestion =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('assistant:'))
        ?.replace(/^assistant:\s*/u, '')
        .trim() ?? '';
    const requesterAnswerMessages: string[] = [];
    let previousAssistantAskedRequesterName = false;

    for (const line of conversationLines) {
      if (line.startsWith('assistant:')) {
        previousAssistantAskedRequesterName =
          /(prenom|nom|utilisateur concerne|identite|demandeur)/u.test(line);
        continue;
      }

      if (line.startsWith('utilisateur:')) {
        if (previousAssistantAskedRequesterName) {
          const answer = line.replace(/^utilisateur:\s*/u, '').trim();

          if (answer) {
            requesterAnswerMessages.push(answer);
          }
        }

        previousAssistantAskedRequesterName = false;
      }
    }

    const latestRequesterAnswer =
      requesterAnswerMessages[requesterAnswerMessages.length - 1] ?? '';
    const rejectedWords = new Set([
      'je',
      'j',
      'il',
      'elle',
      'son',
      'sa',
      'le',
      'la',
      'un',
      'une',
      'autre',
      'mais',
      'pour',
      'nom',
      'prenom',
      'jsp',
      'quel',
      'quelle',
      'demandeur',
      'utilisateur',
    ]);
    const explicitFirstNameMatch =
      normalizedConversation.match(
        /(?:prenom)\s*(?:c est|c'est|est|:)\s*([a-z][a-z'-]{1,40})/u,
      ) ??
      normalizedConversation.match(
        /([a-z][a-z'-]{1,40})\s*(?:c est|c'est|est)\s*(?:son|le)\s*prenom/u,
      ) ??
      normalizedConversation.match(
        /(?:il s appelle|elle s appelle|utilisateur s appelle)\s+([a-z][a-z'-]{1,40})/u,
      );

    if (
      explicitFirstNameMatch?.[1] &&
      !rejectedWords.has(explicitFirstNameMatch[1])
    ) {
      return this.capitalizeName(explicitFirstNameMatch[1]);
    }

    const unknownLastNameMentioned =
      /(connais pas son nom|connait pas son nom|pas son nom|nom inconnu|oublie son nom|g oublier son nom|je connais pas le nom|je sais pas son nom|je ne sais pas son nom|sais pas son nom|son nom jsp|nom jsp|nom de famille jsp|jsp son nom|jsp le nom|je sais pas le nom|je ne sais pas le nom|sais pas le nom)/u.test(
        normalizedConversation,
      );
    const assistantAskedRequesterName =
      /(prenom|nom|utilisateur concerne|identite|demandeur)/u.test(
        lastAssistantQuestion,
      );
    const requesterAnswer = assistantAskedRequesterName
      ? lastUserMessage
      : latestRequesterAnswer;
    const firstWordMatch = requesterAnswer.match(/^([a-z][a-z'-]{1,40})\b/u);

    if (
      !unknownLastNameMentioned &&
      !(assistantAskedRequesterName && firstWordMatch?.[1])
    ) {
      return null;
    }

    if (!firstWordMatch?.[1]) {
      return null;
    }

    return rejectedWords.has(firstWordMatch[1])
      ? null
      : this.capitalizeName(firstWordMatch[1]);
  }

  private inferChannelName(conversation: string): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);

    if (/\b(email|mail|courriel)\b/u.test(normalizedConversation)) {
      return 'Email';
    }

    if (/\b(chat|message)\b/u.test(normalizedConversation)) {
      return 'Chat';
    }

    if (/\b(telephone|tel|appel)\b/u.test(normalizedConversation)) {
      return 'Telephone';
    }

    if (/\b(portail|portal)\b/u.test(normalizedConversation)) {
      return 'Portail';
    }

    if (
      /\b(oral|a l oral|face a face|direct)\b/u.test(normalizedConversation)
    ) {
      return 'Autre';
    }

    return null;
  }

  private capitalizeName(value: string): string {
    return value
      .split(/([-'])/u)
      .map((part) =>
        part === '-' || part === "'"
          ? part
          : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
      )
      .join('');
  }

  private getMissingRequesterContextQuestion(
    requesterScope: 'SELF' | 'OTHER' | null,
    requesterName: string | null,
    channelName: string | null,
  ): string | null {
    if (!requesterScope) {
      return 'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?';
    }

    if (requesterScope === 'OTHER' && !requesterName) {
      return "Quel est le prenom et le nom de l'utilisateur concerne ?";
    }

    if (requesterScope === 'OTHER' && !channelName) {
      return "Pouvez-vous préciser comment on vous a fait la demande (Email, Chat, Téléphone, à l'oral, ...) ?";
    }

    return null;
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
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const normalizedQuestion = this.normalizeForMatching(normalized);
    const userAsksChannelMeaning =
      /(c est quoi|c'est quoi|ca veut dire quoi|ça veut dire quoi|je comprends pas|j ai pas compris|j'ai pas compris).*(canal|demande)/u.test(
        normalizedConversation,
      ) ||
      /(canal|demande).*(c est quoi|c'est quoi|ca veut dire quoi|ça veut dire quoi)/u.test(
        normalizedConversation,
      );

    if (userAsksChannelMeaning) {
      return "Je parle simplement de la façon dont la demande vous est arrivée : par email, par chat/message, par téléphone, à l'oral, via le portail, etc. Comment on vous a fait cette demande ?";
    }

    const questionAsksChannel =
      /\bcanal\b/u.test(normalizedQuestion) &&
      /(email|mail|chat|telephone|tel|portail|oral|autre|demande)/u.test(
        normalizedQuestion,
      );

    if (questionAsksChannel) {
      return "Pouvez-vous préciser comment on vous a fait la demande (Email, Chat, Téléphone, à l'oral, ...) ?";
    }

    const mentionsPasswordIssue =
      /(mdp|mot de passe|password|connexion|connecter|login|identifiant)/u.test(
        normalizedConversation,
      );
    const userDidNotUnderstand =
      /(pas compris|comprend pas|pas clair|je comprends pas|je ne comprends pas)/u.test(
        normalizedConversation,
      );
    const userMentionedVision =
      /\b(vision|portail|cette appli|application actuelle|appli de ticketing|ticketing)\b/u.test(
        normalizedUserConversation,
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

    if (
      mentionsPasswordIssue &&
      userDidNotUnderstand &&
      /(identifiant|nom d utilisateur|nom utilisateur|compte de session|poste|ordinateur|pc concerne)/u.test(
        normalizedQuestion,
      )
    ) {
      return "Pas de souci. Dites simplement si c'est le mot de passe de votre PC, de votre messagerie ou d'une application.";
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
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const mentionsPasswordIssue =
      /(mdp|mot de passe|password|connexion|connecter|login)/u.test(
        normalizedUserConversation,
      );
    const mentionsResettableAccount =
      /\b(gmail|google|messagerie|email|mail|boite mail|application|appli|compte applicatif)\b/u.test(
        normalizedUserConversation,
      );
    const mentionsPcSessionPassword =
      /(session pc|session windows|compte windows|mon pc|mon ordinateur|ordinateur|poste|pc portable|pc du taf|pc travail|pc professionnel|\bpc\b)/u.test(
        normalizedUserConversation,
      );
    const alreadySuggestedPasswordReset = this.hasPasswordResetTroubleshooting(
      normalizedConversation,
    );
    const mentionsVisionPasswordIssue =
      /(vision|portail|cette appli|application actuelle|appli de ticketing|ticketing).*(mdp|mot de passe|password|connexion|connecter|login)/u.test(
        normalizedUserConversation,
      ) ||
      /(mdp|mot de passe|password|connexion|connecter|login).*(vision|portail|cette appli|application actuelle|appli de ticketing|ticketing)/u.test(
        normalizedUserConversation,
      );

    if (mentionsVisionPasswordIssue && !mentionsPcSessionPassword) {
      if (!alreadySuggestedPasswordReset) {
        return "Vision est bien l'application actuelle. Avant de creer une demande, essayez le lien Mot de passe oublie sur l'ecran de connexion, puis verifiez l'email de reinitialisation. Si vous ne recevez rien ou si cela ne fonctionne pas, dites-le-moi et je preparerai la demande.";
      }
    }

    if (
      mentionsPasswordIssue &&
      mentionsResettableAccount &&
      !mentionsVisionPasswordIssue &&
      !mentionsPcSessionPassword &&
      !alreadySuggestedPasswordReset
    ) {
      return "Avant de creer un ticket, essayez le lien Mot de passe oublie ou Recuperer le compte sur le service concerne, puis verifiez l'email ou le telephone de recuperation. Si vous n'y avez pas acces ou si cela ne fonctionne pas, dites-le-moi et je preparerai le ticket.";
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

  private isPasswordAccessIncident(conversation: string): boolean {
    const normalizedConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const mentionsPasswordOrLogin =
      /(mdp|mot de passe|password|connexion|connecter|login|identifiant)/u.test(
        normalizedConversation,
      );
    const mentionsAccessFailure =
      /(oublie|oublier|perdu|marche pas|fonctionne pas|impossible|peut pas|n arrive pas|bloque|bloquee|refuse)/u.test(
        normalizedConversation,
      );

    return mentionsPasswordOrLogin && mentionsAccessFailure;
  }

  private hasPasswordResetTroubleshooting(
    normalizedConversation: string,
  ): boolean {
    return /(essayez|essaye|tester|testez|utilisez|utilise|via|lien|recuperer le compte|reinitialisation|reinitialiser|email de reinitialisation|mail de reinitialisation|telephone de recuperation|methode de recuperation)/u.test(
      normalizedConversation,
    );
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

  private getUserConversationText(conversation: string): string {
    const userMessages = conversation
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^utilisateur:/iu.test(line))
      .map((line) => line.replace(/^utilisateur:\s*/iu, '').trim())
      .filter(Boolean);

    return userMessages.length ? userMessages.join('\n') : conversation;
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
