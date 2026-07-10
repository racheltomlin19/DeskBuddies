// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogCompanions, customCompanions } from "../data";
import { CompanionControlCard } from "./CompanionControlCard";

const mochi = customCompanions.find((pet) => pet.id === "mochi")!;
const yorkie = catalogCompanions.find((pet) => pet.id === "yorkie")!;

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

describe("CompanionControlCard", () => {
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

  it("sends individual held modes, actions, sync, and range updates", async () => {
    const onHeldMode = vi.fn();
    const onAction = vi.fn();
    const onUpdatePet = vi.fn();
    const onSyncBehavior = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <CompanionControlCard
          pet={mochi}
          heldMode={null}
          onHeldMode={onHeldMode}
          onAction={onAction}
          onUpdatePet={onUpdatePet}
          onSyncBehavior={onSyncBehavior}
        />
      );
    });

    await act(async () => {
      clickByLabel(container!, "Walk Mochi");
      clickByLabel(container!, "Auto Mochi");
      clickByLabel(container!, "Sit Mochi");
      clickByLabel(container!, "Nap Mochi");
      clickByLabel(container!, "Jump Mochi");
      clickByLabel(container!, "Pounce Mochi");
      clickByLabel(container!, "Sync behavior from Mochi");
      changeRange(container!, "Pace Mochi", "0.77");
    });

    expect(onHeldMode).toHaveBeenCalledWith("mochi", "walk");
    expect(onHeldMode).toHaveBeenCalledWith("mochi", null);
    expect(onHeldMode).toHaveBeenCalledWith("mochi", "sit");
    expect(onHeldMode).toHaveBeenCalledWith("mochi", "sleep");
    expect(onAction).toHaveBeenCalledWith(["mochi"], "jump");
    expect(onAction).toHaveBeenCalledWith(["mochi"], "stalk");
    expect(onSyncBehavior).toHaveBeenCalledWith("mochi");
    expect(onUpdatePet).toHaveBeenCalledWith("mochi", { speed: 0.77 });
  });

  it("omits the individual pounce action for non-cats", () => {
    const handlers = {
      onHeldMode: vi.fn(),
      onAction: vi.fn(),
      onUpdatePet: vi.fn(),
      onSyncBehavior: vi.fn()
    };

    expect(renderToStaticMarkup(<CompanionControlCard pet={yorkie} heldMode={null} {...handlers} />)).not.toContain(
      "Pounce Yorkie"
    );
  });
});
