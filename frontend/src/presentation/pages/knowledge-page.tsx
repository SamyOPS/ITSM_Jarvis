import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  CreateKnowledgeArticlePayload,
  KnowledgeArticle,
  KnowledgeArticleStatus,
} from '../../domain/knowledge/knowledge-article';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import {
  createKnowledgeArticle,
  fetchKnowledgeArticle,
  fetchKnowledgeArticles,
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
  const [form, setForm] = useState<KnowledgeFormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
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

    const selectedArticleId = articleId;
    let cancelled = false;

    async function loadArticle(): Promise<void> {
      try {
        const article = await fetchKnowledgeArticle(
          session.accessToken,
          selectedArticleId,
        );

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

  const categories = useMemo(
    () =>
      Array.from(new Set(articles.map((article) => article.category))).sort(
        (left, right) => left.localeCompare(right, 'fr'),
      ),
    [articles],
  );

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);
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

      setArticles((currentArticles) => [article, ...currentArticles]);
      setForm(EMPTY_FORM);
      setFormMessage('Article ajoute a la base de connaissances.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la creation de l'article",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (selectedArticle) {
    return (
      <section className="knowledge-page">
        <button
          className="secondary-button knowledge-back-button"
          onClick={() => navigateTo('/knowledge/articles')}
          type="button"
        >
          Retour aux articles
        </button>

        <article className="knowledge-detail">
          <div className="knowledge-detail-meta">
            <span>{selectedArticle.category}</span>
            <span>
              {selectedArticle.status === 'PUBLISHED' ? 'Publie' : 'Brouillon'}
            </span>
          </div>
          <h1>{selectedArticle.title}</h1>
          <p className="knowledge-updated-at">
            Mis a jour le {formatDate(selectedArticle.updatedAt)}
          </p>
          <div className="knowledge-content">
            {selectedArticle.content.split('\n').map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="knowledge-page">
      <header className="knowledge-header">
        <div>
          <h1>Base de connaissances</h1>
          <p>
            Retrouve les procedures utiles avant de creer un ticket ou pour
            resoudre un incident recurrent.
          </p>
        </div>
      </header>

      {errorMessage ? (
        <p className="referentials-error">{errorMessage}</p>
      ) : null}

      {formMessage ? <p className="form-success">{formMessage}</p> : null}

      <div className="knowledge-layout">
        <section className="knowledge-list-panel">
          <div className="knowledge-filters">
            <label className="field">
              <span>Recherche</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mot de passe, reseau, logiciel..."
                value={search}
              />
            </label>

            <label className="field">
              <span>Categorie</span>
              <select
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="">Toutes</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <p className="knowledge-empty">Chargement des articles...</p>
          ) : filteredArticles.length === 0 ? (
            <p className="knowledge-empty">Aucun article trouve.</p>
          ) : (
            <div className="knowledge-article-list">
              {filteredArticles.map((article) => (
                <button
                  className="knowledge-article-card"
                  key={article.id}
                  onClick={() =>
                    navigateTo(`/knowledge/articles/${article.id}`)
                  }
                  type="button"
                >
                  <span>{article.category}</span>
                  <strong>{article.title}</strong>
                  <small>
                    {article.status === 'PUBLISHED' ? 'Publie' : 'Brouillon'} -
                    mis a jour le {formatDate(article.updatedAt)}
                  </small>
                </button>
              ))}
            </div>
          )}
        </section>

        {isAdmin ? (
          <aside className="knowledge-form-panel">
            <h2>Nouvel article</h2>
            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>Titre</span>
                <input
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
                <span>Categorie</span>
                <input
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      category: event.target.value,
                    }))
                  }
                  placeholder="Compte, Reseau, Logiciel..."
                  required
                  value={form.category}
                />
              </label>

              <label className="field">
                <span>Statut</span>
                <select
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      status: event.target.value as KnowledgeArticleStatus,
                    }))
                  }
                  value={form.status}
                >
                  <option value="PUBLISHED">Publie</option>
                  <option value="DRAFT">Brouillon</option>
                </select>
              </label>

              <label className="field">
                <span>Contenu</span>
                <textarea
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      content: event.target.value,
                    }))
                  }
                  required
                  rows={10}
                  value={form.content}
                />
              </label>

              <button className="primary-button" disabled={isSaving}>
                {isSaving ? 'Creation...' : "Creer l'article"}
              </button>
            </form>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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
