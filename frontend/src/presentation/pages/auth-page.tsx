import { useEffect, useState } from 'react';
import type { ProtectedApiResult } from '../../domain/auth/protected-api-result';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { AuthSetupSnapshot } from '../../domain/auth/auth-setup';
import { DEFAULT_USER_ROLES, isAdminRole } from '../../domain/auth/user-role';
import {
  fetchAuthSetup,
  fetchProtectedAdminArea,
  fetchProtectedAgentArea,
} from '../../infrastructure/api/auth-api';
import { getFrontendRuntimeConfig } from '../../infrastructure/config/env';
import { getFrontendSupabaseConfig } from '../../infrastructure/config/supabase-env';

type AuthLoadState = 'idle' | 'loading' | 'success' | 'error';
type SessionState = 'anonymous' | 'authenticated' | 'restoring';

type AuthPageProps = {
  onLogout: () => void;
  session: AuthSessionSnapshot | null;
  sessionState: SessionState;
};

export function AuthPage({ onLogout, session, sessionState }: AuthPageProps) {
  const [authState, setAuthState] = useState<AuthLoadState>('idle');
  const [authSetup, setAuthSetup] = useState<AuthSetupSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [protectedApiState, setProtectedApiState] =
    useState<AuthLoadState>('idle');
  const [protectedApiResult, setProtectedApiResult] =
    useState<ProtectedApiResult | null>(null);
  const [protectedApiError, setProtectedApiError] = useState<string | null>(
    null,
  );
  const runtimeConfig = getFrontendRuntimeConfig();
  const supabaseConfig = getFrontendSupabaseConfig();

  useEffect(() => {
    let cancelled = false;

    async function loadAuthSetup(): Promise<void> {
      setAuthState('loading');
      setErrorMessage(null);

      try {
        const snapshot = await fetchAuthSetup();

        if (cancelled) {
          return;
        }

        setAuthSetup(snapshot);
        setAuthState('success');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAuthSetup(null);
        setAuthState('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Erreur de configuration d’authentification inconnue',
        );
      }
    }

    void loadAuthSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProtectedApi(): Promise<void> {
      if (!session) {
        setProtectedApiState('idle');
        setProtectedApiError(null);
        setProtectedApiResult(null);
        return;
      }

      setProtectedApiState('loading');
      setProtectedApiError(null);

      try {
        const result = isAdminRole(session.user.role)
          ? await fetchProtectedAdminArea(session.accessToken)
          : await fetchProtectedAgentArea(session.accessToken);

        if (cancelled) {
          return;
        }

        setProtectedApiResult(result);
        setProtectedApiState('success');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setProtectedApiResult(null);
        setProtectedApiState('error');
        setProtectedApiError(
          error instanceof Error
            ? error.message
            : 'Erreur d’appel API protégée inconnue',
        );
      }
    }

    void loadProtectedApi();

    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <section className="auth-dashboard">
      <section className="auth-hero-card">
        <div className="auth-hero-copy">
          <span className="panel-tag">P1.6</span>
          <h2>Contrôle de la pile d’authentification</h2>
          <p>
            Cette vue pilote la configuration Supabase, l’état de la session
            courante et l’accès à l’API backend protégée par rôle.
          </p>
        </div>

        <div className="auth-hero-actions">
          <button
            className="secondary-button"
            disabled={!session}
            onClick={onLogout}
            type="button"
          >
            Se déconnecter
          </button>
        </div>
      </section>

      <section className="auth-metrics-grid">
        <article className="auth-metric-card">
          <span>Configuration</span>
          <strong>{authState}</strong>
        </article>

        <article className="auth-metric-card">
          <span>Session</span>
          <strong>{sessionState}</strong>
        </article>

        <article className="auth-metric-card">
          <span>API protégée</span>
          <strong>{protectedApiState}</strong>
        </article>

        <article className="auth-metric-card">
          <span>Rôle actif</span>
          <strong>{session?.user.role ?? 'AUCUN'}</strong>
        </article>
      </section>

      <section className="auth-grid">
        <article className="auth-section-card">
          <div className="auth-section-heading">
            <h3>Session active</h3>
            <p>
              Résumé utilisateur et accès réellement ouverts dans l’interface.
            </p>
          </div>

          <dl className="status-grid">
            <div>
              <dt>Email session</dt>
              <dd>{session?.user.email ?? 'anonyme'}</dd>
            </div>
            <div>
              <dt>Rôle session</dt>
              <dd>{session?.user.role ?? 'aucun'}</dd>
            </div>
            <div>
              <dt>Identifiant utilisateur</dt>
              <dd>{session?.user.id ?? 'non chargé'}</dd>
            </div>
            <div>
              <dt>UI protégée</dt>
              <dd>
                {session && isAdminRole(session.user.role)
                  ? 'Zones agent et administration visibles'
                  : session?.user.role === 'AGENT'
                    ? 'Zone agent visible'
                    : session
                      ? 'Zones utilisateur authentifié visibles'
                      : 'Session anonyme'}
              </dd>
            </div>
            <div>
              <dt>Cible API protégée</dt>
              <dd>
                {session && isAdminRole(session.user.role)
                  ? '/auth/admin-area'
                  : session
                    ? '/auth/agent-area'
                    : 'aucune'}
              </dd>
            </div>
            <div>
              <dt>Résultat API protégée</dt>
              <dd>
                {protectedApiResult
                  ? `${protectedApiResult.area} / ${protectedApiResult.role}`
                  : 'non chargé'}
              </dd>
            </div>
          </dl>
        </article>

        <article className="auth-section-card">
          <div className="auth-section-heading">
            <h3>Configuration runtime</h3>
            <p>
              État du frontend, du backend d’authentification et du lien
              Supabase.
            </p>
          </div>

          <dl className="status-grid">
            <div>
              <dt>URL API</dt>
              <dd>{runtimeConfig.apiUrl}</dd>
            </div>
            <div>
              <dt>Environnement</dt>
              <dd>{runtimeConfig.appEnv}</dd>
            </div>
            <div>
              <dt>URL Supabase</dt>
              <dd>{supabaseConfig.url || 'absente'}</dd>
            </div>
            <div>
              <dt>Clé anon frontend</dt>
              <dd>{supabaseConfig.anonKey ? 'configurée' : 'absente'}</dd>
            </div>
            <div>
              <dt>Provider backend</dt>
              <dd>{authSetup?.provider ?? 'non chargé'}</dd>
            </div>
            <div>
              <dt>Backend prêt</dt>
              <dd>{authSetup?.ready ? 'oui' : 'non'}</dd>
            </div>
            <div>
              <dt>Rôles supportés</dt>
              <dd>{(authSetup?.roles ?? DEFAULT_USER_ROLES).join(', ')}</dd>
            </div>
            <div>
              <dt>Erreur API protégée</dt>
              <dd>{protectedApiError ?? 'aucune'}</dd>
            </div>
            <div>
              <dt>URL Supabase backend</dt>
              <dd>{authSetup?.supabase.hasUrl ? 'configurée' : 'absente'}</dd>
            </div>
            <div>
              <dt>Clé anon backend</dt>
              <dd>
                {authSetup?.supabase.hasAnonKey ? 'configurée' : 'absente'}
              </dd>
            </div>
            <div>
              <dt>Service role backend</dt>
              <dd>
                {authSetup?.supabase.hasServiceRoleKey
                  ? 'configurée'
                  : 'absente'}
              </dd>
            </div>
            <div>
              <dt>Dernière erreur</dt>
              <dd>{errorMessage ?? 'aucune'}</dd>
            </div>
          </dl>
        </article>
      </section>
    </section>
  );
}
