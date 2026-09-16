import { describe, expect, it } from 'vitest';
import { getAnimal } from '../../data/animals';
import { ENCOUNTERS, getEncounter } from '../../data/encounters';
import { getEnemy } from '../../data/enemies';
import { shopLevelCap, shopPrice } from '../../data/gems';
import { SKILL_COLUMNS } from '../../data/sharedSkills';
import type { SharedKind } from '../../data/types';
import { MAX_TOTAL_ABILITY_POINTS } from '../../data/progression';
import { createNewSave } from '../../state/saveFormat';
import { advance, checkSkillUsable, createBattle, hasStatus, playerUseSkill, type BattleState } from '../combat';

// Balance smoke test: a simple but sensible policy should win each chapter's opening and
// closing fights most of the time. Numbers here are the tuning targets, not gameplay rules.
// Mahery is always the directed unit; the companion fights on its own via the default
// 'balanced' ally stance, so the policy below only ever has to decide for Mahery.

type Setup = { ranks: Record<string, number>; bar: (string | null)[]; strengthBonus: number; vitalityBonus: number };

// The shared skills are three independent columns now (see sharedSkills.ts): within a column,
// rank 1 of skill N requires rank 1 of skill N-1, but the three columns don't gate each other -
// the signature skill requires rank 1 of all three columns' last skill instead. So "what can a
// level-N player actually have unlocked" is a budget of Ability Points spent walking all three
// columns, not just one chain. This builds the same kind of kit a sensible-but-not-optimized
// player reaching a given point budget would actually have: unlock rank 1 breadth-first across
// all three columns (round-robin, one skill per column per round - a player exploring the tree
// naturally samples all three branches rather than committing to just one before trying the
// others), then spend anything left reinforcing the front of that same order up toward each
// skill's own rank cap.
const CHAIN = [
  'basicStrike',
  ...Array.from(
    { length: Math.max(...SKILL_COLUMNS.map((c) => c.length)) },
    (_, row) => SKILL_COLUMNS.map((c) => c[row]).filter((k): k is SharedKind => !!k),
  ).flat(),
  'unique',
];
function chainKit(abilityPoints: number, strengthBonus: number, vitalityBonus: number): Setup {
  const ranks: Record<string, number> = { 'bear.basicStrike': 1 };
  let points = abilityPoints;
  for (let i = 1; i < CHAIN.length && points > 0; i++) {
    ranks[`bear.${CHAIN[i]}`] = 1;
    points -= 1;
  }
  let i = 0;
  while (points > 0 && i < CHAIN.length) {
    const key = `bear.${CHAIN[i]}`;
    const cap = CHAIN[i] === 'unique' ? 5 : 3; // the signature skill alone goes to 5 - see animals.ts
    if ((ranks[key] ?? 0) > 0 && ranks[key] < cap) { ranks[key] += 1; points -= 1; } else { i += 1; }
  }
  // The bar can only hold 6 of the up-to-12 unlocked skills, so which 6 matters: a real player
  // would equip a coherent rotation, not just whichever unlocked first in chain order (that
  // would silently drop the capstone `unique` skill off the bar of every fully-invested kit,
  // since it sits at the very back of CHAIN). These 6 are policy()'s core loadout - sustain,
  // defense, a debuff/payoff pair, the signature skill, and the always-available basic attack
  // it falls back to unconditionally, so basicStrike must never be crowded off the bar. Support
  // skills (rally, instinctSurge, secondBreath) fill any slots left over on smaller kits, but
  // lose out on a fully-unlocked kit, same as a real player choosing a focused 6-skill bar would.
  const BAR_PRIORITY = ['basicStrike', 'unique', 'secondWind', 'guardStance', 'weaken', 'powerStrike'];
  const unlockedKinds = CHAIN.filter((k) => (ranks[`bear.${k}`] ?? 0) > 0);
  const prioritized = [
    ...BAR_PRIORITY.filter((k) => unlockedKinds.includes(k)),
    ...unlockedKinds.filter((k) => !BAR_PRIORITY.includes(k)),
  ];
  const bar: (string | null)[] = prioritized.slice(0, 6).map((k) => `bear.${k}`);
  while (bar.length < 6) bar.push(null);
  return { ranks, bar, strengthBonus, vitalityBonus };
}

function policy(s: BattleState): BattleState {
  const u = s.units.mahery;
  const alive = s.enemyIds.filter((id) => s.units[id].health > 0).sort((a, b) => s.units[a].health - s.units[b].health);
  const target = alive[0];
  const usable = (id: string) => {
    const k = u.skills.find((x) => x && x.id === id);
    return k && !checkSkillUsable(s, u.id, k);
  };
  const hp = u.health / u.maxHealth;
  const sp = u.maxSpirit > 0 ? u.spirit / u.maxSpirit : 1;
  const companion = s.units.companion;
  const allyHurt = !!companion && companion.health > 0 && companion.health / companion.maxHealth < 0.5;

  if (hp < 0.4 && usable('bear.secondWind')) return playerUseSkill(s, 'bear.secondWind');
  if (usable('bear.unique') && !hasStatus(u, 'resolve') && !u.pending) return playerUseSkill(s, 'bear.unique', target);
  if (allyHurt && usable('bear.rally')) return playerUseSkill(s, 'bear.rally');
  if (hp < 0.7 && usable('bear.guardStance') && !hasStatus(u, 'guard')) return playerUseSkill(s, 'bear.guardStance');
  if (usable('bear.instinctSurge') && !hasStatus(u, 'strengthUp')) return playerUseSkill(s, 'bear.instinctSurge');
  if (sp < 0.3 && usable('bear.secondBreath')) return playerUseSkill(s, 'bear.secondBreath');
  if (target && !hasStatus(s.units[target], 'weaken') && usable('bear.weaken')) return playerUseSkill(s, 'bear.weaken', target);
  if (usable('bear.powerStrike')) return playerUseSkill(s, 'bear.powerStrike', target);
  return playerUseSkill(s, 'bear.basicStrike', target);
}

function simulate(encounterId: string, setup: Setup, seed: number) {
  const save = createNewSave('bear');
  const attributes = {
    ...save.mahery.attributes,
    strength: save.mahery.attributes.strength + setup.strengthBonus,
    vitality: save.mahery.attributes.vitality + setup.vitalityBonus,
  };
  const enc = getEncounter(encounterId);
  let s = createBattle({
    encounterId, animal: getAnimal('bear'), seed,
    mahery: { attributes, skillRanks: setup.ranks, actionBar: setup.bar },
    enemies: enc.enemyIds.map(getEnemy),
  });
  let guard = 0;
  while (s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 500) {
    s = s.phase === 'playerTurn' ? policy(s) : advance(s);
    if (s.lastError) throw new Error(`policy error: ${s.lastError}`);
  }
  return { won: s.phase === 'victory', rounds: s.round };
}

function winRate(encounterId: string, setup: Setup, n = 150) {
  let wins = 0; let rounds = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = simulate(encounterId, setup, seed * 7919);
    if (r.won) wins += 1;
    rounds += r.rounds;
  }
  return { rate: wins / n, avgRounds: rounds / n };
}

const LEVEL1_KIT = chainKit(3, 0, 0);
// A level-4 kit that just cleared stages 1-4 once, spending every Ability Point earned so far
// and nothing more - the bare-minimum first attempt at the boss.
const BOSS_KIT = chainKit(6, 6, 4);
// Represents the payoff of a little extra grinding beyond a bare first-timer's kit - a couple
// of roaming fights' worth of ability/attribute points and maybe a found gem or two.
const CH1_GROUND_KIT = chainKit(10, 10, 8);
const CH2_FULL_KIT = chainKit(16, 12, 8);

// A player who never opens the Skills screen or Inventory: only the free starting Basic
// Strike, base attributes untouched, no gems equipped. The kits above are supposed to clear
// their fights by a wide margin *because* they represent real investment - if this build can
// also clear a chapter boss, leveling and itemization aren't actually required to progress.
function naivePolicy(s: BattleState): BattleState {
  const alive = s.enemyIds.find((id) => s.units[id].health > 0)!;
  return playerUseSkill(s, 'bear.basicStrike', alive);
}

function simulateNaive(encounterId: string, seed: number) {
  const save = createNewSave('bear');
  const enc = getEncounter(encounterId);
  let s = createBattle({
    encounterId, animal: getAnimal('bear'), seed,
    mahery: { attributes: save.mahery.attributes, skillRanks: save.mahery.skillRanks, actionBar: save.mahery.actionBar },
    enemies: enc.enemyIds.map(getEnemy),
  });
  let guard = 0;
  while (s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 500) {
    s = s.phase === 'playerTurn' ? naivePolicy(s) : advance(s);
  }
  return { won: s.phase === 'victory', rounds: s.round };
}

function naiveWinRate(encounterId: string, n = 150) {
  let wins = 0;
  for (let seed = 1; seed <= n; seed++) if (simulateNaive(encounterId, seed * 7919).won) wins += 1;
  return wins / n;
}

describe('a totally unspecced build (never leveled, never geared)', () => {
  it('can still limp through the very first fight', () => {
    const rate = naiveWinRate('ch1-s1');
    console.log(`naive, ch1-s1: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeGreaterThan(0.5);
  });
  it('can still get through the middle of chapter 1 (regular fights stay forgiving)', () => {
    const rate = naiveWinRate('ch1-s3');
    console.log(`naive, ch1-s3 (3 skulkers): win ${Math.round(rate * 100)}%`);
    expect(rate).toBeGreaterThan(0.7);
  });
  it('cannot beat the chapter 1 boss', () => {
    const rate = naiveWinRate('ch1-s5');
    console.log(`naive, ch1-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 2 boss', () => {
    const rate = naiveWinRate('ch2-s5');
    console.log(`naive, ch2-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 3 boss', () => {
    const rate = naiveWinRate('ch3-s5');
    console.log(`naive, ch3-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 4 boss', () => {
    const rate = naiveWinRate('ch4-s5');
    console.log(`naive, ch4-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 5 boss', () => {
    const rate = naiveWinRate('ch5-s5');
    console.log(`naive, ch5-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat Yorrun', () => {
    const rate = naiveWinRate('final-s2');
    console.log(`naive, final-s2 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
});

describe('chapter 1 balance', () => {
  it('stage 1 is winnable with the starting kit', () => {
    const r = winRate('ch1-s1', LEVEL1_KIT);
    console.log(`ch1-s1 (level 1 kit): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.8);
    expect(r.avgRounds).toBeLessThan(12);
  });
  it('the chapter 1 boss is a real risk for a bare-minimum kit, not a reliable win', () => {
    // With slower point gain, a level-4 kit that just cleared stages 1-4 once is *supposed*
    // to be under-geared for this fight - the intent is that a first-timer feels real risk
    // and comes back after grinding a roaming fight or two / better gems, not that this
    // exact kit reliably clears it. See CH1_GROUND_KIT below for the "a bit more invested" case.
    // At exactly 6 points a round-robin spread hasn't reached Power Strike yet (position 7 in
    // CHAIN - the Attacks column's payoff skill) - the tree's branching makes that a real power
    // cliff, not a gradual ramp, so "bare minimum" now means "before your column pays off" and
    // the win rate is a low-but-real chance, not a coin flip.
    const r = winRate('ch1-s5', BOSS_KIT);
    console.log(`ch1-s5 boss (bare-minimum kit): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.01);
    expect(r.rate).toBeLessThan(0.6);
  });
  it('the chapter 1 boss is comfortably beatable once you grind a little past bare-minimum', () => {
    const r = winRate('ch1-s5', CH1_GROUND_KIT);
    console.log(`ch1-s5 boss (a little grinding): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.7);
    expect(r.avgRounds).toBeLessThan(22);
  });
});

describe('chapter 2 balance', () => {
  it('stage 1 is winnable with a mid-chapter-1 kit', () => {
    const r = winRate('ch2-s1', BOSS_KIT);
    console.log(`ch2-s1 (boss-tier kit): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.7);
    expect(r.avgRounds).toBeLessThan(14);
  });
  it('the chapter 2 boss is beatable with a fuller, rank-2 kit', () => {
    // a genuinely min-maxed build (rank 2 everywhere, real stat investment) is supposed to
    // win reliably - that is the point of the investment - so this only checks a floor, not
    // an artificial "must still be able to lose" ceiling.
    const r = winRate('ch2-s5', CH2_FULL_KIT);
    console.log(`ch2-s5 boss: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.8);
    expect(r.avgRounds).toBeLessThan(24);
  });
});

// Chapters 3-6 assume progressively more leveling and a fuller learned kit, same spirit as
// CH2_FULL_KIT: growing Ability/Attribute Point budgets stand in for how far down the chain -
// and how deep into it - a player would actually be by that point in the road, rather than
// simulating the full XP curve.
const CH3_KIT = chainKit(22, 18, 14);
const CH4_KIT = chainKit(28, 26, 20);
const CH5_KIT = chainKit(32, 34, 26);
const FINAL_KIT = chainKit(MAX_TOTAL_ABILITY_POINTS, 42, 32);

describe('chapter 3 balance (crocodile)', () => {
  it('stage 1 is winnable with a chapter-2-tier kit', () => {
    const r = winRate('ch3-s1', CH3_KIT);
    console.log(`ch3-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('the chapter 3 boss is beatable, not trivial', () => {
    const r = winRate('ch3-s5', CH3_KIT);
    console.log(`ch3-s5 boss (Drevik): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.4);
    expect(r.avgRounds).toBeLessThan(26);
  });
});

describe('chapter 4 balance (vulture)', () => {
  it('stage 1 is winnable with a chapter-3-tier kit', () => {
    const r = winRate('ch4-s1', CH4_KIT);
    console.log(`ch4-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('the chapter 4 boss is beatable, not trivial', () => {
    const r = winRate('ch4-s5', CH4_KIT);
    console.log(`ch4-s5 boss (Skarrow): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.4);
    expect(r.avgRounds).toBeLessThan(26);
  });
});

describe('chapter 5 balance (raven)', () => {
  it('stage 1 is winnable with a chapter-4-tier kit', () => {
    const r = winRate('ch5-s1', CH5_KIT);
    console.log(`ch5-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('the chapter 5 boss (Broken Pack leader) is beatable, not trivial', () => {
    const r = winRate('ch5-s5', CH5_KIT);
    console.log(`ch5-s5 boss (Corvath): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.35);
    expect(r.avgRounds).toBeLessThan(28);
  });
});

describe('final chapter balance (the old chief)', () => {
  it('the clan warrior stage is winnable with an endgame kit', () => {
    const r = winRate('final-s1', FINAL_KIT);
    console.log(`final-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('Yorrun is beatable with a genuinely maxed endgame kit, the hardest fight in the game', () => {
    const r = winRate('final-s2', FINAL_KIT);
    console.log(`final-s2 boss (Yorrun): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.3);
    expect(r.avgRounds).toBeLessThan(30);
  });
});

describe('gem shop pricing', () => {
  // A first-timer clearing a chapter (every stage once, no roaming fights) earns this many
  // Marks total - the actual per-chapter economy, computed from the real encounter/enemy data
  // rather than hand-typed, so this stays honest if either one changes later.
  function chapterIncome(chapter: number): number {
    return ENCOUNTERS
      .filter((enc) => enc.chapter === chapter)
      .reduce((sum, enc) => sum + enc.enemyIds.reduce((s, id) => s + (getEnemy(id).marksReward ?? 0), 0), 0);
  }
  it('the top-tier gem the shop stocks each chapter costs roughly that chapter\'s own income - a real spend, not pocket change, but not a multi-chapter grind either', () => {
    for (let chapter = 1; chapter <= 4; chapter++) {
      const income = chapterIncome(chapter);
      const price = shopPrice(shopLevelCap(chapter));
      const ratio = price / income;
      console.log(`ch${chapter}: income ${income}, top-tier price ${price}, ratio ${ratio.toFixed(2)}`);
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.3);
    }
  });
});
