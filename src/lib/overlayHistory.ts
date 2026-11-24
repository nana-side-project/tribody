// Browser / Android Back closes an open overlay (bottom sheet, body-map magnifier) before it leaves the page.
//
// Each open overlay adds one history entry: the same URL and the router's state (same location key and index, so
// react-router treats pops between these entries as no-ops) plus `tbOverlay`, the chain of overlay ids open at that
// entry. Back pops the entry → the overlay whose id is no longer in the chain closes.
//
// An overlay closed any other way (its close button, a pick, a tap outside) removes its own entry with
// history.back(). The browser runs that asynchronously, and until its popstate arrives:
//  - a new overlay waits before adding its entry (otherwise the pending back would remove the new one),
//  - trusted clicks are held and replayed right after. A tab, link or view switch tapped just after the tap that
//    closed the magnifier would otherwise push / replace on the entry being removed, and the pending back would
//    then undo that navigation,
//  - code that navigates right after closing an overlay wraps the navigation in afterOverlayClose().

interface Live {
  id: string;
  onBack: () => void;
}

/** open overlays with an entry in the history, bottom → top */
const live: Live[] = [];
let pendingBack: Promise<void> | null = null;
let seq = 0;
/** ids are unique per page load, so an entry left over from before a reload never matches a new overlay */
const PAGE = Math.random().toString(36).slice(2, 8);
let listening = false;

function chainOf(state: unknown): string[] {
  const c = (state as { tbOverlay?: unknown } | null)?.tbOverlay;
  return Array.isArray(c) ? c.filter((x): x is string => typeof x === 'string') : [];
}

function onPop(e: PopStateEvent) {
  const chain = chainOf(e.state);
  // close every overlay whose entry has been popped (topmost first)
  for (let i = live.length - 1; i >= 0; i--) {
    const en = live[i];
    if (chain.includes(en.id)) continue;
    live.splice(i, 1);
    en.onBack();
  }
  // Landed on the entry of an overlay that is no longer open (Forward after Back closed it): it shows the same
  // page, so step over it instead of making the next Back look like it did nothing.
  if (!pendingBack && chain.some((id) => !live.some((l) => l.id === id))) void historyBack();
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', onPop);
}

/** Hold trusted clicks until `p` settles, then replay them on the same element (if it is still there). */
function holdClicks(p: Promise<void>) {
  const held: (() => void)[] = [];
  const onClick = (e: MouseEvent) => {
    if (!e.isTrusted) return; // a replay
    e.preventDefault();
    e.stopImmediatePropagation();
    const target = e.target;
    const init: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: e.detail,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: e.button,
      buttons: e.buttons,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    };
    held.push(() => {
      // gone (e.g. the magnifier's own button) or behind a sheet that opened meanwhile: drop it
      if (!(target instanceof Element) || !target.isConnected || target.closest('[inert]')) return;
      target.dispatchEvent(new MouseEvent('click', init));
    });
  };
  window.addEventListener('click', onClick, true);
  void p.then(() => {
    window.removeEventListener('click', onClick, true);
    // after the router has rendered the popped location (React flushes popstate updates in a microtask)
    if (held.length) setTimeout(() => held.forEach((f) => f()), 0);
  });
}

function historyBack(): Promise<void> {
  const p = new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('popstate', finish);
      clearTimeout(t);
      resolve();
    };
    window.addEventListener('popstate', finish);
    const t = setTimeout(finish, 500); // safety net (history unavailable / never answered)
    try {
      window.history.back();
    } catch {
      finish();
    }
  });
  pendingBack = p;
  holdClicks(p);
  void p.then(() => {
    if (pendingBack === p) pendingBack = null;
  });
  return p;
}

/**
 * Give an overlay that is opening now its own history entry; `onBack` runs when Back (or a jump further back)
 * pops it. Call the returned function when the overlay closes for any reason (an effect cleanup): if its entry is
 * still the current one, it is removed. Without a usable History API this does nothing (Back then leaves the page).
 */
export function openOverlayEntry(onBack: () => void): () => void {
  const en: Live = { id: `${PAGE}-${++seq}`, onBack };
  let pushed = false;
  let released = false;
  const push = () => {
    if (released) return;
    try {
      const st = (window.history.state ?? {}) as Record<string, unknown>;
      const chain = chainOf(st).filter((id) => live.some((l) => l.id === id));
      window.history.pushState({ ...st, tbOverlay: [...chain, en.id] }, '');
      pushed = true;
      live.push(en);
      listen();
    } catch {
      /* history unavailable (sandboxed preview) — Back just won't close the overlay */
    }
  };
  if (pendingBack) void pendingBack.then(push);
  else push();
  return () => {
    if (released) return;
    released = true;
    const i = live.indexOf(en);
    if (i < 0) return; // never pushed, or already popped by Back
    live.splice(i, 1);
    if (!pushed) return;
    try {
      const chain = chainOf(window.history.state);
      if (chain[chain.length - 1] === en.id) void historyBack();
    } catch {
      /* ignore */
    }
  };
}

/** Run `fn` once a just-closed overlay has removed its history entry (e.g. navigate from a sheet button). */
export function afterOverlayClose(fn: () => void) {
  if (pendingBack) void pendingBack.then(() => setTimeout(fn, 0));
  else setTimeout(fn, 0);
}

// A reload while an overlay was open leaves the page on that overlay's entry: drop the marker (the entry then
// behaves like the page's own one).
try {
  if (chainOf(window.history.state).length) {
    const { tbOverlay: _drop, ...rest } = window.history.state as Record<string, unknown>;
    window.history.replaceState(rest, '');
  }
} catch {
  /* ignore */
}
