import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Radio, i as Shield, n as Volume2, o as Crosshair, t as VolumeX } from "../_libs/lucide-react.mjs";
import { A as Scene, C as PerspectiveCamera, D as PointsMaterial, E as Points, M as SphereGeometry, N as TorusGeometry, O as RingGeometry, P as Vector3, S as MeshStandardMaterial, T as PointLight, _ as LineBasicMaterial, a as BufferAttribute, b as Mesh, c as CircleGeometry, d as DirectionalLight, f as Euler, g as Line, h as HemisphereLight, i as BoxGeometry, j as ShaderMaterial, k as SRGBColorSpace, l as Color, m as Group, n as WebGLRenderer, o as BufferGeometry, p as FogExp2, r as AmbientLight, s as CanvasTexture, t as mergeGeometries, u as CylinderGeometry, v as LineLoop, w as PlaneGeometry, x as MeshBasicMaterial, y as LineSegments } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-jDdsAs6d.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var WEAPONS = {
	smg: {
		id: "smg",
		name: "KARMA-9",
		dmg: 13,
		rpm: 880,
		mag: 34,
		pellets: 1,
		spread: .045,
		adsSpread: .018,
		recoil: .012,
		auto: true,
		move: 1.05,
		reload: 1.55,
		range: 70,
		falloffStart: 18,
		falloffEnd: 48,
		minFalloff: .55,
		structure: 8,
		light: true
	},
	rifle: {
		id: "rifle",
		name: "VEIL RIFLE",
		dmg: 24,
		rpm: 620,
		mag: 30,
		pellets: 1,
		spread: .02,
		adsSpread: .006,
		recoil: .018,
		auto: true,
		move: .96,
		reload: 1.9,
		range: 110,
		falloffStart: 40,
		falloffEnd: 90,
		minFalloff: .62,
		structure: 16,
		light: false
	},
	shotgun: {
		id: "shotgun",
		name: "MANDALA 12",
		dmg: 11,
		rpm: 80,
		mag: 6,
		pellets: 8,
		spread: .11,
		adsSpread: .06,
		recoil: .045,
		auto: false,
		move: .94,
		reload: 2.3,
		range: 28,
		falloffStart: 6,
		falloffEnd: 18,
		minFalloff: .25,
		structure: 28,
		light: false
	},
	lmg: {
		id: "lmg",
		name: "STONE DRUM",
		dmg: 18,
		rpm: 540,
		mag: 80,
		pellets: 1,
		spread: .032,
		adsSpread: .014,
		recoil: .02,
		auto: true,
		move: .78,
		reload: 3.1,
		range: 100,
		falloffStart: 30,
		falloffEnd: 80,
		minFalloff: .6,
		structure: 22,
		light: false
	},
	rail: {
		id: "rail",
		name: "HORIZON RAIL",
		dmg: 86,
		rpm: 48,
		mag: 5,
		pellets: 1,
		spread: .004,
		adsSpread: .001,
		recoil: .055,
		auto: false,
		move: .88,
		reload: 2.5,
		range: 180,
		falloffStart: 80,
		falloffEnd: 160,
		minFalloff: .8,
		structure: 40,
		light: false
	},
	pistol: {
		id: "pistol",
		name: "SIDEARM",
		dmg: 22,
		rpm: 360,
		mag: 14,
		pellets: 1,
		spread: .028,
		adsSpread: .01,
		recoil: .02,
		auto: false,
		move: 1.08,
		reload: 1.35,
		range: 60,
		falloffStart: 20,
		falloffEnd: 45,
		minFalloff: .5,
		structure: 10,
		light: true
	},
	needles: {
		id: "needles",
		name: "NULL PAIR",
		dmg: 11,
		rpm: 1080,
		mag: 44,
		pellets: 1,
		spread: .032,
		adsSpread: .012,
		recoil: .007,
		auto: true,
		move: 1.14,
		reload: 1.35,
		range: 46,
		falloffStart: 12,
		falloffEnd: 34,
		minFalloff: .48,
		structure: 5,
		light: true
	},
	slug: {
		id: "slug",
		name: "RA SLUG",
		dmg: 18,
		rpm: 68,
		mag: 4,
		pellets: 5,
		spread: .08,
		adsSpread: .045,
		recoil: .05,
		auto: false,
		move: .84,
		reload: 2.45,
		range: 34,
		falloffStart: 7,
		falloffEnd: 20,
		minFalloff: .4,
		structure: 46,
		light: false
	}
};
var OPERATORS = [
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
		tone: "cyan"
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
		tone: "cyan"
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
		tone: "gold"
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
		tone: "gold"
	}
];
var BLOODLINES = [{
	id: "ananda",
	name: "Ananda",
	title: "The Void Sovereign",
	faction: "Dharma",
	role: "Unstable",
	passiveName: "Frictionless",
	passive: "Slides keep their speed into a wall-run. He makes no sound the corporate grid can hear.",
	activeName: "Quantum Shift",
	active: "Blink forward. The vacuum yanks hostiles off their feet and blinds their optics.",
	ultName: "Cosmic Unraveling",
	ult: "A void field lifts enemy gravity and drives friendly fire and feet fifty percent harder.",
	weapon: "needles",
	blurb: "Dampener cuffs crack. The prison jumpsuit still glows. He was never meant to be in only one place.",
	tone: "cyan"
}, {
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
	tone: "gold"
}];
var OPERATOR_BY_ID = {
	jaya: OPERATORS[0],
	bodhi: OPERATORS[1],
	khensu: OPERATORS[2],
	aset: OPERATORS[3],
	ananda: BLOODLINES[0],
	nefret: BLOODLINES[1]
};
var DOSSIER = [
	{
		kicker: "Act I",
		title: "The cradles",
		body: "The Accord kept the Covenant on Mars for three centuries. On Earth the bloodline was choked out and locked up. Ananda, Dharma, is under Cradle Alpha — a flooded research cradle where they tried to bottle his void. Nefret, Ma'at, is under Cradle Omega, where they drained her to feed Eon Dusk. Neither of them is a soldier. Break the pod, and press B to wear what the technocrats could not finish."
	},
	{
		kicker: "Act II",
		title: "The uprising",
		body: "The moment a descendant breathes free air, the streets hear it. Corporate security flips to panic. Civilians who have been worked to the bone take up arms. Ananda blinks the squad through the killbox. Nefret powders the walls that were keeping you honest. Their kits are raw. They will not behave like the four who dropped with you."
	},
	{
		kicker: "Act III",
		title: "Eon Dusk",
		body: "A resistance cell is already forming to stay behind. You still have to warn Mars. The oligarchs have launched a quiet mission — Eon Dusk — to colonize the red world. Raise the beacon. Then make the recovery pad before the zone erases the district."
	}
];
var AudioBus = class {
	ctx = null;
	noise = null;
	muted = false;
	drone = null;
	ensure() {
		if (!this.ctx) {
			const ctx = new AudioContext();
			this.ctx = ctx;
			const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
			const data = buffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
			this.noise = buffer;
			const osc = ctx.createOscillator();
			const osc2 = ctx.createOscillator();
			osc.type = "sine";
			osc2.type = "sine";
			osc.frequency.value = 55;
			osc2.frequency.value = 82.5;
			const gain = ctx.createGain();
			gain.gain.value = 0;
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = 220;
			osc.connect(filter);
			osc2.connect(filter);
			filter.connect(gain);
			gain.connect(ctx.destination);
			osc.start();
			osc2.start();
			this.drone = {
				osc,
				osc2,
				gain
			};
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
	}
	setPressure(p) {
		if (!this.drone || !this.ctx || this.muted) return;
		const target = .012 + p * .03;
		this.drone.gain.gain.setTargetAtTime(target, this.ctx.currentTime, .4);
	}
	toggleMute() {
		this.muted = !this.muted;
		if (this.drone && this.ctx) this.drone.gain.gain.setTargetAtTime(this.muted ? 0 : .015, this.ctx.currentTime, .05);
		return this.muted;
	}
	burst(freq, q, gain, duration, thump) {
		if (this.muted) return;
		this.ensure();
		const ctx = this.ctx;
		const noise = this.noise;
		if (!ctx || !noise) return;
		const t = ctx.currentTime;
		const src = ctx.createBufferSource();
		src.buffer = noise;
		const filter = ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.value = freq;
		filter.Q.value = q;
		const amp = ctx.createGain();
		amp.gain.setValueAtTime(gain, t);
		amp.gain.exponentialRampToValueAtTime(.001, t + duration);
		src.connect(filter);
		filter.connect(amp);
		amp.connect(ctx.destination);
		src.start(t);
		src.stop(t + duration + .02);
		if (thump) {
			const osc = ctx.createOscillator();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(thump, t);
			osc.frequency.exponentialRampToValueAtTime(Math.max(40, thump * .45), t + duration);
			const og = ctx.createGain();
			og.gain.setValueAtTime(gain * .45, t);
			og.gain.exponentialRampToValueAtTime(.001, t + duration);
			osc.connect(og);
			og.connect(ctx.destination);
			osc.start(t);
			osc.stop(t + duration);
		}
	}
	tone(freq, duration, gain, type = "sine") {
		if (this.muted) return;
		this.ensure();
		const ctx = this.ctx;
		if (!ctx) return;
		const t = ctx.currentTime;
		const osc = ctx.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		const amp = ctx.createGain();
		amp.gain.setValueAtTime(gain, t);
		amp.gain.exponentialRampToValueAtTime(.001, t + duration);
		osc.connect(amp);
		amp.connect(ctx.destination);
		osc.start(t);
		osc.stop(t + duration);
	}
	gun(kind) {
		if (kind === "smg") this.burst(1800, .7, .09, .05, 140);
		else if (kind === "needles") this.burst(2200, 1.4, .035, .04, 90);
		else if (kind === "shotgun") this.burst(420, .5, .22, .16, 90);
		else if (kind === "slug") this.burst(280, .45, .26, .2, 70);
		else if (kind === "rail") this.burst(2400, 2.4, .12, .12, 320);
		else if (kind === "lmg") this.burst(900, .8, .12, .07, 110);
		else if (kind === "pistol") this.burst(1400, 1.1, .1, .06, 180);
		else this.burst(1100, .9, .12, .07, 130);
	}
	hit(head) {
		if (head) {
			this.tone(880, .07, .06, "square");
			this.tone(1320, .09, .04, "square");
		} else this.tone(640, .05, .045, "square");
	}
	hurt() {
		this.burst(180, .6, .16, .18, 70);
	}
	pickup() {
		this.tone(520, .08, .05);
		this.tone(780, .12, .04);
	}
	breach() {
		this.burst(240, .4, .24, .28, 60);
	}
	orbital() {
		this.burst(80, .35, .32, .6, 46);
		this.tone(220, .4, .1, "sawtooth");
		this.burst(1600, 1.8, .07, .22, 240);
	}
	ui() {
		this.tone(660, .05, .04);
	}
	zone() {
		this.tone(140, .12, .05, "sawtooth");
	}
	empty() {
		this.tone(180, .04, .04, "square");
	}
	foot() {
		this.burst(200, .4, .03, .04);
	}
};
/** One shared seed so every viewer of a breach sees the same rubble. No per-chunk net payload. */
function seedRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = Math.imul(state, 1664525) + 1013904223 >>> 0;
		return state / 4294967296;
	};
}
function paceMission(input) {
	let phase = "INFILTRATION";
	if (input.beacon) phase = "EXTRACTION";
	else if (input.freed > 0) phase = "ESCORT_UPRISING";
	else if (input.nearGate) phase = "BREACH";
	let stress = input.stress;
	if (input.hp < 40) stress = Math.min(1, stress + .05);
	else stress = Math.max(phase === "INFILTRATION" ? .08 : .28, stress - .02);
	if (phase === "ESCORT_UPRISING") stress = Math.max(stress, .56);
	if (phase === "EXTRACTION") stress = Math.max(stress, .66);
	const panic = stress > .55;
	return {
		phase,
		stress,
		accuracy: panic ? .85 : 1,
		panic
	};
}
/** Local authority for the coil. The client gauge is a view of this number, not the source of it. */
function dischargeReady(solar, ultCd) {
	return solar >= 85 && ultCd <= .05;
}
function inBlastCone(ox, oz, fx, fz, px, pz, range) {
	const dx = px - ox;
	const dz = pz - oz;
	const distance = Math.hypot(dx, dz);
	if (distance > range || distance < .2) return false;
	return (dx * fx + dz * fz) / distance >= Math.cos(45 * Math.PI / 180);
}
function seededDebris(origin, force, seed, count = 12) {
	const rand = seedRandom(seed);
	const bits = [];
	for (let i = 0; i < count; i++) bits.push({
		x: origin.x,
		y: origin.y,
		z: origin.z,
		vx: force.x * 7 + (rand() - .5) * 5,
		vy: 2.5 + rand() * 5,
		vz: force.z * 7 + (rand() - .5) * 5,
		scale: .08 + rand() * .16
	});
	return bits;
}
var ATTACHMENT_ID = /^att_[a-z0-9_]{3,40}$/;
var ATTACH_SLOTS = [
	"BARREL",
	"RECEIVER",
	"OPTIC",
	"UNDERBARREL",
	"MAGAZINE"
];
var WEAPON_CLASSES = [
	"BALLISTIC",
	"ENERGY_RAIL",
	"ALL"
];
var PERK_FLAGS = [
	"ACOUSTIC_STEALTH_MASK",
	"FLINCH_IMMUNITY",
	"ENV_MESH_PENETRATION",
	"SLIDE_ACCURACY_BUFF",
	"SKILLSHOT_HIGHLIGHT",
	"TRACK_TRAIL_VISIBILITY",
	"CAPACITY_DOUBLE"
];
function asRecord(payload) {
	if (!payload || typeof payload !== "object") return null;
	return payload;
}
function requireBand(value, min, max, label) {
	if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} violates safe range boundaries`);
	return value;
}
function validateAttachmentJson(payload) {
	const data = asRecord(payload);
	const id = data?.attachmentId;
	if (typeof id !== "string" || !ATTACHMENT_ID.test(id)) throw new Error("Invalid or malformed attachmentId");
	const slot = data?.slot;
	if (typeof slot !== "string" || !ATTACH_SLOTS.includes(slot)) throw new Error("Invalid or malformed attachmentId");
	const compatibleClass = data?.compatibleClass;
	if (typeof compatibleClass !== "string" || !WEAPON_CLASSES.includes(compatibleClass)) throw new Error("Invalid or malformed attachmentId");
	const modifiers = asRecord(data?.modifiers);
	if (!modifiers) throw new Error("modifiers violate safe range boundaries");
	const recoilMultiplier = requireBand(modifiers.recoilMultiplier, .1, 3, "recoilMultiplier");
	const fireRateMultiplier = requireBand(modifiers.fireRateMultiplier, .1, 3, "fireRateMultiplier");
	const damageMultiplier = requireBand(modifiers.damageMultiplier, .1, 3, "damageMultiplier");
	const soundRadiusOverride = modifiers.soundRadiusOverride == null ? void 0 : requireBand(modifiers.soundRadiusOverride, 0, 100, "soundRadius");
	let specialPerkFlag;
	if (data?.specialPerkFlag != null) {
		if (typeof data.specialPerkFlag !== "string" || !PERK_FLAGS.includes(data.specialPerkFlag)) throw new Error("Invalid or malformed attachmentId");
		specialPerkFlag = data.specialPerkFlag;
	}
	return {
		attachmentId: id,
		slot,
		compatibleClass,
		modifiers: {
			recoilMultiplier,
			fireRateMultiplier,
			damageMultiplier,
			...soundRadiusOverride != null ? { soundRadiusOverride } : {}
		},
		...specialPerkFlag ? { specialPerkFlag } : {}
	};
}
function readAttachment(payload) {
	try {
		return validateAttachmentJson(payload);
	} catch {
		return null;
	}
}
function applyValidAttachments(list, chassis) {
	let damage = 1;
	let rate = 1;
	let recoil = 1;
	let sound = null;
	const perks = [];
	let count = 0;
	for (const attachment of list) {
		if (attachment.compatibleClass !== "ALL" && attachment.compatibleClass !== chassis) continue;
		damage *= attachment.modifiers.damageMultiplier;
		rate *= attachment.modifiers.fireRateMultiplier;
		recoil *= attachment.modifiers.recoilMultiplier;
		const override = attachment.modifiers.soundRadiusOverride;
		if (override != null && (sound == null || override < sound)) sound = override;
		if (attachment.specialPerkFlag) perks.push(attachment.specialPerkFlag);
		count += 1;
	}
	return {
		damage,
		rate,
		recoil,
		sound,
		perks,
		count
	};
}
function attachmentList(equipped) {
	return equipped instanceof Map ? [...equipped.values()] : equipped;
}
function compileRuntimeWeaponStats(weapon) {
	const stacked = applyValidAttachments(attachmentList(weapon.equippedAttachments).map((row) => validateAttachmentJson(row)), weapon.weaponId);
	return {
		runtimeDamage: weapon.baseStats.baseDamage * stacked.damage,
		runtimeFireRate: Math.max(8, weapon.baseStats.baseFireRate * stacked.rate),
		runtimeRecoil: weapon.baseStats.baseRecoil * stacked.recoil,
		runtimeSoundRadius: stacked.sound ?? weapon.baseStats.baseSoundRadius,
		activeGameplayModifiers: stacked.perks
	};
}
/** Rejects a ticket whose attachments fail the seal. This is the local authority — one operator, not a remote queue. */
function acceptDropTicket(ticket) {
	return {
		playerId: ticket.playerId,
		selectedCharacterId: ticket.selectedCharacterId,
		weapons: ticket.validatedWeaponLoadout.map((weapon) => compileRuntimeWeaponStats(weapon))
	};
}
function sealedModIds(ids, chassis, lookup) {
	const out = [];
	const used = /* @__PURE__ */ new Set();
	for (const id of ids) {
		const parsed = readAttachment(lookup(id));
		if (!parsed) continue;
		if (parsed.compatibleClass !== "ALL" && parsed.compatibleClass !== chassis) continue;
		if (used.has(parsed.slot)) continue;
		used.add(parsed.slot);
		out.push(parsed.attachmentId);
	}
	return out;
}
var PERKS = PERK_FLAGS;
var ATTACHMENTS = [
	{
		attachmentId: "att_shroud_barrel_01",
		name: "SHROUD BARREL",
		slot: "BARREL",
		compatibleClass: "ALL",
		modifiers: {
			recoilMultiplier: 1.05,
			fireRateMultiplier: 1,
			damageMultiplier: .95,
			soundRadiusOverride: 2
		},
		specialPerkFlag: "ACOUSTIC_STEALTH_MASK"
	},
	{
		attachmentId: "att_heavy_stabilizer_02",
		name: "HEAVY STABILIZER",
		slot: "BARREL",
		compatibleClass: "BALLISTIC",
		modifiers: {
			recoilMultiplier: .75,
			fireRateMultiplier: .9,
			damageMultiplier: 1.05
		},
		specialPerkFlag: "FLINCH_IMMUNITY"
	},
	{
		attachmentId: "att_overcharged_capacitor_03",
		name: "OVERCHARGED CAPACITOR",
		slot: "RECEIVER",
		compatibleClass: "ENERGY_RAIL",
		modifiers: {
			recoilMultiplier: 1.35,
			fireRateMultiplier: .6,
			damageMultiplier: 1.75
		},
		specialPerkFlag: "ENV_MESH_PENETRATION"
	},
	{
		attachmentId: "att_lightweight_burst_04",
		name: "LIGHTWEIGHT BURST",
		slot: "RECEIVER",
		compatibleClass: "BALLISTIC",
		modifiers: {
			recoilMultiplier: .9,
			fireRateMultiplier: 1.5,
			damageMultiplier: .8
		},
		specialPerkFlag: "SLIDE_ACCURACY_BUFF"
	},
	{
		attachmentId: "att_holo_tactical_05",
		name: "HOLO OPTIC",
		slot: "OPTIC",
		compatibleClass: "ALL",
		modifiers: {
			recoilMultiplier: .95,
			fireRateMultiplier: 1,
			damageMultiplier: 1
		},
		specialPerkFlag: "SKILLSHOT_HIGHLIGHT"
	},
	{
		attachmentId: "att_chrono_tracer_scope_06",
		name: "CHRONO-TRACER",
		slot: "OPTIC",
		compatibleClass: "ENERGY_RAIL",
		modifiers: {
			recoilMultiplier: 1.1,
			fireRateMultiplier: 1,
			damageMultiplier: 1
		},
		specialPerkFlag: "TRACK_TRAIL_VISIBILITY"
	},
	{
		attachmentId: "att_extended_drum_07",
		name: "EXTENDED DRUM",
		slot: "MAGAZINE",
		compatibleClass: "BALLISTIC",
		modifiers: {
			recoilMultiplier: 1.15,
			fireRateMultiplier: 1,
			damageMultiplier: 1
		},
		specialPerkFlag: "CAPACITY_DOUBLE"
	}
];
var ATTACHMENT_BY_ID = Object.fromEntries(ATTACHMENTS.map((row) => [row.attachmentId, row]));
var DROPS = [
	{
		itemId: "wep_scav_smg_01",
		itemName: "SCAVENGER SMG",
		itemTier: "COMMON",
		baseSpawnChance: 45,
		minSectorRequirement: 1,
		scrapValueCredit: 50,
		grant: {
			type: "weapon",
			weaponId: "smg"
		}
	},
	{
		itemId: "wep_inf_rifle_02",
		itemName: "INFANTRY RIFLE",
		itemTier: "UNCOMMON",
		baseSpawnChance: 25,
		minSectorRequirement: 2,
		scrapValueCredit: 150,
		grant: {
			type: "weapon",
			weaponId: "rifle"
		}
	},
	{
		itemId: "wep_ussf_rail_03",
		itemName: "TACTICAL RAIL",
		itemTier: "RARE",
		baseSpawnChance: 12.5,
		minSectorRequirement: 3,
		scrapValueCredit: 450,
		grant: {
			type: "weapon",
			weaponId: "rail"
		}
	},
	{
		itemId: "wep_solar_sniper_04",
		itemName: "SOLAR RAIL",
		itemTier: "LEGENDARY",
		baseSpawnChance: 3.5,
		minSectorRequirement: 4,
		scrapValueCredit: 1200,
		grant: {
			type: "weapon",
			weaponId: "rail"
		}
	},
	{
		itemId: "wep_desc_void_05",
		itemName: "VOID PISTOL",
		itemTier: "ANOMALY",
		baseSpawnChance: .5,
		minSectorRequirement: 4,
		scrapValueCredit: 5e3,
		grant: {
			type: "weapon",
			weaponId: "needles"
		}
	},
	{
		itemId: "res_nanite_inject_01",
		itemName: "NANITE SWARM",
		itemTier: "UNCOMMON",
		baseSpawnChance: 30,
		minSectorRequirement: 1,
		scrapValueCredit: 75,
		grant: { type: "med" }
	},
	{
		itemId: "res_armor_plate_02",
		itemName: "MARTIAN PLATE",
		itemTier: "RARE",
		baseSpawnChance: 15,
		minSectorRequirement: 2,
		scrapValueCredit: 200,
		grant: { type: "armor" }
	},
	{
		itemId: "res_emp_shield_03",
		itemName: "EMP INVERTER",
		itemTier: "LEGENDARY",
		baseSpawnChance: 5,
		minSectorRequirement: 3,
		scrapValueCredit: 800,
		grant: { type: "armor" }
	},
	{
		itemId: "intel_eon_dusk_schematic",
		itemName: "EON DUSK BLUEPRINTS",
		itemTier: "LEGENDARY",
		baseSpawnChance: 2,
		minSectorRequirement: 3,
		scrapValueCredit: 2500,
		grant: { type: "intel" }
	},
	{
		itemId: "intel_pure_blood_dna",
		itemName: "LINEAGE KEY",
		itemTier: "ANOMALY",
		baseSpawnChance: 1,
		minSectorRequirement: 4,
		scrapValueCredit: 1e4,
		grant: { type: "intel" }
	},
	{
		itemId: "att_shroud_barrel_01",
		itemName: "SHROUD BARREL",
		itemTier: "UNCOMMON",
		baseSpawnChance: 8,
		minSectorRequirement: 1,
		scrapValueCredit: 120,
		grant: {
			type: "mod",
			attachmentId: "att_shroud_barrel_01"
		}
	},
	{
		itemId: "att_heavy_stabilizer_02",
		itemName: "HEAVY STABILIZER",
		itemTier: "UNCOMMON",
		baseSpawnChance: 7,
		minSectorRequirement: 2,
		scrapValueCredit: 160,
		grant: {
			type: "mod",
			attachmentId: "att_heavy_stabilizer_02"
		}
	},
	{
		itemId: "att_overcharged_capacitor_03",
		itemName: "OVERCHARGED CAPACITOR",
		itemTier: "RARE",
		baseSpawnChance: 4,
		minSectorRequirement: 3,
		scrapValueCredit: 700,
		grant: {
			type: "mod",
			attachmentId: "att_overcharged_capacitor_03"
		}
	},
	{
		itemId: "att_lightweight_burst_04",
		itemName: "LIGHTWEIGHT BURST",
		itemTier: "UNCOMMON",
		baseSpawnChance: 7,
		minSectorRequirement: 2,
		scrapValueCredit: 180,
		grant: {
			type: "mod",
			attachmentId: "att_lightweight_burst_04"
		}
	},
	{
		itemId: "att_holo_tactical_05",
		itemName: "HOLO OPTIC",
		itemTier: "UNCOMMON",
		baseSpawnChance: 9,
		minSectorRequirement: 2,
		scrapValueCredit: 140,
		grant: {
			type: "mod",
			attachmentId: "att_holo_tactical_05"
		}
	},
	{
		itemId: "att_chrono_tracer_scope_06",
		itemName: "CHRONO-TRACER",
		itemTier: "RARE",
		baseSpawnChance: 3.5,
		minSectorRequirement: 3,
		scrapValueCredit: 420,
		grant: {
			type: "mod",
			attachmentId: "att_chrono_tracer_scope_06"
		}
	},
	{
		itemId: "att_extended_drum_07",
		itemName: "EXTENDED DRUM",
		itemTier: "UNCOMMON",
		baseSpawnChance: 8,
		minSectorRequirement: 1,
		scrapValueCredit: 90,
		grant: {
			type: "mod",
			attachmentId: "att_extended_drum_07"
		}
	}
];
var ID_PATTERN = /^att_[a-z0-9_]{3,40}$/;
function assertAttachment(data) {
	const parsed = validateAttachmentJson(data);
	if (!ID_PATTERN.test(parsed.attachmentId)) throw new Error(`bad attachment id ${data.attachmentId}`);
	if (data.specialPerkFlag && !PERKS.includes(data.specialPerkFlag)) throw new Error(data.specialPerkFlag);
}
for (const row of ATTACHMENTS) assertAttachment(row);
function sectorTier(x, z) {
	if (Math.hypot(x - 80, z + 80) < 36 || Math.hypot(x + 80, z - 80) < 36) return 3;
	if (x > 36) return 4;
	if (x < -36) return 1;
	return 2;
}
function sectorLabel(x, z) {
	if (z < -118) return "RECOVERY CORRIDOR";
	const tier = sectorTier(x, z);
	if (tier === 1) return "SUNKEN SLUMS";
	if (tier === 3) return "CRADLE OUTSKIRTS";
	if (tier === 4) return "MONOLITH CORE";
	return "NEON BELT";
}
function weaponClass(id) {
	return id === "rail" || id === "needles" ? "ENERGY_RAIL" : "BALLISTIC";
}
function compileWeapon(weapon, modIds) {
	const list = [];
	for (const id of modIds) {
		const attachment = ATTACHMENT_BY_ID[id];
		if (!attachment) continue;
		const parsed = readAttachment(attachment);
		if (parsed) list.push(parsed);
	}
	const stacked = applyValidAttachments(list, weaponClass(weapon.id));
	const perks = new Set(stacked.perks);
	const mag = weapon.mag * (perks.has("CAPACITY_DOUBLE") ? 2 : 1);
	return {
		dmg: weapon.dmg * stacked.damage,
		rpm: Math.max(8, weapon.rpm * stacked.rate),
		recoil: weapon.recoil * stacked.recoil,
		spread: weapon.spread,
		adsSpread: perks.has("SKILLSHOT_HIGHLIGHT") ? weapon.adsSpread * .65 : weapon.adsSpread,
		mag,
		soundRadius: stacked.sound ?? 36,
		perks,
		modCount: stacked.count
	};
}
function banks(drop) {
	if (drop.grant.type === "intel" || drop.grant.type === "mod") return drop.scrapValueCredit;
	if (drop.itemTier === "LEGENDARY" || drop.itemTier === "ANOMALY") return drop.scrapValueCredit;
	return 0;
}
function rollLoot(x, z, rand) {
	const tier = sectorTier(x, z);
	const pool = DROPS.filter((drop) => drop.minSectorRequirement <= tier);
	const total = pool.reduce((sum, drop) => sum + drop.baseSpawnChance, 0);
	let cursor = rand() * total;
	let chosen = pool[0];
	for (const drop of pool) {
		cursor -= drop.baseSpawnChance;
		if (cursor <= 0) {
			chosen = drop;
			break;
		}
	}
	const scrap = banks(chosen);
	const grant = chosen.grant;
	if (grant.type === "weapon") return {
		kind: "weapon",
		weaponId: grant.weaponId,
		label: chosen.itemName,
		scrap,
		x,
		z
	};
	if (grant.type === "med") return {
		kind: "med",
		label: chosen.itemName,
		scrap,
		x,
		z
	};
	if (grant.type === "armor") return {
		kind: "armor",
		label: chosen.itemName,
		scrap,
		x,
		z
	};
	if (grant.type === "mod") return {
		kind: "mod",
		modId: grant.attachmentId,
		label: chosen.itemName,
		scrap,
		x,
		z
	};
	return {
		kind: "intel",
		label: chosen.itemName,
		scrap,
		x,
		z
	};
}
var EXTRACTION_REGISTRY = [
	{
		id: "wep_scav_smg_01",
		itemType: "WEAPON",
		rarity: "COMMON",
		baseWeight: 100,
		currencyScrapValue: 50,
		kind: "weapon",
		weaponId: "smg",
		label: "SCAVENGER SMG"
	},
	{
		id: "att_shroud_barrel_01",
		itemType: "ATTACHMENT",
		rarity: "UNCOMMON",
		baseWeight: 65,
		currencyScrapValue: 120,
		kind: "mod",
		modId: "att_shroud_barrel_01",
		label: "SHROUD BARREL"
	},
	{
		id: "att_heavy_stabilizer_02",
		itemType: "ATTACHMENT",
		rarity: "UNCOMMON",
		baseWeight: 50,
		currencyScrapValue: 150,
		kind: "mod",
		modId: "att_heavy_stabilizer_02",
		label: "HEAVY STABILIZER"
	},
	{
		id: "att_overcharged_capacitor_03",
		itemType: "ATTACHMENT",
		rarity: "RARE",
		baseWeight: 25,
		currencyScrapValue: 400,
		kind: "mod",
		modId: "att_overcharged_capacitor_03",
		label: "OVERCHARGED CAPACITOR"
	},
	{
		id: "att_chrono_tracer_scope_06",
		itemType: "ATTACHMENT",
		rarity: "LEGENDARY",
		baseWeight: 8,
		currencyScrapValue: 950,
		kind: "mod",
		modId: "att_chrono_tracer_scope_06",
		label: "CHRONO-TRACER"
	},
	{
		id: "intel_eon_dusk_schematic",
		itemType: "INTEL_DATA",
		rarity: "LEGENDARY",
		baseWeight: 4,
		currencyScrapValue: 2500,
		kind: "intel",
		label: "EON DUSK BLUEPRINTS"
	},
	{
		id: "intel_pure_blood_dna",
		itemType: "INTEL_DATA",
		rarity: "ANOMALY",
		baseWeight: 1,
		currencyScrapValue: 1e4,
		kind: "intel",
		label: "LINEAGE KEY"
	}
];
var BY_ID = new Map(EXTRACTION_REGISTRY.map((item) => [item.id, item]));
function resolveExtractionDrop(id) {
	const item = BY_ID.get(id);
	if (!item) return null;
	return {
		kind: item.kind,
		weaponId: item.weaponId,
		modId: item.modId,
		label: item.label,
		scrap: item.currencyScrapValue
	};
}
function generateContainerDropArray(siteContext, matchTimeProgressRatio, rand = Math.random) {
	const selected = [];
	const progress = Math.min(1, Math.max(0, matchTimeProgressRatio));
	const danger = Math.min(5, Math.max(1, siteContext.localDangerFactor));
	for (let i = 0; i < 4; i++) {
		let sum = 0;
		const weights = [];
		for (const item of EXTRACTION_REGISTRY) {
			if (item.rarity === "ANOMALY" && siteContext.sectorTier < 4) continue;
			if (item.rarity === "LEGENDARY" && !siteContext.uprisingActive && danger < 3) continue;
			let attenuation = 1;
			if (item.rarity === "LEGENDARY" || item.rarity === "ANOMALY") {
				attenuation += progress * 2.5;
				attenuation += danger * 1.5;
			} else if (item.rarity === "COMMON") attenuation = Math.max(.1, attenuation - progress * .8);
			const weight = item.baseWeight * attenuation;
			weights.push({
				id: item.id,
				weight
			});
			sum += weight;
		}
		if (sum <= 0) continue;
		let cursor = rand() * sum;
		for (const entry of weights) {
			cursor -= entry.weight;
			if (cursor <= 0) {
				selected.push(entry.id);
				break;
			}
		}
	}
	return selected;
}
var KEY = "mte-mars-v1";
var NAMES = {
	wep_scav_smg_01: "SCAVENGER SMG",
	wep_inf_rifle_02: "INFANTRY RIFLE",
	wep_ussf_rail_03: "TACTICAL RAIL",
	wep_solar_sniper_04: "SOLAR RAIL",
	wep_desc_void_05: "VOID PISTOL",
	intel_eon_dusk_schematic: "EON DUSK BLUEPRINTS",
	intel_pure_blood_dna: "LINEAGE KEY"
};
var WEAPON_OF = {
	wep_scav_smg_01: "smg",
	wep_inf_rifle_02: "rifle",
	wep_ussf_rail_03: "rail",
	wep_solar_sniper_04: "rail",
	wep_desc_void_05: "needles"
};
var RULES = {
	att_shroud_barrel_01: {
		name: "SHROUD BARREL",
		slot: "BARREL",
		cls: "ALL"
	},
	att_heavy_stabilizer_02: {
		name: "HEAVY STABILIZER",
		slot: "BARREL",
		cls: "BALLISTIC"
	},
	att_overcharged_capacitor_03: {
		name: "OVERCHARGED CAPACITOR",
		slot: "RECEIVER",
		cls: "ENERGY_RAIL"
	},
	att_lightweight_burst_04: {
		name: "LIGHTWEIGHT BURST",
		slot: "RECEIVER",
		cls: "BALLISTIC"
	},
	att_holo_tactical_05: {
		name: "HOLO OPTIC",
		slot: "OPTIC",
		cls: "ALL"
	},
	att_chrono_tracer_scope_06: {
		name: "CHRONO-TRACER",
		slot: "OPTIC",
		cls: "ENERGY_RAIL"
	},
	att_extended_drum_07: {
		name: "EXTENDED DRUM",
		slot: "MAGAZINE",
		cls: "BALLISTIC"
	}
};
var COIL_EMISSION = 1.8;
function solarCoilEmits(r, g, b) {
	return r > .8 && g > .4 && b < .2;
}
function labelForRegistry(id) {
	return RULES[id]?.name ?? NAMES[id] ?? id;
}
function registryForLabel(label) {
	if (!label) return null;
	return Object.entries(NAMES).find(([, name]) => name === label)?.[0] ?? null;
}
function weaponIdForRegistry(id) {
	return WEAPON_OF[id] ?? null;
}
function blankPreset(slotIndex) {
	return {
		slotIndex,
		baseWeaponId: "",
		barrelModId: null,
		receiverModId: null,
		opticModId: null,
		magazineModId: null
	};
}
function emptyMars() {
	return {
		martianCredits: 0,
		unlockedBlueprints: [],
		stash: [],
		activeSlot: 1,
		loadouts: [
			blankPreset(1),
			blankPreset(2),
			blankPreset(3)
		]
	};
}
function loadMars() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return emptyMars();
		const parsed = JSON.parse(raw);
		const loadouts = emptyMars().loadouts.map((preset) => {
			const found = parsed.loadouts?.find((row) => row.slotIndex === preset.slotIndex);
			return found ? {
				...preset,
				...found,
				slotIndex: preset.slotIndex
			} : preset;
		});
		return {
			martianCredits: parsed.martianCredits || 0,
			unlockedBlueprints: Array.isArray(parsed.unlockedBlueprints) ? parsed.unlockedBlueprints.filter((id) => typeof id === "string") : [],
			stash: Array.isArray(parsed.stash) ? parsed.stash : [],
			activeSlot: parsed.activeSlot === 2 || parsed.activeSlot === 3 ? parsed.activeSlot : 1,
			loadouts
		};
	} catch {
		return emptyMars();
	}
}
function saveMars(profile) {
	localStorage.setItem(KEY, JSON.stringify(profile));
}
function ensureCredits(profile, recordScrap) {
	if (profile.martianCredits === 0 && recordScrap > 0 && profile.stash.length === 0 && profile.unlockedBlueprints.length === 0) return {
		...profile,
		martianCredits: recordScrap
	};
	return profile;
}
function commitExtraction(profile, credits, pieces) {
	const stash = profile.stash.map((row) => ({ ...row }));
	const blueprints = new Set(profile.unlockedBlueprints);
	for (const piece of pieces) {
		if (!piece.itemRegistryId) continue;
		if (piece.itemRegistryId.startsWith("att_")) blueprints.add(piece.itemRegistryId);
		const existing = stash.find((row) => row.itemRegistryId === piece.itemRegistryId);
		if (existing) {
			existing.quantity += 1;
			existing.extractedFromSectorId = piece.sectorTier;
		} else stash.push({
			stashItemUuid: crypto.randomUUID(),
			itemRegistryId: piece.itemRegistryId,
			quantity: 1,
			currentDurability: 100,
			extractedFromSectorId: piece.sectorTier,
			tradeLocked: false
		});
	}
	return {
		...profile,
		martianCredits: profile.martianCredits + Math.max(0, Math.floor(credits)),
		unlockedBlueprints: [...blueprints],
		stash
	};
}
function setActiveSlot(profile, slot) {
	return {
		...profile,
		activeSlot: slot
	};
}
function setPresetMod(profile, field, id, weaponId) {
	return {
		...profile,
		loadouts: profile.loadouts.map((row) => row.slotIndex === profile.activeSlot ? {
			...row,
			baseWeaponId: weaponId,
			[field]: id
		} : row)
	};
}
function modsForDrop(profile, weaponId) {
	const preset = profile.loadouts.find((row) => row.slotIndex === profile.activeSlot);
	if (!preset) return [];
	const chassis = weaponId === "rail" || weaponId === "needles" ? "ENERGY_RAIL" : "BALLISTIC";
	const ids = [
		preset.barrelModId,
		preset.receiverModId,
		preset.opticModId,
		preset.magazineModId
	];
	const seated = [];
	for (const id of ids) {
		if (!id || !profile.unlockedBlueprints.includes(id)) continue;
		const rule = RULES[id];
		if (!rule || rule.cls !== "ALL" && rule.cls !== chassis) continue;
		seated.push(id);
	}
	return seated;
}
var AIM_ASSIST = {
	coneDeg: 8,
	adhesion: .25,
	friction: .6,
	range: 150
};
function lookForward(yaw, pitch) {
	const cp = Math.cos(pitch);
	return {
		x: -Math.sin(yaw) * cp,
		y: Math.sin(pitch),
		z: -Math.cos(yaw) * cp
	};
}
function yawPitchToward(origin, target) {
	const dx = target.x - origin.x;
	const dy = target.y - origin.y;
	const dz = target.z - origin.z;
	const horizontal = Math.hypot(dx, dz) || 1e-4;
	return {
		yaw: Math.atan2(-dx, -dz),
		pitch: Math.atan2(dy, horizontal)
	};
}
function wrapPi(angle) {
	let next = angle;
	while (next > Math.PI) next -= Math.PI * 2;
	while (next < -Math.PI) next += Math.PI * 2;
	return next;
}
function applyAimAssist(input) {
	const config = {
		...AIM_ASSIST,
		...input.config
	};
	const forward = lookForward(input.yaw, input.pitch);
	const cone = config.coneDeg * Math.PI / 180;
	let best = null;
	let bestAngle = cone;
	for (const target of input.targets) {
		const dx = target.x - input.origin.x;
		const dy = target.y - input.origin.y;
		const dz = target.z - input.origin.z;
		const distance = Math.hypot(dx, dy, dz);
		if (distance < .4 || distance > config.range) continue;
		const dot = (forward.x * dx + forward.y * dy + forward.z * dz) / distance;
		const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
		if (angle < bestAngle) {
			bestAngle = angle;
			best = target;
		}
	}
	if (!best) return {
		lookX: input.lookX,
		lookY: input.lookY,
		yawPull: 0,
		pitchPull: 0,
		locked: false
	};
	const want = yawPitchToward(input.origin, best);
	const step = config.adhesion * .1 * Math.min(2, input.dt * 60);
	return {
		lookX: input.lookX * config.friction,
		lookY: input.lookY * config.friction,
		yawPull: wrapPi(want.yaw - input.yaw) * step,
		pitchPull: (want.pitch - input.pitch) * step,
		locked: true
	};
}
var CHARACTER_CODE = {
	jaya: 101,
	bodhi: 102,
	aset: 103,
	khensu: 201,
	nefret: 202,
	ananda: 301
};
var WEAPON_CODE = {
	rifle: 501,
	smg: 502,
	shotgun: 503,
	lmg: 504,
	pistol: 505,
	slug: 506,
	rail: 601,
	needles: 602
};
var MOD_CODE = {
	att_shroud_barrel_01: 1001,
	att_heavy_stabilizer_02: 12,
	att_overcharged_capacitor_03: 3003,
	att_lightweight_burst_04: 22,
	att_holo_tactical_05: 5005,
	att_chrono_tracer_scope_06: 32,
	att_extended_drum_07: 41
};
var MOD_PACK_ORDER = [
	"att_shroud_barrel_01",
	"att_heavy_stabilizer_02",
	"att_holo_tactical_05",
	"att_chrono_tracer_scope_06",
	"att_overcharged_capacitor_03",
	"att_lightweight_burst_04",
	"att_extended_drum_07"
];
function clampU16(value) {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.min(65535, Math.floor(value));
}
function modCodes(modIds) {
	const have = new Set(modIds);
	const codes = [];
	for (const id of MOD_PACK_ORDER) {
		if (!have.has(id)) continue;
		const code = MOD_CODE[id];
		if (code) codes.push(code);
	}
	return codes;
}
function serializeGearPacket(data) {
	const buffer = /* @__PURE__ */ new ArrayBuffer(18);
	const view = new DataView(buffer);
	const playerId = Number.isFinite(data.playerId) ? data.playerId : 0;
	view.setUint32(0, playerId >>> 0, true);
	view.setUint16(4, clampU16(data.characterId), true);
	view.setUint16(6, clampU16(data.primaryWeaponId), true);
	for (let i = 0; i < 3; i++) view.setUint16(8 + i * 2, clampU16(data.equippedModIds[i] ?? 0), true);
	view.setUint16(14, clampU16(Math.floor(data.runtimeRecoilFactor * 100)), true);
	view.setUint16(16, clampU16(Math.floor(data.runtimeDamageValue)), true);
	return buffer;
}
function deserializeGearPacket(buffer) {
	if (buffer.byteLength !== 18) throw new Error("gear packet must be 18 bytes");
	const view = new DataView(buffer);
	const equippedModIds = [];
	for (let i = 0; i < 3; i++) {
		const modId = view.getUint16(8 + i * 2, true);
		if (modId !== 0) equippedModIds.push(modId);
	}
	return {
		playerId: view.getUint32(0, true),
		characterId: view.getUint16(4, true),
		primaryWeaponId: view.getUint16(6, true),
		equippedModIds,
		runtimeRecoilFactor: view.getUint16(14, true) / 100,
		runtimeDamageValue: view.getUint16(16, true)
	};
}
function packHeldGear(input) {
	return serializeGearPacket({
		playerId: input.playerId,
		characterId: CHARACTER_CODE[input.operator],
		primaryWeaponId: WEAPON_CODE[input.weapon],
		equippedModIds: modCodes(input.modIds).slice(0, 3),
		runtimeRecoilFactor: input.runtimeRecoilFactor,
		runtimeDamageValue: input.runtimeDamageValue
	});
}
var RADIUS = .42;
function rngSeed(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function makeBox(minX, maxX, minZ, maxZ, h, glow, destructible = false, tag = "solid", hp = 80) {
	return {
		minX,
		maxX,
		minZ,
		maxZ,
		h,
		alive: true,
		destructible,
		hp,
		maxHp: hp,
		tag,
		glow,
		reinforced: false
	};
}
function xzHit(x, z, r, b) {
	return x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ;
}
function movementBlocked(x, z, feetY, boxes) {
	for (const b of boxes) {
		if (!b.alive) continue;
		if (b.h <= feetY + .58) continue;
		if (xzHit(x, z, .42, b)) return b;
	}
	return null;
}
function floorHeight(x, z, feetY, boxes) {
	let floor = 0;
	for (const b of boxes) {
		if (!b.alive) continue;
		if (b.h > feetY + .58 + .02) continue;
		if (xzHit(x, z, .1, b)) floor = Math.max(floor, b.h);
	}
	return floor;
}
function segmentHits(x0, z0, x1, z1, b) {
	let t0 = 0;
	let t1 = 1;
	const dx = x1 - x0;
	const dz = z1 - z0;
	const ps = [
		-dx,
		dx,
		-dz,
		dz
	];
	const qs = [
		x0 - b.minX,
		b.maxX - x0,
		z0 - b.minZ,
		b.maxZ - z0
	];
	for (let i = 0; i < 4; i++) {
		const p = ps[i];
		const q = qs[i];
		if (Math.abs(p) < 1e-9) {
			if (q < 0) return false;
		} else {
			const r = q / p;
			if (p < 0) {
				if (r > t1) return false;
				if (r > t0) t0 = r;
			} else {
				if (r < t0) return false;
				if (r < t1) t1 = r;
			}
		}
	}
	return t0 <= t1;
}
function hasLos(x0, z0, x1, z1, boxes) {
	for (const b of boxes) {
		if (!b.alive || b.h < 1.7) continue;
		const inside = (x, z) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
		if (inside(x0, z0) || inside(x1, z1)) continue;
		if (segmentHits(x0, z0, x1, z1, b)) return false;
	}
	return true;
}
function addPrison(buildings, cx, cz, gate, id, label, lineage) {
	const a = 15;
	const t = 1.35;
	const h = 8;
	const glow = "red";
	buildings.push(makeBox(cx - a, cx - a + t, cz - a + t, cz + a - t, h, glow));
	buildings.push(makeBox(cx + a - t, cx + a, cz - a + t, cz + a - t, h, glow));
	if (gate === "south") {
		buildings.push(makeBox(cx - a, cx + a, cz - a, cz - a + t, h, glow));
		buildings.push(makeBox(cx - a, cx - 2.3, cz + a - t, cz + a, h, glow));
		buildings.push(makeBox(cx + 2.3, cx + a, cz + a - t, cz + a, h, glow));
	} else {
		buildings.push(makeBox(cx - a, cx + a, cz + a - t, cz + a, h, glow));
		buildings.push(makeBox(cx - a, cx - 2.3, cz - a, cz - a + t, h, glow));
		buildings.push(makeBox(cx + 2.3, cx + a, cz - a, cz - a + t, h, glow));
	}
	const towers = [
		[cx - a, cz - a],
		[cx + a, cz - a],
		[cx - a, cz + a],
		[cx + a, cz + a]
	];
	for (const [tx, tz] of towers) buildings.push(makeBox(tx - 1.6, tx + 1.6, tz - 1.6, tz + 1.6, 14, glow));
	const door = gate === "south" ? makeBox(cx - 2.3, cx + 2.3, cz + a - t, cz + a, 4.4, glow, true, "door", 150) : makeBox(cx - 2.3, cx + 2.3, cz - a, cz - a + t, 4.4, glow, true, "door", 150);
	return {
		id,
		label,
		lineage,
		x: cx,
		z: cz,
		minX: cx - a + t,
		maxX: cx + a - t,
		minZ: cz - a + t,
		maxZ: cz + a - t,
		door,
		freed: false
	};
}
function overlapsAny(x, z, r, boxes) {
	return boxes.some((b) => b.alive && xzHit(x, z, r, b));
}
function buildWorld() {
	const rand = rngSeed(20261022);
	const buildings = [];
	const covers = [];
	const CELL = 40;
	const alpha = addPrison(buildings, 80, -80, "south", "alpha", "CRADLE ALPHA", "Ananda");
	const omega = addPrison(buildings, -80, 80, "north", "omega", "CRADLE OMEGA", "Nefret");
	covers.push(alpha.door, omega.door);
	for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) {
		if (gx === 2 && gz === -2 || gx === -2 && gz === 2 || gx === 0 && gz === 0) continue;
		const cx = gx * CELL;
		const cz = gz * CELL;
		const central = Math.abs(gx) <= 1 && Math.abs(gz) <= 1;
		const rim = Math.abs(gx) === 3 || Math.abs(gz) === 3;
		const pick = () => {
			if (central) return [
				4.5,
				6.5,
				9,
				12
			][Math.floor(rand() * 4)];
			if (rim) return [
				16,
				24,
				32,
				42,
				48
			][Math.floor(rand() * 5)];
			return [
				8,
				12,
				18,
				26,
				34
			][Math.floor(rand() * 5)];
		};
		const glow = cx > 36 ? "red" : cx < -36 ? "gold" : "cyan";
		buildings.push(makeBox(cx - 12, cx - 1.6, cz - 12, cz + 3.5, pick(), glow));
		buildings.push(makeBox(cx + 1.6, cx + 12, cz - 2.5, cz + 12, pick(), glow));
		if (rand() > .55) buildings.push(makeBox(cx - 6, cx + 5, cz - 12, cz - 6, Math.min(pick(), central ? 8 : 20), glow));
	}
	buildings.push(makeBox(-.45, .45, -.45, .45, 26, "cyan", false, "mast"));
	const nodes = [];
	for (let ix = -3; ix <= 4; ix++) for (let iz = -3; iz <= 4; iz++) {
		const x = ix * CELL - CELL / 2;
		const z = iz * CELL - CELL / 2;
		if (Math.abs(x) > 148 || Math.abs(z) > 148) continue;
		if (!overlapsAny(x, z, .8, buildings)) nodes.push({
			x,
			z
		});
	}
	const placeCover = (x, z, alongX) => {
		const box = alongX ? makeBox(x - 1.4, x + 1.4, z - .38, z + .38, 1.08, "cyan", true, "cover", 55) : makeBox(x - .38, x + .38, z - 1.4, z + 1.4, 1.08, "cyan", true, "cover", 55);
		if (overlapsAny((box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2, .2, buildings)) return;
		covers.push(box);
	};
	for (const n of nodes) {
		if (Math.abs(n.x) < 10 && Math.abs(n.z) < 10) continue;
		if ((Math.abs(n.x / 10) + Math.abs(n.z / 10)) % 2 < 1) placeCover(n.x + 3.2, n.z, true);
	}
	placeCover(8, 6, true);
	placeCover(-7, -5, false);
	placeCover(6, -8, true);
	placeCover(-9, 7, false);
	placeCover(-6, -132, true);
	placeCover(6, -128, false);
	placeCover(0, -124, true);
	covers.forEach((box, index) => {
		if (box.tag !== "cover" || index % 4 !== 0) return;
		box.reinforced = true;
		box.hp = 160;
		box.maxHp = 160;
	});
	const loots = [];
	const nearLoot = (x, z) => loots.some((loot) => Math.hypot(loot.x - x, loot.z - z) < 7);
	const dropAt = (x, z) => {
		if (Math.abs(x) > 146 || Math.abs(z) > 146) return;
		if (overlapsAny(x, z, .55, buildings)) return;
		if (nearLoot(x, z)) return;
		const roll = rand();
		if (roll < .22) loots.push({
			kind: "ammo",
			x,
			z
		});
		else if (roll < .34) loots.push({
			kind: "med",
			x,
			z
		});
		else loots.push(rollLoot(x, z, rand));
	};
	loots.push({
		kind: "weapon",
		weaponId: "rifle",
		x: 58,
		z: -48
	}, {
		kind: "med",
		x: 70,
		z: -48
	}, {
		kind: "armor",
		x: 84,
		z: -58
	}, {
		kind: "weapon",
		weaponId: "smg",
		x: -58,
		z: 50
	}, {
		kind: "med",
		x: -72,
		z: 50
	}, {
		kind: "ammo",
		x: 4,
		z: 14
	}, {
		kind: "med",
		x: -14,
		z: -6
	}, {
		kind: "weapon",
		weaponId: "shotgun",
		x: 18,
		z: 22
	});
	for (const n of nodes) {
		if (Math.hypot(n.x, n.z) < 12) continue;
		dropAt(n.x + (rand() - .5) * 9, n.z + (rand() - .5) * 9);
		if (rand() > .42) dropAt(n.x + (rand() - .5) * 16, n.z + (rand() - .5) * 16);
	}
	for (let i = 0; i < 8; i++) dropAt((rand() - .5) * 18, -118 - rand() * 22);
	const terminals = [];
	for (const seed of [
		{
			x: 60,
			z: 20
		},
		{
			x: 100,
			z: -20
		},
		{
			x: 60,
			z: -60
		},
		{
			x: 20,
			z: -140
		}
	]) {
		let placed = false;
		for (let ring = 0; ring <= 16 && !placed; ring += 2) for (let step = 0; step < 8 && !placed; step++) {
			const ang = step / 8 * Math.PI * 2;
			const x = seed.x + Math.cos(ang) * ring;
			const z = seed.z + Math.sin(ang) * ring;
			if (Math.abs(x) > 142 || Math.abs(z) > 146) continue;
			if (overlapsAny(x, z, 1.1, buildings)) continue;
			if (terminals.some((term) => Math.hypot(term.x - x, term.z - z) < 18)) continue;
			terminals.push({
				x,
				z
			});
			placed = true;
		}
	}
	const guards = [
		{
			x: 80,
			z: -48
		},
		{
			x: 64,
			z: -62
		},
		{
			x: 90,
			z: -70
		},
		{
			x: 72,
			z: -40
		},
		{
			x: -80,
			z: 48
		},
		{
			x: -64,
			z: 62
		},
		{
			x: -90,
			z: 70
		},
		{
			x: -72,
			z: 40
		}
	].filter((g) => !overlapsAny(g.x, g.z, .6, buildings));
	return {
		buildings,
		covers,
		sites: [alpha, omega],
		loots,
		nodes,
		terminals,
		guards,
		beacon: {
			x: 0,
			z: 0
		},
		extract: {
			x: 0,
			z: -138
		},
		limit: 152
	};
}
var GLOW_HEX = {
	cyan: 3072200,
	gold: 13935178,
	red: 14830411
};
function glowMat(color) {
	return new MeshStandardMaterial({
		color,
		emissive: color,
		emissiveIntensity: 1.7,
		roughness: .35,
		metalness: .15
	});
}
function pushWindows(b, into) {
	const w = b.maxX - b.minX;
	const cx = (b.minX + b.maxX) / 2;
	const czMid = (b.minZ + b.maxZ) / 2;
	const floors = Math.min(7, Math.max(1, Math.floor(b.h / 3.4)));
	const pw = Math.min(Math.max(w * .45, 1.2), 5.5);
	for (let i = 0; i < floors; i++) {
		const y = 2.2 + i * 3.3;
		if (y > b.h - .8) break;
		const front = new PlaneGeometry(pw, .9);
		front.translate(cx, y, b.maxZ + .08);
		into.push(front);
		const back = new PlaneGeometry(pw, .9);
		back.rotateY(Math.PI);
		back.translate(cx, y, b.minZ - .08);
		into.push(back);
		if (i === 0 && w > 3) {
			const sign = new BoxGeometry(Math.min(w * .4, 3.2), .35, .18);
			sign.translate(cx, 3.3, b.maxZ + .2);
			into.push(sign);
		}
	}
	if (b.h > 16) {
		const mast = new BoxGeometry(.25, 4, .25);
		mast.translate(cx, b.h + 2, czMid);
		into.push(mast);
	}
}
function paintGround() {
	const canvas = document.createElement("canvas");
	canvas.width = 1024;
	canvas.height = 1024;
	const g = canvas.getContext("2d");
	if (!g) return new CanvasTexture(canvas);
	g.fillStyle = "#242b34";
	g.fillRect(0, 0, 1024, 1024);
	const map = (v) => (v + 160) / 320 * 1024;
	g.fillStyle = "#1a2028";
	const CELL = 40;
	for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) {
		const x0 = map(gx * CELL - 12.5);
		const z0 = map(gz * CELL - 12.5);
		const x1 = map(gx * CELL + 12.5);
		const z1 = map(gz * CELL + 12.5);
		g.fillRect(x0, z0, x1 - x0, z1 - z0);
	}
	g.strokeStyle = "#3d4a5c";
	g.lineWidth = 2;
	g.setLineDash([10, 14]);
	for (let i = -3; i <= 4; i++) {
		const p = map(i * CELL - CELL / 2);
		g.beginPath();
		g.moveTo(p, 0);
		g.lineTo(p, 1024);
		g.stroke();
		g.beginPath();
		g.moveTo(0, p);
		g.lineTo(1024, p);
		g.stroke();
	}
	const tex = new CanvasTexture(canvas);
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = 4;
	return tex;
}
function createCity(scene, world) {
	const buckets = {
		cyan: [],
		gold: [],
		red: []
	};
	const solids = [];
	for (const b of world.buildings) {
		const w = b.maxX - b.minX;
		const d = b.maxZ - b.minZ;
		const geo = new BoxGeometry(w, b.h, d);
		geo.translate((b.minX + b.maxX) / 2, b.h / 2, (b.minZ + b.maxZ) / 2);
		solids.push(geo);
		if (b.tag !== "mast") pushWindows(b, buckets[b.glow]);
	}
	const concrete = new MeshStandardMaterial({
		color: 4871263,
		roughness: .88,
		metalness: .12
	});
	const merged = mergeGeometries(solids);
	if (!merged) throw new Error("City mesh failed to build");
	solids.forEach((geo) => geo.dispose());
	const city = new Mesh(merged, concrete);
	city.castShadow = true;
	city.receiveShadow = true;
	scene.add(city);
	Object.keys(buckets).forEach((key) => {
		const list = buckets[key];
		if (!list.length) return;
		const geo = mergeGeometries(list);
		list.forEach((item) => item.dispose());
		if (!geo) return;
		scene.add(new Mesh(geo, glowMat(GLOW_HEX[key])));
	});
	const ground = new Mesh(new PlaneGeometry(340, 340), new MeshStandardMaterial({
		map: paintGround(),
		roughness: 1,
		metalness: 0
	}));
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	scene.add(ground);
	const coverMat = new MeshStandardMaterial({
		color: 4870748,
		roughness: .62,
		metalness: .28
	});
	for (const c of world.covers) {
		const mesh = new Mesh(new BoxGeometry(c.maxX - c.minX, c.h, c.maxZ - c.minZ), c.tag === "door" ? new MeshStandardMaterial({
			color: 6959152,
			emissive: 14830411,
			emissiveIntensity: .35,
			roughness: .45,
			metalness: .4
		}) : c.reinforced ? new MeshStandardMaterial({
			color: 6051400,
			emissive: 13935178,
			emissiveIntensity: .22,
			roughness: .5,
			metalness: .45
		}) : coverMat);
		mesh.position.set((c.minX + c.maxX) / 2, c.h / 2, (c.minZ + c.maxZ) / 2);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		c.mesh = mesh;
		scene.add(mesh);
	}
	const pad = new Mesh(new RingGeometry(6.2, 7.4, 40), new MeshBasicMaterial({
		color: 13935178,
		transparent: true,
		opacity: .85,
		side: 2
	}));
	pad.rotation.x = -Math.PI / 2;
	pad.position.set(world.extract.x, .08, world.extract.z);
	scene.add(pad);
	const padFill = new Mesh(new CircleGeometry(6, 28), new MeshBasicMaterial({
		color: 13935178,
		transparent: true,
		opacity: .12,
		side: 2
	}));
	padFill.rotation.x = -Math.PI / 2;
	padFill.position.set(world.extract.x, .06, world.extract.z);
	scene.add(padFill);
	return {
		city,
		ground
	};
}
var POOL = 22;
function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}
function rayBox(ox, oy, oz, dx, dy, dz, box, maxT) {
	if (!box.alive) return null;
	const min = [
		box.minX,
		0,
		box.minZ
	];
	const max = [
		box.maxX,
		box.h,
		box.maxZ
	];
	const o = [
		ox,
		oy,
		oz
	];
	const d = [
		dx,
		dy,
		dz
	];
	let tmin = 0;
	let tmax = maxT;
	for (let i = 0; i < 3; i++) {
		const di = d[i];
		const oi = o[i];
		if (Math.abs(di) < 1e-8) {
			if (oi < min[i] || oi > max[i]) return null;
		} else {
			let t1 = (min[i] - oi) / di;
			let t2 = (max[i] - oi) / di;
			if (t1 > t2) {
				const s = t1;
				t1 = t2;
				t2 = s;
			}
			if (t1 > tmin) tmin = t1;
			if (t2 < tmax) tmax = t2;
			if (tmin > tmax) return null;
		}
	}
	if (tmin > .04 && tmin <= maxT) return tmin;
	return null;
}
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r, maxT) {
	const lx = ox - cx;
	const ly = oy - cy;
	const lz = oz - cz;
	const b = lx * dx + ly * dy + lz * dz;
	const c = lx * lx + ly * ly + lz * lz - r * r;
	const h = b * b - c;
	if (h < 0) return null;
	const t = -b - Math.sqrt(h);
	if (t > .04 && t <= maxT) return t;
	return null;
}
function rayCylinder(ox, oy, oz, dx, dy, dz, cx, cz, r, y0, y1, maxT) {
	const lx = ox - cx;
	const lz = oz - cz;
	const a = dx * dx + dz * dz;
	if (a < 1e-8) return null;
	const b = 2 * (lx * dx + lz * dz);
	const c = lx * lx + lz * lz - r * r;
	const disc = b * b - 4 * a * c;
	if (disc < 0) return null;
	const s = Math.sqrt(disc);
	let t = (-b - s) / (2 * a);
	if (t < .04) t = (-b + s) / (2 * a);
	if (t < .04 || t > maxT) return null;
	const y = oy + dy * t;
	if (y < y0 || y > y1) return null;
	return {
		t,
		y
	};
}
function makeFigure(bodyHex, visorHex) {
	const group = new Group();
	const bodyMat = new MeshStandardMaterial({
		color: bodyHex,
		roughness: .48,
		metalness: .42
	});
	const visorMat = new MeshStandardMaterial({
		color: visorHex,
		emissive: visorHex,
		emissiveIntensity: 2
	});
	const body = new Mesh(new BoxGeometry(.52, .82, .3), bodyMat);
	body.position.y = .92;
	body.castShadow = true;
	const hips = new Mesh(new BoxGeometry(.46, .38, .28), bodyMat);
	hips.position.y = .34;
	hips.castShadow = true;
	const head = new Mesh(new BoxGeometry(.28, .28, .28), bodyMat);
	head.position.y = 1.52;
	head.castShadow = true;
	const vis = new Mesh(new BoxGeometry(.2, .07, .06), visorMat);
	vis.position.set(0, 1.54, .15);
	const gun = new Mesh(new BoxGeometry(.08, .08, .42), bodyMat);
	gun.position.set(.22, 1.05, .28);
	group.add(body, hips, head, vis, gun);
	return {
		group,
		bodyMat,
		visorMat
	};
}
function gunMesh(id) {
	const g = new Group();
	const metal = new MeshStandardMaterial({
		color: 12042440,
		metalness: .55,
		roughness: .32
	});
	const dark = new MeshStandardMaterial({
		color: 3817544,
		metalness: .4,
		roughness: .45
	});
	const accentHex = id === "rail" || id === "lmg" || id === "slug" ? 13935178 : 3072200;
	const accent = new MeshStandardMaterial({
		color: accentHex,
		emissive: accentHex,
		emissiveIntensity: 1.35
	});
	const add = (w, h, d, x, y, z, mat) => {
		const m = new Mesh(new BoxGeometry(w, h, d), mat);
		m.position.set(x, y, z);
		g.add(m);
		return m;
	};
	if (id === "pistol") {
		add(.05, .08, .2, 0, 0, -.08, metal);
		add(.04, .1, .05, 0, -.07, .04, dark);
	} else if (id === "smg" || id === "needles") {
		const slim = id === "needles";
		add(slim ? .04 : .055, slim ? .055 : .07, slim ? .24 : .28, slim ? -.026 : -.035, 0, -.12, metal);
		add(slim ? .04 : .055, slim ? .055 : .07, slim ? .24 : .28, slim ? .026 : .035, 0, -.12, metal);
		add(.018, .02, .16, 0, .045, -.16, accent);
		add(.08, .1, .1, 0, -.02, .02, dark);
		add(.07, .12, .05, 0, -.1, .02, dark);
	} else if (id === "shotgun" || id === "slug") {
		add(.07, .08, .42, 0, .01, -.16, metal);
		add(.05, .05, .36, 0, .06, -.14, dark);
		add(.06, .1, .08, 0, -.06, .02, dark);
	} else if (id === "lmg") {
		add(.07, .09, .55, 0, 0, -.2, metal);
		add(.1, .16, .1, .02, -.1, -.02, dark);
		add(.08, .08, .12, 0, .02, .06, dark);
		add(.02, .04, .16, 0, .08, -.22, accent);
	} else if (id === "rail") {
		add(.045, .05, .72, 0, .02, -.28, metal);
		add(.02, .02, .6, 0, .05, -.26, accent);
		add(.06, .08, .12, 0, -.02, .02, dark);
		add(.05, .07, .08, 0, .06, -.02, dark);
	} else {
		add(.055, .07, .48, 0, .015, -.18, metal);
		add(.07, .09, .16, 0, -.01, .02, dark);
		add(.05, .12, .05, 0, -.08, .04, dark);
		add(.03, .03, .1, 0, .07, -.12, accent);
	}
	const muzzle = new Mesh(new BoxGeometry(.04, .04, .04), new MeshBasicMaterial({ color: 16773580 }));
	const tip = id === "rail" ? -.66 : id === "pistol" ? -.2 : id === "smg" || id === "needles" ? -.28 : id === "shotgun" || id === "slug" ? -.4 : id === "lmg" ? -.5 : -.44;
	muzzle.position.set(0, .02, tip);
	muzzle.visible = false;
	g.add(muzzle);
	const piece = (w, h, d, x, y, z, color, intensity = 1.4) => {
		const solar = solarCoilEmits((color >> 16 & 255) / 255, (color >> 8 & 255) / 255, (color & 255) / 255);
		const matte = color === 1710618;
		const mesh = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({
			color,
			emissive: color,
			emissiveIntensity: solar ? COIL_EMISSION : intensity,
			roughness: solar ? .34 : matte ? .92 : .32,
			metalness: solar ? .22 : matte ? .05 : .7
		}));
		mesh.position.set(x, y, z);
		mesh.visible = false;
		mesh.userData.baseEmit = solar ? COIL_EMISSION : intensity;
		mesh.userData.baseColor = color;
		mesh.userData.solar = solar;
		g.add(mesh);
		return mesh;
	};
	g.userData.muzzle = muzzle;
	g.userData.kit = {
		shroud: piece(.11, .11, .16, 0, .02, tip - .06, 1710618, .04),
		collar: piece(.08, .08, .06, 0, .02, tip + .1, 12042440, .2),
		optic: piece(.055, .04, .06, 0, .12, -.1, 3394815, 2.2),
		scope: piece(.045, .045, .22, 0, .1, -.12, 13935178, .8),
		drum: piece(.11, .12, .1, 0, -.12, .02, 2764856, .15),
		coil: piece(.045, .04, .16, 0, .06, -.18, 15106074, 2.6),
		vent: piece(.07, .02, .08, 0, .06, .02, 3072200, 1.6)
	};
	return g;
}
function paintGunKit(group, modIds) {
	const kit = group.userData.kit;
	if (!kit) return;
	const has = (code) => modIds.includes(code);
	kit.shroud.visible = has(MOD_CODE.att_shroud_barrel_01);
	kit.collar.visible = has(MOD_CODE.att_heavy_stabilizer_02);
	kit.optic.visible = has(MOD_CODE.att_holo_tactical_05);
	kit.scope.visible = has(MOD_CODE.att_chrono_tracer_scope_06);
	kit.drum.visible = has(MOD_CODE.att_extended_drum_07);
	kit.coil.visible = has(MOD_CODE.att_overcharged_capacitor_03);
	kit.vent.visible = has(MOD_CODE.att_lightweight_burst_04);
	const muzzle = group.userData.muzzle;
	const mat = muzzle?.material;
	if (!muzzle || !mat) return;
	if (has(MOD_CODE.att_shroud_barrel_01)) {
		mat.color.setHex(1710618);
		muzzle.scale.set(.35, .35, .45);
	} else if (has(MOD_CODE.att_overcharged_capacitor_03)) {
		mat.color.setHex(15106074);
		muzzle.scale.set(1.7, 1.7, 2.4);
	} else {
		mat.color.setHex(16773580);
		muzzle.scale.set(1, 1, 1);
	}
}
var MissionEngine = class {
	host;
	hooks;
	renderer;
	scene = new Scene();
	camera = new PerspectiveCamera(78, 1, .08, 480);
	viewScene = new Scene();
	viewCam = new PerspectiveCamera(78, 1, .05, 8);
	viewRig = new Group();
	guns = /* @__PURE__ */ new Map();
	world;
	solids;
	audio = new AudioBus();
	pool = [];
	loots = [];
	terminals = [];
	vips = [];
	raf = 0;
	last = -1;
	time = 0;
	keys = /* @__PURE__ */ new Set();
	keyOverride = null;
	prev = {};
	vPrev = {
		jump: false,
		ability: false,
		ult: false,
		reload: false,
		slide: false
	};
	virtual = {
		ax: 0,
		ay: 0,
		lookX: 0,
		lookY: 0,
		fire: false,
		aim: false,
		jump: false,
		sprint: false,
		crouch: false,
		reload: false,
		ability: false,
		ult: false,
		interact: false,
		slide: false,
		blood: false,
		mass: false,
		swap: false,
		lookHeld: false
	};
	aimAssist = { ...AIM_ASSIST };
	mode = "attract";
	paused = false;
	locked = false;
	touch = false;
	reduce = false;
	op = "jaya";
	x = 0;
	y = 0;
	z = 0;
	vx = 0;
	vy = 0;
	vz = 0;
	yaw = 0;
	pitch = -.2;
	eye = 1.62;
	grounded = false;
	airTime = 0;
	crouchHeld = false;
	aiming = false;
	slideT = 0;
	wallRun = 0;
	touchingWall = false;
	mouseAim = false;
	fireHeld = false;
	fireWas = false;
	slots = [];
	slot = 0;
	nextShot = 0;
	reloadT = 0;
	hp = 100;
	armor = 0;
	invuln = 0;
	healT = 0;
	phaseT = 0;
	unravelT = 0;
	unravelR = 2;
	unravelX = 0;
	unravelZ = 0;
	raT = 0;
	raAcc = 0;
	solar = 0;
	orbitalStrike = false;
	hostOp = "jaya";
	worn = null;
	accordSlots = [];
	accordSlot = 0;
	bloodPrev = false;
	massPrev = false;
	pendingImpact = 0;
	shieldT = 0;
	anchorT = 0;
	anchor = null;
	portalA = null;
	portalB = null;
	portalT = 0;
	portalLock = 0;
	voidT = 0;
	voidX = 0;
	voidZ = 0;
	qCd = 0;
	ultCd = 0;
	shotEcho = 0;
	shake = 0;
	kick = 0;
	hurtFlash = 0;
	solarFlash = 0;
	hitMarker = 0;
	headMark = false;
	bobPhase = 0;
	mouseDX = 0;
	mouseDY = 0;
	swayX = 0;
	swayY = 0;
	landed = false;
	landTime = 0;
	missionClock = 0;
	kills = 0;
	haul = 0;
	recovered = [];
	zoneX = 0;
	zoneZ = 0;
	zoneR = 180;
	outside = -1;
	zoneTick = 0;
	channel = 0;
	extractT = 0;
	beaconDone = false;
	beaconWave = false;
	lines = [];
	line = null;
	prompt = "";
	toastMsg = "";
	toastT = 0;
	feed = [];
	floaters = [];
	pressure = 0;
	sinceAid = 30;
	sincePush = 0;
	directorAcc = 0;
	freedCount = 0;
	stress = .1;
	phase = "INFILTRATION";
	panic = false;
	dropAge = 0;
	stepAcc = 0;
	flash = 0;
	nextBolt = 6;
	sens = .00215;
	viewW = 1;
	viewH = 1;
	hud = null;
	mapCtx = null;
	zoneLine;
	beam;
	orbitalBeam;
	orbitalHalo;
	orbitalLight;
	orbitalVfx = 0;
	ship;
	shieldMesh;
	portalMeshA;
	portalMeshB;
	voidMesh;
	unravelMesh;
	anchorMesh;
	footGeo;
	footPts;
	footprints = [];
	footAcc = 0;
	rainGeo;
	rain = [];
	sun;
	skyMat;
	tracers = [];
	sparks = [];
	rubble = [];
	euler = new Euler(0, 0, 0, "YXZ");
	aim = new Vector3();
	camPos = new Vector3();
	camRight = new Vector3();
	camUp = new Vector3();
	tmp = new Vector3();
	look = new Vector3();
	disposed = false;
	onKeyDown;
	onKeyUp;
	onMouse;
	onDown;
	onUp;
	onLock;
	onBlur;
	onContext;
	onResize;
	ro;
	constructor(host, hooks) {
		this.host = host;
		this.hooks = hooks;
		this.touch = window.matchMedia("(pointer: coarse)").matches;
		this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.world = buildWorld();
		this.solids = [...this.world.buildings, ...this.world.covers];
		this.renderer = new WebGLRenderer({
			antialias: true,
			powerPreference: "high-performance"
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		this.renderer.setSize(host.clientWidth || 1, host.clientHeight || 1, false);
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = 4;
		this.renderer.toneMappingExposure = 1.28;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = 1;
		this.renderer.autoClear = false;
		this.renderer.domElement.style.width = "100%";
		this.renderer.domElement.style.height = "100%";
		this.renderer.domElement.style.display = "block";
		host.appendChild(this.renderer.domElement);
		this.scene.fog = new FogExp2(2765112, .0052);
		this.skyMat = new ShaderMaterial({
			side: 1,
			depthWrite: false,
			fog: false,
			uniforms: {
				top: { value: new Color("#101820") },
				hor: { value: new Color("#6a5344") },
				bot: { value: new Color("#1c1814") },
				flash: { value: 0 }
			},
			vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
			fragmentShader: `varying vec3 vP; uniform vec3 top, hor, bot; uniform float flash;
        void main(){
          float h = normalize(vP).y;
          vec3 col = mix(hor, top, smoothstep(0.02, 0.55, h));
          col = mix(bot, col, smoothstep(-0.25, 0.08, h));
          col = mix(col, vec3(0.85, 0.9, 1.0), flash);
          gl_FragColor = vec4(col, 1.0);
        }`
		});
		const sky = new Mesh(new SphereGeometry(420, 20, 12), this.skyMat);
		this.scene.add(sky);
		this.scene.add(new HemisphereLight(12965092, 3811874, .95));
		this.sun = new DirectionalLight(16773340, 1.65);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(1024, 1024);
		this.sun.shadow.camera.near = 2;
		this.sun.shadow.camera.far = 120;
		this.sun.shadow.camera.left = -40;
		this.sun.shadow.camera.right = 40;
		this.sun.shadow.camera.top = 40;
		this.sun.shadow.camera.bottom = -40;
		this.sun.shadow.bias = -6e-4;
		this.scene.add(this.sun);
		this.scene.add(this.sun.target);
		createCity(this.scene, this.world);
		for (const [x, y, z, color] of [
			[
				80,
				6,
				-62,
				14830411
			],
			[
				-80,
				6,
				62,
				13935178
			],
			[
				0,
				5,
				0,
				3072200
			],
			[
				0,
				4,
				-138,
				13935178
			],
			[
				40,
				5,
				-40,
				8954040
			],
			[
				-40,
				5,
				40,
				8954040
			]
		]) {
			const light = new PointLight(color, 10, 22, 2);
			light.position.set(x, y, z);
			this.scene.add(light);
		}
		this.zoneLine = new LineLoop(new BufferGeometry(), new LineBasicMaterial({ color: 13935178 }));
		const ring = /* @__PURE__ */ new Float32Array(291);
		this.zoneLine.geometry.setAttribute("position", new BufferAttribute(ring, 3));
		this.zoneLine.material.fog = false;
		this.zoneLine.frustumCulled = false;
		this.scene.add(this.zoneLine);
		this.beam = new Mesh(new CylinderGeometry(.12, .12, 36, 8), new MeshBasicMaterial({
			color: 3072200,
			transparent: true,
			opacity: .35,
			fog: false
		}));
		this.scene.add(this.beam);
		const coreMat = new MeshBasicMaterial({
			color: 16773577,
			transparent: true,
			opacity: .9,
			fog: false,
			depthWrite: false,
			side: 2,
			blending: 2
		});
		const haloMat = new MeshBasicMaterial({
			color: 16752412,
			transparent: true,
			opacity: .28,
			fog: false,
			depthWrite: false,
			side: 2,
			blending: 2
		});
		this.orbitalBeam = new Mesh(new CylinderGeometry(.28, .7, 1, 12, 1, true), coreMat);
		this.orbitalHalo = new Mesh(new CylinderGeometry(1.2, 2.6, 1, 16, 1, true), haloMat);
		this.orbitalBeam.visible = false;
		this.orbitalHalo.visible = false;
		this.orbitalBeam.frustumCulled = false;
		this.orbitalHalo.frustumCulled = false;
		this.orbitalLight = new PointLight(16754202, 0, 48, 2);
		this.orbitalLight.visible = false;
		this.scene.add(this.orbitalBeam, this.orbitalHalo, this.orbitalLight);
		this.ship = new Group();
		const hullMat = new MeshStandardMaterial({
			color: 1711652,
			metalness: .6,
			roughness: .4
		});
		const hull = new Mesh(new BoxGeometry(3.2, .7, 9), hullMat);
		const wing = new Mesh(new BoxGeometry(8, .12, 2.2), hullMat);
		wing.position.z = 1.2;
		const lamp = new Mesh(new BoxGeometry(.2, .12, .4), new MeshStandardMaterial({
			color: 3072200,
			emissive: 3072200,
			emissiveIntensity: 2
		}));
		lamp.position.set(0, -.4, -4.2);
		this.ship.add(hull, wing, lamp);
		this.scene.add(this.ship);
		const ringMat = (color) => new MeshBasicMaterial({
			color,
			transparent: true,
			opacity: .85,
			side: 2,
			fog: false
		});
		this.portalMeshA = new Mesh(new TorusGeometry(1.05, .05, 8, 24), ringMat(3072200));
		this.portalMeshB = new Mesh(new TorusGeometry(1.05, .05, 8, 24), ringMat(13935178));
		this.portalMeshA.visible = false;
		this.portalMeshB.visible = false;
		this.scene.add(this.portalMeshA, this.portalMeshB);
		this.voidMesh = new Mesh(new TorusGeometry(3.2, .08, 8, 28), new MeshBasicMaterial({
			color: 3072200,
			transparent: true,
			opacity: .7,
			fog: false
		}));
		this.voidMesh.rotation.x = Math.PI / 2;
		this.voidMesh.visible = false;
		this.scene.add(this.voidMesh);
		this.unravelMesh = new Mesh(new SphereGeometry(1, 18, 12), new MeshBasicMaterial({
			color: 8320746,
			transparent: true,
			opacity: .14,
			wireframe: true,
			fog: false
		}));
		this.unravelMesh.visible = false;
		this.scene.add(this.unravelMesh);
		this.anchorMesh = new Mesh(new CylinderGeometry(.35, .35, .08, 16), new MeshBasicMaterial({
			color: 3072200,
			fog: false
		}));
		this.anchorMesh.visible = false;
		this.scene.add(this.anchorMesh);
		this.shieldMesh = new Mesh(new CircleGeometry(1.55, 28), new MeshBasicMaterial({
			color: 13935178,
			transparent: true,
			opacity: .22,
			side: 2,
			depthWrite: false,
			fog: false
		}));
		this.shieldMesh.visible = false;
		this.scene.add(this.shieldMesh);
		this.footGeo = new BufferGeometry();
		this.footGeo.setAttribute("position", new BufferAttribute(/* @__PURE__ */ new Float32Array(540), 3));
		this.footGeo.setAttribute("color", new BufferAttribute(/* @__PURE__ */ new Float32Array(540), 3));
		this.footPts = new Points(this.footGeo, new PointsMaterial({
			size: .16,
			vertexColors: true,
			transparent: true,
			opacity: .9,
			depthWrite: false
		}));
		this.footPts.frustumCulled = false;
		this.scene.add(this.footPts);
		this.rain = Array.from({ length: 420 }, () => ({
			x: (Math.random() - .5) * 46,
			y: Math.random() * 26,
			z: (Math.random() - .5) * 46
		}));
		this.rainGeo = new BufferGeometry();
		this.rainGeo.setAttribute("position", new BufferAttribute(new Float32Array(this.rain.length * 2 * 3), 3));
		const rainLines = new LineSegments(this.rainGeo, new LineBasicMaterial({
			color: 10135732,
			transparent: true,
			opacity: .28
		}));
		rainLines.frustumCulled = false;
		this.scene.add(rainLines);
		for (let i = 0; i < 16; i++) {
			const geo = new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]);
			const line = new Line(geo, new LineBasicMaterial({ color: 16769712 }));
			line.visible = false;
			line.frustumCulled = false;
			this.scene.add(line);
			this.tracers.push({
				line,
				life: 0
			});
		}
		for (let i = 0; i < 18; i++) {
			const mesh = new Mesh(new BoxGeometry(.08, .08, .08), new MeshBasicMaterial({ color: 16769712 }));
			mesh.visible = false;
			this.scene.add(mesh);
			this.sparks.push({
				mesh,
				life: 0,
				vx: 0,
				vy: 0,
				vz: 0
			});
		}
		const chipMat = new MeshStandardMaterial({
			color: 12891290,
			roughness: .6,
			metalness: .2
		});
		for (let i = 0; i < 28; i++) {
			const mesh = new Mesh(new BoxGeometry(1, 1, 1), chipMat);
			mesh.visible = false;
			mesh.castShadow = true;
			this.scene.add(mesh);
			this.rubble.push({
				mesh,
				life: 0,
				vx: 0,
				vy: 0,
				vz: 0
			});
		}
		for (let i = 0; i < POOL; i++) {
			const fig = makeFigure(2761768, 14830411);
			fig.group.visible = false;
			this.scene.add(fig.group);
			this.pool.push({
				alive: false,
				squad: false,
				deployed: false,
				kind: "guard",
				team: "sec",
				name: "NS-SEC",
				x: 0,
				y: 0,
				z: 0,
				yaw: 0,
				hp: 100,
				maxHp: 100,
				cooldown: 0,
				aggro: 0,
				slow: 0,
				hurt: 0,
				down: 0,
				corpse: 0,
				blind: 0,
				lift: 0,
				group: fig.group,
				bodyMat: fig.bodyMat,
				visorMat: fig.visorMat
			});
		}
		for (const site of this.world.sites) {
			const id = site.id === "alpha" ? "ananda" : "nefret";
			const mesh = this.makeDescendant(id);
			mesh.position.set(site.x, 0, site.z);
			this.scene.add(mesh);
			this.vips.push({
				mesh,
				x: site.x,
				y: 0,
				z: site.z,
				active: false,
				site,
				id,
				cd: 2,
				worn: false
			});
		}
		for (const spec of this.world.loots) this.makeLoot(spec, false);
		for (const spec of this.world.terminals) {
			const mesh = new Group();
			const body = new Mesh(new BoxGeometry(.72, 1.15, .42), new MeshStandardMaterial({
				color: 1777961,
				roughness: .55,
				metalness: .4
			}));
			body.position.y = .58;
			const screen = new Mesh(new BoxGeometry(.42, .28, .04), new MeshStandardMaterial({
				color: 13935178,
				emissive: 13935178,
				emissiveIntensity: 1.6,
				roughness: .3
			}));
			screen.position.set(0, .82, .22);
			mesh.add(body, screen);
			mesh.position.set(spec.x, 0, spec.z);
			this.scene.add(mesh);
			this.terminals.push({
				x: spec.x,
				z: spec.z,
				mesh,
				open: false
			});
		}
		this.viewScene.add(this.viewRig);
		this.viewScene.add(new AmbientLight(16777215, 1.35));
		const viewSun = new DirectionalLight(16777215, 1.8);
		viewSun.position.set(1, 2, 1);
		this.viewScene.add(viewSun);
		Object.keys(WEAPONS).forEach((id) => {
			const mesh = gunMesh(id);
			mesh.visible = false;
			this.viewRig.add(mesh);
			this.guns.set(id, mesh);
		});
		this.onKeyDown = (e) => {
			if (e.code === "Escape") {
				e.preventDefault();
				this.togglePause();
				return;
			}
			this.keys.add(e.code);
			if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
		};
		this.onKeyUp = (e) => this.keys.delete(e.code);
		this.onMouse = (e) => {
			if (!this.locked || this.paused) return;
			if (this.mode !== "drop" && this.mode !== "ground") return;
			const sens = this.sens * (this.aiming ? .62 : 1);
			this.yaw -= e.movementX * sens;
			this.pitch = clamp(this.pitch - e.movementY * sens, -1.35, 1.35);
			this.mouseDX += e.movementX;
			this.mouseDY += e.movementY;
		};
		this.onDown = (e) => {
			if (!this.locked || this.paused) return;
			if (e.button === 0) this.fireHeld = true;
			if (e.button === 2) this.mouseAim = true;
		};
		this.onUp = (e) => {
			if (e.button === 0) this.fireHeld = false;
			if (e.button === 2) this.mouseAim = false;
		};
		this.onLock = () => {
			this.locked = document.pointerLockElement === this.renderer.domElement;
			if (!this.locked) {
				this.fireHeld = false;
				this.mouseAim = false;
			}
			this.hooks.onEvent({
				type: "lock",
				locked: this.locked
			});
		};
		this.onBlur = () => this.keys.clear();
		this.onContext = (e) => e.preventDefault();
		this.onResize = () => this.resize();
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		window.addEventListener("mousemove", this.onMouse);
		window.addEventListener("mousedown", this.onDown);
		window.addEventListener("mouseup", this.onUp);
		document.addEventListener("pointerlockchange", this.onLock);
		window.addEventListener("blur", this.onBlur);
		this.renderer.domElement.addEventListener("contextmenu", this.onContext);
		window.addEventListener("resize", this.onResize);
		this.renderer.domElement.addEventListener("click", () => {
			if ((this.mode === "drop" || this.mode === "ground") && !this.paused) this.capture();
		});
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(host);
		this.resize();
		window.__controlsTest = {
			getYaw: () => this.yaw,
			getSpeed: () => Math.hypot(this.vx, this.vz),
			getPos: () => ({
				x: this.x,
				y: this.y,
				z: this.z
			}),
			setKeys: (codes) => {
				this.keyOverride = codes.length ? new Set(codes) : null;
			},
			getMode: () => this.mode
		};
		this.raf = requestAnimationFrame(this.loop);
	}
	bind(root) {
		this.hud = root.querySelector("#mte-hud");
		const map = root.querySelector("#mte-map");
		if (map) this.mapCtx = map.getContext("2d");
	}
	destroy() {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		this.ro.disconnect();
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("mousemove", this.onMouse);
		window.removeEventListener("mousedown", this.onDown);
		window.removeEventListener("mouseup", this.onUp);
		document.removeEventListener("pointerlockchange", this.onLock);
		window.removeEventListener("blur", this.onBlur);
		window.removeEventListener("resize", this.onResize);
		if (window.__controlsTest) window.__controlsTest = void 0;
		this.renderer.dispose();
		this.renderer.domElement.remove();
		this.audio.ctx?.close();
	}
	capture() {
		const canvas = this.renderer.domElement;
		if (this.touch) return;
		try {
			const ret = canvas.requestPointerLock({ unadjustedMovement: true });
			Promise.resolve(ret).catch(() => canvas.requestPointerLock());
		} catch {
			canvas.requestPointerLock();
		}
	}
	toggleMute() {
		this.audio.ensure();
		return this.audio.toggleMute();
	}
	togglePause() {
		if (this.mode === "attract" || this.mode === "dead" || this.mode === "win") return;
		this.paused = !this.paused;
		if (this.paused) {
			this.fireHeld = false;
			if (document.pointerLockElement) document.exitPointerLock();
		}
		this.hooks.onEvent({
			type: "pause",
			paused: this.paused
		});
	}
	resume() {
		this.paused = false;
		for (const key of Object.keys(this.prev)) this.prev[key] = this.held(key);
		this.hooks.onEvent({
			type: "pause",
			paused: false
		});
		this.capture();
	}
	abort() {
		this.paused = false;
		this.mode = "attract";
		this.fireHeld = false;
		this.keyOverride = null;
		if (document.pointerLockElement) document.exitPointerLock();
		this.resetMission();
		this.hooks.onEvent({
			type: "mode",
			mode: "menu"
		});
	}
	reinsert() {
		if (this.mode !== "dead") return;
		this.hp = 100;
		this.armor = 25;
		this.invuln = 2.4;
		this.mode = "ground";
		const p = this.objectivePoint();
		this.placeNear(p.x, p.z);
		this.vy = 0;
		this.hooks.onEvent({
			type: "mode",
			mode: "play"
		});
	}
	start(op) {
		this.audio.ensure();
		this.op = op;
		this.hostOp = op;
		this.worn = null;
		this.solar = 0;
		this.unravelT = 0;
		this.raT = 0;
		this.paused = false;
		this.resetMission();
		this.mode = "drop";
		this.landed = false;
		this.dropAge = 0;
		this.x = 0;
		this.y = 120;
		this.z = 86;
		this.vx = 0;
		this.vy = -11;
		this.vz = 0;
		this.yaw = 0;
		this.pitch = -.42;
		this.eye = 1.62;
		this.hp = 100;
		this.armor = this.op === "khensu" ? 40 : 15;
		this.zoneX = 0;
		this.zoneZ = 0;
		this.zoneR = 176;
		this.missionClock = 0;
		this.kills = 0;
		this.haul = 0;
		this.recovered = [];
		this.grounded = false;
		const primary = OPERATOR_BY_ID[op].weapon;
		const brought = modsForDrop(loadMars(), primary);
		this.slots = [{
			id: primary,
			mag: WEAPONS[primary].mag,
			reserve: WEAPONS[primary].mag * 2,
			mods: brought
		}, {
			id: "pistol",
			mag: WEAPONS.pistol.mag,
			reserve: WEAPONS.pistol.mag * 2,
			mods: []
		}];
		this.slot = 0;
		this.say("ACCORD", "Ananda is under Cradle Alpha. Nefret is under Cradle Omega. The technocrats have been cutting them open.");
		this.say("MA'AT", "Parachute in. Scavenge what the street gives you. Breach the cells.");
		this.say("DHARMA", "Free air lights the signal fires. When a bloodline is loose, B wears it. It will not feel trained.");
		this.say("TACTICAL", "Slums drop scrap guns. The monolith drops rails. A mod seats on the weapon in your hands.");
		if (brought.length) this.say("MARS", "The bench sent your filed mods down with the gun.");
		this.configureSquad();
		this.spawnInitial();
		this.sealLoadout();
		this.hooks.onEvent({
			type: "mode",
			mode: "play"
		});
	}
	resetMission() {
		for (const box of this.world.covers) {
			box.alive = true;
			box.hp = box.maxHp;
			if (box.mesh) box.mesh.visible = true;
		}
		for (const site of this.world.sites) site.freed = false;
		this.freedCount = 0;
		this.stress = .1;
		this.recovered = [];
		this.phase = "INFILTRATION";
		this.panic = false;
		this.beaconDone = false;
		this.beaconWave = false;
		this.channel = 0;
		this.extractT = 0;
		this.qCd = 0;
		this.ultCd = 0;
		this.phaseT = 0;
		this.shieldT = 0;
		this.anchorT = 0;
		this.anchor = null;
		this.portalA = null;
		this.portalB = null;
		this.portalT = 0;
		this.voidT = 0;
		this.healT = 0;
		this.solar = 0;
		this.orbitalStrike = false;
		this.orbitalVfx = 0;
		this.orbitalBeam.visible = false;
		this.orbitalHalo.visible = false;
		this.orbitalLight.visible = false;
		this.orbitalLight.intensity = 0;
		this.solarFlash = 0;
		this.unravelT = 0;
		this.raT = 0;
		this.worn = null;
		this.lines = [];
		this.line = null;
		this.feed = [];
		this.floaters = [];
		this.footprints = [];
		this.reloadT = 0;
		this.slideT = 0;
		for (const loot of [...this.loots]) if (loot.extra) {
			loot.mesh.removeFromParent();
			this.loots.splice(this.loots.indexOf(loot), 1);
		} else {
			loot.alive = true;
			loot.mesh.visible = true;
		}
		for (const term of this.terminals) {
			term.open = false;
			term.mesh.visible = true;
		}
		for (const vip of this.vips) {
			vip.active = false;
			vip.x = vip.site.x;
			vip.z = vip.site.z;
			vip.y = 0;
			vip.mesh.position.set(vip.x, .15, vip.z);
			vip.mesh.visible = true;
			vip.worn = false;
			vip.cd = 1.5;
		}
		for (const actor of this.pool) {
			actor.alive = false;
			actor.squad = false;
			actor.deployed = false;
			actor.down = 0;
			actor.corpse = 0;
			actor.group.visible = false;
			actor.group.rotation.set(0, 0, 0);
			actor.bodyMat.opacity = 1;
			actor.bodyMat.transparent = false;
		}
	}
	configureSquad() {
		OPERATORS.filter((o) => o.id !== this.op).forEach((op, index) => {
			const actor = this.pool[index];
			actor.squad = true;
			actor.alive = true;
			actor.deployed = false;
			actor.kind = "squad";
			actor.team = "accord";
			actor.opId = op.id;
			actor.name = op.name;
			actor.hp = 100;
			actor.maxHp = 100;
			actor.down = 0;
			actor.x = 0;
			actor.z = 0;
			actor.y = 0;
			this.paint(actor, op.tone === "gold" ? 3814436 : 1849916, op.tone === "gold" ? 13935178 : 3072200);
			actor.group.visible = false;
		});
	}
	makeDescendant(kind) {
		const mesh = new Group();
		const pulse = [];
		const add = (w, h, d, x, y, z, color, emissive, intensity) => {
			const mat = new MeshStandardMaterial({
				color,
				emissive,
				emissiveIntensity: intensity,
				roughness: .48,
				metalness: intensity > .8 ? .4 : .15
			});
			if (intensity > .25) pulse.push(mat);
			const box = new Mesh(new BoxGeometry(w, h, d), mat);
			box.position.set(x, y, z);
			box.castShadow = true;
			mesh.add(box);
		};
		if (kind === "ananda") {
			add(.36, .62, .26, 0, .98, 0, 1194036, 3072200, .85);
			add(.14, .46, .14, -.1, .38, 0, 795682, 1333328, .3);
			add(.14, .46, .14, .1, .38, 0, 795682, 1333328, .3);
			add(.22, .22, .22, 0, 1.5, 0, 15262936, 1716272, .15);
			add(.1, .32, .1, -.26, .95, 0, 1455152, 0, 0);
			add(.1, .32, .1, .26, .95, 0, 1455152, 0, 0);
			add(.12, .08, .12, -.26, 1.12, 0, 14155768, 3072200, 1.8);
			add(.12, .08, .12, .26, 1.12, 0, 14155768, 3072200, 1.8);
		} else {
			add(.5, .72, .34, 0, .98, 0, 3813400, 13935178, .45);
			add(.26, .14, .28, -.36, 1.22, 0, 6969408, 13935178, .55);
			add(.26, .14, .28, .36, 1.22, 0, 6969408, 13935178, .55);
			add(.16, .42, .16, -.14, .36, 0, 2366482, 0, 0);
			add(.16, .42, .16, .14, .36, 0, 2366482, 0, 0);
			add(.24, .24, .24, 0, 1.56, 0, 15786696, 13935178, .7);
			add(.46, .045, .06, 0, 1.12, .16, 16769700, 13935178, 1.7);
			add(.46, .045, .06, 0, .82, .16, 16769700, 13935178, 1.3);
		}
		mesh.userData.pulse = pulse;
		return mesh;
	}
	paint(actor, body, visor) {
		actor.bodyMat.color.setHex(body);
		actor.bodyMat.emissive.setHex(0);
		actor.bodyMat.opacity = 1;
		actor.bodyMat.transparent = false;
		actor.visorMat.color.setHex(visor);
		actor.visorMat.emissive.setHex(visor);
	}
	spawnInitial() {
		for (const guard of this.world.guards) this.spawnSec(guard.x, guard.z);
		const far = this.world.nodes.filter((n) => Math.hypot(n.x, n.z - 80) > 40);
		for (let i = 0; i < 4; i++) {
			const n = far[i * 3];
			if (n) this.spawnSec(n.x, n.z);
		}
	}
	aliveSec() {
		return this.pool.filter((a) => a.alive && a.team === "sec" && a.down <= 0).length;
	}
	acquire() {
		if (this.pool.filter((a) => a.alive && !a.squad).length >= 16) return null;
		return this.pool.find((a) => !a.alive && !a.squad && a.corpse <= 0) ?? this.pool.find((a) => !a.alive && !a.squad) ?? null;
	}
	spawnSec(x, z) {
		const actor = this.acquire();
		if (!actor) return null;
		if (movementBlocked(x, z, 0, this.solids)) {
			x += 2.4;
			z += 1.6;
		}
		actor.alive = true;
		actor.kind = "guard";
		actor.team = "sec";
		actor.name = "NS-SEC";
		actor.hp = 100;
		actor.maxHp = 100;
		actor.x = x;
		actor.y = 0;
		actor.z = z;
		actor.down = 0;
		actor.corpse = 0;
		actor.aggro = 0;
		actor.slow = 0;
		actor.blind = 0;
		actor.lift = 0;
		actor.cooldown = Math.random();
		actor.group.visible = true;
		actor.group.rotation.set(0, 0, 0);
		this.paint(actor, 2761768, 14830411);
		return actor;
	}
	spawnMilitia(x, z) {
		const actor = this.acquire();
		if (!actor) return;
		actor.alive = true;
		actor.kind = "militia";
		actor.team = "militia";
		actor.name = "MILITIA";
		actor.hp = 70;
		actor.maxHp = 70;
		actor.x = x;
		actor.y = 0;
		actor.z = z;
		actor.down = 0;
		actor.corpse = 0;
		actor.aggro = 4;
		actor.blind = 0;
		actor.lift = 0;
		actor.cooldown = .4;
		actor.group.visible = true;
		actor.group.rotation.set(0, 0, 0);
		this.paint(actor, 3946544, 15262936);
	}
	spawnWave(count, around) {
		let made = 0;
		const nodes = [...this.world.nodes].sort(() => Math.random() - .5);
		for (const node of nodes) {
			if (made >= count || this.aliveSec() >= 14) break;
			if (around && Math.hypot(node.x - around.x, node.z - around.z) < 18) continue;
			if (Math.hypot(node.x - this.x, node.z - this.z) < 18) continue;
			if (this.pool.some((a) => a.alive && Math.hypot(a.x - node.x, a.z - node.z) < 4)) continue;
			if (this.spawnSec(node.x, node.z)) made++;
		}
	}
	makeLoot(spec, extra) {
		const group = new Group();
		const color = spec.kind === "intel" ? 14830411 : spec.kind === "weapon" || spec.kind === "mod" ? 13935178 : spec.kind === "ammo" ? 3072200 : spec.kind === "armor" ? 14830411 : 15262936;
		const box = new Mesh(new BoxGeometry(.5, .32, .5), new MeshStandardMaterial({
			color,
			emissive: color,
			emissiveIntensity: 1.15,
			roughness: .35
		}));
		box.position.y = .4;
		const pole = new Mesh(new CylinderGeometry(.02, .02, 2.4, 5), new MeshBasicMaterial({
			color,
			transparent: true,
			opacity: .7,
			fog: false
		}));
		pole.position.y = 1.5;
		group.add(box, pole);
		group.position.set(spec.x, 0, spec.z);
		this.scene.add(group);
		this.loots.push({
			...spec,
			mesh: group,
			alive: true,
			extra,
			spin: Math.random() * 6
		});
	}
	loop = (stamp) => {
		if (this.disposed) return;
		this.raf = requestAnimationFrame(this.loop);
		if (this.last < 0) {
			this.last = stamp;
			this.render();
			return;
		}
		const dt = Math.min(.05, (stamp - this.last) / 1e3);
		this.last = stamp;
		if (!this.paused) {
			this.time += dt;
			if (this.mode === "attract") this.updateAttract(dt);
			else this.updateGame(dt);
		}
		this.render();
	};
	updateAttract(dt) {
		const t = this.time * .07;
		this.camera.position.set(Math.sin(t) * 58, 74, Math.cos(t) * 58);
		this.camera.lookAt(0, 6, 0);
		this.ship.visible = true;
		this.ship.position.set(Math.sin(this.time * .15) * 36, 28, Math.cos(this.time * .15) * 36);
		this.ship.lookAt(0, 10, 0);
		this.ambience(dt, this.camera.position.x, this.camera.position.y, this.camera.position.z);
		this.zoneX = 0;
		this.zoneZ = 0;
		this.zoneR = 150;
		this.drawZone();
	}
	updateGame(dt) {
		if (this.mode === "dead" || this.mode === "win") {
			this.ambience(dt, this.x, this.y + this.eye, this.z);
			this.drawZone();
			this.writeHud();
			return;
		}
		if (this.mode === "drop" || this.mode === "ground") this.missionClock += dt;
		this.dropAge += this.mode === "drop" ? dt : 0;
		this.invuln = Math.max(0, this.invuln - dt);
		this.shotEcho = Math.max(0, this.shotEcho - dt);
		this.qCd = Math.max(0, this.qCd - dt);
		this.ultCd = Math.max(0, this.ultCd - dt);
		this.phaseT = Math.max(0, this.phaseT - dt);
		this.shieldT = Math.max(0, this.shieldT - dt);
		this.anchorT = Math.max(0, this.anchorT - dt);
		this.portalT = Math.max(0, this.portalT - dt);
		this.portalLock = Math.max(0, this.portalLock - dt);
		this.voidT = Math.max(0, this.voidT - dt);
		this.healT = Math.max(0, this.healT - dt);
		if (this.portalT <= 0) {
			this.portalA = null;
			this.portalB = null;
		}
		this.sinceAid += dt;
		this.sincePush += dt;
		this.readEdges();
		this.simulatePlayer(dt);
		this.tickReload(dt);
		this.tryShoot();
		this.abilities();
		this.tickBlood(dt);
		this.portalsAndVoid(dt);
		this.updateActors(dt);
		this.updateVips(dt);
		this.updateLoot(dt);
		this.updateZone(dt);
		this.objectives(dt);
		this.director(dt);
		this.tickLines(dt);
		this.footprintsUpdate(dt);
		this.decayJuice(dt);
		if (this.healT > 0) {
			this.hp = Math.min(100, this.hp + 16 * dt);
			for (const actor of this.pool) {
				if (!actor.squad || !actor.deployed || actor.down > 0) continue;
				if (Math.hypot(actor.x - this.x, actor.z - this.z) < 12) actor.hp = Math.min(actor.maxHp, actor.hp + 12 * dt);
			}
		}
		this.ambience(dt, this.x, this.y + 4, this.z);
		this.posePlayer();
		this.writeHud();
	}
	held(code) {
		if (this.keyOverride) return this.keyOverride.has(code);
		return this.keys.has(code);
	}
	edge(code) {
		const down = this.held(code);
		const was = this.prev[code] === true;
		this.prev[code] = down;
		return down && !was;
	}
	consumeVirtual(name) {
		const down = this.virtual[name];
		const was = this.vPrev[name];
		this.vPrev[name] = down;
		return down && !was;
	}
	readEdges() {
		if (this.edge("Digit1")) {
			this.slot = 0;
			this.reloadT = 0;
		}
		if (this.edge("Digit2")) {
			this.slot = 1;
			this.reloadT = 0;
		}
		if (this.virtual.swap && !this.swapPrev) {
			this.slot = this.slot === 0 ? 1 : 0;
			this.reloadT = 0;
		}
		this.swapPrev = this.virtual.swap;
		const blood = this.held("KeyB") || this.virtual.blood;
		if (blood && !this.bloodPrev) this.cycleBlood();
		this.bloodPrev = blood;
		const mass = this.held("KeyX") || this.virtual.mass;
		if (mass && !this.massPrev) this.massStrike();
		this.massPrev = mass;
	}
	selectWeapon(index) {
		if (index < 0 || index >= this.slots.length || this.slot === index) return;
		this.slot = index;
		this.reloadT = 0;
	}
	touchReadout() {
		const prompt = this.prompt;
		return {
			prompt,
			action: prompt.startsWith("E  ") || prompt.startsWith("HOLD E") ? "interact" : prompt.startsWith("Q") ? "ability" : null,
			weapons: this.slots.map((slot, index) => ({
				name: WEAPONS[slot.id].name,
				active: index === this.slot
			}))
		};
	}
	simulatePlayer(dt) {
		const forwardInput = clamp((this.held("KeyW") ? 1 : 0) - (this.held("KeyS") ? 1 : 0) + this.virtual.ay, -1, 1);
		const strafeInput = clamp((this.held("KeyD") ? 1 : 0) - (this.held("KeyA") ? 1 : 0) + this.virtual.ax, -1, 1);
		const sens = this.sens * (this.aiming ? .62 : 1);
		let lookX = this.virtual.lookX;
		let lookY = this.virtual.lookY;
		if (this.touch && this.virtual.lookHeld && (this.mode === "ground" || this.mode === "drop")) {
			const targets = [];
			for (const actor of this.pool) {
				if (!actor.alive || actor.hp <= 0 || actor.down > 0 || actor.team !== "sec") continue;
				if (!hasLos(this.x, this.z, actor.x, actor.z, this.solids)) continue;
				targets.push({
					x: actor.x,
					y: actor.y + 1.2,
					z: actor.z
				});
			}
			const assisted = applyAimAssist({
				origin: {
					x: this.x,
					y: this.y + this.eye,
					z: this.z
				},
				yaw: this.yaw,
				pitch: this.pitch,
				lookX,
				lookY,
				targets,
				dt,
				config: this.aimAssist
			});
			lookX = assisted.lookX;
			lookY = assisted.lookY;
			this.yaw += assisted.yawPull;
			this.pitch = clamp(this.pitch + assisted.pitchPull, -1.35, 1.35);
		}
		this.yaw -= lookX * sens;
		this.pitch = clamp(this.pitch - lookY * sens, -1.35, 1.35);
		this.mouseDX += this.virtual.lookX;
		this.mouseDY += this.virtual.lookY;
		this.virtual.lookX = 0;
		this.virtual.lookY = 0;
		const fx = -Math.sin(this.yaw);
		const fz = -Math.cos(this.yaw);
		const rx = Math.cos(this.yaw);
		const rz = -Math.sin(this.yaw);
		let wishX = fx * forwardInput + rx * strafeInput;
		let wishZ = fz * forwardInput + rz * strafeInput;
		const wishLen = Math.hypot(wishX, wishZ);
		if (wishLen > 1) {
			wishX /= wishLen;
			wishZ /= wishLen;
		}
		this.aiming = (this.mouseAim || this.virtual.aim) && this.mode === "ground";
		const sprinting = (this.held("ShiftLeft") || this.held("ShiftRight") || this.virtual.sprint) && forwardInput > .15 && !this.aiming;
		const speedNow = Math.hypot(this.vx, this.vz);
		if (this.consumeSlide() && this.mode === "ground" && this.grounded && speedNow > 5.2) {
			this.slideT = .72;
			this.vx *= 1.3;
			this.vz *= 1.3;
		}
		this.crouchHeld = this.held("ControlLeft") || this.held("ControlRight") || this.virtual.crouch || this.slideT > 0;
		let max = 5.6 * WEAPONS[this.slots[this.slot]?.id ?? "pistol"].move;
		if (this.op === "bodhi") max *= 1.12;
		if (this.op === "ananda") max *= 1.08;
		if (this.op === "khensu" || this.op === "nefret") max *= .92;
		if (this.inUnravel(this.x, this.z)) max *= 1.5;
		if (this.raT > 0) max *= .55;
		if (this.crouchHeld && this.slideT <= 0) max *= .56;
		else if (sprinting) max *= 1.5;
		if (this.aiming) max *= .62;
		if (this.mode === "drop") max = 17;
		if (this.slideT > 0 && this.mode === "ground") {
			this.slideT -= dt;
			const drag = this.op === "ananda" ? .18 : .85;
			this.vx *= Math.exp(-drag * dt);
			this.vz *= Math.exp(-drag * dt);
			this.vx += wishX * (this.op === "ananda" ? 4 : 8) * dt;
			this.vz += wishZ * (this.op === "ananda" ? 4 : 8) * dt;
		} else {
			const accel = this.mode === "drop" ? 7 : this.grounded ? 13 : 3;
			const k = 1 - Math.exp(-accel * dt);
			this.vx += (wishX * max - this.vx) * k;
			this.vz += (wishZ * max - this.vz) * k;
		}
		this.touchingWall = false;
		const nx = this.x + this.vx * dt;
		if (movementBlocked(nx, this.z, this.y, this.solids)) {
			this.touchingWall = true;
			this.deflect("x");
		} else this.x = nx;
		const nz = this.z + this.vz * dt;
		if (movementBlocked(this.x, nz, this.y, this.solids)) {
			this.touchingWall = true;
			this.deflect("z");
		} else this.z = nz;
		const limit = this.world.limit;
		this.x = clamp(this.x, -limit, limit);
		this.z = clamp(this.z, -limit, limit);
		const jumpEdge = this.mode === "ground" && (this.rising("Space") || this.consumeVirtual("jump"));
		if (this.mode === "drop") {
			const dive = this.held("ShiftLeft") || this.held("ShiftRight") || this.virtual.sprint;
			const flare = this.held("Space") || this.virtual.jump;
			this.vy = dive ? -32 : flare ? -4.2 : -11;
			const nextY = this.y + this.vy * dt;
			if (!this.catchRoof(nextY)) this.y = nextY;
		} else {
			if (jumpEdge && this.grounded) {
				this.vy = this.op === "bodhi" ? 9.4 : 8.05;
				this.grounded = false;
				this.airTime = 0;
			} else if (jumpEdge && this.op === "bodhi" && this.touchingWall && !this.grounded) {
				this.wallRun = 1.1;
				this.vy = 5.4;
			}
			if (!this.grounded) {
				let g = 30;
				if (this.op === "bodhi" && this.vy < 0) g *= .68;
				if (this.wallRun > 0 && (this.op === "bodhi" || this.op === "ananda")) {
					this.wallRun -= dt;
					g *= .3;
					this.vy = Math.max(this.vy, -2);
				}
				this.vy -= g * dt;
				if ((this.held("Space") || this.virtual.jump) && this.vy < -11) this.vy = -11;
				const nextY = this.y + this.vy * dt;
				if (!this.catchRoof(nextY)) {
					this.y = nextY;
					this.airTime += dt;
				}
			}
		}
		const floor = floorHeight(this.x, this.z, this.y + .25, this.solids);
		if (this.vy <= 0 && this.y <= floor + .12) {
			const impact = this.pendingImpact !== 0 ? this.pendingImpact : this.vy;
			this.pendingImpact = 0;
			const wasDrop = this.mode === "drop";
			const fell = !this.grounded || wasDrop;
			this.y = floor;
			this.vy = 0;
			this.grounded = true;
			this.airTime = 0;
			if (wasDrop) this.land();
			if (fell && impact < -16) this.damagePlayer((-impact - 16) * 3.1, void 0, void 0, true);
		} else if (this.mode !== "drop") this.grounded = false;
		if (this.raT > 0 && this.mode === "ground") {
			const hoverFloor = floorHeight(this.x, this.z, 3, this.solids);
			this.y = hoverFloor + 2.5;
			this.vy = 0;
			this.grounded = true;
		}
		this.resolveOverlap();
		const targetEye = this.crouchHeld ? 1.02 : 1.62;
		this.eye += (targetEye - this.eye) * (1 - Math.exp(-14 * dt));
		if (this.grounded && this.mode === "ground" && Math.hypot(this.vx, this.vz) > 1.2) {
			this.stepAcc += dt * Math.hypot(this.vx, this.vz);
			const stride = this.crouchHeld ? 4.2 : sprinting ? 2.3 : 3.1;
			if (this.stepAcc > stride) {
				this.stepAcc = 0;
				if (this.op !== "ananda") this.audio.foot();
			}
		}
		if (this.reloadWant()) this.beginReload();
	}
	slidePrev = false;
	swapPrev = false;
	spacePrev = false;
	reloadPrev = false;
	consumeSlide() {
		const keyDown = this.held("KeyC");
		const keyEdge = keyDown && !this.slidePrev;
		this.slidePrev = keyDown;
		const virtEdge = this.virtual.slide && !this.vPrev.slide;
		this.vPrev.slide = this.virtual.slide;
		return keyEdge || virtEdge;
	}
	rising(code) {
		const down = this.held(code);
		const was = code === "Space" ? this.spacePrev : false;
		if (code === "Space") {
			const edge = down && !this.spacePrev;
			this.spacePrev = down;
			return edge;
		}
		return down && !was;
	}
	reloadWant() {
		const down = this.held("KeyR") || this.virtual.reload;
		const edge = down && !this.reloadPrev;
		this.reloadPrev = down;
		return edge;
	}
	deflect(axis) {
		if (!(this.op === "ananda" && (this.slideT > 0 || this.wallRun > 0 || Math.hypot(this.vx, this.vz) > 7.2))) {
			if (axis === "x") this.vx = 0;
			else this.vz = 0;
			return;
		}
		const killed = axis === "x" ? this.vx : this.vz;
		if (axis === "x") this.vx = 0;
		else this.vz = 0;
		const keep = axis === "x" ? this.vz : this.vx;
		const transferred = Math.sign(keep || (axis === "x" ? -Math.cos(this.yaw) : -Math.sin(this.yaw)) || 1) * Math.abs(killed) * .82;
		if (axis === "x") this.vz += transferred;
		else this.vx += transferred;
		const sp = Math.hypot(this.vx, this.vz);
		if (sp > 13.5) {
			this.vx *= 13.5 / sp;
			this.vz *= 13.5 / sp;
		}
		this.wallRun = Math.max(this.wallRun, .85);
		this.slideT = Math.max(this.slideT, .4);
		if (this.slideT > .15 && this.grounded) {
			this.grounded = false;
			this.vy = Math.max(this.vy, 4.4);
		}
	}
	inUnravel(x, z) {
		return this.unravelT > 0 && Math.hypot(x - this.unravelX, z - this.unravelZ) < this.unravelR;
	}
	catchRoof(nextY) {
		let roof = -1;
		for (const box of this.solids) {
			if (!box.alive) continue;
			if (!xzHit(this.x, this.z, .15, box)) continue;
			if (box.h > roof) roof = box.h;
		}
		if (roof < 0) return false;
		if (this.vy < 0 && this.y >= roof - .25 && nextY < roof) {
			this.pendingImpact = this.vy;
			this.y = roof;
			this.vy = 0;
			return true;
		}
		return false;
	}
	resolveOverlap() {
		for (let n = 0; n < 2; n++) for (const box of this.solids) {
			if (!box.alive || !xzHit(this.x, this.z, .42, box)) continue;
			if (this.y >= box.h - .08) continue;
			if (this.y > box.h - 2.6) {
				this.y = box.h;
				this.vy = Math.max(0, this.vy);
				this.grounded = true;
				return;
			}
			const left = this.x - (box.minX - RADIUS);
			const right = box.maxX + RADIUS - this.x;
			const south = this.z - (box.minZ - RADIUS);
			const north = box.maxZ + RADIUS - this.z;
			const m = Math.min(left, right, south, north);
			if (m === left) this.x = box.minX - RADIUS - .02;
			else if (m === right) this.x = box.maxX + RADIUS + .02;
			else if (m === south) this.z = box.minZ - RADIUS - .02;
			else this.z = box.maxZ + RADIUS + .02;
		}
	}
	land() {
		if (this.landed) return;
		this.landed = true;
		this.mode = "ground";
		this.landTime = this.time;
		this.invuln = Math.max(this.invuln, 1.15);
		if (this.pitch < -.16) this.pitch = -.1;
		this.placeSquad();
		this.say("TACTICAL", "Boots down. Scavenge, then breach Cradle Alpha.");
	}
	placeSquad() {
		const spots = [
			[2.3, 2.4],
			[-2.3, 2.4],
			[.2, 3.6]
		];
		let i = 0;
		for (const actor of this.pool) {
			if (!actor.squad) continue;
			const spot = spots[i++] ?? [0, 3];
			let sx = this.x + spot[0];
			let sz = this.z + spot[1];
			if (movementBlocked(sx, sz, 0, this.solids)) {
				sx = this.x;
				sz = this.z + 1.4;
			}
			actor.x = sx;
			actor.z = sz;
			actor.y = floorHeight(sx, sz, this.y + .2, this.solids);
			actor.deployed = true;
			actor.group.visible = true;
		}
	}
	placeNear(x, z) {
		for (let ring = 0; ring <= 14; ring += 2) for (let a = 0; a < 8; a++) {
			const ang = a / 8 * Math.PI * 2;
			const px = x + Math.cos(ang) * ring;
			const pz = z + Math.sin(ang) * ring;
			if (!movementBlocked(px, pz, 0, this.solids)) {
				this.x = px;
				this.z = pz;
				this.y = floorHeight(px, pz, 1, this.solids);
				return;
			}
		}
		this.x = x;
		this.z = z;
		this.y = 0;
	}
	currentWeapon() {
		return WEAPONS[this.slots[this.slot]?.id ?? "pistol"];
	}
	gunStats() {
		return compileWeapon(this.currentWeapon(), this.slots[this.slot]?.mods ?? []);
	}
	beginReload() {
		const weapon = this.currentWeapon();
		const stats = this.gunStats();
		const slot = this.slots[this.slot];
		if (!slot || this.reloadT > 0 || slot.mag >= stats.mag || slot.reserve <= 0) return;
		this.reloadT = weapon.reload * (stats.perks.has("CAPACITY_DOUBLE") ? 1.15 : 1);
	}
	tickReload(dt) {
		if (this.reloadT <= 0) return;
		this.reloadT -= dt;
		if (this.reloadT > 0) return;
		this.currentWeapon();
		const stats = this.gunStats();
		const slot = this.slots[this.slot];
		if (!slot) return;
		const take = Math.min(stats.mag - slot.mag, slot.reserve);
		slot.mag += take;
		slot.reserve -= take;
	}
	tryShoot() {
		const weapon = this.currentWeapon();
		const stats = this.gunStats();
		const slot = this.slots[this.slot];
		if (!slot) return;
		const want = (this.fireHeld || this.virtual.fire) && (this.mode === "ground" || this.mode === "drop") && !this.paused;
		const trigger = weapon.auto ? want : want && !this.fireWas;
		this.fireWas = want;
		if (!trigger || this.reloadT > 0) return;
		if (slot.mag <= 0) {
			this.audio.empty();
			this.beginReload();
			return;
		}
		if (this.time < this.nextShot) return;
		this.nextShot = this.time + 60 / stats.rpm * (this.inUnravel(this.x, this.z) ? .67 : 1);
		slot.mag -= 1;
		const quiet = stats.perks.has("ACOUSTIC_STEALTH_MASK");
		this.shotEcho = this.op === "ananda" ? 0 : quiet ? .4 : .55;
		if (this.phaseT > 0) this.phaseT = 0;
		this.audio.gun(weapon.id);
		this.pitch = clamp(this.pitch + stats.recoil, -1.35, 1.35);
		this.kick = Math.min(.14, this.kick + .045 * stats.recoil / Math.max(.004, weapon.recoil));
		if (this.op !== "khensu") this.shake = Math.min(.7, this.shake + .16);
		const muzzle = this.guns.get(weapon.id)?.userData.muzzle;
		if (muzzle) muzzle.visible = true;
		const sliding = stats.perks.has("SLIDE_ACCURACY_BUFF") && this.slideT > 0;
		const skill = this.slideT > 0 || !this.grounded && this.airTime > .16;
		const dual = !this.aiming && (this.op === "jaya" && weapon.id === "smg" || this.op === "ananda" && weapon.id === "needles");
		const count = dual ? 2 : weapon.pellets;
		this.camera.updateMatrixWorld();
		for (let i = 0; i < count; i++) {
			this.camera.getWorldDirection(this.aim);
			const spread = (sliding || this.aiming ? stats.adsSpread : stats.spread) * (Math.hypot(this.vx, this.vz) > 4 && !sliding ? 1.4 : 1);
			this.camRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
			this.camUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
			this.aim.addScaledVector(this.camRight, (Math.random() - .5) * spread * 2 + (dual && i === 1 ? -.05 : 0));
			this.aim.addScaledVector(this.camUp, (Math.random() - .5) * spread * 2);
			this.aim.normalize();
			this.fireRay(weapon, skill);
		}
		if (slot.mag <= 0) this.beginReload();
	}
	fireRay(weapon, skill) {
		const stats = this.gunStats();
		this.camera.getWorldPosition(this.camPos);
		let ox = this.camPos.x;
		let oy = this.camPos.y;
		let oz = this.camPos.z;
		let dx = this.aim.x;
		let dy = this.aim.y;
		let dz = this.aim.z;
		const redirected = this.portalHop(ox, oy, oz, dx, dy, dz);
		ox = redirected.ox;
		oy = redirected.oy;
		oz = redirected.oz;
		const range = weapon.range;
		let hops = stats.perks.has("ENV_MESH_PENETRATION") ? 1 : 0;
		let ignored = null;
		let traveled = 0;
		const gold = this.op === "khensu" || this.op === "aset" || this.op === "nefret";
		while (traveled < range) {
			const left = range - traveled;
			let wallT = left;
			let wallBox = null;
			for (const box of this.solids) {
				if (!box.alive || box === ignored) continue;
				const t = rayBox(ox, oy, oz, dx, dy, dz, box, left);
				if (t != null && t < wallT) {
					wallT = t;
					wallBox = box;
				}
			}
			let best = null;
			for (const actor of this.pool) {
				if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
				const headT = raySphere(ox, oy, oz, dx, dy, dz, actor.x, actor.y + 1.58, actor.z, .2, left);
				if (headT != null && headT < wallT && (!best || headT < best.t)) {
					best = {
						actor,
						t: headT,
						head: true,
						leg: false
					};
					continue;
				}
				const body = rayCylinder(ox, oy, oz, dx, dy, dz, actor.x, actor.z, .4, actor.y + .15, actor.y + 1.45, left);
				if (body && body.t < wallT && (!best || body.t < best.t)) best = {
					actor,
					t: body.t,
					head: false,
					leg: body.y < actor.y + .55
				};
			}
			if (best) {
				this.tracer(ox, oy, oz, dx, dy, dz, best.t, gold ? 13935178 : 3072200);
				let dmg = stats.dmg * this.falloff(weapon, traveled + best.t);
				if (this.op === "nefret") dmg *= 1 + this.solar / 140;
				this.hurtActor(best.actor, dmg, best.head, best.leg, skill, true);
				if (weapon.id === "slug") this.splash(ox + dx * best.t, oz + dz * best.t, 2.6, 12);
				return;
			}
			this.tracer(ox, oy, oz, dx, dy, dz, wallT, gold ? 13935178 : 3072200);
			if (wallBox?.destructible && hops > 0 && !wallBox.reinforced) {
				wallBox.hp -= weapon.structure * .4 * (this.op === "nefret" ? 1.35 : 1);
				if (wallBox.hp <= 0) this.breakBox(wallBox);
				else this.spark(ox + dx * wallT, oy + dy * wallT, oz + dz * wallT);
				ignored = wallBox;
				hops -= 1;
				const step = wallT + .45;
				ox += dx * step;
				oy += dy * step;
				oz += dz * step;
				traveled += step;
				continue;
			}
			if (wallBox?.destructible) {
				wallBox.hp -= weapon.structure * (this.op === "nefret" ? 1.35 : 1);
				if (wallBox.hp <= 0) this.breakBox(wallBox);
				else this.spark(ox + dx * wallT, oy + dy * wallT, oz + dz * wallT);
			} else this.spark(ox + dx * wallT, oy + dy * wallT, oz + dz * wallT);
			if (weapon.id === "slug") this.splash(ox + dx * wallT, oz + dz * wallT, 2.6, 12);
			return;
		}
	}
	falloff(weapon, t) {
		if (t <= weapon.falloffStart) return 1;
		if (t >= weapon.falloffEnd) return weapon.minFalloff;
		return 1 - (t - weapon.falloffStart) / (weapon.falloffEnd - weapon.falloffStart) * (1 - weapon.minFalloff);
	}
	portalHop(ox, oy, oz, dx, dy, dz) {
		if (!this.portalA || !this.portalB || this.portalT <= 0) return {
			ox,
			oy,
			oz
		};
		const near = (p, other) => {
			const vx = p.x - ox;
			const vy = 1.2 - oy;
			const vz = p.z - oz;
			const t = vx * dx + vy * dy + vz * dz;
			if (t < .2 || t > 60) return null;
			return Math.hypot(p.x - (ox + dx * t), 1.2 - (oy + dy * t), p.z - (oz + dz * t)) < 1.2 ? {
				t,
				other
			} : null;
		};
		const a = near(this.portalA, this.portalB);
		const b = near(this.portalB, this.portalA);
		const hit = a && (!b || a.t < b.t) ? a : b;
		if (!hit) return {
			ox,
			oy,
			oz
		};
		return {
			ox: hit.other.x,
			oy: 1.45,
			oz: hit.other.z
		};
	}
	hurtActor(actor, dmg, head, leg, skill, byPlayer) {
		if (head) dmg *= 2.15;
		if (leg) {
			dmg *= .72;
			actor.slow = 2.5;
		}
		if (skill) dmg *= 1.35;
		actor.hp -= dmg;
		actor.hurt = .1;
		actor.aggro = 3;
		if (byPlayer) {
			this.audio.hit(head);
			this.hitMarker = 1;
			this.headMark = head;
			if (head || skill || leg) this.floater(head ? "HEADSHOT" : skill ? "SKILLSHOT" : "LEG", actor.x, actor.y + 1.8, actor.z, head ? "#d4a24a" : "#e8e4d8");
			if (this.op === "aset" && (head || skill)) this.qCd = Math.max(0, this.qCd - 2.6);
		}
		if (actor.hp <= 0) this.killActor(actor, byPlayer);
	}
	killActor(actor, byPlayer) {
		if (actor.kind === "decoy") {
			actor.alive = false;
			actor.group.visible = false;
			actor.bodyMat.transparent = false;
			actor.bodyMat.opacity = 1;
			return;
		}
		if (actor.squad) {
			actor.hp = 0;
			actor.down = 8;
			return;
		}
		actor.alive = false;
		actor.corpse = 5;
		actor.group.rotation.x = 1.15;
		if (byPlayer) {
			this.kills += 1;
			this.feed.unshift({
				text: `${actor.name} down`,
				t: 3.5
			});
			this.feed.length = Math.min(this.feed.length, 4);
		}
		const roll = Math.random();
		if (roll < .42) this.makeLoot({
			kind: "ammo",
			x: actor.x,
			z: actor.z
		}, true);
		else if (roll < .68) this.makeLoot({
			kind: "med",
			x: actor.x,
			z: actor.z
		}, true);
		else this.makeLoot(rollLoot(actor.x, actor.z, Math.random), true);
	}
	breakBox(box) {
		box.alive = false;
		box.hp = 0;
		if (box.mesh) box.mesh.visible = false;
		this.emitDebris((box.minX + box.maxX) / 2, Math.max(.4, box.h * .45), (box.minZ + box.maxZ) / 2);
		this.audio.breach();
		if (this.op !== "khensu") this.shake = Math.min(1, this.shake + .35);
		this.floater("BREACH", (box.minX + box.maxX) / 2, box.h, (box.minZ + box.maxZ) / 2, "#e24b4b");
	}
	accuracyNow() {
		return this.panic ? .85 : 1;
	}
	emitDebris(x, y, z) {
		const seed = Math.floor(Math.abs(x * 97 + z * 13 + this.time * 1e3)) % 9999999;
		const fx = -Math.sin(this.yaw);
		const fz = -Math.cos(this.yaw);
		const bits = seededDebris({
			x,
			y,
			z
		}, {
			x: fx,
			z: fz
		}, seed, 10);
		for (const bit of bits) {
			const slot = this.rubble.find((item) => item.life <= 0);
			if (!slot) break;
			slot.life = .85;
			slot.mesh.visible = true;
			slot.mesh.position.set(bit.x, bit.y, bit.z);
			slot.mesh.scale.setScalar(bit.scale);
			slot.vx = bit.vx;
			slot.vy = bit.vy;
			slot.vz = bit.vz;
		}
	}
	abilities() {
		const q = this.risingKey("KeyQ") || this.consumeVirtual("ability");
		const f = this.risingKey("KeyF") || this.consumeVirtual("ult");
		if (q) this.useActive();
		if (f) this.useUlt();
	}
	qPrev = false;
	fPrev = false;
	risingKey(code) {
		const down = this.held(code);
		const prev = code === "KeyQ" ? this.qPrev : this.fPrev;
		if (code === "KeyQ") this.qPrev = down;
		else this.fPrev = down;
		return down && !prev;
	}
	useActive() {
		if (this.qCd > 0 || this.mode !== "ground" && this.mode !== "drop") return;
		if (this.op === "jaya") {
			this.qCd = 14;
			this.phaseT = 3.2;
			this.audio.ui();
			const actor = this.acquire();
			if (!actor) return;
			actor.alive = true;
			actor.kind = "decoy";
			actor.team = "accord";
			actor.squad = false;
			actor.name = "HOLO";
			actor.hp = 40;
			actor.maxHp = 40;
			actor.x = this.x;
			actor.y = this.y;
			actor.z = this.z;
			actor.yaw = this.yaw;
			actor.cooldown = 3.2;
			actor.down = 0;
			actor.corpse = 0;
			actor.group.visible = true;
			actor.bodyMat.transparent = true;
			actor.bodyMat.opacity = .4;
			actor.bodyMat.color.setHex(3072200);
			actor.bodyMat.emissive.setHex(3072200);
			actor.visorMat.emissive.setHex(3072200);
			this.floater("PHASE", this.x, this.y + 2, this.z, "#2ee0c8");
		} else if (this.op === "bodhi") {
			if (!this.portalA) {
				this.portalA = {
					x: this.x,
					z: this.z
				};
				this.toastMsg = "Entry set. Place the exit.";
				this.toastT = 1.6;
				this.audio.ui();
			} else {
				const point = this.pointAhead(14);
				this.portalB = {
					x: point.x,
					z: point.z
				};
				this.portalT = 18;
				this.qCd = 16;
				this.audio.ui();
			}
		} else if (this.op === "khensu") {
			this.qCd = 11;
			this.camera.getWorldPosition(this.camPos);
			this.camera.getWorldDirection(this.aim);
			let wallT = 16;
			let wallBox = null;
			for (const box of this.solids) {
				if (!box.destructible) continue;
				const t = rayBox(this.camPos.x, this.camPos.y, this.camPos.z, this.aim.x, this.aim.y, this.aim.z, box, 18);
				if (t != null && t < wallT) {
					wallT = t;
					wallBox = box;
				}
			}
			const px = wallBox ? this.camPos.x + this.aim.x * wallT : this.x + -Math.sin(this.yaw) * 6;
			const pz = wallBox ? this.camPos.z + this.aim.z * wallT : this.z + -Math.cos(this.yaw) * 6;
			if (wallBox) this.breakBox(wallBox);
			else this.audio.breach();
			for (const actor of this.pool) {
				if (!actor.alive || actor.team !== "sec") continue;
				if (Math.hypot(actor.x - px, actor.z - pz) < (wallBox ? 4.6 : 3.4)) this.hurtActor(actor, wallBox ? 70 : 34, false, false, false, true);
			}
			this.spark(px, 1, pz);
		} else if (this.op === "aset") {
			this.qCd = 13;
			this.healT = 4.2;
			this.audio.ui();
			this.floater("RADIANCE", this.x, this.y + 2, this.z, "#d4a24a");
		} else if (this.op === "ananda") {
			this.qCd = 9;
			const dest = this.shiftPoint(this.x, this.z, this.yaw, 8);
			this.vacuum(this.x, this.z, 6.2);
			this.x = dest.x;
			this.z = dest.z;
			this.y = floorHeight(this.x, this.z, this.y + 1, this.solids);
			if (Math.hypot(this.vx, this.vz) < 2.2) {
				this.vx = -Math.sin(this.yaw) * 7.5;
				this.vz = -Math.cos(this.yaw) * 7.5;
			} else {
				this.vx *= 1.2;
				this.vz *= 1.2;
			}
			this.vacuum(this.x, this.z, 7.4);
			this.floater("SHIFT", this.x, this.y + 2, this.z, "#2ee0c8");
			this.audio.ui();
			this.shake = Math.min(1, this.shake + .35);
		} else if (this.op === "nefret") {
			this.qCd = 8;
			this.shatterPulse(this.x, this.z, this.yaw, true);
		}
	}
	useUlt() {
		if (this.ultCd > 0 || this.mode !== "ground" && this.mode !== "drop") return;
		if (this.op === "jaya") {
			this.ultCd = 28;
			this.anchor = {
				x: this.x,
				y: this.y,
				z: this.z
			};
			this.anchorT = 8;
			this.audio.ui();
		} else if (this.op === "bodhi") {
			this.ultCd = 24;
			const p = this.pointAhead(9);
			this.voidX = p.x;
			this.voidZ = p.z;
			this.voidT = 3.3;
			this.audio.breach();
		} else if (this.op === "khensu") {
			this.ultCd = 26;
			this.shieldT = 6.5;
			this.audio.ui();
		} else if (this.op === "aset") {
			this.ultCd = 24;
			this.camera.updateMatrixWorld();
			this.camera.getWorldPosition(this.camPos);
			this.camera.getWorldDirection(this.aim);
			const ox = this.camPos.x;
			const oy = this.camPos.y;
			const oz = this.camPos.z;
			for (const actor of this.pool) {
				if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
				const vx = actor.x - ox;
				const vy = actor.y + 1 - oy;
				const vz = actor.z - oz;
				const t = vx * this.aim.x + vy * this.aim.y + vz * this.aim.z;
				if (t < 1 || t > 90) continue;
				if (Math.hypot(actor.x - (ox + this.aim.x * t), actor.y + 1 - (oy + this.aim.y * t), actor.z - (oz + this.aim.z * t)) < .95) this.hurtActor(actor, 96, false, false, false, true);
			}
			this.tracer(ox, oy, oz, this.aim.x, this.aim.y, this.aim.z, 70, 13935178);
			this.shake = Math.min(1, this.shake + .5);
			this.audio.gun("rail");
		} else if (this.op === "ananda") {
			this.ultCd = 26;
			this.unravelT = 6.2;
			this.unravelR = 3;
			this.unravelX = this.x;
			this.unravelZ = this.z;
			this.audio.breach();
			this.floater("UNRAVEL", this.x, this.y + 2.4, this.z, "#2ee0c8");
		} else if (this.op === "nefret") {
			const orbital = dischargeReady(this.solar, 0);
			this.orbitalStrike = orbital;
			this.ultCd = orbital ? 45 : 28;
			this.raT = orbital ? 5.2 : 4.4;
			this.raAcc = 0;
			if (orbital) {
				this.solar = 0;
				this.beginOrbitalVfx();
			} else this.shake = Math.min(1, this.shake + .35);
			this.audio.gun("rail");
			if (orbital) this.audio.orbital();
			this.floater(orbital ? "ORBITAL" : "RA", this.x, this.y + 2.6, this.z, orbital ? "#e24b4b" : "#d4a24a");
		}
	}
	beginOrbitalVfx() {
		this.camera.updateMatrixWorld();
		this.camera.getWorldPosition(this.camPos);
		this.camera.getWorldDirection(this.aim);
		let end = 56;
		for (const box of this.solids) {
			const t = rayBox(this.camPos.x, this.camPos.y, this.camPos.z, this.aim.x, this.aim.y, this.aim.z, box, 56);
			if (t != null && t < end) end = t;
		}
		const x = this.camPos.x + this.aim.x * end;
		const z = this.camPos.z + this.aim.z * end;
		const height = 78;
		this.orbitalBeam.scale.set(1, height, 1);
		this.orbitalHalo.scale.set(1, height, 1);
		this.orbitalBeam.position.set(x, height * .5, z);
		this.orbitalHalo.position.set(x, height * .5, z);
		this.orbitalBeam.visible = true;
		this.orbitalHalo.visible = true;
		this.orbitalLight.position.set(x, 10, z);
		this.orbitalLight.intensity = 28;
		this.orbitalLight.visible = true;
		this.orbitalVfx = 1.5;
		this.solarFlash = 1;
		const dist = Math.hypot(x - this.x, z - this.z);
		this.shake = Math.max(this.shake, 1.45 / (1 + dist * .045));
	}
	pointAhead(distance) {
		this.camera.getWorldPosition(this.camPos);
		this.camera.getWorldDirection(this.aim);
		let tHit = distance;
		for (const box of this.solids) {
			const t = rayBox(this.camPos.x, this.camPos.y, this.camPos.z, this.aim.x, this.aim.y, this.aim.z, box, distance);
			if (t != null && t < tHit) tHit = t;
		}
		const t = Math.max(1.5, tHit - .8);
		return {
			x: this.camPos.x + this.aim.x * t,
			z: this.camPos.z + this.aim.z * t
		};
	}
	shiftPoint(x, z, yaw, distance) {
		let bestX = x;
		let bestZ = z;
		for (let d = distance; d >= 2; d -= 1) {
			const nx = x - Math.sin(yaw) * d;
			const nz = z - Math.cos(yaw) * d;
			if (!movementBlocked(nx, nz, 0, this.solids)) {
				bestX = nx;
				bestZ = nz;
				break;
			}
		}
		return {
			x: bestX,
			z: bestZ
		};
	}
	vacuum(x, z, radius) {
		for (const actor of this.pool) {
			if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
			const dx = x - actor.x;
			const dz = z - actor.z;
			const d = Math.hypot(dx, dz);
			if (d > radius || d < .2) continue;
			const step = Math.min(d, 2.4);
			const nx = actor.x + dx / d * step;
			const nz = actor.z + dz / d * step;
			if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
			if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
			actor.blind = 2;
			actor.slow = 1.2;
			actor.aggro = 0;
		}
	}
	shatterPulse(x, z, yaw, byPlayer) {
		const fx = -Math.sin(yaw);
		const fz = -Math.cos(yaw);
		const overcharge = byPlayer && this.op === "nefret" && this.solar >= 70;
		for (const box of this.solids) {
			if (!box.alive || !box.destructible) continue;
			const cx = (box.minX + box.maxX) / 2;
			const cz = (box.minZ + box.maxZ) / 2;
			if (!inBlastCone(x, z, fx, fz, cx, cz, 15)) continue;
			if (box.reinforced && !overcharge) {
				box.hp -= 36;
				this.spark(cx, box.h * .6, cz);
				if (box.hp > 0) continue;
			}
			this.breakBox(box);
			this.splash(cx, cz, 3.1, 16);
		}
		for (const actor of this.pool) {
			if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
			if (!inBlastCone(x, z, fx, fz, actor.x, actor.z, 15)) continue;
			this.hurtActor(actor, byPlayer ? 48 : 26, false, false, false, byPlayer);
			actor.slow = 1.4;
		}
		if (byPlayer && this.op === "nefret") this.solar = Math.min(100, this.solar + 24);
		this.audio.breach();
		this.shake = Math.min(1, this.shake + (byPlayer ? .45 : .15));
		this.floater(overcharge ? "OVERCHARGE" : "SHATTER", x + fx * 3, 1.6, z + fz * 3, "#d4a24a");
	}
	splash(x, z, radius, dmg) {
		for (const actor of this.pool) {
			if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
			if (Math.hypot(actor.x - x, actor.z - z) > radius) continue;
			this.hurtActor(actor, dmg, false, false, false, false);
		}
	}
	raStrike() {
		this.camera.updateMatrixWorld();
		this.camera.getWorldPosition(this.camPos);
		this.camera.getWorldDirection(this.aim);
		const ox = this.camPos.x;
		const oy = this.camPos.y;
		const oz = this.camPos.z;
		const reach = this.orbitalStrike ? 56 : 42;
		const bite = this.orbitalStrike ? 46 : 28;
		const body = this.orbitalStrike ? 34 : 26;
		let end = reach;
		for (const box of this.solids) {
			const t = rayBox(ox, oy, oz, this.aim.x, this.aim.y, this.aim.z, box, reach);
			if (t != null && t < end) {
				end = t;
				if (box.destructible) {
					box.hp -= bite;
					if (box.hp <= 0) this.breakBox(box);
				}
			}
		}
		const px = ox + this.aim.x * end;
		const pz = oz + this.aim.z * end;
		const radius = this.orbitalStrike ? 2.6 : 1.7;
		for (const actor of this.pool) {
			if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
			const vx = actor.x - ox;
			const vy = actor.y + 1 - oy;
			const vz = actor.z - oz;
			const t = vx * this.aim.x + vy * this.aim.y + vz * this.aim.z;
			if (t < 0 || t > end + 1.2) continue;
			if (Math.hypot(actor.x - (ox + this.aim.x * t), actor.y + 1 - (oy + this.aim.y * t), actor.z - (oz + this.aim.z * t)) < radius) this.hurtActor(actor, body, false, false, false, true);
		}
		this.splash(px, pz, this.orbitalStrike ? 6.5 : 3.4, this.orbitalStrike ? 18 : 14);
		this.tracer(ox, oy, oz, this.aim.x, this.aim.y, this.aim.z, end, this.orbitalStrike ? 16773577 : 16769444);
	}
	tickBlood(dt) {
		this.unravelT = Math.max(0, this.unravelT - dt);
		this.raT = Math.max(0, this.raT - dt);
		if (this.raT <= 0) this.orbitalStrike = false;
		if (this.unravelT > 0) {
			this.unravelR = Math.min(16, this.unravelR + 7 * dt);
			for (const actor of this.pool) {
				if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
				if (this.inUnravel(actor.x, actor.z)) actor.lift = .4;
			}
		}
		if (this.op === "nefret" && this.solar > 0 && this.raT <= 0) {
			const feed = Math.min(this.solar, 9 * dt);
			this.solar -= feed;
			this.armor = Math.min(80, this.armor + feed * .85);
		}
		if (this.raT > 0) {
			this.raAcc -= dt;
			if (this.raAcc <= 0) {
				this.raAcc = .12;
				this.raStrike();
			}
		}
	}
	cycleBlood() {
		if (this.mode !== "ground" && this.mode !== "drop") return;
		const free = [];
		if (this.world.sites[0]?.freed) free.push("ananda");
		if (this.world.sites[1]?.freed) free.push("nefret");
		if (!free.length) {
			this.toastMsg = "The bloodlines are still in the pods.";
			this.toastT = 1.4;
			return;
		}
		const order = [this.hostOp, ...free];
		const current = this.worn ?? this.hostOp;
		const idx = Math.max(0, order.indexOf(current));
		this.wear(order[(idx + 1) % order.length]);
	}
	sealLoadout() {
		for (const slot of this.slots) slot.mods = sealedModIds(slot.mods, weaponClass(slot.id), (id) => ATTACHMENT_BY_ID[id]);
		acceptDropTicket({
			playerId: this.hostOp,
			selectedCharacterId: this.op,
			validatedWeaponLoadout: this.slots.map((slot) => {
				const weapon = WEAPONS[slot.id];
				return {
					instanceId: `${this.hostOp}:${slot.id}`,
					weaponId: weaponClass(slot.id),
					baseStats: {
						baseDamage: weapon.dmg,
						baseFireRate: weapon.rpm,
						baseRecoil: weapon.recoil,
						baseSoundRadius: 36
					},
					equippedAttachments: slot.mods.map((id) => ATTACHMENT_BY_ID[id])
				};
			})
		});
		this.syncGearMeshes();
	}
	syncGearMeshes() {
		const live = new Set(this.slots.map((slot) => slot.id));
		for (const [id, mesh] of this.guns) if (!live.has(id)) paintGunKit(mesh, []);
		for (const slot of this.slots) {
			const mesh = this.guns.get(slot.id);
			if (!mesh) continue;
			const stats = compileWeapon(WEAPONS[slot.id], slot.mods);
			const shown = [...deserializeGearPacket(packHeldGear({
				playerId: 1,
				operator: this.op,
				weapon: slot.id,
				modIds: slot.mods,
				runtimeRecoilFactor: stats.recoil,
				runtimeDamageValue: stats.dmg
			})).equippedModIds];
			for (const code of modCodes(slot.mods)) if (!shown.includes(code)) shown.push(code);
			paintGunKit(mesh, shown);
		}
	}
	wear(id) {
		if (id === this.hostOp || id === this.op && !this.worn && id === this.hostOp) {
			this.op = this.hostOp;
			this.worn = null;
			if (this.accordSlots.length) {
				this.slots = this.accordSlots.map((s) => ({
					...s,
					mods: [...s.mods]
				}));
				this.slot = this.accordSlot;
				this.sealLoadout();
			}
			for (const vip of this.vips) vip.worn = false;
			this.raT = 0;
			this.unravelT = 0;
			this.say("TACTICAL", `${OPERATOR_BY_ID[this.hostOp].name} takes the body back.`);
			this.audio.ui();
			return;
		}
		if (id !== "ananda" && id !== "nefret") return;
		if (!this.worn) {
			this.sealLoadout();
			this.accordSlots = this.slots.map((s) => ({
				...s,
				mods: [...s.mods]
			}));
			this.accordSlot = this.slot;
		}
		this.worn = id;
		this.op = id;
		const weapon = OPERATOR_BY_ID[id].weapon;
		this.slots = [{
			id: weapon,
			mag: WEAPONS[weapon].mag,
			reserve: WEAPONS[weapon].mag * 3,
			mods: []
		}, {
			id: "pistol",
			mag: WEAPONS.pistol.mag,
			reserve: WEAPONS.pistol.mag * 2,
			mods: []
		}];
		this.slot = 0;
		this.reloadT = 0;
		this.qCd = .35;
		this.ultCd = 1;
		this.solar = id === "nefret" ? 20 : 0;
		for (const vip of this.vips) vip.worn = vip.id === id;
		this.say(id === "ananda" ? "ANANDA" : "NEFRET", id === "ananda" ? "The cuffs are splitting. Do not stand where I was." : "They bottled a star and called it a prison. Move.");
		this.floater("BLOODLINE", this.x, this.y + 2.2, this.z, id === "ananda" ? "#2ee0c8" : "#d4a24a");
		this.audio.ui();
		this.shake = .55;
	}
	massStrike() {
		if (this.op !== "nefret" || this.mode !== "ground" && this.mode !== "drop") return;
		if (this.solar < 8) {
			this.toastMsg = "No solar mass.";
			this.toastT = .8;
			return;
		}
		const spend = Math.min(this.solar, 40);
		this.solar -= spend;
		const dmg = 26 + spend * .85;
		for (const actor of this.pool) {
			if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
			const dx = actor.x - this.x;
			const dz = actor.z - this.z;
			const d = Math.hypot(dx, dz);
			if (d > 3.6 || d < .05) continue;
			this.hurtActor(actor, dmg, false, false, false, true);
			const nx = actor.x + dx / d * 2.4;
			const nz = actor.z + dz / d * 2.4;
			if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
			if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
		}
		this.audio.breach();
		this.floater("MASS", this.x, this.y + 1.4, this.z, "#d4a24a");
	}
	portalsAndVoid(dt) {
		if (this.portalA && this.portalB && this.portalT > 0 && this.portalLock <= 0 && this.mode === "ground") {
			const da = Math.hypot(this.x - this.portalA.x, this.z - this.portalA.z);
			const db = Math.hypot(this.x - this.portalB.x, this.z - this.portalB.z);
			if (da < 1.25) {
				this.x = this.portalB.x;
				this.z = this.portalB.z;
				this.y = floorHeight(this.x, this.z, 2, this.solids);
				this.portalLock = .7;
			} else if (db < 1.25) {
				this.x = this.portalA.x;
				this.z = this.portalA.z;
				this.y = floorHeight(this.x, this.z, 2, this.solids);
				this.portalLock = .7;
			}
		}
		if (this.voidT > 0) for (const actor of this.pool) {
			if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
			const dx = this.voidX - actor.x;
			const dz = this.voidZ - actor.z;
			const d = Math.hypot(dx, dz);
			if (d < 13 && d > .4) {
				const step = Math.min(d, 9 * dt);
				const nx = actor.x + dx / d * step;
				const nz = actor.z + dz / d * step;
				if (!movementBlocked(nx, actor.z, 0, this.solids)) actor.x = nx;
				if (!movementBlocked(actor.x, nz, 0, this.solids)) actor.z = nz;
				actor.slow = .3;
			}
		}
	}
	updateActors(dt) {
		const noise = this.noiseRadius();
		for (const actor of this.pool) {
			if (actor.corpse > 0) {
				actor.corpse -= dt;
				if (actor.corpse <= 0) actor.group.visible = false;
			}
			if (!actor.alive) continue;
			if (actor.squad && !actor.deployed) continue;
			actor.hurt = Math.max(0, actor.hurt - dt);
			actor.slow = Math.max(0, actor.slow - dt);
			actor.blind = Math.max(0, actor.blind - dt);
			actor.bodyMat.emissive.setHex(actor.hurt > 0 ? 16726586 : actor.kind === "decoy" ? 3072200 : actor.blind > 0 ? 8954048 : 0);
			if (actor.kind === "decoy") {
				actor.cooldown -= dt;
				const fx = -Math.sin(actor.yaw);
				const fz = -Math.cos(actor.yaw);
				const nx = actor.x + fx * 6.5 * dt;
				const nz = actor.z + fz * 6.5 * dt;
				if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
				if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
				actor.y = floorHeight(actor.x, actor.z, actor.y + .2, this.solids);
				this.face(actor, actor.x + fx, actor.z + fz);
				if (actor.cooldown <= 0 || actor.hp <= 0) {
					actor.alive = false;
					actor.group.visible = false;
					actor.bodyMat.transparent = false;
					actor.bodyMat.opacity = 1;
				}
				continue;
			}
			if (actor.squad && actor.down > 0) {
				actor.down -= dt;
				actor.group.rotation.x = 1.15;
				actor.group.position.set(actor.x, actor.y, actor.z);
				if (actor.down <= 0) {
					actor.hp = 40;
					actor.group.rotation.x = 0;
				}
				continue;
			}
			let tx = actor.x;
			let tz = actor.z;
			let target = null;
			if (actor.squad) {
				const mates = this.pool.filter((a) => a.squad);
				const index = Math.max(0, mates.indexOf(actor));
				const fx = -Math.sin(this.yaw);
				const fz = -Math.cos(this.yaw);
				const rx = Math.cos(this.yaw);
				const rz = -Math.sin(this.yaw);
				const side = index === 0 ? -1.6 : index === 1 ? 1.6 : 0;
				const back = 2.8 + index * .4;
				tx = this.x - fx * back + rx * side;
				tz = this.z - fz * back + rz * side;
				target = this.nearest(actor, "sec", 34);
			} else if (actor.team === "militia") {
				target = this.nearest(actor, "sec", 30);
				if (target) {
					tx = target.x;
					tz = target.z;
				}
			} else {
				if (actor.blind > 0) actor.aggro = 0;
				else if (this.playerVisible(actor, noise)) actor.aggro = 2.8;
				else actor.aggro = Math.max(0, actor.aggro - dt);
				const victim = actor.aggro > 0 && actor.blind <= 0 ? this.nearestThreat(actor) : null;
				if (victim) {
					target = victim;
					const d = Math.hypot(victim.x - actor.x, victim.z - actor.z);
					const dx = victim.x - actor.x;
					const dz = victim.z - actor.z;
					if (d > 16) {
						tx = victim.x;
						tz = victim.z;
					} else if (d < 7) {
						tx = actor.x - dx;
						tz = actor.z - dz;
					} else {
						tx = actor.x - dz;
						tz = actor.z + dx;
					}
				} else {
					tx = actor.x + Math.sin(this.time * .4 + actor.x) * 6;
					tz = actor.z + Math.cos(this.time * .35 + actor.z) * 6;
				}
			}
			if (actor.lift > 0 && actor.team === "sec") {
				actor.lift = Math.max(0, actor.lift - dt);
				actor.y = Math.min(6.4, actor.y + 8 * dt);
				actor.group.position.set(actor.x, actor.y, actor.z);
				actor.group.rotation.z = Math.sin(this.time * 3 + actor.x) * .4;
				continue;
			}
			actor.group.rotation.z = 0;
			const speed = (actor.slow > 0 ? 2.3 : actor.squad ? 5.4 : 4.5) * (this.inUnravel(actor.x, actor.z) && actor.team !== "sec" ? 1.5 : 1) * dt;
			this.stepActor(actor, tx, tz, speed);
			actor.y = floorHeight(actor.x, actor.z, actor.y + .3, this.solids);
			if (target) this.face(actor, target.x, target.z);
			else this.face(actor, tx, tz);
			if (target && actor.down <= 0) {
				actor.cooldown -= dt;
				const dist = Math.hypot(target.x - actor.x, target.z - actor.z);
				const los = hasLos(actor.x, actor.z, target.x, target.z, this.solids);
				if (actor.cooldown <= 0 && los && dist < 36) {
					const panic = this.freedCount > 0 && actor.team === "sec";
					const haste = this.inUnravel(actor.x, actor.z) && actor.team !== "sec" ? .67 : 1;
					actor.cooldown = (panic ? .36 : actor.team === "sec" ? .7 : .38) * haste + Math.random() * .35;
					this.actorShoot(actor, target);
				}
			}
		}
		this.separate();
	}
	playerVisible(actor, noise) {
		const dx = this.x - actor.x;
		const dz = this.z - actor.z;
		const dist = Math.hypot(dx, dz);
		if (this.phaseT > 0 && dist > 4) return false;
		if (dist < noise * (this.phaseT > 0 ? .25 : 1)) return true;
		return dist < (this.phaseT > 0 ? 4 : 28) && hasLos(actor.x, actor.z, this.x, this.z, this.solids);
	}
	nearest(actor, team, radius) {
		let best = null;
		let bestD = radius;
		for (const other of this.pool) {
			if (!other.alive || other.team !== team || other.down > 0 || other === actor) continue;
			const d = Math.hypot(other.x - actor.x, other.z - actor.z);
			if (d < bestD) {
				bestD = d;
				best = other;
			}
		}
		return best ? {
			x: best.x,
			y: best.y + 1.1,
			z: best.z,
			actor: best
		} : null;
	}
	nearestThreat(actor) {
		let best = null;
		let bestD = 40;
		const list = [];
		if (this.phaseT <= 0 && this.mode !== "dead") list.push({
			x: this.x,
			y: this.y + this.eye * .6,
			z: this.z,
			player: true
		});
		for (const other of this.pool) {
			if (!other.alive || other.down > 0) continue;
			if (other.team === "sec") continue;
			if (other.squad && !other.deployed) continue;
			list.push({
				x: other.x,
				y: other.y + 1.1,
				z: other.z,
				actor: other
			});
		}
		for (const item of list) {
			const d = Math.hypot(item.x - actor.x, item.z - actor.z);
			if (d < bestD) {
				bestD = d;
				best = item;
			}
		}
		return best;
	}
	stepActor(actor, tx, tz, step) {
		let dx = tx - actor.x;
		let dz = tz - actor.z;
		const len = Math.hypot(dx, dz);
		if (len < .35) return;
		dx /= len;
		dz /= len;
		const nx = actor.x + dx * step;
		const nz = actor.z + dz * step;
		if (!movementBlocked(nx, actor.z, actor.y, this.solids)) actor.x = nx;
		else if (!movementBlocked(actor.x - dz * step, actor.z + dx * step, actor.y, this.solids)) {
			actor.x += -dz * step;
			actor.z += dx * step;
			return;
		}
		if (!movementBlocked(actor.x, nz, actor.y, this.solids)) actor.z = nz;
	}
	face(actor, x, z) {
		actor.group.position.set(actor.x, actor.y, actor.z);
		actor.group.lookAt(x, actor.y + 1.2, z);
	}
	separate() {
		const live = this.pool.filter((a) => a.alive && a.down <= 0 && (a.deployed || !a.squad));
		for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
			const a = live[i];
			const b = live[j];
			const dx = b.x - a.x;
			const dz = b.z - a.z;
			const d = Math.hypot(dx, dz);
			if (d > .001 && d < .8) {
				const push = (.8 - d) * .5;
				a.x -= dx / d * push;
				a.z -= dz / d * push;
				b.x += dx / d * push;
				b.z += dz / d * push;
			}
		}
	}
	actorShoot(actor, target) {
		const ox = actor.x;
		const oy = actor.y + 1.5;
		const oz = actor.z;
		let dx = target.x - ox;
		let dy = target.y - oy;
		let dz = target.z - oz;
		const len = Math.hypot(dx, dy, dz) || 1;
		dx /= len;
		dy /= len;
		dz /= len;
		const spread = (actor.team === "militia" ? .09 : actor.squad ? .045 : .04) / (actor.team === "sec" ? this.accuracyNow() : 1);
		dx += (Math.random() - .5) * spread;
		dy += (Math.random() - .5) * spread;
		dz += (Math.random() - .5) * spread;
		const n = Math.hypot(dx, dy, dz) || 1;
		dx /= n;
		dy /= n;
		dz /= n;
		let wallT = 70;
		for (const box of this.solids) {
			const t = rayBox(ox, oy, oz, dx, dy, dz, box, 70);
			if (t != null && t < wallT) wallT = t;
		}
		if (target.player) {
			const body = rayCylinder(ox, oy, oz, dx, dy, dz, this.x, this.z, .42, this.y, this.y + (this.crouchHeld ? 1.15 : 1.75), 70);
			if (body && body.t < wallT) {
				this.damagePlayer(actor.team === "militia" ? 0 : 8 + Math.random() * 4, actor.x, actor.z);
				this.tracer(ox, oy, oz, dx, dy, dz, body.t, 14830411);
				return;
			}
		} else if (target.actor) {
			const body = rayCylinder(ox, oy, oz, dx, dy, dz, target.actor.x, target.actor.z, .4, target.actor.y, target.actor.y + 1.6, 70);
			if (body && body.t < wallT) {
				if (actor.team !== "sec" && target.actor.team === "sec") this.hurtActor(target.actor, actor.squad ? 12 : 8, false, false, false, false);
				else if (actor.team === "sec" && target.actor.team !== "sec") {
					target.actor.hp -= 10;
					target.actor.hurt = .08;
					target.actor.aggro = 2;
					if (target.actor.hp <= 0) this.killActor(target.actor, false);
				}
			}
			this.tracer(ox, oy, oz, dx, dy, dz, body && body.t < wallT ? body.t : Math.min(wallT, len), actor.team === "sec" ? 14830411 : 3072200);
			return;
		}
		this.tracer(ox, oy, oz, dx, dy, dz, Math.min(wallT, len), actor.team === "sec" ? 14830411 : 3072200);
	}
	updateVips(dt) {
		const fx = -Math.sin(this.yaw);
		const fz = -Math.cos(this.yaw);
		const rx = Math.cos(this.yaw);
		const rz = -Math.sin(this.yaw);
		this.vips.forEach((vip, index) => {
			const pulse = vip.mesh.userData.pulse;
			if (pulse) {
				const n = .45 + Math.abs(Math.sin(this.time * (vip.id === "ananda" ? 16 : 2.4))) * (vip.active ? 1.5 : .35);
				for (const mat of pulse) mat.emissiveIntensity = n;
			}
			if (!vip.active) {
				vip.mesh.position.set(vip.site.x, .1, vip.site.z);
				vip.mesh.visible = true;
				return;
			}
			if (vip.worn) {
				vip.mesh.visible = false;
				vip.x = this.x;
				vip.y = this.y;
				vip.z = this.z;
				return;
			}
			vip.mesh.visible = true;
			const side = index === 0 ? -1.6 : 1.6;
			const tx = this.x - fx * 3.4 + rx * side;
			const tz = this.z - fz * 3.4 + rz * side;
			const dx = tx - vip.x;
			const dz = tz - vip.z;
			const dist = Math.hypot(dx, dz);
			if (Math.hypot(vip.x - this.x, vip.z - this.z) > 22 || dist > 16) {
				vip.x = tx;
				vip.z = tz;
			} else if (dist > .45) {
				const step = Math.min(dist, (vip.id === "ananda" ? 7.2 : 5.2) * dt);
				const nx = vip.x + dx / dist * step;
				const nz = vip.z + dz / dist * step;
				if (!movementBlocked(nx, vip.z, vip.y, this.solids)) vip.x = nx;
				if (!movementBlocked(vip.x, nz, vip.y, this.solids)) vip.z = nz;
			}
			vip.y = floorHeight(vip.x, vip.z, vip.y + .4, this.solids);
			vip.mesh.position.set(vip.x, vip.y, vip.z);
			vip.cd -= dt;
			const foe = this.nearestPos(vip.x, vip.z, 16);
			if (foe) vip.mesh.lookAt(foe.x, vip.y + 1, foe.z);
			else vip.mesh.lookAt(this.x, vip.y + 1, this.z);
			if (vip.cd > 0 || !foe) return;
			const yaw = Math.atan2(-(foe.x - vip.x), -(foe.z - vip.z));
			if (vip.id === "ananda") {
				const dest = this.shiftPoint(vip.x, vip.z, yaw, 7);
				this.vacuum(vip.x, vip.z, 5.5);
				vip.x = dest.x;
				vip.z = dest.z;
				this.vacuum(vip.x, vip.z, 6.5);
				this.floater("SHIFT", vip.x, vip.y + 1.8, vip.z, "#2ee0c8");
				vip.cd = 8;
			} else {
				this.shatterPulse(vip.x, vip.z, yaw, false);
				vip.cd = 7;
			}
		});
	}
	nearestPos(x, z, radius) {
		let best = null;
		let bestD = radius;
		for (const actor of this.pool) {
			if (!actor.alive || actor.team !== "sec" || actor.down > 0) continue;
			const d = Math.hypot(actor.x - x, actor.z - z);
			if (d < bestD) {
				bestD = d;
				best = actor;
			}
		}
		return best;
	}
	updateLoot(dt) {
		for (const loot of this.loots) {
			if (!loot.alive) continue;
			loot.spin += dt;
			loot.mesh.rotation.y = loot.spin;
			loot.mesh.position.y = Math.sin(this.time * 2 + loot.spin) * .06;
		}
	}
	updateZone(dt) {
		const target = this.objectivePoint();
		const dx = target.x - this.zoneX;
		const dz = target.z - this.zoneZ;
		const d = Math.hypot(dx, dz) || 1;
		const step = Math.min(d, 10 * dt);
		this.zoneX += dx / d * step;
		this.zoneZ += dz / d * step;
		if (this.landed) {
			if (this.time - this.landTime > 18) {
				const rate = this.beaconDone ? 3.6 : 1.65;
				const minR = this.beaconDone ? 20 : 46;
				this.zoneR = Math.max(minR, this.zoneR - rate * dt);
			}
		}
		const dist = Math.hypot(this.x - this.zoneX, this.z - this.zoneZ);
		this.outside = dist - this.zoneR;
		if (this.outside > 0 && (this.mode === "ground" || this.mode === "drop")) {
			this.damagePlayer(5 * dt, void 0, void 0, true);
			this.zoneTick -= dt;
			if (this.zoneTick <= 0) {
				this.audio.zone();
				this.zoneTick = .75;
			}
		}
		if (this.mode === "ground") for (const actor of this.pool) {
			if (!actor.alive || actor.down > 0) continue;
			if (actor.squad && !actor.deployed) continue;
			if (Math.hypot(actor.x - this.zoneX, actor.z - this.zoneZ) <= this.zoneR) continue;
			actor.hp -= 5 * dt;
			if (actor.hp <= 0) this.killActor(actor, false);
		}
		this.drawZone();
	}
	drawZone() {
		const attr = this.zoneLine.geometry.getAttribute("position");
		for (let i = 0; i <= 96; i++) {
			const a = i / 96 * Math.PI * 2;
			attr.setXYZ(i, this.zoneX + Math.cos(a) * this.zoneR, 1.4, this.zoneZ + Math.sin(a) * this.zoneR);
		}
		attr.needsUpdate = true;
		this.zoneLine.material.color.setHex(this.outside > 0 ? 14830411 : 13935178);
	}
	objectivePoint() {
		const alpha = this.world.sites[0];
		const omega = this.world.sites[1];
		if (!alpha.freed) return {
			x: alpha.x,
			z: alpha.z + 18,
			label: "CRADLE ALPHA"
		};
		if (!omega.freed) return {
			x: omega.x,
			z: omega.z - 18,
			label: "CRADLE OMEGA"
		};
		if (!this.beaconDone) return {
			x: this.world.beacon.x,
			z: this.world.beacon.z,
			label: "BEACON"
		};
		return {
			x: this.world.extract.x,
			z: this.world.extract.z,
			label: "EXTRACT"
		};
	}
	objectives(dt) {
		this.prompt = "";
		const alpha = this.world.sites[0];
		const omega = this.world.sites[1];
		const interact = this.held("KeyE") || this.virtual.interact;
		const interactEdge = this.risingInteract();
		for (const loot of this.loots) {
			if (!loot.alive) continue;
			if (Math.hypot(loot.x - this.x, loot.z - this.z) < 2.15) {
				const name = loot.label ?? (loot.kind === "weapon" ? WEAPONS[loot.weaponId ?? "rifle"].name : loot.kind === "ammo" ? "AMMO" : loot.kind === "med" ? "MEDKIT" : loot.kind === "mod" ? "MOD" : loot.kind === "intel" ? "INTEL" : "PLATE");
				this.prompt = `E  TAKE ${name}`;
				if (interactEdge) this.takeLoot(loot);
				break;
			}
		}
		for (const site of this.world.sites) {
			if (site.freed) continue;
			const dist = Math.hypot(site.x - this.x, site.z - this.z);
			const inside = this.x > site.minX && this.x < site.maxX && this.z > site.minZ && this.z < site.maxZ;
			const doorDist = Math.hypot((site.door.minX + site.door.maxX) / 2 - this.x, (site.door.minZ + site.door.maxZ) / 2 - this.z);
			if (!site.door.alive && dist < 2.5) {
				this.prompt = `E  FREE THE ${site.lineage.toUpperCase()}`;
				if (interactEdge) this.freeSite(site);
			} else if (inside && dist < 2.6) {
				this.prompt = `E  FREE THE ${site.lineage.toUpperCase()}`;
				if (interactEdge) this.freeSite(site);
			} else if (site.door.alive && doorDist < 2.4) this.prompt = this.op === "khensu" ? "Q  THERMITE THE GATE" : "SHOOT THE GATE";
		}
		if (!this.prompt) for (const term of this.terminals) {
			if (term.open) continue;
			if (Math.hypot(term.x - this.x, term.z - this.z) >= 2.4) continue;
			this.prompt = "E  CRACK TERMINAL";
			if (interactEdge) this.openTerminal(term);
			break;
		}
		if (alpha.freed && omega.freed && !this.beaconDone) {
			if (Math.hypot(this.world.beacon.x - this.x, this.world.beacon.z - this.z) < 3.1) {
				this.prompt = "HOLD E  RAISE THE BEACON";
				if (interact) {
					this.channel += dt;
					if (!this.beaconWave && this.channel > 1) {
						this.beaconWave = true;
						this.spawnWave(5, {
							x: 0,
							z: 0
						});
						this.say("TACTICAL", "Corporate counter-push. Hold the mast.");
					}
					if (this.channel >= 4.6) {
						this.beaconDone = true;
						this.channel = 0;
						this.say("ACCORD", "Beacon live. Mars hears you. Eon Dusk has already launched — do not miss extraction.");
						this.toastMsg = "Eon Dusk is inbound. Run.";
						this.toastT = 3;
						this.spawnWave(4, this.world.extract);
					}
				} else this.channel = Math.max(0, this.channel - dt * 1.5);
			} else this.channel = Math.max(0, this.channel - dt);
		}
		if (this.beaconDone && this.mode === "ground") {
			if (Math.hypot(this.world.extract.x - this.x, this.world.extract.z - this.z) < 6.4) {
				this.extractT += dt;
				this.prompt = `RECOVERY LOCK ${Math.min(100, Math.round(this.extractT / 6 * 100))}%`;
				if (this.extractT >= 6) this.win();
			} else this.extractT = Math.max(0, this.extractT - dt * .8);
		}
		if (!this.prompt && this.mode === "ground" && (alpha.freed || omega.freed)) this.prompt = this.worn ? `B  LEAVE ${OPERATOR_BY_ID[this.worn].name.toUpperCase()}` : "B  WEAR THE BLOODLINE";
	}
	openTerminal(term) {
		term.open = true;
		term.mesh.visible = false;
		const uprising = this.phase === "ESCORT_UPRISING" || this.phase === "EXTRACTION" || this.world.sites.some((site) => site.freed);
		const progress = Math.min(1, Math.max(0, (176 - this.zoneR) / 156));
		const danger = (this.phase === "EXTRACTION" ? 4.2 : this.phase === "ESCORT_UPRISING" ? 3.4 : this.phase === "BREACH" ? 2.2 : 1.2) + this.stress * 1.5;
		const ids = generateContainerDropArray({
			sectorTier: sectorTier(term.x, term.z),
			uprisingActive: uprising,
			localDangerFactor: danger
		}, progress);
		const names = [];
		ids.forEach((id, index) => {
			const drop = resolveExtractionDrop(id);
			if (!drop) return;
			const ang = index / Math.max(1, ids.length) * Math.PI * 2;
			this.makeLoot({
				...drop,
				x: term.x + Math.cos(ang) * 1.35,
				z: term.z + Math.sin(ang) * 1.35
			}, true);
			names.push(drop.label);
		});
		this.toastMsg = names.join("  ·  ");
		this.toastT = 2.6;
		this.audio.breach();
	}
	interactPrev = false;
	risingInteract() {
		const down = this.held("KeyE") || this.virtual.interact;
		const edge = down && !this.interactPrev;
		this.interactPrev = down;
		return edge;
	}
	takeLoot(loot) {
		if (loot.kind === "mod" && loot.modId) {
			const attachment = ATTACHMENT_BY_ID[loot.modId];
			const slot = this.slots[this.slot];
			const parsed = attachment ? readAttachment(attachment) : null;
			if (!parsed || !slot) {
				this.toastMsg = "Mod rejected. The seal did not take.";
				this.toastT = 1.6;
				return;
			}
			if (parsed.compatibleClass !== "ALL" && parsed.compatibleClass !== weaponClass(slot.id)) {
				this.toastMsg = `${attachment?.name ?? "That mod"} will not seat on this gun.`;
				this.toastT = 1.6;
				return;
			}
			slot.mods = [...slot.mods.filter((id) => ATTACHMENT_BY_ID[id]?.slot !== parsed.slot), parsed.attachmentId];
			this.sealLoadout();
			this.noteRecovered(parsed.attachmentId, loot.x, loot.z);
		}
		loot.alive = false;
		loot.mesh.visible = false;
		this.audio.pickup();
		if (loot.scrap) this.haul += loot.scrap;
		if (loot.kind === "med") this.hp = Math.min(100, this.hp + (loot.label === "NANITE SWARM" ? 55 : 45));
		else if (loot.kind === "armor") this.armor = Math.min(80, this.armor + (loot.label === "EMP INVERTER" ? 50 : 30));
		else if (loot.kind === "ammo") {
			const slot = this.slots[this.slot];
			if (slot) slot.reserve += WEAPONS[slot.id].mag;
		} else if (loot.kind === "mod") {
			this.toastMsg = loot.scrap ? `${loot.label}  +${loot.scrap}` : loot.label ?? "MOD SEATED";
			this.toastT = 1.8;
		} else if (loot.kind === "intel") {
			this.toastMsg = loot.scrap ? `${loot.label}  +${loot.scrap} SCRAP` : loot.label ?? "INTEL";
			this.toastT = 2.4;
			this.say("TACTICAL", "That file leaves with you. Die and the haul stays in Nod.");
			const intelId = registryForLabel(loot.label);
			if (intelId) this.noteRecovered(intelId, loot.x, loot.z);
		} else if (loot.weaponId) {
			const id = loot.weaponId;
			const owned = this.slots.find((s) => s.id === id);
			if (owned) owned.reserve += WEAPONS[id].mag * 2;
			else {
				this.slots[0] = {
					id,
					mag: WEAPONS[id].mag,
					reserve: WEAPONS[id].mag * 2,
					mods: []
				};
				this.slot = 0;
				this.sealLoadout();
				this.reloadT = 0;
			}
			if (loot.scrap) {
				this.toastMsg = `${loot.label}  +${loot.scrap}`;
				this.toastT = 1.8;
			}
			const weaponRegistry = registryForLabel(loot.label);
			if (weaponRegistry) this.noteRecovered(weaponRegistry, loot.x, loot.z);
		}
	}
	freeSite(site) {
		if (site.freed) return;
		site.freed = true;
		this.freedCount += 1;
		const vip = this.vips.find((v) => v.site === site);
		if (vip) {
			vip.active = true;
			vip.x = site.x;
			vip.z = site.z;
			vip.worn = this.worn === vip.id;
		}
		this.audio.pickup();
		const who = site.id === "alpha" ? "Ananda" : "Nefret";
		if (this.freedCount === 1) {
			this.say(who.toUpperCase(), site.id === "alpha" ? "The dampeners just failed. I am not staying in this room." : "Get the guns off my light.");
			this.say("CIVNET", `${who} is loose. Corporate grid is in panic. The blocks are arming.`);
			this.say("TACTICAL", "They fight with you. Press B to wear the bloodline. It is not Accord doctrine.");
			this.spawnMilitia(site.x + 6, site.z + 4);
			this.spawnMilitia(site.x - 5, site.z + 2);
			this.spawnMilitia(this.x + 3, this.z - 4);
			this.spawnMilitia(site.x + 2, site.z - 8);
			this.spawnWave(6, {
				x: site.x,
				z: site.z
			});
		} else {
			this.say(who.toUpperCase(), site.id === "alpha" ? "Both of us. Now the street has to choose." : "Open a road. I will burn what is left of the gate.");
			this.say("ACCORD", "Both bloodlines are walking. Raise the beacon. Keep them inside the zone until the pad.");
			this.spawnMilitia(site.x + 4, site.z);
			this.spawnMilitia(site.x - 4, site.z);
			this.spawnWave(5, {
				x: 0,
				z: 0
			});
		}
		this.floater("FREED", site.x, 2.2, site.z, "#e8e4d8");
	}
	win() {
		if (this.mode === "win") return;
		this.mode = "win";
		this.fireHeld = false;
		if (document.pointerLockElement) document.exitPointerLock();
		this.say("ACCORD", "Lineages secured. The resistance remains on Earth. You are going home.");
		this.hooks.onEvent({
			type: "win",
			time: this.missionClock,
			kills: this.kills,
			op: this.hostOp,
			scrap: this.haul,
			manifest: this.extractionManifest()
		});
	}
	noteRecovered(itemRegistryId, x, z) {
		this.recovered.push({
			itemRegistryId,
			sectorTier: sectorTier(x, z)
		});
	}
	extractionManifest() {
		const carried = this.worn ? [...this.slots, ...this.accordSlots] : this.slots;
		const seated = new Set(carried.flatMap((slot) => slot.mods));
		const out = [];
		for (const id of seated) {
			const found = this.recovered.find((row) => row.itemRegistryId === id);
			if (found) out.push(found);
		}
		const seen = /* @__PURE__ */ new Set();
		for (const row of this.recovered) {
			if (row.itemRegistryId.startsWith("att_")) continue;
			if (seen.has(row.itemRegistryId)) continue;
			if (row.itemRegistryId.startsWith("wep_")) {
				const weaponId = weaponIdForRegistry(row.itemRegistryId);
				if (!weaponId || !carried.some((slot) => slot.id === weaponId)) continue;
			}
			seen.add(row.itemRegistryId);
			out.push(row);
		}
		return out;
	}
	die() {
		if (this.mode === "dead" || this.mode === "win") return;
		this.mode = "dead";
		this.hp = 0;
		this.fireHeld = false;
		this.haul = 0;
		if (document.pointerLockElement) document.exitPointerLock();
		this.hooks.onEvent({ type: "dead" });
	}
	damagePlayer(amount, fromX, fromZ, environmental = false) {
		if (amount <= 0 || this.invuln > 0 || this.mode === "dead" || this.mode === "win" || this.mode === "attract") return;
		const env = environmental || fromX == null;
		if (this.op === "nefret" && env) this.solar = Math.min(100, this.solar + amount * 1.45);
		let dmg = amount;
		if (this.shieldT > 0 && fromX != null && fromZ != null) {
			const fx = -Math.sin(this.yaw);
			const fz = -Math.cos(this.yaw);
			const dx = fromX - this.x;
			const dz = fromZ - this.z;
			const len = Math.hypot(dx, dz) || 1;
			if ((fx * dx + fz * dz) / len > .15) dmg = 0;
		}
		if (dmg <= 0) return;
		if (this.armor > 0) {
			const soak = Math.min(this.armor, dmg * .65);
			this.armor -= soak;
			dmg -= soak;
		}
		if (this.hp - dmg <= 0 && this.anchorT > 0 && this.anchor) {
			this.hp = 50;
			this.x = this.anchor.x;
			this.y = this.anchor.y;
			this.z = this.anchor.z;
			this.vx = 0;
			this.vz = 0;
			this.vy = 0;
			this.anchorT = 0;
			this.invuln = 1.5;
			this.floater("REWOUND", this.x, this.y + 2, this.z, "#2ee0c8");
			this.audio.ui();
			return;
		}
		this.hp -= dmg;
		this.hurtFlash = 1;
		if (this.op !== "khensu" && !this.gunStats().perks.has("FLINCH_IMMUNITY")) this.shake = Math.min(1, this.shake + .4);
		if (dmg > .4) this.audio.hurt();
		if (this.hp <= 0) this.die();
	}
	noiseRadius() {
		if (this.op === "ananda") return 0;
		const speed = Math.hypot(this.vx, this.vz);
		if (this.shotEcho > 0) return this.gunStats().perks.has("ACOUSTIC_STEALTH_MASK") ? this.gunStats().soundRadius : 36;
		if (this.slideT > 0) return 20;
		if (this.crouchHeld && speed > .3) return 7;
		if (speed > 7) return 26;
		if (speed > .4) return 14;
		return 3.5;
	}
	director(dt) {
		this.directorAcc += dt;
		if (this.directorAcc < 1 || this.mode !== "ground") return;
		this.directorAcc = 0;
		const near = this.pool.filter((a) => a.alive && a.team === "sec" && a.down <= 0 && Math.hypot(a.x - this.x, a.z - this.z) < 16).length;
		const slot = this.slots[this.slot];
		const ammoR = slot ? (slot.mag + slot.reserve) / 80 : 1;
		this.pressure = clamp((1 - this.hp / 100) * .55 + (ammoR < .22 ? .28 : 0) + near * .09, 0, 1);
		const nearGate = this.world.sites.some((site) => !site.freed && Math.hypot(site.x - this.x, site.z - this.z) < 22);
		const paced = paceMission({
			freed: this.freedCount,
			beacon: this.beaconDone,
			nearGate,
			hp: this.hp,
			stress: this.stress
		});
		this.stress = paced.stress;
		this.phase = paced.phase;
		this.panic = paced.panic;
		this.audio.setPressure(this.pressure * (this.outside > 0 ? 1 : .7) + (this.beaconDone ? .2 : 0) + this.stress * .15);
		const meds = this.loots.filter((l) => l.alive && l.kind === "med").length;
		if (this.pressure > .72 && meds < 2 && this.sinceAid > 20) {
			this.dropSupply("med");
			this.sinceAid = 0;
		}
		if (this.pressure < .25 && this.aliveSec() < 5 && this.sincePush > 16 && this.time > this.landTime + 22) {
			this.spawnWave(2);
			this.sincePush = 0;
		}
	}
	dropSupply(kind) {
		for (let i = 0; i < 8; i++) {
			const ang = Math.random() * Math.PI * 2;
			const x = this.x + Math.cos(ang) * (5 + Math.random() * 6);
			const z = this.z + Math.sin(ang) * (5 + Math.random() * 6);
			if (movementBlocked(x, z, 0, this.solids)) continue;
			this.makeLoot({
				kind,
				x,
				z
			}, true);
			this.toastMsg = kind === "med" ? "A medkit skids into the street." : "Ammo on the ground.";
			this.toastT = 1.8;
			return;
		}
	}
	say(speaker, text) {
		this.lines.push({
			speaker,
			text,
			t: 3.15
		});
	}
	tickLines(dt) {
		if (!this.line) {
			this.line = this.lines.shift() ?? null;
			return;
		}
		this.line.t -= dt;
		if (this.line.t <= 0) this.line = null;
	}
	footprintsUpdate(dt) {
		const track = this.aiming && this.gunStats().perks.has("TRACK_TRAIL_VISIBILITY");
		if (this.op !== "jaya" && !track || this.mode === "attract") {
			this.footPts.visible = false;
			return;
		}
		this.footPts.visible = true;
		this.footAcc += dt;
		if (this.footAcc > .35) {
			this.footAcc = 0;
			for (const actor of this.pool) {
				if (!actor.alive || actor.team !== "sec") continue;
				this.footprints.push({
					x: actor.x,
					y: actor.y + .08,
					z: actor.z,
					age: 0
				});
			}
		}
		const pos = this.footGeo.getAttribute("position");
		const col = this.footGeo.getAttribute("color");
		let n = 0;
		this.footprints = this.footprints.filter((f) => {
			f.age += dt;
			return f.age < 15;
		});
		for (const f of this.footprints) {
			if (n >= 180) break;
			pos.setXYZ(n, f.x, f.y, f.z);
			const fade = 1 - f.age / 15;
			col.setXYZ(n, .18 * fade, .88 * fade, .78 * fade);
			n++;
		}
		for (let i = n; i < 180; i++) pos.setXYZ(i, 0, -20, 0);
		pos.needsUpdate = true;
		col.needsUpdate = true;
	}
	decayJuice(dt) {
		this.shake = this.reduce ? 0 : this.shake * Math.exp(-6 * dt);
		this.kick *= Math.exp(-14 * dt);
		this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
		this.solarFlash = Math.max(0, this.solarFlash - dt * .85);
		this.hitMarker = Math.max(0, this.hitMarker - dt * 3.2);
		this.toastT = Math.max(0, this.toastT - dt);
		for (const item of this.feed) item.t -= dt;
		this.feed = this.feed.filter((item) => item.t > 0);
		for (const floater of this.floaters) floater.life -= dt;
		this.floaters = this.floaters.filter((f) => f.life > 0);
		for (const spark of this.sparks) {
			if (spark.life <= 0) continue;
			spark.life -= dt;
			spark.mesh.position.x += spark.vx * dt;
			spark.mesh.position.y += spark.vy * dt;
			spark.mesh.position.z += spark.vz * dt;
			spark.vy -= 8 * dt;
			spark.mesh.visible = spark.life > 0;
		}
		for (const chip of this.rubble) {
			if (chip.life <= 0) continue;
			chip.life -= dt;
			chip.mesh.position.x += chip.vx * dt;
			chip.mesh.position.y += chip.vy * dt;
			chip.mesh.position.z += chip.vz * dt;
			chip.vy -= 14 * dt;
			chip.mesh.visible = chip.life > 0;
		}
		for (const tracer of this.tracers) {
			if (tracer.life <= 0) continue;
			tracer.life -= dt;
			tracer.line.visible = tracer.life > 0;
		}
		const muzzle = this.guns.get(this.slots[this.slot]?.id ?? "pistol")?.userData.muzzle;
		if (muzzle && this.time > this.nextShot - 60 / this.currentWeapon().rpm + .045) muzzle.visible = false;
	}
	floater(text, x, y, z, color) {
		this.floaters.push({
			text,
			x,
			y,
			z,
			life: .85,
			color
		});
		if (this.floaters.length > 8) this.floaters.shift();
	}
	tracer(ox, oy, oz, dx, dy, dz, t, color) {
		const slot = this.tracers.find((tr) => tr.life <= 0) ?? this.tracers[0];
		slot.life = .06;
		slot.line.visible = true;
		slot.line.material.color.setHex(color);
		const attr = slot.line.geometry.getAttribute("position");
		attr.setXYZ(0, ox, oy, oz);
		attr.setXYZ(1, ox + dx * t, oy + dy * t, oz + dz * t);
		attr.needsUpdate = true;
	}
	spark(x, y, z) {
		const spark = this.sparks.find((s) => s.life <= 0);
		if (!spark) return;
		spark.life = .25;
		spark.mesh.visible = true;
		spark.mesh.position.set(x, y, z);
		spark.vx = (Math.random() - .5) * 3;
		spark.vy = 2 + Math.random() * 2;
		spark.vz = (Math.random() - .5) * 3;
	}
	ambience(dt, x, y, z) {
		this.nextBolt -= dt;
		if (this.nextBolt <= 0) {
			this.flash = 1;
			this.nextBolt = 7 + Math.random() * 10;
		}
		this.flash = Math.max(0, this.flash - dt * 6);
		this.skyMat.uniforms.flash.value = this.flash * .65;
		const attr = this.rainGeo.getAttribute("position");
		for (let i = 0; i < this.rain.length; i++) {
			const drop = this.rain[i];
			drop.y -= 32 * dt;
			if (drop.y < -2) drop.y = 24;
			const wx = x + drop.x;
			const wz = z + drop.z;
			const wy = y + drop.y - 8;
			attr.setXYZ(i * 2, wx, wy, wz);
			attr.setXYZ(i * 2 + 1, wx + .15, wy - 1.15, wz + .05);
		}
		attr.needsUpdate = true;
		if (this.mode === "drop" && this.dropAge < 5) {
			this.ship.visible = true;
			this.ship.position.set(this.x + 4, this.y + 2, this.z - 18 - this.dropAge * 26);
			this.ship.lookAt(this.x, this.y - 10, this.z - 40);
		} else if (this.mode !== "attract") this.ship.visible = false;
		const p = this.mode === "attract" ? {
			x: 80,
			z: -80
		} : this.objectivePoint();
		this.beam.position.set(p.x, 18, p.z);
		this.beam.material.color.setHex(this.beaconDone ? 13935178 : 3072200);
		if (this.orbitalVfx > 0) {
			this.orbitalVfx = Math.max(0, this.orbitalVfx - dt);
			const frames = (1.5 - this.orbitalVfx) * 60;
			const intensity = 28 * Math.pow(.92, frames);
			this.orbitalLight.intensity = intensity;
			const fade = this.orbitalVfx / 1.5;
			this.orbitalBeam.material.opacity = .9 * fade;
			this.orbitalHalo.material.opacity = .28 * fade;
			if (this.orbitalVfx <= 0) {
				this.orbitalBeam.visible = false;
				this.orbitalHalo.visible = false;
				this.orbitalLight.visible = false;
				this.orbitalLight.intensity = 0;
			}
		}
		this.portalMeshA.visible = !!this.portalA;
		this.portalMeshB.visible = !!this.portalB && this.portalT > 0;
		if (this.portalA) this.portalMeshA.position.set(this.portalA.x, 1.2, this.portalA.z);
		if (this.portalB) this.portalMeshB.position.set(this.portalB.x, 1.2, this.portalB.z);
		this.portalMeshA.rotation.y += dt;
		this.portalMeshB.rotation.y -= dt;
		this.voidMesh.visible = this.voidT > 0;
		this.voidMesh.position.set(this.voidX, .2, this.voidZ);
		this.unravelMesh.visible = this.unravelT > 0;
		if (this.unravelT > 0) {
			this.unravelMesh.position.set(this.unravelX, 2.2, this.unravelZ);
			this.unravelMesh.scale.setScalar(this.unravelR);
			this.unravelMesh.rotation.y += dt * .4;
		}
		this.anchorMesh.visible = this.anchorT > 0 && !!this.anchor;
		if (this.anchor) this.anchorMesh.position.set(this.anchor.x, this.anchor.y + .06, this.anchor.z);
		this.shieldMesh.visible = this.shieldT > 0;
		if (this.shieldT > 0) {
			const fx = -Math.sin(this.yaw);
			const fz = -Math.cos(this.yaw);
			this.shieldMesh.position.set(this.x + fx * 1.35, this.y + 1.25, this.z + fz * 1.35);
			this.shieldMesh.lookAt(this.x + fx * 4, this.y + 1.25, this.z + fz * 4);
		}
		this.sun.position.set(x + 26, 48, z + 14);
		this.sun.target.position.set(x, 0, z);
		this.sun.target.updateMatrixWorld();
	}
	posePlayer() {
		const bob = !this.reduce && this.grounded && this.mode === "ground" ? Math.sin(this.bobPhase) * .03 * (this.crouchHeld ? .35 : 1) * (this.aiming ? .2 : 1) : 0;
		if (this.grounded) this.bobPhase += Math.hypot(this.vx, this.vz) * .16;
		const shake = this.op === "khensu" ? this.shake * .15 : this.shake;
		this.euler.set(this.pitch, this.yaw, 0, "YXZ");
		this.camera.quaternion.setFromEuler(this.euler);
		this.camera.position.set(this.x + (Math.random() - .5) * shake * .06, this.y + this.eye + bob + (Math.random() - .5) * shake * .05, this.z);
		const fov = this.aiming ? 50 : 78;
		this.camera.fov += (fov - this.camera.fov) * .18;
		this.camera.updateProjectionMatrix();
		this.viewCam.fov = this.camera.fov;
		this.viewCam.aspect = this.camera.aspect;
		this.viewCam.updateProjectionMatrix();
		const id = this.slots[this.slot]?.id ?? "pistol";
		for (const [key, mesh] of this.guns) mesh.visible = key === id && this.mode !== "attract";
		this.swayX += (this.mouseDX * .0012 - this.swayX) * .18;
		this.swayY += (this.mouseDY * .0012 - this.swayY) * .18;
		this.mouseDX = 0;
		this.mouseDY = 0;
		const ads = this.aiming ? 1 : 0;
		this.viewRig.position.set(.26 * (1 - ads) + .02 * ads + this.swayX, -.24 * (1 - ads) - .16 * ads + this.swayY - bob * .4, -.5 + this.kick);
		const kit = this.guns.get(id)?.userData.kit;
		if (kit) {
			const beam = this.orbitalVfx / 1.5;
			for (const mesh of Object.values(kit)) {
				const mat = mesh.material;
				const baseI = mesh.userData.baseEmit ?? 0;
				const baseColor = mesh.userData.baseColor ?? mat.color.getHex();
				const solar = mesh.userData.solar === true;
				const spec = beam * (.04 + .96 * mat.metalness) * (1 - mat.roughness * .85);
				mat.emissiveIntensity = baseI + (solar ? beam * 2.4 : spec * 5);
				mat.emissive.setHex(!solar && beam > .05 && mat.metalness > .45 ? 15910254 : baseColor);
			}
		}
	}
	render() {
		this.renderer.clear(true, true, true);
		this.renderer.render(this.scene, this.camera);
		if (this.mode !== "attract") {
			this.renderer.clearDepth();
			this.renderer.render(this.viewScene, this.viewCam);
		}
		this.drawMap();
	}
	resize() {
		const w = this.host.clientWidth || 1;
		const h = this.host.clientHeight || 1;
		this.viewW = w;
		this.viewH = h;
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / Math.max(1, h);
		this.camera.updateProjectionMatrix();
	}
	el(id) {
		return this.hud?.querySelector("#" + id);
	}
	writeHud() {
		if (!this.hud) return;
		const weapon = this.currentWeapon();
		const stats = this.gunStats();
		const slot = this.slots[this.slot];
		const op = OPERATOR_BY_ID[this.op];
		const obj = this.objectivePoint();
		const dist = Math.hypot(obj.x - this.x, obj.z - this.z);
		const set = (id, text) => {
			const node = this.el(id);
			if (node && node.textContent !== text) node.textContent = text;
		};
		set("mte-hp-num", `${Math.max(0, Math.ceil(this.hp))}`);
		const hp = this.el("mte-hp");
		if (hp) hp.style.width = `${clamp(this.hp, 0, 100)}%`;
		const ar = this.el("mte-ar");
		if (ar) ar.style.width = `${clamp(this.armor, 0, 80) / 80 * 100}%`;
		set("mte-mag", this.reloadT > 0 ? "···" : `${slot?.mag ?? 0}`);
		set("mte-res", `${slot?.reserve ?? 0}`);
		set("mte-weapon", this.reloadT > 0 ? "RELOADING" : stats.modCount > 0 ? `${weapon.name}  +${stats.modCount}` : weapon.name);
		set("mte-act", this.mode === "drop" ? "DESCENT" : this.phase === "BREACH" ? "BREACH" : this.phase === "ESCORT_UPRISING" ? "ESCORT · UPRISING" : this.phase === "EXTRACTION" ? "EXTRACTION" : "INFILTRATION");
		set("mte-obj", this.mode === "drop" ? "STEER THE CHUTE" : obj.label);
		set("mte-obj-sub", this.mode === "drop" ? "Shift dives. Space flares. Land soft if you can." : this.mode === "ground" && !this.world.sites[0].freed ? "Breach the gate or drop into the courtyard." : this.beaconDone ? "Stand on the recovery pad. Keep both bloodlines inside the ring." : this.worn ? `${OPERATOR_BY_ID[this.worn].name} is unstable. Q and F are not Accord doctrine.` : "B wears a freed bloodline. Their kits do not behave.");
		set("mte-dist", `${Math.round(dist)} m`);
		set("mte-sector", this.sectorName());
		const secs = Math.floor(this.missionClock);
		set("mte-kills", `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}   ${this.kills} DOWN`);
		const heading = (-this.yaw * 180 / Math.PI + 360) % 360;
		set("mte-compass", `${[
			"N",
			"NE",
			"E",
			"SE",
			"S",
			"SW",
			"W",
			"NW"
		][Math.round(heading / 45) % 8]}  ${heading.toFixed(0)}`);
		const noise = this.el("mte-noise");
		if (noise) noise.style.width = `${clamp(this.noiseRadius() / 36, 0, 1) * 100}%`;
		set("mte-zone", this.outside > 0 ? `OUTSIDE  ${this.outside.toFixed(0)}m` : `ZONE  ${this.zoneR.toFixed(0)}m`);
		set("mte-stress", this.panic ? `PANIC  ${this.stress.toFixed(2)}` : `STRESS  ${this.stress.toFixed(2)}`);
		set("mte-haul", this.haul > 0 ? `HAUL  ${this.haul}` : "");
		const noiseLabel = this.el("mte-noise-label");
		if (noiseLabel) noiseLabel.textContent = this.op === "ananda" ? "0.0m AUDIBLE" : "NOISE";
		const stabWrap = this.el("mte-stability-wrap");
		if (stabWrap) {
			const show = this.op === "ananda" && (this.mode === "ground" || this.mode === "drop");
			stabWrap.style.display = show ? "block" : "none";
			const charge = this.qCd <= .05 ? 1 : Math.max(0, 1 - this.qCd / 9);
			const stab = this.el("mte-stability");
			if (stab) {
				stab.style.width = `${charge * 100}%`;
				stab.style.background = charge >= 1 ? "#fff" : "";
			}
			set("mte-stability-label", charge >= 1 ? "SHIFT READY" : `STABILITY ${(charge * 100).toFixed(0)}`);
			const moving = this.slideT > 0 || Math.hypot(this.vx, this.vz) > 7;
			stabWrap.classList.toggle("is-ready", charge >= 1);
			stabWrap.classList.toggle("is-warp", moving);
		}
		set("mte-tac", this.op === "ananda" ? "TAC_NET  DHARMA  ·  0.0m" : this.op === "nefret" ? "TAC_NET  MA'AT  ·  KIN-COIL" : this.mode === "ground" || this.mode === "drop" ? "TAC_NET  ACCORD" : "");
		const solarWrap = this.el("mte-solar-wrap");
		const critical = this.solar >= 85;
		if (solarWrap) {
			const show = this.op === "nefret" && (this.mode === "ground" || this.mode === "drop");
			solarWrap.style.display = show ? "block" : "none";
		}
		const pct = this.el("mte-solar-pct");
		if (pct) {
			const text = `${this.solar.toFixed(1)}% MAX`;
			if (pct.textContent !== text) pct.textContent = text;
			pct.classList.toggle("is-crit", critical);
		}
		const head = this.el("mte-coil-head");
		if (head) head.classList.toggle("is-live", this.op === "nefret");
		const coil = this.el("mte-coil");
		if (coil) {
			const lit = Math.round(this.solar / 100 * 16);
			coil.querySelectorAll("[data-seg]").forEach((node, index) => {
				const on = index < lit;
				node.classList.toggle("is-on", on && !critical);
				node.classList.toggle("is-crit", on && critical);
			});
		}
		const alert = this.el("mte-coil-alert");
		if (alert) {
			alert.style.display = critical ? "block" : "none";
			alert.classList.toggle("is-hot", critical);
		}
		const action = this.el("mte-coil-action");
		if (action && critical) {
			const text = dischargeReady(this.solar, this.ultCd) ? "[ F  ORBITAL DISCHARGE ]" : this.raT > 0 ? "ORBITAL DISCHARGE LIVE" : "DISCHARGE INJECTOR CHARGING";
			if (action.textContent !== text) action.textContent = text;
		}
		const sub = this.el("mte-sub");
		const speaker = this.el("mte-speaker");
		if (sub && speaker) {
			sub.textContent = this.line?.text ?? "";
			speaker.textContent = this.line?.speaker ?? "";
			sub.parentElement.style.opacity = this.line ? "1" : "0";
		}
		const prompt = this.el("mte-prompt");
		if (prompt) {
			prompt.textContent = this.prompt;
			prompt.style.opacity = this.prompt ? "1" : "0";
		}
		set("mte-qname", this.portalA && !this.portalB ? "SET EXIT" : op.activeName);
		set("mte-fname", this.anchorT > 0 ? `LINK ${this.anchorT.toFixed(1)}` : this.shieldT > 0 ? `SHIELD ${this.shieldT.toFixed(1)}` : this.raT > 0 ? `RA ${this.raT.toFixed(1)}` : this.unravelT > 0 ? `VOID ${this.unravelT.toFixed(1)}` : op.ultName);
		set("mte-qcd", this.qCd > .05 ? this.qCd.toFixed(1) : "READY");
		set("mte-fcd", this.ultCd > .05 ? this.ultCd.toFixed(1) : "READY");
		const q = this.el("mte-q");
		const f = this.el("mte-f");
		if (q) q.style.opacity = this.qCd > 0 ? "0.45" : "1";
		if (f) f.style.opacity = this.ultCd > 0 ? "0.45" : "1";
		const cross = this.el("mte-cross");
		if (cross) {
			const gap = 6 + (this.aiming ? 2 : 8) + Math.hypot(this.vx, this.vz) * .7 + (this.reloadT > 0 ? 6 : 0);
			cross.style.setProperty("--gap", `${gap}px`);
			cross.classList.toggle("is-skill", this.aiming && stats.perks.has("SKILLSHOT_HIGHLIGHT"));
		}
		const hit = this.el("mte-hit");
		if (hit) {
			hit.style.opacity = String(this.hitMarker);
			hit.classList.toggle("is-head", this.headMark);
		}
		const vig = this.el("mte-vig");
		if (vig) {
			vig.style.opacity = String(Math.max(this.hurtFlash * .9, this.solarFlash * .92, this.outside > 0 ? .55 : 0));
			vig.classList.toggle("is-zone", this.outside > 0 && this.solarFlash < .08);
			vig.classList.toggle("is-solar", this.solarFlash > .05);
		}
		const toast = this.el("mte-toast");
		if (toast) {
			toast.textContent = this.toastMsg;
			toast.style.opacity = this.toastT > 0 ? "1" : "0";
		}
		const feed = this.el("mte-feed");
		if (feed) feed.textContent = this.feed.map((item) => item.text).join("\n");
		const squad = this.el("mte-squad");
		if (squad) {
			const rows = this.pool.filter((a) => a.squad).map((a) => `${a.name.toUpperCase()}   ${!a.deployed ? "DROP" : a.down > 0 ? "DOWN" : Math.ceil(a.hp)}`);
			const mark = (id, freed) => `${id === "ananda" ? "ANANDA" : "NEFRET"}   ${this.worn === id ? "WORN" : freed ? "FREE" : "CAGED"}`;
			rows.push(mark("ananda", !!this.world.sites[0]?.freed), mark("nefret", !!this.world.sites[1]?.freed));
			squad.textContent = rows.join("\n");
		}
		const channel = this.el("mte-channel");
		const wrap = this.el("mte-channel-wrap");
		if (channel && wrap) {
			const active = this.channel > .05 || this.beaconDone && this.extractT > .05;
			wrap.style.opacity = active ? "1" : "0";
			const p = this.beaconDone ? this.extractT / 6 : this.channel / 4.6;
			channel.style.width = `${clamp(p, 0, 1) * 100}%`;
		}
		const lock = this.el("mte-lock");
		if (lock) {
			const show = !this.touch && !this.locked && !this.paused && (this.mode === "drop" || this.mode === "ground");
			lock.style.display = show ? "grid" : "none";
		}
		const marks = this.el("mte-marks");
		if (marks) {
			const projected = this.project(obj.x, 2, obj.z);
			let mx = projected.x;
			let my = projected.y;
			if (projected.behind || mx < 24 || mx > this.viewW - 24 || my < 24 || my > this.viewH - 80) {
				let dx = projected.x - this.viewW / 2;
				let dy = projected.y - this.viewH / 2;
				if (projected.behind) {
					dx = -dx;
					dy = -dy;
				}
				const ang = Math.atan2(dy, dx);
				const rad = Math.min(this.viewW, this.viewH) * .34;
				mx = this.viewW / 2 + Math.cos(ang) * rad;
				my = this.viewH / 2 + Math.sin(ang) * rad;
			}
			const bits = [`<div class="absolute font-display text-xs tracking-widest text-gold" style="left:${mx}px;top:${my}px;transform:translate(-50%,-50%)">${obj.label}</div>`];
			for (const floater of this.floaters) {
				const p = this.project(floater.x, floater.y, floater.z);
				if (p.behind) continue;
				bits.push(`<div class="absolute font-display text-sm tracking-widest" style="left:${p.x}px;top:${p.y}px;transform:translate(-50%,-50%);color:${floater.color};opacity:${floater.life}">${floater.text}</div>`);
			}
			marks.innerHTML = bits.join("");
		}
	}
	project(x, y, z) {
		this.tmp.set(x, y, z).project(this.camera);
		return {
			x: (this.tmp.x * .5 + .5) * this.viewW,
			y: (-this.tmp.y * .5 + .5) * this.viewH,
			behind: this.tmp.z > 1
		};
	}
	sectorName() {
		return sectorLabel(this.x, this.z);
	}
	drawMap() {
		const ctx = this.mapCtx;
		const canvas = ctx?.canvas;
		if (!ctx || !canvas) return;
		const s = canvas.width;
		ctx.clearRect(0, 0, s, s);
		ctx.save();
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
		ctx.clip();
		ctx.fillStyle = "rgba(7,9,13,0.2)";
		ctx.fillRect(0, 0, s, s);
		ctx.translate(s / 2, s / 2);
		const scale = 1.15;
		const yaw = this.mode === "attract" ? 0 : this.yaw;
		const rx = Math.cos(yaw);
		const rz = -Math.sin(yaw);
		const fx = -Math.sin(yaw);
		const fz = -Math.cos(yaw);
		const px = this.mode === "attract" ? 0 : this.x;
		const pz = this.mode === "attract" ? 0 : this.z;
		const proj = (x, z) => {
			const dx = x - px;
			const dz = z - pz;
			return [(dx * rx + dz * rz) * scale, -(dx * fx + dz * fz) * scale];
		};
		ctx.fillStyle = "#1b2129";
		for (const box of this.world.buildings) {
			const corners = [
				[box.minX, box.minZ],
				[box.maxX, box.minZ],
				[box.maxX, box.maxZ],
				[box.minX, box.maxZ]
			];
			ctx.beginPath();
			corners.forEach(([x, z], i) => {
				const [sx, sy] = proj(x, z);
				if (i === 0) ctx.moveTo(sx, sy);
				else ctx.lineTo(sx, sy);
			});
			ctx.closePath();
			ctx.fill();
		}
		ctx.strokeStyle = this.outside > 0 ? "#e24b4b" : "#d4a24a";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		for (let i = 0; i <= 32; i++) {
			const a = i / 32 * Math.PI * 2;
			const [sx, sy] = proj(this.zoneX + Math.cos(a) * this.zoneR, this.zoneZ + Math.sin(a) * this.zoneR);
			if (i === 0) ctx.moveTo(sx, sy);
			else ctx.lineTo(sx, sy);
		}
		ctx.stroke();
		const obj = this.objectivePoint();
		const [ox, oy] = proj(obj.x, obj.z);
		ctx.fillStyle = "#d4a24a";
		ctx.fillRect(ox - 2, oy - 2, 4, 4);
		for (const loot of this.loots) {
			if (!loot.alive) continue;
			if (Math.hypot(loot.x - px, loot.z - pz) > 58) continue;
			const [lx, ly] = proj(loot.x, loot.z);
			ctx.fillStyle = loot.kind === "ammo" ? "#2ee0c8" : loot.kind === "weapon" || loot.kind === "mod" ? "#d4a24a" : loot.kind === "med" ? "#e8e4d8" : "#e24b4b";
			ctx.fillRect(lx - 1.5, ly - 1.5, 3, 3);
		}
		ctx.strokeStyle = "#d4a24a";
		ctx.lineWidth = 1;
		for (const term of this.terminals) {
			if (term.open) continue;
			if (Math.hypot(term.x - px, term.z - pz) > 90) continue;
			const [tx, ty] = proj(term.x, term.z);
			ctx.strokeRect(tx - 3, ty - 3, 6, 6);
		}
		for (const actor of this.pool) {
			if (!actor.alive || actor.down > 0) continue;
			if (actor.squad && !actor.deployed) continue;
			const [sx, sy] = proj(actor.x, actor.z);
			ctx.fillStyle = actor.team === "sec" ? "#e24b4b" : "#2ee0c8";
			ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
		}
		ctx.fillStyle = "#e8e4d8";
		ctx.beginPath();
		ctx.moveTo(0, -6);
		ctx.lineTo(4, 5);
		ctx.lineTo(-4, 5);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
};
function discSwipe(dx, dy, minDistance = 30) {
	if (Math.hypot(dx, dy) < minDistance) return null;
	const deg = Math.atan2(-dy, dx) * 180 / Math.PI;
	if (deg >= 45 && deg < 135) return "ult";
	if (deg >= -45 && deg < 45) return "reload";
	if (deg >= -135 && deg < -45) return "swap";
	return "blood";
}
var GoldDiscController = class {
	swipeMinDistance = 30;
	holdDelayMs = 300;
	doubleTapMs = 250;
	frame = null;
	pendingTap = null;
	swallow = false;
	begin(x, y, now) {
		if (this.pendingTap != null && now - this.pendingTap < this.doubleTapMs) {
			this.pendingTap = null;
			this.swallow = true;
			this.frame = null;
			return [{
				type: "pulse",
				key: "mass"
			}];
		}
		this.swallow = false;
		this.frame = {
			x0: x,
			y0: y,
			x,
			y,
			t: now,
			held: false
		};
		return [];
	}
	move(x, y) {
		if (!this.frame) return;
		this.frame.x = x;
		this.frame.y = y;
	}
	hold(now) {
		const frame = this.frame;
		if (!frame || frame.held || now - frame.t < this.holdDelayMs) return [];
		frame.held = true;
		return [{
			type: "interact",
			down: true
		}];
	}
	end(x, y, now) {
		if (this.swallow) {
			this.swallow = false;
			return [];
		}
		const frame = this.frame;
		this.frame = null;
		if (!frame) return [];
		if (frame.held) return [{
			type: "interact",
			down: false
		}];
		const swipe = discSwipe(x - frame.x0, y - frame.y0, this.swipeMinDistance);
		if (swipe === "ult") return [{
			type: "pulse",
			key: "ult"
		}];
		if (swipe === "reload") return [{
			type: "pulse",
			key: "reload"
		}];
		if (swipe === "swap") return [{
			type: "pulse",
			key: "swap"
		}];
		if (swipe === "blood") return [{
			type: "pulse",
			key: "blood"
		}];
		this.pendingTap = now;
		return [{ type: "await-tap" }];
	}
	flush(now) {
		if (this.pendingTap == null || now - this.pendingTap < this.doubleTapMs) return [];
		this.pendingTap = null;
		return [{
			type: "pulse",
			key: "ability"
		}];
	}
	label() {
		const frame = this.frame;
		if (!frame) return null;
		if (frame.held) return "E";
		const swipe = discSwipe(frame.x - frame.x0, frame.y - frame.y0, this.swipeMinDistance);
		if (swipe === "ult") return "F";
		if (swipe === "reload") return "R";
		if (swipe === "swap") return "SWAP";
		if (swipe === "blood") return "B";
		return "Q";
	}
};
var LOOK_GAIN = 1.7;
function stickFromDrag(dx, dy, sprintShove = 75) {
	const scale = Math.min(1, 56 / (Math.hypot(dx, dy) || 1));
	return {
		ax: dx * scale / 56,
		ay: -dy * scale / 56,
		sprint: -dy >= sprintShove
	};
}
function applyTouchCommand(sink, command, later = () => {}) {
	if (command.type === "move") {
		sink.ax = command.ax;
		sink.ay = command.ay;
		sink.sprint = command.sprint;
	} else if (command.type === "stop-move") {
		sink.ax = 0;
		sink.ay = 0;
		sink.sprint = false;
		sink.crouch = false;
	} else if (command.type === "jump") {
		if (command.latch) {
			sink.jump = true;
			later(100, () => {
				sink.jump = false;
			});
		} else sink.jump = command.down;
	} else if (command.type === "crouch") sink.crouch = command.down;
	else if (command.type === "look") {
		sink.lookX += command.dx;
		sink.lookY += command.dy;
	} else if (command.type === "fire") sink.fire = command.down;
	else if (command.type === "aim") sink.aim = !sink.aim;
	else if (command.type === "interact") sink.interact = command.down;
	else if (command.type === "look-held") sink.lookHeld = command.down;
	else if (command.type === "await-tap" || command.type === "rearm") return;
	else if (command.type === "pulse") {
		sink[command.key] = true;
		later(90, () => {
			sink[command.key] = false;
		});
	}
}
var TouchControllerLayer = class {
	flickVelocityThreshold = 15;
	flickWindowMs = 220;
	stillHoldPixelRadius = 4;
	stillFireDelayMs = 180;
	sprintShoveThreshold = 75;
	lookSensitivity = LOOK_GAIN;
	doubleTapMs = 250;
	disc = new GoldDiscController();
	tracks = /* @__PURE__ */ new Map();
	lookTap = {
		t: 0,
		x: 0,
		y: 0,
		clean: false
	};
	begin(id, zone, x, y, now) {
		let look = "pending";
		const commands = [];
		if (zone === "FIRE") commands.push({
			type: "fire",
			down: true
		});
		if (zone === "INTERACT") commands.push({
			type: "interact",
			down: true
		});
		if (zone === "UTILITY") commands.push(...this.disc.begin(x, y, now));
		if (zone === "LOOK_COMBAT") {
			commands.push({
				type: "look-held",
				down: true
			});
			const quick = this.lookTap.clean && now - this.lookTap.t < this.doubleTapMs && Math.hypot(x - this.lookTap.x, y - this.lookTap.y) < 36;
			this.lookTap = {
				t: 0,
				x: 0,
				y: 0,
				clean: false
			};
			if (quick) {
				look = "aim";
				commands.push({ type: "aim" });
			}
		}
		this.tracks.set(id, {
			zone,
			x0: x,
			y0: y,
			x,
			y,
			t: now,
			look,
			firing: false,
			flicked: false,
			held: false,
			pick: null
		});
		return commands;
	}
	move(id, x, y, now, _force = 0) {
		const track = this.tracks.get(id);
		if (!track) return [];
		const dx = x - track.x0;
		const dy = y - track.y0;
		const commands = [];
		if (track.zone === "MOVEMENT") commands.push({
			type: "move",
			...stickFromDrag(dx, dy, this.sprintShoveThreshold)
		});
		else if (track.zone === "PARKOUR") {
			if (dy < -this.flickVelocityThreshold) commands.push({
				type: "jump",
				down: true
			});
			if (dy > this.flickVelocityThreshold && !track.flicked) {
				track.flicked = true;
				commands.push({
					type: "pulse",
					key: "slide"
				});
				commands.push({
					type: "crouch",
					down: true
				});
			}
		} else if (track.zone === "LOOK_COMBAT") {
			if (track.look !== "aim") track.look = "look";
			commands.push({
				type: "look",
				dx: (x - track.x) * this.lookSensitivity,
				dy: (y - track.y) * this.lookSensitivity
			});
		} else if (track.zone === "UTILITY") this.disc.move(x, y);
		track.x = x;
		track.y = y;
		return commands;
	}
	hold(id, now) {
		const track = this.tracks.get(id);
		if (!track) return [];
		if (track.zone === "UTILITY") return this.disc.hold(now);
		return [];
	}
	end(id, x, y, now) {
		const track = this.tracks.get(id);
		this.tracks.delete(id);
		if (!track) return [];
		const dx = x - track.x0;
		const dy = y - track.y0;
		const commands = [];
		if (track.zone === "MOVEMENT" || track.zone === "PARKOUR") {
			commands.push({ type: "stop-move" });
			const rapid = now - track.t <= this.flickWindowMs;
			if (rapid && -dy > this.flickVelocityThreshold) commands.push({
				type: "jump",
				down: true,
				latch: true
			});
			else if (rapid && dy > this.flickVelocityThreshold) commands.push({
				type: "pulse",
				key: "slide"
			});
			else commands.push({
				type: "jump",
				down: false
			});
		}
		if (track.zone === "LOOK_COMBAT") {
			const clean = Math.hypot(dx, dy) < 18 && now - track.t < 240;
			this.lookTap = {
				t: now,
				x,
				y,
				clean
			};
			commands.push({
				type: "look-held",
				down: false
			});
		}
		if (track.zone === "FIRE") commands.push({
			type: "fire",
			down: false
		});
		if (track.zone === "INTERACT") commands.push({
			type: "interact",
			down: false
		});
		if (track.zone === "UTILITY") commands.push(...this.disc.end(x, y, now));
		return commands;
	}
	flushDisc(now) {
		return this.disc.flush(now);
	}
	discHoldDelay() {
		return this.disc.holdDelayMs;
	}
	discDoubleTapMs() {
		return this.disc.doubleTapMs;
	}
	utilityLabel(id) {
		const track = this.tracks.get(id);
		if (!track || track.zone !== "UTILITY") return null;
		return this.disc.label();
	}
};
var RECORD_KEY = "mte-record-v1";
function loadRecord() {
	try {
		const raw = localStorage.getItem(RECORD_KEY);
		if (!raw) return {
			extractions: 0,
			best: 0,
			kills: 0,
			scrap: 0
		};
		const parsed = JSON.parse(raw);
		return {
			extractions: parsed.extractions || 0,
			best: parsed.best || 0,
			kills: parsed.kills || 0,
			scrap: parsed.scrap || 0
		};
	} catch {
		return {
			extractions: 0,
			best: 0,
			kills: 0,
			scrap: 0
		};
	}
}
function clock(seconds) {
	const s = Math.max(0, Math.floor(seconds));
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
function Mission() {
	const hostRef = (0, import_react.useRef)(null);
	const rootRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [screen, setScreen] = (0, import_react.useState)("menu");
	const [op, setOp] = (0, import_react.useState)("jaya");
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [stats, setStats] = (0, import_react.useState)(null);
	const [record, setRecord] = (0, import_react.useState)(null);
	const [mars, setMars] = (0, import_react.useState)(null);
	const chosen = OPERATOR_BY_ID[op];
	(0, import_react.useEffect)(() => {
		setRecord(loadRecord());
		const seeded = ensureCredits(loadMars(), loadRecord().scrap);
		if (seeded.martianCredits !== loadMars().martianCredits) saveMars(seeded);
		setMars(seeded);
		const host = hostRef.current;
		const root = rootRef.current;
		if (!host || !root) return;
		const engine = new MissionEngine(host, { onEvent: (event) => {
			if (event.type === "mode") setScreen(event.mode === "play" ? "play" : "menu");
			if (event.type === "pause") setScreen(event.paused ? "pause" : "play");
			if (event.type === "dead") setScreen("dead");
			if (event.type === "win") {
				setStats({
					time: event.time,
					kills: event.kills,
					op: event.op,
					scrap: event.scrap,
					filed: event.manifest.map((piece) => labelForRegistry(piece.itemRegistryId))
				});
				setScreen("win");
				const nextMars = commitExtraction(loadMars(), event.scrap, event.manifest);
				saveMars(nextMars);
				setMars(nextMars);
				setRecord((prev) => {
					const base = prev ?? loadRecord();
					const next = {
						extractions: base.extractions + 1,
						best: base.best === 0 ? event.time : Math.min(base.best, event.time),
						kills: base.kills + event.kills,
						scrap: base.scrap + event.scrap
					};
					localStorage.setItem(RECORD_KEY, JSON.stringify(next));
					return next;
				});
			}
			if (event.type === "error") setScreen("menu");
		} });
		engine.bind(root);
		engineRef.current = engine;
		return () => {
			engine.destroy();
			engineRef.current = null;
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: rootRef,
		className: "fixed inset-0 select-none overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: hostRef,
				className: "absolute inset-0"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hud, {
				live: screen === "play" || screen === "pause" || screen === "dead" || screen === "win",
				onEngage: () => engineRef.current?.capture()
			}),
			screen === "menu" || screen === "dossier" || screen === "armory" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {
				op,
				setOp,
				panel: screen === "dossier" ? "dossier" : screen === "armory" ? "armory" : "ops",
				record,
				mars,
				onDossier: () => setScreen("dossier"),
				onArmory: () => setScreen("armory"),
				onBack: () => setScreen("menu"),
				onMars: (next) => {
					saveMars(next);
					setMars(next);
				},
				onStart: () => {
					engineRef.current?.start(op);
					engineRef.current?.capture();
				}
			}) : null,
			screen === "pause" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Overlay, {
				kicker: "Hold",
				title: "Paused",
				body: "The zone does not pause for anyone else. It is waiting on you.",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "bg-cyan px-5 py-3 font-display text-lg tracking-widest text-bg",
						onClick: () => engineRef.current?.resume(),
						children: "Resume"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "border border-line px-5 py-3 font-display text-lg tracking-widest text-fg",
						onClick: () => setMuted(engineRef.current?.toggleMute() ?? muted),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-2",
							children: [muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4" }), muted ? "Sound off" : "Sound on"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "px-5 py-3 font-display text-lg tracking-widest text-muted",
						onClick: () => engineRef.current?.abort(),
						children: "Abort mission"
					})
				]
			}) : null,
			screen === "dead" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Overlay, {
				kicker: "Down",
				title: "Signal lost",
				body: "Nod keeps the body. The lineages are still in the smoke unless you already walked them out. Reinsert at the objective.",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "bg-cyan px-5 py-3 font-display text-lg tracking-widest text-bg",
					onClick: () => engineRef.current?.reinsert(),
					children: "Reinsert"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "px-5 py-3 font-display text-lg tracking-widest text-muted",
					onClick: () => engineRef.current?.abort(),
					children: "Return to the Shakuna"
				})]
			}) : null,
			screen === "win" && stats ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Overlay, {
				kicker: "Covenant",
				title: "Going home",
				body: `${OPERATOR_BY_ID[stats.op].name} got Ananda and Nefret off the pad in ${clock(stats.time)}. ${stats.kills} corporate guns went quiet. ${stats.scrap > 0 ? `Hauled ${stats.scrap} scrap off the pad.` : "The pad took no scrap this run."} ${stats.filed.length ? `Mars filed ${stats.filed.join(", ")}.` : ""} The resistance stays in Nod. Mars has the warning.`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-sm tracking-widest text-gold",
					children: record ? `${record.extractions} extractions · best ${record.best ? clock(record.best) : "—"} · ${mars?.martianCredits ?? record.scrap} Martian credits` : ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "bg-gold px-5 py-3 font-display text-lg tracking-widest text-bg",
					onClick: () => engineRef.current?.abort(),
					children: "File the report"
				})]
			}) : null,
			screen === "play" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Touch, { engineRef }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "sr-only",
				children: [
					"Playing as ",
					chosen.name,
					". Mission To Earth, city of Nod."
				]
			})
		]
	});
}
function Menu({ op, setOp, panel, record, mars, onDossier, onArmory, onBack, onMars, onStart }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 overflow-y-auto bg-bg/80",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex min-h-full max-w-6xl flex-col justify-end gap-8 px-5 py-10 md:justify-center md:px-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "inline-flex items-center gap-2 font-display text-sm tracking-widest text-cyan",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-4" }), "The Accord · Operation Shakuna"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "mt-2 font-display text-6xl leading-none font-semibold text-fg md:text-8xl",
							children: [
								"Mission",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"to Earth"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-md text-base leading-relaxed text-muted",
							children: "Four warriors drop on Nod. Ananda and Nefret are still in the cradles, cut open for a technology the Accord was never trained to hold. Free them. Press B, and wear what comes out."
						}),
						record && record.extractions > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 font-display text-sm tracking-widest text-gold",
							children: [
								"Service record · ",
								record.extractions,
								" extractions · ",
								record.kills,
								" confirmed",
								record.scrap > 0 ? ` · ${mars?.martianCredits ?? record.scrap} Martian credits` : ""
							]
						}) : null
					]
				}),
				panel === "dossier" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-4 border border-line bg-surface p-5 md:grid-cols-3",
					children: DOSSIER.map((act) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xs tracking-widest text-gold",
							children: act.kicker
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 font-display text-2xl text-fg",
							children: act.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-muted",
							children: act.body
						})
					] }, act.title))
				}) : panel === "armory" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Armory, {
					opWeapon: OPERATOR_BY_ID[op].weapon,
					profile: mars,
					onMars
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-3 overflow-x-auto pb-2",
					children: [OPERATORS.map((card) => {
						const on = card.id === op;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setOp(card.id),
							className: `w-64 shrink-0 border p-4 text-left ${on ? card.tone === "cyan" ? "border-cyan bg-surface" : "border-gold bg-surface" : "border-line bg-bg/60"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: `inline-flex items-center gap-2 font-display text-xs tracking-widest ${card.tone === "cyan" ? "text-cyan" : "text-gold"}`,
									children: [
										card.tone === "cyan" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-3.5" }),
										card.faction,
										" · ",
										card.role
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-1 font-display text-3xl leading-none text-fg",
									children: card.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: card.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm leading-relaxed text-fg",
									children: card.blurb
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
									className: "mt-3 space-y-1 text-xs leading-relaxed text-muted",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: card.passiveName }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Q · ", card.activeName] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["F · ", card.ultName] })
									]
								})
							]
						}, card.id);
					}), BLOODLINES.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: `w-64 shrink-0 border border-dashed p-4 ${card.tone === "cyan" ? "border-cyan/70" : "border-gold/70"} bg-bg/40`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: `font-display text-xs tracking-widest ${card.tone === "cyan" ? "text-cyan" : "text-gold"}`,
								children: [card.faction, " bloodline · imprisoned"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 font-display text-3xl leading-none text-fg",
								children: card.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: card.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-fg",
								children: card.blurb
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "mt-3 space-y-1 text-xs leading-relaxed text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: card.passiveName }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Q · ", card.activeName] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["F · ", card.ultName] })
								]
							})
						]
					}, card.id))]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "bg-cyan px-6 py-3 font-display text-xl tracking-widest text-bg",
							onClick: onStart,
							children: "Start"
						}),
						panel === "ops" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "border border-line px-5 py-3 font-display text-lg tracking-widest text-fg",
							onClick: onDossier,
							children: "Dossier"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "border border-line px-5 py-3 font-display text-lg tracking-widest text-fg",
							onClick: onBack,
							children: "Operators"
						}),
						panel === "armory" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "border border-line px-5 py-3 font-display text-lg tracking-widest text-gold",
							onClick: onArmory,
							children: "Armory"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Click the city to seize the mouse. Esc pauses."
						})
					]
				})
			]
		})
	});
}
function Armory({ opWeapon, profile, onMars }) {
	const bench = profile ?? loadMars();
	const preset = bench.loadouts.find((row) => row.slotIndex === bench.activeSlot) ?? bench.loadouts[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border border-line bg-surface p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-display text-xs tracking-widest text-gold",
				children: [
					"Mars bench · ",
					bench.martianCredits,
					" credits"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm leading-relaxed text-muted",
				children: "What leaves the pad is filed here. Pick a preset before the drop. A mod only seats if this operator's gun can hold it."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex gap-2",
				children: [
					1,
					2,
					3
				].map((slot) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onMars(setActiveSlot(bench, slot)),
					className: `border px-3 py-2 font-display text-sm tracking-widest ${bench.activeSlot === slot ? "border-gold text-gold" : "border-line text-muted"}`,
					children: ["Preset ", slot]
				}, slot))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 grid gap-4 md:grid-cols-2",
				children: [
					{
						field: "barrelModId",
						slot: "BARREL",
						label: "Barrel"
					},
					{
						field: "receiverModId",
						slot: "RECEIVER",
						label: "Receiver"
					},
					{
						field: "opticModId",
						slot: "OPTIC",
						label: "Optic"
					},
					{
						field: "magazineModId",
						slot: "MAGAZINE",
						label: "Magazine"
					}
				].map((row) => {
					const options = bench.unlockedBlueprints.filter((id) => ATTACHMENT_BY_ID[id]?.slot === row.slot);
					const chosen = preset[row.field];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-xs tracking-widest text-cyan",
						children: row.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onMars(setPresetMod(bench, row.field, null, opWeapon)),
								className: `border px-2 py-1 font-display text-xs tracking-widest ${chosen ? "border-line text-muted" : "border-gold text-gold"}`,
								children: "Empty"
							}),
							options.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => onMars(setPresetMod(bench, row.field, id, opWeapon)),
								className: `border px-2 py-1 font-display text-xs tracking-widest ${chosen === id ? "border-gold text-gold" : "border-line text-fg"}`,
								children: labelForRegistry(id)
							}, id)),
							options.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "None filed."
							}) : null
						]
					})] }, row.field);
				})
			}),
			bench.stash.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 max-h-28 space-y-1 overflow-y-auto text-xs text-muted",
				children: bench.stash.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
					labelForRegistry(item.itemRegistryId),
					" · ",
					item.quantity,
					" · sector ",
					item.extractedFromSectorId
				] }, item.stashItemUuid))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-xs text-muted",
				children: "Nothing has left Nod yet."
			})
		]
	});
}
function Overlay({ kicker, title, body, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-20 grid place-items-center bg-bg/75 px-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-lg border border-line bg-surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xs tracking-widest text-cyan",
					children: kicker
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 font-display text-5xl leading-none text-fg",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm leading-relaxed text-muted",
					children: body
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 flex flex-wrap gap-3",
					children
				})
			]
		})
	});
}
function Hud({ live, onEngage }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		id: "mte-hud",
		className: live ? "pointer-events-none absolute inset-0" : "hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				id: "mte-vig",
				className: "absolute inset-0 opacity-0"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute top-4 left-4 max-w-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-act",
						className: "font-display text-xs tracking-widest text-gold"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-tac",
						className: "font-display text-xs tracking-widest text-cyan"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "mte-obj",
						className: "font-display text-2xl leading-none text-fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-obj-sub",
						className: "mt-1 text-sm text-muted"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 font-display text-sm tracking-widest text-cyan",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { id: "mte-dist" }),
							" · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { id: "mte-sector" })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute top-4 left-1/2 w-full max-w-md -translate-x-1/2 px-16 text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "transition-opacity",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-speaker",
						className: "font-display text-xs tracking-widest text-gold"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-sub",
						className: "text-sm leading-snug text-fg"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute top-4 right-4 text-right",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-compass",
						className: "font-display text-lg tracking-widest text-fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-kills",
						className: "font-display text-sm tracking-widest text-muted"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-zone",
						className: "mt-1 font-display text-sm tracking-widest text-danger"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-stress",
						className: "font-display text-xs tracking-widest text-muted"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-haul",
						className: "font-display text-xs tracking-widest text-gold"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						id: "mte-map",
						className: "mt-3 ml-auto",
						width: 180,
						height: 180
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 ml-auto h-1 w-32 bg-surface-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							id: "mte-noise",
							className: "h-full bg-cyan",
							style: { width: "0%" }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						id: "mte-noise-label",
						className: "font-display text-xs tracking-widest text-muted",
						children: "Noise"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				id: "mte-feed",
				className: "absolute top-48 right-4 text-right font-display text-xs tracking-widest whitespace-pre text-danger"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				id: "mte-marks",
				className: "absolute inset-0"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				id: "mte-cross",
				className: "absolute top-1/2 left-1/2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "data-arm": "l" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "data-arm": "r" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "data-arm": "u" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "data-arm": "d" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				id: "mte-hit",
				className: "absolute top-1/2 left-1/2 opacity-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { transform: "translate(-14px, -1px) rotate(45deg)" } }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { transform: "translate(4px, -1px) rotate(-45deg)" } })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				id: "mte-prompt",
				className: "absolute top-2/3 left-1/2 -translate-x-1/2 font-display text-lg tracking-widest text-fg opacity-0"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				id: "mte-stability-wrap",
				className: "absolute top-[58%] left-1/2 w-36 -translate-x-1/2",
				style: { display: "none" },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					id: "mte-stability-label",
					className: "text-center font-display text-xs tracking-widest text-cyan",
					children: "Stability"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1 h-px bg-surface-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						id: "mte-stability",
						className: "h-px bg-cyan",
						style: { width: "0%" }
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				id: "mte-solar-wrap",
				className: "absolute top-[36%] right-3 w-44 font-display md:w-72",
				style: { display: "none" },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						id: "mte-coil-head",
						className: "mb-1 flex items-end justify-between border-b border-gold/40 pb-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] tracking-widest text-gold md:text-xs",
							children: "NEFRET_MASS_COIL"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[9px] tracking-widest text-muted",
							children: "KIN_RES"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border border-gold/25 bg-bg/75 p-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-1 flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] tracking-widest text-gold/80",
								children: "SOLAR MASS"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								id: "mte-solar-pct",
								className: "text-[10px] tracking-widest text-gold",
								children: "0.0% MAX"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							id: "mte-coil",
							className: "flex h-4 gap-px bg-bg p-px",
							children: Array.from({ length: 16 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								"data-seg": index,
								className: "h-full flex-1 bg-white/5"
							}, index))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						id: "mte-coil-alert",
						className: "mt-2 overflow-hidden border border-danger",
						style: { display: "none" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "bg-danger px-1 py-1 text-center text-[10px] font-bold tracking-widest text-bg",
							children: "KINETIC HARNESS LOAD CRITICAL"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-bg/90 p-2 text-[10px] tracking-widest text-danger",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "flex justify-between border-b border-danger/30 pb-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "CORE_OVERFLOW" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SYS_WARN_77B" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 leading-snug text-danger/80",
									children: "Seed overheating. Shrapnel absorption is at the limit."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									id: "mte-coil-action",
									className: "mt-2 border border-dashed border-danger px-1 py-1 text-center text-fg"
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				id: "mte-toast",
				className: "absolute bottom-36 left-1/2 -translate-x-1/2 font-display text-sm tracking-widest text-gold opacity-0"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				id: "mte-channel-wrap",
				className: "absolute bottom-28 left-1/2 w-48 -translate-x-1/2 opacity-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1 bg-surface-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						id: "mte-channel",
						className: "h-full bg-gold",
						style: { width: "0%" }
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute bottom-4 left-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xs tracking-widest text-muted",
					children: "Squad"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					id: "mte-squad",
					className: "mt-1 font-display text-sm tracking-widest whitespace-pre text-fg"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute right-4 bottom-4 left-4 md:left-auto md:w-80",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-end justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							id: "mte-weapon",
							className: "font-display text-xl tracking-widest text-fg"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-2xl text-fg",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { id: "mte-mag" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: " / "
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									id: "mte-res",
									className: "text-muted"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-2 bg-surface-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							id: "mte-hp",
							className: "h-full bg-cyan",
							style: { width: "100%" }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 h-1 bg-surface-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							id: "mte-ar",
							className: "h-full bg-gold",
							style: { width: "0%" }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							id: "mte-q",
							className: "border border-cyan px-3 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-xs tracking-widest text-cyan",
									children: "Q"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									id: "mte-qname",
									className: "font-display text-sm text-fg"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									id: "mte-qcd",
									className: "font-display text-xs text-muted"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							id: "mte-f",
							className: "border border-gold px-3 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-xs tracking-widest text-gold",
									children: "F"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									id: "mte-fname",
									className: "font-display text-sm text-fg"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									id: "mte-fcd",
									className: "font-display text-xs text-muted"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "kb-hints mt-2 text-xs text-muted",
						children: "WASD move · Shift sprint · C slide · Ctrl crouch · RMB aim · R reload · E interact · B bloodline · X mass · 1 / 2 weapons"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				id: "mte-lock",
				type: "button",
				className: "pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-4 py-3 font-display text-lg tracking-widest text-fg",
				style: { display: "none" },
				onClick: onEngage,
				children: "Click to engage"
			})
		]
	});
}
function Touch({ engineRef }) {
	const layer = (0, import_react.useRef)(new TouchControllerLayer());
	const timers = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const readoutKey = (0, import_react.useRef)("");
	const [stick, setStick] = (0, import_react.useState)(null);
	const [wheel, setWheel] = (0, import_react.useState)(null);
	const [tune, setTune] = (0, import_react.useState)({
		flick: 15,
		shove: 75,
		look: 1.7,
		disc: 1,
		cone: 8,
		magnet: .25,
		drag: .6
	});
	const [readout, setReadout] = (0, import_react.useState)({
		prompt: "",
		action: null,
		weapons: []
	});
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem("mte-touch-tune-v1");
			if (!raw) return;
			const saved = JSON.parse(raw);
			setTune((prev) => ({
				flick: saved.flick ?? prev.flick,
				shove: saved.shove ?? prev.shove,
				look: saved.look ?? prev.look,
				disc: saved.disc ?? prev.disc,
				cone: saved.cone ?? prev.cone,
				magnet: saved.magnet ?? prev.magnet,
				drag: saved.drag ?? prev.drag
			}));
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		const live = layer.current;
		live.flickVelocityThreshold = tune.flick;
		live.sprintShoveThreshold = tune.shove;
		live.lookSensitivity = tune.look;
		const mission = engineRef.current;
		if (mission) {
			mission.aimAssist.coneDeg = tune.cone;
			mission.aimAssist.adhesion = tune.magnet;
			mission.aimAssist.friction = tune.drag;
		}
		localStorage.setItem("mte-touch-tune-v1", JSON.stringify(tune));
	}, [tune]);
	(0, import_react.useEffect)(() => {
		let frame = 0;
		const tick = () => {
			const live = engineRef.current;
			if (live) {
				const next = live.touchReadout();
				const key = JSON.stringify(next);
				if (key !== readoutKey.current) {
					readoutKey.current = key;
					setReadout(next);
				}
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [engineRef]);
	(0, import_react.useEffect)(() => {
		if (readout.action === "interact") return;
		const live = engineRef.current;
		if (live) live.virtual.interact = false;
	}, [readout.action, engineRef]);
	const apply = (commands) => {
		const live = engineRef.current;
		if (!live) return;
		for (const command of commands) {
			if (command.type === "await-tap") {
				window.setTimeout(() => apply(layer.current.flushDisc(performance.now())), layer.current.discDoubleTapMs());
				continue;
			}
			applyTouchCommand(live.virtual, command, (ms, run) => {
				window.setTimeout(run, ms);
			});
			if (command.type === "move") setStick((prev) => prev ? {
				...prev,
				nx: command.ax,
				ny: command.ay
			} : prev);
			if (command.type === "stop-move") setStick(null);
		}
	};
	const arm = (id) => {
		for (const timer of timers.current.get(id) ?? []) window.clearTimeout(timer);
		timers.current.set(id, [window.setTimeout(() => {
			apply(layer.current.hold(id, performance.now()));
			const label = layer.current.utilityLabel(id);
			if (label) setWheel(label);
		}, layer.current.discHoldDelay())]);
	};
	const drop = (id) => {
		for (const timer of timers.current.get(id) ?? []) window.clearTimeout(timer);
		timers.current.delete(id);
	};
	const start = (zone) => (event) => {
		if (zone !== "MOVEMENT" && zone !== "LOOK_COMBAT") event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		apply(layer.current.begin(event.pointerId, zone, event.clientX, event.clientY, performance.now()));
		if (zone === "MOVEMENT" || zone === "LOOK_COMBAT" || zone === "UTILITY") arm(event.pointerId);
		if (zone === "MOVEMENT") setStick({
			x: event.clientX,
			y: event.clientY,
			nx: 0,
			ny: 0
		});
		if (zone === "UTILITY") setWheel("Q");
	};
	const drag = (event) => {
		apply(layer.current.move(event.pointerId, event.clientX, event.clientY, performance.now(), event.pressure));
		const label = layer.current.utilityLabel(event.pointerId);
		if (label) setWheel(label);
	};
	const finish = (zone) => (event) => {
		drop(event.pointerId);
		apply(layer.current.end(event.pointerId, event.clientX, event.clientY, performance.now()));
		if (zone === "UTILITY") setWheel(null);
		if (zone === "MOVEMENT") setStick(null);
	};
	const setField = (key, value) => setTune((prev) => ({
		...prev,
		[key]: value
	}));
	const actionLabel = readout.prompt.replace(/^HOLD E\s+/, "").replace(/^[EQ]\s+/, "");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "touch-only touch-hud-overlay",
		style: { ["--touch-disc-scale"]: String(tune.disc) },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "touch-zone-interactive zone-left-movement",
				onPointerDown: start("MOVEMENT"),
				onPointerMove: drag,
				onPointerUp: finish("MOVEMENT"),
				onPointerCancel: finish("MOVEMENT")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "touch-zone-interactive zone-right-combat",
				onPointerDown: start("LOOK_COMBAT"),
				onPointerMove: drag,
				onPointerUp: finish("LOOK_COMBAT"),
				onPointerCancel: finish("LOOK_COMBAT")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "gold-disc-utility",
				onPointerDown: start("UTILITY"),
				onPointerMove: drag,
				onPointerUp: finish("UTILITY"),
				onPointerCancel: finish("UTILITY"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "gold-disc-center-node" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "pointer-events-none absolute inset-0 grid place-items-center font-display text-xs tracking-widest text-bg",
					children: wheel ?? "Q"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "touch-fire",
				onPointerDown: start("FIRE"),
				onPointerUp: finish("FIRE"),
				onPointerCancel: finish("FIRE"),
				children: "FIRE"
			}),
			readout.weapons.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "touch-weapons",
				children: readout.weapons.map((weapon, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: weapon.active ? "is-live" : void 0,
					onPointerDown: (event) => {
						event.stopPropagation();
						engineRef.current?.selectWeapon(index);
					},
					children: weapon.name
				}, `${weapon.name}-${index}`))
			}) : null,
			readout.action ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "touch-action",
				onPointerDown: (event) => {
					event.stopPropagation();
					if (readout.action === "ability") apply([{
						type: "pulse",
						key: "ability"
					}]);
					else start("INTERACT")(event);
				},
				onPointerUp: readout.action === "interact" ? finish("INTERACT") : void 0,
				onPointerCancel: readout.action === "interact" ? finish("INTERACT") : void 0,
				children: actionLabel
			}) : null,
			stick ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "dynamic-virtual-stick",
				style: {
					left: stick.x,
					top: stick.y
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "dynamic-virtual-thumb",
					style: {
						marginLeft: stick.nx * 22,
						marginTop: -stick.ny * 22
					}
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				className: "touch-tune",
				onPointerDown: (event) => event.stopPropagation(),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "TUNE" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Flick",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 8,
							max: 80,
							value: tune.flick,
							onChange: (event) => setField("flick", Number(event.target.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tune.flick })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Sprint",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 40,
							max: 120,
							value: tune.shove,
							onChange: (event) => setField("shove", Number(event.target.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tune.shove })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Look",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: .6,
							max: 2.8,
							step: .1,
							value: tune.look,
							onChange: (event) => setField("look", Number(event.target.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tune.look.toFixed(1) })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Disc",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: .7,
							max: 1.4,
							step: .1,
							value: tune.disc,
							onChange: (event) => setField("disc", Number(event.target.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tune.disc.toFixed(1) })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Cone",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 3,
							max: 14,
							value: tune.cone,
							onChange: (event) => setField("cone", Number(event.target.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tune.cone })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Magnet",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 0,
							max: .6,
							step: .05,
							value: tune.magnet,
							onChange: (event) => setField("magnet", Number(event.target.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tune.magnet.toFixed(2) })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
						"Drag",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: .3,
							max: 1,
							step: .05,
							value: tune.drag,
							onChange: (event) => setField("drag", Number(event.target.value))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tune.drag.toFixed(2) })
					] })
				]
			})
		]
	});
}
var SplitComponent = Mission;
//#endregion
export { SplitComponent as component };
