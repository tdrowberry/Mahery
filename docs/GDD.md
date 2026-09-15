# Mahery: Game Design Document

## Premise
Mahery, exiled after his father is killed for an act of mercy, bonds with a wild animal and fights his way to a new tribe, then returns to settle things with the chief responsible for it all.

## What We're Copying From Sonny 2
Based on the gameplay footage you recorded:

- Turn based combat. One unit acts per turn. Speed sets turn order.
- Two bars per unit: Health and a special resource (Sonny calls it Focus).
- Skills sit in a branching Ability Tree. Points unlock nodes. Nodes rank up (1 of 4, 2 of 4) for bigger numbers, and the tooltip previews the next rank.
- A separate Combat Action Bar. You drag unlocked skills onto a small number of slots. Unlocking a skill and being able to cast it in battle are two different steps.
- A second party member (Veradux) can swap in as the active fighter while the other sits out.
- Post battle loot screen: compare the drop to your current gear, keep or discard.
- Zones break into stages. Each zone ends in a boss.

The scope section below has a hard recommendation on how much of this to build first.

## Core Loop
Story beat or exploration, then a fight, then XP and loot, then spend points on the skill tree, then the next beat or boss.

## Combat System

**Stats**
- Vitality: raises max Health
- Strength: scales physical damage
- Instinct: scales special effects (buffs, poison, healing) and max Spirit
- Speed: sets turn order and crit/evasion chance

**Resource**
Spirit replaces Sonny's Focus. Skills cost Spirit. Each animal keeps a cheap or free skill in its kit so a player is never fully locked out of acting.

**Draft formulas** (a starting point, not final balance)
- Max Health = 50 + Vitality x 5
- Max Spirit = 20 + Instinct x 3
- Physical skill damage = Strength x skill multiplier
- Special skill damage or heal = Instinct x skill multiplier
- Turn order: highest Speed first, ties broken randomly

**Targeting**
Skills can target enemies, allies, or self. An invalid target shows a message like "target's status does not meet the requirements," the same pattern shown in your footage.

**Party**
Confirmed: the bonded animal fights beside Mahery, not just in dialogue. Structure it like Sonny and Veradux: two units, one active at a time, swap between them mid fight. Keep the companion simple so it doesn't double the build:
- The companion reuses that animal's own Basic Strike and Guard Stance from SKILLS_AND_CLASSES.md. It's the same species as Mahery's bond, so it already has the moves.
- Give it one shared companion move across all 11 animals, something like "Stand Together" (it takes the next hit aimed at Mahery). One move, not eleven, keeps this cheap to build.
- Don't give the companion independent leveling or stats. Derive its Health and damage from Mahery's Vitality and Strength at a fixed ratio. A fully independent companion is a real feature, just not a Phase 1 one.

## Progression System
- Battles grant XP, which levels Mahery up
- Leveling grants Ability Points (unlock and rank skills) and Attribute Points (raise stats)
- A skill must be unlocked in the tree, then equipped to the action bar before it can be used in a fight

## Scope Recommendation
Read this before building anything.

Eleven animals, each with 4 shared skills and 1 unique skill, all ranking up 3 times, plus a branching tree UI, plus 5 or more boss fights, plus a full story, is too much for one build pass. Claude Code will either go shallow across all of it or burn the whole session on plumbing instead of gameplay.

Build in phases instead:
1. One animal (Bear) fully working: skill tree, action bar, the companion swap, one boss fight. Prove the loop is fun before scaling content.
2. Add the other 10 animals as data, reusing the Phase 1 engine. Fast only if skill data lives in one config file instead of being written into each screen.
3. Full story including the branching ending, remaining bosses, equipment, polish.

CLAUDE_CODE_PROMPT.md is already written in these phases. Don't let it (or Claude Code) skip ahead.

## Tech Stack Recommendation
- React, TypeScript, and Vite. Fast to set up, and Claude Code handles this stack well.
- Game data (skills, animals, enemies, story text) as typed JSON or TS objects, kept separate from the UI components. This is what makes Phase 2 fast instead of a rewrite.
- React Context or Zustand for party stats, inventory, and story flags.
- localStorage for saves. No backend, no hosting cost.
- Any static host (GitHub Pages, Vercel, Netlify) when you're ready to share it.

## Art
Claude Code writes code, not illustrated sprites. The physical traits in SKILLS_AND_CLASSES.md won't show up on screen unless real art backs them up. Pick one path before Phase 1 UI work starts:
- Placeholder shapes or colored silhouettes for Phase 1, real art later
- Commission or buy a small sprite pack and adapt it
- Generate art with a separate image tool, then hand the files to Claude Code to wire in

Placeholders are the cheapest way to prove the loop is fun. Don't let art become the reason Phase 1 stalls.

## UI Screens Needed
- Title and save slot select
- Class select (animal choice, first launch only)
- Combat screen: health and spirit bars, battlefield, action bar, target picker
- Skill tree and ability unlock screen
- Inventory and equipment screen
- Post battle loot screen
- Dialogue and story screen
- Branching choice screen for the ending (kill or banish the old chief), each leading to its own short epilogue

## Decided
- The bonded animal fights beside Mahery as a second unit, confirmed above under Party.
- The bond is permanent for the whole game. No bonding again to a different animal on the same save.
- Mahery is around 16, and his personality and appearance shift toward his bonded animal. Full notes in SKILLS_AND_CLASSES.md.

## Open Design Decision
**Single class only, or can a player mix in a second animal's tree later, the way Sonny 2 lets you dual class?**
Default: single class for Phase 1. Save dual classing as a real Phase 3 feature, not a Phase 1 assumption.
