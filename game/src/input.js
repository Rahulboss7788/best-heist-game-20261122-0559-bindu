// Input: keyboard and mouse, read every frame. WASD or arrows move the thief, Shift sneaks,
// 1 drops a smoke pellet, 2 tosses a decoy coin toward the mouse, Space or Enter confirms,
// P or Escape pauses. Clicking the floor sets a walk target the thief follows on its own.
// Every action is consumed once by takeActions(), so a key press never fires twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;
export const ACTION_DECOY = 8;

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0 };
  let moveTarget = null;
  let sneaking = false;

  function scalePoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'Digit1' || event.code === 'KeyQ') {
      actions |= ACTION_SMOKE;
    } else if (event.code === 'Digit2' || event.code === 'KeyE') {
      actions |= ACTION_DECOY;
    } else if (MOVE_KEYS[event.code]) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('mousemove', (event) => {
    mouse = scalePoint(event.clientX, event.clientY);
  });
  canvas.addEventListener('mousedown', (event) => {
    mouse = scalePoint(event.clientX, event.clientY);
    moveTarget = { x: mouse.x, y: mouse.y };
  });

  /** The direction the held keys ask for, normalised; (0, 0) when none are held. */
  function direction() {
    let dx = 0;
    let dy = 0;
    held.forEach((code) => {
      const move = MOVE_KEYS[code];
      if (move) {
        dx += move[0];
        dy += move[1];
      }
    });
    sneaking = held.has('ShiftLeft') || held.has('ShiftRight');
    if (dx === 0 && dy === 0) return { x: 0, y: 0 };
    const length = Math.hypot(dx, dy);
    return { x: dx / length, y: dy / length };
  }

  /** Consume the queued one-shot actions since the last call. */
  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** The walk target, or null; the world clears it when the thief arrives or a key is pressed. */
  function takeMoveTarget() {
    return moveTarget;
  }

  function clearMoveTarget() {
    moveTarget = null;
  }

  function isSneaking() {
    return sneaking;
  }

  function mousePosition() {
    return mouse;
  }

  return { direction, takeActions, takeMoveTarget, clearMoveTarget, isSneaking, mousePosition };
}
