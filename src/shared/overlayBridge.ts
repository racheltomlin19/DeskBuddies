import { initialSettings } from "../data";
import type { EngineSettings, PetProfile } from "../types";

export interface OverlaySnapshot {
  companions: PetProfile[];
  settings: EngineSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeSettings(value: unknown): EngineSettings {
  if (!isRecord(value)) {
    return { ...initialSettings };
  }
  return { ...initialSettings, ...(value as Partial<EngineSettings>) };
}

function normalizeCompanions(value: unknown): PetProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((pet): pet is PetProfile => isRecord(pet) && typeof pet.id === "string");
}

export function normalizeSnapshot(value: unknown): OverlaySnapshot {
  if (!isRecord(value)) {
    return { companions: [], settings: { ...initialSettings } };
  }
  return {
    companions: normalizeCompanions(value.companions),
    settings: normalizeSettings(value.settings)
  };
}
