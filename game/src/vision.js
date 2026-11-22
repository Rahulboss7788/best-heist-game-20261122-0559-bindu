// Vision: who can see the thief. A watcher sees the thief when the thief is inside its cone
// and no tall cover and no smoke stands between them. Guards watch with their eyes, cameras
// with a sweeping lens; both fill the same alarm meter.
import { CONE } from './config.js';
import { segmentHitsRect, sightBlockers } from './gallery.js';

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** Is the point (px, py) inside the cone from (ox, oy) facing `angle`? */
export function inCone(ox, oy, angle, range, halfAngle, px, py) {
  const dx = px - ox;
  const dy = py - oy;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return false;
  if (distance < 1) return true;
  return angleDifference(Math.atan2(dy, dx), angle) <= halfAngle;
}

/** Does any tall cover stand between the two points? */
export function sightBlocked(x1, y1, x2, y2) {
  const blockers = sightBlockers();
  for (let index = 0; index < blockers.length; index += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[index])) return true;
  }
  return false;
}

/** Does a smoke cloud hang over the segment between watcher and thief? */
export function smokeBlocked(x1, y1, x2, y2, smokes) {
  for (let index = 0; index < smokes.length; index += 1) {
    const smoke = smokes[index];
    if (segmentHitsRect(x1, y1, x2, y2, {
      x: smoke.x - smoke.radius, y: smoke.y - smoke.radius,
      width: smoke.radius * 2, height: smoke.radius * 2,
    })) return true;
  }
  return false;
}

/** Is the thief standing inside a smoke cloud? A thief in smoke cannot be seen at all. */
export function thiefInSmoke(thief, smokes) {
  for (let index = 0; index < smokes.length; index += 1) {
    const smoke = smokes[index];
    if (Math.hypot(thief.x - smoke.x, thief.y - smoke.y) < smoke.radius) return true;
  }
  return false;
}

/**
 * Work out who sees the thief right now. Returns the strongest sighting: `seen` is true when
 * any guard or camera has the thief in its cone with a clear line, `rate` is how fast the alarm
 * should climb, and `watcher` is the one to blame (a guard object or a camera object).
 */
export function whoSeesThief(state) {
  const thief = state.thief;
  const smokes = state.smokes;
  if (thiefInSmoke(thief, smokes)) return { seen: false, rate: 0, watcher: null, kind: null };

  const rangeShrink = thief.sneaking ? 0.78 : 1;
  let best = { seen: false, rate: 0, watcher: null, kind: null };

  for (let index = 0; index < state.guards.length; index += 1) {
    const guard = state.guards[index];
    const range = CONE.guardRange * rangeShrink;
    if (!inCone(guard.x, guard.y, guard.angle, range, CONE.guardHalfAngle, thief.x, thief.y)) continue;
    if (sightBlocked(guard.x, guard.y, thief.x, thief.y)) continue;
    if (smokeBlocked(guard.x, guard.y, thief.x, thief.y, smokes)) continue;
    const distance = Math.hypot(thief.x - guard.x, thief.y - guard.y);
    const closeness = 1 - (distance / range) * 0.55;
    const rate = CONE.guardRate * closeness * (thief.sneaking ? 0.55 : 1);
    if (rate > best.rate) best = { seen: true, rate, watcher: guard, kind: 'guard' };
  }

  for (let index = 0; index < state.cameras.length; index += 1) {
    const camera = state.cameras[index];
    const range = CONE.cameraRange * rangeShrink;
    if (!inCone(camera.x, camera.y, camera.angle, range, CONE.cameraHalfAngle, thief.x, thief.y)) continue;
    if (sightBlocked(camera.x, camera.y, thief.x, thief.y)) continue;
    if (smokeBlocked(camera.x, camera.y, thief.x, thief.y, smokes)) continue;
    const rate = CONE.cameraRate * (thief.sneaking ? 0.55 : 1);
    if (rate > best.rate) best = { seen: true, rate, watcher: camera, kind: 'camera' };
  }

  return best;
}
