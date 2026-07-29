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
});
