import type { Behavior, PetProfile } from "../types";
import chaseSprite from "../assets/gus/gus-chase.png";
import climbSprite from "../assets/gus/gus-climb.png";
import idleSprite from "../assets/gus/gus-idle.png";
import pounceSprite from "../assets/gus/gus-pounce.png";
import sleepSprite from "../assets/gus/gus-sleep.png";
import stalkSprite from "../assets/gus/gus-stalk.png";
import stretchSprite from "../assets/gus/gus-stretch.png";
import walkSprite from "../assets/gus/gus-walk.png";
import zoomiesSprite from "../assets/gus/gus-zoomies.png";

export type GusPose = "idle" | "walk" | "chase" | "stalk" | "pounce" | "zoomies" | "climb" | "sleep" | "stretch";

const POSE_SPRITES: Record<GusPose, string> = {
  idle: idleSprite,
  walk: walkSprite,
  chase: chaseSprite,
  stalk: stalkSprite,
  pounce: pounceSprite,
  zoomies: zoomiesSprite,
  climb: climbSprite,
  sleep: sleepSprite,
  stretch: stretchSprite
};

export function getGusPose(behavior: Behavior): GusPose {
  switch (behavior) {
    case "walk":
    case "come":
      return "walk";
    case "chase":
      return "chase";
    case "stalk":
      return "stalk";
    case "pounce":
    case "jump":
      return "pounce";
    case "zoomies":
      return "zoomies";
    case "climb":
      return "climb";
    case "sleep":
      return "sleep";
    case "stretch":
      return "stretch";
    default:
      return "idle";
  }
}

export function GusSprite({ pet, behavior }: { pet: PetProfile; behavior: Behavior; compact: boolean }) {
  const pose = getGusPose(behavior);

  return (
    <svg
      className="pet-svg sticker-pet gus-sprite"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={`${pet.name} ${pet.breedLabel}`}
      data-gus-pose={pose}
    >
      <image
        className="gus-sprite-image"
        href={POSE_SPRITES[pose]}
        x="32"
        y="20"
        width="960"
        height="912"
        preserveAspectRatio="xMidYMax meet"
      />
    </svg>
  );
}
