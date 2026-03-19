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
    description: 'Landing page for the frontend technical base.',
    path: '/',
    title: 'Home',
  },
  {
    description: 'Supabase auth and roles readiness screen.',
    path: '/auth',
    title: 'Auth',
  },
  {
    description: 'Protected route reserved to agents and admins.',
    path: '/agent',
    title: 'Agent',
  },
  {
    description: 'Protected route reserved to admins.',
    path: '/admin',
    title: 'Admin',
  },
  {
    description: 'Login and session management screen.',
    path: '/login',
    title: 'Login',
  },
  {
    description: 'Technical route reserved for integration checks.',
    path: '/status',
    title: 'Status',
  },
];
