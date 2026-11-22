// The Midnight Gallery's one exhibition wing: its walls, the cover a thief can hide behind,
// the three marked canvases, the skylight exit, the guards' rounds and the cameras' sweeps.
// Everything here is data and small geometry helpers; the rules live in world.js and vision.js.
import { FIELD } from './config.js';

/** The room's inner walls: the thief, the guards and every sight line stay inside this box. */
export const BOUNDS = { x: 28, y: 84, width: 1224, height: 688 };

/** Where the thief slips in through the service door. */
export const ENTRANCE = { x: 96, y: 700 };

/** The skylight the thief escapes through; it only opens once all three canvases are lifted. */
export const SKYLIGHT = { x: 640, y: 132, radius: 46 };

/** The three marked canvases. `taken` is set by the world, never here. */
export const CANVASES = [
  { id: 'harbor', name: 'Moonlit Harbor', x: 292, y: 104, width: 96, height: 62, hue: 205 },
  { id: 'muse', name: 'The Gilded Muse', x: 1180, y: 372, width: 62, height: 96, hue: 42 },
  { id: 'nocturne', name: 'Violet Nocturne', x: 988, y: 104, width: 96, height: 62, hue: 275 },
];

/**
 * Tall cover: statues and glass display cases. It blocks movement and it blocks sight, so a
 * thief behind one is out of a cone entirely.
 */
export const TALL_COVER = [
  { id: 'dancer', kind: 'statue', label: 'The Dancer', x: 565, y: 400, width: 150, height: 110 },
  { id: 'case-nw', kind: 'case', label: 'Porcelain case', x: 300, y: 300, width: 120, height: 70 },
  { id: 'case-ne', kind: 'case', label: 'Porcelain case', x: 860, y: 300, width: 120, height: 70 },
  { id: 'case-sw', kind: 'case', label: 'Porcelain case', x: 300, y: 560, width: 120, height: 70 },
  { id: 'case-se', kind: 'case', label: 'Porcelain case', x: 860, y: 560, width: 120, height: 70 },
];

/**
 * Low cover: marble benches. They block movement but a standing guard sees straight over them,
 * so they are a route, never a hiding place.
 */
export const LOW_COVER = [
  { id: 'bench-n', kind: 'bench', label: 'Bench', x: 565, y: 272, width: 150, height: 26 },
  { id: 'bench-s', kind: 'bench', label: 'Bench', x: 565, y: 640, width: 150, height: 26 },
];

/** Small gold vases tucked near the cover: optional loot worth a few points each. */
export const VASES = [
  { x: 180, y: 200 }, { x: 1100, y: 200 }, { x: 180, y: 640 },
  { x: 1100, y: 640 }, { x: 470, y: 330 }, { x: 810, y: 330 },
];

/** The night guards and the rounds they walk, stop by stop. */
export const GUARDS = [
  {
    id: 'rook', name: 'Rook', start: { x: 220, y: 300 },
    waypoints: [
      { x: 220, y: 300 }, { x: 220, y: 600 }, { x: 430, y: 600 }, { x: 430, y: 300 },
    ],
  },
  {
    id: 'wren', name: 'Wren', start: { x: 850, y: 300 },
    waypoints: [
      { x: 850, y: 300 }, { x: 1060, y: 300 }, { x: 1060, y: 600 }, { x: 850, y: 600 },
    ],
  },
  {
    id: 'ash', name: 'Ash', start: { x: 480, y: 170 },
    waypoints: [
      { x: 480, y: 170 }, { x: 800, y: 170 }, { x: 800, y: 230 }, { x: 480, y: 230 },
    ],
  },
];

/** Wall cameras: a fixed mount, the direction it faces, and how far its sweep turns. */
export const CAMERAS = [
  { id: 'cam-north', x: 640, y: 92, baseAngle: Math.PI / 2, sweep: 0.95, period: 4.2, phase: 0 },
  { id: 'cam-west', x: 36, y: 430, baseAngle: 0, sweep: 0.8, period: 5.1, phase: 1.7 },
];

/** Small unmarked pictures on the walls, for atmosphere only. */
export const WALL_ART = [
  { x: 120, y: 92, width: 54, height: 40, hue: 150 },
  { x: 470, y: 92, width: 54, height: 40, hue: 10 },
  { x: 760, y: 92, width: 54, height: 40, hue: 190 },
  { x: 1140, y: 92, width: 54, height: 40, hue: 320 },
  { x: 36, y: 200, width: 40, height: 54, hue: 260 },
  { x: 36, y: 640, width: 40, height: 54, hue: 90 },
  { x: 1224, y: 200, width: 40, height: 54, hue: 30 },
  { x: 1224, y: 640, width: 40, height: 54, hue: 170 },
];

/** Every rectangle that stops a body moving: tall cover, low cover and the room's walls. */
export function allBlockers() {
  return [...TALL_COVER, ...LOW_COVER];
}

/** Only the tall cover blocks a line of sight. */
export function sightBlockers() {
  return TALL_COVER;
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** Does a circle at (x, y) with this radius touch a rectangle? */
export function circleHitsRect(x, y, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

/** Does the segment from (x1, y1) to (x2, y2) cross a rectangle? */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.width) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.width - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.height) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.height - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** Keep a point inside the room, leaving `margin` from the walls. */
export function clampToRoom(x, y, margin) {
  return {
    x: Math.max(BOUNDS.x + margin, Math.min(BOUNDS.x + BOUNDS.width - margin, x)),
    y: Math.max(BOUNDS.y + margin, Math.min(BOUNDS.y + BOUNDS.height - margin, y)),
  };
}

export { FIELD };
