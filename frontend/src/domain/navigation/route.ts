export type RoutePath =
  | '/'
  | '/admin'
  | '/agent'
  | '/auth'
  | '/login'
  | '/status';

export interface RouteDefinition {
  description: string;
  path: RoutePath;
  title: string;
}

export const ROUTES: RouteDefinition[] = [
  {
    description: 'Vue d’ensemble du socle frontend et de la session active.',
    path: '/',
    title: 'Accueil',
  },
  {
    description:
      'Contrôle de l’authentification Supabase et des rôles applicatifs.',
    path: '/auth',
    title: 'Sécurité',
  },
  {
    description:
      'Espace de travail ticketing réservé aux utilisateurs authentifiés.',
    path: '/agent',
    title: 'Tickets',
  },
  {
    description: 'Administration des référentiels et des paramètres métier.',
    path: '/admin',
    title: 'Administration',
  },
  {
    description: 'Connexion, déconnexion et restauration de session.',
    path: '/login',
    title: 'Connexion',
  },
  {
    description: 'Vérification technique du lien entre frontend et backend.',
    path: '/status',
    title: 'Supervision',
  },
];
