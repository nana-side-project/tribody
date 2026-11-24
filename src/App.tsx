import { lazy, useEffect, type ComponentType } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import HomePage from './pages/HomePage';
import { useTheme } from './lib/useTheme';

type PageModule = { default: ComponentType };

/**
 * A route page split into its own chunk. `preload()` fetches it ahead of time (idle time, a press on a link to it);
 * once it has arrived, rendering the route does not suspend at all: the lazy wrapper gets a thenable that resolves
 * synchronously, so a tap on an already-fetched page never shows the loading fallback.
 */
function lazyPage(load: () => Promise<PageModule>) {
  let loaded: PageModule | null = null;
  let pending: Promise<PageModule> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (m) => (loaded = m),
      (e: unknown) => {
        pending = null; // offline / flaky network: try again next time
        throw e;
      },
    ));
  const Page = lazy(() =>
    loaded ? ({ then: (ok: (m: PageModule) => void) => ok(loaded as PageModule) } as unknown as Promise<PageModule>) : preload(),
  );
  return Object.assign(Page, { preload });
}

const RegionPage = lazyPage(() => import('./pages/RegionPage'));
const ConditionPage = lazyPage(() => import('./pages/ConditionPage'));
const MusclesPage = lazyPage(() => import('./pages/MusclesPage'));
const MusclePage = lazyPage(() => import('./pages/MusclePage'));
const ExercisesPage = lazyPage(() => import('./pages/ExercisesPage'));
const ExercisePage = lazyPage(() => import('./pages/ExercisePage'));
const MenuPage = lazyPage(() => import('./pages/MenuPage'));
const GuidesPage = lazyPage(() => import('./pages/GuidesPage'));
const GuidePage = lazyPage(() => import('./pages/GuidePage'));
const AboutPage = lazyPage(() => import('./pages/AboutPage'));
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'));

/** First path segment → page, for prefetching on a press on a link. */
const BY_SEGMENT: Record<string, { preload: () => Promise<unknown> }> = {
  region: RegionPage,
  condition: ConditionPage,
  muscles: MusclesPage,
  muscle: MusclePage,
  exercises: ExercisesPage,
  exercise: ExercisePage,
  menu: MenuPage,
  guides: GuidesPage,
  guide: GuidePage,
  about: AboutPage,
};
function pageFor(seg: string) {
  return Object.prototype.hasOwnProperty.call(BY_SEGMENT, seg) ? BY_SEGMENT[seg] : undefined;
}

/**
 * The page the app opens on (a shared link, a reload, an installed app reopened on a page): main.tsx fetches its
 * code before the first render, so that render is the page itself and not the blank fallback (which React would
 * also keep on screen for at least 300 ms once shown). Home is in the main chunk: nothing to fetch.
 */
export function preloadInitialRoute(): Promise<unknown> {
  let seg = '';
  try {
    seg = window.location.hash.replace(/^#\/?/, '').split(/[/?#]/)[0] ?? '';
  } catch {
    /* ignore */
  }
  if (!seg) return Promise.resolve();
  return (pageFor(seg) ?? NotFoundPage).preload();
}

/** Idle-time prefetch order: where people usually go next from home and the tabs. */
const IDLE_ORDER = [ConditionPage, RegionPage, ExercisePage, MusclePage, ExercisesPage, MusclesPage, MenuPage, GuidesPage, GuidePage, AboutPage, NotFoundPage];

function useRoutePrefetch() {
  useEffect(() => {
    // a press on a link starts loading its page ~100 ms before the click navigates
    const onDown = (e: PointerEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#/"]');
      const seg = a?.getAttribute('href')?.slice(2).split(/[/?#]/)[0] ?? '';
      void pageFor(seg)
        ?.preload()
        .catch(() => {});
    };
    document.addEventListener('pointerdown', onDown, { capture: true, passive: true });

    // then everything else, one page per idle period (not on data-saver connections)
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let id = 0;
    let stopped = false;
    const queue = conn?.saveData ? [] : [...IDLE_ORDER];
    const next = () => {
      if (stopped) return;
      const page = queue.shift();
      if (!page) return;
      void page
        .preload()
        .catch(() => {})
        .finally(schedule);
    };
    const schedule = () => {
      if (stopped || !queue.length) return;
      id = w.requestIdleCallback ? w.requestIdleCallback(next, { timeout: 4000 }) : window.setTimeout(next, 1200);
    };
    // let the first page settle (and its own 3D / image work start) before fetching others
    const start = window.setTimeout(schedule, 1500);
    return () => {
      stopped = true;
      document.removeEventListener('pointerdown', onDown, { capture: true });
      clearTimeout(start);
      if (w.cancelIdleCallback) w.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);
}

export default function App() {
  useTheme(); // keep <html data-theme> in sync with the saved preference
  useRoutePrefetch();
  // useTransitions={false}: render each navigation at once instead of inside React.startTransition. In a transition
  // React builds the next page in 5 ms slices while the old page stays mounted, and its playing 3D viewer drew a
  // frame between every slice (16–33 ms on phones), which stretched leaving an exercise / muscle page to seconds.
  return (
    <HashRouter useTransitions={false}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="region/:id" element={<RegionPage />} />
          <Route path="condition/:id" element={<ConditionPage />} />
          <Route path="muscles" element={<MusclesPage />} />
          <Route path="muscle/:id" element={<MusclePage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exercise/:id" element={<ExercisePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="guides" element={<GuidesPage />} />
          <Route path="guide/:id" element={<GuidePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
