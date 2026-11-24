import { useSyncExternalStore } from 'react';

const subscribers = new Map<string, (cb: () => void) => () => void>();

function subscribeMedia(query: string) {
  let fn = subscribers.get(query);
  if (!fn) {
    fn = (cb: () => void) => {
      try {
        const mq = window.matchMedia(query);
        mq.addEventListener('change', cb);
        return () => mq.removeEventListener('change', cb);
      } catch {
        return () => {};
      }
    };
    subscribers.set(query, fn);
  }
  return fn;
}

function readMedia(query: string) {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => readMedia(query),
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** 'smooth' unless the user prefers reduced motion. */
export function scrollBehavior(): ScrollBehavior {
  return readMedia('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth';
}
