import {
  AlertTriangle,
  Archive,
  BarChart3,
  BookOpen,
  BadgeEuro,
  FileText,
  LayoutDashboard,
  ListChecks,
  Monitor,
  Plus,
  SlidersHorizontal,
  Ticket,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AuthSessionSnapshot } from '../../domain/auth/auth-session';
import type { RoutePath } from '../../domain/navigation/route';
import { ROUTES } from '../../domain/navigation/route';
import { navigateTo } from '../../infrastructure/routing/browser-router';

export const administrationRouteOrder: RoutePath[] = [
  '/admin/users',
  '/admin/groups',
  '/admin/license',
  '/admin/trash',
  '/agent/archives',
];

export const routeIcons: Partial<Record<RoutePath, LucideIcon>> = {
  '/': LayoutDashboard,
  '/admin/groups': Users,
  '/admin/license': BadgeEuro,
  '/admin/trash': Trash2,
  '/admin/users': User,
  '/agent': LayoutDashboard,
  '/agent/archives': Archive,
  '/agent/incidents/new': AlertTriangle,
  '/agent/my-tickets': Ticket,
  '/agent/requests/new': FileText,
  '/agent/tickets': ListChecks,
  '/knowledge/articles': BookOpen,
  '/parc/my-equipment': Monitor,
  '/parc/cis/new': Plus,
  '/parc/cis': Monitor,
  '/preferences': SlidersHorizontal,
  '/profile': User,
  '/reports': BarChart3,
};

export function isRouteActive(routePath: RoutePath, pathname: string): boolean {
  if (routePath === '/agent/tickets') {
    return (
      pathname === '/agent/tickets' || pathname.startsWith('/agent/tickets/')
    );
  }

  if (routePath === '/agent/archives') {
    return (
      pathname === '/agent/archives' || pathname.startsWith('/agent/archives/')
    );
  }

  if (routePath === '/agent') {
    return pathname === '/agent';
  }

  if (routePath === '/parc/cis') {
    return (
      pathname === '/parc/cis' ||
      (pathname.startsWith('/parc/cis/') && pathname !== '/parc/cis/new')
    );
  }

  return pathname === routePath;
}

export function getRouteDisplayTitle(
  routePath: RoutePath,
  routeTitle: string,
  session: AuthSessionSnapshot | null,
): string {
  if (routePath === '/agent/tickets' && session?.user.role === 'DEMANDEUR') {
    return 'Mes tickets demandés';
  }

  if (routePath === '/agent/tickets') {
    return 'Liste des tickets';
  }

  return routeTitle;
}

export function getUserInitials(session: AuthSessionSnapshot | null): string {
  if (!session) {
    return 'VI';
  }

  const initials = [session.user.firstName, session.user.lastName]
    .filter(Boolean)
    .map((value) => value!.trim().charAt(0).toUpperCase())
    .join('');

  if (initials) {
    return initials.slice(0, 2);
  }

  return session.user.email.slice(0, 2).toUpperCase();
}

export function getUserDisplayName(
  session: AuthSessionSnapshot | null,
): string {
  if (!session) {
    return 'Session locale';
  }

  const fullName = [session.user.firstName, session.user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || session.user.email;
}

export function formatNotificationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return new Intl.DateTimeFormat('fr-FR', {
    day: isToday ? undefined : '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: isToday ? undefined : 'short',
  }).format(date);
}

export function navigateToHomeDashboard(
  homeRoute: RoutePath,
  pathname: string,
): void {
  if (homeRoute !== '/reports') {
    navigateTo(homeRoute);

    return;
  }

  if (pathname === '/reports') {
    window.dispatchEvent(new CustomEvent('reports:show-dashboard'));

    return;
  }

  navigateTo('/reports');
}

export function getCurrentBreadcrumbRoute(
  pathname: string,
  session: AuthSessionSnapshot | null,
): { icon: LucideIcon; title: string } {
  const exactRoute = ROUTES.find((route) => route.path === pathname);

  if (exactRoute) {
    return {
      icon: routeIcons[exactRoute.path] ?? FileText,
      title:
        exactRoute.path === '/agent/tickets'
          ? 'Tous les tickets'
          : getRouteDisplayTitle(exactRoute.path, exactRoute.title, session),
    };
  }

  if (pathname.startsWith('/agent/tickets/')) {
    return {
      icon: Ticket,
      title: 'Ticket',
    };
  }

  if (pathname.startsWith('/admin/users/')) {
    return {
      icon: User,
      title: 'Utilisateur',
    };
  }

  if (pathname.startsWith('/admin/groups/')) {
    return {
      icon: Users,
      title: 'Groupe',
    };
  }

  return {
    icon: LayoutDashboard,
    title: 'Tableau de bord',
  };
}
