# Mahery

Browser turn-based RPG in the style of Sonny 2. Design docs live in `docs/`.

## Run

Double-click `Start Mahery.bat`. It installs dependencies the first time, starts the dev server, and opens the title screen (save slots live there). Or from a terminal:

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine tests + Chapter 1 balance simulation
npm run build    # production build to dist/
```

## Status

- **Done:** all 11 bonds (4 shared skills + a signature skill each, 3 ranks), chosen in the prologue right after Mahery wakes; companion swap with Stand Together; Sonny 2-style combat screen (HUD bars, battlefield, teammate / wait / 8-slot icon action bar); ability screen (tree, action bar ring, ability pool with drag or click-to-place); Chapter 1 (skulker encounter + Sessik boss); 3 versioned localStorage save slots; SVG stick-figure art (`src/components/Sprite.tsx`).
- **Next (pending approval):** remaining chapters, old chief, branching ending, loot/equipment/inventory, enemy factions.

## Where things live

| Area | Path |
|---|---|
| Types (skill schema, animals, enemies) | `src/data/types.ts` |
| Shared skill numbers (one template for all animals) | `src/data/sharedSkills.ts` |
| Animals (names, flavor, unique skill, voice) | `src/data/animals.ts` |
| Companion move + ratios | `src/data/companion.ts` |
| Enemies, encounters, story, progression | `src/data/enemies.ts`, `encounters.ts`, `story.ts`, `progression.ts` |
| Combat engine (pure, seeded RNG) | `src/engine/combat.ts`, `ai.ts`, `formulas.ts`, `skills.ts` |
| Save format + migration | `src/state/saveFormat.ts` |
| Game store (Zustand) | `src/state/gameStore.ts` |
| Screens | `src/screens/*.tsx` |

## Playtesting from the console

In dev builds the store is exposed as `window.__mahery` (a Zustand hook). Example:

```js
const S = () => window.__mahery.getState();
S().newGame(1, 'bear');
```
