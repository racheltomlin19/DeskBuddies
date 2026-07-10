// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Overlay } from "./Overlay";
import { getSummonedCompanions } from "./companionState";
import { initialCompanionState, initialSettings } from "./data";

const summoned = getSummonedCompanions(initialCompanionState.companions);

beforeEach(() => {
  // The simulation schedules requestAnimationFrame; stub it to a no-op so the
  // test asserts the initial render without an ongoing animation loop.
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

describe("Overlay rendering", () => {
  it("renders a draggable pet actor for each companion delivered by the snapshot", async () => {
    const snapshot = { companions: summoned, settings: initialSettings };
    (window as unknown as { deskBuddies: unknown }).deskBuddies = {
      onSnapshot: (callback: (value: unknown) => void) => {
        callback(snapshot);
        return () => undefined;
      },
      requestSnapshot: () => undefined,
      setOverlayInteractive: () => undefined
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Overlay />);
    });

    const pets = container.querySelectorAll(".overlay-pet");
    expect(pets.length).toBe(summoned.length);
    expect(pets.length).toBeGreaterThanOrEqual(2);
    expect(container.innerHTML).toContain("Mochi");
    expect(container.innerHTML).toContain("Biscuit");

    await act(async () => {
      root.unmount();
    });
  });

  it("flips only the pet artwork when facing left, not the name label", async () => {
    const snapshot = { companions: summoned, settings: initialSettings };
    (window as unknown as { deskBuddies: unknown }).deskBuddies = {
      onSnapshot: (callback: (value: unknown) => void) => {
        callback(snapshot);
        return () => undefined;
      },
      requestSnapshot: () => undefined,
      setOverlayInteractive: () => undefined
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Overlay />);
    });

    const leftFacingPet = container.querySelectorAll<HTMLButtonElement>(".overlay-pet")[1];
    expect(leftFacingPet.style.transform).not.toContain("scaleX");
    expect(leftFacingPet.querySelector<HTMLElement>(".overlay-pet-art")?.style.transform).toBe("scaleX(-1)");

    await act(async () => root.unmount());
    container.remove();
  });

  it("shows pet name tags only when showNames is enabled", async () => {
    const renderWith = async (showNames: boolean) => {
      const snapshot = { companions: summoned, settings: { ...initialSettings, showNames } };
      (window as unknown as { deskBuddies: unknown }).deskBuddies = {
        onSnapshot: (callback: (value: unknown) => void) => {
          callback(snapshot);
          return () => undefined;
        },
        requestSnapshot: () => undefined,
        setOverlayInteractive: () => undefined
      };
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      await act(async () => {
        root.render(<Overlay />);
      });
      const tags = Array.from(container.querySelectorAll(".pet-name")).map((node) => node.textContent);
      await act(async () => {
        root.unmount();
      });
      container.remove();
      return tags;
    };

    expect(await renderWith(true)).toEqual(expect.arrayContaining(["Mochi", "Biscuit"]));
    expect(await renderWith(false)).toEqual([]);
  });

});
