// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { customCompanions, initialSettings } from "../data";
import { AllAnimalsControlCard } from "./AllAnimalsControlCard";

function clickByLabel(container: HTMLElement, label: string) {
  const control = container.querySelector<HTMLButtonElement>('[aria-label="' + label + '"]');
  if (!control) throw new Error("Missing control " + label);
  control.click();
}

function changeRange(container: HTMLElement, label: string, value: string) {
  const input = container.querySelector<HTMLInputElement>('[aria-label="' + label + '"]');
  if (!input) throw new Error("Missing range " + label);
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setValue) throw new Error("Missing native input value setter");
  setValue.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("AllAnimalsControlCard", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    if (root) {
      await act(async () => root!.unmount());
      root = undefined;
    }
    container?.remove();
    container = undefined;
  });

  it("updates all pet ranges and pounces only summoned cats", async () => {
    const onAction = vi.fn();
    const onUpdateAll = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <AllAnimalsControlCard
          pets={customCompanions}
          settings={initialSettings}
          onAction={onAction}
          onUpdateAll={onUpdateAll}
          onUpdateSettings={vi.fn()}
        />
      );
    });

    await act(async () => {
      changeRange(container!, "All animals Energy", "0.66");
      clickByLabel(container!, "Pounce all cats");
    });

    expect(onUpdateAll).toHaveBeenCalledWith({ energy: 0.66 });
    expect(onAction).toHaveBeenCalledWith(["mochi", "biscuit"], "stalk");
  });

  it("emits exact global settings patches", async () => {
    const onUpdateSettings = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <AllAnimalsControlCard
          pets={customCompanions}
          settings={{ ...initialSettings, followMode: false, pounce: true, physics: true, showNames: true }}
          onAction={vi.fn()}
          onUpdateAll={vi.fn()}
          onUpdateSettings={onUpdateSettings}
        />
      );
    });

    await act(async () => {
      clickByLabel(container!, "Screen roaming");
      clickByLabel(container!, "Ground roaming");
      clickByLabel(container!, "Follow cursor");
      clickByLabel(container!, "Follow pounce");
      clickByLabel(container!, "Physics");
      clickByLabel(container!, "Name tags");
    });

    expect(onUpdateSettings).toHaveBeenCalledWith({ roamMode: "screen" });
    expect(onUpdateSettings).toHaveBeenCalledWith({ roamMode: "ground" });
    expect(onUpdateSettings).toHaveBeenCalledWith({ followMode: true });
    expect(onUpdateSettings).toHaveBeenCalledWith({ pounce: false });
    expect(onUpdateSettings).toHaveBeenCalledWith({ physics: false });
    expect(onUpdateSettings).toHaveBeenCalledWith({ showNames: false });
  });

  it("keeps global settings reversible when no pets are summoned", async () => {
    const onUpdateSettings = vi.fn();
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root!.render(<AllAnimalsControlCard pets={[]} settings={{ ...initialSettings, followMode: true }} onAction={vi.fn()} onUpdateAll={vi.fn()} onUpdateSettings={onUpdateSettings} />));

    const follow = container!.querySelector<HTMLButtonElement>('[aria-label="Follow cursor"]');
    expect(follow?.disabled).toBe(false);
    expect(follow?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => follow?.click());
    expect(onUpdateSettings).toHaveBeenCalledWith({ followMode: false });

    for (const label of ["Screen roaming", "Ground roaming", "Follow pounce", "Physics", "Name tags"]) {
      expect(container!.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)?.disabled).toBe(false);
    }
    expect(container!.querySelector<HTMLButtonElement>('[aria-label="Pounce all cats"]')?.disabled).toBe(true);
    for (const label of ["All animals Size", "All animals Pace", "All animals Energy"]) {
      expect(container!.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)?.disabled).toBe(true);
    }
  });

  it("exposes the current state of global setting buttons", async () => {
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root!.render(<AllAnimalsControlCard pets={[]} settings={{ ...initialSettings, roamMode: "ground", followMode: true, pounce: false, physics: true, showNames: false }} onAction={vi.fn()} onUpdateAll={vi.fn()} onUpdateSettings={vi.fn()} />));

    expect(container!.querySelector('[aria-label="Screen roaming"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(container!.querySelector('[aria-label="Ground roaming"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(container!.querySelector('[aria-label="Follow cursor"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(container!.querySelector('[aria-label="Follow pounce"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(container!.querySelector('[aria-label="Physics"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(container!.querySelector('[aria-label="Name tags"]')?.getAttribute("aria-pressed")).toBe("false");
  });

  it("uses shared aggregate values and labels mixed values", async () => {
    const shared = customCompanions.map((pet) => ({ ...pet, size: 1.1, speed: 0.7, energy: 0.4 }));
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root!.render(<AllAnimalsControlCard pets={shared} settings={initialSettings} onAction={vi.fn()} onUpdateAll={vi.fn()} onUpdateSettings={vi.fn()} />));
    expect(container!.querySelector<HTMLInputElement>('[aria-label="All animals Size"]')?.value).toBe("1.1");
    expect(container!.textContent).not.toContain("Size mixed");
    const mixed = [{ ...shared[0], energy: 0.2 }, shared[1]];
    await act(async () => root!.render(<AllAnimalsControlCard pets={mixed} settings={initialSettings} onAction={vi.fn()} onUpdateAll={vi.fn()} onUpdateSettings={vi.fn()} />));
    expect(container!.textContent).toContain("Energy mixed");
  });
});
