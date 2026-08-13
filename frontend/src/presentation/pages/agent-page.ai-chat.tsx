import type {
  ClipboardEvent,
  DragEvent,
  RefObject,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import { Paperclip, RotateCcw, X } from 'lucide-react';

import {
  translateIncidentSeverity,
  translatePriority,
  translateTicketType,
} from '../../domain/i18n/ticketing-labels';
import type { TicketDraftSuggestion } from '../../infrastructure/api/ticketing-api.types';
import type { AiChatMessage } from './agent-page.ai-chat.types';

type SuggestedRequesterResolution = {
  requesterLabel: string | null;
};

export function AiStarsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="ticket-ai-stars-icon"
      focusable="false"
      viewBox="0 0 16 16"
    >
      <path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.828 1.828l1.937.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.828l-.645 1.937a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zm-3.863-5.1a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z" />
    </svg>
  );
}

type AiChatModalProps = {
  aiConversationFiles: File[];
  aiDraftErrorMessage: string | null;
  aiDraftFileInputKey: number;
  aiDraftFiles: File[];
  aiDraftInput: string;
  aiDraftSuggestion: TicketDraftSuggestion | null;
  aiChatBodyRef: RefObject<HTMLDivElement | null>;
  aiChatMessages: AiChatMessage[];
  formatFileSize: (sizeBytes: number) => string;
  getLocalFileKey: (file: File) => string;
  handleApplyTicketDraftSuggestion: () => void;
  handleOpenLocalFile: (file: File) => void;
  handleRemoveAiDraftFile: (fileKey: string) => void;
  isAiDraftFileDragOver: boolean;
  isSuggestingDraft: boolean;
  onAiDraftFileDragLeave: (event: DragEvent<HTMLElement>) => void;
  onAiDraftFileDragOver: (event: DragEvent<HTMLElement>) => void;
  onAiDraftFileDrop: (event: DragEvent<HTMLElement>) => void;
  onAiDraftFileSelection: (fileList: FileList | null) => void;
  onAiDraftInputChange: (value: string) => void;
  onAiDraftInputPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onCloseAiChat: () => void;
  onResetAiChat: () => void;
  onResizeAiDraftTextarea: (element?: HTMLTextAreaElement | null) => void;
  onSendAiChatMessage: () => Promise<void>;
  resolveSuggestedRequester: (
    requesterScope: TicketDraftSuggestion['requesterScope'],
    requesterName: string | null,
  ) => SuggestedRequesterResolution;
  setAiDraftErrorMessage: (message: string | null) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function AiChatModal({
  aiConversationFiles,
  aiDraftErrorMessage,
  aiDraftFileInputKey,
  aiDraftFiles,
  aiDraftInput,
  aiDraftSuggestion,
  aiChatBodyRef,
  aiChatMessages,
  formatFileSize,
  getLocalFileKey,
  handleApplyTicketDraftSuggestion,
  handleOpenLocalFile,
  handleRemoveAiDraftFile,
  isAiDraftFileDragOver,
  isSuggestingDraft,
  onAiDraftFileDragLeave,
  onAiDraftFileDragOver,
  onAiDraftFileDrop,
  onAiDraftFileSelection,
  onAiDraftInputChange,
  onAiDraftInputPaste,
  onCloseAiChat,
  onResetAiChat,
  onResizeAiDraftTextarea,
  onSendAiChatMessage,
  resolveSuggestedRequester,
  setAiDraftErrorMessage,
  textareaRef,
}: AiChatModalProps) {
  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey && !isSuggestingDraft) {
      event.preventDefault();
      void onSendAiChatMessage();
    }
  }

  function handleOverlayMouseDown(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      onCloseAiChat();
    }
  }

  return (
    <div
      aria-modal="true"
      className="ticket-ai-chat-overlay"
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
    >
      <section
        className={
          isAiDraftFileDragOver
            ? 'ticket-ai-chat is-file-drag-over'
            : 'ticket-ai-chat'
        }
        onDragLeave={onAiDraftFileDragLeave}
        onDragOver={onAiDraftFileDragOver}
        onDrop={onAiDraftFileDrop}
      >
        <header className="ticket-ai-chat-header">
          <div>
            <h3>Assistant IA Vision</h3>
            <p>Pre-remplissage intelligent du ticket</p>
          </div>
          <div className="ticket-ai-chat-header-actions">
            <button
              className="ticket-ai-chat-reset"
              onClick={onResetAiChat}
              type="button"
            >
              <RotateCcw size={15} />
              Nouveau chat
            </button>
            <button
              aria-label="Fermer l assistant IA"
              className="ticket-ai-chat-close"
              onClick={onCloseAiChat}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="ticket-ai-chat-body" ref={aiChatBodyRef}>
          {aiChatMessages.map((message) => (
            <div
              className={
                message.role === 'assistant'
                  ? 'ticket-ai-message-group ticket-ai-message-group--assistant'
                  : 'ticket-ai-message-group ticket-ai-message-group--user'
              }
              key={message.id}
            >
              {message.attachments?.length ? (
                <div className="ticket-ai-message-attachments">
                  {message.attachments.map((attachment) => {
                    const sourceFile = aiConversationFiles.find(
                      (file) => getLocalFileKey(file) === attachment.fileKey,
                    );

                    return (
                      <span
                        className="ticket-ai-file-chip"
                        key={`${message.id}-${attachment.fileKey}`}
                      >
                        <button
                          className="ticket-ai-file-link"
                          disabled={!sourceFile}
                          onClick={() => {
                            if (sourceFile) {
                              handleOpenLocalFile(sourceFile);
                            }
                          }}
                          type="button"
                        >
                          {attachment.fileName} (
                          {formatFileSize(attachment.fileSize)})
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <div
                className={
                  message.role === 'assistant'
                    ? 'ticket-ai-message ticket-ai-message--assistant'
                    : 'ticket-ai-message ticket-ai-message--user'
                }
              >
                <p>{message.body}</p>
              </div>
            </div>
          ))}

          {isSuggestingDraft ? (
            <div className="ticket-ai-message ticket-ai-message--assistant is-loading">
              Chargement...
            </div>
          ) : null}

          {aiDraftErrorMessage ? (
            <div className="ticket-ai-message ticket-ai-message--assistant is-error">
              {aiDraftErrorMessage}
            </div>
          ) : null}

          {aiDraftSuggestion ? (
            <div className="ticket-ai-message ticket-ai-message--assistant ticket-ai-message--suggestion">
              <strong>{aiDraftSuggestion.title}</strong>
              <div className="ticket-ai-suggestion-details">
                <small>
                  Type : {translateTicketType(aiDraftSuggestion.type)}
                </small>
                {aiDraftSuggestion.categoryName ? (
                  <small>Categorie : {aiDraftSuggestion.categoryName}</small>
                ) : null}
                {aiDraftSuggestion.type === 'INCIDENT' ? (
                  <>
                    {aiDraftSuggestion.impact ? (
                      <small>
                        Impact :{' '}
                        {translateIncidentSeverity(aiDraftSuggestion.impact)}
                      </small>
                    ) : null}
                    {aiDraftSuggestion.urgency ? (
                      <small>
                        Urgence :{' '}
                        {translateIncidentSeverity(aiDraftSuggestion.urgency)}
                      </small>
                    ) : null}
                  </>
                ) : aiDraftSuggestion.priorityName ? (
                  <small>
                    Priorite :{' '}
                    {translatePriority(aiDraftSuggestion.priorityName)}
                  </small>
                ) : null}
                {aiDraftSuggestion.requesterScope ? (
                  <small>
                    Demandeur :{' '}
                    {resolveSuggestedRequester(
                      aiDraftSuggestion.requesterScope,
                      aiDraftSuggestion.requesterName,
                    ).requesterLabel ?? 'Non renseigne'}
                  </small>
                ) : null}
                {aiDraftSuggestion.channelName ? (
                  <small>Canal : {aiDraftSuggestion.channelName}</small>
                ) : null}
              </div>
              <p>{aiDraftSuggestion.description}</p>
              <button
                className="primary-button"
                onClick={handleApplyTicketDraftSuggestion}
                type="button"
              >
                Appliquer au formulaire
              </button>
            </div>
          ) : null}
        </div>

        <footer className="ticket-ai-chat-footer">
          {aiDraftFiles.length > 0 ? (
            <div className="ticket-ai-selected-files">
              {aiDraftFiles.map((file) => {
                const fileKey = getLocalFileKey(file);

                return (
                  <span className="ticket-ai-file-chip" key={fileKey}>
                    <button
                      className="ticket-ai-file-link"
                      onClick={() => handleOpenLocalFile(file)}
                      type="button"
                    >
                      {file.name} ({formatFileSize(file.size)})
                    </button>
                    <button
                      aria-label={`Retirer ${file.name}`}
                      onClick={() => handleRemoveAiDraftFile(fileKey)}
                      type="button"
                    >
                      <X size={13} />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}

          <label
            aria-label="Ajouter une piece jointe"
            className="ticket-ai-attachment-button"
          >
            <Paperclip size={17} />
            <input
              key={aiDraftFileInputKey}
              multiple
              onChange={(event) => onAiDraftFileSelection(event.target.files)}
              type="file"
            />
          </label>
          <textarea
            aria-label="Message pour l assistant IA"
            onChange={(event) => {
              onAiDraftInputChange(event.target.value);
              setAiDraftErrorMessage(null);
              onResizeAiDraftTextarea(event.target);
            }}
            onKeyDown={handleInputKeyDown}
            onPaste={onAiDraftInputPaste}
            placeholder="Decrivez votre besoin..."
            ref={textareaRef}
            rows={1}
            value={aiDraftInput}
          />
          <button
            className="primary-button"
            disabled={isSuggestingDraft}
            onClick={onSendAiChatMessage}
            type="button"
          >
            Envoyer
          </button>
        </footer>
      </section>
    </div>
  );
}
