// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { customCompanions, initialSettings } from "../data";
import { CompanionControlsPanel } from "./CompanionControlsPanel";

describe("CompanionControlsPanel", () => {
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

  function renderPanel(pets = customCompanions) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    return act(async () => {
      root!.render(
        <CompanionControlsPanel
          pets={pets}
          settings={initialSettings}
          heldModes={{}}
          onHeldMode={vi.fn()}
          onAction={vi.fn()}
          onUpdatePet={vi.fn()}
          onUpdateAll={vi.fn()}
          onUpdateSettings={vi.fn()}
          onSyncBehavior={vi.fn()}
        />
      );
    });
  }

  it("places All Animals before each summoned companion card", async () => {
    await renderPanel();
    const markup = container!.innerHTML;

    expect(markup.indexOf("All Animals")).toBeLessThan(markup.indexOf("Buddy1"));
    expect(markup.indexOf("Buddy1")).toBeLessThan(markup.indexOf("Buddy2"));
  });

  it("shows an empty state and disables group controls when no pets are summoned", async () => {
    await renderPanel([]);

    expect(container!.textContent).toContain("Summon a pet to control everyone");
    expect(container!.querySelector<HTMLButtonElement>('[aria-label="Pounce all cats"]')?.disabled).toBe(true);
    expect(container!.querySelector<HTMLInputElement>('[aria-label="All animals Energy"]')?.disabled).toBe(true);
  });
});
