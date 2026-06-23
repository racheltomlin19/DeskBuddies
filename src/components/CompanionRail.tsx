import { Check, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { PetAvatar } from "../PetAvatar";
import type { PetProfile } from "../types";

export interface CompanionRailProps { companions: PetProfile[]; onSpawnDrag: (id: string) => void; onToggleSummoned: (id: string, summoned: boolean) => void; }
const THRESHOLD = 6;

export function CompanionRail({ companions, onSpawnDrag, onToggleSummoned }: CompanionRailProps) {
  return <aside className="companion-rail" aria-label="Companion rail">{companions.map((pet) => <RailPet key={pet.id} pet={pet} onSpawnDrag={onSpawnDrag} onToggleSummoned={onToggleSummoned} />)}</aside>;
}

function RailPet({ pet, onSpawnDrag, onToggleSummoned }: { pet: PetProfile; onSpawnDrag: (id: string) => void; onToggleSummoned: (id: string, summoned: boolean) => void }) {
  const [dragging, setDragging] = useState(false); const origin = useRef<{x:number;y:number}|null>(null); const active = useRef(false);
  const end = (cancelled: boolean) => { if (active.current && !cancelled) onSpawnDrag(pet.id); active.current = false; origin.current = null; setDragging(false); };
  return <div className="rail-pet">
    <div className={`drag-bubble ${dragging ? "dragging" : ""}`} aria-label={`Drag ${pet.name} to desktop`} style={{ touchAction: "none" }} onPointerDown={(e) => { origin.current = { x: e.clientX, y: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }} onPointerMove={(e) => { if (origin.current && Math.hypot(e.clientX-origin.current.x,e.clientY-origin.current.y)>THRESHOLD) { active.current=true; setDragging(true); } }} onPointerUp={(e) => { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} end(false); }} onPointerCancel={() => end(true)}><PetAvatar pet={pet} compact /></div>
    <button type="button" aria-label={`${pet.summoned ? "Hide" : "Summon"} ${pet.name}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => onToggleSummoned(pet.id, !pet.summoned)}>{pet.summoned ? <Check /> : <Plus />}</button>
    <span>{pet.name}</span>
  </div>;
}
