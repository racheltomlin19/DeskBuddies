export const OVERLAY_EXIT_DELAY_MS = 120;
export const OVERLAY_ENTRY_HIT_PADDING = 10;
export const OVERLAY_EXIT_HIT_PADDING = 18;

export function getOverlayInteractionTransition(input: { interactive: boolean; overPet: boolean; dragging: boolean }) {
  if (input.dragging || input.overPet) return { interactive: true, delay: 0 };
  return input.interactive ? { interactive: false, delay: OVERLAY_EXIT_DELAY_MS } : { interactive: false, delay: 0 };
}
