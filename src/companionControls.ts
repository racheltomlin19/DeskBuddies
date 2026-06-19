import type { EngineSettings, HeldMode, PetProfile } from "./types";

export const COMPANION_CONTROLS_VERSION = 1;
export const PET_CONTROL_RANGES = {
  size: { min: 0.65, max: 1.4, step: 0.01 },
  speed: { min: 0.2, max: 1, step: 0.01 },
  energy: { min: 0.05, max: 1, step: 0.01 }
} as const;
export const HELD_MODES: ReadonlyArray<Exclude<HeldMode, null>> = ["walk", "sit", "sleep"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function migrateLegacyCompanionControls(companions: PetProfile[], settings: EngineSettings) {
  if (settings.companionControlsVersion >= COMPANION_CONTROLS_VERSION) {
    return { companions, settings };
  }

  return {
    companions: companions.map((pet) => ({
      ...pet,
      size: clamp(pet.size * settings.globalScale, PET_CONTROL_RANGES.size.min, PET_CONTROL_RANGES.size.max),
      speed: clamp(pet.speed * settings.globalSpeed, PET_CONTROL_RANGES.speed.min, PET_CONTROL_RANGES.speed.max)
    })),
    settings: {
      ...settings,
      globalScale: 1,
      globalSpeed: 1,
      companionControlsVersion: COMPANION_CONTROLS_VERSION
    }
  };
}
