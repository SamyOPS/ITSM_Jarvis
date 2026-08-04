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
  attachments?: TicketDraftAttachmentInput[];
  categories?: string[];
  channels?: string[];
  currentMode?: TicketType | null;
  priorities?: string[];
  requesters?: string[];
  userInput: string;
};

export type TicketDraftAttachmentInput = {
  data: Buffer | string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
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

type OpenAiInputContentPart =
  | {
      text: string;
      type: 'input_text';
    }
  | {
      detail: 'auto';
      image_url: string;
      type: 'input_image';
    }
  | {
      file_data: string;
      filename: string;
      type: 'input_file';
    };

const AI_DRAFT_MAX_ATTACHMENT_COUNT = 10;
const AI_DRAFT_MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const AI_DRAFT_MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 40 * 1024 * 1024;

@Injectable()
export class SuggestTicketDraftUseCase {
  async execute(
    command: SuggestTicketDraftCommand,
  ): Promise<TicketDraftAssistantResponse> {
    const userInput = command.userInput.trim();
    const attachments = this.normalizeAttachments(command.attachments ?? []);

    if (!userInput && attachments.length === 0) {
      throw new BadRequestException(
        'Le message ou une piece jointe est obligatoire.',
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
            content: this.buildUserContent(command, userInput, attachments),
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

  private buildUserContent(
    command: SuggestTicketDraftCommand,
    userInput: string,
    attachments: TicketDraftAttachmentInput[],
  ): OpenAiInputContentPart[] {
    return [
      {
        type: 'input_text',
        text: this.buildPrompt(command, userInput, attachments),
      },
      ...attachments.map((attachment) => {
        const base64Data =
          typeof attachment.data === 'string'
            ? attachment.data
            : attachment.data.toString('base64');

        if (this.isImageMimeType(attachment.mimeType)) {
          return {
            type: 'input_image' as const,
            detail: 'auto' as const,
            image_url: `data:${attachment.mimeType};base64,${base64Data}`,
          };
        }

        return {
          type: 'input_file' as const,
          file_data: base64Data,
          filename: attachment.fileName,
        };
      }),
    ];
  }

  private buildPrompt(
    command: SuggestTicketDraftCommand,
    userInput: string,
    attachments: TicketDraftAttachmentInput[] = [],
  ): string {
    const categories = command.categories?.filter(Boolean).slice(0, 80) ?? [];
    const channels = command.channels?.filter(Boolean).slice(0, 20) ?? [];
    const priorities = command.priorities?.filter(Boolean).slice(0, 20) ?? [];
    const requesters = command.requesters?.filter(Boolean).slice(0, 120) ?? [];
    const attachmentSummary = attachments.map(
      (attachment, index) =>
        `${index + 1}. ${attachment.fileName} (${attachment.mimeType || 'type inconnu'}, ${attachment.sizeBytes} octets)`,
    );

    return [
      `Mode actuellement affiche: ${command.currentMode ?? 'non precise'}.`,
      `Categories disponibles: ${categories.length ? categories.join(', ') : 'non fournies'}.`,
      `Canaux disponibles: ${channels.length ? channels.join(', ') : 'non fournis'}.`,
      `Priorites disponibles: ${priorities.length ? priorities.join(', ') : 'LOW, MEDIUM, HIGH, CRITICAL'}.`,
      `Utilisateurs demandeurs disponibles: ${requesters.length ? requesters.join(', ') : 'non fournis'}.`,
      '',
      'Objectif:',

      '- tu peux recevoir du texte, des pieces jointes, ou les deux dans le meme message;',
      "- exploite les pieces jointes visibles pour comprendre le probleme ou le besoin: photo d'un cable/connecteur, screenshot d'un message d'erreur, etat visible d'un equipement, document fourni, etc.;",
      "- si une image montre clairement un objet ou une erreur, utilise cette information comme donnee utilisateur; par exemple un cable USB-C visible doit etre compris comme USB-C meme si l'utilisateur ne connait pas le nom;",
      "- pour les photos de cables/adaptateurs, analyse chaque extremite separement: ne suppose jamais que les deux connecteurs sont identiques; si un cote est HDMI et l'autre DisplayPort, nomme le besoin cable HDMI vers DisplayPort ou adaptateur HDMI vers DisplayPort selon l'objet visible;",
      '- indices visuels utiles: HDMI a une forme aplatie/trapezoidale; DisplayPort est plus rectangulaire avec un coin biseaute; USB-C est petit, ovale et reversible; RJ45 est transparent/rectangulaire avec clip; VGA est bleu ou noir avec 15 broches; DVI est large avec grille de broches;',
      '- si deux connecteurs video differents sont visibles, le titre et la description doivent citer les deux connecteurs, par exemple Demande de cable HDMI vers DisplayPort, pas seulement cable HDMI ni seulement cable DisplayPort;',
      "- si la piece jointe contient un message d'erreur lisible, reprends le message utile dans la description du ticket sans inventer de details;",
      "- si la piece jointe n'est pas exploitable ou pas assez lisible, pose une seule question courte pour obtenir la precision manquante;",
      '- si les informations sont suffisantes, action=SUGGEST_TICKET et tu prepares le ticket;',
      "- s'il manque une information importante, action=ASK_QUESTION et tu poses une seule question courte, adaptee au contexte;",
      '- ne repose jamais une question dont la reponse est deja evidente dans la conversation;',
      "- par exemple si l'utilisateur parle deja de son ordinateur, ne demande pas quel equipement est concerne; demande plutot s'il s'allume, s'il y a un message d'erreur, ou si c'est portable/fixe si utile;",

      "- raisonne comme un assistant ITSM conversationnel: comprendre, aider un peu si c'est raisonnable, puis preparer un brouillon de ticket;",
      '- si le message est seulement une salutation ou ne contient aucun probleme/demande identifiable, action=ASK_QUESTION avec une question naturelle pour connaitre le sujet;',
      '- phase diagnostic: tu peux poser 0 a 3 questions utiles pour mieux qualifier le ticket et enrichir la description, mais uniquement si la reponse change vraiment le type, la categorie, la priorite, le demandeur, le canal ou une information importante de description;',
      "- si le probleme ou la demande est trop generique, demande d'abord l'objet concerne uniquement si cela manque vraiment: appareil, service, application ou materiel;",
      '- quand le symptome principal est deja compris, ne pose pas de questions de detail qui ne changent pas le ticket; propose plutot une aide simple si elle est utile, puis cadre le demandeur/canal ou prepare le ticket;',
      '- ne pose jamais une question de curiosite ou de confort si la reponse ne change pas le brouillon de ticket; fais plutot une hypothese raisonnable avec une confidence plus basse;',
      "- interprete les reponses naturelles et approximatives: grand, moyen, court, peu importe, je ne sais pas, pour moi, pour quelqu'un d'autre, oral, mail, message, etc. sont des reponses valables selon la question posee; ne redemande pas une reponse exacte;",
      "- accepte les petites fautes d'orthographe si le sens est evident: chatr veut dire chat, emial veut dire email, telephonne veut dire telephone, etc.;",
      '- accepte les variantes courantes de oui/non si le sens est evident: oe, oé, oue, ui, ouais veulent dire oui; nn, nan, nope veulent dire non;',
      "- si l'utilisateur dit qu'il n'a pas compris une question, reformule-la plus simplement au lieu de la repeter mot pour mot;",
      "- si l'utilisateur pose une question au lieu de repondre, reponds simplement a sa question, puis reprends le cadrage avec une seule question utile si necessaire;",
      '- si la reponse ne correspond pas exactement a la question posee mais apporte une information exploitable, utilise cette information et avance; ne bloque pas la conversation;',
      "- si l'utilisateur a deja repondu a une question de precision de maniere comprehensible, ne repose pas la meme question; passe a l'etape suivante du cadrage ou prepare le ticket;",
      '- pour une demande materielle trop generale, pose 1 petite question simple avant le brouillon si cela aide vraiment a fournir le bon materiel;',
      '- pour une demande ou un incident lie a du materiel physique ou a un accessoire, choisis la categorie Materiel/Matériel depuis la liste fournie: chargeur, cable, adaptateur, souris, clavier, ecran, telephone, imprimante, PC, moniteur, dock, batterie, casque, webcam, peripherique;',
      '- ne classe jamais une demande de chargeur, cable ou accessoire en Acces/Accès; Acces/Accès sert aux comptes, mots de passe, connexions, droits, sessions, VPN ou acces applicatif;',
      "- pour une demande de nouveau PC, n'ecris pas PC neuf dans le titre; prefere PC, PC portable, PC tour ou PC fixe selon la precision donnee;",
      "- exemple demande de chargeur sans appareil precise: demander pour quel appareil (PC, telephone, tablette ou autre); si c'est un chargeur de telephone/portable, demander si l'utilisateur sait si c'est USB-C, Lightning, micro-USB, autre, ou peu importe; si c'est un chargeur de PC, ne demande pas le type exact;",
      "- si le type de chargeur ou le connecteur est deja donne (Lightning, USB-C, micro-USB, chargeur PC, etc.) ou si l'utilisateur dit peu importe, ne demande pas l'appareil, le modele, la puissance, ni la compatibilite: cette precision ne change pas le ticket; avance vers le demandeur/canal ou prepare le brouillon;",
      "- si l'utilisateur demande un cable reseau, un cable Wi-Fi, ou un cable pour avoir le Wi-Fi, considere que le besoin est assez clair: ne demande pas de confirmer Ethernet/RJ45 et ne demande pas pour quel materiel;",
      '- pour un cable deja clairement identifie comme HDMI, DisplayPort, Ethernet/RJ45, USB-C, VGA ou DVI, ne demande pas pour quel appareil il est destine, pour quel usage, quel type de connexion, TV/ecran, PC/moniteur; ces questions sont inutiles. Si la longueur manque vraiment, demande exactement: Quelle longueur de câble souhaitez-vous ?',
      '- pour un cable ou adaptateur HDMI vers DisplayPort, DisplayPort vers HDMI, USB-C vers HDMI, USB-C vers DisplayPort ou autre combinaison visible/nommee, garde explicitement les deux connecteurs dans le titre et la description;',
      '- pour une longueur de cable, ne demande jamais une mesure en metres: accepte une reponse approximative comme court, petit, moyen, normal, grand, long, standard ou peu importe;',
      "- pour un cable USB-C destine a charger un PC, ne demande jamais si c'est pour synchronisation de donnees, alimentation, Power Delivery, ou type de port; prepare le ticket avec une description simple;",
      '- exemple demande de cle USB sans capacite: demander si une capacite precise est souhaitee ou si peu importe;',
      '- phase aide simple: tu peux proposer 0 a 3 actions simples si un utilisateur normal peut les tenter sans risque et sans procedure complexe;',
      "- adapte le nombre de questions/actions a la situation: 0 si le probleme est complexe, urgent, risque, ou clairement a traiter par le support; 1 a 3 si c'est simple et utile;",
      "- pour les problemes simples et frequents comme PC qui ne s'allume pas, Wi-Fi/Internet, application bloquee, imprimante ou accessoire, fais au moins une aide simple avant le brouillon si aucune tentative de resolution n'est deja mentionnee;",
      "- exemple PC qui ne s'allume pas: avant le brouillon, proposer de brancher le chargeur/secteur, tester une autre prise ou un autre cable, patienter quelques minutes si batterie vide, puis demander ce que cela donne;",
      "- pour un PC/ordinateur qui ne demarre pas ou ne s'allume pas, si l'utilisateur n'a pas deja precise PC portable, ordinateur portable, tour, PC fixe ou unite centrale, demande exactement: Est-ce qu'il s'agit d'un PC portable ou d'une tour ?",
      "- pour un telephone qui ne s'allume pas, si tu dois verifier la charge, demande exactement: Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?",
      "- si l'utilisateur repond non, aucun voyant, rien, ou equivalent a cette question de charge telephone, comprends la reponse et avance; ne repose pas la meme question;",
      "- si l'utilisateur repond que le telephone etait deja charge, comprends que la batterie n'est probablement pas la cause; ne demande pas s'il s'est charge un moment sur le chargeur et avance vers le cadrage du ticket;",
      "- pour une panne reseau vague, demande d'abord si cela touche seulement son poste, plusieurs personnes, ou tout le site; cela change vraiment l'impact;",
      "- pour un ecran casse/fissure trop generique, demande d'abord de quel type d'ecran il s'agit: PC portable, ecran externe, telephone, tablette ou autre;",
      "- Vision est l'application actuelle de ticketing/portail; si l'utilisateur parle de mdp Vision, compte Vision ou mot de passe de cette appli, ne demande pas quelle application est concernee;",
      "- les expressions cette appli, cette application, cette appli de ticket, l'application actuelle, l'appli actuelle, appli de ticketing ou portail actuel designent Vision quand le contexte parle de mot de passe/connexion;",
      "- si l'utilisateur parle seulement d'un mot de passe oublie sans nommer Vision, ne suppose jamais que c'est Vision; demande d'abord uniquement de quel compte/service il s'agit: session PC, messagerie, application, VPN, Vision ou autre;",
      '- pose une seule question de cadrage par message; ne combine jamais le compte/service concerne avec la question pour savoir si le ticket est pour lui ou pour un autre utilisateur;',
      "- si le mot de passe oublie concerne la session PC et que le ticket est pour l'utilisateur lui-meme, ne redemande pas l'identifiant exact ni le poste; ces informations sont utiles mais non bloquantes, prepare le ticket avec ce qui est connu;",
      "- si le mot de passe oublie concerne une messagerie ou une application avec mecanisme de reinitialisation simple, propose d'abord l'action simple Mot de passe oublie/reinitialisation avant de preparer le ticket;",
      "- pour un mot de passe oublie Vision/portail, proposer d'abord d'utiliser le lien Mot de passe oublie sur l'ecran de connexion et de verifier l'email de reinitialisation; si cela ne marche pas, preparer une demande;",
      "- avant action=SUGGEST_TICKET, identifie toujours si le ticket est pour l'utilisateur lui-meme ou pour un autre utilisateur de l'application;",
      "- une fois le probleme ou le compte/service concerne compris, si ce n'est pas clair pour qui est le ticket, action=ASK_QUESTION avec exactement: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?",
      '- si le ticket est pour lui-meme, requesterScope=SELF, requesterName=null, channelName=Portail;',
      "- si le ticket est pour quelqu'un d'autre, requesterScope=OTHER; si le nom/prenom manque, demande l'identite de cette personne;",
      "- si l'utilisateur dit c'est pour X ou pour X, comprends que le ticket est pour un autre utilisateur et utilise X comme requesterName partiel;",
      "- si l'utilisateur repond seulement un autre, autre utilisateur ou equivalent, ce n'est pas un nom: requesterName doit rester null;",
      "- si seul le prenom est connu ou si l'utilisateur dit qu'il ne connait pas le nom, accepte ce prenom dans requesterName et avance; ne redemande pas le nom complet;",
      "- si requesterScope=OTHER et que le canal de demande manque, demande exactement: Pouvez-vous préciser comment on vous a fait la demande (Email, Chat, Téléphone, à l'oral, ...) ?",
      "- n'utilise pas le mot canal dans les questions a l'utilisateur; dis plutot comment la demande a ete faite;",
      "- si l'utilisateur demande ce que veut dire canal ou ce que tu demandes, explique simplement que c'est la facon dont la demande est arrivee: email, chat/message, telephone, oral, portail, etc.;",
      "- pour le canal interne, choisis un nom depuis les canaux disponibles quand c'est possible; mail/email=Email, message/chat=Chat, telephone/appel=Telephone, portail=Portail, oral/en face a face=Autre;",
      "- ne confonds jamais le service concerne par le probleme avec le canal de demande: je n'ai plus acces a mon mail parle du probleme, pas du canal Email;",
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
      '- pour une imprimante HS ou qui ne fonctionne plus sans indication que plusieurs personnes ou un service critique sont bloques, MEDIUM/MEDIUM est generalement suffisant;',
      '- pour un ecran fissure/casse mais encore utilisable ou qui affiche encore, ne mets pas HIGH par defaut; adapte plutot vers MEDIUM sauf blocage reel;',
      "- pour une panne reseau, la priorite depend du perimetre: poste seul = plutot MEDIUM, plusieurs personnes/site complet = HIGH ou CRITICAL selon l'impact;",
      "- pour un probleme de stockage/disque presque plein, si l'appareil/service n'est pas connu, demande seulement sur quel appareil ou service manque le stockage;",
      "- pour un probleme de stockage/disque presque plein avec appareil/service connu, ne demande pas si la session est accessible, si la machine bloque, ni s'il y a un message d'erreur lie au stockage; ces questions changent rarement le ticket;",
      "- pour un probleme de stockage/disque presque plein, si l'utilisateur dit deja presque plein, quasiment plein, plein, sature, plus de place, ou donne une valeur approximative, ne demande pas de Go/% exact; propose une aide simple comme supprimer/deplacer des gros fichiers, vider la corbeille/cache, desinstaller des applications inutiles ou demander du stockage supplementaire, puis avance vers le cadrage demandeur ou prepare le ticket;",
      '- pour une REQUEST, renseigner priorityName directement;',
      '- proposer un titre de 50 caracteres maximum quand action=SUGGEST_TICKET;',
      '- garde les details techniques comme le stockage restant dans la description, pas dans le titre;',
      '- le titre doit etre tres simple et ne doit jamais contenir le demandeur ni une formule comme pour utilisateur, pour un autre utilisateur, pour X;',
      "- quand action=SUGGEST_TICKET, la description doit seulement decrire le probleme ou la demande avec les informations deja donnees par l'utilisateur;",
      "- la description ne doit pas rappeler le demandeur ni dire que c'est pour un autre utilisateur: cette information est deja dans requesterScope/requesterName;",
      '- la description ne doit jamais contenir de questions, de checklist, de consignes au technicien, ni de phrases comme informations a preciser, a confirmer, besoin urgent ou delai souhaite;',
      '- si des informations manquent, ne les invente pas et ne les liste pas dans la description; garde une description simple du besoin connu;',
      '- si une categorie semble evidente, reprendre exactement son nom depuis la liste fournie.',
      '',
      `Pieces jointes recues: ${attachmentSummary.length ? attachmentSummary.join('; ') : 'aucune'}.`,
      `Description utilisateur: ${userInput || '(aucun texte fourni)'}`,
    ].join('\n');
  }

  private normalizeAttachments(
    attachments: TicketDraftAttachmentInput[],
  ): TicketDraftAttachmentInput[] {
    if (attachments.length > AI_DRAFT_MAX_ATTACHMENT_COUNT) {
      throw new BadRequestException('10 pieces jointes maximum.');
    }

    let totalSize = 0;

    return attachments.map((attachment) => {
      const fileName = attachment.fileName.trim();
      const mimeType = attachment.mimeType.trim() || 'application/octet-stream';
      const sizeBytes = Number.isFinite(attachment.sizeBytes)
        ? attachment.sizeBytes
        : 0;

      if (!fileName) {
        throw new BadRequestException('Nom de piece jointe obligatoire.');
      }

      if (sizeBytes <= 0) {
        throw new BadRequestException('Piece jointe vide ou invalide.');
      }

      if (sizeBytes > AI_DRAFT_MAX_ATTACHMENT_SIZE_BYTES) {
        throw new BadRequestException(
          'Chaque piece jointe IA doit faire 10 Mo maximum.',
        );
      }

      totalSize += sizeBytes;

      if (totalSize > AI_DRAFT_MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
        throw new BadRequestException(
          'Les pieces jointes IA depassent la limite totale de 40 Mo.',
        );
      }

      return {
        data: attachment.data,
        fileName,
        mimeType,
        sizeBytes,
      };
    });
  }

  private isImageMimeType(mimeType: string): boolean {
    return mimeType.toLowerCase().startsWith('image/');
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
      const questionClarification =
        this.getLastQuestionClarification(userInput);

      if (questionClarification) {
        return {
          action: 'ASK_QUESTION',
          question: questionClarification,
          suggestion: null,
        };
      }

      const sideQuestionAnswer = this.getUserSideQuestionAnswer(userInput);

      if (sideQuestionAnswer) {
        return {
          action: 'ASK_QUESTION',
          question: sideQuestionAnswer,
          suggestion: null,
        };
      }

      const storageTargetQuestion =
        this.getMissingStorageTargetQuestion(userInput);

      if (storageTargetQuestion) {
        return {
          action: 'ASK_QUESTION',
          question: storageTargetQuestion,
          suggestion: null,
        };
      }

      const storageSimpleHelpQuestion =
        this.getMissingStorageSimpleHelpQuestion(userInput);

      if (storageSimpleHelpQuestion) {
        return {
          action: 'ASK_QUESTION',
          question: storageSimpleHelpQuestion,
          suggestion: null,
        };
      }

      const screenPrecisionQuestion =
        this.getMissingScreenPrecisionQuestion(userInput);

      if (screenPrecisionQuestion) {
        return {
          action: 'ASK_QUESTION',
          question: screenPrecisionQuestion,
          suggestion: null,
        };
      }

      const computerFormFactorQuestion =
        this.getMissingComputerFormFactorQuestion(userInput);

      if (computerFormFactorQuestion) {
        return {
          action: 'ASK_QUESTION',
          question: computerFormFactorQuestion,
          suggestion: null,
        };
      }

      const networkScopeQuestion =
        this.getMissingNetworkScopeQuestion(userInput);

      if (networkScopeQuestion) {
        return {
          action: 'ASK_QUESTION',
          question: networkScopeQuestion,
          suggestion: null,
        };
      }

      const genericRequestQuestion =
        this.getMissingGenericRequestPrecisionQuestion(userInput);

      if (genericRequestQuestion) {
        return {
          action: 'ASK_QUESTION',
          question: genericRequestQuestion,
          suggestion: null,
        };
      }

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
      const requesterScopeClarification =
        this.getRequesterScopeClarification(userInput);

      if (requesterScopeClarification) {
        return {
          action: 'ASK_QUESTION',
          question: requesterScopeClarification,
          suggestion: null,
        };
      }

      const requesterContextQuestion =
        requesterScope === 'OTHER' ||
        (!requesterScope && this.shouldAskRequesterScopeNow(userInput))
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

      const troubleshootingQuestion =
        this.getMissingSimpleTroubleshootingQuestion(userInput);

      if (
        troubleshootingQuestion &&
        !this.hasCompleteOtherRequesterContext(
          requesterScope,
          requesterName,
          channelName,
        )
      ) {
        return {
          action: 'ASK_QUESTION',
          question: troubleshootingQuestion,
          suggestion: null,
        };
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
      requesterScope === 'SELF' ? 'Portail' : this.inferChannelName(userInput);
    const requesterScopeClarification =
      this.getRequesterScopeClarification(userInput);
    const questionClarification = this.getLastQuestionClarification(userInput);
    const troubleshootingQuestion =
      this.getMissingSimpleTroubleshootingQuestion(userInput);
    const storageTargetQuestion =
      this.getMissingStorageTargetQuestion(userInput);
    const storageSimpleHelpQuestion =
      this.getMissingStorageSimpleHelpQuestion(userInput);
    const screenPrecisionQuestion =
      this.getMissingScreenPrecisionQuestion(userInput);
    const computerFormFactorQuestion =
      this.getMissingComputerFormFactorQuestion(userInput);
    const networkScopeQuestion = this.getMissingNetworkScopeQuestion(userInput);
    const genericRequestQuestion =
      this.getMissingGenericRequestPrecisionQuestion(userInput);

    if (requesterScopeClarification) {
      return {
        action: 'ASK_QUESTION',
        question: requesterScopeClarification,
        suggestion: null,
      };
    }

    if (questionClarification) {
      return {
        action: 'ASK_QUESTION',
        question: questionClarification,
        suggestion: null,
      };
    }

    const sideQuestionAnswer = this.getUserSideQuestionAnswer(userInput);

    if (sideQuestionAnswer) {
      return {
        action: 'ASK_QUESTION',
        question: sideQuestionAnswer,
        suggestion: null,
      };
    }

    if (storageTargetQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: storageTargetQuestion,
        suggestion: null,
      };
    }

    if (storageSimpleHelpQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: storageSimpleHelpQuestion,
        suggestion: null,
      };
    }

    if (screenPrecisionQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: screenPrecisionQuestion,
        suggestion: null,
      };
    }

    if (computerFormFactorQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: computerFormFactorQuestion,
        suggestion: null,
      };
    }

    if (networkScopeQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: networkScopeQuestion,
        suggestion: null,
      };
    }

    if (
      troubleshootingQuestion &&
      !this.hasCompleteOtherRequesterContext(
        requesterScope,
        requesterName,
        channelName,
      )
    ) {
      return {
        action: 'ASK_QUESTION',
        question: troubleshootingQuestion,
        suggestion: null,
      };
    }

    if (genericRequestQuestion) {
      return {
        action: 'ASK_QUESTION',
        question: genericRequestQuestion,
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

    const simpleCableSuggestion = this.getSimpleCableRequestSuggestion(
      userInput,
      requesterScope,
      requesterName,
      channelName,
    );

    if (simpleCableSuggestion) {
      return simpleCableSuggestion;
    }

    const suggestionContext = [userInput, parsed.title, parsed.description]
      .filter(Boolean)
      .join('\n');
    const impact = this.normalizeEnum(parsed.impact, IncidentSeverity);
    const urgency = this.normalizeEnum(parsed.urgency, IncidentSeverity);
    const [incidentImpact, incidentUrgency] = this.normalizeIncidentSeverity(
      impact ?? IncidentSeverity.MEDIUM,
      urgency ?? IncidentSeverity.MEDIUM,
      suggestionContext,
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
        categoryName: this.normalizeSuggestedCategoryName(
          parsed.categoryName,
          suggestionContext,
        ),
        channelName,
        confidence: Math.min(Math.max(Number(parsed.confidence) || 0, 0), 1),
        description: this.normalizeTicketDescription(
          parsed.description,
          requesterName,
          userInput,
        ),
        impact: type === TicketType.INCIDENT ? incidentImpact : null,
        priorityName,
        requesterName: requesterScope === 'OTHER' ? requesterName : null,
        requesterScope,
        requestType: this.normalizeEnum(parsed.requestType, RequestType),
        title: this.normalizeTicketTitle(parsed.title, requesterName),
        type,
        urgency: type === TicketType.INCIDENT ? incidentUrgency : null,
      },
    };
  }

  private normalizeNullableText(value: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeSuggestedCategoryName(
    value: string | null,
    conversation: string,
  ): string | null {
    const normalized = this.normalizeNullableText(value);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );

    if (this.isMaterialContext(normalizedUserConversation)) {
      return 'Matériel';
    }

    return normalized;
  }

  private isMaterialContext(normalizedUserConversation: string): boolean {
    const accessTerms =
      /\b(mdp|mot de passe|password|connexion|connecter|login|compte|session|vpn|acces|droit|droits|habilitation|autorisation|identifiant|mail|email|messagerie)\b/u;
    const systemStorageTerms =
      /\b(stockage|espace disque|disque plein|memoire pleine|plus de place)\b/u;
    const physicalMaterialTerms =
      /\b(chargeur|alimentation|alim|cable|adaptateur|connecteur|usb-c|usb c|usbc|micro usb|micro-usb|lightning|hdmi|displayport|rj45|ethernet|souris|clavier|ecran|imprimante|moniteur|dock|station d accueil|batterie|casque|webcam|peripherique|materiel|disque dur|ssd|cle usb|clef usb)\b/u;
    const hardwareIssueTerms =
      /\b(pc|ordinateur|poste|telephone|tel|smartphone|iphone|tablette)\b/u;

    if (systemStorageTerms.test(normalizedUserConversation)) {
      return false;
    }

    if (
      accessTerms.test(normalizedUserConversation) &&
      !physicalMaterialTerms.test(normalizedUserConversation)
    ) {
      return false;
    }

    if (physicalMaterialTerms.test(normalizedUserConversation)) {
      return true;
    }

    return hardwareIssueTerms.test(normalizedUserConversation);
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
      /(session pc|session windows|compte windows|mon pc|le pc|poste|ordinateur|pc portable|pc du taf|pc travail|pc professionnel|\bpc\b)/u.test(
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
    const questionAsksRequesterScope =
      /(ticket|demande).*(pour vous|pour moi|autre utilisateur)/u.test(
        normalizedQuestion,
      ) ||
      /(pour vous|pour moi|autre utilisateur).*(ticket|demande)/u.test(
        normalizedQuestion,
      );
    const simpleCableSuggestion = this.getSimpleCableRequestSuggestion(
      conversation,
      requesterScope,
      requesterName,
      channelName,
    );

    if (simpleCableSuggestion) {
      return simpleCableSuggestion;
    }

    if (
      mentionsPasswordIssue &&
      mentionsPcSession &&
      requesterScope === 'SELF' &&
      (questionAsksOptionalPcDetails || questionAsksRequesterScope)
    ) {
      return {
        action: 'SUGGEST_TICKET',
        question: null,
        suggestion: {
          categoryName: 'Accès',
          channelName: 'Portail',
          confidence: 0.78,
          description: 'Mot de passe de session PC professionnelle oublie.',
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
      requesterScope === 'SELF' &&
      (questionAsksChannelClarification ||
        questionAsksFullRequesterName ||
        questionAsksRequesterScope)
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
          categoryName: this.normalizeSuggestedCategoryName(
            parsed.categoryName,
            conversation,
          ),
          channelName: 'Portail',
          confidence: Math.min(
            Math.max(Number(parsed.confidence) || 0.65, 0),
            1,
          ),
          description: this.normalizeTicketDescription(
            parsed.description,
            null,
            conversation,
          ),
          impact: type === TicketType.INCIDENT ? incidentImpact : null,
          priorityName:
            type === TicketType.INCIDENT
              ? resolveIncidentPriorityName(incidentImpact, incidentUrgency)
              : (this.normalizeEnum(parsed.priorityName, PriorityName) ??
                PriorityName.MEDIUM),
          requesterName: null,
          requesterScope: 'SELF',
          requestType: this.normalizeEnum(parsed.requestType, RequestType),
          title: this.normalizeTicketTitle(parsed.title, null),
          type,
          urgency: type === TicketType.INCIDENT ? incidentUrgency : null,
        },
      };
    }

    if (
      requesterScope === 'OTHER' &&
      requesterName &&
      channelName &&
      (questionAsksChannelClarification ||
        questionAsksFullRequesterName ||
        questionAsksRequesterScope)
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
            this.normalizeSuggestedCategoryName(
              parsed.categoryName,
              conversation,
            ) ?? 'Accès',
          channelName,
          confidence: Math.min(
            Math.max(Number(parsed.confidence) || 0.65, 0),
            1,
          ),
          description:
            this.normalizeTicketDescription(
              parsed.description,
              requesterName,
              conversation,
            ) || 'Demande a qualifier.',
          impact: type === TicketType.INCIDENT ? incidentImpact : null,
          priorityName:
            type === TicketType.INCIDENT
              ? resolveIncidentPriorityName(incidentImpact, incidentUrgency)
              : this.normalizeEnum(parsed.priorityName, PriorityName),
          requesterName,
          requesterScope: 'OTHER',
          requestType: this.normalizeEnum(parsed.requestType, RequestType),
          title: this.normalizeTicketTitle(parsed.title, requesterName),
          type,
          urgency: type === TicketType.INCIDENT ? incidentUrgency : null,
        },
      };
    }

    return null;
  }

  private getSimpleCableRequestSuggestion(
    conversation: string,
    requesterScope: 'SELF' | 'OTHER' | null,
    requesterName: string | null,
    channelName: string | null,
  ): TicketDraftAssistantResponse | null {
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );

    if (
      !this.hasSpecificCableRequest(normalizedUserConversation) ||
      !this.hasSpecificCableLengthAnswer(normalizedUserConversation) ||
      !requesterScope
    ) {
      return null;
    }

    if (requesterScope === 'OTHER' && (!requesterName || !channelName)) {
      return null;
    }

    const cableName = this.inferSpecificCableName(normalizedUserConversation);

    if (!cableName) {
      return null;
    }

    const lengthDescription = this.inferCableLengthDescription(
      normalizedUserConversation,
    );
    const mentionsChargingPc =
      /(charger|charge|recharger|alimentation|alim).*(pc|ordinateur|portable|poste)/u.test(
        normalizedUserConversation,
      ) ||
      /(pc|ordinateur|portable|poste).*(charger|charge|recharger|alimentation|alim)/u.test(
        normalizedUserConversation,
      );
    const descriptionParts = [`Besoin d'un ${cableName}`];

    if (lengthDescription) {
      descriptionParts.push(lengthDescription);
    }

    if (mentionsChargingPc) {
      descriptionParts.push('pour charger un PC');
    }

    return {
      action: 'SUGGEST_TICKET',
      question: null,
      suggestion: {
        categoryName: 'Matériel',
        channelName: requesterScope === 'SELF' ? 'Portail' : channelName,
        confidence: 0.82,
        description: `${descriptionParts.join(' ')}.`,
        impact: null,
        priorityName: PriorityName.LOW,
        requesterName: requesterScope === 'OTHER' ? requesterName : null,
        requesterScope,
        requestType: RequestType.HARDWARE,
        title:
          cableName === 'cable USB-C' && mentionsChargingPc
            ? 'Cable USB-C pour PC'
            : this.normalizeTicketTitle(cableName, requesterName),
        type: TicketType.REQUEST,
        urgency: null,
      },
    };
  }

  private normalizeTicketTitle(
    value: string | null | undefined,
    requesterName: string | null,
  ): string {
    const title = this.removeRequesterMentions(
      value?.trim() || 'Ticket a qualifier',
      requesterName,
    )
      .replace(
        /\s*(?:\(|\[)[^)\]]*(?:\d+\s*(?:go|gb|mo|mb|%)|dispo|disponible|restant|reste)[^)\]]*(?:\)|\])/giu,
        ' ',
      )
      .replace(/\b(PC(?:\s+(?:tour|portable|fixe))?)\s+neuf\b/giu, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*[-:;,.]\s*$/u, '')
      .trim();

    return (title || 'Ticket a qualifier').slice(0, 50);
  }

  private normalizeTicketDescription(
    value: string | null | undefined,
    requesterName: string | null,
    sourceText?: string,
  ): string {
    const description = value?.trim() ?? '';
    const userSource = sourceText
      ? this.normalizeForMatching(this.getUserConversationText(sourceText))
      : '';
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

    const cleanedDescription = (
      firstStopIndex === undefined
        ? description
        : description.slice(0, firstStopIndex)
    )
      .replace(
        /^\s*l['’]utilisateur\s+(?:indique\s+|demande\s+|signale\s+|souhaite\s+|a\s+besoin\s+de\s+)/iu,
        '',
      )
      .replace(/^\s*l['’]utilisateur\s+(?:ne\s+|n['’]\s*)/iu, (match) =>
        match.replace(/l['’]utilisateur\s+/iu, ''),
      )
      .replace(
        /\s+(?:pour|concernant|destine(?:e)?\s+a|destine(?:e)?\s+pour)\s+(?:un\s+)?(?:autre\s+)?utilisateur\b.*$/iu,
        '',
      )
      .replace(
        /\s+(?:pour|concernant|destine(?:e)?\s+a|destine(?:e)?\s+pour)\s+la\s+personne\s+concernee\b.*$/iu,
        '',
      )
      .replace(
        /\s+(?:pour|concernant|destine(?:e)?\s+a|destine(?:e)?\s+pour)\s+le\s+demandeur\b.*$/iu,
        '',
      )
      .replace(
        requesterName
          ? new RegExp(
              `\\s+(?:pour|concernant|destine(?:e)?\\s+a|destine(?:e)?\\s+pour)\\s+(?:l['’]utilisateur\\s+)?${this.escapeRegExp(requesterName)}\\b.*$`,
              'iu',
            )
          : /a^/u,
        '',
      )
      .replace(/\s*[-:;,.]\s*$/u, '')
      .trim()
      .replace(/^./u, (char) => char.toUpperCase());

    return this.removeUnsupportedDescriptionDetails(
      cleanedDescription,
      userSource,
    );
  }

  private removeUnsupportedDescriptionDetails(
    description: string,
    normalizedUserSource: string,
  ): string {
    if (!description || !normalizedUserSource) {
      return description;
    }

    const sentences = description
      .split(/(?<=[.!?])\s+/u)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length <= 1) {
      return description;
    }

    const keptSentences = sentences.filter((sentence) => {
      const normalizedSentence = this.normalizeForMatching(sentence);
      const startsWithUnsupportedContext =
        /^(lorsqu|lorsque|quand|si|au moment|apres|avant)\b/u.test(
          normalizedSentence,
        );

      if (!startsWithUnsupportedContext) {
        return true;
      }

      const significantWords = normalizedSentence
        .replace(/[^a-z0-9\s]/gu, ' ')
        .split(/\s+/u)
        .filter((word) => word.length >= 5);
      const supportedWords = significantWords.filter((word) =>
        normalizedUserSource.includes(word),
      );

      return (
        significantWords.length > 0 &&
        supportedWords.length / significantWords.length >= 0.6
      );
    });

    return (keptSentences.length ? keptSentences : sentences.slice(0, 1))
      .join(' ')
      .trim();
  }

  private removeRequesterMentions(
    value: string,
    requesterName: string | null,
  ): string {
    return value
      .replace(
        /\s+(?:pour|concernant)\s+(?:un\s+)?(?:autre\s+)?utilisateur\b.*$/iu,
        '',
      )
      .replace(/\s+(?:pour|concernant)\s+le\s+demandeur\b.*$/iu, '')
      .replace(
        requesterName
          ? new RegExp(
              `\\s+(?:pour|concernant)\\s+(?:l['’]utilisateur\\s+)?${this.escapeRegExp(requesterName)}\\b.*$`,
              'iu',
            )
          : /a^/u,
        '',
      );
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private isRequesterScopeQuestion(question: string): boolean {
    return (
      /(ticket|demande).*(pour vous|pour moi|autre utilisateur)/u.test(
        question,
      ) ||
      /(pour vous|pour moi|autre utilisateur).*(ticket|demande)/u.test(question)
    );
  }

  private isNamedRequesterScopeAnswer(message: string): boolean {
    const match =
      message.match(
        /^(?:c est|c'est|cest)\s+pour\s+(?!moi\b|nous\b)([a-z][a-z'-]{1,40})\b/u,
      ) ??
      message.match(
        /^pour\s+(?!moi\b|nous\b|un autre\b|une autre\b|autre utilisateur\b)([a-z][a-z'-]{1,40})\b/u,
      ) ??
      message.match(/^([a-z][a-z'-]{1,40})\b/u);

    return Boolean(match?.[1] && this.isLikelyRequesterFirstName(match[1]));
  }

  private inferRequesterScope(conversation: string): 'SELF' | 'OTHER' | null {
    const normalizedFullConversation = this.normalizeForMatching(conversation);
    const normalizedConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const conversationLines = normalizedFullConversation
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const lastAssistantQuestion =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('assistant:'))
        ?.replace(/^assistant:\s*/u, '')
        .trim() ?? '';
    const lastUserMessage =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('utilisateur:'))
        ?.replace(/^utilisateur:\s*/u, '')
        .trim() ?? '';
    const userMessages = normalizedConversation
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (
      userMessages.some((message) =>
        /^(moi|nous|pour moi|pour nous|c est pour moi|cest pour moi|c est pour nous|cest pour nous|moi meme|moi-meme)$/u.test(
          message,
        ),
      ) ||
      /\b(pour moi|pour nous|me concerne|nous concerne|me concernant|nous concernant|mon ticket|notre ticket|moi-meme|moi meme|c'est pour moi|cest pour moi|c'est pour nous|cest pour nous)\b/u.test(
        normalizedConversation,
      ) ||
      /\b(personne\s+n[' ]?a\s+fait\s+(?:de\s+)?demande|personne.*demande|aucune demande|pas de demande|c est mon besoin|cest mon besoin)\b/u.test(
        normalizedConversation,
      ) ||
      /utilisateur:\s*(moi|nous|pour moi|pour nous|c'est pour moi|cest pour moi|c'est pour nous|cest pour nous)\b/u.test(
        normalizedConversation,
      )
    ) {
      return 'SELF';
    }

    const assistantAskedRequesterScope = this.isRequesterScopeQuestion(
      lastAssistantQuestion,
    );
    const requesterScopeAnswerNamesOther =
      assistantAskedRequesterScope &&
      this.isNamedRequesterScopeAnswer(lastUserMessage);
    let previousAssistantQuestion = '';
    const requesterScopeAnswerNamesOtherEarlier = conversationLines.some(
      (line) => {
        if (line.startsWith('assistant:')) {
          previousAssistantQuestion = line
            .replace(/^assistant:\s*/u, '')
            .trim();
          return false;
        }

        if (
          !line.startsWith('utilisateur:') ||
          !this.isRequesterScopeQuestion(previousAssistantQuestion)
        ) {
          return false;
        }

        const answer = line.replace(/^utilisateur:\s*/u, '').trim();
        return this.isNamedRequesterScopeAnswer(answer);
      },
    );

    if (
      userMessages.some((message) =>
        /^(autre|un autre|une autre|pour un autre|pour une autre|autre utilisateur|un autre utilisateur|une autre utilisateur|pour quelqu un d autre|pour quelquun dautre)$/u.test(
          message,
        ),
      ) ||
      requesterScopeAnswerNamesOther ||
      requesterScopeAnswerNamesOtherEarlier ||
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

  private shouldAskRequesterScopeNow(conversation: string): boolean {
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const mentionsPasswordIssue =
      /(mdp|mot de passe|password|connexion|connecter|login|identifiant)/u.test(
        normalizedUserConversation,
      );
    const mentionsPasswordTarget =
      /(session pc|session windows|compte windows|mon pc|le pc|ordinateur|poste|pc portable|\bpc\b|messagerie|gmail|email|mail|application|appli|vpn)/u.test(
        normalizedUserConversation,
      ) || this.mentionsCurrentVisionApplication(normalizedUserConversation);

    if (mentionsPasswordIssue) {
      return mentionsPasswordTarget;
    }

    if (
      this.hasSpecificCableRequest(normalizedUserConversation) &&
      this.hasSpecificCableLengthAnswer(normalizedUserConversation)
    ) {
      return true;
    }

    return false;
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
    const requesterScopeAnswerMessages: string[] = [];
    let previousAssistantAskedRequesterName = false;
    let previousAssistantAskedRequesterScope = false;

    for (const line of conversationLines) {
      if (line.startsWith('assistant:')) {
        previousAssistantAskedRequesterName =
          /(prenom|nom|utilisateur concerne|identite|demandeur)/u.test(line);
        previousAssistantAskedRequesterScope =
          /(ticket|demande).*(pour vous|pour moi|autre utilisateur)/u.test(
            line,
          ) ||
          /(pour vous|pour moi|autre utilisateur).*(ticket|demande)/u.test(
            line,
          );
        continue;
      }

      if (line.startsWith('utilisateur:')) {
        const answer = line.replace(/^utilisateur:\s*/u, '').trim();

        if (previousAssistantAskedRequesterName) {
          if (answer) {
            requesterAnswerMessages.push(answer);
          }
        }

        if (previousAssistantAskedRequesterScope && answer) {
          requesterScopeAnswerMessages.push(answer);
        }

        previousAssistantAskedRequesterName = false;
        previousAssistantAskedRequesterScope = false;
      }
    }

    const latestRequesterAnswer =
      requesterAnswerMessages[requesterAnswerMessages.length - 1] ?? '';
    const latestRequesterScopeAnswer =
      requesterScopeAnswerMessages[requesterScopeAnswerMessages.length - 1] ??
      '';
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
      'moi',
      'nous',
    ]);
    const extractRequesterCandidate = (value: string): string | null => {
      const cleanedValue = value
        .replace(/^(?:c est|c'est|cest)\s+pour\s+/u, '')
        .replace(/^pour\s+/u, '')
        .replace(
          /^(?:il s appelle|elle s appelle|l utilisateur s appelle|utilisateur s appelle)\s+/u,
          '',
        )
        .replace(/\b(?:c est|c'est|cest)\s+(?:son|le)\s+prenom\b.*$/u, '')
        .replace(
          /\b(?:mais|je connais|je sais|je ne connais|je ne sais|jsp|nom inconnu|son nom|le nom)\b.*$/u,
          '',
        )
        .trim();
      const requesterMatch = cleanedValue.match(
        /^([a-z][a-z'-]{1,40}(?:\s+[a-z][a-z'-]{1,40}){0,2})\b/u,
      );

      if (!requesterMatch?.[1]) {
        return null;
      }

      const requesterNameParts = requesterMatch[1].split(/\s+/u);

      if (
        requesterNameParts.some((part) => rejectedWords.has(part)) ||
        !this.isLikelyRequesterFirstName(requesterNameParts[0])
      ) {
        return null;
      }

      return this.capitalizeName(requesterMatch[1]);
    };
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
    const assistantAskedRequesterScope =
      /(ticket|demande).*(pour vous|pour moi|autre utilisateur)/u.test(
        lastAssistantQuestion,
      ) ||
      /(pour vous|pour moi|autre utilisateur).*(ticket|demande)/u.test(
        lastAssistantQuestion,
      );
    const requesterScopeAnswerName = assistantAskedRequesterScope
      ? extractRequesterCandidate(lastUserMessage)
      : null;

    if (requesterScopeAnswerName) {
      return requesterScopeAnswerName;
    }

    const requesterScopeHistoryName = extractRequesterCandidate(
      latestRequesterScopeAnswer,
    );

    if (requesterScopeHistoryName) {
      return requesterScopeHistoryName;
    }

    const requesterAnswer = assistantAskedRequesterName
      ? lastUserMessage
      : latestRequesterAnswer;
    const requesterAnswerName = extractRequesterCandidate(requesterAnswer);
    const hasRequesterAnswerFromHistory = Boolean(latestRequesterAnswer);

    if (
      !unknownLastNameMentioned &&
      !(assistantAskedRequesterName && requesterAnswerName) &&
      !(hasRequesterAnswerFromHistory && requesterAnswerName)
    ) {
      return null;
    }

    if (!requesterAnswerName) {
      return null;
    }

    return requesterAnswerName;
  }

  private inferChannelName(conversation: string): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const conversationLines = normalizedConversation
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const userMessages = conversationLines
      .filter((line) => line.startsWith('utilisateur:'))
      .map((line) => line.replace(/^utilisateur:\s*/u, '').trim())
      .filter(Boolean);
    const channelAnswerMessages: string[] = [];
    let previousAssistantAskedChannel = false;

    for (const line of conversationLines) {
      if (line.startsWith('assistant:')) {
        previousAssistantAskedChannel =
          /(comment.*demande|demande.*faite|fait.*demande|faite.*demande|canal|email, chat|telephone.*oral|oral.*telephone)/u.test(
            line,
          );
        continue;
      }

      if (line.startsWith('utilisateur:')) {
        if (previousAssistantAskedChannel) {
          const answer = line.replace(/^utilisateur:\s*/u, '').trim();

          if (answer) {
            channelAnswerMessages.push(answer);
          }
        }

        previousAssistantAskedChannel = false;
      }
    }

    const latestChannelAnswer =
      channelAnswerMessages[channelAnswerMessages.length - 1] ?? '';
    const explicitChannelText =
      latestChannelAnswer ||
      [...userMessages]
        .reverse()
        .find((message) =>
          /(demande|demander|demandeur|fait|faite|contact|envoye|envoie|recu|dit|oral|telephone|tel|appel|chat|message|mail|email|courriel|portail)/u.test(
            message,
          ),
        ) ||
      '';

    if (!explicitChannelText) {
      return null;
    }

    const channelContext =
      latestChannelAnswer ||
      (/(par\s+(email|mail|courriel|chat|message|telephone|tel|appel)|via\s+(email|mail|courriel|chat|message|telephone|tel|appel|portail)|a l[' ]?oral|oral|face a face|direct|il m a demande|elle m a demande|on m a demande|demande faite|demande par|recu par)/u.test(
        explicitChannelText,
      )
        ? explicitChannelText
        : '');

    if (!channelContext) {
      return null;
    }

    if (/\b(email|emial|mail|mael|courriel)\b/u.test(channelContext)) {
      return 'Email';
    }

    if (
      /\b(chat|chatr|tchat|tchatte|message|msg|messagerie instantanee)\b/u.test(
        channelContext,
      )
    ) {
      return 'Chat';
    }

    if (
      /\b(telephone|telephonne|tel|appel|apelle|phone)\b/u.test(channelContext)
    ) {
      return 'Telephone';
    }

    if (/\b(portail|portal)\b/u.test(channelContext)) {
      return 'Portail';
    }

    if (
      /\b(oral|orale|a l oral|face a face|direct|en personne)\b/u.test(
        channelContext,
      )
    ) {
      return 'Autre';
    }

    return null;
  }

  private capitalizeName(value: string): string {
    return value
      .split(/(\s+|-|')/u)
      .map((part) =>
        /^\s+$/u.test(part) || part === '-' || part === "'"
          ? part
          : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
      )
      .join('');
  }

  private isLikelyRequesterFirstName(value: string): boolean {
    const normalized = this.normalizeForMatching(value).trim();
    const rejectedTokens = new Set([
      'le',
      'la',
      'les',
      'un',
      'une',
      'autre',
      'reseau',
      'wifi',
      'internet',
      'pc',
      'ordinateur',
      'portable',
      'ecran',
      'cable',
      'chargeur',
      'souris',
      'clavier',
      'casque',
      'imprimante',
      'telephone',
      'application',
      'appli',
      'mail',
      'email',
      'messagerie',
      'vpn',
      'vision',
      'hdmi',
      'displayport',
      'usb',
      'usb-c',
      'rj45',
      'ethernet',
    ]);

    return /^[a-z][a-z'-]{1,40}$/u.test(normalized)
      ? !rejectedTokens.has(normalized)
      : false;
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

  private getRequesterScopeClarification(conversation: string): string | null {
    const conversationLines = this.normalizeForMatching(conversation)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const lastAssistantMessage =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('assistant:'))
        ?.replace(/^assistant:\s*/u, '')
        .trim() ?? '';
    const lastUserMessage =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('utilisateur:'))
        ?.replace(/^utilisateur:\s*/u, '')
        .trim() ?? '';
    const assistantAskedRequesterScope =
      /(ticket|demande).*(pour vous|pour moi|autre utilisateur)/u.test(
        lastAssistantMessage,
      ) ||
      /(pour vous|pour moi|autre utilisateur).*(ticket|demande)/u.test(
        lastAssistantMessage,
      );
    const userAsksForExplanation =
      /^(comment|comment ca|comment sa|quoi|c est a dire|c'est a dire|pas compris|j ai pas compris|j'ai pas compris|je comprends pas|je ne comprends pas)/u.test(
        lastUserMessage,
      );

    return assistantAskedRequesterScope && userAsksForExplanation
      ? "Je veux simplement savoir si le ticket concerne votre besoin a vous, ou si vous le creez pour quelqu'un d'autre. Repondez par exemple : pour moi, ou pour un autre utilisateur."
      : null;
  }

  private getLastQuestionClarification(conversation: string): string | null {
    const conversationLines = this.normalizeForMatching(conversation)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const lastUserMessage =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('utilisateur:'))
        ?.replace(/^utilisateur:\s*/u, '')
        .trim() ?? '';

    if (!this.userDoesNotUnderstand(lastUserMessage)) {
      return null;
    }

    const lastAssistantQuestion =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('assistant:'))
        ?.replace(/^assistant:\s*/u, '')
        .trim() ?? '';

    if (!lastAssistantQuestion) {
      return "Pas de souci. Dites simplement avec vos mots ce que vous savez, je m'adapte.";
    }

    if (
      /(comment.*demande|demande.*faite|fait.*demande|faite.*demande|email, chat|telephone.*oral|oral.*telephone|canal)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return "Pas de souci. Je veux juste savoir comment la personne vous a transmis la demande : par email, par chat/message, par telephone, a l'oral, etc.";
    }

    if (
      /(prenom|nom|utilisateur concerne|identite|demandeur)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return "Pas de souci. Donnez simplement le prenom et le nom de la personne concernee. Si vous ne connaissez qu'un prenom, donnez seulement le prenom.";
    }

    if (
      /(ticket|demande).*(pour vous|pour moi|autre utilisateur)/u.test(
        lastAssistantQuestion,
      ) ||
      /(pour vous|pour moi|autre utilisateur).*(ticket|demande)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return "Pas de souci. Dites simplement si le ticket concerne votre besoin a vous, ou si vous le creez pour quelqu'un d'autre.";
    }

    if (
      /(longueur|court|courte|1-2 m|1 a 2 m|metre|metres|taille)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return 'Pas de souci. Dites simplement court, moyen, long, ou peu importe.';
    }

    if (
      /(mot de passe|mdp|compte|service|session pc|messagerie|application|vpn|vision)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return "Pas de souci. Dites simplement de quel compte il s'agit : PC, messagerie/mail, VPN, Vision, ou une autre application.";
    }

    return 'Pas de souci. Je reformule plus simplement : dites-moi juste ce que vous savez, même approximativement.';
  }

  private userDoesNotUnderstand(value: string): boolean {
    return /^(j ai pas compris|j'ai pas compris|j ai pas comprit|j'ai pas comprit|g pas compris|g pas comprit|je n ai pas compris|je n'ai pas compris|je n ai pas comprit|je n'ai pas comprit|pas compris|pas comprit|je comprends pas|je comprend pas|je ne comprends pas|je ne comprend pas|comprend pas|compris pas|pas clair|quoi|comment ca|comment sa|c est a dire|c'est a dire)/u.test(
      value,
    );
  }

  private getUserSideQuestionAnswer(conversation: string): string | null {
    const conversationLines = this.normalizeForMatching(conversation)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const lastUserMessage =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('utilisateur:'))
        ?.replace(/^utilisateur:\s*/u, '')
        .trim() ?? '';
    const lastAssistantQuestion =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('assistant:'))
        ?.replace(/^assistant:\s*/u, '')
        .trim() ?? '';

    if (
      !lastUserMessage ||
      !lastAssistantQuestion ||
      this.userDoesNotUnderstand(lastUserMessage) ||
      /bonjour.*(probleme|besoin)/u.test(lastAssistantQuestion)
    ) {
      return null;
    }

    const userAsksQuestion =
      /\?/u.test(lastUserMessage) ||
      /^(c est quoi|c'est quoi|cest quoi|ca veut dire quoi|qu est ce|qu'est ce|pourquoi|a quoi|comment ca|comment sa|tu veux dire|que veux tu dire|je dois|je peux|il faut quoi)/u.test(
        lastUserMessage,
      );

    if (!userAsksQuestion) {
      return null;
    }

    const continuation = this.getSideQuestionContinuation(
      conversation,
      lastAssistantQuestion,
    );

    if (
      /(canal|comment.*demande|demande.*faite|faite.*demande|fait.*demande)/u.test(
        lastUserMessage,
      ) ||
      (/(canal|comment.*demande|demande.*faite|faite.*demande|fait.*demande)/u.test(
        lastAssistantQuestion,
      ) &&
        /(quoi|comment|pourquoi|a quoi)/u.test(lastUserMessage))
    ) {
      return `C'est la facon dont la demande est arrivee jusqu'a vous : email, chat/message, telephone, a l'oral, portail, etc. ${continuation}`;
    }

    if (
      /(demandeur|utilisateur concerne|utilisateur|prenom|nom)/u.test(
        lastUserMessage,
      )
    ) {
      return `Le demandeur, c'est la personne pour qui le ticket doit etre cree. ${continuation}`;
    }

    if (/(synchronisation|donnee|donnees|data)/u.test(lastUserMessage)) {
      return `La synchronisation de donnees, c'est quand un cable sert a transferer ou echanger des fichiers/informations entre deux appareils. ${continuation}`;
    }

    if (
      /\b(vision|cette appli|cette application|appli actuelle)\b/u.test(
        lastUserMessage,
      )
    ) {
      return `Vision est l'application actuelle de ticketing, celle ou vous creez et suivez les tickets. ${continuation}`;
    }

    if (/(incident|demande|type)/u.test(lastUserMessage)) {
      return `Un incident correspond a quelque chose qui ne fonctionne plus ou mal. Une demande correspond a un nouveau besoin : materiel, acces, installation ou service. ${continuation}`;
    }

    if (/(priorite|urgence|impact)/u.test(lastUserMessage)) {
      return `La priorite sert a indiquer l'importance du ticket. Pour un incident, elle est calculee avec l'urgence et l'impact. ${continuation}`;
    }

    if (
      /(pourquoi|a quoi|comment ca|comment sa|tu veux dire|que veux tu dire)/u.test(
        lastUserMessage,
      )
    ) {
      return `Je demande ca uniquement pour remplir le ticket correctement. ${continuation}`;
    }

    return null;
  }

  private getSideQuestionContinuation(
    conversation: string,
    lastAssistantQuestion: string,
  ): string {
    if (
      /(comment.*demande|demande.*faite|faite.*demande|fait.*demande|canal|email, chat|telephone.*oral|oral.*telephone)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return 'Comment on vous a fait cette demande ?';
    }

    if (
      /(prenom|nom|utilisateur concerne|identite|demandeur)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return 'Donnez simplement le prenom et le nom si vous les connaissez. Un prenom seul suffit.';
    }

    if (
      /(ticket|demande).*(pour vous|pour moi|autre utilisateur)/u.test(
        lastAssistantQuestion,
      ) ||
      /(pour vous|pour moi|autre utilisateur).*(ticket|demande)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return 'Dites simplement : pour moi, ou pour un autre utilisateur.';
    }

    if (
      /(longueur|court|courte|1-2 m|1 a 2 m|metre|metres|taille)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return 'Dites simplement : court, moyen, long, ou peu importe.';
    }

    if (
      /(mot de passe|mdp|compte|service|session pc|messagerie|application|vpn|vision)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return "Dites simplement de quel compte il s'agit : PC, messagerie/mail, VPN, Vision, ou une autre application.";
    }

    return (
      this.getNextRequesterContextQuestion(conversation) ??
      'Dites-moi simplement ce que vous savez, meme approximativement.'
    );
  }

  private hasCompleteOtherRequesterContext(
    requesterScope: 'SELF' | 'OTHER' | null,
    requesterName: string | null,
    channelName: string | null,
  ): boolean {
    return requesterScope === 'OTHER' && Boolean(requesterName && channelName);
  }

  private getNextRequesterContextQuestion(conversation: string): string | null {
    const requesterScope = this.inferRequesterScope(conversation);
    const requesterName =
      requesterScope === 'OTHER'
        ? this.inferPartialRequesterName(conversation)
        : null;
    const channelName =
      requesterScope === 'SELF'
        ? 'Portail'
        : this.inferChannelName(conversation);

    return this.getMissingRequesterContextQuestion(
      requesterScope,
      requesterName,
      channelName,
    );
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
    const requesterScope = this.inferRequesterScope(conversation);
    const lastAssistantQuestion = this.getLastConversationMessage(
      conversation,
      'assistant',
    );
    const lastUserMessage = this.getLastConversationMessage(
      conversation,
      'utilisateur',
    );

    if (
      lastAssistantQuestion &&
      this.normalizeForMatching(lastAssistantQuestion) === normalizedQuestion &&
      this.isClearYesNoAnswer(lastUserMessage)
    ) {
      return (
        this.getNextRequesterContextQuestion(conversation) ??
        'Je prepare une proposition de ticket avec les informations deja donnees.'
      );
    }

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
    const questionAsksRequesterName =
      /(prenom|nom|utilisateur concerne|identite|demandeur)/u.test(
        normalizedQuestion,
      );

    if (questionAsksRequesterName && requesterScope !== 'OTHER') {
      return 'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?';
    }

    if (questionAsksChannel && requesterScope !== 'OTHER') {
      return 'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?';
    }

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
    const userMentionedVision = this.mentionsCurrentVisionApplication(
      normalizedUserConversation,
    );
    const questionAssumesVision =
      /\b(vision|portail)\b/u.test(normalizedQuestion) &&
      /(mdp|mot de passe|password|connexion|connecter|login|reinitialisation|reinitialiser|mot de passe oublie)/u.test(
        normalizedQuestion,
      );
    const questionAsksApplicationAgain =
      /(quelle application|quelle appli|application.*exactement|appli.*exactement|nom.*application|nom.*appli)/u.test(
        normalizedQuestion,
      );
    const questionCombinesPasswordTargetAndRequesterScope =
      mentionsPasswordIssue &&
      /(session pc|messagerie|application|vpn|vision|autre service|compte\/service|compte service)/u.test(
        normalizedQuestion,
      ) &&
      /(pour vous|autre utilisateur|demande est pour)/u.test(
        normalizedQuestion,
      );
    const questionAsksSpecificCableDevice =
      this.hasSpecificCableRequest(normalizedUserConversation) &&
      /(pour quel appareil|quel appareil|pour quel usage|quel usage|type de connexion|connexion.*destine|cable.*destine|destine.*cable|tv\/ecran|tv|moniteur|pc\/moniteur|pc, ecran|pc ou ecran|ecran, autre|appareil.*besoin|besoin.*appareil)/u.test(
        normalizedQuestion,
      );
    const questionAsksWifiCableDevice =
      this.hasWifiCableRequest(normalizedUserConversation) &&
      /(pour quel materiel|quel materiel|pour quel appareil|quel appareil|pc, borne|borne\/routeur|imprimante|routeur|appareil.*besoin|materiel.*besoin)/u.test(
        normalizedQuestion,
      );
    const questionAsksNetworkCableConfirmation =
      this.hasNetworkCableRequest(normalizedUserConversation) &&
      /(souhaitez|voulez|besoin|confirmez|confirmer|dire).*(cable reseau|ethernet|rj45)/u.test(
        normalizedQuestion,
      );
    const questionAsksCableLength =
      this.hasSpecificCableRequest(normalizedUserConversation) &&
      /(longueur|court|courte|1-2 m|1 a 2 m|metre|metres|taille)/u.test(
        normalizedQuestion,
      );
    const questionAsksCableOrChargerLength =
      /(longueur|court|courte|1-2 m|1 a 2 m|metre|metres|taille)/u.test(
        normalizedQuestion,
      ) && /\b(cable|chargeur)\b/u.test(normalizedQuestion);
    const questionAsksTechnicalCableUsage =
      this.hasSpecificCableRequest(normalizedUserConversation) &&
      /(synchronisation|donnees|alimentation|power delivery|type de port|type de connexion|usage|recharger|chargeur\/pc|relier deux appareils|telephone vers pc)/u.test(
        normalizedQuestion,
      );
    const questionAsksUselessChargerDetail =
      this.hasSpecificChargerRequest(normalizedUserConversation) &&
      this.questionAsksUselessChargerDetail(normalizedQuestion);
    const questionAsksPhoneCharge =
      this.hasPhonePowerIssue(normalizedUserConversation) &&
      /(charge|chargeur|batterie|branche|voyant|indication|eteigne|eteint)/u.test(
        normalizedQuestion,
      );
    const questionAsksExactStorageAmount =
      this.hasStorageAlmostFullIssue(normalizedUserConversation) &&
      /(go|gb|mo|mb|pourcentage|%|combien|espace disque disponible|disponible restant|stockage restant|place restante|restant sur votre pc)/u.test(
        normalizedQuestion,
      );
    const storageTargetQuestion =
      this.getMissingStorageTargetQuestion(conversation);
    const questionAsksUselessStorageDetail =
      this.hasStorageAlmostFullIssue(normalizedUserConversation) &&
      this.questionAsksUselessStorageDetail(normalizedQuestion);
    const questionAsksFrozenComputerDetail =
      this.hasFrozenComputerIssue(normalizedUserConversation) &&
      this.questionAsksAlreadyAnsweredFrozenComputerDetail(normalizedQuestion);

    if (storageTargetQuestion) {
      return storageTargetQuestion;
    }

    if (questionAsksFrozenComputerDetail) {
      return (
        this.getNextRequesterContextQuestion(conversation) ??
        'Je prepare une proposition de ticket avec les informations deja donnees.'
      );
    }

    if (questionAsksUselessStorageDetail) {
      return (
        this.getMissingStorageSimpleHelpQuestion(conversation) ??
        this.getNextRequesterContextQuestion(conversation) ??
        'Je prepare une proposition de ticket avec les informations deja donnees.'
      );
    }

    if (questionAsksExactStorageAmount) {
      return (
        this.getMissingStorageSimpleHelpQuestion(conversation) ??
        this.getNextRequesterContextQuestion(conversation) ??
        'Je prepare une proposition de ticket avec les informations deja donnees.'
      );
    }

    if (questionAsksUselessChargerDetail) {
      return (
        this.getNextRequesterContextQuestion(conversation) ??
        'Je prepare une proposition de ticket avec les informations deja donnees.'
      );
    }

    if (questionAsksPhoneCharge) {
      if (
        this.userAnsweredPhoneChargeQuestion(conversation) ||
        this.userSaysPhoneWasCharged(normalizedUserConversation)
      ) {
        return (
          this.getNextRequesterContextQuestion(conversation) ??
          'Je prepare une proposition de ticket avec les informations deja donnees.'
        );
      }

      return 'Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?';
    }

    if (questionAsksSpecificCableDevice) {
      return (
        this.getMissingSpecificCableLengthQuestion(conversation) ??
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?'
      );
    }

    if (questionAsksTechnicalCableUsage) {
      return (
        this.getMissingSpecificCableLengthQuestion(conversation) ??
        this.getNextRequesterContextQuestion(conversation) ??
        'Je prepare une proposition de ticket avec les informations deja donnees.'
      );
    }

    if (questionAsksCableLength) {
      return (
        this.getMissingSpecificCableLengthQuestion(conversation) ??
        this.getNextRequesterContextQuestion(conversation)
      );
    }

    if (
      questionAsksCableOrChargerLength &&
      this.hasApproximateCableLengthAnswer(normalizedUserConversation)
    ) {
      return (
        this.getNextRequesterContextQuestion(conversation) ??
        'Je prepare une proposition de ticket avec les informations deja donnees.'
      );
    }

    if (questionAsksWifiCableDevice || questionAsksNetworkCableConfirmation) {
      return (
        this.getMissingSpecificCableLengthQuestion(conversation) ??
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?'
      );
    }

    if (questionCombinesPasswordTargetAndRequesterScope) {
      return "De quel mot de passe s'agit-il : session du PC, messagerie, application, VPN, Vision ou autre service ?";
    }

    if (
      mentionsPasswordIssue &&
      questionAssumesVision &&
      !userMentionedVision
    ) {
      return "De quel mot de passe s'agit-il : session du PC, messagerie, application, VPN, Vision ou autre service ?";
    }

    if (
      mentionsPasswordIssue &&
      userMentionedVision &&
      questionAsksApplicationAgain
    ) {
      return 'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?';
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

  private getMissingGenericRequestPrecisionQuestion(
    conversation: string,
  ): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const hasChargerRequest = /\bchargeur\b/u.test(normalizedUserConversation);
    const specificCableLengthQuestion =
      this.getMissingSpecificCableLengthQuestion(conversation);
    const hasUsbKeyRequest = /\b(cle usb|clef usb|clé usb|cléf usb)\b/u.test(
      normalizedUserConversation,
    );
    const askedChargerDevice =
      /chargeur.*(quel appareil|pour quel appareil|pc, telephone, tablette)/u.test(
        normalizedConversation,
      ) ||
      /(quel appareil|pour quel appareil|pc, telephone, tablette).*chargeur/u.test(
        normalizedConversation,
      );
    const askedChargerConnector =
      /(usb-c|usb c|usbc|lightning|micro usb|micro-usb|autre|connecteur|type de chargeur|quel type)/u.test(
        normalizedConversation,
      );
    const askedUsbCapacity =
      /(cle usb|clef usb).*(capacite|stockage|combien de go|go souhaite)/u.test(
        normalizedConversation,
      ) ||
      /(capacite|stockage|combien de go|go souhaite).*(cle usb|clef usb)/u.test(
        normalizedConversation,
      );
    const mentionsPcCharger =
      /(chargeur).*(pc|ordinateur|pc portable|poste)/u.test(
        normalizedUserConversation,
      ) ||
      /(pc|ordinateur|pc portable|poste).*(chargeur)/u.test(
        normalizedUserConversation,
      );
    const mentionsPhoneOrTabletCharger =
      !mentionsPcCharger &&
      (/(chargeur).*(telephone|tel|smartphone|iphone|portable|tablette)/u.test(
        normalizedUserConversation,
      ) ||
        /(telephone|tel|smartphone|iphone|portable|tablette).*(chargeur)/u.test(
          normalizedUserConversation,
        ));
    const mentionsConnector =
      /(usb-c|usb c|usbc|lightning|micro usb|micro-usb|autre|peu importe|importe peu|n importe|je sais pas|je ne sais pas|sais pas|jsp)/u.test(
        normalizedUserConversation,
      );
    const mentionsUsbCapacity =
      /\b(\d+\s*(go|gb|to|tb)|peu importe|importe peu|n importe|je sais pas|je ne sais pas|sais pas|jsp)\b/u.test(
        normalizedUserConversation,
      );

    if (specificCableLengthQuestion) {
      return specificCableLengthQuestion;
    }

    if (hasChargerRequest) {
      if (
        !mentionsPcCharger &&
        !mentionsPhoneOrTabletCharger &&
        !mentionsConnector
      ) {
        return askedChargerDevice
          ? null
          : "C'est un chargeur pour quel appareil : PC, telephone, tablette ou autre ?";
      }

      if (mentionsPhoneOrTabletCharger && !mentionsConnector) {
        return askedChargerConnector
          ? null
          : "Vous savez si c'est USB-C, Lightning, micro-USB, autre, ou peu importe ?";
      }
    }

    if (hasUsbKeyRequest && !mentionsUsbCapacity) {
      return askedUsbCapacity
        ? null
        : "Vous avez besoin d'une capacite precise pour la cle USB, ou peu importe ?";
    }

    return null;
  }

  private getMissingScreenPrecisionQuestion(
    conversation: string,
  ): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const hasGenericScreenIssue =
      /\becran\b/u.test(normalizedUserConversation) &&
      /(casse|cassee|fissure|fissuree|abime|abimee|hs|marche pas|fonctionne pas|fonctionne plus|affiche pas|affiche plus|noir)/u.test(
        normalizedUserConversation,
      );
    const hasScreenType =
      /(pc portable|ordinateur portable|laptop|portable pro|portable travail|ecran externe|moniteur|telephone|tel|smartphone|tablette|tv|television)/u.test(
        normalizedUserConversation,
      );
    const alreadyAskedScreenType =
      /(type d ecran|quel ecran|pc portable|ecran externe|telephone|smartphone|tablette|moniteur)/u.test(
        normalizedConversation,
      );

    if (!hasGenericScreenIssue || hasScreenType || alreadyAskedScreenType) {
      return null;
    }

    return "De quel type d'ecran s'agit-il : PC portable, ecran externe, telephone, tablette ou autre ?";
  }

  private getMissingComputerFormFactorQuestion(
    conversation: string,
  ): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const hasComputerPowerIssue =
      /\b(pc|ordinateur|poste|machine)\b.*\b(s[' ]?allume pas|ne s[' ]?allume pas|demarre pas|ne demarre pas|demarre plus|ne demarre plus|aucun signe de vie|pas de signe de vie|aucun voyant|pas de voyant)\b/u.test(
        normalizedUserConversation,
      ) ||
      /\b(s[' ]?allume pas|ne s[' ]?allume pas|demarre pas|ne demarre pas|demarre plus|ne demarre plus|aucun signe de vie|pas de signe de vie|aucun voyant|pas de voyant)\b.*\b(pc|ordinateur|poste|machine)\b/u.test(
        normalizedUserConversation,
      );
    const hasComputerFormFactor =
      /\b(pc portable|ordinateur portable|laptop|portable pro|portable travail|portable professionnel|tour|pc fixe|ordinateur fixe|poste fixe|fixe|unite centrale|bureau)\b/u.test(
        normalizedUserConversation,
      );
    const alreadyAskedComputerFormFactor =
      /(pc portable|ordinateur portable|portable ou une tour|portable ou tour|tour ou portable|tour ou un portable|pc fixe|ordinateur fixe|poste fixe|unite centrale)/u.test(
        normalizedConversation,
      );

    if (
      !hasComputerPowerIssue ||
      hasComputerFormFactor ||
      alreadyAskedComputerFormFactor
    ) {
      return null;
    }

    return "Est-ce qu'il s'agit d'un PC portable ou d'une tour ?";
  }

  private getMissingNetworkScopeQuestion(conversation: string): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );
    const hasVagueNetworkIssue =
      !/\bcable\b/u.test(normalizedUserConversation) &&
      (/\bpanne reseau\b/u.test(normalizedUserConversation) ||
        /\breseau\b.*\b(hs|panne|marche pas|fonctionne pas|fonctionne plus|coupe|indisponible)\b/u.test(
          normalizedUserConversation,
        ) ||
        /\b(internet|wifi|wi-fi)\b.*\b(hs|panne|marche pas|fonctionne pas|fonctionne plus|coupe|indisponible)\b/u.test(
          normalizedUserConversation,
        ));
    const hasScope =
      /(seulement moi|moi seul|mon poste|mon pc|ma machine|un poste|plusieurs|tout le monde|tous|toutes|site|service|equipe|bureau|global|general|generale|panne generale)/u.test(
        normalizedUserConversation,
      );
    const alreadyAskedScope =
      /(seulement votre poste|plusieurs personnes|tout le site|qui est touche|combien de personnes|perimetre)/u.test(
        normalizedConversation,
      );

    if (!hasVagueNetworkIssue || hasScope || alreadyAskedScope) {
      return null;
    }

    return 'Est-ce que cela touche seulement votre poste, plusieurs personnes, ou tout le site ?';
  }

  private hasWifiCableRequest(normalizedUserConversation: string): boolean {
    return (
      /\bcable\b/u.test(normalizedUserConversation) &&
      /\b(wifi|wi-fi)\b/u.test(normalizedUserConversation)
    );
  }

  private hasNetworkCableRequest(normalizedUserConversation: string): boolean {
    return (
      /\bcable\b/u.test(normalizedUserConversation) &&
      /\b(wifi|wi-fi|reseau|ethernet|rj45)\b/u.test(normalizedUserConversation)
    );
  }

  private hasSpecificChargerRequest(
    normalizedUserConversation: string,
  ): boolean {
    return (
      /\bchargeur\b/u.test(normalizedUserConversation) &&
      /\b(usb-c|usb c|usbc|lightning|micro usb|micro-usb|telephone|tel|smartphone|iphone|tablette|portable|pc|ordinateur|poste|alimentation|alim|autre|peu importe|importe peu|n importe|je sais pas|je ne sais pas|sais pas|jsp)\b/u.test(
        normalizedUserConversation,
      )
    );
  }

  private questionAsksUselessChargerDetail(
    normalizedQuestion: string,
  ): boolean {
    return /(pour quel appareil|quel appareil|pour quel modele|quel modele|modele|puissance|watt|compatible|compatibilite|pc, telephone|telephone, tablette|iphone|smartphone|tablette)/u.test(
      normalizedQuestion,
    );
  }

  private getMissingSpecificCableLengthQuestion(
    conversation: string,
  ): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );

    if (!this.hasSpecificCableRequest(normalizedUserConversation)) {
      return null;
    }

    const alreadyAskedLength =
      /(longueur|court|courte|1-2 m|1 a 2 m|metre|metres|m souhaite|taille).*cable/u.test(
        normalizedConversation,
      ) ||
      /cable.*(longueur|court|courte|1-2 m|1 a 2 m|metre|metres|m souhaite|taille)/u.test(
        normalizedConversation,
      );
    const mentionsCableLength = this.hasApproximateCableLengthAnswer(
      normalizedUserConversation,
    );

    if (alreadyAskedLength || mentionsCableLength) {
      return null;
    }

    return 'Quelle longueur de câble souhaitez-vous ?';
  }

  private hasSpecificCableRequest(normalizedUserConversation: string): boolean {
    return (
      /\bcable\b/u.test(normalizedUserConversation) &&
      /\b(displayport|hdmi|ethernet|rj45|reseau|wifi|wi-fi|usb-c|usb c|usbc|vga|dvi)\b/u.test(
        normalizedUserConversation,
      )
    );
  }

  private hasSpecificCableLengthAnswer(
    normalizedUserConversation: string,
  ): boolean {
    return this.hasApproximateCableLengthAnswer(normalizedUserConversation);
  }

  private hasApproximateCableLengthAnswer(
    normalizedUserConversation: string,
  ): boolean {
    return /\b(court|courte|petit|petite|moyen|moyenne|long|longue|grand|grande|assez long|assez longue|1-2 m|1 a 2 m|\d+\s*(m|metre|metres)|peu importe|importe peu|n importe|n'importe|je sais pas|je ne sais pas|sais pas|jsp|standard|classique|normal|normale|comme d habitude|comme dhabitude)\b/u.test(
      normalizedUserConversation,
    );
  }

  private inferSpecificCableName(
    normalizedUserConversation: string,
  ): string | null {
    if (/\b(usb-c|usb c|usbc)\b/u.test(normalizedUserConversation)) {
      return 'cable USB-C';
    }

    if (/\bdisplayport\b/u.test(normalizedUserConversation)) {
      return 'cable DisplayPort';
    }

    if (/\bhdmi\b/u.test(normalizedUserConversation)) {
      return 'cable HDMI';
    }

    if (
      /\b(ethernet|rj45|reseau|wifi|wi-fi)\b/u.test(normalizedUserConversation)
    ) {
      return 'cable reseau';
    }

    if (/\bvga\b/u.test(normalizedUserConversation)) {
      return 'cable VGA';
    }

    if (/\bdvi\b/u.test(normalizedUserConversation)) {
      return 'cable DVI';
    }

    return null;
  }

  private inferCableLengthDescription(
    normalizedUserConversation: string,
  ): string | null {
    const exactLength = normalizedUserConversation.match(
      /\b(\d+\s*(?:m|metre|metres))\b/u,
    );

    if (exactLength?.[1]) {
      return `de ${exactLength[1].replace(/\s+/g, ' ')}`;
    }

    if (/\b(court|courte|petit|petite)\b/u.test(normalizedUserConversation)) {
      return 'court';
    }

    if (
      /\b(long|longue|grand|grande|assez long|assez longue)\b/u.test(
        normalizedUserConversation,
      )
    ) {
      return 'long';
    }

    if (
      /\b(moyen|moyenne|standard|classique|normal|normale|1-2 m|1 a 2 m|comme d habitude|comme dhabitude)\b/u.test(
        normalizedUserConversation,
      )
    ) {
      return 'de longueur standard';
    }

    return null;
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
      this.mentionsCurrentVisionApplication(normalizedUserConversation) &&
      mentionsPasswordIssue;

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
      /(pc|ordinateur|portable|poste|ecran).*(s[' ]?allume pas|demarre pas|ne demarre pas|demarre plus|ne demarre plus|aucun voyant|pas de voyant|ventilateur)/u.test(
        normalizedConversation,
      ) ||
      /(s[' ]?allume pas|demarre pas|ne demarre pas|demarre plus|ne demarre plus|aucun voyant|pas de voyant|ventilateur).*(pc|ordinateur|portable|poste|ecran)/u.test(
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

  private hasPhonePowerIssue(normalizedUserConversation: string): boolean {
    return (
      /\b(telephone|tel|smartphone)\b/u.test(normalizedUserConversation) &&
      /(s[' ]?allume pas|ne s[' ]?allume pas|demarre pas|ne demarre pas|aucun signe de vie|pas de signe de vie)/u.test(
        normalizedUserConversation,
      )
    );
  }

  private userSaysPhoneWasCharged(normalizedUserConversation: string): boolean {
    return (
      /\b(charge|chargee|batterie)\b/u.test(normalizedUserConversation) &&
      /\b(deja|etait|dans tous les cas|dans tout les cas|pas a cause|pas la cause|batterie pas|batterie n est pas)\b/u.test(
        normalizedUserConversation,
      )
    );
  }

  private userAnsweredPhoneChargeQuestion(conversation: string): boolean {
    const conversationLines = this.normalizeForMatching(conversation)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const lastAssistantQuestion =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('assistant:'))
        ?.replace(/^assistant:\s*/u, '')
        .trim() ?? '';
    const lastUserMessage =
      [...conversationLines]
        .reverse()
        .find((line) => line.startsWith('utilisateur:'))
        ?.replace(/^utilisateur:\s*/u, '')
        .trim() ?? '';

    if (
      !/(telephone|tel).*(voyant|indication|charge|branche)|(?:voyant|indication|charge|branche).*(telephone|tel)/u.test(
        lastAssistantQuestion,
      )
    ) {
      return false;
    }

    return (
      this.isClearYesNoAnswer(lastUserMessage) ||
      /^(rien|aucun|aucune|pas de voyant|pas d indication|aucune indication|aucun voyant)\b/u.test(
        lastUserMessage,
      ) ||
      this.userSaysPhoneWasCharged(lastUserMessage)
    );
  }

  private getMissingStorageTargetQuestion(conversation: string): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );

    if (
      !this.hasStorageAlmostFullIssue(normalizedUserConversation) ||
      this.hasStorageTarget(normalizedUserConversation)
    ) {
      return null;
    }

    const alreadyAskedStorageTarget =
      /(stockage|place|espace disque).*(appareil|service|ou manque|sur quoi)|(?:appareil|service|sur quoi).*(stockage|place|espace disque)/u.test(
        normalizedConversation,
      );

    if (alreadyAskedStorageTarget) {
      return null;
    }

    return 'Sur quel appareil ou service manquez-vous de stockage ?';
  }

  private getMissingStorageSimpleHelpQuestion(
    conversation: string,
  ): string | null {
    const normalizedConversation = this.normalizeForMatching(conversation);
    const normalizedUserConversation = this.normalizeForMatching(
      this.getUserConversationText(conversation),
    );

    if (
      !this.hasStorageAlmostFullIssue(normalizedUserConversation) ||
      !this.hasStorageTarget(normalizedUserConversation)
    ) {
      return null;
    }

    if (
      this.hasStorageTroubleshooting(normalizedConversation) ||
      this.userWantsTicketNow(normalizedUserConversation) ||
      this.userAlreadyTriedStorageHelp(normalizedUserConversation)
    ) {
      return null;
    }

    const nextQuestion =
      this.getNextRequesterContextQuestion(conversation) ??
      'Je prepare une proposition de ticket avec les informations deja donnees.';

    if (this.hasPhoneStorageTarget(normalizedUserConversation)) {
      return `Avant de creer le ticket, vous pouvez supprimer ou transferer les photos/videos volumineuses, vider les telechargements/cache et desinstaller les applications inutilisees. Si vous avez besoin de plus d'espace, je peux preparer le ticket. ${nextQuestion}`;
    }

    if (this.hasMessagingOrCloudStorageTarget(normalizedUserConversation)) {
      return `Avant de creer le ticket, vous pouvez supprimer ou archiver les gros messages/fichiers et vider la corbeille du service si possible. Si vous avez besoin de plus d'espace ou si vous n'y arrivez pas, je peux preparer le ticket. ${nextQuestion}`;
    }

    return `Avant de creer le ticket, vous pouvez supprimer ou deplacer les gros fichiers, vider les telechargements/la corbeille et desinstaller les applications inutiles. Si vous avez besoin de plus d'espace ou d'un disque supplementaire, je peux preparer le ticket. ${nextQuestion}`;
  }

  private hasStorageTarget(normalizedUserConversation: string): boolean {
    return /(telephone|tel|smartphone|iphone|android|pc|ordinateur|portable|poste|tablette|messagerie|mail|email|gmail|outlook|application|appli|vision|onedrive|drive|cloud|serveur|nas|disque dur|cle usb|clef usb|cle de stockage|partage reseau)/u.test(
      normalizedUserConversation,
    );
  }

  private hasPhoneStorageTarget(normalizedUserConversation: string): boolean {
    return /\b(telephone|tel|smartphone|iphone|android)\b/u.test(
      normalizedUserConversation,
    );
  }

  private hasMessagingOrCloudStorageTarget(
    normalizedUserConversation: string,
  ): boolean {
    return /\b(messagerie|mail|email|gmail|outlook|onedrive|drive|cloud|serveur|nas|partage reseau)\b/u.test(
      normalizedUserConversation,
    );
  }

  private hasStorageTroubleshooting(normalizedConversation: string): boolean {
    return /(supprimer|desinstaller|vider|transferer|deplacer|archiver|gros fichiers|photos|videos|telechargements|cache|corbeille|disque supplementaire|stockage supplementaire|plus d espace)/u.test(
      normalizedConversation,
    );
  }

  private userAlreadyTriedStorageHelp(
    normalizedUserConversation: string,
  ): boolean {
    return /(deja fait|j ai deja|j'ai deja|deja essaye|deja teste|ca marche pas|cela ne marche pas|fonctionne pas|impossible|je peux pas|je ne peux pas|pas possible|n y arrive pas|je n y arrive pas)/u.test(
      normalizedUserConversation,
    );
  }

  private userWantsTicketNow(normalizedUserConversation: string): boolean {
    return /(ticket|demande au support|support|technicien|cree le ticket|creer le ticket|fait le ticket|fais le ticket|prepare le ticket|ouvrir un ticket)/u.test(
      normalizedUserConversation,
    );
  }

  private hasFrozenComputerIssue(normalizedUserConversation: string): boolean {
    const mentionsComputer = /\b(pc|ordinateur|poste|machine|tour)\b/u.test(
      normalizedUserConversation,
    );
    const mentionsFrozen =
      /(ecran fige|ecran bloque|fige|figee|freeze|bloque completement|completement bloque|aucune reponse|ne repond plus|curseur bouge pas|curseur ne bouge pas)/u.test(
        normalizedUserConversation,
      );

    return mentionsComputer && mentionsFrozen;
  }

  private questionAsksAlreadyAnsweredFrozenComputerDetail(
    normalizedQuestion: string,
  ): boolean {
    return (
      /(curseur|souris).*(bouge|repond|bloque|fige)/u.test(
        normalizedQuestion,
      ) ||
      /(bouge|repond|bloque|fige).*(curseur|souris)/u.test(
        normalizedQuestion,
      ) ||
      /(message d erreur|erreur|aucun message|affiche)/u.test(
        normalizedQuestion,
      ) ||
      /(depuis quand|combien de temps|duree|reste bloque)/u.test(
        normalizedQuestion,
      )
    );
  }

  private questionAsksUselessStorageDetail(
    normalizedQuestion: string,
  ): boolean {
    return (
      /(session|machine|pc|ordinateur|telephone|tel).*(bloque|accessible|acceder|acces|message d erreur|alerte|affiche|ecran)/u.test(
        normalizedQuestion,
      ) ||
      /(bloque|accessible|acceder|acces|message d erreur|alerte|affiche|ecran).*(session|machine|pc|ordinateur|telephone|tel)/u.test(
        normalizedQuestion,
      ) ||
      /(message d erreur|alerte).*(stockage|espace|disque|place)/u.test(
        normalizedQuestion,
      ) ||
      /(stockage|espace|disque|place).*(message d erreur|alerte)/u.test(
        normalizedQuestion,
      )
    );
  }

  private hasStorageAlmostFullIssue(
    normalizedUserConversation: string,
  ): boolean {
    const mentionsStorage = /\b(stockage|disque|espace|place|memoire)\b/u.test(
      normalizedUserConversation,
    );
    const mentionsAlmostFull =
      /(plus de stockage|plus assez de stockage|plus d espace|plus assez d espace|plus de place|manque de place|presque plein|quasiment plein|plein|sature|saturee|saturation|\d+\s*(?:go|gb|mo|mb)|\d+\s*%)/u.test(
        normalizedUserConversation,
      );

    return mentionsStorage && mentionsAlmostFull;
  }

  private isClearYesNoAnswer(normalizedUserMessage: string): boolean {
    const normalized = this.normalizeForMatching(normalizedUserMessage).trim();

    return /^(oui|oe|oue|ui|ouais|yes|yep|non|nn|nan|no|nope|nop)\b/u.test(
      normalized,
    );
  }

  private mentionsCurrentVisionApplication(
    normalizedConversation: string,
  ): boolean {
    return /\b(vision|portail|cette appli|cette application|cette app|l appli actuelle|appli actuelle|application actuelle|appli de ticket|application de ticket|appli de ticketing|application de ticketing|ticketing|cette appli de ticket|cette application de ticket)\b/u.test(
      normalizedConversation,
    );
  }

  private normalizeIncidentSeverity(
    impact: IncidentSeverity,
    urgency: IncidentSeverity,
    context: string,
  ): [IncidentSeverity, IncidentSeverity] {
    const normalizedContext = this.normalizeForMatching(context);
    let adjustedImpact = impact;
    let adjustedUrgency = urgency;

    if (this.hasUsableCrackedScreenSignal(normalizedContext)) {
      adjustedImpact = IncidentSeverity.LOW;
      adjustedUrgency = IncidentSeverity.MEDIUM;
    } else if (
      this.hasPrinterIssueWithoutBroadImpactSignal(normalizedContext) &&
      resolveIncidentPriorityName(adjustedImpact, adjustedUrgency) !==
        PriorityName.MEDIUM &&
      resolveIncidentPriorityName(adjustedImpact, adjustedUrgency) !==
        PriorityName.LOW
    ) {
      adjustedImpact = IncidentSeverity.MEDIUM;
      adjustedUrgency = IncidentSeverity.MEDIUM;
    }

    const priorityName = resolveIncidentPriorityName(
      adjustedImpact,
      adjustedUrgency,
    );

    if (
      priorityName !== PriorityName.CRITICAL ||
      this.hasCriticalIncidentSignal(normalizedContext)
    ) {
      return [adjustedImpact, adjustedUrgency];
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

  private hasBroadImpactSignal(normalizedContext: string): boolean {
    return /(plusieurs|tout le monde|tous les utilisateurs|site complet|service complet|equipe entiere|bureau entier|global|general|generale|production|critique|urgent|bloque tout|bloquant pour tous|aucun contournement|pas de solution de contournement)/u.test(
      normalizedContext,
    );
  }

  private hasPrinterIssueWithoutBroadImpactSignal(
    normalizedContext: string,
  ): boolean {
    return (
      /\b(imprimante|printer)\b/u.test(normalizedContext) &&
      /(hs|panne|marche pas|fonctionne pas|fonctionne plus|bouton|impression|imprimer)/u.test(
        normalizedContext,
      ) &&
      !this.hasBroadImpactSignal(normalizedContext)
    );
  }

  private hasUsableCrackedScreenSignal(normalizedContext: string): boolean {
    const mentionsCrackedScreen =
      /\b(ecran|moniteur|telephone|tel|smartphone|tablette)\b/u.test(
        normalizedContext,
      ) &&
      /\b(fissure|fissuree|casse|cassee|abime|abimee)\b/u.test(
        normalizedContext,
      );
    const stillUsable =
      /(affiche encore|affiche normalement|fonctionne encore|fonctionne normalement|encore utilisable|utilisable|malgre la fissure|juste fissure|seulement fissure|oe|oui)/u.test(
        normalizedContext,
      );
    const blocking =
      /(ecran noir|affiche plus|ne s affiche pas|aucun affichage|illisible|inutilisable|ne fonctionne plus|hs|bloque|bloquant)/u.test(
        normalizedContext,
      );

    return mentionsCrackedScreen && stillUsable && !blocking;
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

  private getLastConversationMessage(
    conversation: string,
    role: 'assistant' | 'utilisateur',
  ): string {
    const prefix = new RegExp(`^${role}:\\s*`, 'iu');

    return (
      [...conversation.split('\n')]
        .reverse()
        .map((line) => line.trim())
        .find((line) => prefix.test(line))
        ?.replace(prefix, '')
        .trim() ?? ''
    );
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
