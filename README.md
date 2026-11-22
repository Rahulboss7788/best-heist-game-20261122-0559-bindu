[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Rahulboss7788/best-heist-game-20261122-0559-bindu/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Rahulboss7788/best-heist-game-20261122-0559-bindu/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# The Midnight Gallery

A top-down stealth heist game. One thief, one moonlit art gallery, three marked canvases,
and a night guard's rounds closing in.

## The heist

Slip in through the service door, lift the three gold-framed canvases — **Moonlit Harbor**,
**The Gilded Muse** and **Violet Nocturne** — and escape through the skylight before the
night runs out. Guards Rook, Wren and Ash walk their rounds with sweeping amber vision cones,
and two wall cameras sweep red cones across the floor. Tall statues and glass display cases
block sight; benches only block movement. Every canvas trips its silent sensor and raises
the alarm; a full alarm locks the gallery down.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, harder to spot, cones reach less far)
- **Click** — walk to that spot
- **1** — smoke pellet (40 pts): a cloud that hides the thief for a few seconds
- **2** — decoy coin (25 pts): tossed toward the mouse; nearby guards go to look
- **P / Esc** — pause, **Space** — start / try again

Small gold vases around the room are worth 25 points each. The skylight only opens once
all three canvases are lifted. A getaway is scored on loot plus the night left on the clock.

## Play it

No build step, no network, no library: plain static files under `game/`, all sounds
synthesised live with WebAudio.

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `game/index.html` — the page, one canvas and the module entry point
- `game/src/main.js` — boot and the one fixed-step loop
- `game/src/config.js` — every tuning number and colour
- `game/src/gallery.js` — the exhibition wing: walls, cover, canvases, patrols, cameras
- `game/src/vision.js` — vision cones, line of sight, smoke, who sees the thief
- `game/src/world.js` — the rules: movement, alarm, loot, tools, win and loss
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised footsteps, chimes, alarm and getaway music
- `game/src/render.js` — everything painted on the canvas, HUD included
- `game/src/shots.js` — the staged screenshot scenes and their autopilot
- `game/src/random.js` — seeded random, so a seed always replays the same night
- `main.ts` — hands the entry in: copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the vendored make.fun library
- `screenshots/` — three screenshots of the game itself, the first by name is the cover

## License

MIT — see [LICENSE](LICENSE).
