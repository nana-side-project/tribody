// Search text for list pages: kept in local state (typing and Japanese IME composition are never
// interrupted by router re-renders) and mirrored to `?<key>=` with replace, debounced, so the query
// survives back/forward and reloads. External URL changes (back/forward, 「条件をクリア」) re-sync it.
import { useCallback, useEffect, useRef, useState, type CompositionEvent, type FocusEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlSearchText(key = 'q', delay = 250) {
  const [params, setParams] = useSearchParams();
  const urlValue = params.get(key) ?? '';
  const [text, setTextState] = useState(urlValue);
  const lastWritten = useRef(urlValue);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // setSearchParams' updater sees the params of the render it came from: always call the latest one.
  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;

  const write = useCallback(
    (v: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = undefined;
      if (v === lastWritten.current) return;
      lastWritten.current = v;
      setParamsRef.current(
        (p) => {
          const n = new URLSearchParams(p);
          if (v) n.set(key, v);
          else n.delete(key);
          return n;
        },
        { replace: true },
      );
    },
    [key],
  );

  const schedule = useCallback(
    (v: string) => {
      if (timer.current) clearTimeout(timer.current);
      if (!v) return write(v); // clearing is applied at once
      timer.current = setTimeout(() => {
        timer.current = undefined;
        if (!composing.current) write(v);
      }, delay);
    },
    [delay, write],
  );

  // the URL changed from outside (back/forward, clear-all) → follow it
  useEffect(() => {
    if (urlValue === lastWritten.current) return;
    lastWritten.current = urlValue;
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    setTextState(urlValue);
  }, [urlValue]);

  // never navigate after the page is gone (the next page would get ?q=)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const setText = useCallback(
    (v: string) => {
      setTextState(v);
      if (!composing.current) schedule(v);
    },
    [schedule],
  );

  /** Reset the text (and drop any pending URL write) — for 「条件をクリア」. */
  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    lastWritten.current = '';
    setTextState('');
  }, []);

  const inputProps = {
    onCompositionStart: () => {
      composing.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = undefined;
    },
    onCompositionEnd: (e: CompositionEvent<HTMLInputElement>) => {
      composing.current = false;
      schedule(e.currentTarget.value);
    },
    // leaving the field (e.g. tapping a result) commits the text before the next navigation
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      if (!composing.current) write(e.currentTarget.value);
    },
  };

  return { text, setText, reset, inputProps };
}
