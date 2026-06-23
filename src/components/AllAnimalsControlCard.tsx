import { PET_CONTROL_RANGES } from "../companionControls";
import type { Behavior, EngineSettings, PetProfile } from "../types";
import { Ranges } from "./CompanionControlCard";

export interface AllAnimalsControlCardProps {
  pets: PetProfile[];
  settings: EngineSettings;
  onAction: (ids: string[], behavior: Behavior) => void;
  onUpdateAll: (patch: Partial<PetProfile>) => void;
  onUpdateSettings: (patch: Partial<EngineSettings>) => void;
}

export function AllAnimalsControlCard({ pets, settings, onAction, onUpdateAll, onUpdateSettings }: AllAnimalsControlCardProps) {
  const disabled = pets.length === 0;
  const sharedNumber = (key: "size" | "speed" | "energy") => {
    const first = pets[0]?.[key] ?? 1;
    return { value: first, mixed: pets.some((pet) => pet[key] !== first) };
  };
  return <article className="all-animals-control-card" aria-label="All Animals controls">
    <h2>All Animals</h2>
    <div className="control-buttons">
      <button type="button" aria-label="Pounce all cats" disabled={disabled} onClick={() => onAction(pets.filter((pet) => pet.species === "cat").map((pet) => pet.id), "stalk")}>Pounce all cats</button>
      <button type="button" aria-label="Screen roaming" disabled={disabled} onClick={() => onUpdateSettings({ roamMode: "screen" })}>Screen roaming</button>
      <button type="button" aria-label="Ground roaming" disabled={disabled} onClick={() => onUpdateSettings({ roamMode: "ground" })}>Ground roaming</button>
      <button type="button" aria-label="Follow cursor" disabled={disabled} onClick={() => onUpdateSettings({ followMode: !settings.followMode })}>Follow cursor</button>
      <button type="button" aria-label="Follow pounce" disabled={disabled} onClick={() => onUpdateSettings({ pounce: !settings.pounce })}>Follow pounce</button>
      <button type="button" aria-label="Physics" disabled={disabled} onClick={() => onUpdateSettings({ physics: !settings.physics })}>Physics</button>
      <button type="button" aria-label="Name tags" disabled={disabled} onClick={() => onUpdateSettings({ showNames: !settings.showNames })}>Name tags</button>
    </div>
    <div className="control-ranges">{(Object.keys(PET_CONTROL_RANGES) as Array<"size" | "speed" | "energy">).map((key) => {
      const label = key === "size" ? "Size" : key === "speed" ? "Pace" : "Energy";
      const range = PET_CONTROL_RANGES[key];
      const shared = sharedNumber(key);
      return <label key={key}><span>{label} <strong>{shared.mixed ? "mixed" : `${Math.round(shared.value * 100)}%`}</strong></span><input type="range" aria-label={`All animals ${label}`} disabled={disabled} min={range.min} max={range.max} step={range.step} value={shared.value} onChange={(event) => onUpdateAll({ [key]: Number(event.target.value) } as Partial<PetProfile>)} /></label>;
    })}</div>
    {disabled && <p>Summon a pet to control everyone</p>}
  </article>;
}
