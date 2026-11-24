// Theme preference: 自動 (follow OS) / ライト / ダーク → data-theme on <html>, persisted.
import { useEffect } from 'react';
import { createStore, useStore } from './storage';

export type ThemePref = 'auto' | 'light' | 'dark';

export const themeStore = createStore<ThemePref>('tribody.theme', (v) =>
  v === 'light' || v === 'dark' ? v : 'auto',
);

const THEME_BG = { light: '#f6f3ef', dark: '#151312' } as const;

export function applyTheme(pref: ThemePref) {
  try {
    const root = document.documentElement;
    if (pref === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
    // Keep the browser chrome colour in step with a forced theme.
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      const media = m.getAttribute('media') ?? '';
      const natural = media.includes('dark') ? THEME_BG.dark : THEME_BG.light;
      m.setAttribute('content', pref === 'auto' ? natural : THEME_BG[pref]);
    });
  } catch {
    /* ignore */
  }
}

export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  const pref = useStore(themeStore);
  useEffect(() => applyTheme(pref), [pref]);
  return [pref, (p) => themeStore.set(p)];
}
