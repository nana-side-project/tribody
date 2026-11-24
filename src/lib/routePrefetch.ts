// Route-chunk prefetching shared by App (registers the lazy pages) and pages that know where the user goes next
// (the home sheet → a condition page). Kept out of App.tsx so pages can use it without a circular import.

export interface RouteLoader {
  preload: () => Promise<unknown>;
}

const routes = new Map<string, RouteLoader>();

/** First path segment ('condition', 'muscle', …) → its lazy page. Called once by App. */
export function registerRoutes(map: Record<string, RouteLoader>) {
  for (const [seg, page] of Object.entries(map)) routes.set(seg, page);
}

/** First path segment of an in-app href ('#/condition/x?…' or '/condition/x'). */
export function routeSegment(href: string): string {
  return href.replace(/^#?\/?/, '').split(/[/?#]/)[0] ?? '';
}

/** Start loading a route's code now (no-op for unknown segments; failures are retried on the next call). */
export function prefetchRoute(seg: string) {
  void routes
    .get(seg)
    ?.preload()
    .catch(() => {});
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Load a route's code once the page is idle, `delay` ms from now (e.g. while the user reads a sheet that leads to it).
 * Evaluating a page chunk can block the main thread for a while on a phone, so it is never done in the same task as
 * a tap. Returns a cancel function.
 */
export function prefetchRouteWhenIdle(seg: string, delay = 400): () => void {
  const w = window as IdleWindow;
  let idle = 0;
  const t = window.setTimeout(() => {
    idle = w.requestIdleCallback ? w.requestIdleCallback(() => prefetchRoute(seg), { timeout: 2000 }) : window.setTimeout(() => prefetchRoute(seg), 50);
  }, delay);
  return () => {
    clearTimeout(t);
    if (idle) {
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      else clearTimeout(idle);
    }
  };
}
