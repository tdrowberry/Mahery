import type { EnemyDef } from './types';

// Chapter 1: snake-bonded exiles of the Broken Pack (poison, ambush, high evasion).
// Chapter 2: spider-bonded exiles (control the battlefield, immobilize, drain).

const skulker: EnemyDef = {
  id: 'skulker',
  name: 'Broken Pack Skulker',
  description: 'A snake-bonded exile. Thin, twitchy, hard to pin down.',
  color: '#4f8a3a',
  art: 'enemy-snake',
  attributes: { vitality: 0, strength: 8, instinct: 5, speed: 10 },
  evasionBonus: 0.08,
  isBoss: false,
  marksReward: 6,
  loot: [{ itemId: 'strength1', chance: 0.05 }, { itemId: 'speed1', chance: 0.05 }],
  moves: [
    {
      id: 'skulker.fangStrike', name: 'Fang Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'skulker.venomBite', name: 'Venom Bite', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 5, cooldown: 3, rank: 1,
      summary: 'Deal 50% Strength damage and poison for 3 turns.', weight: 2,
      ai: { targetLacksStatus: 'poison' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.5 },
        { kind: 'status', status: 'poison', duration: 3, magnitude: 0.6, scaling: 'instinct', target: 'target' },
      ],
    },
  ],
};

const viperAmbusher: EnemyDef = {
  id: 'viperAmbusher',
  name: 'Viper Ambusher',
  description: 'A leaner snake-bonded exile. Fast, hard to hit, and it only needs one clean strike.',
  color: '#6a8f3e',
  art: 'enemy-snake',
  attributes: { vitality: 0, strength: 9, instinct: 4, speed: 14 },
  evasionBonus: 0.16,
  isBoss: false,
  marksReward: 7,
  loot: [{ itemId: 'instinct1', chance: 0.05 }, { itemId: 'vitality1', chance: 0.05 }],
  moves: [
    {
      id: 'viper.fangStrike', name: 'Fang Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage (140% against a poisoned target).', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0, bonusVsStatus: { status: 'poison', multiplier: 1.4 } }],
    },
    {
      id: 'viper.coiledStrike', name: 'Coiled Strike', icon: 'shadow', anim: 'charge', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'A guaranteed critical hit for 110% Strength.', weight: 2,
      effects: [{ kind: 'special', key: 'guaranteedCrit', params: { multiplier: 1.1 } }],
    },
  ],
};

const sessik: EnemyDef = {
  id: 'sessik',
  name: 'Sessik',
  title: 'the Coiled',
  description: 'Leader of the snake-bonded on this stretch of road. Bonded, exiled, and chose cruelty.',
  color: '#2f6b4f',
  art: 'enemy-snake',
  // both Mahery and the companion fight every round now, so a boss needs real staying power
  attributes: { vitality: 58, strength: 17, instinct: 10, speed: 9 },
  evasionBonus: 0.05,
  isBoss: true,
  marksReward: 30,
  loot: [{ itemId: 'guard2', chance: 0.3 }, { itemId: 'speed2', chance: 0.22 }],
  moves: [
    {
      id: 'sessik.fangStrike', name: 'Fang Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'sessik.venomSpit', name: 'Venom Spit', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Poison the target for 3 turns.', weight: 2,
      ai: { targetLacksStatus: 'poison' },
      effects: [{ kind: 'status', status: 'poison', duration: 3, magnitude: 0.8, scaling: 'instinct', target: 'target' }],
    },
    {
      id: 'sessik.constrict', name: 'Constrict', icon: 'charge', anim: 'charge', target: 'enemy', spiritCost: 8, cooldown: 3, rank: 1,
      summary: 'Deal 130% Strength damage and slow the target for 2 turns.', weight: 2,
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 1.3 },
        { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.3, target: 'target' },
      ],
    },
    {
      id: 'sessik.shedSkin', name: 'Shed Skin', icon: 'heal', anim: 'cast', target: 'self', spiritCost: 10, cooldown: 0, rank: 1,
      summary: 'Cleanse and heal 500% Instinct. Once per fight.', weight: 10,
      ai: { healthBelowPct: 0.4, oncePerBattle: true },
      effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 5 }],
    },
    {
      id: 'sessik.coilingStrike', name: 'Coiling Strike', icon: 'power', anim: 'charge', target: 'enemy', spiritCost: 9, cooldown: 5, rank: 1,
      summary: 'Winds up for a heavy strike that lands next turn (240% Strength) - unless staggered first.', weight: 4,
      effects: [{ kind: 'special', key: 'telegraph', params: { multiplier: 2.4, ignoreGuardPct: 0.4, breakThresholdPct: 0.15 } }],
    },
  ],
};

const webSkulker: EnemyDef = {
  id: 'webSkulker',
  name: 'Broken Pack Weaver',
  description: 'A spider-bonded exile. It does not chase - it lets the web do the chasing.',
  color: '#5a4a78',
  art: 'enemy-spider',
  attributes: { vitality: 2, strength: 9, instinct: 7, speed: 8 },
  evasionBonus: 0.05,
  isBoss: false,
  marksReward: 10,
  loot: [{ itemId: 'instinct2', chance: 0.04 }, { itemId: 'guard2', chance: 0.04 }],
  moves: [
    {
      id: 'webSkulker.bite', name: 'Bite', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 95% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.95 }],
    },
    {
      id: 'webSkulker.snare', name: 'Web Snare', icon: 'weaken', anim: 'venom', target: 'enemy', spiritCost: 5, cooldown: 3, rank: 1,
      summary: 'Deal 40% Strength damage and slow the target for 2 turns.', weight: 2,
      ai: { targetLacksStatus: 'speedDown' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.4 },
        { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.3, target: 'target' },
      ],
    },
    {
      id: 'webSkulker.drain', name: 'Draining Bite', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 70% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 0.7, drainPct: 0.5 } }],
    },
  ],
};

const widowStalker: EnemyDef = {
  id: 'widowStalker',
  name: 'Widow Stalker',
  description: 'Bigger, patient, spider-bonded. It waits for the web to do most of the work.',
  color: '#3f3358',
  art: 'enemy-spider',
  attributes: { vitality: 3, strength: 11, instinct: 8, speed: 9 },
  evasionBonus: 0.06,
  isBoss: false,
  marksReward: 12,
  loot: [{ itemId: 'strength2', chance: 0.05 }, { itemId: 'vitality2', chance: 0.04 }],
  moves: [
    {
      id: 'widow.bite', name: 'Bite', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 105% Strength damage (145% against a slowed target).', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.05, bonusVsStatus: { status: 'speedDown', multiplier: 1.4 } }],
    },
    {
      id: 'widow.poisonFang', name: 'Poison Fang', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 5, cooldown: 3, rank: 1,
      summary: 'Deal 45% Strength damage and poison for 3 turns.', weight: 2,
      ai: { targetLacksStatus: 'poison' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.45 },
        { kind: 'status', status: 'poison', duration: 3, magnitude: 0.7, scaling: 'instinct', target: 'target' },
      ],
    },
    {
      id: 'widow.drain', name: 'Draining Bite', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 80% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 0.8, drainPct: 0.5 } }],
    },
  ],
};

const vethra: EnemyDef = {
  id: 'vethra',
  name: 'Vethra',
  title: 'the Weaver',
  description: 'Leader of the spider-bonded deeper in the webbed forest. Patient, and in no hurry to finish anything.',
  color: '#2e2440',
  art: 'enemy-spider',
  attributes: { vitality: 92, strength: 17, instinct: 12, speed: 10 },
  evasionBonus: 0.06,
  isBoss: true,
  marksReward: 50,
  loot: [{ itemId: 'speed3', chance: 0.26 }, { itemId: 'instinct3', chance: 0.19 }],
  moves: [
    {
      id: 'vethra.bite', name: 'Fang Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'vethra.snare', name: 'Web Snare', icon: 'weaken', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 40% Strength damage and slow the target for 2 turns.', weight: 2,
      ai: { targetLacksStatus: 'speedDown' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.4 },
        { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.3, target: 'target' },
      ],
    },
    {
      id: 'vethra.paralyze', name: 'Paralyzing Bite', icon: 'shadow', anim: 'charge', target: 'enemy', spiritCost: 8, cooldown: 4, rank: 1,
      summary: 'Deal 90% Strength damage, 35% chance to stun.', weight: 2,
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.9 },
        { kind: 'special', key: 'stunChance', params: { chance: 0.35, duration: 1 } },
      ],
    },
    {
      id: 'vethra.drain', name: 'Draining Embrace', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 8, cooldown: 3, rank: 1,
      summary: 'Deal 100% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 1.0, drainPct: 0.5 } }],
    },
    {
      id: 'vethra.cocoon', name: 'Silk Cocoon', icon: 'heal', anim: 'cast', target: 'self', spiritCost: 10, cooldown: 0, rank: 1,
      summary: 'Cleanse and heal 450% Instinct. Once per fight.', weight: 10,
      ai: { healthBelowPct: 0.4, oncePerBattle: true },
      effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 4.5 }],
    },
    {
      id: 'vethra.widowmakerStrike', name: "Widowmaker's Strike", icon: 'power', anim: 'charge', target: 'enemy', spiritCost: 9, cooldown: 5, rank: 1,
      summary: 'Winds up for a heavy strike that lands next turn (260% Strength) - unless staggered first.', weight: 4,
      effects: [{ kind: 'special', key: 'telegraph', params: { multiplier: 2.6, ignoreGuardPct: 0.4, breakThresholdPct: 0.15 } }],
    },
  ],
};

// Chapter 3: crocodile-bonded exiles of the Broken Pack (high Health, lock a single target down).
const snapper: EnemyDef = {
  id: 'snapper',
  name: 'Broken Pack Snapper',
  description: 'A crocodile-bonded exile. It does not hurry - it only has to be right once.',
  color: '#6b7a5e',
  art: 'enemy-crocodile',
  attributes: { vitality: 6, strength: 14, instinct: 7, speed: 6 },
  evasionBonus: 0.02,
  isBoss: false,
  marksReward: 16,
  loot: [{ itemId: 'vitality2', chance: 0.05 }, { itemId: 'guard2', chance: 0.04 }],
  moves: [
    {
      id: 'snapper.bite', name: 'Bite', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 105% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.05 }],
    },
    {
      id: 'snapper.clamp', name: 'Clamp Down', icon: 'shadow', anim: 'charge', target: 'enemy', spiritCost: 7, cooldown: 4, rank: 1,
      summary: 'Deal 80% Strength damage, 30% chance to stun.', weight: 2,
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.8 },
        { kind: 'special', key: 'stunChance', params: { chance: 0.3, duration: 1 } },
      ],
    },
    {
      id: 'snapper.roll', name: 'Death Roll', icon: 'charge', anim: 'charge', target: 'enemy', spiritCost: 8, cooldown: 3, rank: 1,
      summary: 'Deal 130% Strength damage, ignoring 20% of any shield.', weight: 2,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.3, ignoreGuardPct: 0.2 }],
    },
  ],
};

const strangler: EnemyDef = {
  id: 'strangler',
  name: 'River Strangler',
  description: 'Bigger, slower, crocodile-bonded. It does not need to be fast when the grip does not let go.',
  color: '#556b4f',
  art: 'enemy-crocodile',
  attributes: { vitality: 8, strength: 16, instinct: 7, speed: 5 },
  evasionBonus: 0.01,
  isBoss: false,
  marksReward: 19,
  loot: [{ itemId: 'strength2', chance: 0.05 }, { itemId: 'speed2', chance: 0.04 }],
  moves: [
    {
      id: 'strangler.bite', name: 'Bite', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 115% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.15 }],
    },
    {
      id: 'strangler.grip', name: 'Vice Grip', icon: 'shadow', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 50% Strength damage and slow the target for 2 turns.', weight: 2,
      ai: { targetLacksStatus: 'speedDown' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.5 },
        { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.35, target: 'target' },
      ],
    },
    {
      id: 'strangler.drag', name: 'Drag Under', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 8, cooldown: 3, rank: 1,
      summary: 'Deal 90% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 0.9, drainPct: 0.5 } }],
    },
  ],
};

const drevik: EnemyDef = {
  id: 'drevik',
  name: 'Drevik',
  title: 'the Drowned',
  description: 'Leader of the crocodile-bonded on the river road. Exiled, patient, and in no hurry to finish anything - the river never is.',
  color: '#425440',
  art: 'enemy-crocodile',
  attributes: { vitality: 158, strength: 22, instinct: 13, speed: 8 },
  evasionBonus: 0.03,
  isBoss: true,
  marksReward: 65,
  loot: [{ itemId: 'guard3', chance: 0.26 }, { itemId: 'vitality3', chance: 0.19 }],
  moves: [
    {
      id: 'drevik.bite', name: 'Fang Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'drevik.clamp', name: 'Clamp Down', icon: 'shadow', anim: 'charge', target: 'enemy', spiritCost: 8, cooldown: 4, rank: 1,
      summary: 'Deal 85% Strength damage, 35% chance to stun.', weight: 2,
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.85 },
        { kind: 'special', key: 'stunChance', params: { chance: 0.35, duration: 1 } },
      ],
    },
    {
      id: 'drevik.drag', name: 'Drag Under', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 8, cooldown: 3, rank: 1,
      summary: 'Deal 100% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 1.0, drainPct: 0.5 } }],
    },
    {
      id: 'drevik.hide', name: 'Riverbed Scales', icon: 'heal', anim: 'cast', target: 'self', spiritCost: 10, cooldown: 0, rank: 1,
      summary: 'Cleanse and heal 480% Instinct. Once per fight.', weight: 10,
      ai: { healthBelowPct: 0.4, oncePerBattle: true },
      effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 4.8 }],
    },
    {
      id: 'drevik.rollStrike', name: 'The Long Wait', icon: 'power', anim: 'charge', target: 'enemy', spiritCost: 9, cooldown: 5, rank: 1,
      summary: 'Winds up for a crushing roll that lands next turn (250% Strength) - unless staggered first.', weight: 4,
      effects: [{ kind: 'special', key: 'telegraph', params: { multiplier: 2.5, ignoreGuardPct: 0.35, breakThresholdPct: 0.15 } }],
    },
  ],
};

// Chapter 4: vulture-bonded exiles of the Broken Pack (pick off wounded targets, curse or debuff).
const picker: EnemyDef = {
  id: 'picker',
  name: 'Broken Pack Picker',
  description: 'A vulture-bonded exile. It does not start fights - it waits for someone else to lose one first.',
  color: '#8a7a63',
  art: 'enemy-vulture',
  attributes: { vitality: 5, strength: 15, instinct: 9, speed: 10 },
  evasionBonus: 0.08,
  isBoss: false,
  marksReward: 20,
  loot: [{ itemId: 'speed3', chance: 0.05 }, { itemId: 'instinct3', chance: 0.04 }],
  moves: [
    {
      id: 'picker.peck', name: 'Peck', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'picker.curse', name: 'Carrion Curse', icon: 'weaken', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 45% Strength damage and weaken the target 25% for 2 turns.', weight: 2,
      ai: { targetLacksStatus: 'weaken' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.45 },
        { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.25, target: 'target' },
      ],
    },
    {
      id: 'picker.talon', name: 'Talon Rake', icon: 'pounce', anim: 'strike', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 130% Strength damage, more against a wounded target.', weight: 2,
      effects: [{ kind: 'special', key: 'ambush', params: { multiplier: 1.3, openingBonus: 0, executeThreshold: 0.4, executeBonus: 0.8 } }],
    },
  ],
};

const carrionStalker: EnemyDef = {
  id: 'carrionStalker',
  name: 'Carrion Stalker',
  description: 'Bigger, patient, vulture-bonded. It circles until something goes down, then it is the first one there.',
  color: '#75664f',
  art: 'enemy-vulture',
  attributes: { vitality: 6, strength: 17, instinct: 9, speed: 10 },
  evasionBonus: 0.09,
  isBoss: false,
  marksReward: 23,
  loot: [{ itemId: 'strength3', chance: 0.05 }, { itemId: 'guard3', chance: 0.04 }],
  moves: [
    {
      id: 'carrionStalker.peck', name: 'Peck', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 110% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.1 }],
    },
    {
      id: 'carrionStalker.curse', name: 'Carrion Curse', icon: 'weaken', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 50% Strength damage and weaken the target 25% for 2 turns.', weight: 2,
      ai: { targetLacksStatus: 'weaken' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.5 },
        { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.25, target: 'target' },
      ],
    },
    {
      id: 'carrionStalker.talon', name: 'Talon Rake', icon: 'pounce', anim: 'strike', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 140% Strength damage, more against a wounded target.', weight: 2,
      effects: [{ kind: 'special', key: 'ambush', params: { multiplier: 1.4, openingBonus: 0, executeThreshold: 0.4, executeBonus: 0.8 } }],
    },
  ],
};

const skarrow: EnemyDef = {
  id: 'skarrow',
  name: 'Skarrow',
  title: 'the Unburied',
  description: 'Leader of the vulture-bonded. Exiled, and convinced ever since that everyone else is just prey that has not fallen yet.',
  color: '#5f5340',
  art: 'enemy-vulture',
  attributes: { vitality: 195, strength: 25, instinct: 15, speed: 12 },
  evasionBonus: 0.09,
  isBoss: true,
  marksReward: 80,
  loot: [{ itemId: 'instinct4', chance: 0.26 }, { itemId: 'strength4', chance: 0.19 }],
  moves: [
    {
      id: 'skarrow.peck', name: 'Peck', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'skarrow.curse', name: 'Carrion Curse', icon: 'weaken', anim: 'venom', target: 'enemy', spiritCost: 7, cooldown: 3, rank: 1,
      summary: 'Deal 50% Strength damage and weaken the target 30% for 3 turns.', weight: 2,
      ai: { targetLacksStatus: 'weaken' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.5 },
        { kind: 'status', status: 'weaken', duration: 3, magnitude: 0.3, target: 'target' },
      ],
    },
    {
      id: 'skarrow.talon', name: 'Talon Rake', icon: 'pounce', anim: 'strike', target: 'enemy', spiritCost: 7, cooldown: 3, rank: 1,
      summary: 'Deal 140% Strength damage, much more against a wounded target.', weight: 2,
      effects: [{ kind: 'special', key: 'ambush', params: { multiplier: 1.4, openingBonus: 0, executeThreshold: 0.45, executeBonus: 1.0 } }],
    },
    {
      id: 'skarrow.roost', name: 'Roost', icon: 'heal', anim: 'cast', target: 'self', spiritCost: 10, cooldown: 0, rank: 1,
      summary: 'Cleanse and heal 500% Instinct. Once per fight.', weight: 10,
      ai: { healthBelowPct: 0.4, oncePerBattle: true },
      effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 5.0 }],
    },
    {
      id: 'skarrow.stoop', name: 'The Long Drop', icon: 'power', anim: 'charge', target: 'enemy', spiritCost: 9, cooldown: 5, rank: 1,
      summary: 'Winds up for a diving strike that lands next turn (270% Strength) - unless staggered first.', weight: 4,
      effects: [{ kind: 'special', key: 'telegraph', params: { multiplier: 2.7, ignoreGuardPct: 0.4, breakThresholdPct: 0.15 } }],
    },
  ],
};

// Chapter 5: raven-bonded exiles of the Broken Pack - high Speed, strike first, then retreat
// before engaging again. Corvath leads the whole Broken Pack, not just this stretch of road.
const talon: EnemyDef = {
  id: 'talon',
  name: 'Broken Pack Talon',
  description: 'A raven-bonded exile. Gone before you finish deciding it was really there.',
  color: '#3a3542',
  art: 'enemy-raven',
  attributes: { vitality: 5, strength: 16, instinct: 9, speed: 17 },
  evasionBonus: 0.14,
  isBoss: false,
  marksReward: 24,
  loot: [{ itemId: 'speed3', chance: 0.05 }, { itemId: 'vitality3', chance: 0.04 }],
  moves: [
    {
      id: 'talon.slash', name: 'Talon Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'talon.first', name: 'First Strike', icon: 'shadow', anim: 'charge', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'A guaranteed critical hit for 110% Strength.', weight: 3,
      effects: [{ kind: 'special', key: 'guaranteedCrit', params: { multiplier: 1.1 } }],
    },
    {
      id: 'talon.drain', name: 'Feeding Dive', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 7, cooldown: 3, rank: 1,
      summary: 'Deal 85% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 0.85, drainPct: 0.5 } }],
    },
  ],
};

const shadowwing: EnemyDef = {
  id: 'shadowwing',
  name: 'Shadowwing Raider',
  description: 'Bigger, bolder, raven-bonded. It does not need to be careful when it is already gone by the time you react.',
  color: '#2c2833',
  art: 'enemy-raven',
  attributes: { vitality: 6, strength: 18, instinct: 9, speed: 16 },
  evasionBonus: 0.13,
  isBoss: false,
  marksReward: 27,
  loot: [{ itemId: 'guard3', chance: 0.05 }, { itemId: 'instinct3', chance: 0.04 }],
  moves: [
    {
      id: 'shadowwing.slash', name: 'Talon Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 110% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.1 }],
    },
    {
      id: 'shadowwing.first', name: 'First Strike', icon: 'shadow', anim: 'charge', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'A guaranteed critical hit for 115% Strength.', weight: 3,
      effects: [{ kind: 'special', key: 'guaranteedCrit', params: { multiplier: 1.15 } }],
    },
    {
      id: 'shadowwing.drain', name: 'Feeding Dive', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 7, cooldown: 3, rank: 1,
      summary: 'Deal 95% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 0.95, drainPct: 0.5 } }],
    },
  ],
};

const corvath: EnemyDef = {
  id: 'corvath',
  name: 'Corvath',
  title: 'the Unbound',
  description: "Leader of the Broken Pack. Once exiled like all the rest of them; now the reason the road has a name worth fearing.",
  color: '#1f1c24',
  art: 'enemy-raven',
  attributes: { vitality: 240, strength: 28, instinct: 16, speed: 18 },
  evasionBonus: 0.14,
  isBoss: true,
  marksReward: 100,
  loot: [{ itemId: 'strength4', chance: 0.3 }, { itemId: 'speed4', chance: 0.22 }],
  moves: [
    {
      id: 'corvath.slash', name: 'Talon Strike', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 100% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }],
    },
    {
      id: 'corvath.first', name: 'First Strike', icon: 'shadow', anim: 'charge', target: 'enemy', spiritCost: 7, cooldown: 3, rank: 1,
      summary: 'A guaranteed critical hit for 120% Strength.', weight: 3,
      effects: [{ kind: 'special', key: 'guaranteedCrit', params: { multiplier: 1.2 } }],
    },
    {
      id: 'corvath.drain', name: 'Feeding Dive', icon: 'venom', anim: 'venom', target: 'enemy', spiritCost: 8, cooldown: 3, rank: 1,
      summary: 'Deal 100% Strength damage and drain half of it back as Health.', weight: 2,
      effects: [{ kind: 'special', key: 'lifesteal', params: { multiplier: 1.0, drainPct: 0.5 } }],
    },
    {
      id: 'corvath.roost', name: 'Wing Cover', icon: 'heal', anim: 'cast', target: 'self', spiritCost: 10, cooldown: 0, rank: 1,
      summary: 'Cleanse and heal 500% Instinct. Once per fight.', weight: 10,
      ai: { healthBelowPct: 0.4, oncePerBattle: true },
      effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 5.0 }],
    },
    {
      id: 'corvath.stoop', name: 'The Unbound Dive', icon: 'power', anim: 'charge', target: 'enemy', spiritCost: 9, cooldown: 5, rank: 1,
      summary: 'Winds up for a diving strike that lands next turn (280% Strength) - unless staggered first.', weight: 4,
      effects: [{ kind: 'special', key: 'telegraph', params: { multiplier: 2.8, ignoreGuardPct: 0.4, breakThresholdPct: 0.15 } }],
    },
  ],
};

// Final Chapter: the birth clan itself. Not Broken Pack exiles - the people Mahery grew up
// among, following the old chief's blood oath code without question.
const clanWarrior: EnemyDef = {
  id: 'clanWarrior',
  name: 'Clan Warrior',
  description: "One of the old chief's own. He does not hate Mahery. He is just following the code, the same as always.",
  color: '#7a6a52',
  art: 'clanWarrior',
  attributes: { vitality: 9, strength: 21, instinct: 11, speed: 12 },
  evasionBonus: 0.05,
  isBoss: false,
  corrupted: true,
  marksReward: 30,
  loot: [{ itemId: 'vitality4', chance: 0.05 }, { itemId: 'guard4', chance: 0.05 }],
  moves: [
    {
      id: 'warrior.slash', name: 'Spear Thrust', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 105% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.05 }],
    },
    {
      id: 'warrior.guard', name: 'Shield Wall', icon: 'shield', anim: 'cast', target: 'self', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Raise a shield worth 220% Vitality for 2 turns.', weight: 2,
      effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 2.2, duration: 2 }],
    },
    {
      id: 'warrior.power', name: 'Oathstrike', icon: 'charge', anim: 'charge', target: 'enemy', spiritCost: 7, cooldown: 3, rank: 1,
      summary: 'Deal 145% Strength damage.', weight: 2,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.45 }],
    },
  ],
};

const yorrun: EnemyDef = {
  id: 'yorrun',
  name: 'Yorrun',
  title: 'the Old Chief',
  description: 'Direwolf-bonded, and chief for longer than Mahery has been alive. He killed a father for mercy and has never once lost sleep over it.',
  color: '#4a4a52',
  art: 'oldChief',
  attributes: { vitality: 340, strength: 34, instinct: 19, speed: 15 },
  evasionBonus: 0.08,
  isBoss: true,
  corrupted: true,
  marksReward: 150,
  loot: [{ itemId: 'strength5', chance: 0.38 }, { itemId: 'guard5', chance: 0.3 }],
  moves: [
    {
      id: 'yorrun.bite', name: 'Direwolf Bite', icon: 'slash', anim: 'strike', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1,
      summary: 'Deal 105% Strength damage.', weight: 3,
      effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.05 }],
    },
    {
      id: 'yorrun.pack', name: 'Old Pack Instinct', icon: 'pack', anim: 'strike', target: 'enemy', spiritCost: 7, cooldown: 3, rank: 1,
      summary: 'Deal 110% Strength damage, more per negative effect already on the target.', weight: 2,
      effects: [{ kind: 'special', key: 'packInstinct', params: { base: 1.1, perDebuff: 0.35 } }],
    },
    {
      id: 'yorrun.roar', name: "Chief's Roar", icon: 'roar', anim: 'cast', target: 'self', spiritCost: 8, cooldown: 4, rank: 1,
      summary: '+30% Strength and Instinct for 3 turns.', weight: 2,
      effects: [
        { kind: 'status', status: 'strengthUp', duration: 3, magnitude: 0.3, target: 'self' },
        { kind: 'status', status: 'instinctUp', duration: 3, magnitude: 0.3, target: 'self' },
      ],
    },
    {
      id: 'yorrun.mercy', name: 'No Mercy', icon: 'weaken', anim: 'venom', target: 'enemy', spiritCost: 6, cooldown: 3, rank: 1,
      summary: 'Deal 55% Strength damage and weaken the target 30% for 3 turns.', weight: 2,
      ai: { targetLacksStatus: 'weaken' },
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.55 },
        { kind: 'status', status: 'weaken', duration: 3, magnitude: 0.3, target: 'target' },
      ],
    },
    {
      id: 'yorrun.oldPower', name: "The Chief's Judgment", icon: 'power', anim: 'charge', target: 'enemy', spiritCost: 10, cooldown: 5, rank: 1,
      summary: 'Winds up for a crushing blow that lands next turn (290% Strength) - unless staggered first.', weight: 4,
      effects: [{ kind: 'special', key: 'telegraph', params: { multiplier: 2.9, ignoreGuardPct: 0.45, breakThresholdPct: 0.15 } }],
    },
  ],
};

export const ENEMIES: Record<string, EnemyDef> = {
  skulker, viperAmbusher, sessik, webSkulker, widowStalker, vethra,
  snapper, strangler, drevik,
  picker, carrionStalker, skarrow,
  talon, shadowwing, corvath,
  clanWarrior, yorrun,
};

export function getEnemy(id: string): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy "${id}"`);
  return def;
}
