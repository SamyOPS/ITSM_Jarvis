export type RoutePath =
  | '/'
  | '/admin'
  | '/agent'
  | '/agent/incidents/new'
  | '/agent/requests/new'
  | '/agent/tickets'
  | '/login';

export interface RouteDefinition {
  description: string;
  path: RoutePath;
  title: string;
}

export const ROUTES: RouteDefinition[] = [
  {
    description: 'Vue d ensemble du socle frontend et de la session active.',
    path: '/',
    title: 'Accueil',
  },
  {
    description:
      'Espace de travail ticketing reserve aux utilisateurs authentifies.',
    path: '/agent',
    title: 'Tickets',
  },
  {
    description: 'Creation d un ticket de type incident.',
    path: '/agent/incidents/new',
    title: 'Creer un incident',
  },
  {
    description: 'Creation d un ticket de type demande.',
    path: '/agent/requests/new',
    title: 'Creer une demande',
  },
  {
    description: 'Liste, recherche et detail des tickets existants.',
    path: '/agent/tickets',
    title: 'Liste des tickets',
  },
  {
    description: 'Administration des referentiels et des parametres metier.',
    path: '/admin',
    title: 'Administration',
  },
  {
    description: 'Connexion a la plateforme.',
    path: '/login',
    title: 'Connexion',
  },
];
