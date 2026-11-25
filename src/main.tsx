import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, themeStore } from './lib/useTheme';
import { watchServiceWorker } from './lib/swUpdate';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

// The entry ran: the boot shell in index.html must not report a load failure any more.
(window as Window & { __tribodyBooted?: boolean }).__tribodyBooted = true;

// Apply the saved theme before the first paint (no flash).
applyTheme(themeStore.get());

const root = createRoot(document.getElementById('root')!);

// App (and the content modules it pulls in) is imported dynamically so that a failure while
// evaluating any module shows a friendly message instead of a blank page.
/** Longest wait for the opening page's code before rendering anyway (the route fallback then shows 読み込み中…). */
const INITIAL_PAGE_WAIT_MS = 2000;

import('./App')
  .then(async ({ default: App, preloadInitialRoute }) => {
    // Opened on a page other than home: fetch that page's code first, so the first render shows the page itself.
    // A failure here is left to the route's error boundary (再読み込み).
    try {
      await Promise.race([
        preloadInitialRoute().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, INITIAL_PAGE_WAIT_MS)),
      ]);
    } catch {
      /* render anyway */
    }
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    console.error('[TriBody] failed to start:', err);
    root.render(<StartupError />);
  });

function StartupError() {
  return (
    <main className="page page--root">
      <div className="empty" style={{ marginTop: 48 }}>
        <p className="empty__title">アプリを読み込めませんでした</p>
        <p className="empty__text">通信状態を確認して、もう一度読み込んでください。</p>
        <div className="empty__actions">
          <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
            再読み込み
          </button>
        </div>
      </div>
    </main>
  );
}

// Offline support: only the static build (the single-file build has no sw.js next to it) on real https deployments,
// never inside an iframe/preview.
try {
  if (import.meta.env.MODE !== 'single' && import.meta.env.PROD && location.protocol === 'https:' && window.top === window.self && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js', { scope: './' })
        // a new deploy waiting to take over: offer 「更新」 (src/lib/swUpdate.ts)
        .then(watchServiceWorker)
        .catch(() => {
          /* offline support is optional */
        });
    });
  }
} catch {
  /* ignore */
}
