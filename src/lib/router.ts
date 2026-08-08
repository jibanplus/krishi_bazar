import { useEffect, useState } from 'react';

export type Route =
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'forgot' }
  | { name: 'verify' }
  | { name: 'dashboard' }
  | { name: 'market' }
  | { name: 'deposit' }
  | { name: 'withdraw' }
  | { name: 'referrals' }
  | { name: 'profile' }
  | { name: 'history' }
  | { name: 'admin' };

export function parseHash(): Route {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  const parts = h.split('?')[0];
  switch (parts) {
    case 'login': return { name: 'login' };
    case 'signup': return { name: 'signup' };
    case 'forgot': return { name: 'forgot' };
    case 'verify': return { name: 'verify' };
    case 'dashboard': return { name: 'dashboard' };
    case 'market': return { name: 'market' };
    case 'deposit': return { name: 'deposit' };
    case 'withdraw': return { name: 'withdraw' };
    case 'referrals': return { name: 'referrals' };
    case 'profile': return { name: 'profile' };
    case 'history': return { name: 'history' };
    case 'admin': return { name: 'admin' };
    default: return { name: 'dashboard' };
  }
}

export function navigate(route: string) {
  window.location.hash = '#/' + route;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash());
  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}
