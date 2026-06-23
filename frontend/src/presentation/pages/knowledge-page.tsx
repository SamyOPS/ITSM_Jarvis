import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Eye,
  FileText,
  Flame,
  History,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
  KnowledgeArticleStatus,
  UpdateKnowledgeArticlePayload,
} from '../../domain/knowledge/knowledge-article';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  fetchKnowledgeArticle,
  fetchKnowledgeArticles,
  toggleKnowledgeArticleLike,
  updateKnowledgeArticle,
} from '../../infrastructure/api/knowledge-api';
import { navigateTo } from '../../infrastructure/routing/browser-router';

type KnowledgePageProps = {
  articleId?: string;
  session: AuthSessionSnapshot;
};

type KnowledgeFormState = {
  category: string;
  content: string;
  status: KnowledgeArticleStatus;
  title: string;
};

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; article: KnowledgeArticle }
  | { type: 'delete'; article: KnowledgeArticle };

type KnowledgeSortOption = 'POPULAR' | 'NEWEST' | 'OLDEST';

const KNOWLEDGE_CATEGORY_OPTIONS = [
  'Compte & accès',
  'Réseau & Internet',
  'Matériel',
  'Logiciels & applications',
  'Messagerie',
  'Impression',
  'Sécurité',
  'Téléphonie',
  'Procédures internes',
  'Dépannage général',
] as const;

const KNOWLEDGE_PAGE_SIZE = 20;

const EMPTY_FORM: KnowledgeFormState = {
  category: '',
  content: '',
  status: 'PUBLISHED',
  title: '',
};

const KNOWLEDGE_SORT_OPTIONS: Array<{
  description: string;
  icon: typeof Flame;
  label: string;
  value: KnowledgeSortOption;
}> = [
  {
    value: 'POPULAR',
    label: 'Plus populaire',
    description: 'Trie par nombre de likes',
    icon: Flame,
  },
  {
    value: 'NEWEST',
    label: 'Plus recentes',
    description: 'Articles les plus recemment mis a jour',
    icon: ArrowUpDown,
  },
  {
    value: 'OLDEST',
    label: 'Plus anciennes',
    description: 'Articles les plus anciens en premier',
    icon: History,
  },
];

export function KnowledgePage({ articleId, session }: KnowledgePageProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] =
    useState<KnowledgeArticle | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [form, setForm] = useState<KnowledgeFormState>(EMPTY_FORM);
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<KnowledgeSortOption>('NEWEST');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [likingArticleIds, setLikingArticleIds] = useState<string[]>([]);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = session.user.role === 'ADMIN';

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
      return;
    }
    const id = articleId;
    let cancelled = false;

    async function loadArticle(): Promise<void> {
      try {
        const article = await fetchKnowledgeArticle(session.accessToken, id);
        if (!cancelled) setSelectedArticle(article);
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

  const categories = useMemo(
    () =>
      Array.from(new Set(articles.map((a) => a.category))).sort((a, b) =>
        a.localeCompare(b, 'fr'),
      ),
    [articles],
  );

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

  function openCreate() {
    setForm(EMPTY_FORM);
    setContentTab('edit');
    setErrorMessage(null);
    setModal({ type: 'create' });
  }

  function openEdit(article: KnowledgeArticle) {
    setForm({
      title: article.title,
      category: article.category,
      content: article.content,
      status: article.status,
    });
    setContentTab('edit');
    setErrorMessage(null);
    setModal({ type: 'edit', article });
  }

  function openDelete(article: KnowledgeArticle) {
    setErrorMessage(null);
    setModal({ type: 'delete', article });
  }

  function closeModal() {
    setModal({ type: 'none' });
    setErrorMessage(null);
  }

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload: CreateKnowledgeArticlePayload = {
        category: form.category,
        content: form.content,
        status: form.status,
        title: form.title,
      };
      const article = await createKnowledgeArticle(
        session.accessToken,
        payload,
      );
      setArticles((current) => [article, ...current]);
      closeModal();
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
    if (modal.type !== 'edit') return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload: UpdateKnowledgeArticlePayload = {
        category: form.category,
        content: form.content,
        status: form.status,
        title: form.title,
      };
      const updated = await updateKnowledgeArticle(
        session.accessToken,
        modal.article.id,
        payload,
      );
      setArticles((current) =>
        current.map((a) => (a.id === updated.id ? updated : a)),
      );
      if (selectedArticle?.id === updated.id) setSelectedArticle(updated);
      closeModal();
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

  async function handleDelete(): Promise<void> {
    if (modal.type !== 'delete') return;
    const articleToDelete = modal.article;
    const wasViewing = selectedArticle?.id === articleToDelete.id;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await deleteKnowledgeArticle(session.accessToken, articleToDelete.id);
      setArticles((current) =>
        current.filter((a) => a.id !== articleToDelete.id),
      );
      closeModal();
      if (wasViewing) navigateTo('/knowledge/articles');
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

    setLikingArticleIds((current) => [...current, articleId]);

    try {
      const updatedArticle = await toggleKnowledgeArticleLike(
        session.accessToken,
        articleId,
      );

      setArticles((current) =>
        current.map((article) =>
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
          : "Erreur inconnue lors de la mise a jour du like de l'article",
      );
    } finally {
      setLikingArticleIds((current) =>
        current.filter((currentId) => currentId !== articleId),
      );
    }
  }

  // Build modal node before conditional branches so it can be used in both views
  let modalNode: ReactNode = null;

  if (modal.type === 'delete') {
    modalNode = (
      <div
        className="kb-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="kb-modal">
          <div className="kb-modal-header">
            <h2>Supprimer l'article</h2>
            <button
              className="kb-modal-close"
              onClick={closeModal}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
          <div className="kb-delete-confirm">
            <p>
              Es-tu sûr de vouloir supprimer{' '}
              <strong>"{modal.article.title}"</strong> ? Cette action est
              irréversible.
            </p>
            {errorMessage ? (
              <p className="referentials-error">{errorMessage}</p>
            ) : null}
            <div className="kb-delete-actions">
              <button
                className="secondary-button"
                onClick={closeModal}
                type="button"
              >
                Annuler
              </button>
              <button
                className="danger-button"
                disabled={isSaving}
                onClick={handleDelete}
                type="button"
              >
                {isSaving ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (modal.type === 'create' || modal.type === 'edit') {
    const isEdit = modal.type === 'edit';
    modalNode = (
      <div
        className="kb-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="kb-modal">
          <div className="kb-modal-header">
            <h2>{isEdit ? "Modifier l'article" : 'Nouvel article'}</h2>
            <button
              className="kb-modal-close"
              onClick={closeModal}
              type="button"
            >
              <X size={16} />
            </button>
          </div>
          {errorMessage ? (
            <p className="referentials-error">{errorMessage}</p>
          ) : null}
          <form
            className="kb-modal-form"
            onSubmit={isEdit ? handleUpdate : handleCreate}
          >
            <label className="field">
              <span>Titre</span>
              <input
                maxLength={50}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
                value={form.title}
              />
            </label>
            <label className="field">
              <span>Catégorie</span>
              <select
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                required
                value={form.category}
              >
                <option value="">Choisir une catégorie</option>
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
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as KnowledgeArticleStatus,
                  }))
                }
                value={form.status}
              >
                <option value="PUBLISHED">Publié</option>
                <option value="DRAFT">Brouillon</option>
              </select>
            </label>
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
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
                disabled={isSaving}
              >
                {isSaving
                  ? isEdit
                    ? 'Sauvegarde...'
                    : 'Création...'
                  : isEdit
                    ? 'Sauvegarder'
                    : "Créer l'article"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedArticle) {
    return (
      <section className="kb-page">
        {modalNode}
        {errorMessage && modal.type === 'none' ? (
          <p className="referentials-error">{errorMessage}</p>
        ) : null}
        <div className="kb-detail">
          <div className="kb-detail-nav">
            <button
              className="secondary-button"
              onClick={() => navigateTo('/knowledge/articles')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
              type="button"
            >
              <ArrowLeft size={16} />
              Retour aux articles
            </button>
            {isAdmin ? (
              <div className="kb-detail-actions">
                <button
                  className="secondary-button"
                  onClick={() => openEdit(selectedArticle)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                  type="button"
                >
                  <Pencil size={15} />
                  Modifier
                </button>
                <button
                  className="danger-button"
                  onClick={() => openDelete(selectedArticle)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                  type="button"
                >
                  <Trash2 size={15} />
                  Supprimer
                </button>
              </div>
            ) : null}
          </div>

          <div className="kb-detail-hero">
            <div className="kb-detail-meta">
              <span className="kb-card-category">
                {selectedArticle.category}
              </span>
              <span
                className={`kb-card-status ${selectedArticle.status === 'PUBLISHED' ? 'is-published' : 'is-draft'}`}
              >
                {selectedArticle.status === 'PUBLISHED'
                  ? 'Publié'
                  : 'Brouillon'}
              </span>
            </div>
            <h1>{selectedArticle.title}</h1>
            <p className="kb-detail-date">
              Mis à jour le {formatDate(selectedArticle.updatedAt)}
            </p>
          </div>

          <div className="kb-markdown">
            {renderMarkdown(selectedArticle.content)}
          </div>
        </div>
      </section>
    );
  }

  // Grid view
  return (
    <section className="kb-page">
      {modalNode}
      <div className="ticket-list-card kb-list-card">
        <div className="ticket-list-header kb-list-header">
          <div>
            <h3>Base de connaissances</h3>
            <p>
              Retrouvez les procedures utiles ainsi que les articles de support.
            </p>
          </div>

          <div className="ticket-list-toolbar">
            <div className="ticket-list-count" aria-live="polite">
              <strong>{filteredArticles.length}</strong>
              <span>articles</span>
            </div>

            {isAdmin ? (
              <button
                className="primary-button kb-light-button kb-toolbar-create-button"
                onClick={openCreate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                type="button"
              >
                <Plus size={16} />
                Nouvel article
              </button>
            ) : null}

            <div className="ticket-list-sort-menu" ref={sortMenuRef}>
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
                            className="ticket-sort-option-icon"
                            aria-hidden="true"
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un article..."
                value={search}
              />
            </div>
          </div>

          <div className="field kb-filter-field">
            <span>Categorie</span>
            <div className="kb-category-select">
              <select
                onChange={(e) => setCategoryFilter(e.target.value)}
                value={categoryFilter}
              >
                <option value="">Tous</option>
                {categories.map((category) => (
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
                onChange={(e) => setStatusFilter(e.target.value)}
                value={statusFilter}
              >
                <option value="">Tous</option>
                <option value="PUBLISHED">Publie</option>
                <option value="DRAFT">Brouillon</option>
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
          <p className="kb-empty">Aucun article trouve.</p>
        ) : (
          <>
            <div className="kb-grid">
              {paginatedArticles.map((article) => (
                <article
                  className="kb-card"
                  key={article.id}
                  onClick={() =>
                    navigateTo(`/knowledge/articles/${article.id}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigateTo(`/knowledge/articles/${article.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="kb-card-top">
                    <span className="kb-card-category">{article.category}</span>
                    <span
                      className={`kb-card-status ${article.status === 'PUBLISHED' ? 'is-published' : 'is-draft'}`}
                    >
                      {article.status === 'PUBLISHED' ? 'Publie' : 'Brouillon'}
                    </span>
                  </div>
                  <strong className="kb-card-title">{article.title}</strong>
                  <p className="kb-card-excerpt">{article.content}</p>
                  <div className="kb-card-footer">
                    <small className="kb-card-meta">
                      Mis a jour le {formatDate(article.updatedAt)}
                    </small>

                    <button
                      aria-label={
                        article.likedByMe
                          ? "Retirer le like de l'article"
                          : "Liker l'article"
                      }
                      className={`kb-like-button${article.likedByMe ? ' is-active' : ''}`}
                      disabled={likingArticleIds.includes(article.id)}
                      onClick={(event) =>
                        void handleToggleLike(article.id, event)
                      }
                      type="button"
                    >
                      <ThumbsUp size={15} />
                      <span>{article.likesCount}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="kb-pagination">
              <span className="kb-pagination-summary">
                Page {visiblePage} sur {totalPages} - {filteredArticles.length}{' '}
                articles
              </span>

              <div className="kb-pagination-controls">
                <button
                  className="secondary-button"
                  disabled={visiblePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Precedent
                </button>
                <span aria-current="page" className="kb-pagination-current">
                  {visiblePage}
                </span>
                <button
                  className="secondary-button"
                  disabled={visiblePage >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  type="button"
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function renderMarkdown(content: string): ReactNode {
  const lines = content.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(
        <pre key={`pre-${i}`}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={`h3-${i}`}>{inlineMarkdown(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h2 key={`h2-${i}`}>{inlineMarkdown(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h1 key={`h1-${i}`}>{inlineMarkdown(line.slice(2))}</h1>);
    }
    // Horizontal rule
    else if (/^-{3,}$/.test(line.trim()) || /^_{3,}$/.test(line.trim())) {
      nodes.push(<hr key={`hr-${i}`} />);
    }
    // Unordered list
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('- ') || lines[i].startsWith('* '))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`}>
          {items.map((item, j) => (
            <li key={j}>{inlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // Ordered list
    else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`}>
          {items.map((item, j) => (
            <li key={j}>{inlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    // Blank line — skip
    else if (line.trim() === '') {
      // intentionally empty
    }
    // Paragraph
    else {
      nodes.push(<p key={`p-${i}`}>{inlineMarkdown(line)}</p>);
    }

    i++;
  }

  return <>{nodes}</>;
}

function inlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (
          part.startsWith('*') &&
          part.endsWith('*') &&
          part.length > 2 &&
          !part.startsWith('**')
        ) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        return part || null;
      })}
    </>
  );
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
