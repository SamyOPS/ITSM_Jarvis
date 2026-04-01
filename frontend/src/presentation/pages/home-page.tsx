export function HomePage() {
  return (
    <section className="panel">
      <span className="panel-tag">P1.4</span>
      <h2>Session frontend opérationnelle</h2>
      <p>
        Le frontend gère déjà la connexion, la fermeture de session et la
        restauration locale de l’utilisateur connecté au-dessus de Supabase et
        du backend NestJS.
      </p>
      <ul className="checklist">
        <li>Connexion disponible via Supabase avec mot de passe</li>
        <li>Session locale restaurée au rechargement</li>
        <li>Déconnexion locale et revalidation du profil backend</li>
      </ul>
    </section>
  );
}
