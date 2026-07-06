import type { CompanionState, EngineSettings, PersonalityWeights, PetProfile, TaskItem } from "./types";

const calmCatalogPersonality: PersonalityWeights = {
  idleWeight: 4,
  walkWeight: 3,
  sitWeight: 2,
  sleepWeight: 1.4,
  stretchWeight: 0.4,
  watchWeight: 0.5,
  jumpWeight: 0.4,
  wanderBias: 0.55
};

export const customCompanions: PetProfile[] = [
  {
    id: "buddy1",
    name: "Buddy1",
    species: "cat",
    kind: "custom",
    locked: false,
    summoned: true,
    avatar: "buddy1",
    pattern: "tuxedo",
    breedLabel: "watchful house cat",
    primaryColor: "#fdfdfa",
    secondaryColor: "#6f6a62",
    accentColor: "#45413b",
    eyeColor: "#59553c",
    size: 1.02,
    speed: 0.52,
    energy: 0.33,
    personality: {
      idleWeight: 4.8,
      walkWeight: 1.6,
      sitWeight: 4.2,
      sleepWeight: 1.8,
      stretchWeight: 0.5,
      watchWeight: 4.6,
      jumpWeight: 0.35,
      wanderBias: 0.32
    }
  },
  {
    id: "buddy2",
    name: "Buddy2",
    species: "cat",
    kind: "custom",
    locked: false,
    summoned: true,
    avatar: "buddy2",
    pattern: "tabby",
    breedLabel: "orange-and-white lounger",
    primaryColor: "#fffbf2",
    secondaryColor: "#e08c3f",
    accentColor: "#bd6f2b",
    eyeColor: "#6f5c30",
    size: 1.08,
    speed: 0.82,
    energy: 0.88,
    personality: {
      idleWeight: 3.2,
      walkWeight: 1.4,
      sitWeight: 3.4,
      sleepWeight: 4.7,
      stretchWeight: 3.9,
      watchWeight: 1,
      jumpWeight: 0.25,
      wanderBias: 0.24
    }
  }
];

export const catalogCompanions: PetProfile[] = [
  {
    id: "bag",
    name: "Bag",
    species: "object",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "punching-bag",
    pattern: "punching-bag",
    breedLabel: "training buddy",
    primaryColor: "#f5c34b",
    secondaryColor: "#2f7caa",
    accentColor: "#4b4035",
    eyeColor: "#2a2520",
    size: 0.78,
    speed: 0.28,
    energy: 0.38,
    personality: calmCatalogPersonality
  },
  {
    id: "patch",
    name: "Patch",
    species: "cat",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "patch-cat",
    pattern: "patch-cat",
    breedLabel: "patch cat",
    primaryColor: "#fff7ec",
    secondaryColor: "#e19d55",
    accentColor: "#514238",
    eyeColor: "#3f3029",
    size: 0.82,
    speed: 0.68,
    energy: 0.54,
    personality: calmCatalogPersonality
  },
  {
    id: "keys",
    name: "Keys",
    species: "cat",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "keyboard-buddy",
    pattern: "keyboard-buddy",
    breedLabel: "keyboard buddy",
    primaryColor: "#d4894d",
    secondaryColor: "#f2a75c",
    accentColor: "#7b4d34",
    eyeColor: "#4d3325",
    size: 1.05,
    speed: 0.56,
    energy: 0.66,
    personality: calmCatalogPersonality
  },
  {
    id: "nibbles",
    name: "Capy",
    species: "capybara",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "capybara",
    pattern: "capybara",
    breedLabel: "capybara",
    primaryColor: "#b77a47",
    secondaryColor: "#ffd2b8",
    accentColor: "#704b32",
    eyeColor: "#4c3325",
    size: 0.96,
    speed: 0.45,
    energy: 0.48,
    personality: calmCatalogPersonality
  },
  {
    id: "peanut",
    name: "Peanut",
    species: "elephant",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "elephant",
    pattern: "elephant",
    breedLabel: "tiny elephant",
    primaryColor: "#9db6c4",
    secondaryColor: "#d9eef2",
    accentColor: "#5f7480",
    eyeColor: "#34424a",
    size: 0.98,
    speed: 0.38,
    energy: 0.44,
    personality: calmCatalogPersonality
  },
  {
    id: "sprout",
    name: "Sprout",
    species: "monster",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "blue-monster",
    pattern: "blue-monster",
    breedLabel: "tiny horn blob",
    primaryColor: "#5dd4d1",
    secondaryColor: "#f7f0ff",
    accentColor: "#8b63c7",
    eyeColor: "#3d346b",
    size: 0.82,
    speed: 0.92,
    energy: 0.92,
    personality: calmCatalogPersonality
  },
  {
    id: "bandit",
    name: "Bandit",
    species: "raccoon",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "raccoon",
    pattern: "raccoon",
    breedLabel: "ringtail buddy",
    primaryColor: "#d9c4a7",
    secondaryColor: "#5a4238",
    accentColor: "#7b5a45",
    eyeColor: "#302722",
    size: 0.92,
    speed: 0.72,
    energy: 0.62,
    personality: calmCatalogPersonality
  },
  {
    id: "yorkie",
    name: "Yorkie",
    species: "dog",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "yorkie",
    pattern: "yorkie",
    breedLabel: "yorkie terrier",
    primaryColor: "#9b6d3b",
    secondaryColor: "#d8b985",
    accentColor: "#393229",
    eyeColor: "#34261f",
    size: 0.9,
    speed: 0.58,
    energy: 0.56,
    personality: calmCatalogPersonality
  }
];

export const initialCompanionState: CompanionState = {
  schemaVersion: 2,
  companions: [...customCompanions, ...catalogCompanions]
};

export const initialPets: PetProfile[] = initialCompanionState.companions;

export const initialSettings: EngineSettings = {
  alwaysOnTop: true,
  desktopMode: false,
  panelOpen: true,
  showNames: true,
  physics: true,
  clickThrough: false,
  followMode: false,
  pounce: true,
  roamMode: "ground",
  launchAtLogin: false,
  fountain: { enabled: true, x: 0.7 },
  globalScale: 1,
  globalSpeed: 1,
  companionControlsVersion: 1
};

export const initialTasks: TaskItem[] = [
  { id: "task-water", text: "Refresh water bowls", done: false },
  { id: "task-break", text: "Take a stretch break", done: false },
  { id: "task-focus", text: "Finish one focus block", done: true }
];
