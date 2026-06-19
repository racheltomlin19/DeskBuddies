// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useLocalStorageState } from "./storage";

const KEY = "storage-test:key";

let root: Root;
let container: HTMLDivElement;
let latest: { value: unknown; setValue: (next: unknown) => void };

function Probe({ initial, normalize }: { initial: unknown; normalize?: (value: unknown) => unknown }) {
  const [value, setValue] = useLocalStorageState(KEY, initial, normalize);
  latest = { value, setValue };
  return null;
}

async function mount(initial: unknown, normalize?: (value: unknown) => unknown) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(Probe, { initial, normalize }));
  });
}

async function fireStorage(newValue: string) {
  await act(async () => {
    window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue }));
  });
}

// vitest's jsdom environment can expose Node's partial localStorage shim, so
// install a small in-memory Storage the hook can rely on.
function installMemoryStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    }
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
}

beforeEach(() => {
  installMemoryStorage();
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  container?.remove();
});

describe("useLocalStorageState cross-window sync", () => {
  it("adopts a value written by another window via the storage event", async () => {
    await mount("first");
    expect(latest.value).toBe("first");

    await fireStorage(JSON.stringify("from-popout"));
    expect(latest.value).toBe("from-popout");
  });

  it("does not clobber another window's write with its own stale copy", async () => {
    await mount(["panel-task"]);

    // A pop-out window prepends a task and writes it to storage.
    const popoutTasks = ["popout-task", "panel-task"];
    await fireStorage(JSON.stringify(popoutTasks));

    // The panel then updates from ITS current state; the pop-out's task survives.
    await act(async () => {
      latest.setValue([...(latest.value as string[]), "second-panel-task"]);
    });

    expect(latest.value).toEqual(["popout-task", "panel-task", "second-panel-task"]);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([
      "popout-task",
      "panel-task",
      "second-panel-task"
    ]);
  });

  it("applies the normalizer to externally written values", async () => {
    await mount({ count: 1 }, (value) => ({ count: 0, ...(value as object) }));

    await fireStorage(JSON.stringify({ extra: true }));
    expect(latest.value).toEqual({ count: 0, extra: true });
  });

  it("ignores storage events for other keys and malformed payloads", async () => {
    await mount("stable");

    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "other:key", newValue: JSON.stringify("nope") }));
    });
    expect(latest.value).toBe("stable");

    await fireStorage("{not json");
    expect(latest.value).toBe("stable");
  });

  it("re-reads storage on window focus (file:// fallback where storage events may not fire)", async () => {
    await mount("first");

    // Another window wrote directly; no storage event was delivered.
    window.localStorage.setItem(KEY, JSON.stringify("focus-adopted"));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(latest.value).toBe("focus-adopted");
  });

  it("broadcasts writes over IPC and adopts broadcasts from other windows", async () => {
    const broadcasts: Array<{ key: string; value: string }> = [];
    let deliver: ((payload: { key: string; value: string }) => void) | undefined;
    (window as unknown as { deskBuddies: unknown }).deskBuddies = {
      broadcastStorage: (key: string, value: string) => broadcasts.push({ key, value }),
      onStorageSync: (callback: (payload: { key: string; value: string }) => void) => {
        deliver = callback;
        return () => undefined;
      }
    };

    try {
      await mount("first");
      expect(broadcasts).toContainEqual({ key: KEY, value: JSON.stringify("first") });

      // Another window announces a write over IPC (no storage event on file://).
      await act(async () => {
        deliver?.({ key: KEY, value: JSON.stringify("via-ipc") });
      });
      expect(latest.value).toBe("via-ipc");

      // Adopted values are not re-broadcast (no echo loop).
      expect(broadcasts.filter((entry) => entry.value === JSON.stringify("via-ipc"))).toHaveLength(0);

      // Local changes after adoption broadcast again.
      await act(async () => {
        latest.setValue("local-change");
      });
      expect(broadcasts).toContainEqual({ key: KEY, value: JSON.stringify("local-change") });
    } finally {
      delete (window as unknown as { deskBuddies?: unknown }).deskBuddies;
    }
  });
});
