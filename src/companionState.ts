import { catalogCompanions, customCompanions, initialCompanionState } from "./data";
import type { CompanionState, PetProfile } from "./types";

export const COMPANION_SCHEMA_VERSION = 2;

const editablePetFields: Array<keyof PetProfile> = [
  "summoned",
  "name",
  "breedLabel",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "eyeColor",
  "size",
  "speed",
  "energy",
  "personality"
];

function cloneCompanion(pet: PetProfile): PetProfile {
  return {
    ...pet,
    personality: { ...pet.personality }
  };
}

function mergeStoredCompanion(defaultPet: PetProfile, stored: PetProfile | undefined): PetProfile {
  const base = cloneCompanion(defaultPet);
  if (!stored) {
    return base;
  }

  const editable = editablePetFields.reduce<Partial<PetProfile>>((patch, field) => {
    if (field in stored) {
      return { ...patch, [field]: field === "personality" ? { ...stored.personality } : stored[field] };
    }
    return patch;
  }, {});

  return {
    ...base,
    ...editable,
    id: defaultPet.id,
    species: defaultPet.species,
    kind: defaultPet.kind,
    avatar: defaultPet.avatar,
    pattern: defaultPet.pattern
  };
}

export function createDefaultCompanionState(): CompanionState {
  return {
    schemaVersion: COMPANION_SCHEMA_VERSION,
    companions: initialCompanionState.companions.map(cloneCompanion)
  };
}

function isCompanionState(value: unknown): value is CompanionState {
  return Boolean(
    value &&
      typeof value === "object" &&
      "schemaVersion" in value &&
      "companions" in value &&
      Array.isArray((value as CompanionState).companions)
  );
}

export function normalizeCompanionState(value: unknown): CompanionState {
  const defaults = createDefaultCompanionState();

  if (!isCompanionState(value) || value.schemaVersion !== COMPANION_SCHEMA_VERSION) {
    return defaults;
  }

  const storedById = new Map(value.companions.map((pet) => [pet.id, pet]));
  const companions = [...customCompanions, ...catalogCompanions].map((defaultPet) =>
    mergeStoredCompanion(defaultPet, storedById.get(defaultPet.id))
  );

  return {
    schemaVersion: COMPANION_SCHEMA_VERSION,
    companions
  };
}

export function getSummonedCompanions(companions: PetProfile[]) {
  return companions.filter((pet) => pet.summoned);
}

export function findSelectedCompanion(companions: PetProfile[], selectedId: string | undefined) {
  const summoned = getSummonedCompanions(companions);
  return (
    companions.find((pet) => pet.id === selectedId && pet.summoned) ??
    summoned[0] ??
    companions.find((pet) => pet.kind === "custom") ??
    companions[0]
  );
}

export function setCompanionSummoned(companions: PetProfile[], id: string, summoned: boolean) {
  return companions.map((pet) => (pet.id === id ? { ...pet, summoned } : pet));
}

export function updateCompanionsByIds(
  companions: PetProfile[],
  ids: string[],
  patch: Partial<PetProfile> | ((pet: PetProfile) => Partial<PetProfile>)
) {
  const selected = new Set(ids);
  return companions.map((pet) => {
    if (!selected.has(pet.id)) {
      return pet;
    }
    const nextPatch = typeof patch === "function" ? patch(pet) : patch;
    return {
      ...pet,
      ...nextPatch,
      personality: nextPatch.personality ? { ...pet.personality, ...nextPatch.personality } : pet.personality
    };
  });
}

export function getSharedNumberValue(companions: PetProfile[], ids: string[], field: "size" | "speed" | "energy") {
  const selected = companions.filter((pet) => ids.includes(pet.id));
  if (selected.length === 0) {
    return undefined;
  }
  const first = selected[0][field];
  return selected.every((pet) => pet[field] === first) ? first : "mixed";
}
