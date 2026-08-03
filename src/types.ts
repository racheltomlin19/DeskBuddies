export type Species = "cat" | "dog" | "capybara" | "elephant" | "raccoon" | "monster" | "object" | "mushroom";

export type Pattern =
  | "patch-cat"
  | "calico"
  | "calico-bobtail"
  | "keyboard-buddy"
  | "capybara"
  | "snack-capybara"
  | "elephant"
  | "raccoon"
  | "blue-monster"
  | "punching-bag"
  | "tabby"
  | "cream-orange-tabby"
  | "tuxedo"
  | "yorkie"
  | "shroomie"
  | "gus"
  | "kudo";

export type AuthoredAvatar = "mochi" | "biscuit";
export type AvatarId = Pattern | AuthoredAvatar;
export type CompanionKind = "custom" | "catalog";
export type PopoutTab = "notes" | "tasks" | "timer";
export type RoamMode = "screen" | "ground";
export type HeldMode = "walk" | "sit" | "sleep" | null;
export type Behavior =
  | "idle"
  | "walk"
  | "sit"
  | "sleep"
  | "stretch"
  | "watch"
  | "jump"
  | "fall"
  | "drag"
  | "chase"
  | "stalk"
  | "pounce"
  | "toss"
  | "zoomies"
  | "climb"
  | "perch"
  | "greet"
  | "come"
  | "react";

export interface PersonalityWeights {
  idleWeight: number;
  walkWeight: number;
  sitWeight: number;
  sleepWeight: number;
  stretchWeight: number;
  watchWeight: number;
  jumpWeight: number;
  wanderBias: number;
}

export interface PetProfile {
  id: string;
  name: string;
  species: Species;
  kind: CompanionKind;
  locked: boolean;
  summoned: boolean;
  avatar: AvatarId;
  pattern: Pattern;
  breedLabel: string;
  description?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  eyeColor: string;
  size: number;
  speed: number;
  energy: number;
  personality: PersonalityWeights;
}

export interface PetRuntime {
  id: string;
  x: number;
  y: number;
  direction: 1 | -1;
  behavior: Behavior;
  vy: number;
  vx?: number;
  rotation?: number;
  phase: number;
  stateStartedAt: number;
  targetX?: number;
  targetY?: number;
  lastInteractionAt: number;
  /** When the last follow-mode pounce landed; gates re-pouncing on an idle cursor. */
  lastPounceAt?: number;
  /** When true the behavior is locked (held) and skips autonomous transitions. */
  held?: boolean;
}

export interface CompanionState {
  schemaVersion: number;
  companions: PetProfile[];
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

export interface EngineSettings {
  alwaysOnTop: boolean;
  desktopMode: boolean;
  panelOpen: boolean;
  showNames: boolean;
  physics: boolean;
  clickThrough: boolean;
  followMode: boolean;
  pounce: boolean;
  roamMode: RoamMode;
  launchAtLogin: boolean;
  globalScale: number;
  globalSpeed: number;
  companionControlsVersion: number;
}
