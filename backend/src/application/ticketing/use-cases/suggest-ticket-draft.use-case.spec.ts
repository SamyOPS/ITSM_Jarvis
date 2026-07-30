import { IncidentSeverity } from '../../../domain/ticketing/incident-severity';
import { PriorityName } from '../../../domain/ticketing/priority-name';
import { RequestType } from '../../../domain/ticketing/request-type';
import { TicketType } from '../../../domain/ticketing/ticket-type';
import { SuggestTicketDraftUseCase } from './suggest-ticket-draft.use-case';

describe('SuggestTicketDraftUseCase', () => {
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    jest.restoreAllMocks();
  });

  function mockAssistantResponse(payload: Record<string, unknown>): void {
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        output_text: JSON.stringify(payload),
      }),
      ok: true,
    });
  }

  function baseAssistantPayload(overrides: Record<string, unknown>) {
    return {
      action: 'ASK_QUESTION',
      categoryName: null,
      channelName: null,
      confidence: 0.6,
      description: '',
      impact: null,
      priorityName: null,
      question: null,
      requesterName: null,
      requesterScope: null,
      requestType: null,
      title: '',
      type: TicketType.REQUEST,
      urgency: null,
      ...overrides,
    };
  }

  it('limits suggested ticket titles to 50 characters', async () => {
    const longTitle =
      'Demande installation materiel bureautique complet urgent';

    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Materiel',
        channelName: 'Portail',
        confidence: 0.82,
        description: 'Demande de materiel bureautique.',
        priorityName: PriorityName.MEDIUM,
        requesterScope: 'SELF',
        requestType: RequestType.HARDWARE,
        title: longTitle,
        type: TicketType.REQUEST,
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    const response = await useCase.execute({
      userInput: [
        'Assistant: Bonjour, quel est votre probleme ?',
        'Utilisateur: Il me faut du materiel pour travailler.',
        'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
        'Utilisateur: pour moi',
      ].join('\n'),
    });

    expect(response.action).toBe('SUGGEST_TICKET');
    expect(response.suggestion?.title).toHaveLength(50);
    expect(response.suggestion?.title).toBe(longTitle.slice(0, 50));
  });

  it('asks for requester scope instead of asking useless HDMI usage once cable length is known', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          'Pour quel usage ou quel type de connexion HDMI le cable est-il destine ?',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un cable hdmi',
          'Assistant: Quelle longueur de cable souhaitez-vous ?',
          'Utilisateur: normale',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('accepts approximate charger cable length instead of asking for meters', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question: 'Quelle longueur de cable souhaitez-vous (en metres) ?',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un chargeur',
          "Assistant: C'est un chargeur pour quel appareil : PC, telephone, tablette ou autre ?",
          'Utilisateur: pc',
          'Assistant: Quelle longueur de cable souhaitez-vous ?',
          'Utilisateur: grand',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('skips useless charger device questions when the connector is already known', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          "C'est un chargeur pour quel appareil : PC, telephone, tablette ou autre ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un chargeur lightning',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('skips useless charger model questions when the connector is already known', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question: "Pour quel modele d'iPhone souhaitez-vous ce chargeur ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un chargeur lightning',
          "Assistant: C'est un chargeur pour quel appareil : PC, telephone, tablette ou autre ?",
          'Utilisateur: iphone',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('understands a named requester answer to the requester scope question', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un cable hdmi',
          'Assistant: Quelle longueur de cable souhaitez-vous ?',
          'Utilisateur: normale',
          'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
          'Utilisateur: pour oscar',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        "Pouvez-vous préciser comment on vous a fait la demande (Email, Chat, Téléphone, à l'oral, ...) ?",
      suggestion: null,
    });
  });

  it('asks requester scope before requester name after a device answer starting with pour', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question: "Quel est le prenom et le nom de l'utilisateur concerne ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un chargeur',
          "Assistant: C'est un chargeur pour quel appareil : PC, telephone, tablette ou autre ?",
          'Utilisateur: telephone',
          'Assistant: Quel type de connecteur a votre telephone (USB-C, Lightning, micro-USB) ?',
          'Utilisateur: pour iphone',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('answers a user question about the request channel instead of repeating the same field question', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          "Pouvez-vous preciser comment on vous a fait la demande (Email, Chat, Telephone, a l'oral, ...) ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    const response = await useCase.execute({
      userInput: [
        'Assistant: Bonjour, quel est votre probleme ?',
        'Utilisateur: il me faut un cable hdmi',
        'Assistant: Quelle longueur de cable souhaitez-vous ?',
        'Utilisateur: normale',
        'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
        'Utilisateur: pour oscar',
        "Assistant: Pouvez-vous preciser comment on vous a fait la demande (Email, Chat, Telephone, a l'oral, ...) ?",
        "Utilisateur: c'est quoi le canal ?",
      ].join('\n'),
    });

    expect(response).toMatchObject({
      action: 'ASK_QUESTION',
      suggestion: null,
    });
    expect(response.question).toContain(
      "C'est la facon dont la demande est arrivee",
    );
    expect(response.question).toContain(
      'Comment on vous a fait cette demande ?',
    );
  });

  it('answers side questions before resuming ticket qualification', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          'Est-ce pour un chargeur/alimentation, pour de la synchronisation de donnees, ou pour relier deux appareils ?',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    const response = await useCase.execute({
      userInput: [
        'Assistant: Bonjour, quel est votre probleme ?',
        'Utilisateur: il me faut un cable usb-c',
        'Assistant: Quelle longueur de cable souhaitez-vous ?',
        'Utilisateur: normale',
        'Assistant: Est-ce pour un chargeur/alimentation, pour de la synchronisation de donnees, ou pour relier deux appareils ?',
        "Utilisateur: synchronisation de donnees c'est quoi ?",
      ].join('\n'),
    });

    expect(response).toMatchObject({
      action: 'ASK_QUESTION',
      suggestion: null,
    });
    expect(response.question).toContain(
      "La synchronisation de donnees, c'est quand un cable sert a transferer",
    );
  });

  it('suggests a simple cable ticket after requester and channel are known', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          'Pour quel usage ou quel type de connexion HDMI le cable est-il destine ?',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un cable hdmi',
          'Assistant: Quelle longueur de cable souhaitez-vous ?',
          'Utilisateur: normale',
          'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
          'Utilisateur: pour oscar',
          "Assistant: Pouvez-vous preciser comment on vous a fait la demande (Email, Chat, Telephone, a l'oral, ...) ?",
          'Utilisateur: chat',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'SUGGEST_TICKET',
      question: null,
      suggestion: {
        categoryName: 'Matériel',
        channelName: 'Chat',
        requesterName: 'Oscar',
        requestType: RequestType.HARDWARE,
        title: 'cable HDMI',
        type: TicketType.REQUEST,
      },
    });
  });

  it('keeps the full requester name when the user gives firstname and lastname', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Materiel',
        channelName: 'Email',
        confidence: 0.8,
        priorityName: 'MEDIUM',
        requesterName: 'Nacim',
        requesterScope: 'OTHER',
        requestType: RequestType.HARDWARE,
        title: 'Demande PC',
        type: TicketType.REQUEST,
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: il me faut un pc',
          'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
          'Utilisateur: un autre',
          "Assistant: Quel est le prenom et le nom de l'utilisateur concerne ?",
          'Utilisateur: Nacim Righi',
          "Assistant: Pouvez-vous preciser comment on vous a fait la demande (Email, Chat, Telephone, a l'oral, ...) ?",
          'Utilisateur: mail',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'SUGGEST_TICKET',
      suggestion: {
        channelName: 'Email',
        requesterName: 'Nacim Righi',
        requesterScope: 'OTHER',
      },
    });
  });

  it('forces Portal channel for self tickets and removes unsupported description details', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Materiel',
        channelName: 'Autre',
        confidence: 0.8,
        description:
          "L'imprimante s'allume, mais aucun bouton ne fonctionne. Lorsqu'une impression est lancee, la situation ne semble pas permettre d'utiliser l'appareil.",
        impact: 'HIGH',
        priorityName: 'HIGH',
        requesterScope: 'SELF',
        title: 'Imprimante boutons inactifs',
        type: TicketType.INCIDENT,
        urgency: 'MEDIUM',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          "Utilisateur: l'imprimante ne fonctionne plus",
          "Assistant: L'imprimante affiche-t-elle un message d'erreur ou clignote-t-elle ?",
          'Utilisateur: non rien',
          "Assistant: L'imprimante s'allume-t-elle ?",
          'Utilisateur: oui',
          "Utilisateur: l'imprimante s'allume mais aucun bouton ne fonctionne",
          'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
          'Utilisateur: pour moi',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'SUGGEST_TICKET',
      suggestion: {
        channelName: 'Portail',
        description: "L'imprimante s'allume, mais aucun bouton ne fonctionne.",
        requesterName: null,
        requesterScope: 'SELF',
      },
    });
  });

  it('rewrites unclear phone charging questions to a simple charging indicator question', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          "Le telephone s'est-il charge un moment sur le chargeur avant qu'il ne s'eteigne de nouveau ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          "Utilisateur: mon tel ne s'allume pas",
          "Assistant: Est-ce qu'il affiche un message d'erreur ou aucun signe de vie ?",
          'Utilisateur: aucun signe de vie',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?',
      suggestion: null,
    });
  });

  it('moves on after the user says a dead phone was already charged', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          "Le telephone s'est-il charge un moment sur le chargeur avant qu'il ne s'eteigne de nouveau ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          "Utilisateur: mon tel ne s'allume pas",
          "Assistant: Est-ce qu'il affiche un message d'erreur ou aucun signe de vie ?",
          'Utilisateur: aucun signe de vie',
          'Assistant: Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?',
          'Utilisateur: oui il etait chargee dans tout les cas',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('does not repeat the phone charge question after a negative answer', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          'Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          "Utilisateur: mon tel ne s'allume pas",
          'Assistant: Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?',
          'Utilisateur: non',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('understands oe as yes for phone charge questions', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          'Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: mon tel ne demarre pas',
          'Assistant: Est-ce que le telephone affiche un voyant/indication de charge quand il est branche ?',
          'Utilisateur: oe',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
      suggestion: null,
    });
  });

  it('asks the screen type before suggesting a generic cracked screen ticket', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Materiel',
        confidence: 0.8,
        description: "L'ecran est casse.",
        impact: 'HIGH',
        priorityName: 'HIGH',
        requesterScope: 'SELF',
        title: 'Ecran casse',
        type: TicketType.INCIDENT,
        urgency: 'HIGH',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: ecran casse',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        "De quel type d'ecran s'agit-il : PC portable, ecran externe, telephone, tablette ou autre ?",
      suggestion: null,
    });
  });

  it('asks the impacted scope before suggesting a vague network outage ticket', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Reseau',
        confidence: 0.8,
        description: 'Panne reseau.',
        impact: 'HIGH',
        priorityName: 'HIGH',
        requesterScope: 'SELF',
        title: 'Panne reseau',
        type: TicketType.INCIDENT,
        urgency: 'HIGH',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: panne reseau',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question:
        'Est-ce que cela touche seulement votre poste, plusieurs personnes, ou tout le site ?',
      suggestion: null,
    });
  });

  it('downgrades a printer issue without broad impact to a medium incident', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Materiel',
        channelName: 'Autre',
        confidence: 0.8,
        description: "L'imprimante est HS.",
        impact: 'HIGH',
        priorityName: 'HIGH',
        requesterScope: 'SELF',
        title: 'Imprimante HS',
        type: TicketType.INCIDENT,
        urgency: 'HIGH',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          "Utilisateur: l'imprimante est hs",
          "Assistant: L'imprimante affiche-t-elle un message d'erreur ou clignote-t-elle ?",
          'Utilisateur: non',
          "Assistant: L'imprimante s'allume-t-elle ?",
          'Utilisateur: non',
          'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
          'Utilisateur: moi',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'SUGGEST_TICKET',
      suggestion: {
        impact: IncidentSeverity.MEDIUM,
        priorityName: PriorityName.MEDIUM,
        urgency: IncidentSeverity.MEDIUM,
      },
    });
  });

  it('does not mark a usable cracked screen as high priority by default', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Materiel',
        confidence: 0.8,
        description:
          "L'ecran externe presente une fissure mais affiche encore correctement.",
        impact: 'HIGH',
        priorityName: 'HIGH',
        requesterScope: 'SELF',
        title: 'Ecran fissure',
        type: TicketType.INCIDENT,
        urgency: 'HIGH',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          'Utilisateur: ecran casse',
          "Assistant: De quel type d'ecran s'agit-il : PC portable, ecran externe, telephone, tablette ou autre ?",
          'Utilisateur: ecran externe',
          "Assistant: L'ecran s'affiche-t-il encore normalement malgre la fissure ?",
          'Utilisateur: oe il est juste fissure',
          'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
          'Utilisateur: moi',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'SUGGEST_TICKET',
      suggestion: {
        impact: IncidentSeverity.LOW,
        priorityName: PriorityName.MEDIUM,
        urgency: IncidentSeverity.MEDIUM,
      },
    });
  });

  it('does not ask for exact disk space when the user already says storage is almost full', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          "Quel est l'espace disque disponible restant sur votre PC (en Go ou en pourcentage) ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    const response = await useCase.execute({
      userInput: [
        'Assistant: Bonjour, quel est votre probleme ?',
        "Utilisateur: j'ai plus de stockage sur mon pc",
        'Assistant: Le stockage est-il complet ou presque plein ?',
        'Utilisateur: quasiment plein',
      ].join('\n'),
    });

    expect(response).toMatchObject({
      action: 'ASK_QUESTION',
      suggestion: null,
    });
    expect(response.question).toContain('supprimer ou deplacer');
    expect(response.question).toContain(
      'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
    );
  });

  it('asks the affected device or service for vague storage issues', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          "Est-ce que vous pouvez acceder a votre session PC ou la machine affiche un message d'erreur ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          "Utilisateur: j'ai plus de stockage",
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'ASK_QUESTION',
      question: 'Sur quel appareil ou service manquez-vous de stockage ?',
      suggestion: null,
    });
  });

  it('replaces useless storage detail questions with simple help once the target is known', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        question:
          "Le telephone affiche-t-il un message d'erreur lie au stockage ?",
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    const response = await useCase.execute({
      userInput: [
        'Assistant: Bonjour, quel est votre probleme ?',
        "Utilisateur: j'ai plus de stockage",
        'Assistant: Sur quel appareil ou service manquez-vous de stockage ?',
        'Utilisateur: sur mon tel',
      ].join('\n'),
    });

    expect(response).toMatchObject({
      action: 'ASK_QUESTION',
      suggestion: null,
    });
    expect(response.question).toContain('photos/videos volumineuses');
    expect(response.question).toContain(
      'Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
    );
  });

  it('keeps exact storage details out of the ticket title', async () => {
    mockAssistantResponse(
      baseAssistantPayload({
        action: 'SUGGEST_TICKET',
        categoryName: 'Systeme',
        channelName: 'Portail',
        confidence: 0.8,
        description:
          'Le stockage sur le PC est quasiment plein avec environ 1 Go disponible.',
        impact: 'MEDIUM',
        priorityName: 'MEDIUM',
        requesterScope: 'SELF',
        title: 'Stockage PC presque plein (~1 Go dispo)',
        type: TicketType.INCIDENT,
        urgency: 'MEDIUM',
      }),
    );

    const useCase = new SuggestTicketDraftUseCase();

    await expect(
      useCase.execute({
        userInput: [
          'Assistant: Bonjour, quel est votre probleme ?',
          "Utilisateur: j'ai plus de stockage sur mon pc",
          'Assistant: Le stockage est-il complet ou presque plein ?',
          'Utilisateur: quasiment plein, il reste 1go',
          'Assistant: Avant de creer le ticket, vous pouvez supprimer ou deplacer les gros fichiers, vider les telechargements/la corbeille et desinstaller les applications inutiles.',
          'Assistant: Est-ce que le ticket est pour vous ou pour un autre utilisateur ?',
          'Utilisateur: moi',
        ].join('\n'),
      }),
    ).resolves.toMatchObject({
      action: 'SUGGEST_TICKET',
      suggestion: {
        description:
          'Le stockage sur le PC est quasiment plein avec environ 1 Go disponible',
        title: 'Stockage PC presque plein',
      },
    });
  });
});
