import { useRef, useState, type PointerEvent } from "react";
import { PetAvatar } from "../PetAvatar";
import type { PetProfile } from "../types";

export interface CompanionRailProps {
  companions: PetProfile[];
  onSpawnDrag: (id: string) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}

const DRAG_THRESHOLD = 6;

export function CompanionRail({ companions, onSpawnDrag, onToggleSummoned }: CompanionRailProps) {
  return (
    <aside className="companion-rail" aria-label="Companion rail">
      {companions.map((pet) => (
        <RailPet key={pet.id} pet={pet} onSpawnDrag={onSpawnDrag} onToggleSummoned={onToggleSummoned} />
      ))}
    </aside>
  );
}

function RailPet({ pet, onSpawnDrag, onToggleSummoned }: {
  pet: PetProfile;
  onSpawnDrag: (id: string) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const crossedThreshold = useRef(false);
  const suppressClick = useRef(false);

  const finishDrag = (event: PointerEvent<HTMLSpanElement>, cancelled: boolean) => {
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}

    if (!cancelled && crossedThreshold.current) {
      suppressClick.current = true;
      onSpawnDrag(pet.id);
    } else {
      suppressClick.current = false;
    }

    origin.current = null;
    crossedThreshold.current = false;
    setDragging(false);
  };

  return (
    <button
      type="button"
      className="rail-pet"
      aria-label={`${pet.summoned ? "Hide" : "Summon"} ${pet.name} ${pet.summoned ? "from" : "to"} desktop`}
      aria-pressed={pet.summoned}
      title={`${pet.summoned ? "Hide" : "Summon"} ${pet.name} ${pet.summoned ? "from" : "to"} desktop`}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onToggleSummoned(pet.id, !pet.summoned);
      }}
    >
      <span
        className={`drag-bubble${dragging ? " dragging" : ""}`}
        aria-label={`Drag ${pet.name} to desktop`}
        title={`Drag ${pet.name} to desktop`}
        onPointerDown={(event) => {
          origin.current = { x: event.clientX, y: event.clientY };
          crossedThreshold.current = false;
          suppressClick.current = false;
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
        }}
        onPointerMove={(event) => {
          if (!origin.current || crossedThreshold.current) return;
          const distance = Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y);
          if (distance > DRAG_THRESHOLD) {
            crossedThreshold.current = true;
            setDragging(true);
          }
        }}
        onPointerUp={(event) => finishDrag(event, false)}
        onPointerCancel={(event) => finishDrag(event, true)}
      >
        <PetAvatar pet={pet} compact />
      </span>
      <span className="rail-copy">
        <span className="rail-name">{pet.name}</span>
        <span className="rail-status">{pet.summoned ? "On desktop" : "Hidden"}</span>
      </span>
    </button>
  );
}
