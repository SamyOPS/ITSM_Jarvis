export type RoutePath =
  | '/'
  | '/admin/groups'
  | '/admin/users'
  | '/agent'
  | '/agent/incidents/new'
  | '/agent/requests/new'
  | '/agent/archives'
  | '/agent/my-tickets'
  | '/agent/tickets'
  | '/knowledge/articles'
  | '/parc/ci-types'
  | '/parc/cis'
  | '/reports'
  | '/login'
  | '/register'
  | '/auth/reset-password';

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
    title: 'Mes tickets créés',
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
    description:
      'Articles d aide et procedures pour resoudre les demandes courantes.',
    path: '/knowledge/articles',
    title: 'Base de connaissances',
  },
  {
    description: 'Gestion des types de CI du parc informatique.',
    path: '/parc/ci-types',
    title: 'Types de CI',
  },
  {
    description: 'Gestion des elements du parc informatique.',
    path: '/parc/cis',
    title: 'Equipements',
  },
  {
    description: 'Liste des utilisateurs et de leurs roles.',
    path: '/admin/users',
    title: 'Utilisateurs',
  },
  {
    description: 'Liste et gestion des groupes de support.',
    path: '/admin/groups',
    title: 'Groupes',
  },
  {
    description: 'Connexion a la plateforme.',
    path: '/login',
    title: 'Connexion',
  },
  {
    description: 'Creation d un compte demandeur.',
    path: '/register',
    title: 'Inscription',
  },
  {
    description: 'Definition d un nouveau mot de passe.',
    path: '/auth/reset-password',
    title: 'Nouveau mot de passe',
  },
];
