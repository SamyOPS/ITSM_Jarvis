export type RoutePath =
  | '/'
  | '/admin/groups'
  | '/admin/license'
  | '/admin/trash'
  | '/admin/users'
  | '/agent'
  | '/agent/incidents/new'
  | '/agent/requests/new'
  | '/agent/archives'
  | '/agent/my-tickets'
  | '/agent/tickets'
  | '/knowledge/articles'
  | '/parc/my-equipment'
  | '/parc/cis/new'
  | '/parc/cis'
  | '/preferences'
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
    title: 'Mes tickets demandés',
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
    description: 'Preferences visuelles et notifications du compte.',
    path: '/preferences',
    title: 'Preferences',
  },
  {
    description:
      'Articles d aide et procedures pour resoudre les demandes courantes.',
    path: '/knowledge/articles',
    title: 'Base de connaissances',
  },
  {
    description: 'Liste des equipements assignes a l utilisateur connecte.',
    path: '/parc/my-equipment',
    title: 'Mon equipement',
  },
  {
    description: 'Gestion des elements du parc informatique.',
    path: '/parc/cis',
    title: 'Liste des equipements',
  },
  {
    description: 'Creation d un nouvel equipement du parc informatique.',
    path: '/parc/cis/new',
    title: 'Ajouter un equipement',
  },
  {
    description: 'Gestion de la limite des utilisateurs facturables.',
    path: '/admin/license',
    title: 'Licence',
  },
  {
    description: 'Liste des utilisateurs et de leurs roles.',
    path: '/admin/users',
    title: 'Utilisateurs',
  },
  {
    description: 'Corbeille reservee aux comptes supprimes.',
    path: '/admin/trash',
    title: 'Corbeille',
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
