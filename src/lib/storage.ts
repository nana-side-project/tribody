// Safe persistent storage.
// Every localStorage access is wrapped in try/catch: it can throw in private mode, sandboxed iframes,
// previews or when site data is blocked. An in-memory map is the write-through cache and the fallback,
// so the app keeps working (for the session) even when persistence is unavailable.
import { useSyncExternalStore } from 'react';

const memory = new Map<string, string>();
let backend: Storage | null | undefined;

function getBackend(): Storage | null {
  if (backend !== undefined) return backend;
  try {
    const s = window.localStorage;
    const probe = '__tribody_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    backend = s;
  } catch {
    backend = null;
  }
  return backend;
}

/** True when values survive a reload (localStorage usable). */
export function isPersistent(): boolean {
  return getBackend() !== null;
}

export function readRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  const b = getBackend();
  if (b) {
    try {
      const v = b.getItem(key);
      if (v !== null) memory.set(key, v);
      return v;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function writeRaw(key: string, value: string | null): void {
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  const b = getBackend();
  if (!b) return;
  try {
    if (value === null) b.removeItem(key);
    else b.setItem(key, value);
  } catch {
    /* quota exceeded / blocked — memory copy still holds the value */
  }
}

type Listener = () => void;

export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (l: Listener) => () => void;
}

/**
 * A JSON value persisted under `key`, shared by every component that uses it
 * (useSyncExternalStore), synced across tabs via the `storage` event.
 * `sanitize` turns whatever was stored (possibly corrupt / old) into a valid T.
 */
export function createStore<T>(key: string, sanitize: (raw: unknown) => T): Store<T> {
  let cache: T | undefined;
  const listeners = new Set<Listener>();

  const load = (): T => {
    const raw = readRaw(key);
    let parsed: unknown = undefined;
    if (raw !== null) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
    }
    try {
      return sanitize(parsed);
    } catch {
      return sanitize(undefined);
    }
  };

  const get = (): T => {
    if (cache === undefined) cache = load();
    return cache;
  };

  const emit = () => listeners.forEach((l) => l());

  const set: Store<T>['set'] = (next) => {
    const value = typeof next === 'function' ? (next as (p: T) => T)(get()) : next;
    cache = value;
    try {
      writeRaw(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
    emit();
  };

  const subscribe = (l: Listener) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  try {
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return;
      if (e.newValue === null) memory.delete(key);
      else memory.set(key, e.newValue);
      cache = undefined;
      emit();
    });
  } catch {
    /* ignore */
  }

  return { get, set, subscribe };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
