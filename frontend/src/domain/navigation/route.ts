export type RoutePath =
  | '/'
  | '/admin'
  | '/admin/users'
  | '/agent'
  | '/agent/incidents/new'
  | '/agent/requests/new'
  | '/agent/archives'
  | '/agent/assigned-to-me'
  | '/agent/my-tickets'
  | '/agent/unassigned-tickets'
  | '/agent/tickets'
  | '/reports'
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
    title: 'Créer un incident',
  },
  {
    description: 'Creation d un ticket de type demande.',
    path: '/agent/requests/new',
    title: 'Créer une demande',
  },
  {
    description: 'Liste, recherche et detail des tickets existants.',
    path: '/agent/tickets',
    title: 'Liste des tickets',
  },
  {
    description: 'Liste des tickets crees par l utilisateur connecte.',
    path: '/agent/my-tickets',
    title: 'Mes tickets crÃ©Ã©s',
  },
  {
    description: 'Liste des tickets sans technicien assigne.',
    path: '/agent/unassigned-tickets',
    title: 'Non assignés',
  },
  {
    description: 'Liste des tickets assignes a l utilisateur connecte.',
    path: '/agent/assigned-to-me',
    title: 'Assignés à moi',
  },
  {
    description: 'Liste des tickets archives.',
    path: '/agent/archives',
    title: 'Archives',
  },
  {
    description: 'Tableau de bord de suivi des tickets et KPI SLA.',
    path: '/reports',
    title: 'Tableau de bord',
  },
  {
    description: 'Administration des referentiels et des parametres metier.',
    path: '/admin',
    title: 'Administration',
  },
  {
    description: 'Liste des utilisateurs et de leurs roles.',
    path: '/admin/users',
    title: 'Utilisateurs',
  },
  {
    description: 'Connexion a la plateforme.',
    path: '/login',
    title: 'Connexion',
  },
];
