// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogCompanions, customCompanions } from "../data";
import { CompanionControlCard } from "./CompanionControlCard";

const buddy1 = customCompanions.find((pet) => pet.id === "buddy1")!;
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
          pet={buddy1}
          heldMode={null}
          onHeldMode={onHeldMode}
          onAction={onAction}
          onUpdatePet={onUpdatePet}
          onSyncBehavior={onSyncBehavior}
        />
      );
    });

    await act(async () => {
      clickByLabel(container!, "Walk Buddy1");
      clickByLabel(container!, "Auto Buddy1");
      clickByLabel(container!, "Sit Buddy1");
      clickByLabel(container!, "Nap Buddy1");
      clickByLabel(container!, "Jump Buddy1");
      clickByLabel(container!, "Pounce Buddy1");
      clickByLabel(container!, "Sync behavior from Buddy1");
      changeRange(container!, "Pace Buddy1", "0.77");
    });

    expect(onHeldMode).toHaveBeenCalledWith("buddy1", "walk");
    expect(onHeldMode).toHaveBeenCalledWith("buddy1", null);
    expect(onHeldMode).toHaveBeenCalledWith("buddy1", "sit");
    expect(onHeldMode).toHaveBeenCalledWith("buddy1", "sleep");
    expect(onAction).toHaveBeenCalledWith(["buddy1"], "jump");
    expect(onAction).toHaveBeenCalledWith(["buddy1"], "stalk");
    expect(onSyncBehavior).toHaveBeenCalledWith("buddy1");
    expect(onUpdatePet).toHaveBeenCalledWith("buddy1", { speed: 0.77 });
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
