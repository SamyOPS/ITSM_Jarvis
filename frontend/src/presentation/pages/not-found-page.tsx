import { navigateTo } from '../../infrastructure/routing/browser-router';

export function NotFoundPage() {
  return (
    <section className="panel">
      <span className="panel-tag">404</span>
      <h2>Route not found</h2>
      <p>
        The requested frontend route is not registered in the current shell.
      </p>
      <button
        className="primary-button"
        onClick={() => navigateTo('/')}
        type="button"
      >
        Back to home
      </button>
    </section>
  );
}
