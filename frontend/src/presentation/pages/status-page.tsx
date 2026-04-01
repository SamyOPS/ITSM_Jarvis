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
          error instanceof Error
            ? error.message
            : 'Erreur de connexion inconnue',
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
      <h2>Supervision frontend vers backend</h2>
      <p>
        Cette vue confirme que le frontend peut joindre correctement le point
        d’entrée technique exposé par le backend.
      </p>
      <div className="status-card">
        <strong>État de la connexion</strong>
        <span>{connectionState}</span>
      </div>
      <dl className="status-grid">
        <div>
          <dt>URL API</dt>
          <dd>{config.apiUrl}</dd>
        </div>
        <div>
          <dt>Service backend</dt>
          <dd>{healthSnapshot?.service ?? 'non chargé'}</dd>
        </div>
        <div>
          <dt>État backend</dt>
          <dd>{healthSnapshot?.status ?? 'inconnu'}</dd>
        </div>
        <div>
          <dt>Dernière erreur</dt>
          <dd>{errorMessage ?? 'aucune'}</dd>
        </div>
      </dl>
    </section>
  );
}
