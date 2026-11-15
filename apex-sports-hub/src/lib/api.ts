import { useCallback, useEffect, useRef, useState } from 'react';
import type { Envelope } from './types.ts';

export interface ApiState<T> {
  data?: Envelope<T>;
  error?: string;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Fetch an API envelope and poll it. `interval` can be a function of the latest data so
 * scoreboards poll fast only while a match is live. Polling pauses in background tabs.
 */
export function useApi<T>(url: string | null, interval?: number | ((d?: Envelope<T>) => number)): ApiState<T> {
  const [state, setState] = useState<{ data?: Envelope<T>; error?: string; loading: boolean; refreshing: boolean }>({
    loading: Boolean(url),
    refreshing: false,
  });
  const dataRef = useRef<Envelope<T> | undefined>(undefined);
  const [prevUrl, setPrevUrl] = useState(url);
  const [tick, setTick] = useState(0);

  // reset when the URL changes (league / sport switch) — derived-state pattern
  if (prevUrl !== url) {
    setPrevUrl(url);
    setState({ loading: Boolean(url), refreshing: false });
  }

  useEffect(() => {
    dataRef.current = undefined;
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, refreshing: true }));
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? `HTTP ${r.status}`);
        return body as Envelope<T>;
      })
      .then((data) => {
        dataRef.current = data;
        setState({ data, loading: false, refreshing: false });
      })
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return;
        setState((s) => ({ ...s, error: e.message, loading: false, refreshing: false }));
      });
    return () => ctrl.abort();
  }, [url, tick]);

  useEffect(() => {
    if (!url || !interval) return;
    const ms = typeof interval === 'function' ? interval(dataRef.current) : interval;
    const id = window.setTimeout(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
      else {
        const onVisible = () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', onVisible);
            setTick((t) => t + 1);
          }
        };
        document.addEventListener('visibilitychange', onVisible);
      }
    }, ms);
    return () => window.clearTimeout(id);
    // re-arm after each fetch completes
  }, [url, interval, state.data, state.error]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refresh };
}

/** Re-render every `ms` so "updated 12s ago" labels stay current. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
