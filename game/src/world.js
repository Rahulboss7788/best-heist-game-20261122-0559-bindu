// The world: the thief, the guards, the cameras, the alarm, the loot and the night itself.
// One fixed step advances everything; the renderer only paints what this module holds.
import { CONE, DECOY, FIELD, GUARD, LOOT, NIGHT_SECONDS, SMOKE, STEP, THIEF } from './config.js';
import {
  BOUNDS, CAMERAS, CANVASES, ENTRANCE, GUARDS, SKYLIGHT, VASES,
  allBlockers, circleHitsRect, clampToRoom,
} from './gallery.js';
import { angleDifference, whoSeesThief } from './vision.js';

export const EVENT_PICKUP_CANVAS = 1;
export const EVENT_PICKUP_VASE = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_DAWN = 16;
export const EVENT_HUNT = 32;
export const EVENT_TOOL = 64;
export const EVENT_TICK = 128;

const TWO_PI = Math.PI * 2;

/** Move a circle, sliding along walls and cover: x first, then y, each blocked separately. */
function moveCircle(body, dx, dy, radius) {
  const blockers = allBlockers();
  let nextX = body.x + dx;
  let blocked = false;
  for (let index = 0; index < blockers.length; index += 1) {
    if (circleHitsRect(nextX, body.y, radius, blockers[index])) { blocked = true; break; }
  }
  if (!blocked) {
    const clamped = clampToRoom(nextX, body.y, radius);
    body.x = clamped.x;
  }
  let nextY = body.y + dy;
  blocked = false;
  for (let index = 0; index < blockers.length; index += 1) {
    if (circleHitsRect(body.x, nextY, radius, blockers[index])) { blocked = true; break; }
  }
  if (!blocked) {
    const clamped = clampToRoom(body.x, nextY, radius);
    body.y = clamped.y;
  }
}

/** A fresh guard on its first waypoint, facing along its round. */
function makeGuard(definition) {
  const first = definition.waypoints[0];
  const second = definition.waypoints[1];
  return {
    id: definition.id,
    name: definition.name,
    x: definition.start.x,
    y: definition.start.y,
    angle: Math.atan2(second.y - first.y, second.x - first.x),
    waypoints: definition.waypoints,
    waypointIndex: 1,
    pauseTimer: 0,
    mode: 'patrol',
    target: null,
    hunting: false,
  };
}

/** A fresh camera, mid-sweep. */
function makeCamera(definition) {
  return {
    id: definition.id,
    x: definition.x,
    y: definition.y,
    baseAngle: definition.baseAngle,
    sweep: definition.sweep,
    period: definition.period,
    phase: definition.phase,
    angle: definition.baseAngle,
    time: definition.phase,
  };
}

export function createWorld(random) {
  const state = {
    thief: { x: ENTRANCE.x, y: ENTRANCE.y, angle: -Math.PI / 2, sneaking: false },
    guards: [],
    cameras: [],
    canvases: [],
    vases: [],
    smokes: [],
    decoys: [],
    alarm: 0,
    score: 0,
    timeLeft: NIGHT_SECONDS,
    canvasesTaken: 0,
    phase: 'play',
    lastSeen: null,
    hunting: false,
    elapsed: 0,
    stepCount: 0,
    distanceWalked: 0,
    lastTickSecond: -1,
  };

  function reset() {
    state.thief = { x: ENTRANCE.x, y: ENTRANCE.y, angle: -Math.PI / 2, sneaking: false };
    state.guards = GUARDS.map(makeGuard);
    state.cameras = CAMERAS.map(makeCamera);
    state.canvases = CANVASES.map((canvas) => ({ ...canvas, taken: false }));
    state.vases = VASES.map((vase) => ({ ...vase, taken: false }));
    state.smokes = [];
    state.decoys = [];
    state.alarm = 0;
    state.score = 0;
    state.timeLeft = NIGHT_SECONDS;
    state.canvasesTaken = 0;
    state.phase = 'play';
    state.lastSeen = null;
    state.hunting = false;
    state.elapsed = 0;
    state.stepCount = 0;
    state.distanceWalked = 0;
    state.lastTickSecond = -1;
  }

  reset();

  /** Move one guard a step: patrol its round, or close in on what it is hunting. */
  function stepGuard(guard, dt) {
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      return;
    }
    let target;
    let speed = GUARD.patrolSpeed;
    if (guard.mode === 'investigate' && guard.target) {
      target = guard.target;
      speed = GUARD.chaseSpeed;
    } else {
      target = guard.waypoints[guard.waypointIndex];
    }
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      if (guard.mode === 'investigate') {
        guard.mode = 'patrol';
        guard.target = null;
        guard.waypointIndex = nearestWaypoint(guard);
        guard.pauseTimer = GUARD.pauseSeconds;
      } else {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = GUARD.pauseSeconds;
      }
      return;
    }
    const stepDistance = Math.min(distance, speed * dt);
    const moveX = (dx / distance) * stepDistance;
    const moveY = (dy / distance) * stepDistance;
    guard.angle = Math.atan2(dy, dx);
    moveCircle(guard, moveX, moveY, GUARD.radius);
  }

  /** The waypoint a guard resumes from after an investigation ends. */
  function nearestWaypoint(guard) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < guard.waypoints.length; index += 1) {
      const waypoint = guard.waypoints[index];
      const distance = Math.hypot(waypoint.x - guard.x, waypoint.y - guard.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  function stepCamera(camera, dt) {
    camera.time += dt;
    camera.angle = camera.baseAngle + camera.sweep * Math.sin((TWO_PI * camera.time) / camera.period);
  }

  /** Drop a smoke pellet at the thief's feet, if the score covers it. */
  function useSmoke() {
    if (state.score < LOOT.smokeCost) return false;
    state.score -= LOOT.smokeCost;
    state.smokes.push({ x: state.thief.x, y: state.thief.y, radius: SMOKE.radius, ttl: SMOKE.seconds });
    return true;
  }

  /** Toss a decoy coin toward (x, y); nearby guards leave their rounds to look. */
  function useDecoy(x, y) {
    if (state.score < LOOT.decoyCost) return false;
    state.score -= LOOT.decoyCost;
    const clamped = clampToRoom(x, y, 4);
    state.decoys.push({ x: clamped.x, y: clamped.y, ttl: DECOY.inspectSeconds });
    for (let index = 0; index < state.guards.length; index += 1) {
      const guard = state.guards[index];
      if (Math.hypot(guard.x - clamped.x, guard.y - clamped.y) < DECOY.radius) {
        guard.mode = 'investigate';
        guard.target = { x: clamped.x, y: clamped.y };
        guard.pauseTimer = 0;
      }
    }
    return true;
  }

  /**
   * Advance the world one fixed step. `input` carries the frame's movement, tools and audio:
   * { dirX, dirY, sneaking, moveTarget, smoke, decoy, decoyX, decoyY, audio }.
   * In attract mode the guards and cameras walk their rounds behind the title screen and
   * nothing else changes. Returns the events that happened, as a bitmask.
   */
  function step(dt, input, attract) {
    state.stepCount += 1;
    state.elapsed += dt;
    let events = 0;

    for (let index = 0; index < state.guards.length; index += 1) stepGuard(state.guards[index], dt);
    for (let index = 0; index < state.cameras.length; index += 1) stepCamera(state.cameras[index], dt);

    for (let index = state.smokes.length - 1; index >= 0; index -= 1) {
      state.smokes[index].ttl -= dt;
      if (state.smokes[index].ttl <= 0) state.smokes.splice(index, 1);
    }
    for (let index = state.decoys.length - 1; index >= 0; index -= 1) {
      state.decoys[index].ttl -= dt;
      if (state.decoys[index].ttl <= 0) state.decoys.splice(index, 1);
    }

    if (attract || state.phase !== 'play') return events;

    // The night runs out: at dawn the heist is over.
    state.timeLeft -= dt;
    const wholeSecond = Math.ceil(state.timeLeft);
    if (state.timeLeft <= 10 && wholeSecond !== state.lastTickSecond) {
      state.lastTickSecond = wholeSecond;
      events |= EVENT_TICK;
    }
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.phase = 'dawn';
      return events | EVENT_DAWN;
    }

    const thief = state.thief;
    thief.sneaking = !!input.sneaking;

    // Keyboard first; a click target walks the thief when no key is held.
    let dirX = input.dirX || 0;
    let dirY = input.dirY || 0;
    if (dirX === 0 && dirY === 0 && input.moveTarget) {
      const dx = input.moveTarget.x - thief.x;
      const dy = input.moveTarget.y - thief.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 12) {
        dirX = dx / distance;
        dirY = dy / distance;
      } else {
        input.moveTarget = null;
      }
    }
    if (dirX !== 0 || dirY !== 0) {
      const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.speed;
      const beforeX = thief.x;
      const beforeY = thief.y;
      moveCircle(thief, dirX * speed * dt, dirY * speed * dt, THIEF.radius);
      thief.angle = Math.atan2(dirY, dirX);
      state.distanceWalked += Math.hypot(thief.x - beforeX, thief.y - beforeY);
      if (input.audio && state.distanceWalked > 30) {
        state.distanceWalked = 0;
        input.audio.step();
      }
    }

    if (input.smoke && useSmoke()) events |= EVENT_TOOL;
    if (input.decoy && useDecoy(input.decoyX, input.decoyY)) events |= EVENT_TOOL;

    // Loot: a canvas lifts on touch and trips its silent sensor; a vase pockets quietly.
    for (let index = 0; index < state.canvases.length; index += 1) {
      const canvas = state.canvases[index];
      if (canvas.taken) continue;
      const centreX = canvas.x + canvas.width / 2;
      const centreY = canvas.y + canvas.height / 2;
      if (Math.hypot(thief.x - centreX, thief.y - centreY) < 42) {
        canvas.taken = true;
        state.canvasesTaken += 1;
        state.score += LOOT.canvasPoints;
        state.alarm = Math.min(100, state.alarm + CONE.canvasTrip);
        events |= EVENT_PICKUP_CANVAS;
      }
    }
    for (let index = 0; index < state.vases.length; index += 1) {
      const vase = state.vases[index];
      if (vase.taken) continue;
      if (Math.hypot(thief.x - vase.x, thief.y - vase.y) < 30) {
        vase.taken = true;
        state.score += LOOT.vasePoints;
        events |= EVENT_PICKUP_VASE;
      }
    }

    // The skylight opens once all three canvases are lifted.
    if (state.canvasesTaken === CANVASES.length) {
      if (Math.hypot(thief.x - SKYLIGHT.x, thief.y - SKYLIGHT.y) < SKYLIGHT.radius + 12) {
        state.phase = 'won';
        state.score += Math.ceil(state.timeLeft) * LOOT.winTimeBonusPerSecond;
        return events | EVENT_WIN;
      }
    }

    // Vision: the alarm climbs while anyone watches, and drains while the thief is hidden.
    const sighting = whoSeesThief(state);
    if (sighting.seen) {
      state.alarm = Math.min(100, state.alarm + sighting.rate * dt);
      state.lastSeen = { x: thief.x, y: thief.y };
      if (sighting.kind === 'guard' && sighting.watcher) {
        sighting.watcher.mode = 'investigate';
        sighting.watcher.target = { x: thief.x, y: thief.y };
        sighting.watcher.pauseTimer = 0;
      }
    } else {
      state.alarm = Math.max(0, state.alarm - CONE.decayRate * dt);
    }

    // At high alarm every guard leaves its round and hunts the last seen spot.
    if (state.alarm >= CONE.huntAt && !state.hunting) {
      state.hunting = true;
      events |= EVENT_HUNT;
      for (let index = 0; index < state.guards.length; index += 1) {
        const guard = state.guards[index];
        if (state.lastSeen) {
          guard.mode = 'investigate';
          guard.target = { ...state.lastSeen };
          guard.pauseTimer = 0;
        }
      }
    } else if (state.alarm < CONE.huntAt - 15) {
      state.hunting = false;
    }

    // A guard that walks into the thief catches them outright.
    for (let index = 0; index < state.guards.length; index += 1) {
      const guard = state.guards[index];
      if (Math.hypot(thief.x - guard.x, thief.y - guard.y) < GUARD.catchRadius) {
        state.phase = 'caught';
        return events | EVENT_CAUGHT;
      }
    }

    // An alarm at full means the gallery locks down and the thief is caught.
    if (state.alarm >= 100) {
      state.phase = 'caught';
      return events | EVENT_CAUGHT;
    }

    return events;
  }

  return { state, reset, step };
}

export { FIELD, STEP };
