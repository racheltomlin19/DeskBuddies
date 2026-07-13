import { describe, expect, it } from "vitest";
import { OVERLAY_ENTRY_HIT_PADDING, OVERLAY_EXIT_HIT_PADDING, getOverlayInteractionTransition } from "./interactionState";

describe("getOverlayInteractionTransition", () => {
  it("uses the specified entry and exit hit padding", () => {
    expect(OVERLAY_ENTRY_HIT_PADDING).toBe(10);
    expect(OVERLAY_EXIT_HIT_PADDING).toBe(18);
  });
  it("enters immediately over a pet", () => expect(getOverlayInteractionTransition({ interactive: false, overPet: true, dragging: false })).toEqual({ interactive: true, delay: 0 }));
  it("delays exit after leaving a pet", () => expect(getOverlayInteractionTransition({ interactive: true, overPet: false, dragging: false })).toEqual({ interactive: false, delay: 120 }));
  it("keeps a drag interactive", () => expect(getOverlayInteractionTransition({ interactive: false, overPet: false, dragging: true })).toEqual({ interactive: true, delay: 0 }));
});
