import { useEffect, useRef, useState } from "react";

function readStored<T>(key: string, fallback: T, normalize?: (value: unknown) => T): { value: T; raw: string | null } {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return { value: fallback, raw: stored };
    }
    const parsed = JSON.parse(stored) as unknown;
    return { value: normalize ? normalize(parsed) : (parsed as T), raw: stored };
  } catch {
    return { value: fallback, raw: null };
  }
}

export function useLocalStorageState<T>(key: string, initialValue: T, normalize?: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => readStored(key, initialValue, normalize).value);
  // The JSON we last wrote (or adopted); lets external-change checks compare
  // against storage without re-serializing on every event.
  const lastWrittenRef = useRef<string | null>(null);
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  // Serialized value we adopted from another window; suppresses re-broadcasting
  // a value that just arrived from the outside.
  const lastAdoptedRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(value);
      lastWrittenRef.current = serialized;
      window.localStorage.setItem(key, serialized);
      if (serialized !== lastAdoptedRef.current) {
        // storage events don't reliably cross windows on the file:// protocol
        // used by packaged builds, so also announce writes over IPC.
        window.deskBuddies?.broadcastStorage?.(key, serialized);
      }
    } catch {
      // Local persistence is a convenience; the app should still run if storage is unavailable.
    }
  }, [key, value]);

  // Panel, overlay, and native tool pop-outs are separate windows sharing the
  // same localStorage keys. Adopt writes made by the other windows so one
  // window's stale in-memory copy can't clobber another window's edits.
  useEffect(() => {
    const adoptExternal = (raw: string | null) => {
      if (raw === null || raw === lastWrittenRef.current) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        lastWrittenRef.current = raw;
        lastAdoptedRef.current = raw;
        setValue(normalizeRef.current ? normalizeRef.current(parsed) : (parsed as T));
      } catch {
        // Ignore malformed external writes.
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        adoptExternal(event.newValue);
      }
    };
    // Fallbacks for the file:// protocol used by packaged builds, where
    // storage events don't reliably cross windows: an IPC broadcast relayed by
    // the main process, plus a re-read when this window regains focus.
    const unsubscribeIpc = window.deskBuddies?.onStorageSync?.((payload) => {
      if (payload.key === key) {
        adoptExternal(payload.value);
      }
    });
    const onFocus = () => {
      try {
        adoptExternal(window.localStorage.getItem(key));
      } catch {
        // Storage unavailable; keep in-memory state.
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      unsubscribeIpc?.();
    };
  }, [key]);

  return [value, setValue] as const;
}

export function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}
