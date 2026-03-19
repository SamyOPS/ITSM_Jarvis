import { useEffect, useState } from 'react';
import type { AuthSetupSnapshot } from '../../domain/auth/auth-setup';
import { DEFAULT_USER_ROLES } from '../../domain/auth/user-role';
import { fetchAuthSetup } from '../../infrastructure/api/auth-api';
import { getFrontendRuntimeConfig } from '../../infrastructure/config/env';
import { getFrontendSupabaseConfig } from '../../infrastructure/config/supabase-env';

type AuthLoadState = 'idle' | 'loading' | 'success' | 'error';

export function AuthPage() {
  const [authState, setAuthState] = useState<AuthLoadState>('idle');
  const [authSetup, setAuthSetup] = useState<AuthSetupSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
          error instanceof Error ? error.message : 'Unknown auth setup error',
        );
      }
    }

    void loadAuthSetup();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel">
      <span className="panel-tag">P1.1</span>
      <h2>Supabase auth setup</h2>
      <p>
        This screen confirms that Supabase auth configuration and the baseline
        application roles are ready for the next security slices.
      </p>
      <div className="status-card">
        <strong>Setup state</strong>
        <span>{authState}</span>
      </div>
      <dl className="status-grid">
        <div>
          <dt>API URL</dt>
          <dd>{runtimeConfig.apiUrl}</dd>
        </div>
        <div>
          <dt>App environment</dt>
          <dd>{runtimeConfig.appEnv}</dd>
        </div>
        <div>
          <dt>Supabase URL</dt>
          <dd>{supabaseConfig.url || 'missing'}</dd>
        </div>
        <div>
          <dt>Frontend anon key</dt>
          <dd>{supabaseConfig.anonKey ? 'configured' : 'missing'}</dd>
        </div>
        <div>
          <dt>Backend provider</dt>
          <dd>{authSetup?.provider ?? 'not-loaded'}</dd>
        </div>
        <div>
          <dt>Backend ready</dt>
          <dd>{authSetup?.ready ? 'yes' : 'no'}</dd>
        </div>
        <div>
          <dt>Roles</dt>
          <dd>{(authSetup?.roles ?? DEFAULT_USER_ROLES).join(', ')}</dd>
        </div>
        <div>
          <dt>Backend Supabase URL</dt>
          <dd>{authSetup?.supabase.hasUrl ? 'configured' : 'missing'}</dd>
        </div>
        <div>
          <dt>Backend anon key</dt>
          <dd>{authSetup?.supabase.hasAnonKey ? 'configured' : 'missing'}</dd>
        </div>
        <div>
          <dt>Backend service role</dt>
          <dd>
            {authSetup?.supabase.hasServiceRoleKey ? 'configured' : 'missing'}
          </dd>
        </div>
        <div>
          <dt>Last error</dt>
          <dd>{errorMessage ?? 'none'}</dd>
        </div>
      </dl>
    </section>
  );
}
