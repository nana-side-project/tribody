// Tiny global toast: toast('追加しました'). Rendered by <Toaster/> in the layout.
import { useSyncExternalStore } from 'react';
import { isPersistent } from './storage';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMsg {
  id: number;
  text: string;
  action?: ToastAction;
}

let current: ToastMsg | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, ms = 2400, action?: ToastAction) {
  current = { id: Date.now(), text, action };
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, ms);
}

/** Hide the current toast (e.g. on navigation, so a message doesn't float over the next page). */
export function dismissToast() {
  if (!current) return;
  if (timer) clearTimeout(timer);
  timer = undefined;
  current = null;
  emit();
}

/**
 * Toast for something that was saved. When storage is unavailable (private mode, blocked site data),
 * say so — the data only lasts until the tab is closed.
 */
export function toastSaved(text: string, saved = true) {
  if (saved && !isPersistent()) toast(`${text}（この環境では保存されません。ページを閉じると消えます）`, 4200);
  else toast(text);
}

export function useToast(): ToastMsg | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
    () => null,
  );
}
