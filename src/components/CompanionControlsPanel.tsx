import type { Behavior, EngineSettings, HeldMode, PetProfile } from "../types";
import { AllAnimalsControlCard } from "./AllAnimalsControlCard";
import { CompanionControlCard } from "./CompanionControlCard";

export interface CompanionControlsPanelProps {
  pets: PetProfile[];
  settings: EngineSettings;
  heldModes: Record<string, HeldMode>;
  onHeldMode: (id: string, mode: HeldMode) => void;
  onAction: (ids: string[], behavior: Behavior) => void;
  onUpdatePet: (id: string, patch: Partial<PetProfile>) => void;
  onUpdateAll: (patch: Partial<PetProfile>) => void;
  onUpdateSettings: (patch: Partial<EngineSettings>) => void;
  onSyncBehavior: (id: string) => void;
}

export function CompanionControlsPanel({ pets, settings, heldModes, ...handlers }: CompanionControlsPanelProps) {
  const summoned = pets.filter((pet) => pet.summoned);
  return <section className="companion-controls-panel" aria-label="Companion controls">
    <AllAnimalsControlCard pets={summoned} settings={settings} onAction={handlers.onAction} onUpdateAll={handlers.onUpdateAll} onUpdateSettings={handlers.onUpdateSettings} />
    {summoned.map((pet) => <CompanionControlCard key={pet.id} pet={pet} heldMode={heldModes[pet.id] ?? null} onHeldMode={handlers.onHeldMode} onAction={handlers.onAction} onUpdatePet={handlers.onUpdatePet} onSyncBehavior={handlers.onSyncBehavior} />)}
  </section>;
}
