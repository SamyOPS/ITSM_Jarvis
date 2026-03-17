import { useEffect, useState } from 'react';

import { apiClient, type HealthCheckResponse } from '../services/api/client';

export function App() {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const response = await apiClient.getHealth();

        if (isMounted) {
          setData(response);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error ? loadError.message : 'Unknown error',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="app-card">
        <p className="eyebrow">TikIA</p>
        <h1>Hello API check</h1>
        <p className="copy">
          Minimal frontend validation for local development and CI.
        </p>
        <dl className="status-list">
          <div className="status-row">
            <dt>Backend URL</dt>
            <dd>{apiClient.baseUrl}</dd>
          </div>
          <div className="status-row">
            <dt>Request state</dt>
            <dd>
              {isLoading && 'Loading'}
              {!isLoading && error && 'Error'}
              {!isLoading && !error && 'Success'}
            </dd>
          </div>
          {data && (
            <>
              <div className="status-row">
                <dt>Status</dt>
                <dd>{data.status}</dd>
              </div>
              <div className="status-row">
                <dt>Service</dt>
                <dd>{data.service}</dd>
              </div>
              <div className="status-row">
                <dt>Message</dt>
                <dd>{data.message}</dd>
              </div>
            </>
          )}
          {error && (
            <div className="status-row status-row-error">
              <dt>Error</dt>
              <dd>{error}</dd>
            </div>
          )}
        </dl>
      </section>
    </main>
  );
}
