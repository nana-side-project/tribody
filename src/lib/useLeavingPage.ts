// "This page is being left": true from the moment the URL path changes until the route commits.
//
// react-router's HashRouter renders the next page inside React.startTransition: React builds it in ~5 ms slices
// while the old page stays mounted, and between every slice the old page's playing 3D viewer draws a frame
// (16–33 ms on phones, far more on slow GPUs). That stretched navigations away from an exercise / muscle page to
// seconds. A viewer that sees this hook turn true unmounts at once: the update comes from a click / popstate
// listener, so React commits it urgently (before the transition), and the transition then renders without a
// competing render loop.
import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function decoded(p: string): string {
  try {
    return decodeURI(p);
  } catch {
    return p;
  }
}

/** Path of the current hash URL: '#/exercise/ex-a?from=b' → '/exercise/ex-a'. */
function urlPath(): string {
  return decoded(window.location.hash.replace(/^#/, '').split(/[?#]/)[0] || '/');
}

export function useLeavingPage(): boolean {
  const { pathname } = useLocation();
  /** the committed path the URL moved away from (stays put if the component lives on under a new path) */
  const [leftFrom, setLeftFrom] = useState<string | null>(null);
  useLayoutEffect(() => {
    const check = () => {
      if (urlPath() !== decoded(pathname)) setLeftFrom(pathname);
    };
    // A link tap / navigate() updates the URL synchronously inside the click (pushState): the document-level
    // listener runs after React's own handler. Back / forward / a typed URL arrive as popstate / hashchange.
    document.addEventListener('click', check);
    window.addEventListener('popstate', check);
    window.addEventListener('hashchange', check);
    return () => {
      document.removeEventListener('click', check);
      window.removeEventListener('popstate', check);
      window.removeEventListener('hashchange', check);
    };
  }, [pathname]);
  return leftFrom === pathname;
}
