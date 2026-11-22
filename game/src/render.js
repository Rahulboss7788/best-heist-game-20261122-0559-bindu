// The renderer: everything the eye sees, painted on one canvas. Moonlit marble, gold-framed
// canvases, amber guard cones and red camera cones, so cover, danger and loot read at a glance.
// It paints only what the world holds; it never changes the rules.
import { CONE, FIELD, FONT, LOOT, PALETTE, SMOKE } from './config.js';
import { BOUNDS, CAMERAS, LOW_COVER, SKYLIGHT, TALL_COVER, WALL_ART } from './gallery.js';
import { whoSeesThief } from './vision.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_DAWN = 'dawn';
export const SCREEN_WIN = 'won';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function text(string, x, y, size, colour, align = 'left', weight = '600') {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = colour;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(string, x, y);
  }

  /** A small framed painting, its sky and hills drawn from its hue. */
  function drawPainting(x, y, width, height, hue, frame) {
    ctx.save();
    ctx.fillStyle = frame;
    ctx.fillRect(x - 4, y - 4, width + 8, height + 8);
    ctx.fillStyle = '#0e1226';
    ctx.fillRect(x, y, width, height);
    const sky = ctx.createLinearGradient(x, y, x, y + height);
    sky.addColorStop(0, `hsl(${hue}, 55%, 42%)`);
    sky.addColorStop(0.6, `hsl(${hue}, 50%, 22%)`);
    sky.addColorStop(1, `hsl(${hue}, 45%, 12%)`);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = 'rgba(240, 244, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x + width * 0.72, y + height * 0.3, Math.min(width, height) * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${hue}, 35%, 8%)`;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.quadraticCurveTo(x + width * 0.4, y + height * 0.45, x + width, y + height * 0.78);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFloor() {
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let ty = 0; ty < 11; ty += 1) {
      for (let tx = 0; tx < 19; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(BOUNDS.x + tx * 64, BOUNDS.y + ty * 64, 64, 64);
      }
    }
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 1;
    for (let index = 0; index <= 19; index += 1) {
      ctx.beginPath();
      ctx.moveTo(BOUNDS.x + index * 64, BOUNDS.y);
      ctx.lineTo(BOUNDS.x + index * 64, BOUNDS.y + BOUNDS.height);
      ctx.stroke();
    }
    for (let index = 0; index <= 11; index += 1) {
      ctx.beginPath();
      ctx.moveTo(BOUNDS.x, BOUNDS.y + index * 64);
      ctx.lineTo(BOUNDS.x + BOUNDS.width, BOUNDS.y + index * 64);
      ctx.stroke();
    }
  }

  function drawMoonbeams(time) {
    const beam = ctx.createRadialGradient(SKYLIGHT.x, SKYLIGHT.y, 10, SKYLIGHT.x, SKYLIGHT.y, 260);
    beam.addColorStop(0, 'rgba(223, 232, 255, 0.30)');
    beam.addColorStop(1, 'rgba(223, 232, 255, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(SKYLIGHT.x - 260, SKYLIGHT.y - 260, 520, 520);
    const shimmer = 0.10 + 0.04 * Math.sin(time * 0.8);
    const windowBeam = ctx.createRadialGradient(150, 770, 10, 150, 770, 220);
    windowBeam.addColorStop(0, `rgba(190, 205, 255, ${shimmer})`);
    windowBeam.addColorStop(1, 'rgba(190, 205, 255, 0)');
    ctx.fillStyle = windowBeam;
    ctx.fillRect(0, 550, 370, 250);
  }

  function drawWalls() {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, FIELD.hudHeight, FIELD.width, BOUNDS.y - FIELD.hudHeight);
    ctx.fillRect(0, BOUNDS.y + BOUNDS.height, FIELD.width, FIELD.height - BOUNDS.y - BOUNDS.height);
    ctx.fillRect(0, BOUNDS.y, BOUNDS.x, BOUNDS.height);
    ctx.fillRect(BOUNDS.x + BOUNDS.width, BOUNDS.y, FIELD.width - BOUNDS.x - BOUNDS.width, BOUNDS.height);
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 3;
    ctx.strokeRect(BOUNDS.x + 1, BOUNDS.y + 1, BOUNDS.width - 2, BOUNDS.height - 2);
    for (let index = 0; index < WALL_ART.length; index += 1) {
      const art = WALL_ART[index];
      drawPainting(art.x, art.y, art.width, art.height, art.hue, '#6b5a2a');
    }
  }

  function drawSkylight(state, time) {
    const open = state.canvasesTaken === 3;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SKYLIGHT.x, SKYLIGHT.y, SKYLIGHT.radius, 0, Math.PI * 2);
    ctx.fillStyle = open ? 'rgba(223, 232, 255, 0.85)' : 'rgba(120, 135, 180, 0.35)';
    ctx.fill();
    ctx.strokeStyle = open ? PALETTE.gold : '#5a6488';
    ctx.lineWidth = open ? 4 + Math.sin(time * 4) * 1.5 : 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(SKYLIGHT.x - 22, SKYLIGHT.y);
    ctx.lineTo(SKYLIGHT.x + 22, SKYLIGHT.y);
    ctx.moveTo(SKYLIGHT.x, SKYLIGHT.y - 22);
    ctx.lineTo(SKYLIGHT.x, SKYLIGHT.y + 22);
    ctx.strokeStyle = open ? '#2a3355' : '#3a4266';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(open ? 'EXIT — GO!' : `SKYLIGHT · ${3 - state.canvasesTaken} LEFT`, SKYLIGHT.x, SKYLIGHT.y + SKYLIGHT.radius + 16, 13, open ? PALETTE.gold : PALETTE.muted, 'center');
    ctx.restore();
  }

  function drawCanvases(state, time) {
    for (let index = 0; index < state.canvases.length; index += 1) {
      const canvas = state.canvases[index];
      if (canvas.taken) continue;
      const pulse = 0.55 + 0.35 * Math.sin(time * 3 + index * 1.4);
      ctx.save();
      ctx.shadowColor = PALETTE.canvasGlow;
      ctx.shadowBlur = 18 * pulse;
      drawPainting(canvas.x, canvas.y, canvas.width, canvas.height, canvas.hue, PALETTE.gold);
      ctx.restore();
      const markerY = canvas.y - 16 + Math.sin(time * 2 + index) * 3;
      ctx.fillStyle = `rgba(242, 201, 76, ${pulse})`;
      ctx.beginPath();
      ctx.moveTo(canvas.x + canvas.width / 2, markerY - 7);
      ctx.lineTo(canvas.x + canvas.width / 2 + 7, markerY + 4);
      ctx.lineTo(canvas.x + canvas.width / 2 - 7, markerY + 4);
      ctx.closePath();
      ctx.fill();
      text('LOOT', canvas.x + canvas.width / 2, canvas.y + canvas.height + 16, 11, PALETTE.gold, 'center', '700');
    }
  }

  function drawCover() {
    for (let index = 0; index < TALL_COVER.length; index += 1) {
      const cover = TALL_COVER[index];
      ctx.fillStyle = PALETTE.coverStone;
      ctx.fillRect(cover.x, cover.y, cover.width, cover.height);
      ctx.fillStyle = PALETTE.coverTop;
      ctx.fillRect(cover.x + 4, cover.y + 4, cover.width - 8, cover.height - 8);
      ctx.strokeStyle = '#5a6488';
      ctx.lineWidth = 2;
      ctx.strokeRect(cover.x + 4, cover.y + 4, cover.width - 8, cover.height - 8);
      if (cover.kind === 'statue') {
        const cx = cover.x + cover.width / 2;
        const cy = cover.y + cover.height / 2;
        ctx.fillStyle = '#c8cede';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 6, 15, 32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy - 44, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c8cede';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + 10, cy - 26);
        ctx.lineTo(cx + 30, cy - 52);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 26);
        ctx.lineTo(cx - 28, cy - 8);
        ctx.stroke();
        text('THE DANCER', cx, cover.y + cover.height - 12, 11, '#c8cede', 'center');
      } else {
        ctx.fillStyle = 'rgba(127, 168, 201, 0.35)';
        ctx.fillRect(cover.x + 10, cover.y + 10, cover.width - 20, cover.height - 20);
        ctx.strokeStyle = 'rgba(200, 220, 240, 0.6)';
        ctx.beginPath();
        ctx.moveTo(cover.x + 10, cover.y + cover.height - 10);
        ctx.lineTo(cover.x + cover.width - 10, cover.y + 10);
        ctx.stroke();
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(cover.x + cover.width / 2, cover.y + cover.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let index = 0; index < LOW_COVER.length; index += 1) {
      const bench = LOW_COVER[index];
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(bench.x, bench.y, bench.width, bench.height);
      ctx.fillStyle = PALETTE.woodTop;
      ctx.fillRect(bench.x + 3, bench.y + 3, bench.width - 6, bench.height - 6);
    }
  }

  function drawVases(state) {
    for (let index = 0; index < state.vases.length; index += 1) {
      const vase = state.vases[index];
      if (vase.taken) continue;
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.ellipse(vase.x, vase.y, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.ellipse(vase.x - 2, vase.y - 3, 2.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCone(x, y, angle, range, halfAngle, fill, edge) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
    ctx.stroke();
  }

  function drawCones(state, sighting) {
    for (let index = 0; index < state.guards.length; index += 1) {
      const guard = state.guards[index];
      const hot = sighting.seen && sighting.kind === 'guard' && sighting.watcher === guard;
      drawCone(guard.x, guard.y, guard.angle, 235, 0.56,
        hot ? PALETTE.coneHot : PALETTE.coneGuard,
        hot ? 'rgba(255, 60, 60, 0.8)' : PALETTE.coneGuardEdge);
    }
    for (let index = 0; index < state.cameras.length; index += 1) {
      const camera = state.cameras[index];
      const hot = sighting.seen && sighting.kind === 'camera' && sighting.watcher === camera;
      drawCone(camera.x, camera.y, camera.angle, 265, 0.46,
        hot ? PALETTE.coneHot : PALETTE.coneCamera,
        hot ? 'rgba(255, 60, 60, 0.8)' : PALETTE.coneCameraEdge);
    }
  }

  function drawGuards(state) {
    for (let index = 0; index < state.guards.length; index += 1) {
      const guard = state.guards[index];
      ctx.fillStyle = guard.mode === 'investigate' ? '#ff5a4d' : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dfe8ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = PALETTE.guardCap;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.angle) * 8, guard.y + Math.sin(guard.angle) * 8, 3, 0, Math.PI * 2);
      ctx.fill();
      if (guard.mode === 'investigate') {
        text('!', guard.x, guard.y - 24, 18, '#ff5a4d', 'center', '800');
      }
    }
  }

  function drawCameras(state) {
    for (let index = 0; index < state.cameras.length; index += 1) {
      const camera = state.cameras[index];
      ctx.fillStyle = PALETTE.camera;
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.cameraEye;
      ctx.beginPath();
      ctx.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawThief(state, time) {
    const thief = state.thief;
    const bob = Math.sin(time * 8) * 1.5;
    ctx.save();
    ctx.translate(thief.x, thief.y + bob);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 12 - bob, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#33334d';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.ellipse(0, -3, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -7, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(Math.cos(thief.angle) * 8, Math.sin(thief.angle) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (thief.sneaking) {
      ctx.strokeStyle = 'rgba(238, 241, 245, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawSmoke(state) {
    for (let index = 0; index < state.smokes.length; index += 1) {
      const smoke = state.smokes[index];
      ctx.fillStyle = PALETTE.smoke;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, smoke.radius * (0.7 + 0.3 * (smoke.ttl / SMOKE.seconds)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDecoys(state, time) {
    for (let index = 0; index < state.decoys.length; index += 1) {
      const decoy = state.decoys[index];
      ctx.strokeStyle = `rgba(242, 201, 76, ${0.4 + 0.4 * Math.sin(time * 6)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(decoy.x, decoy.y, 14 + 6 * Math.sin(time * 6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(decoy.x, decoy.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** The top strip: title, alarm meter, loot, score, tools and the night clock. */
  function drawHud(state) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
    ctx.fillStyle = PALETTE.hudLine;
    ctx.fillRect(0, FIELD.hudHeight - 2, FIELD.width, 2);

    text('THE MIDNIGHT GALLERY', 20, 20, 19, PALETTE.gold, 'left', '800');
    text('lift 3 marked canvases · slip out through the skylight', 20, 42, 12, PALETTE.muted, 'left', '400');

    const meterX = 470;
    const meterWidth = 300;
    text('ALARM', meterX - 8, 28, 13, PALETTE.text, 'right', '700');
    ctx.fillStyle = '#0a0d1d';
    ctx.fillRect(meterX, 18, meterWidth, 20);
    const alarm = state.alarm;
    const alarmColour = alarm < 40 ? PALETTE.alarmLow : alarm < 70 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    ctx.fillStyle = alarmColour;
    ctx.fillRect(meterX + 2, 20, Math.max(0, (meterWidth - 4) * (alarm / 100)), 16);
    ctx.strokeStyle = '#5a6488';
    ctx.lineWidth = 1;
    ctx.strokeRect(meterX, 18, meterWidth, 20);
    text(`${Math.round(alarm)}%`, meterX + meterWidth + 10, 28, 14, alarmColour, 'left', '700');

    const rightX = FIELD.width - 20;
    text(`◆ ${state.canvasesTaken}/3`, rightX - 330, 20, 16, PALETTE.gold, 'left', '700');
    text(`SCORE ${state.score}`, rightX - 230, 20, 16, PALETTE.text, 'left', '700');
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const clockColour = state.timeLeft <= 30 ? PALETTE.alarmHigh : PALETTE.text;
    text(`NIGHT ${minutes}:${String(seconds).padStart(2, '0')}`, rightX - 110, 20, 16, clockColour, 'left', '700');
    text(`1 Smoke ${LOOT.smokeCost} · 2 Decoy ${LOOT.decoyCost}`, rightX, 42, 12, PALETTE.muted, 'right', '400');
    text('WASD move · Shift sneak · Click to walk · P pause', meterX, 46, 11, PALETTE.muted, 'left', '400');
  }

  function drawBanner(message, colour, time) {
    const alpha = 0.65 + 0.35 * Math.sin(time * 6);
    ctx.font = `800 17px ${FONT}`;
    const width = ctx.measureText(message).width + 60;
    ctx.fillStyle = `rgba(10, 13, 29, ${0.85 * alpha})`;
    ctx.fillRect((FIELD.width - width) / 2, FIELD.hudHeight + 14, width, 34);
    text(message, FIELD.width / 2, FIELD.hudHeight + 32, 17, colour, 'center', '800');
  }

  function overlay(alpha) {
    ctx.fillStyle = `rgba(8, 10, 22, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function panel(x, y, width, height) {
    ctx.fillStyle = 'rgba(18, 22, 42, 0.94)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }

  function drawTitle(state, best) {
    overlay(0.62);
    panel(290, 120, 700, 470);
    text('THE MIDNIGHT GALLERY', 640, 185, 44, PALETTE.gold, 'center', '800');
    text('an art-gallery heist under moonlight', 640, 225, 18, PALETTE.text, 'center', '400');
    text('Lift the three gold-framed canvases, then slip out', 640, 285, 16, PALETTE.text, 'center');
    text('through the skylight before the night guard\'s rounds close in.', 640, 310, 16, PALETTE.text, 'center');
    text('WASD / arrows — move      Shift — sneak (harder to spot)', 640, 360, 15, PALETTE.muted, 'center', '400');
    text('Click — walk there      1 — smoke pellet (40 pts)      2 — decoy coin (25 pts)', 640, 386, 15, PALETTE.muted, 'center', '400');
    text('Amber cone — a guard is watching      Red cone — a camera is watching', 640, 412, 15, PALETTE.muted, 'center', '400');
    text('Stone and glass block sight. Benches do not. A full alarm ends the night.', 640, 438, 15, PALETTE.muted, 'center', '400');
    text('PRESS SPACE OR CLICK TO BEGIN', 640, 505, 19, PALETTE.gold, 'center', '800');
    if (best > 0) text(`Best getaway: ${best}`, 640, 545, 15, PALETTE.muted, 'center', '400');
  }

  function drawEnd(title, lines, colour, best) {
    overlay(0.66);
    panel(340, 190, 600, 330);
    text(title, 640, 255, 40, colour, 'center', '800');
    lines.forEach((line, index) => {
      text(line.text, 640, 310 + index * 30, line.size || 16, line.colour || PALETTE.text, 'center', line.weight || '400');
    });
    if (best > 0) text(`Best getaway: ${best}`, 640, 480, 15, PALETTE.muted, 'center', '400');
    text('PRESS SPACE OR CLICK TO TRY AGAIN', 640, 515, 15, PALETTE.gold, 'center', '700');
  }

  /**
   * Paint the world on the given screen. `time` is the wall-clock seconds for pulses; `best`
   * is the saved best score shown on the title and end screens.
   */
  function draw(state, screen, best, time) {
    const sighting = whoSeesThief(state);
    drawFloor();
    drawMoonbeams(time);
    drawWalls();
    drawSkylight(state, time);
    drawCanvases(state, time);
    drawCover();
    drawVases(state);
    drawDecoys(state, time);
    drawSmoke(state);
    drawCones(state, sighting);
    drawGuards(state);
    drawCameras(state);
    if (screen !== SCREEN_TITLE) drawThief(state, time);
    drawHud(state);

    if (screen === SCREEN_PLAY) {
      if (sighting.seen) drawBanner('SPOTTED — BREAK THE LINE OF SIGHT!', '#ff5a4d', time);
      else if (state.hunting) drawBanner('THE GUARDS ARE HUNTING — STAY OUT OF SIGHT', PALETTE.alarmMid, time);
      else if (state.canvasesTaken === 3) drawBanner('ALL THREE LIFTED — REACH THE SKYLIGHT!', PALETTE.gold, time);
      else if (state.canvasesTaken === 0 && state.elapsed < 6) {
        text('Lift the three gold-framed canvases — watch the cones before you move.', FIELD.width / 2, FIELD.height - 24, 15, PALETTE.text, 'center', '400');
      }
    } else if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
    } else if (screen === SCREEN_PAUSED) {
      overlay(0.55);
      panel(440, 300, 400, 130);
      text('PAUSED', 640, 340, 32, PALETTE.text, 'center', '800');
      text('Press P or Space to carry on.', 640, 385, 15, PALETTE.muted, 'center', '400');
    } else if (screen === SCREEN_CAUGHT) {
      drawEnd('CAUGHT!', [
        { text: 'The gallery locks down and the night is over.', size: 16 },
        { text: `Canvases lifted: ${state.canvasesTaken} of 3`, size: 16 },
        { text: `Score: ${state.score}`, size: 18, colour: PALETTE.gold, weight: '700' },
      ], '#ff5a4d', best);
    } else if (screen === SCREEN_DAWN) {
      drawEnd('DAWN BREAKS', [
        { text: 'The sun comes up over the gallery. The heist is over.', size: 16 },
        { text: `Canvases lifted: ${state.canvasesTaken} of 3`, size: 16 },
        { text: `Score: ${state.score}`, size: 18, colour: PALETTE.gold, weight: '700' },
      ], '#9db4ff', best);
    } else if (screen === SCREEN_WIN) {
      drawEnd('CLEAN GETAWAY', [
        { text: 'Three canvases, one skylight, no alarms left ringing.', size: 16 },
        { text: 'The moon keeps your secret.', size: 16 },
        { text: `Score: ${state.score}`, size: 20, colour: PALETTE.gold, weight: '800' },
      ], PALETTE.gold, best);
    }
  }

  return { draw };
}
