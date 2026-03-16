import { useEffect, useState } from 'react';

function getCurrentPath(): string {
  return window.location.pathname || '/';
}

export function navigateTo(pathname: string): void {
  if (window.location.pathname === pathname) {
    return;
  }

  window.history.pushState({}, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useBrowserPath(): string {
  const [pathname, setPathname] = useState(getCurrentPath);

  useEffect(() => {
    const syncPath = (): void => {
      setPathname(getCurrentPath());
    };

    window.addEventListener('popstate', syncPath);

    return (): void => {
      window.removeEventListener('popstate', syncPath);
    };
  }, []);

  return pathname;
}
