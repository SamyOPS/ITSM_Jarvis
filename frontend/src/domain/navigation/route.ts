export type RoutePath = '/' | '/status';

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
    description: 'Technical route reserved for integration checks.',
    path: '/status',
    title: 'Status',
  },
];
