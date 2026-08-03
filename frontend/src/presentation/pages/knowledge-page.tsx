import {
  type DragEvent,
  type FormEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Eye,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
  KnowledgeArticleStatus,
  UpdateKnowledgeArticlePayload,
} from '../../domain/knowledge/knowledge-article';
import {
  canManageKnowledgeBase,
  canValidateKnowledgeBase,
} from '../../domain/auth/user-capabilities';
import { isSupportRole } from '../../domain/auth/user-role';
import type { KnowledgeArticleAttachmentSnapshot } from '../../domain/knowledge/knowledge-article-attachment';
import { AppPagination } from '../components/app-pagination';
import {
  addKnowledgeArticleAttachment,
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  deleteKnowledgeArticleAttachment,
  deleteKnowledgeArticleAttachmentBinary,
  downloadKnowledgeArticleAttachmentBinary,
  fetchKnowledgeArticle,
  fetchKnowledgeArticleAttachments,
  fetchKnowledgeArticles,
  toggleKnowledgeArticleLike,
  updateKnowledgeArticle,
  uploadKnowledgeArticleAttachmentBinary,
} from '../../infrastructure/api/knowledge-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';
import {
  getPageQueryParam,
  withPageQuery,
  withReturnPageQuery,
} from '../helpers/pagination-route.helpers';
import { KnowledgeArticleCard } from './knowledge-article-card';
import {
  EMPTY_FORM,
  KNOWLEDGE_CATEGORY_OPTIONS,
  KNOWLEDGE_PAGE_SIZE,
  KNOWLEDGE_SORT_OPTIONS,
} from './knowledge-page.constants';
import {
  formatDate,
  normalizeText,
  renderMarkdown,
} from './knowledge-page.helpers';
import type {
  KnowledgeFormState,
  KnowledgePageProps,
  KnowledgeSortOption,
} from './knowledge-page.types';

const KNOWLEDGE_ATTACHMENTS_BUCKET_ID = 'ticket-attachments';
const KNOWLEDGE_ATTACHMENT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const KNOWLEDGE_STATUS_SORT_ORDER: Record<KnowledgeArticleStatus, number> = {
  PUBLISHED: 0,
  DRAFT: 1,
  REJECTED: 2,
};

export function KnowledgePage({
  articleId,
  mode = articleId ? 'DETAIL' : 'LIST',
  session,
}: KnowledgePageProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] =
    useState<KnowledgeArticle | null>(null);
  const [selectedArticleAttachments, setSelectedArticleAttachments] = useState<
    KnowledgeArticleAttachmentSnapshot[]
  >([]);
  const [form, setForm] = useState<KnowledgeFormState>(EMPTY_FORM);
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<KnowledgeSortOption>('NEWEST');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [page, setPage] = useState(() => getPageQueryParam());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attachmentErrorMessage, setAttachmentErrorMessage] = useState<
    string | null
  >(null);
  const [attachmentSuccessMessage, setAttachmentSuccessMessage] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<
    string | null
  >(null);
  const [isAttachmentDragOver, setIsAttachmentDragOver] = useState(false);
  const [likingArticleIds, setLikingArticleIds] = useState<string[]>([]);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const canManageArticles = canManageKnowledgeBase(session.user);
  const canValidateArticles = canValidateKnowledgeBase(session.user);
  const isSupport = isSupportRole(session.user.role);
  const canCreateArticle = isSupport;
  const isArticleFormPage = mode === 'CREATE' || mode === 'EDIT';
  const isArticleEditPage = mode === 'EDIT';
  const canEditSelectedArticle =
    selectedArticle !== null &&
    (canValidateArticles ||
      canManageArticles ||
      (isSupport &&
        selectedArticle.createdByUserId === session.user.id &&
        selectedArticle.status !== 'PUBLISHED'));
  const canDeleteSelectedArticle =
    selectedArticle !== null &&
    (canManageArticles ||
      (isSupport &&
        selectedArticle.createdByUserId === session.user.id &&
        selectedArticle.status !== 'PUBLISHED'));
  const articleListBackPath = withPageQuery(
    '/knowledge/articles',
    getPageQueryParam('fromPage'),
  );
  const articleDetailBackPath =
    selectedArticle && articleId
      ? withReturnPageQuery(
          `/knowledge/articles/${selectedArticle.id}`,
          getPageQueryParam('fromPage'),
        )
      : articleListBackPath;

  const loadArticles = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextArticles = await fetchKnowledgeArticles(session.accessToken);
      setArticles(nextArticles);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du chargement de la base de connaissances',
      );
    } finally {
      setIsLoading(false);
    }
  }, [session.accessToken]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (!articleId) {
      setSelectedArticle(null);
      setSelectedArticleAttachments([]);
      return;
    }

    const id = articleId;
    let cancelled = false;

    async function loadArticle(): Promise<void> {
      try {
        const article = await fetchKnowledgeArticle(session.accessToken, id);
        if (!cancelled) {
          setSelectedArticle(article);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Erreur inconnue lors du chargement de l'article",
          );
        }
      }
    }

    void loadArticle();

    return () => {
      cancelled = true;
    };
  }, [articleId, session.accessToken]);

  useEffect(() => {
    if (!selectedArticle) {
      setSelectedArticleAttachments([]);
      setAttachmentErrorMessage(null);
      setAttachmentSuccessMessage(null);
      return;
    }

    const selectedArticleId = selectedArticle.id;
    let cancelled = false;

    async function loadAttachments(): Promise<void> {
      setIsLoadingAttachments(true);
      setAttachmentErrorMessage(null);

      try {
        const attachments = await fetchKnowledgeArticleAttachments(
          session.accessToken,
          selectedArticleId,
        );

        if (!cancelled) {
          setSelectedArticleAttachments(attachments);
        }
      } catch (error) {
        if (!cancelled) {
          setAttachmentErrorMessage(
            error instanceof Error
              ? error.message
              : 'Erreur inconnue lors du chargement des pièces jointes',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAttachments(false);
        }
      }
    }

    void loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [selectedArticle, session.accessToken]);

  useEffect(() => {
    if (mode !== 'CREATE') {
      return;
    }

    setForm({
      ...EMPTY_FORM,
      status: canValidateArticles ? 'PUBLISHED' : 'DRAFT',
    });
    setContentTab('edit');
    setErrorMessage(null);
    setAttachmentInputKey((currentKey) => currentKey + 1);
    setIsAttachmentDragOver(false);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);
  }, [canValidateArticles, mode]);

  useEffect(() => {
    if (mode !== 'EDIT' || !selectedArticle) {
      return;
    }

    setForm({
      attachments: [],
      category: selectedArticle.category,
      content: selectedArticle.content,
      status: selectedArticle.status,
      title: selectedArticle.title,
    });
    setContentTab('edit');
    setErrorMessage(null);
    setAttachmentInputKey((currentKey) => currentKey + 1);
    setIsAttachmentDragOver(false);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);
  }, [mode, selectedArticle]);

  const filteredArticles = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    return articles.filter((article) => {
      const matchesCategory =
        !categoryFilter || article.category === categoryFilter;
      const matchesStatus = !statusFilter || article.status === statusFilter;
      const searchableText = normalizeText(
        `${article.title} ${article.category} ${article.content}`,
      );
      return (
        matchesCategory &&
        matchesStatus &&
        searchableText.includes(normalizedSearch)
      );
    });
  }, [articles, categoryFilter, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    if (!isSortMenuOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent): void {
      if (
        sortMenuRef.current &&
        event.target instanceof Node &&
        !sortMenuRef.current.contains(event.target)
      ) {
        setIsSortMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsSortMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSortMenuOpen]);

  const sortedArticles = useMemo(() => {
    const nextArticles = [...filteredArticles];

    nextArticles.sort((leftArticle, rightArticle) => {
      const statusOrder =
        KNOWLEDGE_STATUS_SORT_ORDER[leftArticle.status] -
        KNOWLEDGE_STATUS_SORT_ORDER[rightArticle.status];

      if (statusOrder !== 0) {
        return statusOrder;
      }

      if (sortBy === 'POPULAR') {
        if (rightArticle.likesCount !== leftArticle.likesCount) {
          return rightArticle.likesCount - leftArticle.likesCount;
        }

        return (
          new Date(rightArticle.updatedAt).getTime() -
          new Date(leftArticle.updatedAt).getTime()
        );
      }

      if (sortBy === 'NEWEST') {
        return (
          new Date(rightArticle.updatedAt).getTime() -
          new Date(leftArticle.updatedAt).getTime()
        );
      }

      return (
        new Date(leftArticle.updatedAt).getTime() -
        new Date(rightArticle.updatedAt).getTime()
      );
    });

    return nextArticles;
  }, [filteredArticles, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedArticles.length / KNOWLEDGE_PAGE_SIZE),
  );
  const visiblePage = Math.min(page, totalPages);

  const paginatedArticles = useMemo(() => {
    const startIndex = (visiblePage - 1) * KNOWLEDGE_PAGE_SIZE;
    return sortedArticles.slice(startIndex, startIndex + KNOWLEDGE_PAGE_SIZE);
  }, [sortedArticles, visiblePage]);

  function resetAttachmentDraft(): void {
    setForm((currentForm) => ({ ...currentForm, attachments: [] }));
    setAttachmentInputKey((currentKey) => currentKey + 1);
    setIsAttachmentDragOver(false);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);
  }

  function openCreate(): void {
    navigateTo(withReturnPageQuery('/knowledge/articles/new', visiblePage));
  }

  function openEdit(article: KnowledgeArticle): void {
    const returnPage = articleId ? getPageQueryParam('fromPage') : visiblePage;

    navigateTo(
      withReturnPageQuery(`/knowledge/articles/${article.id}/edit`, returnPage),
    );
  }

  function openDelete(article: KnowledgeArticle): void {
    if (isSaving) {
      return;
    }

    if (!window.confirm('Supprimer definitivement cet article ?')) {
      return;
    }

    setErrorMessage(null);
    void handleDelete(article);
  }

  function closeModal(): void {
    setErrorMessage(null);
    resetAttachmentDraft();

    if (isArticleFormPage) {
      navigateTo(
        isArticleEditPage ? articleDetailBackPath : articleListBackPath,
      );
    }
  }

  function appendDraftAttachments(files: File[]): void {
    const acceptedFiles: File[] = [];
    const rejectedFiles: string[] = [];

    for (const file of files) {
      if (file.size > KNOWLEDGE_ATTACHMENT_MAX_SIZE_BYTES) {
        rejectedFiles.push(file.name);
        continue;
      }

      acceptedFiles.push(file);
    }

    setForm((currentForm) => ({
      ...currentForm,
      attachments: [...currentForm.attachments, ...acceptedFiles],
    }));

    if (rejectedFiles.length > 0) {
      setAttachmentErrorMessage(
        `Fichier(s) trop volumineux : ${rejectedFiles.join(', ')}. Taille maximale : 2 Mo par fichier.`,
      );
    } else {
      setAttachmentErrorMessage(null);
    }
  }

  function handleAttachmentSelection(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) {
      return;
    }

    appendDraftAttachments(Array.from(fileList));
    setAttachmentInputKey((currentKey) => currentKey + 1);
  }

  function handleAttachmentDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsAttachmentDragOver(false);

    if (event.dataTransfer.files.length === 0) {
      return;
    }

    appendDraftAttachments(Array.from(event.dataTransfer.files));
  }

  function removeDraftAttachment(fileToRemove: File): void {
    setForm((currentForm) => ({
      ...currentForm,
      attachments: currentForm.attachments.filter(
        (file) => getLocalFileKey(file) !== getLocalFileKey(fileToRemove),
      ),
    }));
  }

  async function uploadDraftAttachments(
    articleId: string,
  ): Promise<KnowledgeArticleAttachmentSnapshot[]> {
    if (form.attachments.length === 0) {
      return [];
    }

    setIsUploadingAttachments(true);
    const createdAttachments: KnowledgeArticleAttachmentSnapshot[] = [];

    try {
      for (const file of form.attachments) {
        const storagePath = buildKnowledgeAttachmentStoragePath(
          session.user.id,
          articleId,
          file.name,
        );

        await uploadKnowledgeArticleAttachmentBinary(
          session.accessToken,
          KNOWLEDGE_ATTACHMENTS_BUCKET_ID,
          storagePath,
          file,
        );

        const createdAttachment = await addKnowledgeArticleAttachment(
          session.accessToken,
          articleId,
          {
            bucketId: KNOWLEDGE_ATTACHMENTS_BUCKET_ID,
            fileName: file.name,
            mimeType: file.type || null,
            sizeBytes: file.size,
            storagePath,
          },
        );

        createdAttachments.push(createdAttachment);
      }

      return createdAttachments;
    } finally {
      setIsUploadingAttachments(false);
    }
  }

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setAttachmentErrorMessage(null);

    try {
      const payload: CreateKnowledgeArticlePayload = {
        category: form.category,
        content: form.content,
        status: canValidateArticles ? form.status : 'DRAFT',
        title: form.title,
      };

      const article = await createKnowledgeArticle(
        session.accessToken,
        payload,
      );
      setArticles((currentArticles) => [article, ...currentArticles]);
      let postSaveWarning: string | null = null;

      try {
        await uploadDraftAttachments(article.id);
      } catch (attachmentError) {
        postSaveWarning =
          attachmentError instanceof Error
            ? `Article créé, mais l'ajout des pièces jointes a échoué: ${attachmentError.message}`
            : "Article créé, mais l'ajout des pièces jointes a échoué.";
      }

      closeModal();
      if (mode === 'CREATE') {
        navigateTo(
          withReturnPageQuery(
            `/knowledge/articles/${article.id}`,
            getPageQueryParam('fromPage'),
          ),
        );
      }
      if (postSaveWarning) {
        setErrorMessage(postSaveWarning);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la création de l'article",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const articleToUpdate = isArticleEditPage ? selectedArticle : null;

    if (!articleToUpdate) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setAttachmentErrorMessage(null);

    try {
      const payload: UpdateKnowledgeArticlePayload = {
        category: form.category,
        content: form.content,
        status: canValidateArticles ? form.status : 'DRAFT',
        title: form.title,
      };

      const updatedArticle = await updateKnowledgeArticle(
        session.accessToken,
        articleToUpdate.id,
        payload,
      );

      setArticles((currentArticles) =>
        currentArticles.map((article) =>
          article.id === updatedArticle.id ? updatedArticle : article,
        ),
      );

      if (selectedArticle?.id === updatedArticle.id) {
        setSelectedArticle(updatedArticle);
      }
      let postSaveWarning: string | null = null;

      try {
        const createdAttachments = await uploadDraftAttachments(
          updatedArticle.id,
        );

        if (
          selectedArticle?.id === updatedArticle.id &&
          createdAttachments.length > 0
        ) {
          setSelectedArticleAttachments((currentAttachments) => [
            ...currentAttachments,
            ...createdAttachments,
          ]);
        }
      } catch (attachmentError) {
        postSaveWarning =
          attachmentError instanceof Error
            ? `Article mis à jour, mais l'ajout des pièces jointes a échoué: ${attachmentError.message}`
            : "Article mis à jour, mais l'ajout des pièces jointes a échoué.";
      }

      closeModal();
      if (isArticleEditPage) {
        navigateTo(
          withReturnPageQuery(
            `/knowledge/articles/${updatedArticle.id}`,
            getPageQueryParam('fromPage'),
          ),
        );
      }
      if (postSaveWarning) {
        setErrorMessage(postSaveWarning);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la modification de l'article",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(
    articleToDelete: KnowledgeArticle,
  ): Promise<void> {
    const wasViewing = selectedArticle?.id === articleToDelete.id;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await deleteKnowledgeArticle(session.accessToken, articleToDelete.id);
      setArticles((currentArticles) =>
        currentArticles.filter((article) => article.id !== articleToDelete.id),
      );

      if (wasViewing) {
        navigateTo(articleListBackPath);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la suppression de l'article",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleLike(
    articleId: string,
    event: MouseEvent<HTMLButtonElement>,
  ): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    if (likingArticleIds.includes(articleId)) {
      return;
    }

    setLikingArticleIds((currentIds) => [...currentIds, articleId]);

    try {
      const updatedArticle = await toggleKnowledgeArticleLike(
        session.accessToken,
        articleId,
      );

      setArticles((currentArticles) =>
        currentArticles.map((article) =>
          article.id === updatedArticle.id ? updatedArticle : article,
        ),
      );

      if (selectedArticle?.id === updatedArticle.id) {
        setSelectedArticle(updatedArticle);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la mise à jour du like de l'article",
      );
    } finally {
      setLikingArticleIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== articleId),
      );
    }
  }

  async function handleDownloadAttachment(
    attachment: KnowledgeArticleAttachmentSnapshot,
  ): Promise<void> {
    setDownloadingAttachmentId(attachment.id);
    setAttachmentErrorMessage(null);

    try {
      const blob = await downloadKnowledgeArticleAttachmentBinary(
        session.accessToken,
        attachment.bucketId,
        attachment.storagePath,
      );
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = attachment.fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setAttachmentErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors du téléchargement du fichier',
      );
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  async function handleDeleteAttachment(
    attachment: KnowledgeArticleAttachmentSnapshot,
  ): Promise<void> {
    if (!selectedArticle) {
      return;
    }

    setDeletingAttachmentId(attachment.id);
    setAttachmentErrorMessage(null);
    setAttachmentSuccessMessage(null);

    try {
      await deleteKnowledgeArticleAttachmentBinary(
        session.accessToken,
        attachment.bucketId,
        attachment.storagePath,
      );
      await deleteKnowledgeArticleAttachment(
        session.accessToken,
        selectedArticle.id,
        attachment.id,
      );

      setSelectedArticleAttachments((currentAttachments) =>
        currentAttachments.filter(
          (currentAttachment) => currentAttachment.id !== attachment.id,
        ),
      );
      setAttachmentSuccessMessage('Pièce jointe supprimée.');
    } catch (error) {
      setAttachmentErrorMessage(
        error instanceof Error
          ? error.message
          : 'Erreur inconnue lors de la suppression de la pièce jointe',
      );
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  const articleFormNode =
    isArticleFormPage && (mode === 'CREATE' || selectedArticle) ? (
      <div className="kb-form-page-card">
        <div className="kb-modal-header">
          <h2>{isArticleEditPage ? "Modifier l'article" : 'Nouvel article'}</h2>
        </div>

        {errorMessage ? (
          <p className="referentials-error">{errorMessage}</p>
        ) : null}

        <form
          className="kb-modal-form"
          onSubmit={isArticleEditPage ? handleUpdate : handleCreate}
        >
          <label className="field">
            <span>Titre</span>
            <input
              maxLength={100}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  title: event.target.value,
                }))
              }
              required
              value={form.title}
            />
          </label>

          <label className="field">
            <span>Catégorie</span>
            <select
              className={form.category ? '' : 'select-placeholder'}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  category: event.target.value,
                }))
              }
              required
              value={form.category}
            >
              <option disabled hidden value="">
                Choisir une categorie
              </option>
              {KNOWLEDGE_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Statut</span>
            <select
              disabled={!canValidateArticles}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  status: event.target.value as KnowledgeArticleStatus,
                }))
              }
              value={form.status}
            >
              <option value="PUBLISHED">Publié</option>
              <option value="DRAFT">En attente</option>
              <option value="REJECTED">Refuse</option>
            </select>
          </label>

          {!canValidateArticles ? (
            <p className="ticket-form-helper">
              Votre article sera envoye en validation avant publication.
            </p>
          ) : null}

          <div className="field">
            <span>Contenu (Markdown)</span>
            <div className="kb-markdown-tabs">
              <button
                className={`kb-markdown-tab${contentTab === 'edit' ? ' is-active' : ''}`}
                onClick={() => setContentTab('edit')}
                type="button"
              >
                <FileText size={14} />
                Éditeur
              </button>
              <button
                className={`kb-markdown-tab${contentTab === 'preview' ? ' is-active' : ''}`}
                onClick={() => setContentTab('preview')}
                type="button"
              >
                <Eye size={14} />
                Aperçu
              </button>
            </div>

            {contentTab === 'edit' ? (
              <textarea
                className="kb-markdown-editor"
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    content: event.target.value,
                  }))
                }
                placeholder="Rédigez votre article en Markdown..."
                required
                rows={12}
                value={form.content}
              />
            ) : (
              <div className="kb-markdown-preview kb-markdown">
                {form.content ? (
                  renderMarkdown(form.content)
                ) : (
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                    Aperçu du contenu...
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="field">
            <span>Pièces jointes</span>

            {isArticleEditPage && selectedArticleAttachments.length > 0 ? (
              <div className="kb-attachment-list">
                {selectedArticleAttachments.map((attachment) => (
                  <div className="kb-attachment-item" key={attachment.id}>
                    <div className="kb-attachment-item-copy">
                      <button
                        className="kb-attachment-link"
                        disabled={downloadingAttachmentId === attachment.id}
                        onClick={() =>
                          void handleDownloadAttachment(attachment)
                        }
                        type="button"
                      >
                        {attachment.fileName}
                      </button>
                      <span>
                        {formatFileSize(attachment.sizeBytes)} - ajouté le{' '}
                        {formatDateTime(attachment.createdAt)}
                      </span>
                    </div>

                    <div className="kb-attachment-item-actions">
                      <button
                        aria-label={`Supprimer ${attachment.fileName}`}
                        className="tdp-attachment-remove-btn"
                        disabled={deletingAttachmentId === attachment.id}
                        onClick={() => void handleDeleteAttachment(attachment)}
                        type="button"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div
              className={
                isAttachmentDragOver
                  ? 'ticket-upload-zone kb-upload-zone is-dragover'
                  : 'ticket-upload-zone kb-upload-zone'
              }
              onDragEnter={(event) => {
                event.preventDefault();
                setIsAttachmentDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget === event.target) {
                  setIsAttachmentDragOver(false);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={handleAttachmentDrop}
            >
              <div className="ticket-upload-actions">
                <label className="ticket-upload-button">
                  Choisir des fichiers
                  <input
                    accept="*/*"
                    key={attachmentInputKey}
                    multiple
                    onChange={(event) =>
                      handleAttachmentSelection(event.target.files)
                    }
                    type="file"
                  />
                </label>
                <span className="ticket-upload-note">
                  {formatSelectedFilesLabel(form.attachments.length)}
                </span>
              </div>

              {form.attachments.length > 0 ? (
                <div className="ticket-file-list">
                  {form.attachments.map((file) => {
                    const fileKey = getLocalFileKey(file);

                    return (
                      <span className="ticket-file-chip" key={fileKey}>
                        <span>
                          {file.name} ({formatFileSize(file.size)})
                        </span>
                        <button
                          aria-label={`Retirer ${file.name}`}
                          onClick={() => removeDraftAttachment(file)}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}

              <div className="ticket-upload-note ticket-upload-note--stacked">
                <span>
                  Glissez et déposez vos fichiers ici, ou sélectionnez des
                  fichiers.
                </span>
                <span>2 Mo max par fichier.</span>
              </div>
            </div>

            {attachmentErrorMessage ? (
              <p className="tdp-form-error">{attachmentErrorMessage}</p>
            ) : null}

            {attachmentSuccessMessage ? (
              <p className="tdp-form-success">{attachmentSuccessMessage}</p>
            ) : null}
          </div>

          <div className="kb-modal-actions">
            <button
              className="secondary-button"
              onClick={closeModal}
              type="button"
            >
              Annuler
            </button>
            <button
              className="primary-button kb-light-button"
              disabled={isSaving || isUploadingAttachments}
            >
              {isSaving || isUploadingAttachments
                ? isArticleEditPage
                  ? 'Sauvegarde...'
                  : 'Création...'
                : isArticleEditPage
                  ? canValidateArticles
                    ? 'Sauvegarder'
                    : 'Envoyer en attente'
                  : "Créer l'article"}
            </button>
          </div>
        </form>
      </div>
    ) : null;

  if (isArticleFormPage) {
    return (
      <section className="kb-page kb-page--form">
        <div className="kb-detail-nav kb-form-page-nav">
          <button
            className="tdp-back-btn kb-inline-button"
            onClick={() =>
              navigateTo(
                isArticleEditPage ? articleDetailBackPath : articleListBackPath,
              )
            }
            type="button"
          >
            <ArrowLeft size={16} />
            Retour aux articles
          </button>
        </div>

        {mode === 'EDIT' && !selectedArticle && !errorMessage ? (
          <p className="kb-empty">Chargement de l'article...</p>
        ) : null}

        {errorMessage ? (
          <p className="referentials-error">{errorMessage}</p>
        ) : null}

        {articleFormNode}
      </section>
    );
  }

  if (selectedArticle) {
    return (
      <section className="kb-page">
        {errorMessage ? (
          <p className="referentials-error">{errorMessage}</p>
        ) : null}

        <div className="kb-detail">
          <div className="kb-detail-nav">
            <button
              className="tdp-back-btn kb-inline-button"
              onClick={() => navigateTo(articleListBackPath)}
              type="button"
            >
              <ArrowLeft size={16} />
              Retour aux articles
            </button>

            {canEditSelectedArticle ? (
              <div className="kb-detail-actions">
                <button
                  className="primary-button admin-user-save-button kb-inline-button"
                  onClick={() => openEdit(selectedArticle)}
                  type="button"
                >
                  <Pencil size={15} />
                  Modifier
                </button>
                {canDeleteSelectedArticle ? (
                  <button
                    className="admin-user-delete-button kb-inline-button"
                    onClick={() => openDelete(selectedArticle)}
                    type="button"
                  >
                    <Trash2 size={15} />
                    Supprimer
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="kb-detail-hero">
            <div className="kb-detail-meta">
              <span className="kb-card-category">
                {selectedArticle.category}
              </span>
              <span
                className={`kb-card-status ${getKnowledgeStatusClassName(
                  selectedArticle.status,
                )}`}
              >
                {selectedArticle.status === 'PUBLISHED'
                  ? 'Publié'
                  : selectedArticle.status === 'REJECTED'
                    ? 'Refuse'
                    : 'En attente'}
              </span>
            </div>
            <h1>{selectedArticle.title}</h1>
            <p className="kb-detail-date">
              Mis à jour le {formatDate(selectedArticle.updatedAt)}
            </p>
          </div>

          <div className="kb-detail-body">
            <article className="kb-markdown kb-detail-content">
              {renderMarkdown(selectedArticle.content)}
            </article>

            <aside className="kb-attachments-card">
              <div className="kb-attachments-header">
                <h2>
                  <Paperclip size={18} />
                  Pièces jointes
                </h2>
                <span>{selectedArticleAttachments.length}</span>
              </div>

              {attachmentErrorMessage ? (
                <p className="tdp-form-error">{attachmentErrorMessage}</p>
              ) : null}

              {attachmentSuccessMessage ? (
                <p className="tdp-form-success">{attachmentSuccessMessage}</p>
              ) : null}

              {isLoadingAttachments ? (
                <p className="kb-attachment-empty">
                  Chargement des pièces jointes...
                </p>
              ) : selectedArticleAttachments.length === 0 ? (
                <p className="kb-attachment-empty">Aucune pièce jointe.</p>
              ) : (
                <div className="kb-attachment-list">
                  {selectedArticleAttachments.map((attachment) => (
                    <div className="kb-attachment-item" key={attachment.id}>
                      <div className="kb-attachment-item-copy">
                        <button
                          className="kb-attachment-link"
                          disabled={downloadingAttachmentId === attachment.id}
                          onClick={() =>
                            void handleDownloadAttachment(attachment)
                          }
                          type="button"
                        >
                          {attachment.fileName}
                        </button>
                        <span>
                          {formatFileSize(attachment.sizeBytes)} - ajouté le{' '}
                          {formatDateTime(attachment.createdAt)}
                        </span>
                      </div>

                      <div className="kb-attachment-item-actions">
                        {canManageArticles || canValidateArticles ? (
                          <button
                            aria-label={`Supprimer ${attachment.fileName}`}
                            className="tdp-attachment-remove-btn"
                            disabled={deletingAttachmentId === attachment.id}
                            onClick={() =>
                              void handleDeleteAttachment(attachment)
                            }
                            type="button"
                          >
                            <X size={12} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="kb-page">
      <div className="ticket-list-card kb-list-card">
        <div className="ticket-list-header kb-list-header">
          <div>
            <h3>Base de connaissances</h3>
          </div>

          <div className="ticket-list-toolbar">
            <div className="ticket-list-count" aria-live="polite">
              <strong>{filteredArticles.length}</strong>
              <span>articles</span>
            </div>

            {canCreateArticle ? (
              <button
                className="primary-button admin-user-save-button kb-inline-button kb-toolbar-create-button"
                onClick={openCreate}
                type="button"
              >
                <Plus size={16} />
                {canValidateArticles ? 'Nouvel article' : 'Proposer un article'}
              </button>
            ) : null}

            <div
              className="ticket-list-sort-menu kb-sort-menu"
              ref={sortMenuRef}
            >
              <button
                aria-expanded={isSortMenuOpen}
                aria-haspopup="menu"
                className={
                  isSortMenuOpen
                    ? 'ticket-filter-trigger is-open'
                    : 'ticket-filter-trigger'
                }
                onClick={() =>
                  setIsSortMenuOpen((currentState) => !currentState)
                }
                type="button"
              >
                <span>Trier par</span>
                <SlidersHorizontal size={18} strokeWidth={2} />
              </button>

              {isSortMenuOpen ? (
                <div className="ticket-sort-popover" role="menu">
                  <div className="ticket-sort-popover-label">Trier par</div>

                  <div className="ticket-sort-option-list">
                    {KNOWLEDGE_SORT_OPTIONS.map((option) => {
                      const Icon = option.icon;

                      return (
                        <button
                          className={
                            sortBy === option.value
                              ? 'ticket-sort-option is-active'
                              : 'ticket-sort-option'
                          }
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setIsSortMenuOpen(false);
                          }}
                          role="menuitemradio"
                          type="button"
                        >
                          <span
                            aria-hidden="true"
                            className="ticket-sort-option-icon"
                          >
                            <Icon size={16} strokeWidth={2} />
                          </span>

                          <span className="ticket-sort-option-copy">
                            <strong>{option.label}</strong>
                            <span>
                              {sortBy === option.value
                                ? 'Selection actuelle'
                                : option.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="kb-filter-row">
          <div className="field kb-filter-field">
            <span>Recherche</span>
            <div className="kb-search">
              <Search size={16} />
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un article..."
                value={search}
              />
            </div>
          </div>

          <div className="field kb-filter-field">
            <span>Catégorie</span>
            <div className="kb-category-select">
              <select
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="">Tous</option>
                {KNOWLEDGE_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field kb-filter-field">
            <span>Statut</span>
            <div className="kb-category-select">
              <select
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="">Tous</option>
                <option value="PUBLISHED">Publié</option>
                <option value="DRAFT">En attente</option>
                <option value="REJECTED">Refuse</option>
              </select>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <p className="referentials-error">{errorMessage}</p>
        ) : null}

        {isLoading ? (
          <p className="kb-empty">Chargement des articles...</p>
        ) : filteredArticles.length === 0 ? (
          <p className="kb-empty">Aucun article trouvé.</p>
        ) : (
          <>
            <div className="kb-grid">
              {paginatedArticles.map((article) => (
                <KnowledgeArticleCard
                  article={article}
                  isLiking={likingArticleIds.includes(article.id)}
                  key={article.id}
                  onToggleLike={(currentArticleId, event) => {
                    void handleToggleLike(currentArticleId, event);
                  }}
                  page={visiblePage}
                />
              ))}
            </div>

            <AppPagination
              onPageChange={setPage}
              page={visiblePage}
              summary={`Page ${visiblePage} sur ${totalPages} - ${filteredArticles.length} articles`}
              totalPages={totalPages}
            />
          </>
        )}
      </div>
    </section>
  );
}

function getLocalFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatSelectedFilesLabel(fileCount: number): string {
  if (fileCount === 0) {
    return 'Aucun fichier sélectionné';
  }

  if (fileCount === 1) {
    return '1 fichier sélectionné';
  }

  return `${fileCount} fichiers sélectionnés`;
}

function buildKnowledgeAttachmentStoragePath(
  userId: string,
  articleId: string,
  fileName: string,
): string {
  return `${userId}/knowledge/articles/${articleId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getKnowledgeStatusClassName(status: KnowledgeArticleStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'is-published';
    case 'REJECTED':
      return 'is-rejected';
    default:
      return 'is-draft';
  }
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} Ko`;
  }

  return `${sizeBytes} octets`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
