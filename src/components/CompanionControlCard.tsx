import { PetAvatar } from "../PetAvatar";
import { PET_CONTROL_RANGES } from "../companionControls";
import type { HeldMode, Behavior, PetProfile } from "../types";

export interface CompanionControlCardProps {
  pet: PetProfile;
  heldMode: HeldMode;
  onHeldMode: (id: string, mode: HeldMode) => void;
  onAction: (ids: string[], behavior: Behavior) => void;
  onUpdatePet: (id: string, patch: Partial<PetProfile>) => void;
  onSyncBehavior: (id: string) => void;
}

export function CompanionControlCard({ pet, heldMode, onHeldMode, onAction, onUpdatePet, onSyncBehavior }: CompanionControlCardProps) {
  return <article className="companion-control-card" aria-label={`${pet.name} controls`}>
    <header><PetAvatar pet={pet} behavior={heldMode ?? "idle"} compact /><div className="companion-identity"><strong className="companion-name">{pet.name}</strong><small className="companion-breed">{pet.breedLabel}</small>{pet.description && <p className="companion-description">{pet.description}</p>}</div></header>
    <div className="control-buttons">
      <button type="button" aria-label={`Auto ${pet.name}`} aria-pressed={heldMode === null} onClick={() => onHeldMode(pet.id, null)}>Auto</button>
      <button type="button" aria-label={`Walk ${pet.name}`} aria-pressed={heldMode === "walk"} onClick={() => onHeldMode(pet.id, "walk")}>Walk</button>
      <button type="button" aria-label={`Sit ${pet.name}`} aria-pressed={heldMode === "sit"} onClick={() => onHeldMode(pet.id, "sit")}>Sit</button>
      <button type="button" aria-label={`Nap ${pet.name}`} aria-pressed={heldMode === "sleep"} onClick={() => onHeldMode(pet.id, "sleep")}>Nap</button>
      <button type="button" aria-label={`Jump ${pet.name}`} onClick={() => onAction([pet.id], "jump")}>Jump</button>
      {pet.species === "cat" && <button type="button" aria-label={`Pounce ${pet.name}`} onClick={() => onAction([pet.id], "stalk")}>Pounce</button>}
      <button type="button" aria-label={`Sync behavior from ${pet.name}`} onClick={() => onSyncBehavior(pet.id)}>Sync behavior</button>
    </div>
    <Ranges prefix={pet.name} pet={pet} onChange={(key, value) => onUpdatePet(pet.id, { [key]: value } as Partial<PetProfile>)} />
  </article>;
}

function Ranges({ prefix, pet, onChange }: { prefix: string; pet: PetProfile; onChange: (key: "size" | "speed" | "energy", value: number) => void }) {
  return <div className="control-ranges">{(Object.keys(PET_CONTROL_RANGES) as Array<"size" | "speed" | "energy">).map((key) => {
    const range = PET_CONTROL_RANGES[key];
    const label = key === "size" ? "Size" : key === "speed" ? "Pace" : "Energy";
    return <label key={key}><span>{label}<strong>{Math.round(pet[key] * 100)}%</strong></span><input type="range" aria-label={`${label} ${prefix}`} min={range.min} max={range.max} step={range.step} value={pet[key]} onChange={(event) => onChange(key, Number(event.target.value))} /></label>;
  })}</div>;
}

export { Ranges };
