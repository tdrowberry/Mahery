# Prompt for Claude Code

Put this file in the same project folder as GDD.md, STORY_AND_WORLD.md, and SKILLS_AND_CLASSES.md, then start Claude Code in that folder. Paste everything below the line as your first message.

---

I'm building a browser based turn based RPG called Mahery, styled after the Flash game Sonny 2. Before writing any code, read GDD.md, STORY_AND_WORLD.md, and SKILLS_AND_CLASSES.md in this folder. They cover the combat system, the story, and the 11 playable animal classes.

Build this in phases. Confirm each phase works before moving to the next one. Don't jump ahead.

**Phase 1, MVP**
- Set up React, TypeScript, and Vite.
- Build the combat engine: turn order by Speed, Health and Spirit bars, targeting, and the damage and heal formulas from GDD.md.
- Store skill and animal data in one typed data file, not hardcoded into components. Follow the shared skill plus unique skill structure in SKILLS_AND_CLASSES.md.
- Fully implement one animal: Bear. All 4 shared skills and its unique skill, each with 3 ranks.
- Build the Bear companion as a second unit that swaps in with Mahery, following the party rules in GDD.md. Give it Bear's Basic Strike and Guard Stance plus the one shared companion move, nothing more for Phase 1.
- Build the skill unlock screen and an action bar with 4 slots.
- Build one regular enemy encounter and the Chapter 1 boss fight from STORY_AND_WORLD.md.
- Use placeholder shapes or flat colors for character and enemy art. Don't try to generate illustrated sprites, real art comes later.
- Save locally with localStorage, no backend.
- Tell me when Phase 1 is playable start to finish, then stop.

**Phase 2, only after I approve Phase 1**
- Add the remaining 10 animals as data entries in the same structure, reusing the Phase 1 engine.
- Add the class select screen for a new game.

**Phase 3, only after I approve Phase 2**
- Build the remaining story chapters and bosses, including the old chief fight in STORY_AND_WORLD.md.
- Build the branching ending: a choice screen to kill or banish the old chief, each with its own short epilogue text.
- Add loot, equipment, and an inventory screen.
- Add the enemy factions from STORY_AND_WORLD.md.

Ask me before locking in anything expensive to reverse later, like the skill data schema or the save file format.
