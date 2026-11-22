// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from
// a fresh world, steered by an autopilot that reads the same vision cones a player reads, so the
// frame is what a short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SKYLIGHT, allBlockers, circleHitsRect, clampToRoom } from './gallery.js';
import { whoSeesThief } from './vision.js';
import { EVENT_CAUGHT, EVENT_DAWN, EVENT_WIN } from './world.js';
import { SCREEN_CAUGHT, SCREEN_DAWN, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 14;
const PLAY_SECONDS = 34;
const END_LIMIT_SECONDS = 120;
const SAMPLE = 1 / 30;
const LOOKAHEAD = 0.35;

const DIRECTIONS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 0.7071, y: 0.7071 }, { x: -0.7071, y: 0.7071 },
  { x: 0.7071, y: -0.7071 }, { x: -0.7071, y: -0.7071 },
];

/** Where the thief is heading: the nearest canvas still on the wall, else the skylight. */
function currentTarget(state) {
  for (let index = 0; index < state.canvases.length; index += 1) {
    const canvas = state.canvases[index];
    if (!canvas.taken) return { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 };
  }
  return { x: SKYLIGHT.x, y: SKYLIGHT.y };
}

/** The nearest canvas still on the wall (any of them will do for a target). */
function nearestCanvas(state) {
  let best = null;
  let bestDistance = Infinity;
  for (let index = 0; index < state.canvases.length; index += 1) {
    const canvas = state.canvases[index];
    if (canvas.taken) continue;
    const centre = { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 };
    const distance = Math.hypot(centre.x - state.thief.x, centre.y - state.thief.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = centre;
    }
  }
  return best;
}

/** Where the thief would end up after moving in `direction` for `seconds`, sliding off cover. */
function probeMove(state, direction, seconds) {
  const speed = 205;
  let x = state.thief.x;
  let y = state.thief.y;
  const blockers = allBlockers();
  const steps = Math.max(1, Math.round(seconds / SAMPLE));
  for (let index = 0; index < steps; index += 1) {
    const nextX = x + direction.x * speed * SAMPLE;
    let blocked = false;
    for (let b = 0; b < blockers.length; b += 1) {
      if (circleHitsRect(nextX, y, 13, blockers[b])) { blocked = true; break; }
    }
    if (!blocked) x = clampToRoom(nextX, y, 13).x;
    const nextY = y + direction.y * speed * SAMPLE;
    blocked = false;
    for (let b = 0; b < blockers.length; b += 1) {
      if (circleHitsRect(x, nextY, 13, blockers[b])) { blocked = true; break; }
    }
    if (!blocked) y = clampToRoom(x, nextY, 13).y;
  }
  return { x, y };
}

/** Would the thief be seen standing at (x, y) right now, with the guards where they are? */
function seenAt(state, x, y) {
  const probe = {
    thief: { x, y, sneaking: false },
    guards: state.guards,
    cameras: state.cameras,
    smokes: state.smokes,
  };
  return whoSeesThief(probe).seen;
}

/**
 * The careful pilot: of the nine ways to move, the one that gets closest to the target without
 * stepping into a cone. When it has made no progress for a while it slides sideways along the
 * cover instead of pushing straight into it.
 */
function autopilot(state, stuck) {
  const target = state.canvasesTaken === 3
    ? { x: SKYLIGHT.x, y: SKYLIGHT.y }
    : nearestCanvas(state) ?? { x: SKYLIGHT.x, y: SKYLIGHT.y };
  let best = DIRECTIONS[0];
  let bestScore = -Infinity;
  for (let index = 0; index < DIRECTIONS.length; index += 1) {
    const direction = DIRECTIONS[index];
    const landing = probeMove(state, direction, LOOKAHEAD);
    const distance = Math.hypot(target.x - landing.x, target.y - landing.y);
    const danger = seenAt(state, landing.x, landing.y) ? 900 : 0;
    const score = -distance - danger;
    if (score > bestScore) {
      bestScore = score;
      best = direction;
    }
  }
  if (stuck) {
    const dx = target.x - state.thief.x;
    const dy = target.y - state.thief.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: -dy / length, y: dx / length };
  }
  return best;
}

/** The reckless pilot: straight at the target, cones unread — it gets caught, as hurried players do. */
function recklessPilot(state) {
  const target = currentTarget(state);
  const dx = target.x - state.thief.x;
  const dy = target.y - state.thief.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'end') {
    let lastDistance = Infinity;
    let stuckTimer = 0;
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      const target = currentTarget(state);
      const distance = Math.hypot(target.x - state.thief.x, target.y - state.thief.y);
      if (distance < lastDistance - 2) {
        lastDistance = distance;
        stuckTimer = 0;
      } else {
        stuckTimer += STEP;
      }
      const direction = autopilot(state, stuckTimer > 2.5);
      if (stuckTimer > 3.5) stuckTimer = 0;
      world.step(STEP, {
        dirX: direction.x, dirY: direction.y, sneaking: false,
        moveTarget: null, smoke: false, decoy: false, audio: null,
      }, false);
      if (state.phase !== 'play') break;
    }
    return { screen: state.phase === 'play' ? SCREEN_PLAY : SCREEN_CAUGHT, best: 0 };
  }

  if (name === 'play') {
    let lastDistance = Infinity;
    let stuckTimer = 0;
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      // Stop with one canvas still on the wall: the frame should show a heist in progress,
      // the thief mid-room, not the getaway panel.
      if (state.canvasesTaken >= 2) break;
      const target = currentTarget(state);
      const distance = Math.hypot(target.x - state.thief.x, target.y - state.thief.y);
      if (distance < lastDistance - 2) {
        lastDistance = distance;
        stuckTimer = 0;
      } else {
        stuckTimer += STEP;
      }
      const direction = autopilot(state, stuckTimer > 2.5);
      if (stuckTimer > 3.5) stuckTimer = 0;
      world.step(STEP, {
        dirX: direction.x, dirY: direction.y, sneaking: false,
        moveTarget: null, smoke: false, decoy: false, audio: null,
      }, false);
      if (state.phase !== 'play') break;
    }
    if (state.phase === 'won') return { screen: SCREEN_WIN, best: state.score };
    if (state.phase === 'caught') return { screen: SCREEN_CAUGHT, best: state.score };
    if (state.phase === 'dawn') return { screen: SCREEN_DAWN, best: state.score };
    return { screen: SCREEN_PLAY, best: 0 };
  }

  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    const direction = recklessPilot(state);
    const events = world.step(STEP, {
      dirX: direction.x, dirY: direction.y, sneaking: false,
      moveTarget: null, smoke: false, decoy: false, audio: null,
    }, false);
    if (events & (EVENT_CAUGHT | EVENT_WIN | EVENT_DAWN)) break;
  }
  if (state.phase === 'won') return { screen: SCREEN_WIN, best: state.score };
  if (state.phase === 'dawn') return { screen: SCREEN_DAWN, best: state.score };
  return { screen: SCREEN_CAUGHT, best: state.score };
}

export { SCREEN_TITLE };
