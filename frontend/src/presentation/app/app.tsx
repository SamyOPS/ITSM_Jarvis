import { resolveRoute } from '../../application/routing/route-resolver';
import { useBrowserPath } from '../../infrastructure/routing/browser-router';
import { AppShell } from './app-shell';
import { AuthPage } from '../pages/auth-page';
import { HomePage } from '../pages/home-page';
import { NotFoundPage } from '../pages/not-found-page';
import { StatusPage } from '../pages/status-page';

function renderPage(pathname: string) {
  const route = resolveRoute(pathname);

  if (!route) {
    return <NotFoundPage />;
  }

  switch (route.path) {
    case '/':
      return <HomePage />;
    case '/auth':
      return <AuthPage />;
    case '/status':
      return <StatusPage />;
    default:
      return <NotFoundPage />;
  }
}

export function App() {
  const pathname = useBrowserPath();

  return <AppShell>{renderPage(pathname)}</AppShell>;
}
