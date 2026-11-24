// Tiny global toast: toast('追加しました'). Rendered by <Toaster/> in the layout.
import { useSyncExternalStore } from 'react';

export interface ToastMsg {
  id: number;
  text: string;
}

let current: ToastMsg | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, ms = 2400) {
  current = { id: Date.now(), text };
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, ms);
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
