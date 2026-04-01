type AccessDeniedPageProps = {
  role: string;
};

export function AccessDeniedPage({ role }: AccessDeniedPageProps) {
  return (
    <section className="panel">
      <span className="panel-tag">P1.5</span>
      <h2>Accès refusé</h2>
      <p>
        Votre session est authentifiée, mais cette route n’est pas disponible
        pour le rôle actuellement associé à votre compte.
      </p>
      <dl className="status-grid">
        <div>
          <dt>Rôle courant</dt>
          <dd>{role}</dd>
        </div>
        <div>
          <dt>Accès attendu</dt>
          <dd>AGENT ou ADMIN selon la zone protégée</dd>
        </div>
      </dl>
    </section>
  );
}
