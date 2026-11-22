// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between six screens: title, play, paused, caught, dawn and a clean getaway.
//
// ?seed=N fixes the patrols and the night. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_DAWN, EVENT_HUNT, EVENT_PICKUP_CANVAS, EVENT_PICKUP_VASE, EVENT_TICK, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DECOY, ACTION_PAUSE, ACTION_SMOKE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_DAWN, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

/** The run's state, left on window so a play-test can read the game without guessing. */
window.__game = { world, screen: SCREEN_TITLE };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  window.__game.screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.elapsed);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each lift.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    window.__game.screen = screen;
    announce(`Playing. Lift three canvases and reach the skylight. ${Math.floor(world.state.timeLeft / 60)} minutes of night.`);
  }

  function endGame(nextScreen, message) {
    screen = nextScreen;
    window.__game.screen = screen;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(message);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & (ACTION_SMOKE | ACTION_DECOY | ACTION_CONFIRM)) audio.unlock();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_DAWN || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        window.__game.screen = screen;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        window.__game.screen = screen;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        window.__game.screen = screen;
        announce('Playing.');
      }
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dirX: 0, dirY: 0, sneaking: false, moveTarget: null, smoke: false, decoy: false, audio: null }, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const direction = input.direction();
    const moveTarget = input.takeMoveTarget();
    const mouse = input.mousePosition();
    const frameInput = {
      dirX: direction.x,
      dirY: direction.y,
      sneaking: input.isSneaking(),
      moveTarget,
      smoke: !!(actions & ACTION_SMOKE),
      decoy: !!(actions & ACTION_DECOY),
      decoyX: mouse.x,
      decoyY: mouse.y,
      audio,
    };
    const events = world.step(STEP, frameInput, false);
    if (frameInput.moveTarget === null) input.clearMoveTarget();
    audio.setAlarm(world.state.alarm);
    if (events & EVENT_PICKUP_CANVAS) {
      audio.pickup();
      announce(`Canvas lifted. ${world.state.canvasesTaken} of 3.`);
    }
    if (events & EVENT_PICKUP_VASE) audio.coin();
    if (events & EVENT_HUNT) {
      audio.alert();
      announce('The guards are hunting. Stay out of sight.');
    }
    if (events & EVENT_TICK) audio.tick();
    if (events & EVENT_WIN) {
      audio.win();
      endGame(SCREEN_WIN, `Clean getaway. Score ${world.state.score}.`);
    } else if (events & EVENT_CAUGHT) {
      audio.caught();
      endGame(SCREEN_CAUGHT, `Caught. Score ${world.state.score}.`);
    } else if (events & EVENT_DAWN) {
      endGame(SCREEN_DAWN, `Dawn breaks. Score ${world.state.score}.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      // One-shot actions (smoke, decoy) belong to the first step of the frame only: a slow
      // frame replays the world several times, and a tool must not fire once per replay.
      let pendingActions = actions;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(pendingActions);
        pendingActions = 0;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, performance.now() / 1000);
  }

  // Leaving the tab pauses a running game rather than letting the night run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      window.__game.screen = screen;
      announce('Paused.');
    }
  });

  // A click anywhere starts the game from the title or an end screen, as Space does.
  canvas.addEventListener('mousedown', () => {
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_DAWN || screen === SCREEN_WIN) startGame();
  });

  announce('The Midnight Gallery. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
