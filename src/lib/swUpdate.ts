// Service-worker updates (static build only; main.tsx registers public/sw.js on https top-level pages, never in the
// single-file build). A new deploy installs its worker next to the running one; that worker then waits until no page
// of the old version is open (public/sw.js). While it waits, the app offers 「新しいバージョンがあります」 [更新]: the
// button asks the waiting worker to take over (SKIP_WAITING) and the page reloads once it controls the page, so the
// page and its chunks come from the same version. Nothing is offered on the first install (no older version to leave).
import { useSyncExternalStore } from 'react';

let waiting: ServiceWorker | null = null;
let dismissed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function offer(w: ServiceWorker) {
  // first install: the page is not controlled by any worker yet, there is nothing to update from
  if (!navigator.serviceWorker.controller) return;
  waiting = w;
  emit();
}

/** Watch a registration for a new version that is installed and waiting. */
export function watchServiceWorker(reg: ServiceWorkerRegistration) {
  try {
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed') offer(w);
      });
    });
    // an installed app can stay open for days: look for a new deploy when it comes back to the foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  } catch {
    /* updates are optional */
  }
}

/** 更新: let the waiting worker take over, then reload into the new version. */
export function applyUpdate() {
  const w = waiting;
  if (!w) return;
  let reloading = false;
  try {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    w.postMessage({ type: 'SKIP_WAITING' });
  } catch {
    location.reload();
  }
}

/** Hide the offer for this page view (the new version still starts once every old page is closed). */
export function dismissUpdate() {
  dismissed = true;
  emit();
}

export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => !!waiting && !dismissed,
    () => false,
  );
}
