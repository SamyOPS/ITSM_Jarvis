import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
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

const EMPTY_FORM: KnowledgeFormState = {
  category: '',
  content: '',
  status: 'PUBLISHED',
  title: '',
};

export function KnowledgePage({ articleId, session }: KnowledgePageProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] =
    useState<KnowledgeArticle | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [form, setForm] = useState<KnowledgeFormState>(EMPTY_FORM);
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of articles) {
      counts[a.category] = (counts[a.category] ?? 0) + 1;
    }
    return counts;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const normalizedSearch = normalizeText(search);
    return articles.filter((article) => {
      const matchesCategory =
        !categoryFilter || article.category === categoryFilter;
      const searchableText = normalizeText(
        `${article.title} ${article.category} ${article.content}`,
      );
      return matchesCategory && searchableText.includes(normalizedSearch);
    });
  }, [articles, categoryFilter, search]);

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
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
                value={form.title}
              />
            </label>
            <label className="field">
              <span>Catégorie</span>
              <input
                list="kb-categories-list"
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="Compte, Réseau, Logiciel..."
                required
                value={form.category}
              />
              <datalist id="kb-categories-list">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
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
              <button className="primary-button" disabled={isSaving}>
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

      <header className="kb-header">
        <div className="kb-header-copy">
          <h1>Base de connaissances</h1>
          <p>
            Retrouve les procédures utiles avant de créer un ticket ou pour
            résoudre un incident récurrent.
          </p>
        </div>
        <div className="kb-toolbar">
          <div className="kb-search">
            <Search size={16} />
            <input
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              value={search}
            />
          </div>
          {isAdmin ? (
            <button
              className="primary-button"
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
        </div>
      </header>

      {errorMessage ? (
        <p className="referentials-error">{errorMessage}</p>
      ) : null}

      <div className="kb-category-bar">
        <button
          className={`kb-category-pill${!categoryFilter ? ' is-active' : ''}`}
          onClick={() => setCategoryFilter('')}
          type="button"
        >
          Toutes
          <span className="kb-category-pill-count">{articles.length}</span>
        </button>
        {categories.map((cat) => (
          <button
            className={`kb-category-pill${categoryFilter === cat ? ' is-active' : ''}`}
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            type="button"
          >
            {cat}
            <span className="kb-category-pill-count">
              {categoryCount[cat] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="kb-empty">Chargement des articles...</p>
      ) : filteredArticles.length === 0 ? (
        <p className="kb-empty">Aucun article trouvé.</p>
      ) : (
        <div className="kb-grid">
          {filteredArticles.map((article) => (
            <button
              className="kb-card"
              key={article.id}
              onClick={() => navigateTo(`/knowledge/articles/${article.id}`)}
              type="button"
            >
              <div className="kb-card-top">
                <span className="kb-card-category">{article.category}</span>
                <span
                  className={`kb-card-status ${article.status === 'PUBLISHED' ? 'is-published' : 'is-draft'}`}
                >
                  {article.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                </span>
              </div>
              <strong className="kb-card-title">{article.title}</strong>
              <p className="kb-card-excerpt">{article.content}</p>
              <small className="kb-card-meta">
                Mis à jour le {formatDate(article.updatedAt)}
              </small>
            </button>
          ))}
        </div>
      )}
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
