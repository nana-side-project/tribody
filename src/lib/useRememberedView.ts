// Remember a figure's view tab (前から / 後ろから …) per history entry, so coming Back to a page shows
// the view the user had chosen — the scroll position is restored too, so a reset view would be confusing.
// In memory only (a reload starts from the default view again).
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const memo = new Map<string, string>();

export function useRememberedView(scope: string): { initialView: string | undefined; onViewChange: (view: string) => void } {
  const { key } = useLocation();
  const last = useRef<string | undefined>(undefined);
  const initial = useRef<{ v: string | undefined } | null>(null);
  if (!initial.current) {
    initial.current = { v: memo.get(`${key}:${scope}`) };
    last.current = initial.current.v;
  }
  // a replace navigation (?phase=, ?spot=, filters) gives the same page a new entry key: carry the view over
  useEffect(() => {
    if (last.current) memo.set(`${key}:${scope}`, last.current);
  }, [key, scope]);
  return {
    initialView: initial.current.v,
    onViewChange: (view: string) => {
      last.current = view;
      memo.set(`${key}:${scope}`, view);
    },
  };
}
