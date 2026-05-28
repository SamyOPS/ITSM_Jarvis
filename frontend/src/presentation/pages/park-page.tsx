import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';

type ParkSection = 'CI_TYPES' | 'CIS';

type ParkPageProps = {
  section: ParkSection;
  session: AuthSessionSnapshot;
};

const PARK_SECTION_COPY: Record<
  ParkSection,
  { description: string; title: string }
> = {
  CI_TYPES: {
    description:
      'La refonte du parc est en cours. Cette section servira a structurer les types de materiel et d equipements.',
    title: 'Types de CI',
  },
  CIS: {
    description:
      'La refonte du parc est en cours. Cette section servira a gerer les equipements, leurs statuts et leurs affectations.',
    title: 'Equipements',
  },
};

export function ParkPage({ section, session }: ParkPageProps) {
  const copy = PARK_SECTION_COPY[section];

  return (
    <section className="reports-page">
      <div className="page-header">
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>

      <section className="reports-dashboard-panel">
        <header className="reports-dashboard-panel-header">
          <h3>Refonte du parc</h3>
        </header>
        <div className="reports-chart-empty">
          <p>
            Cette nouvelle page remplace l ancien ecran admin/referentiels pour
            le parc.
          </p>
          <p>
            Compte connecte : <strong>{session.user.email}</strong>
          </p>
        </div>
      </section>
    </section>
  );
}
