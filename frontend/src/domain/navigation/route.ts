export type RoutePath = '/' | '/auth' | '/status';

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
    description: 'Technical route reserved for integration checks.',
    path: '/status',
    title: 'Status',
  },
];
