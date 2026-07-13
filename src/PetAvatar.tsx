import type { ReactNode } from "react";
import { CatWalkRig } from "./avatars/CatWalkRig";
import type { Behavior, PetProfile } from "./types";

interface PetAvatarProps {
  pet: PetProfile;
  behavior?: Behavior;
  compact?: boolean;
}

const outline = "#704c35";
const face = "#563927";

// Behaviors that move the cat across the desktop use the side-profile walk rig;
// everything else keeps the approved front-facing sticker.
const LOCOMOTION: Behavior[] = ["walk", "chase", "stalk", "pounce", "zoomies", "climb"];
function isLocomotion(behavior: Behavior) {
  return LOCOMOTION.includes(behavior);
}

export function PetAvatar({ pet, behavior = "idle", compact = false }: PetAvatarProps) {
  const props = { pet, behavior, compact };

  switch (pet.avatar) {
    case "mochi":
      return isLocomotion(behavior) && !compact ? (
        <CatWalkRig pet={pet} markings="mochi" behavior={behavior} />
      ) : (
        <MochiAvatar {...props} />
      );
    case "biscuit":
      return isLocomotion(behavior) && !compact ? (
        <CatWalkRig pet={pet} markings="biscuit" behavior={behavior} />
      ) : (
        <BiscuitAvatar {...props} />
      );
    case "punching-bag":
      return <PunchingBag {...props} />;
    case "keyboard-buddy":
      return <KeyboardBuddy {...props} />;
    case "capybara":
    case "snack-capybara":
      return <CapybaraBuddy {...props} />;
    case "elephant":
      return <ElephantBuddy {...props} />;
    case "blue-monster":
      return <BlueMonster {...props} />;
    case "raccoon":
      return <RaccoonBuddy {...props} />;
    case "yorkie":
      return <YorkieBuddy {...props} />;
    default:
      return <PatchCat {...props} />;
  }
}

function SvgShell({
  label,
  compact,
  children
}: {
  label: string;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <svg className="pet-svg sticker-pet" viewBox="0 0 180 150" role="img" aria-label={label}>
      {!compact && <ellipse className="soft-shadow" cx="92" cy="132" rx="52" ry="9" />}
      {children}
    </svg>
  );
}

const nosePink = "#e8949c";
const innerEarPink = "#f0b6ae";
const blushPink = "#f5b8ac";
const pawPadPink = "#ef9f9b";

function CatWhiskers() {
  return (
    <g stroke={outline} strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
      <path d="M26 82 L46 85" />
      <path d="M27 94 L46 92" />
      <path d="M154 82 L134 85" />
      <path d="M153 94 L134 92" />
    </g>
  );
}

function CatPaw({ x, color, wide = false }: { x: number; color: string; wide?: boolean }) {
  const width = wide ? 42 : 34;
  const mid = x + width / 2;
  return (
    <g>
      <rect x={x} y="107" width={width} height="23" rx="11.5" fill={color} stroke={outline} strokeWidth="5" />
      <circle cx={mid - 8} cy="119" r="2.8" fill={pawPadPink} />
      <circle cx={mid} cy="116" r="2.8" fill={pawPadPink} />
      <circle cx={mid + 8} cy="119" r="2.8" fill={pawPadPink} />
    </g>
  );
}

function MochiAvatar({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";
  const watch = behavior === "watch";
  const poseClass = `mochi-avatar japanese-bobtail pose-${behavior}${behavior === "walk" ? " pet-walk-body" : ""}`;
  const eyeR = watch ? 8.5 : 6.5;

  return (
    <SvgShell label={`${pet.name} ${pet.breedLabel}`} compact={compact}>
      <g className={poseClass}>
        {/* compact pom tail, the defining Japanese Bobtail silhouette */}
        <g className="bobtail-tail">
          <path d="M120 116 C139 120 146 109 139 99" fill="none" stroke={outline} strokeWidth="18" strokeLinecap="round" />
          <path d="M120 116 C139 120 146 109 139 99" fill="none" stroke={pet.secondaryColor} strokeWidth="11" strokeLinecap="round" />
        </g>
        {/* chunky white sitting body */}
        <path d="M56 130 C47 101 62 78 90 78 C118 78 133 101 124 130 C110 134 70 134 56 130Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path className="calico-patch calico-patch-orange" d="M57 99 C62 84 72 80 82 83 C85 94 78 105 63 110Z" fill={pet.secondaryColor} />
        <path className="calico-patch calico-patch-charcoal" d="M107 83 C120 88 126 103 123 116 C111 114 104 101 107 83Z" fill={pet.accentColor} />
        {/* haunch hints */}
        <path d="M61 104 C56 112 56 121 61 128" fill="none" stroke={outline} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
        <path d="M119 104 C124 112 124 121 119 128" fill="none" stroke={outline} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
        {/* white front legs, black toe spots on his right paw like the photos */}
        <rect x="72" y="100" width="13" height="32" rx="6.5" fill={pet.primaryColor} stroke={outline} strokeWidth="3.5" />
        <rect x="95" y="100" width="13" height="32" rx="6.5" fill={pet.primaryColor} stroke={outline} strokeWidth="3.5" />
        <path d="M78.5 126 L78.5 130" stroke={outline} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        <path d="M101.5 126 L101.5 130" stroke={outline} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
        <circle cx="99" cy="123" r="2.2" fill="#3d3a36" />
        <circle cx="105.5" cy="121" r="1.8" fill="#3d3a36" />
        {/* white ears */}
        <path d="M58 34 L63 12 L82 24Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M122 34 L117 12 L98 24Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M64 28 L66 17 L76 24Z" fill={innerEarPink} />
        <path d="M116 28 L114 17 L104 24Z" fill={innerEarPink} />
        {/* white head — his face is all white */}
        <path d="M54 56 C54 32 69 20 90 20 C111 20 126 32 126 56 C126 76 111 87 90 87 C69 87 54 76 54 56Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* dark crown patch between the ears only */}
        <path className="calico-patch" d="M70 24 C77 17 103 17 110 24 C108 34 100 39 90 38 C80 39 72 34 70 24Z" fill={pet.accentColor} />
        <path className="calico-patch" d="M99 22 C105 21 109 23 110 25 C108 31 104 34 99 36Z" fill={pet.secondaryColor} />
        <path d="M82 26 L80 19 M98 26 L100 19" stroke={pet.accentColor} strokeWidth="3.5" strokeLinecap="round" />
        {/* face */}
        {sleeping ? (
          <>
            <path d="M66 54 C70 59 79 59 83 54" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M97 54 C101 59 110 59 114 54" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="75" cy="54" r={eyeR} fill={pet.eyeColor} />
            <circle cx="105" cy="54" r={eyeR} fill={pet.eyeColor} />
            <circle cx="77.5" cy="51.5" r="2.4" fill="#ffffff" />
            <circle cx="107.5" cy="51.5" r="2.4" fill="#ffffff" />
          </>
        )}
        <path d="M86 63 C88.5 61.5 91.5 61.5 94 63 C92.5 67 87.5 67 86 63Z" fill={nosePink} />
        <path d="M90 66 C88.5 70.5 84.5 71.5 81 69" fill="none" stroke={face} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M90 66 C91.5 70.5 95.5 71.5 99 69" fill="none" stroke={face} strokeWidth="2.8" strokeLinecap="round" />
        <ellipse cx="63" cy="64" rx="7" ry="4.5" fill={blushPink} opacity="0.55" />
        <ellipse cx="117" cy="64" rx="7" ry="4.5" fill={blushPink} opacity="0.55" />
        <g stroke={outline} strokeWidth="2.2" strokeLinecap="round" opacity="0.5">
          <path d="M40 54 L56 57" />
          <path d="M41 64 L56 63" />
          <path d="M140 54 L124 57" />
          <path d="M139 64 L124 63" />
        </g>
      </g>
    </SvgShell>
  );
}

function BiscuitAvatar({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";
  const stretch = behavior === "stretch";
  const poseClass = `biscuit-avatar maine-coon pose-${behavior}${behavior === "walk" ? " pet-walk-body" : ""}`;
  const eyesClosed = sleeping || stretch;
  const white = "#fffdf6";
  const headPath = "M54 56 C54 32 69 20 90 20 C111 20 126 32 126 56 C126 76 111 87 90 87 C69 87 54 76 54 56Z";

  return (
    <SvgShell label={`${pet.name} ${pet.breedLabel}`} compact={compact}>
      <g className={poseClass}>
        {/* orange tabby tail wrapped around the right */}
        <path className="fluffy-tail" d="M116 121 C151 132 170 111 160 82" fill="none" stroke={outline} strokeWidth="21" strokeLinecap="round" />
        <path className="fluffy-tail" d="M116 121 C151 132 170 111 160 82" fill="none" stroke={pet.secondaryColor} strokeWidth="14" strokeLinecap="round" />
        <path d="M137 118 L140 109 M149 113 L154 105 M158 102 L164 97" stroke={pet.accentColor} strokeWidth="3.5" strokeLinecap="round" />
        {/* broad, fluffy Maine Coon body */}
        <path d="M53 130 C44 99 60 73 90 73 C120 73 136 99 127 130 C112 135 68 135 53 130Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* orange mantle over his shoulders and sides */}
        <path d="M64 82 C56 96 54 113 58 127 C64 124 69 108 70 88 C68 85 66 83 64 82Z" fill={pet.secondaryColor} />
        <path d="M116 82 C124 96 126 113 122 127 C116 124 111 108 110 88 C112 85 114 83 116 82Z" fill={pet.secondaryColor} />
        <path d="M61 100 L67 102 M60 112 L66 113 M119 100 L113 102 M120 112 L114 113" stroke={pet.accentColor} strokeWidth="3" strokeLinecap="round" />
        {!stretch && (
          <>
            {/* white front legs */}
            <rect x="72" y="99" width="13" height="33" rx="6.5" fill={white} stroke={outline} strokeWidth="3.5" />
            <rect x="95" y="99" width="13" height="33" rx="6.5" fill={white} stroke={outline} strokeWidth="3.5" />
            <path d="M78.5 126 L78.5 130" stroke={outline} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
            <path d="M101.5 126 L101.5 130" stroke={outline} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
          </>
        )}
        {/* orange ears */}
        <path d="M58 34 L63 12 L82 24Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M122 34 L117 12 L98 24Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M64 28 L66 17 L76 24Z" fill={innerEarPink} />
        <path d="M116 28 L114 17 L104 24Z" fill={innerEarPink} />
        {/* head — orange crown with a cream lower face */}
        <path d={headPath} fill={white} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path className="orange-crown" d="M56 43 C61 27 73 20 90 20 C107 20 119 27 124 43 C114 39 103 37 90 37 C77 37 66 39 56 43Z" fill={pet.secondaryColor} />
        <path d={headPath} fill="none" stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path className="maine-coon-ruff" d="M59 73 L67 91 L75 84 L90 96 L105 84 L113 91 L121 73 C113 84 104 89 90 89 C76 89 67 84 59 73Z" fill={pet.primaryColor} stroke={outline} strokeWidth="3" strokeLinejoin="round" />
        <g className="ear-tufts" fill={pet.accentColor}>
          <path d="M62 14 L65 2 L70 16Z" /><path d="M110 16 L116 2 L119 15Z" />
        </g>
        {/* subtle orange tabby forehead and cheek stripes */}
        <path className="tabby-face-stripes" d="M80 31 L78 23 M90 33 L90 24 M100 31 L102 23 M61 49 L69 46 M119 49 L111 46 M60 57 L68 55 M120 57 L112 55" stroke={pet.accentColor} strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* white muzzle */}
        <ellipse className="cream-muzzle" cx="90" cy="72" rx="19" ry="12" fill={white} />
        {/* face */}
        {eyesClosed ? (
          <>
            <path d={stretch ? "M66 55 C70 50 79 50 83 55" : "M66 54 C70 59 79 59 83 54"} fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
            <path d={stretch ? "M97 55 C101 50 110 50 114 55" : "M97 54 C101 59 110 59 114 54"} fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="75" cy="54" r="6.5" fill={pet.eyeColor} />
            <circle cx="105" cy="54" r="6.5" fill={pet.eyeColor} />
            <circle cx="77.5" cy="51.5" r="2.4" fill="#ffffff" />
            <circle cx="107.5" cy="51.5" r="2.4" fill="#ffffff" />
          </>
        )}
        <path d="M86 65 C88.5 63.5 91.5 63.5 94 65 C92.5 69 87.5 69 86 65Z" fill={nosePink} />
        <path d="M90 68 C88.5 72.5 84.5 73.5 81 71" fill="none" stroke={face} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M90 68 C91.5 72.5 95.5 73.5 99 71" fill="none" stroke={face} strokeWidth="2.8" strokeLinecap="round" />
        <ellipse cx="63" cy="64" rx="7" ry="4.5" fill={blushPink} opacity="0.55" />
        <ellipse cx="117" cy="64" rx="7" ry="4.5" fill={blushPink} opacity="0.55" />
        <g stroke={outline} strokeWidth="2.2" strokeLinecap="round" opacity="0.5">
          <path d="M40 54 L56 57" />
          <path d="M41 64 L56 63" />
          <path d="M140 54 L124 57" />
          <path d="M139 64 L124 63" />
        </g>
        {stretch && (
          <>
            {/* big morning stretch — front legs straight up past his ears */}
            <path d="M64 92 C55 70 53 48 58 28" fill="none" stroke={outline} strokeWidth="17" strokeLinecap="round" />
            <path d="M64 92 C55 70 53 48 58 28" fill="none" stroke={white} strokeWidth="11.5" strokeLinecap="round" />
            <path d="M116 92 C125 70 127 48 122 28" fill="none" stroke={outline} strokeWidth="17" strokeLinecap="round" />
            <path d="M116 92 C125 70 127 48 122 28" fill="none" stroke={white} strokeWidth="11.5" strokeLinecap="round" />
            <path d="M55 30 L61 26 M119 26 L125 30" stroke={outline} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
          </>
        )}
      </g>
    </SvgShell>
  );
}

function PatchCat({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} patch cat`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        {/* ears: orange left, brown right */}
        <path d="M46 54 L55 18 L88 38Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M134 54 L125 18 L92 38Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M56 45 L60 30 L74 38Z" fill={innerEarPink} />
        <path d="M124 45 L120 30 L106 38Z" fill={innerEarPink} />
        {/* white head */}
        <path d="M38 84 C38 50 60 32 90 32 C120 32 142 50 142 84 C142 112 119 127 90 127 C61 127 38 112 38 84Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* calico patches: orange over the left ear + eye, brown on the right crown */}
        <path d="M42 66 C42 46 56 35 74 35 C84 40 87 52 82 62 C74 74 54 76 42 66Z" fill={pet.secondaryColor} />
        <ellipse cx="64" cy="73" rx="15" ry="13" fill={pet.secondaryColor} opacity="0.95" />
        <path d="M98 39 C114 33 128 39 136 53 C137 62 130 67 120 64 C108 59 100 50 98 39Z" fill={pet.accentColor} />
        {/* face */}
        {sleeping ? (
          <>
            <path d="M56 76 C61 82 71 82 76 76" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M104 76 C109 82 119 82 124 76" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="66" cy="75" r="8.5" fill={pet.eyeColor} />
            <circle cx="114" cy="75" r="8.5" fill={pet.eyeColor} />
            <circle cx="69" cy="72" r="3" fill="#ffffff" />
            <circle cx="117" cy="72" r="3" fill="#ffffff" />
          </>
        )}
        <path d="M85 88 C88 86 92 86 95 88 C93 93 87 93 85 88Z" fill={nosePink} />
        <path d="M90 92 C88 97 83 98 79 95" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <path d="M90 92 C92 97 97 98 101 95" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="50" cy="93" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <ellipse cx="130" cy="93" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <CatWhiskers />
        {/* white peeking paws with toe beans */}
        <CatPaw x={45} color={pet.primaryColor} />
        <CatPaw x={101} color={pet.primaryColor} />
      </g>
    </SvgShell>
  );
}

function KeyboardBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} keyboard buddy`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        {/* small round ears */}
        <circle cx="60" cy="33" r="11" fill={pet.primaryColor} stroke={outline} strokeWidth="5" />
        <circle cx="120" cy="33" r="11" fill={pet.primaryColor} stroke={outline} strokeWidth="5" />
        <circle cx="60" cy="34" r="4.5" fill={pet.accentColor} opacity="0.75" />
        <circle cx="120" cy="34" r="4.5" fill={pet.accentColor} opacity="0.75" />
        {/* chubby capybara head + body */}
        <path d="M42 78 C42 44 62 25 90 25 C118 25 138 44 138 78 C138 100 124 112 90 112 C56 112 42 100 42 78Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* sleepy content face */}
        {sleeping ? (
          <>
            <path d="M58 64 C63 70 73 70 78 64" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M102 64 C107 70 117 70 122 64" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M58 66 C63 61 73 61 78 66" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M102 66 C107 61 117 61 122 66" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {/* oval muzzle with nostrils */}
        <ellipse cx="90" cy="80" rx="17" ry="12" fill={pet.secondaryColor} opacity="0.9" />
        <path d="M84 76 L84 81 M96 76 L96 81" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M85 88 C88 91 92 91 95 88" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="52" cy="80" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <ellipse cx="128" cy="80" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        {/* stubby paws tucked behind the keyboard */}
        <rect x="54" y="94" width="16" height="16" rx="7" fill={pet.primaryColor} stroke={outline} strokeWidth="4" />
        <rect x="110" y="94" width="16" height="16" rx="7" fill={pet.primaryColor} stroke={outline} strokeWidth="4" />
        {/* pastel keyboard in front */}
        <rect x="28" y="102" width="124" height="28" rx="9" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" />
        {Array.from({ length: 16 }).map((_, index) => {
          const col = index % 8;
          const row = Math.floor(index / 8);
          return <rect key={index} x={36 + col * 14 + row * 5} y={107 + row * 10} width="11" height="7" rx="2" fill="#fff2d8" stroke="#c6862e" strokeWidth="1.5" />;
        })}
      </g>
    </SvgShell>
  );
}

function CapybaraBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} capybara`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        {/* pink cushion */}
        <ellipse cx="90" cy="115" rx="58" ry="14" fill="#f6b0a2" stroke={outline} strokeWidth="5" />
        {/* tiny ears */}
        <path d="M62 36 C57 26 65 18 74 23 C76 31 70 38 62 36Z" fill={pet.primaryColor} stroke={outline} strokeWidth="4" strokeLinejoin="round" />
        <path d="M118 36 C123 26 115 18 106 23 C104 31 110 38 118 36Z" fill={pet.primaryColor} stroke={outline} strokeWidth="4" strokeLinejoin="round" />
        {/* pear-shaped capybara body */}
        <path d="M52 72 C52 44 68 28 90 28 C112 28 128 44 128 72 C132 96 118 118 90 118 C62 118 48 96 52 72Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* relaxed sleepy eyes */}
        {sleeping ? (
          <>
            <path d="M62 62 C67 68 77 68 82 62" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M98 62 C103 68 113 68 118 62" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M64 64 C69 60 75 60 80 64" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M100 64 C105 60 111 60 116 64" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        )}
        {/* oval muzzle with nostrils */}
        <ellipse cx="90" cy="82" rx="20" ry="14" fill={pet.secondaryColor} opacity="0.85" />
        <path d="M83 78 L83 84 M97 78 L97 84" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M85 91 C88 94 92 94 95 91" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="56" cy="78" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <ellipse cx="124" cy="78" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        {/* front paws folded on the belly */}
        <path d="M74 102 C80 108 86 109 90 105" fill="none" stroke={outline} strokeWidth="5" strokeLinecap="round" />
        <path d="M106 102 C100 108 94 109 90 105" fill="none" stroke={outline} strokeWidth="5" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}

function ElephantBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} elephant`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        {/* big ears at the sides */}
        <ellipse cx="36" cy="76" rx="23" ry="28" fill={pet.primaryColor} stroke={outline} strokeWidth="5" />
        <ellipse cx="144" cy="76" rx="23" ry="28" fill={pet.primaryColor} stroke={outline} strokeWidth="5" />
        <ellipse cx="38" cy="77" rx="13" ry="18" fill={pet.secondaryColor} />
        <ellipse cx="142" cy="77" rx="13" ry="18" fill={pet.secondaryColor} />
        {/* round head */}
        <path d="M46 80 C46 48 66 32 90 32 C114 32 134 48 134 80 C134 106 116 120 90 120 C64 120 46 106 46 80Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* big round eyes */}
        {sleeping ? (
          <>
            <path d="M62 68 C67 74 77 74 82 68" fill="none" stroke={pet.eyeColor} strokeWidth="4" strokeLinecap="round" />
            <path d="M98 68 C103 74 113 74 118 68" fill="none" stroke={pet.eyeColor} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="70" cy="68" r="8" fill={pet.eyeColor} />
            <circle cx="110" cy="68" r="8" fill={pet.eyeColor} />
            <circle cx="73" cy="65" r="2.8" fill="#ffffff" />
            <circle cx="113" cy="65" r="2.8" fill="#ffffff" />
          </>
        )}
        <ellipse cx="56" cy="84" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <ellipse cx="124" cy="84" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        {/* trunk curling down from the face center */}
        <path d="M90 80 C90 94 94 106 104 110 C111 113 115 108 112 102" fill="none" stroke={outline} strokeWidth="17" strokeLinecap="round" />
        <path d="M90 80 C90 94 94 106 104 110 C111 113 115 108 112 102" fill="none" stroke={pet.primaryColor} strokeWidth="11" strokeLinecap="round" />
        <path d="M85 90 L94 90 M86 99 L95 100" stroke={pet.accentColor} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        {/* front feet */}
        <rect x="52" y="106" width="30" height="22" rx="11" fill={pet.primaryColor} stroke={outline} strokeWidth="5" />
        <rect x="98" y="106" width="30" height="22" rx="11" fill={pet.primaryColor} stroke={outline} strokeWidth="5" />
        <path d="M62 121 L62 126 M72 121 L72 126 M108 121 L108 126 M118 121 L118 126" stroke={pet.accentColor} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      </g>
    </SvgShell>
  );
}

function BlueMonster({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} tiny horn blob`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        {/* single little horn */}
        <path d="M94 36 L103 12 L116 32Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* stubby arms */}
        <path d="M50 88 C38 92 34 100 40 108" fill="none" stroke={outline} strokeWidth="15" strokeLinecap="round" />
        <path d="M50 88 C38 92 34 100 40 108" fill="none" stroke={pet.primaryColor} strokeWidth="9" strokeLinecap="round" />
        <path d="M130 88 C142 92 146 100 140 108" fill="none" stroke={outline} strokeWidth="15" strokeLinecap="round" />
        <path d="M130 88 C142 92 146 100 140 108" fill="none" stroke={pet.primaryColor} strokeWidth="9" strokeLinecap="round" />
        {/* round teal blob body */}
        <path d="M44 84 C44 50 64 32 90 32 C116 32 136 50 136 84 C136 112 116 126 90 126 C64 126 44 112 44 84Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* big white eyes with dark pupils */}
        {sleeping ? (
          <>
            <path d="M60 68 C66 75 74 75 80 68" fill="none" stroke={pet.eyeColor} strokeWidth="4" strokeLinecap="round" />
            <path d="M100 68 C106 75 114 75 120 68" fill="none" stroke={pet.eyeColor} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="70" cy="68" r="13" fill={pet.secondaryColor} stroke={outline} strokeWidth="4" />
            <circle cx="110" cy="68" r="13" fill={pet.secondaryColor} stroke={outline} strokeWidth="4" />
            <circle cx="73" cy="70" r="5.5" fill={pet.eyeColor} />
            <circle cx="107" cy="70" r="5.5" fill={pet.eyeColor} />
            <circle cx="75" cy="68" r="2" fill="#ffffff" />
            <circle cx="109" cy="68" r="2" fill="#ffffff" />
          </>
        )}
        {/* happy open mouth with little fangs */}
        <path d="M74 92 C80 103 100 103 106 92 C96 89 84 89 74 92Z" fill="#3f6d78" stroke={outline} strokeWidth="4" strokeLinejoin="round" />
        <path d="M79 92 L83 97 L86 92Z" fill="#ffffff" />
        <path d="M94 92 L97 97 L101 92Z" fill="#ffffff" />
        <ellipse cx="54" cy="88" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <ellipse cx="126" cy="88" rx="8" ry="5" fill={blushPink} opacity="0.55" />
      </g>
    </SvgShell>
  );
}

function RaccoonBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} raccoon`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        {/* ringed tail curling out from behind the head */}
        <path d="M134 102 C166 98 174 70 152 56" fill="none" stroke={outline} strokeWidth="17" strokeLinecap="round" />
        <path d="M134 102 C166 98 174 70 152 56" fill="none" stroke={pet.primaryColor} strokeWidth="11" strokeLinecap="round" />
        <path d="M156 95 L169 90 M162 78 L173 71" stroke={pet.secondaryColor} strokeWidth="9" strokeLinecap="round" />
        {/* small ears */}
        <path d="M46 54 L55 18 L88 38Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M134 54 L125 18 L92 38Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M56 45 L60 30 L74 38Z" fill={innerEarPink} />
        <path d="M124 45 L120 30 L106 38Z" fill={innerEarPink} />
        {/* gray-brown head */}
        <path d="M38 84 C38 50 60 32 90 32 C120 32 142 50 142 84 C142 112 119 127 90 127 C61 127 38 112 38 84Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* dark bandit mask across the eyes */}
        <path d="M46 70 C56 54 78 54 88 68 C89 79 80 86 68 84 C56 82 48 78 46 70Z" fill={pet.secondaryColor} />
        <path d="M134 70 C124 54 102 54 92 68 C91 79 100 86 112 84 C124 82 132 78 134 70Z" fill={pet.secondaryColor} />
        {/* light muzzle */}
        <ellipse cx="90" cy="98" rx="21" ry="14" fill="#f3e8d4" />
        {/* white eyes inside the mask */}
        {sleeping ? (
          <>
            <path d="M58 70 C63 76 73 76 78 70" fill="none" stroke="#fff7e6" strokeWidth="4" strokeLinecap="round" />
            <path d="M102 70 C107 76 117 76 122 70" fill="none" stroke="#fff7e6" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="68" cy="70" r="7" fill="#fff7e6" />
            <circle cx="112" cy="70" r="7" fill="#fff7e6" />
            <circle cx="69" cy="71" r="3.5" fill={pet.eyeColor} />
            <circle cx="111" cy="71" r="3.5" fill={pet.eyeColor} />
          </>
        )}
        <path d="M85 92 C88 90 92 90 95 92 C93 97 87 97 85 92Z" fill={face} />
        <path d="M90 96 C88 101 83 102 79 99" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <path d="M90 96 C92 101 97 102 101 99" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="50" cy="94" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <ellipse cx="130" cy="94" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        {/* front paws with toe beans */}
        <CatPaw x={45} color={pet.primaryColor} />
        <CatPaw x={101} color={pet.primaryColor} />
      </g>
    </SvgShell>
  );
}

function PunchingBag({ pet, behavior, compact }: Required<PetAvatarProps>) {
  return (
    <SvgShell label={`${pet.name} training buddy`} compact={compact}>
      <g className={behavior === "walk" || behavior === "jump" ? "pet-walk-body" : undefined}>
        {/* dark rounded base stand */}
        <ellipse cx="90" cy="121" rx="32" ry="8" fill={pet.accentColor} stroke={outline} strokeWidth="5" />
        <path d="M72 119 C72 106 108 106 108 119" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* narrow neck */}
        <path d="M84 92 L80 110 L100 110 L96 92Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* round yellow balloon */}
        <path d="M50 56 C50 32 68 16 90 16 C112 16 130 32 130 56 C130 78 114 94 90 94 C66 94 50 78 50 56Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <ellipse cx="72" cy="32" rx="9" ry="6" fill="#fff8dd" opacity="0.7" />
        {/* happy face above the banner */}
        <circle cx="78" cy="34" r="3" fill={pet.eyeColor} />
        <circle cx="102" cy="34" r="3" fill={pet.eyeColor} />
        <path d="M84 39 C88 43 92 43 96 39" fill="none" stroke={pet.eyeColor} strokeWidth="3" strokeLinecap="round" />
        {/* BOXING banner */}
        <rect x="50" y="48" width="80" height="24" rx="7" fill={pet.secondaryColor} stroke={outline} strokeWidth="4" />
        <text x="90" y="65" textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="1.5" fill="#fff8e6">
          BOXING
        </text>
      </g>
    </SvgShell>
  );
}

function YorkieBuddy({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";

  return (
    <SvgShell label={`${pet.name} yorkie`} compact={compact}>
      <g className={behavior === "walk" ? "pet-walk-body" : undefined}>
        {/* perky triangle ears with accent tips */}
        <path d="M46 54 L55 18 L88 38Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M134 54 L125 18 L92 38Z" fill={pet.accentColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M56 45 L60 30 L74 38Z" fill={innerEarPink} />
        <path d="M124 45 L120 30 L106 38Z" fill={innerEarPink} />
        {/* brown head */}
        <path d="M38 84 C38 50 60 32 90 32 C120 32 142 50 142 84 C142 112 119 127 90 127 C61 127 38 112 38 84Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        {/* tan muzzle + eyebrow dots */}
        <ellipse cx="90" cy="95" rx="23" ry="16" fill={pet.secondaryColor} />
        <circle cx="66" cy="59" r="4" fill={pet.secondaryColor} />
        <circle cx="114" cy="59" r="4" fill={pet.secondaryColor} />
        {/* face */}
        {sleeping ? (
          <>
            <path d="M56 74 C61 80 71 80 76 74" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M104 74 C109 80 119 80 124 74" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="66" cy="73" r="7.5" fill={pet.eyeColor} />
            <circle cx="114" cy="73" r="7.5" fill={pet.eyeColor} />
            <circle cx="69" cy="70" r="2.8" fill="#ffffff" />
            <circle cx="117" cy="70" r="2.8" fill="#ffffff" />
          </>
        )}
        {/* button nose, happy mouth and tongue */}
        <ellipse cx="90" cy="88" rx="6" ry="4.5" fill={pet.accentColor} />
        <path d="M90 92 C88 97 83 98 79 95" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <path d="M90 92 C92 97 97 98 101 95" fill="none" stroke={face} strokeWidth="3" strokeLinecap="round" />
        <path d="M85 98 C85 105 95 105 95 98 C92 96 88 96 85 98Z" fill={nosePink} />
        <ellipse cx="50" cy="93" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        <ellipse cx="130" cy="93" rx="8" ry="5" fill={blushPink} opacity="0.55" />
        {/* front paws with toe beans */}
        <CatPaw x={45} color={pet.primaryColor} />
        <CatPaw x={101} color={pet.primaryColor} />
      </g>
    </SvgShell>
  );
}
