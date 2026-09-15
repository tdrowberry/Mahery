import { describe, expect, it } from 'vitest';
import { ANIMAL_ORDER, getAnimal } from '../../data/animals';
import { getEncounter } from '../../data/encounters';
import { getEnemy } from '../../data/enemies';
import { createNewSave } from '../../state/saveFormat';
import { getAnimalSkills } from '../skills';
import { advance, checkSkillUsable, createBattle, hasStatus, playerUseSkill, type BattleState } from '../combat';

// Every bond should be able to clear stage 1 with its starting kit and a generic policy.
// This catches a signature skill that is broken or a stat spread that cannot fight. Mahery is
// always the directed unit; the companion fights automatically via the default ally stance.

function policy(s: BattleState, animalId: string): BattleState {
  const u = s.units.mahery;
  const alive = s.enemyIds.filter((id) => s.units[id].health > 0).sort((a, b) => s.units[a].health - s.units[b].health);
  const usable = (id: string) => { const k = u.skills.find((x) => x && x.id === id); return k && !checkSkillUsable(s, u.id, k); };
  const hp = u.health / u.maxHealth;
  const id = (k: string) => `${animalId}.${k}`;
  if (hp < 0.4 && usable(id('secondWind'))) return playerUseSkill(s, id('secondWind'));
  if (hp < 0.7 && usable(id('guardStance')) && !hasStatus(u, 'guard')) return playerUseSkill(s, id('guardStance'));
  const uniqueSkill = u.skills.find((x) => x && x.id === id('unique'));
  const buffed = hasStatus(u, 'strengthUp') || hasStatus(u, 'resolve');
  // don't stack self-buffs: a self-targeted signature or Surge waits until the current buff fades
  if (usable(id('unique')) && !u.pending && !(uniqueSkill?.target === 'self' && buffed)) return playerUseSkill(s, id('unique'), alive[0]);
  if (usable(id('instinctSurge')) && !buffed) return playerUseSkill(s, id('instinctSurge'));
  return playerUseSkill(s, id('basicStrike'), alive[0]);
}

function winRate(animalId: (typeof ANIMAL_ORDER)[number], n = 60) {
  const animal = getAnimal(animalId);
  const skills = getAnimalSkills(animal);
  const save = createNewSave(animalId);
  // level 2 kit: everything at rank 1, unique included
  const ranks = Object.fromEntries(skills.map((k) => [k.id, 1]));
  const enc = getEncounter('ch1-s1');
  let wins = 0; let rounds = 0;
  for (let seed = 1; seed <= n; seed++) {
    let s = createBattle({
      encounterId: enc.id, animal, seed: seed * 104729,
      mahery: { attributes: save.mahery.attributes, skillRanks: ranks, actionBar: skills.map((k) => k.id) },
      enemies: enc.enemyIds.map(getEnemy),
    });
    let guard = 0;
    while (s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 500) {
      s = s.phase === 'playerTurn' ? policy(s, animalId) : advance(s);
      if (s.lastError) throw new Error(`${animalId}: ${s.lastError}`);
    }
    if (s.phase === 'victory') wins += 1;
    rounds += s.round;
  }
  return { rate: wins / n, avgRounds: rounds / n };
}

describe('every bond can clear stage 1', () => {
  it.each(ANIMAL_ORDER)('%s', (animalId) => {
    const r = winRate(animalId);
    console.log(`${animalId}: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
});
