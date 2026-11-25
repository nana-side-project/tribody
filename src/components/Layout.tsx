// App shell: page wrapper (top bar on detail pages), bottom tab bar, scroll management, toasts.
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { dismissToast, useToast } from '../lib/toast';
import { applyUpdate, dismissUpdate, useUpdateAvailable } from '../lib/swUpdate';
import { ErrorBoundary } from './ErrorBoundary';
import { AppMark } from './Logo';
import { IconBack, IconBody, IconBook, IconCheck, IconChecklist, IconClose, IconDownload, IconDumbbell, IconInfo, IconMuscle } from './icons';

/** `short`: shown on very narrow screens (< 340 px), where 「エクササイズ」「マイメニュー」 would run together. */
const TABS: { to: string; label: string; short?: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; match: string[] }[] = [
  { to: '/', label: 'からだ', Icon: IconBody, match: ['/', '/region', '/condition'] },
  { to: '/muscles', label: '筋肉', Icon: IconMuscle, match: ['/muscles', '/muscle'] },
  { to: '/exercises', label: 'エクササイズ', short: '運動', Icon: IconDumbbell, match: ['/exercises', '/exercise'] },
  { to: '/menu', label: 'マイメニュー', short: 'メニュー', Icon: IconChecklist, match: ['/menu'] },
  { to: '/guides', label: 'ガイド', Icon: IconBook, match: ['/guides', '/guide', '/about'] },
];

function activeTab(pathname: string): string | null {
  const seg = '/' + (pathname.split('/')[1] ?? '');
  for (const t of TABS) if (t.match.includes(seg)) return t.to;
  return null;
}

function TabBar() {
  const { pathname } = useLocation();
  const active = activeTab(pathname);
  return (
    <nav className="tabbar" aria-label="メインメニュー">
      <div className="tabbar__inner">
        {TABS.map(({ to, label, short, Icon }) => {
          const on = active === to;
          return (
            <Link
              key={to}
              to={to}
              className={`tab${on ? ' is-active' : ''}`}
              aria-current={on ? 'page' : undefined}
              aria-label={label}
            >
              <span className="tab__icon">
                <Icon />
              </span>
              {short ? (
                <>
                  <span className="tab__full" aria-hidden="true">
                    {label}
                  </span>
                  <span className="tab__short" aria-hidden="true">
                    {short}
                  </span>
                </>
              ) : (
                <span className="tab__label" aria-hidden="true">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Scroll to top on new pages, restore position on back/forward, leave alone on replace (filters/tabs). */
function ScrollManager() {
  const loc = useLocation();
  const navType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  // A URL typed into the address bar (or any entry without history state) gets the key "default", the same as the
  // first page: keyed by path too, so it never restores the first page's position on another page.
  const entry = `${loc.key}|${loc.pathname}${loc.search}`;
  const keyRef = useRef(entry);

  useEffect(() => {
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    } catch {
      /* ignore */
    }
    const onScroll = () => positions.current.set(keyRef.current, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    if (keyRef.current === entry) return;
    if (navType === 'POP') window.scrollTo(0, positions.current.get(entry) ?? 0);
    else if (navType === 'PUSH') window.scrollTo(0, 0);
    else positions.current.set(entry, window.scrollY); // REPLACE (filters/tabs): keep place, remember it
    keyRef.current = entry;
  }, [entry, navType]);

  return null;
}

/**
 * After moving to another page, put keyboard / screen-reader focus on the new page's heading
 * (otherwise focus is lost on the removed link and the page change is silent).
 */
function RouteFocus() {
  const loc = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef(loc.pathname);
  useEffect(() => {
    if (prevPath.current === loc.pathname) return; // first render (also StrictMode's re-run)
    prevPath.current = loc.pathname;
    if (navType === 'REPLACE') return;
    const t = setTimeout(() => {
      const target = document.querySelector<HTMLElement>('#main h1') ?? document.getElementById('main');
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      try {
        target.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);
  return null;
}

function Toaster() {
  const t = useToast();
  const loc = useLocation();
  // a message belongs to the page it was shown on
  const prevPath = useRef(loc.pathname);
  useEffect(() => {
    if (prevPath.current === loc.pathname) return;
    prevPath.current = loc.pathname;
    dismissToast();
  }, [loc.pathname]);
  return (
    <div className="toast-region" aria-live="polite" role="status">
      <UpdateNotice />
      {t && (
        <div className={`toast${t.action ? ' toast--action' : ''}`} key={t.id}>
          <IconCheck />
          <span className="grow">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action?.onClick();
                dismissToast();
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A new version of the app (service worker) is installed and waiting: 「新しいバージョンがあります」 [更新] [×]. It stays
 * across pages until the user updates or closes it (src/lib/swUpdate.ts; never on the first install or in the
 * single-file build).
 */
function UpdateNotice() {
  const available = useUpdateAvailable();
  if (!available) return null;
  return (
    <div className="toast toast--action toast--update">
      <IconDownload />
      <span className="grow">新しいバージョンがあります</span>
      <button type="button" className="toast__action" onClick={applyUpdate}>
        更新
      </button>
      <button type="button" className="toast__close" aria-label="閉じる" onClick={dismissUpdate}>
        <IconClose />
      </button>
    </div>
  );
}

/**
 * While a page's code is still downloading (it is fetched ahead on idle and on a press on its link, so this is
 * rare): an empty page of the usual height — no spinner flash; a quiet note fades in only if it takes a while.
 */
function RouteLoading() {
  return (
    <main className="page page--root route-loading" id="main" aria-busy="true">
      <p className="route-loading__note" role="status">
        読み込み中…
      </p>
    </main>
  );
}

/** A page's code could not be downloaded (offline): say so instead of a blank screen. */
function RouteLoadError() {
  return (
    <main className="page page--root" id="main">
      <div className="empty" style={{ marginTop: 48 }}>
        <p className="empty__title">ページを読み込めませんでした</p>
        <p className="empty__text">通信状態を確認して、もう一度読み込んでください。</p>
        <div className="empty__actions">
          <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
            再読み込み
          </button>
          <Link to="/" className="btn btn--secondary">
            ホームへ
          </Link>
        </div>
      </div>
    </main>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <ScrollManager />
      <RouteFocus />
      <ErrorBoundary resetKey={pathname} fallback={<RouteLoadError />}>
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <TabBar />
      <Toaster />
    </div>
  );
}

function useScrolled(threshold = 48) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setOn(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return on;
}

function TopBar({ title, fallback, right }: { title: string; fallback: string; right?: ReactNode }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const scrolled = useScrolled();
  const back = () => {
    if (loc.key !== 'default' && window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
  return (
    <header className={`topbar${scrolled ? ' is-scrolled' : ''}`}>
      <div className="topbar__inner">
        <button type="button" className="icon-btn" onClick={back} aria-label="戻る">
          <IconBack />
        </button>
        <div className="topbar__title" aria-hidden={!scrolled}>
          {title}
        </div>
        <div>{right}</div>
      </div>
    </header>
  );
}

function useDocumentTitle(title: string) {
  useEffect(() => {
    try {
      document.title = title ? `${title} | TriBody` : 'TriBody 解剖ガイド';
    } catch {
      /* ignore */
    }
  }, [title]);
}

/**
 * Page wrapper. `back` = detail page with a sticky top bar (back button + title fades in on scroll);
 * otherwise a root (tab) page with the brand bar.
 */
export function Page({
  title,
  back,
  right,
  children,
  brand = true,
}: {
  title: string;
  /** Fallback route when there is no history to go back to. */
  back?: string;
  right?: ReactNode;
  children: ReactNode;
  brand?: boolean;
}) {
  useDocumentTitle(title);
  if (back) {
    return (
      <>
        <TopBar title={title} fallback={back} right={right} />
        <main className="page page--detail" id="main">
          {children}
        </main>
      </>
    );
  }
  return (
    <main className="page page--root" id="main">
      {brand && <BrandBar />}
      {children}
    </main>
  );
}

function BrandBar() {
  return (
    <div className="brandbar">
      <Link to="/" className="brand" aria-label="TriBody ホーム">
        <AppMark className="brand__mark" />
        <span>
          TriBody <span className="brand__sub">トライボディ</span>
        </span>
      </Link>
      <Link to="/about" className="icon-btn icon-btn--muted" aria-label="使い方・免責事項・設定">
        <IconInfo />
      </Link>
    </div>
  );
}
