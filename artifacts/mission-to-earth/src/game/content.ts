export type OpId = "jaya" | "bodhi" | "khensu" | "aset" | "ananda" | "nefret";
export type WeaponId = "smg" | "rifle" | "shotgun" | "lmg" | "rail" | "pistol" | "needles" | "slug";

export type WeaponDef = {
  id: WeaponId;
  name: string;
  dmg: number;
  rpm: number;
  mag: number;
  pellets: number;
  spread: number;
  adsSpread: number;
  recoil: number;
  auto: boolean;
  move: number;
  reload: number;
  range: number;
  falloffStart: number;
  falloffEnd: number;
  minFalloff: number;
  structure: number;
  light: boolean;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  smg: {
    id: "smg",
    name: "KARMA-9",
    dmg: 13,
    rpm: 880,
    mag: 34,
    pellets: 1,
    spread: 0.045,
    adsSpread: 0.018,
    recoil: 0.012,
    auto: true,
    move: 1.05,
    reload: 1.55,
    range: 70,
    falloffStart: 18,
    falloffEnd: 48,
    minFalloff: 0.55,
    structure: 8,
    light: true,
  },
  rifle: {
    id: "rifle",
    name: "VEIL RIFLE",
    dmg: 24,
    rpm: 620,
    mag: 30,
    pellets: 1,
    spread: 0.02,
    adsSpread: 0.006,
    recoil: 0.018,
    auto: true,
    move: 0.96,
    reload: 1.9,
    range: 110,
    falloffStart: 40,
    falloffEnd: 90,
    minFalloff: 0.62,
    structure: 16,
    light: false,
  },
  shotgun: {
    id: "shotgun",
    name: "MANDALA 12",
    dmg: 11,
    rpm: 80,
    mag: 6,
    pellets: 8,
    spread: 0.11,
    adsSpread: 0.06,
    recoil: 0.045,
    auto: false,
    move: 0.94,
    reload: 2.3,
    range: 28,
    falloffStart: 6,
    falloffEnd: 18,
    minFalloff: 0.25,
    structure: 28,
    light: false,
  },
  lmg: {
    id: "lmg",
    name: "STONE DRUM",
    dmg: 18,
    rpm: 540,
    mag: 80,
    pellets: 1,
    spread: 0.032,
    adsSpread: 0.014,
    recoil: 0.02,
    auto: true,
    move: 0.78,
    reload: 3.1,
    range: 100,
    falloffStart: 30,
    falloffEnd: 80,
    minFalloff: 0.6,
    structure: 22,
    light: false,
  },
  rail: {
    id: "rail",
    name: "HORIZON RAIL",
    dmg: 86,
    rpm: 48,
    mag: 5,
    pellets: 1,
    spread: 0.004,
    adsSpread: 0.001,
    recoil: 0.055,
    auto: false,
    move: 0.88,
    reload: 2.5,
    range: 180,
    falloffStart: 80,
    falloffEnd: 160,
    minFalloff: 0.8,
    structure: 40,
    light: false,
  },
  pistol: {
    id: "pistol",
    name: "SIDEARM",
    dmg: 22,
    rpm: 360,
    mag: 14,
    pellets: 1,
    spread: 0.028,
    adsSpread: 0.01,
    recoil: 0.02,
    auto: false,
    move: 1.08,
    reload: 1.35,
    range: 60,
    falloffStart: 20,
    falloffEnd: 45,
    minFalloff: 0.5,
    structure: 10,
    light: true,
  },
  needles: {
    id: "needles",
    name: "NULL PAIR",
    dmg: 11,
    rpm: 1080,
    mag: 44,
    pellets: 1,
    spread: 0.032,
    adsSpread: 0.012,
    recoil: 0.007,
    auto: true,
    move: 1.14,
    reload: 1.35,
    range: 46,
    falloffStart: 12,
    falloffEnd: 34,
    minFalloff: 0.48,
    structure: 5,
    light: true,
  },
  slug: {
    id: "slug",
    name: "RA SLUG",
    dmg: 18,
    rpm: 68,
    mag: 4,
    pellets: 5,
    spread: 0.08,
    adsSpread: 0.045,
    recoil: 0.05,
    auto: false,
    move: 0.84,
    reload: 2.45,
    range: 34,
    falloffStart: 7,
    falloffEnd: 20,
    minFalloff: 0.4,
    structure: 46,
    light: false,
  },
};

export type Operator = {
  id: OpId;
  name: string;
  title: string;
  faction: "Dharma" | "Ma'at";
  role: string;
  passiveName: string;
  passive: string;
  activeName: string;
  active: string;
  ultName: string;
  ult: string;
  weapon: WeaponId;
  blurb: string;
  tone: "cyan" | "gold";
};

export const OPERATORS: Operator[] = [
  {
    id: "jaya",
    name: "Jaya",
    title: "The Echo-Stalker",
    faction: "Dharma",
    role: "Scout",
    passiveName: "Karmic Footprints",
    passive: "See where hostiles walked in the last fifteen seconds.",
    activeName: "Temporal Phase",
    active: "Vanish for three seconds and send a holo-clone downrange to draw fire.",
    ultName: "Samsara Link",
    ult: "Drop an anchor. If you would die within eight seconds, you rewind to it at half health.",
    weapon: "smg",
    blurb: "Hip-fire stitches both barrels. Slide, read the trail, and never stay where you were shot.",
    tone: "cyan",
  },
  {
    id: "bodhi",
    name: "Bodhi",
    title: "The Spatial Catalyst",
    faction: "Dharma",
    role: "Flanker",
    passiveName: "Air-Stride",
    passive: "Higher jump, a softer fall, and a brief cling when you leap off a wall.",
    activeName: "Mandala Gateway",
    active: "Place an entry, then an exit. You and your rounds pass through both.",
    ultName: "Void Collapse",
    ult: "Throw a gravity core that drags hostiles, debris, and nerve into one point.",
    weapon: "shotgun",
    blurb: "Open a door that was never there. Step through, and let the shotgun finish the sentence.",
    tone: "cyan",
  },
  {
    id: "khensu",
    name: "Khensu",
    title: "Arbiter of Stone",
    faction: "Ma'at",
    role: "Breacher",
    passiveName: "Weight of Truth",
    passive: "Immune to flinch and screen-shake. The city comes apart. You do not.",
    activeName: "Thermite Breach",
    active: "Liquefy a gate, barricade, or the squad of people standing behind it.",
    ultName: "Feather-Shield",
    ult: "A kinetic bulwark. Your fire leaves. Theirs does not come back through.",
    weapon: "lmg",
    blurb: "Walk the line, melt the wall, and hold the new angle until the drum runs dry.",
    tone: "gold",
  },
  {
    id: "aset",
    name: "Aset",
    title: "The Solar Weaver",
    faction: "Ma'at",
    role: "Marksman",
    passiveName: "Judgement Call",
    passive: "Headshots and skillshots refund a fifth of Ra's Radiance.",
    activeName: "Ra's Radiance",
    active: "Nanites flood you and any ally nearby, knitting wounds for a few seconds.",
    ultName: "Horizon Beam",
    ult: "A single solar line that cooks through concrete and whoever trusted it.",
    weapon: "rail",
    blurb: "Make the shot that changes the street. Then make the next one before they find cover.",
    tone: "gold",
  },
];

export const BLOODLINES: Operator[] = [
  {
    id: "ananda",
    name: "Ananda",
    title: "The Void Sovereign",
    faction: "Dharma",
    role: "Unstable",
    passiveName: "Frictionless",
    passive: "Slides keep their speed into a wall-run. He makes no sound Eon Dusk's signal grid can hear.",
    activeName: "Quantum Shift",
    active: "Blink forward. The vacuum yanks hostiles off their feet and blinds their optics.",
    ultName: "Cosmic Unraveling",
    ult: "A void field lifts enemy gravity and drives friendly fire and feet fifty percent harder.",
    weapon: "needles",
    blurb: "Dampener cuffs crack. The prison jumpsuit still glows. He was never meant to be in only one place.",
    tone: "cyan",
  },
  {
    id: "nefret",
    name: "Nefret",
    title: "The Solar Singularity",
    faction: "Ma'at",
    role: "Unstable",
    passiveName: "Kinetic Absorb",
    passive: "Blasts, falls, and the zone pile up as Solar Mass. Mass refills her plate and her melee.",
    activeName: "Shatter-Pulse",
    active: "A cone of force powders destructible cover and throws the concrete back as shrapnel.",
    ultName: "Judgment of Ra",
    ult: "She hangs in the air and steers a solar lance that melts cover, guns, and anyone in the line.",
    weapon: "slug",
    blurb: "Gold equations burned into the skin. Scrap armor. They tried to drink her blood for Eon Dusk.",
    tone: "gold",
  },
];

export const OPERATOR_BY_ID: Record<OpId, Operator> = {
  jaya: OPERATORS[0],
  bodhi: OPERATORS[1],
  khensu: OPERATORS[2],
  aset: OPERATORS[3],
  ananda: BLOODLINES[0],
  nefret: BLOODLINES[1],
};

export const DOSSIER = [
  {
    kicker: "Act I",
    title: "The cradles",
    body: "For three centuries, the Accord kept Covenant-era technology under guard. Eon Dusk has seized Nod and imprisoned the Dharma and Ma'at bloodlines. Ananda is held beneath Cradle Alpha; Nefret is held beneath Cradle Omega. The cradles are draining them to power the technology. Break the pods, then press B to take up their unstable abilities.",
  },
  {
    kicker: "Act II",
    title: "The uprising",
    body: "The moment a descendant breathes free air, the streets hear it. Eon Dusk security turns to panic. Nod's residents begin to resist. Ananda can blink the squad through a killbox; Nefret can powder the walls that were keeping you honest. Their abilities are raw. They will not behave like the four who dropped with you.",
  },
  {
    kicker: "Act III",
    title: "The beacon",
    body: "An Earth-side resistance cell is forming in Cinder Row. Free the captives, raise the Accord beacon, and reach the recovery pad before Eon Dusk's lockdown erases the district.",
  },
];
