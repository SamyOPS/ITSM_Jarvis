import { ROUTES } from '../../domain/navigation/route';
import { navigateTo } from '../../infrastructure/routing/browser-router';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">TikIA</p>
          <h1>Frontend Technical Base</h1>
          <p className="lead">
            Modular React structure with minimal routing, ready for the next
            product slices.
          </p>
        </div>

        <nav aria-label="Primary" className="app-nav">
          {ROUTES.map((route) => (
            <button
              className="nav-link"
              key={route.path}
              onClick={() => navigateTo(route.path)}
              type="button"
            >
              {route.title}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}
