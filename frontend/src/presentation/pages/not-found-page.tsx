import { navigateTo } from '../../infrastructure/routing/browser-router';

export function NotFoundPage() {
  return (
    <section className="panel">
      <span className="panel-tag">404</span>
      <h2>Page introuvable</h2>
      <p>
        La route demandée n’est pas enregistrée dans le shell frontend actuel.
      </p>
      <button
        className="primary-button"
        onClick={() => navigateTo('/')}
        type="button"
      >
        Revenir à l’accueil
      </button>
    </section>
  );
}
