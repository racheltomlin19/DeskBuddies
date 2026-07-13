import type { Behavior, PetProfile } from "../types";

const outline = "#704c35";
const nosePink = "#e8949c";
const innerEarPink = "#f0b6ae";
const pawPadPink = "#ef9f9b";
const face = "#563927";

interface CatWalkRigProps {
  pet: PetProfile;
  markings: "mochi" | "biscuit";
  behavior?: Behavior;
}

// Locomotion behaviors get their own rig pose class; anything else walks.
const RIG_POSES: Behavior[] = ["walk", "chase", "stalk", "pounce", "zoomies", "climb"];
function poseClassFor(behavior: Behavior | undefined) {
  return behavior && RIG_POSES.includes(behavior) ? `pose-${behavior}` : "pose-walk";
}

function Leg({ className, x, coat }: { className: string; x: number; coat: string }) {
  return (
    <g className={`leg ${className}`}>
      <rect x={x} y={98} width={12} height={36} rx={6} fill={coat} stroke={outline} strokeWidth={5} />
      <ellipse cx={x + 6} cy={133} rx={8} ry={4.5} fill={coat} stroke={outline} strokeWidth={4.5} />
    </g>
  );
}

/**
 * Side-profile articulated cat, facing right. The parent flips it with scaleX
 * for the other direction. Draw order back-to-front: shadow, tail, far legs,
 * body, near legs, head. Markings switch Mochi (gray crown + gray tabby tail)
 * vs Biscuit (orange saddle/cap + orange striped tail).
 */
export function CatWalkRig({ pet, markings, behavior }: CatWalkRigProps) {
  const coat = pet.primaryColor;
  const mark = pet.secondaryColor;
  const stripe = pet.accentColor;
  const eye = pet.eyeColor;
  const farCoat = shade(coat);
  const isBiscuit = markings === "biscuit";

  return (
    <svg className="pet-svg sticker-pet" viewBox="0 0 200 150" role="img" aria-label={`${pet.name} ${pet.breedLabel}`}>
      <ellipse className="soft-shadow" cx="100" cy="140" rx="66" ry="8" />

      <g className={`rig-cat ${isBiscuit ? "maine-coon" : "japanese-bobtail"} ${poseClassFor(behavior)}`}>
        {/* tail, behind the body, sweeps up off the rump on the left */}
        <g className={`rig-tail ${isBiscuit ? "fluffy-tail" : "bobtail-tail"}`}>
          <path
            d={isBiscuit ? "M56 92 C25 94 12 67 25 40" : "M56 92 C42 92 37 84 42 77"}
            fill="none"
            stroke={outline}
            strokeWidth={isBiscuit ? 23 : 18}
            strokeLinecap="round"
          />
          <path
            d={isBiscuit ? "M56 92 C25 94 12 67 25 40" : "M56 92 C42 92 37 84 42 77"}
            fill="none"
            stroke={isBiscuit ? mark : mark}
            strokeWidth={isBiscuit ? 16 : 11}
            strokeLinecap="round"
          />
          {/* Mochi: white tail tip. Biscuit: keep orange to the tip. */}
          {/* tabby stripe rings on the tail */}
          {isBiscuit && <path d="M45 91 L41 82 M32 87 L27 78 M23 69 L16 64 M22 51 L14 47" stroke={stripe} strokeWidth="3" strokeLinecap="round" />}
        </g>

        {/* far legs (slightly darker, behind body) */}
        <Leg className="leg-back-far" x={64} coat={farCoat} />
        <Leg className="leg-front-far" x={142} coat={farCoat} />

        {/* body */}
        <g className="rig-body">
          <ellipse cx="104" cy="86" rx="54" ry="27" fill={coat} stroke={outline} strokeWidth="5" />
          {isBiscuit ? (
            /* orange saddle over the back */
            <path
              d="M62 74 C74 58 138 58 150 76 C150 90 138 96 104 96 C74 96 62 90 62 74Z"
              fill={mark}
              opacity="0.96"
            />
          ) : <>
            <path className="calico-patch" d="M62 69 C76 59 88 62 92 78 C85 91 72 94 61 87Z" fill={mark} />
            <path className="calico-patch" d="M111 62 C130 61 145 67 150 78 C143 88 132 92 119 89Z" fill={stripe} />
          </>}
          {/* subtle belly line */}
          <path d="M66 100 C86 108 122 108 142 100" fill="none" stroke={outline} strokeWidth="2.5" opacity="0.25" />
        </g>

        {/* near legs (in front of body) */}
        <Leg className="leg-back-near" x={78} coat={coat} />
        <Leg className="leg-front-near" x={154} coat={coat} />
        {/* Mochi's black toe spots on the near front paw */}
        {!isBiscuit && (
          <>
            <circle cx="157" cy="132" r="2" fill="#3d3a36" />
            <circle cx="162" cy="133" r="1.7" fill="#3d3a36" />
          </>
        )}

        {/* head, front-right */}
        <g className="rig-head">
          {isBiscuit && <g className="ear-tufts" fill={stripe}><path d="M150 32 L152 19 L158 34Z" /><path d="M185 32 L191 18 L191 36Z" /></g>}
          {/* ears */}
          <path d="M150 54 L150 30 L168 46Z" fill={coat} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M182 52 L188 30 L196 50Z" fill={coat} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
          <path d="M154 48 L154 37 L163 45Z" fill={innerEarPink} />
          <path d="M185 46 L188 37 L192 47Z" fill={innerEarPink} />
          {/* head */}
          <circle cx="167" cy="74" r="25" fill={coat} stroke={outline} strokeWidth="5" />
          {isBiscuit && <path className="maine-coon-ruff" d="M148 82 L153 104 L163 96 L171 108 L181 95 L190 100 L188 80 C183 91 177 96 168 97 C159 96 153 91 148 82Z" fill={coat} stroke={outline} strokeWidth="3" strokeLinejoin="round" />}
          {/* markings on the head */}
          {isBiscuit ? (
            <>
              {/* orange crown stops above the eye; stripes carry the tabby pattern down the face */}
              <path className="orange-crown" d="M148 60 C153 45 185 43 191 59 C180 56 158 56 148 60Z" fill={mark} opacity="0.96" />
              <path className="tabby-face-stripes" d="M160 55 L158 48 M168 55 L168 47 M176 55 L178 48 M151 67 L158 65 M151 74 L158 72 M188 66 L182 64" fill="none" stroke={stripe} strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            /* gray crown patch between the ears only */
            <path d="M156 52 C160 44 178 44 182 52 C182 60 174 62 168 62 C160 62 156 60 156 52Z" fill={mark} />
          )}
          {/* eye */}
          <circle cx="176" cy="72" r="4.6" fill={eye} />
          <circle cx="177.5" cy="70.5" r="1.4" fill="#fffdf7" />
          {/* muzzle + nose */}
          <path className={isBiscuit ? "cream-muzzle" : undefined} d="M188 80 C194 82 194 88 188 89" fill={coat} stroke={outline} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M190 83 l4 2 -4 2Z" fill={nosePink} />
          {/* mouth */}
          <path d="M188 90 C184 93 180 93 177 91" fill="none" stroke={face} strokeWidth="2.6" strokeLinecap="round" />
          {/* whiskers */}
          <g stroke={outline} strokeWidth="2" strokeLinecap="round" opacity="0.5">
            <path d="M189 84 L200 82" />
            <path d="M189 88 L200 90" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Slightly darker tint of a hex coat colour for the far-side legs (depth). */
function shade(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    return hex;
  }
  const factor = 0.88;
  const r = Math.round(parseInt(value.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(value.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(value.slice(4, 6), 16) * factor);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
