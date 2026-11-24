// App shell: page wrapper (top bar on detail pages), bottom tab bar, scroll management, toasts.
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useToast } from '../lib/toast';
import { AppMark } from './Logo';
import { IconBack, IconBody, IconBook, IconCheck, IconChecklist, IconDumbbell, IconInfo, IconMuscle } from './icons';

const TABS: { to: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; match: string[] }[] = [
  { to: '/', label: 'からだ', Icon: IconBody, match: ['/', '/region', '/condition'] },
  { to: '/muscles', label: '筋肉', Icon: IconMuscle, match: ['/muscles', '/muscle'] },
  { to: '/exercises', label: 'エクササイズ', Icon: IconDumbbell, match: ['/exercises', '/exercise'] },
  { to: '/menu', label: 'マイメニュー', Icon: IconChecklist, match: ['/menu'] },
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
        {TABS.map(({ to, label, Icon }) => {
          const on = active === to;
          return (
            <Link key={to} to={to} className={`tab${on ? ' is-active' : ''}`} aria-current={on ? 'page' : undefined}>
              <span className="tab__icon">
                <Icon />
              </span>
              <span>{label}</span>
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
  const keyRef = useRef(loc.key);

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
    if (keyRef.current === loc.key) return;
    if (navType === 'POP') window.scrollTo(0, positions.current.get(loc.key) ?? 0);
    else if (navType === 'PUSH') window.scrollTo(0, 0);
    else positions.current.set(loc.key, window.scrollY); // REPLACE (filters/tabs): keep place, remember it
    keyRef.current = loc.key;
  }, [loc.key, navType]);

  return null;
}

function Toaster() {
  const t = useToast();
  return (
    <div className="toast-region" aria-live="polite" role="status">
      {t && (
        <div className="toast" key={t.id}>
          <IconCheck />
          {t.text}
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="app">
      <ScrollManager />
      <Outlet />
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
