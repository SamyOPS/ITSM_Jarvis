import { useEffect, useState } from 'react';
import type { HealthSnapshot } from '../../domain/health/health-snapshot';
import { fetchBackendHealth } from '../../infrastructure/api/health-api';
import { getFrontendRuntimeConfig } from '../../infrastructure/config/env';

type ConnectionState = 'idle' | 'loading' | 'success' | 'error';

export function StatusPage() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('idle');
  const [healthSnapshot, setHealthSnapshot] = useState<HealthSnapshot | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const config = getFrontendRuntimeConfig();

  useEffect(() => {
    let cancelled = false;

    async function loadHealth(): Promise<void> {
      setConnectionState('loading');
      setErrorMessage(null);

      try {
        const snapshot = await fetchBackendHealth();

        if (cancelled) {
          return;
        }

        setHealthSnapshot(snapshot);
        setConnectionState('success');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setHealthSnapshot(null);
        setConnectionState('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown connection error',
        );
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel">
      <span className="panel-tag">P0.5</span>
      <h2>Frontend to backend health check</h2>
      <p>
        This route validates that the frontend can reach the backend technical
        endpoint.
      </p>
      <div className="status-card">
        <strong>Connection state</strong>
        <span>{connectionState}</span>
      </div>
      <dl className="status-grid">
        <div>
          <dt>API URL</dt>
          <dd>{config.apiUrl}</dd>
        </div>
        <div>
          <dt>Backend service</dt>
          <dd>{healthSnapshot?.service ?? 'not-loaded'}</dd>
        </div>
        <div>
          <dt>Backend status</dt>
          <dd>{healthSnapshot?.status ?? 'unknown'}</dd>
        </div>
        <div>
          <dt>Last error</dt>
          <dd>{errorMessage ?? 'none'}</dd>
        </div>
      </dl>
    </section>
  );
}
