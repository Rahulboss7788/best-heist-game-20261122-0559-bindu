// Every tuning number and colour for The Midnight Gallery in one place. The playfield is a
// fixed 1280x800 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. The top 56 pixels are the HUD strip; the gallery floor fills the rest.

export const FIELD = { width: 1280, height: 800, hudHeight: 56 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The thief: quick on open floor, slower and harder to spot while sneaking. */
export const THIEF = {
  radius: 13,
  speed: 205,
  sneakSpeed: 115,
  /** While sneaking, vision cones reach this much less far. */
  sneakConeShrink: 0.78,
};

/** Night guards: patrol speed, the speed they close in at, and how long they wait at a stop. */
export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 118,
  pauseSeconds: 1.4,
  /** A guard that gets this close has caught the thief outright. */
  catchRadius: 30,
};

/** A vision cone: how far it reaches, how wide it opens, and how fast it fills the alarm. */
export const CONE = {
  guardRange: 235,
  guardHalfAngle: 0.56,
  cameraRange: 265,
  cameraHalfAngle: 0.46,
  /** Alarm per second while a guard watches the thief (scaled by closeness). */
  guardRate: 52,
  /** Alarm per second while a camera watches the thief. */
  cameraRate: 38,
  /** Alarm drains this fast while nobody can see the thief. */
  decayRate: 13,
  /** At this alarm the guards leave their patrols and hunt the last seen spot. */
  huntAt: 68,
  /** Touching a canvas trips its silent sensor by this much. */
  canvasTrip: 12,
};

/** The night lasts this long; at zero the sun comes up and the heist is over. */
export const NIGHT_SECONDS = 240;

/** Loot values and the price of the thief's tools, all paid in score. */
export const LOOT = {
  canvasPoints: 150,
  vasePoints: 25,
  smokeCost: 40,
  decoyCost: 25,
  winTimeBonusPerSecond: 2,
};

/** Smoke pellet: how long the cloud hangs and how far it hides the thief. */
export const SMOKE = { radius: 95, seconds: 5.5 };

/** Decoy coin: how far its clink carries and how long guards study the spot. */
export const DECOY = { radius: 340, inspectSeconds: 4 };

export const PALETTE = {
  night: '#0a0d1d',
  wall: '#1a2038',
  wallTrim: '#c9a227',
  floorA: '#232a47',
  floorB: '#1d2340',
  floorLine: '#2e3760',
  moonbeam: '#dfe8ff',
  coverStone: '#3a4266',
  coverTop: '#4a5480',
  caseGlass: '#7fa8c9',
  wood: '#6b4a2f',
  woodTop: '#8a6238',
  gold: '#f2c94c',
  goldDim: '#b98a1e',
  canvasGlow: '#ffd76a',
  thief: '#101018',
  thiefCoat: '#232333',
  guard: '#2c4a7a',
  guardCap: '#1d3355',
  camera: '#39415e',
  cameraEye: '#ff4d4d',
  coneGuard: 'rgba(255, 196, 66, 0.26)',
  coneGuardEdge: 'rgba(255, 196, 66, 0.55)',
  coneCamera: 'rgba(255, 77, 77, 0.20)',
  coneCameraEdge: 'rgba(255, 77, 77, 0.5)',
  coneHot: 'rgba(255, 60, 60, 0.42)',
  smoke: 'rgba(190, 200, 220, 0.55)',
  hud: '#12162a',
  hudLine: '#2e3760',
  text: '#eef1f5',
  muted: '#9aa3c0',
  alarmLow: '#58c96b',
  alarmMid: '#f2c94c',
  alarmHigh: '#ff5a4d',
};

/** The one font the game uses: the system stack, so nothing is fetched. */
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best getaway score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-gallery.best';
