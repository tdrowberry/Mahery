import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import type { AnimStyle, ArtId } from '../data/types';
import type { Unit } from '../engine/combat';
import { GEM_KIND_COLOR, GEM_KIND_ICON, getGem } from '../data/gems';

// Illustrated vector art, drawn as inline SVG in a 120x160 box. Every figure is filled and
// gradient-shaded (not just outlined) with a bold ink rim, textured fur/scale linework, and
// bone/claw detailing, in the spirit of a flat cel-shaded character illustration. Each figure
// is a function of the unit's accent color and a per-instance uid (so gradients defined by
// two sprites on screen at once never collide). Animal companions share a parametrized
// quadruped / bird / platypus base so all 11 bonds read as distinct silhouettes.

const INK = '#20140b';
const SKIN = '#e8c9a0';
const PALE = '#e6dcc4';
const HAIR = '#3b2a1c';
const BONE = '#efe6d0';
const SICK = '#b7c690';
const WOLF_GREY = '#5f5a5c';

/** Lighten (positive) or darken (negative) a #rrggbb color by a -100..100 percent. */
function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** A radial "lit from the upper left" shading gradient for a filled shape. */
function RadialGrad({ id, base, lightAmt = 28, darkAmt = -24, cx = '35%', cy = '28%' }: {
  id: string; base: string; lightAmt?: number; darkAmt?: number; cx?: string; cy?: string;
}) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r="80%">
      <stop offset="0%" stopColor={shade(base, lightAmt)} />
      <stop offset="55%" stopColor={base} />
      <stop offset="100%" stopColor={shade(base, darkAmt)} />
    </radialGradient>
  );
}

/** A limb/neck/tail drawn as a rounded, shaded capsule: ink rim, shadow tone, lit core, highlight. */
function Limb({ x1, y1, x2, y2, width, color }: { x1: number; y1: number; x2: number; y2: number; width: number; color: string }) {
  const hi = shade(color, 38);
  const lo = shade(color, -30);
  const ox = width * 0.16; const oy = width * 0.16;
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={width + 3} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={lo} strokeWidth={width} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width * 0.72} />
      <line x1={x1 - ox} y1={y1 - oy} x2={x2 - ox} y2={y2 - oy} stroke={hi} strokeWidth={width * 0.28} strokeOpacity={0.55} />
    </g>
  );
}

/** A curved detail (antler, horn, tusk, mane strand, wisp) with an ink rim under the color. */
function OutlinedPath({ d, width, color, opacity }: { d: string; width: number; color: string; opacity?: number }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={width + 2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
    </>
  );
}

/** A small perched spider (round body, 8 bent legs), for spider-bonded figures. Authored at
 * the local origin; position and size are applied via an SVG transform so it can be reused
 * at any scale without re-deriving path coordinates. */
function SpiderCritter({ x, y, scale = 1, accent, uid }: { x: number; y: number; scale?: number; accent: string; uid: string }) {
  const gradId = `${uid}-sp-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} strokeLinecap="round">
      <defs>
        <RadialGrad id={gradId} base={accent} />
      </defs>
      <path
        d="M-1 0 Q-8 -5 -13 -11 M-1 0 Q-9 -1 -15 -4 M-1 0 Q-9 3 -15 7 M-1 0 Q-7 7 -10 14
           M1 0 Q8 -5 13 -11 M1 0 Q9 -1 15 -4 M1 0 Q9 3 15 7 M1 0 Q7 7 10 14"
        fill="none" stroke={INK} strokeWidth={2.6}
      />
      <path
        d="M-1 0 Q-8 -5 -13 -11 M-1 0 Q-9 -1 -15 -4 M-1 0 Q-9 3 -15 7 M-1 0 Q-7 7 -10 14
           M1 0 Q8 -5 13 -11 M1 0 Q9 -1 15 -4 M1 0 Q9 3 15 7 M1 0 Q7 7 10 14"
        fill="none" stroke={`url(#${gradId})`} strokeWidth={1.5}
      />
      <ellipse cx={0} cy={2} rx={6.5} ry={5} fill={`url(#${gradId})`} stroke={INK} strokeWidth={1.8} />
      <circle cx={0} cy={-4} r={3.4} fill={`url(#${gradId})`} stroke={INK} strokeWidth={1.6} />
      <circle cx={-1.3} cy={-4.6} r={0.7} fill="#ffd166" stroke="none" />
      <circle cx={1.3} cy={-4.6} r={0.7} fill="#ffd166" stroke="none" />
    </g>
  );
}

// ---------- animal companions ----------

interface QuadOpts {
  build: 'heavy' | 'lean' | 'cat';
  ears: 'round' | 'pointed' | 'long' | 'tuft';
  foot: 'paw' | 'hoof';
  antlers?: 'moose' | 'elk';
  horns?: boolean;
  tusks?: boolean;
  hump?: boolean;
  mane?: boolean;
  tail: 'stub' | 'long' | 'bushy' | 'bob';
  spots?: boolean;
}

function earsFor(kind: QuadOpts['ears'], hx: number, hy: number, fill: string) {
  const L = hx - 11; const R = hx + 11; const top = hy - 12;
  switch (kind) {
    case 'round':
      return (
        <>
          <circle cx={L} cy={top} r={5.6} fill={fill} stroke={INK} strokeWidth={3} />
          <circle cx={L} cy={top} r={2.6} fill={PALE} opacity={0.65} />
          <circle cx={R} cy={top} r={5.6} fill={fill} stroke={INK} strokeWidth={3} />
          <circle cx={R} cy={top} r={2.6} fill={PALE} opacity={0.65} />
        </>
      );
    case 'pointed':
      return (
        <>
          <path d={`M${L - 1} ${top + 6} l-3 -14 l11 8 Z`} fill={fill} stroke={INK} strokeWidth={3} />
          <path d={`M${R + 1} ${top + 6} l3 -14 l-11 8 Z`} fill={fill} stroke={INK} strokeWidth={3} />
        </>
      );
    case 'long':
      return (
        <>
          <path d={`M${L + 1} ${top + 4} l-8 -12 l12 4 Z`} fill={fill} stroke={INK} strokeWidth={3} />
          <path d={`M${R - 1} ${top + 4} l8 -12 l-12 4 Z`} fill={fill} stroke={INK} strokeWidth={3} />
        </>
      );
    case 'tuft':
      return (
        <>
          <path d={`M${L - 1} ${top + 6} l-4 -16 l12 9 Z`} fill={fill} stroke={INK} strokeWidth={3} />
          <path d={`M${R + 1} ${top + 6} l4 -16 l-12 9 Z`} fill={fill} stroke={INK} strokeWidth={3} />
          <path d={`M${L - 5} ${top - 10} l2 -6 M${R + 5} ${top - 10} l-2 -6`} stroke={INK} strokeWidth={2} fill="none" />
        </>
      );
  }
}

function Paw({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx={7} ry={4.6} fill={color} stroke={INK} strokeWidth={3} />
      <path d={`M${x - 3} ${y} v4 M${x} ${y - 1} v5 M${x + 3} ${y} v4`} stroke={INK} strokeWidth={1.3} fill="none" />
    </g>
  );
}

function Hoof({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 5} ${y - 2} L${x + 5} ${y - 2} L${x + 4} ${y + 6} L${x - 4} ${y + 6} Z`} fill="#39322b" stroke={INK} strokeWidth={2.4} />
      <line x1={x} y1={y - 2} x2={x} y2={y + 6} stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

function quadruped(accent: string, uid: string, o: QuadOpts): ReactElement {
  const bodyId = `${uid}-b`; const skinId = `${uid}-s`; const boneId = `${uid}-o`;
  const headR = o.build === 'heavy' ? 17 : o.build === 'cat' ? 12 : 13;
  const hx = 99;
  const hy = o.build === 'lean' ? 62 : o.build === 'cat' ? 70 : 72;
  const bodyRx = o.build === 'heavy' ? 43 : o.build === 'cat' ? 37 : 40;
  const bodyRy = o.build === 'heavy' ? 26 : o.build === 'lean' ? 18 : 17;
  const bodyCy = o.build === 'lean' ? 98 : 100;
  const legY0 = bodyCy + bodyRy - 6;
  const legXs: [number, boolean][] = [[26, true], [42, true], [70, false], [86, false]];
  const bodyFill = `url(#${bodyId})`;

  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={bodyId} base={accent} />
        <RadialGrad id={skinId} base={SKIN} lightAmt={14} darkAmt={-18} />
        <RadialGrad id={boneId} base={BONE} lightAmt={8} darkAmt={-22} />
      </defs>

      {legXs.map(([lx, front], i) => (
        <Limb key={i} x1={lx} y1={legY0} x2={lx + (front ? -2 : 2)} y2={148} width={o.build === 'heavy' ? 11 : 9} color={accent} />
      ))}
      {legXs.map(([lx, front], i) => (
        o.foot === 'hoof'
          ? <Hoof key={`f${i}`} x={lx + (front ? -2 : 2)} y={148} />
          : <Paw key={`f${i}`} x={lx + (front ? -2 : 2)} y={148} color={accent} />
      ))}

      {o.tail === 'long' && <Limb x1={18} y1={bodyCy - 4} x2={6} y2={bodyCy - 26} width={6} color={accent} />}
      {o.tail === 'bushy' && (
        <>
          <Limb x1={18} y1={bodyCy - 2} x2={4} y2={bodyCy - 22} width={12} color={accent} />
          <OutlinedPath d={`M10 ${bodyCy - 8} q-10 -4 -8 -16`} width={2.4} color={shade(accent, 24)} />
        </>
      )}
      {o.tail === 'stub' && <Limb x1={18} y1={bodyCy + 2} x2={10} y2={bodyCy - 4} width={9} color={accent} />}
      {o.tail === 'bob' && <Limb x1={20} y1={bodyCy + 4} x2={13} y2={bodyCy - 2} width={7} color={accent} />}

      <ellipse cx={56} cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={bodyFill} stroke={INK} strokeWidth={4} />
      <ellipse cx={54} cy={bodyCy + bodyRy * 0.55} rx={bodyRx * 0.52} ry={bodyRy * 0.38} fill={PALE} opacity={0.3} />
      {o.hump && <path d="M64 78 q14 -18 30 -4" fill={bodyFill} stroke={INK} strokeWidth={4} />}
      {o.mane && [30, 40, 50, 60, 70].map((x, i) => (
        <OutlinedPath key={i} d={`M${x} ${bodyCy - bodyRy + 6} l${i % 2 ? -2 : 2} -9`} width={2.6} color={shade(accent, -16)} />
      ))}
      {o.spots && [[40, bodyCy - 2], [56, bodyCy - 8], [70, bodyCy]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.2} fill={shade(accent, -42)} stroke={INK} strokeWidth={1} />
      ))}

      {o.build === 'lean' && <Limb x1={84} y1={84} x2={hx - 6} y2={hy + 8} width={13} color={accent} />}

      {o.antlers === 'moose' && (
        <>
          <OutlinedPath d={`M${hx - 8} ${hy - 12} l-10 -14 l-8 2 l4 -10 l10 4 l4 -8`} width={4} color={BONE} />
          <OutlinedPath d={`M${hx + 8} ${hy - 12} l10 -14 l8 2 l-4 -10 l-10 4 l-4 -8`} width={4} color={BONE} />
        </>
      )}
      {o.antlers === 'elk' && (
        <>
          <OutlinedPath d={`M${hx - 6} ${hy - 12} l-6 -18 l-6 -4 M${hx - 10} ${hy - 22} l-6 -8 M${hx - 8} ${hy - 26} l4 -8`} width={3.2} color={BONE} />
          <OutlinedPath d={`M${hx + 6} ${hy - 12} l6 -18 l6 -4 M${hx + 10} ${hy - 22} l6 -8 M${hx + 8} ${hy - 26} l-4 -8`} width={3.2} color={BONE} />
        </>
      )}
      {o.horns && (
        <>
          <OutlinedPath d={`M${hx - 12} ${hy - 8} q-10 -10 -2 -18`} width={5} color={`url(#${boneId})`} />
          <OutlinedPath d={`M${hx + 12} ${hy - 8} q10 -10 2 -18`} width={5} color={`url(#${boneId})`} />
        </>
      )}

      {earsFor(o.ears, hx, hy, bodyFill)}

      <circle cx={hx} cy={hy} r={headR} fill={bodyFill} stroke={INK} strokeWidth={4} />
      {o.build === 'lean'
        ? <ellipse cx={hx + 13} cy={hy + 6} rx={9} ry={5.4} fill={`url(#${skinId})`} stroke={INK} strokeWidth={3} />
        : <circle cx={hx + 11} cy={hy + 5} r={o.build === 'cat' ? 5 : 6.6} fill={`url(#${skinId})`} stroke={INK} strokeWidth={3} />}
      {o.tusks && (
        <>
          <OutlinedPath d={`M${hx + 8} ${hy + 10} l-2 8`} width={2.6} color={BONE} />
          <OutlinedPath d={`M${hx + 16} ${hy + 10} l2 8`} width={2.6} color={BONE} />
        </>
      )}
      <ellipse cx={hx + (o.build === 'lean' ? 20 : 17)} cy={hy + 4} rx={1.6} ry={1.2} fill={INK} stroke="none" />
      <circle cx={hx - 3} cy={hy - 3} r={2.1} fill={INK} stroke="none" />
      <circle cx={hx - 3.6} cy={hy - 3.6} r={0.6} fill="#fff" stroke="none" opacity={0.85} />
      {o.build === 'cat' && (
        <path d={`M${hx + 4} ${hy + 8} l-6 3 M${hx + 4} ${hy + 8} l-7 -1 M${hx + 18} ${hy + 8} l6 3 M${hx + 18} ${hy + 8} l7 -1`} stroke={INK} strokeWidth={1.4} fill="none" />
      )}
    </g>
  );
}

function bird(accent: string, uid: string, o: { paleHead?: boolean; cap?: boolean; size: 'large' | 'small' }): ReactElement {
  const s = o.size === 'large' ? 1 : 0.85;
  const bodyId = `${uid}-b`; const headId = `${uid}-h`; const beakId = `${uid}-k`;
  return (
    <g transform={`translate(60 150) scale(${s}) translate(-60 -150)`} strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={bodyId} base={accent} />
        <RadialGrad id={headId} base={o.paleHead ? '#efe7d6' : accent} lightAmt={16} darkAmt={-16} />
        <RadialGrad id={beakId} base="#e0a030" lightAmt={26} darkAmt={-18} cx="30%" cy="20%" />
      </defs>
      <path d="M20 146 q40 -10 84 0" stroke={shade('#6b4a2e', -12)} strokeWidth={5} fill="none" />
      <Limb x1={44} y1={118} x2={30} y2={140} width={6} color={accent} />
      <Limb x1={50} y1={122} x2={42} y2={144} width={6} color={accent} />
      <Limb x1={40} y1={120} x2={22} y2={136} width={6} color={accent} />
      <Limb x1={54} y1={128} x2={52} y2={140} width={5} color={shade('#c08a2a', -10)} />
      <Limb x1={68} y1={128} x2={68} y2={140} width={5} color={shade('#c08a2a', -10)} />
      <path d="M52 140 l-5 4 M52 140 l5 4 M68 140 l-5 4 M68 140 l5 4" stroke={INK} strokeWidth={2.2} fill="none" />
      <ellipse cx={60} cy={104} rx={20} ry={32} fill={`url(#${bodyId})`} stroke={INK} strokeWidth={4} />
      <path d="M50 82 q28 6 32 42 q-18 -8 -32 -42 Z" fill={shade(accent, -22)} stroke={INK} strokeWidth={3} />
      <path d="M52 88 q22 8 26 32 M52 96 q18 8 20 24 M52 104 q14 7 15 18" stroke={shade(accent, 16)} strokeWidth={1.6} fill="none" opacity={0.7} />
      <circle cx={62} cy={62} r={13} fill={`url(#${headId})`} stroke={INK} strokeWidth={4} />
      {o.cap && <path d="M50 58 a13 13 0 0 1 24 -2 z" fill={shade(accent, -30)} stroke="none" opacity={0.85} />}
      {o.cap && <path d="M66 66 l-2 8" stroke={INK} strokeWidth={3} fill="none" />}
      <path d="M74 60 l13 3 l-10 7 Z" fill={`url(#${beakId})`} stroke={INK} strokeWidth={2.6} />
      <circle cx={78} cy={61} r={0.8} fill={INK} stroke="none" />
      <circle cx={67} cy={59} r={2.2} fill={INK} stroke="none" />
      <circle cx={66.2} cy={58.2} r={0.6} fill="#fff" opacity={0.85} stroke="none" />
      <path d="M60 52 l6 -1" stroke={INK} strokeWidth={2.4} fill="none" />
    </g>
  );
}

function platypusFigure(accent: string, uid: string): ReactElement {
  const bodyId = `${uid}-b`; const billId = `${uid}-l`;
  const tailColor = '#6b5a44';
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={bodyId} base={accent} />
        <RadialGrad id={billId} base="#5b4a3a" lightAmt={22} darkAmt={-16} />
      </defs>
      <path d="M24 112 h-16 a6 6 0 0 0 0 12 h16 Z" fill={tailColor} stroke={INK} strokeWidth={3.4} />
      <path d="M12 114 h8 M12 120 h8" stroke={shade(tailColor, -20)} strokeWidth={1.3} opacity={0.7} fill="none" />
      <Limb x1={36} y1={126} x2={32} y2={140} width={7} color={accent} />
      <Limb x1={52} y1={128} x2={50} y2={142} width={7} color={accent} />
      <Limb x1={70} y1={128} x2={72} y2={142} width={7} color={accent} />
      <Limb x1={84} y1={126} x2={88} y2={140} width={7} color={accent} />
      <path d="M26 144 h12 M44 146 h12 M66 146 h12 M82 144 h12" stroke={INK} strokeWidth={2.2} fill="none" />
      <ellipse cx={60} cy={116} rx={40} ry={17} fill={`url(#${bodyId})`} stroke={INK} strokeWidth={4} />
      <ellipse cx={58} cy={124} rx={22} ry={7} fill={PALE} opacity={0.3} />
      <circle cx={94} cy={104} r={12} fill={`url(#${bodyId})`} stroke={INK} strokeWidth={4} />
      <path d="M100 104 h20 a6 6 0 0 1 0 12 h-20 Z" fill={`url(#${billId})`} stroke={INK} strokeWidth={3} />
      <circle cx={110} cy={106} r={0.8} fill={INK} stroke="none" />
      <path d="M104 108 h12" stroke={shade('#5b4a3a', -25)} strokeWidth={1} opacity={0.6} fill="none" />
      <circle cx={97} cy={100} r={1.8} fill={INK} stroke="none" />
      <circle cx={96.4} cy={99.4} r={0.5} fill="#fff" opacity={0.85} stroke="none" />
      <path d="M88 134 l-4 8" stroke="#c9a03c" strokeWidth={3} fill="none" />
    </g>
  );
}

// ---------- Mahery ----------

function maheryFigure(accent: string, uid: string): ReactElement {
  const skinId = `${uid}-s`; const hairId = `${uid}-h`; const clothId = `${uid}-c`; const boneId = `${uid}-o`;
  const skinFill = `url(#${skinId})`; const hairFill = `url(#${hairId})`; const clothFill = `url(#${clothId})`; const boneFill = `url(#${boneId})`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={skinId} base={SKIN} lightAmt={14} darkAmt={-16} />
        <RadialGrad id={hairId} base={HAIR} lightAmt={22} darkAmt={-18} />
        <RadialGrad id={clothId} base={accent} />
        <RadialGrad id={boneId} base={BONE} lightAmt={10} darkAmt={-20} />
      </defs>

      {/* legs and boots */}
      <Limb x1={52} y1={100} x2={46} y2={130} width={11} color={SKIN} />
      <Limb x1={46} y1={130} x2={43} y2={148} width={9} color={SKIN} />
      <Limb x1={68} y1={100} x2={74} y2={130} width={11} color={SKIN} />
      <Limb x1={74} y1={130} x2={77} y2={148} width={9} color={SKIN} />
      <path d="M35 148 q-2 -9 9 -10 q10 -1 9 10 q0 7 -9 7 q-9 0 -9 -7 Z" fill={shade('#4a3423', 8)} stroke={INK} strokeWidth={3} />
      <path d="M69 148 q-2 -9 9 -10 q10 -1 9 10 q0 7 -9 7 q-9 0 -9 -7 Z" fill={shade('#4a3423', 8)} stroke={INK} strokeWidth={3} />
      <path d="M36 141 q7 -3 15 0 M70 141 q7 -3 15 0" stroke={shade('#4a3423', -22)} strokeWidth={2} fill="none" />

      {/* fur loincloth over a belt */}
      <path d="M46 92 L74 92 L78 113 L70 117 L64 110 L60 118 L56 110 L50 117 L42 113 Z" fill={clothFill} stroke={INK} strokeWidth={3} />
      <path d="M52 96 v11 M60 98 v15 M68 96 v11" stroke={shade(accent, -32)} strokeWidth={1.2} opacity={0.55} fill="none" />
      <path d="M44 90 H76" stroke={shade('#3a2a1a', -4)} strokeWidth={7} />
      <rect x={56} y={86.5} width={8} height={7} rx={1.5} fill={boneFill} stroke={INK} strokeWidth={2} />
      <path d="M74 92 l8 3 l-2 12 l-9 -1 Z" fill={shade('#5a4530', 4)} stroke={INK} strokeWidth={2.6} />

      {/* arms, guards, clawed hands */}
      <Limb x1={40} y1={46} x2={26} y2={72} width={11} color={SKIN} />
      <Limb x1={26} y1={72} x2={21} y2={94} width={9} color={SKIN} />
      <Limb x1={80} y1={46} x2={94} y2={72} width={11} color={SKIN} />
      <Limb x1={94} y1={72} x2={99} y2={94} width={9} color={SKIN} />
      <path d="M32 62 l-4 -2 M29 68 l-4 -2 M88 62 l4 -2 M91 68 l4 -2" stroke={shade(SKIN, -35)} strokeWidth={1.2} opacity={0.5} fill="none" />
      <path d="M14 89 q6 -6 13 0 l-2 9 q-4.5 3 -9 0 Z" fill={clothFill} stroke={INK} strokeWidth={2.6} />
      <path d="M106 89 q-6 -6 -13 0 l2 9 q4.5 3 9 0 Z" fill={clothFill} stroke={INK} strokeWidth={2.6} />
      <circle cx={18} cy={91} r={1} fill={INK} stroke="none" />
      <circle cx={102} cy={91} r={1} fill={INK} stroke="none" />
      <ellipse cx={19} cy={98} rx={5.6} ry={5.2} fill={skinFill} stroke={INK} strokeWidth={2.6} />
      <ellipse cx={101} cy={98} rx={5.6} ry={5.2} fill={skinFill} stroke={INK} strokeWidth={2.6} />
      <path d="M15 101 l-5 6 M19 104 l-1 6 M24 101 l4 6" stroke={boneFill} strokeWidth={2.2} fill="none" />
      <path d="M105 101 l5 6 M101 104 l1 6 M96 101 l-4 6" stroke={boneFill} strokeWidth={2.2} fill="none" />

      {/* torso */}
      <path d="M42 40 C36 42 33 56 37 70 C39 82 44 90 50 92 L70 92 C76 90 81 82 83 70 C87 56 84 42 78 40 C71 35 49 35 42 40 Z" fill={skinFill} stroke={INK} strokeWidth={3.6} />
      <path d="M50 46 q10 4 20 0 M60 50 v34 M50 58 h20 M50 66 h20 M50 74 h20" stroke={shade(SKIN, -30)} strokeWidth={1.3} opacity={0.4} fill="none" />
      <circle cx={39} cy={44} r={7.4} fill={skinFill} stroke={INK} strokeWidth={2.6} />
      <circle cx={81} cy={44} r={7.4} fill={skinFill} stroke={INK} strokeWidth={2.6} />
      <path d="M35 50 l6 8 M39 48 l6 9 M43 47 l5 9" stroke={INK} strokeWidth={1.4} opacity={0.55} fill="none" />
      <path d="M44 40 L76 58" stroke={shade('#3a2a1a', 6)} strokeWidth={2.2} fill="none" />
      <path d="M55 47 q5 4 10 0 l-2 6 l-3 4 l-3 -4 Z" fill={boneFill} stroke={INK} strokeWidth={1.8} />

      {/* neck and head */}
      <path d="M54 34 h12 v8 h-12 Z" fill={skinFill} stroke={INK} strokeWidth={3} />
      <ellipse cx={60} cy={20} rx={15} ry={13} fill={hairFill} stroke={INK} strokeWidth={3.2} />
      <path d="M48 12 l-5 -9 l9 4 M56 8 l-2 -10 l7 6 M64 8 l2 -10 l-7 6 M72 12 l5 -9 l-9 4" fill={hairFill} stroke={INK} strokeWidth={2.4} />
      <circle cx={60} cy={26} r={11.5} fill={skinFill} stroke={INK} strokeWidth={3.2} />
      <path d="M48 30 q-2 8 4 12 q4 3 8 2 q-8 -3 -9 -9 Z" fill={hairFill} opacity={0.92} stroke={INK} strokeWidth={1.6} />
      <path d="M72 30 q2 8 -4 12 q-4 3 -8 2 q8 -3 9 -9 Z" fill={hairFill} opacity={0.92} stroke={INK} strokeWidth={1.6} />
      <circle cx={55} cy={25} r={1.9} fill={INK} stroke="none" />
      <circle cx={54.3} cy={24.3} r={0.55} fill="#fff" opacity={0.85} stroke="none" />
      <circle cx={65} cy={25} r={1.9} fill={INK} stroke="none" />
      <circle cx={64.3} cy={24.3} r={0.55} fill="#fff" opacity={0.85} stroke="none" />
      <path d="M52 21 q3 -2 6 -1 M62 20 q3 -1 6 1" stroke={INK} strokeWidth={1.6} fill="none" />
      <path d="M60 27 v3" stroke={shade(SKIN, -30)} strokeWidth={1.2} />
      <path d="M55 33 q5 2.5 10 0" stroke={INK} strokeWidth={1.6} fill="none" />
      <path d="M46 16 Q60 11 74 16" stroke={clothFill} strokeWidth={3.4} fill="none" />
      <path d="M74 16 l6 4 l-4 6 Z" fill={clothFill} stroke={INK} strokeWidth={1.6} />
    </g>
  );
}

// ---------- snake-bonded enemies ----------

function skulkerFigure(accent: string, uid: string): ReactElement {
  const skinId = `${uid}-s`; const snakeId = `${uid}-n`; const hoodId = `${uid}-h`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={skinId} base={SICK} lightAmt={12} darkAmt={-20} />
        <RadialGrad id={snakeId} base={accent} />
        <RadialGrad id={hoodId} base="#3a4234" lightAmt={14} darkAmt={-16} />
      </defs>
      <Limb x1={54} y1={92} x2={40} y2={122} width={7} color={SICK} />
      <Limb x1={40} y1={122} x2={46} y2={150} width={6} color={SICK} />
      <Limb x1={54} y1={92} x2={70} y2={120} width={7} color={SICK} />
      <Limb x1={70} y1={120} x2={64} y2={150} width={6} color={SICK} />
      <path d="M46 150 h-10 M64 150 h10" stroke={INK} strokeWidth={2.4} fill="none" />

      <path d="M34 62 l-8 22 l7 -3 l3 -17 Z" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} opacity={0.9} />
      <path d="M76 60 l10 20 l-7 -1 l-5 -17 Z" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} opacity={0.9} />

      <path d="M50 54 Q44 62 48 78 Q49 88 56 92 L60 92 Q66 88 66 78 Q68 62 62 54 Q56 50 50 54 Z" fill={`url(#${skinId})`} stroke={INK} strokeWidth={3.2} />
      <Limb x1={50} y1={58} x2={32} y2={72} width={7} color={SICK} />
      <Limb x1={32} y1={72} x2={27} y2={92} width={6} color={SICK} />
      <Limb x1={62} y1={56} x2={78} y2={64} width={7} color={SICK} />
      <Limb x1={78} y1={64} x2={92} y2={56} width={6} color={SICK} />

      <path d="M74 68 q6 -8 12 -2 t12 -4 t10 -8" fill="none" stroke={`url(#${snakeId})`} strokeWidth={4.4} />
      <path d="M78 66 l2 3 M86 62 l2 3 M94 58 l2 3" stroke={shade(accent, -30)} strokeWidth={1.2} opacity={0.7} fill="none" />
      <circle cx={108} cy={50} r={4} fill={`url(#${snakeId})`} stroke={INK} strokeWidth={2} />
      <circle cx={110} cy={49} r={1} fill="#ffd166" stroke="none" />
      <path d="M112 50 l3 1 l-3 1" stroke="#e0554a" strokeWidth={1.3} fill="none" />

      <path d="M50 20 l-3 8 l4 -1 M74 20 l3 8 l-4 -1" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} />
      <path d="M53 22 q9 -6 18 0" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} opacity={0.9} />
      <circle cx={62} cy={30} r={9.5} fill={`url(#${skinId})`} stroke={INK} strokeWidth={3} />
      <path d="M58 27 v5 M66 27 v5" stroke={INK} strokeWidth={1.8} fill="none" />
      <path d="M62 39 v6 M62 45 l-3 3 M62 45 l3 3" stroke="#e0554a" strokeWidth={1.8} fill="none" />
    </g>
  );
}

// ---------- spider-bonded enemies ----------

function weaverFigure(accent: string, uid: string): ReactElement {
  const skinId = `${uid}-s`; const hoodId = `${uid}-h`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={skinId} base={SICK} lightAmt={12} darkAmt={-20} />
        <RadialGrad id={hoodId} base="#332a40" lightAmt={14} darkAmt={-16} />
      </defs>
      <Limb x1={54} y1={92} x2={40} y2={122} width={7} color={SICK} />
      <Limb x1={40} y1={122} x2={46} y2={150} width={6} color={SICK} />
      <Limb x1={54} y1={92} x2={70} y2={120} width={7} color={SICK} />
      <Limb x1={70} y1={120} x2={64} y2={150} width={6} color={SICK} />
      <path d="M46 150 h-10 M64 150 h10" stroke={INK} strokeWidth={2.4} fill="none" />

      <path d="M34 62 l-8 22 l7 -3 l3 -17 Z" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} opacity={0.9} />
      <path d="M76 60 l10 20 l-7 -1 l-5 -17 Z" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} opacity={0.9} />

      <path d="M50 54 Q44 62 48 78 Q49 88 56 92 L60 92 Q66 88 66 78 Q68 62 62 54 Q56 50 50 54 Z" fill={`url(#${skinId})`} stroke={INK} strokeWidth={3.2} />
      <Limb x1={50} y1={58} x2={32} y2={72} width={7} color={SICK} />
      <Limb x1={32} y1={72} x2={27} y2={92} width={6} color={SICK} />
      <Limb x1={62} y1={56} x2={78} y2={64} width={7} color={SICK} />
      <Limb x1={78} y1={64} x2={92} y2={56} width={6} color={SICK} />

      {/* thin web strands slung between the shoulders, with a spider riding one of them */}
      <path d="M64 58 q14 4 24 -4 M68 66 q16 2 28 -6 M96 54 q4 10 -2 20" fill="none" stroke={shade(accent, 30)} strokeWidth={1} opacity={0.6} />
      <SpiderCritter x={92} y={54} scale={0.85} accent={accent} uid={uid} />

      <path d="M50 20 l-3 8 l4 -1 M74 20 l3 8 l-4 -1" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} />
      <path d="M53 22 q9 -6 18 0" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2} opacity={0.9} />
      <circle cx={62} cy={30} r={9.5} fill={`url(#${skinId})`} stroke={INK} strokeWidth={3} />
      <path d="M58 27 v5 M66 27 v5" stroke={INK} strokeWidth={1.8} fill="none" />
      <path d="M62 39 v4" stroke={INK} strokeWidth={1.8} fill="none" />
      <path d="M58 41 l2.5 3 M66 41 l-2.5 3" stroke={INK} strokeWidth={1.6} fill="none" />
    </g>
  );
}

function vethraFigure(accent: string, uid: string): ReactElement {
  const skinId = `${uid}-s`; const hoodId = `${uid}-h`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={skinId} base={shade(SICK, -8)} lightAmt={10} darkAmt={-22} />
        <RadialGrad id={hoodId} base={accent} />
      </defs>
      <Limb x1={60} y1={98} x2={46} y2={126} width={9} color={SICK} />
      <Limb x1={46} y1={126} x2={44} y2={150} width={7} color={SICK} />
      <Limb x1={60} y1={98} x2={74} y2={126} width={9} color={SICK} />
      <Limb x1={74} y1={126} x2={76} y2={150} width={7} color={SICK} />
      <path d="M44 150 h-10 M76 150 h10" stroke={INK} strokeWidth={2.6} fill="none" />

      <path d="M60 46 Q52 56 55 76 Q56 90 60 98 Q64 90 65 76 Q68 56 60 46 Z" fill={`url(#${skinId})`} stroke={INK} strokeWidth={3.6} />
      <Limb x1={58} y1={54} x2={30} y2={68} width={8} color={SICK} />
      <Limb x1={30} y1={68} x2={20} y2={90} width={7} color={SICK} />
      <Limb x1={62} y1={54} x2={90} y2={66} width={8} color={SICK} />
      <Limb x1={90} y1={66} x2={100} y2={90} width={7} color={SICK} />

      {/* heavy webbing wrapped across the torso, with her own broodling riding her shoulder */}
      <path d="M40 60 q20 9 40 0 M40 72 q20 10 40 0 M40 84 q20 10 40 0 M42 96 q18 8 36 0" fill="none" stroke={`url(#${hoodId})`} strokeWidth={3.2} opacity={0.75} />
      <path d="M44 63 l3 3 M64 63 l3 3 M44 75 l3 3 M64 75 l3 3" stroke={shade(accent, -30)} strokeWidth={1.1} opacity={0.65} fill="none" />
      <SpiderCritter x={90} y={64} scale={1.3} accent={accent} uid={uid} />

      {/* a crown of web strands radiating from her head instead of a solid headdress */}
      <path d="M60 6 q-16 2 -22 16 M60 6 q-8 0 -16 10 M60 6 q8 0 16 10 M60 6 q16 2 22 16 M60 6 v14"
        fill="none" stroke={`url(#${hoodId})`} strokeWidth={2.6} opacity={0.9} />
      <SpiderCritter x={60} y={8} scale={0.6} accent={accent} uid={uid} />
      <circle cx={60} cy={24} r={11} fill={`url(#${skinId})`} stroke={INK} strokeWidth={3} />
      <path d="M55 21 v6 M65 21 v6" stroke={INK} strokeWidth={2} fill="none" />
      <path d="M60 35 v4" stroke={INK} strokeWidth={2} fill="none" />
      <path d="M55 37 l3 4 M65 37 l-3 4" stroke={INK} strokeWidth={1.8} fill="none" />
    </g>
  );
}

function sessikFigure(accent: string, uid: string): ReactElement {
  const skinId = `${uid}-s`; const hoodId = `${uid}-h`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={skinId} base={shade(SICK, -8)} lightAmt={10} darkAmt={-22} />
        <RadialGrad id={hoodId} base={accent} />
      </defs>
      <Limb x1={60} y1={98} x2={46} y2={126} width={9} color={SICK} />
      <Limb x1={46} y1={126} x2={44} y2={150} width={7} color={SICK} />
      <Limb x1={60} y1={98} x2={74} y2={126} width={9} color={SICK} />
      <Limb x1={74} y1={126} x2={76} y2={150} width={7} color={SICK} />
      <path d="M44 150 h-10 M76 150 h10" stroke={INK} strokeWidth={2.6} fill="none" />

      <path d="M60 46 Q52 56 55 76 Q56 90 60 98 Q64 90 65 76 Q68 56 60 46 Z" fill={`url(#${skinId})`} stroke={INK} strokeWidth={3.6} />
      <Limb x1={58} y1={54} x2={30} y2={68} width={8} color={SICK} />
      <Limb x1={30} y1={68} x2={20} y2={90} width={7} color={SICK} />
      <Limb x1={62} y1={54} x2={90} y2={66} width={8} color={SICK} />
      <Limb x1={90} y1={66} x2={100} y2={90} width={7} color={SICK} />

      <path d="M40 60 q20 9 40 0 M40 72 q20 10 40 0 M40 84 q20 10 40 0 M42 96 q18 8 36 0" fill="none" stroke={`url(#${hoodId})`} strokeWidth={5} />
      <path d="M44 63 l3 3 M64 63 l3 3 M44 75 l3 3 M64 75 l3 3" stroke={shade(accent, -30)} strokeWidth={1.1} opacity={0.65} fill="none" />
      <path d="M80 60 q12 -8 16 -20" fill="none" stroke={`url(#${hoodId})`} strokeWidth={5} />
      <circle cx={97} cy={36} r={5.5} fill={`url(#${hoodId})`} stroke={INK} strokeWidth={2.4} />
      <circle cx={99} cy={35} r={1.3} fill="#ffd166" stroke="none" />
      <path d="M102 36 l3 1 l-3 1" stroke="#e0554a" strokeWidth={1.4} fill="none" />

      <path d="M60 6 C38 8 30 36 46 46 L74 46 C90 36 82 8 60 6 Z" fill={`url(#${hoodId})`} stroke={INK} strokeWidth={4} />
      <path d="M46 20 q14 -8 28 0 M44 30 q16 -6 32 0" stroke={shade(accent, 34)} strokeWidth={2} opacity={0.55} fill="none" />
      <circle cx={60} cy={24} r={11} fill={`url(#${skinId})`} stroke={INK} strokeWidth={3} />
      <path d="M55 21 v6 M65 21 v6" stroke={INK} strokeWidth={2} fill="none" />
      <path d="M60 35 v6 M60 41 l-3 3 M60 41 l3 3" stroke="#e0554a" strokeWidth={2} fill="none" />
    </g>
  );
}

// ---------- the old chief: direwolf-bonded, no photo reference exists for him ----------

function oldChiefFigure(accent: string, uid: string): ReactElement {
  const furId = `${uid}-f`; const mantleId = `${uid}-m`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <RadialGrad id={furId} base={WOLF_GREY} lightAmt={16} darkAmt={-22} />
        <RadialGrad id={mantleId} base={shade(accent, -10)} lightAmt={10} darkAmt={-20} />
      </defs>
      <Limb x1={60} y1={98} x2={46} y2={126} width={9} color={WOLF_GREY} />
      <Limb x1={46} y1={126} x2={44} y2={150} width={7} color={WOLF_GREY} />
      <Limb x1={60} y1={98} x2={74} y2={126} width={9} color={WOLF_GREY} />
      <Limb x1={74} y1={126} x2={76} y2={150} width={7} color={WOLF_GREY} />
      <path d="M44 150 h-10 M76 150 h10" stroke={INK} strokeWidth={2.6} fill="none" />

      <path d="M60 46 Q52 56 55 76 Q56 90 60 98 Q64 90 65 76 Q68 56 60 46 Z" fill={`url(#${furId})`} stroke={INK} strokeWidth={3.6} />
      <Limb x1={58} y1={54} x2={30} y2={68} width={8} color={WOLF_GREY} />
      <Limb x1={30} y1={68} x2={20} y2={90} width={7} color={WOLF_GREY} />
      <Limb x1={62} y1={54} x2={90} y2={66} width={8} color={WOLF_GREY} />
      <Limb x1={90} y1={66} x2={100} y2={90} width={7} color={WOLF_GREY} />

      {/* a chief's pelt mantle draped across the shoulders, not a trophy - he is the wolf */}
      <path d="M38 58 Q60 70 82 58 L86 72 Q60 84 34 72 Z" fill={`url(#${mantleId})`} stroke={INK} strokeWidth={3} />
      <path d="M40 62 l4 8 M50 66 l3 9 M70 66 l-3 9 M80 62 l-4 8" stroke={shade(accent, -35)} strokeWidth={1.2} opacity={0.6} fill="none" />

      {/* pointed wolf ears and a forward muzzle, grizzled grey, one eye scarred from old fights */}
      <path d="M46 22 l-8 -14 l12 4 Z M74 22 l8 -14 l-12 4 Z" fill={`url(#${furId})`} stroke={INK} strokeWidth={2.6} />
      <ellipse cx={60} cy={30} rx={13} ry={11} fill={`url(#${furId})`} stroke={INK} strokeWidth={3} />
      <path d="M50 36 Q60 48 72 34 Q70 44 60 46 Q50 44 50 36 Z" fill={`url(#${furId})`} stroke={INK} strokeWidth={2.6} />
      <path d="M56 40 q4 3 8 0" stroke={INK} strokeWidth={1.6} fill="none" />
      <path d="M53 41 l2 2 M67 41 l-2 2" stroke={INK} strokeWidth={1.4} fill="none" />
      <circle cx={55} cy={27} r={1.8} fill={INK} stroke="none" />
      <circle cx={65} cy={27} r={1.8} fill={INK} stroke="none" />
      <path d="M50 22 l7 7 M52 20 l6 9" stroke="#e0554a" strokeWidth={1.3} opacity={0.75} fill="none" />
      <path d="M44 30 q3 -3 7 -2 M69 28 q4 -1 7 2" stroke={shade(WOLF_GREY, -25)} strokeWidth={1.2} fill="none" opacity={0.7} />
    </g>
  );
}

const FIGURES: Record<ArtId, (accent: string, uid: string) => ReactElement> = {
  mahery: (a, u) => maheryFigure(a, u),
  // never actually rendered: PHOTO_SETS covers every one of these art ids with real photos, but
  // the FIGURES record must stay total since ArtId includes them.
  'mahery-bear': (a, u) => maheryFigure(a, u),
  'mahery-moose': (a, u) => maheryFigure(a, u),
  'mahery-boar': (a, u) => maheryFigure(a, u),
  'mahery-wolf': (a, u) => maheryFigure(a, u),
  'mahery-elk': (a, u) => maheryFigure(a, u),
  'mahery-mountainLion': (a, u) => maheryFigure(a, u),
  'mahery-bobcat': (a, u) => maheryFigure(a, u),
  'mahery-buffalo': (a, u) => maheryFigure(a, u),
  'mahery-eagle': (a, u) => maheryFigure(a, u),
  'mahery-platypus': (a, u) => maheryFigure(a, u),
  'mahery-falcon': (a, u) => maheryFigure(a, u),
  'enemy-snake': (a, u) => skulkerFigure(a, u),
  'enemy-spider': (a, u) => weaverFigure(a, u),
  // never actually rendered: PHOTO_SETS covers these too, real crocodile/vulture/raven photos.
  'enemy-crocodile': (a, u) => skulkerFigure(a, u),
  'enemy-vulture': (a, u) => weaverFigure(a, u),
  'enemy-raven': (a, u) => weaverFigure(a, u),
  clanWarrior: (a, u) => maheryFigure(a, u),
  oldChief: (a, u) => oldChiefFigure(a, u),
  bear: (a, u) => quadruped(a, u, { build: 'heavy', ears: 'round', foot: 'paw', tail: 'stub', mane: true }),
  moose: (a, u) => quadruped(a, u, { build: 'lean', ears: 'long', foot: 'hoof', antlers: 'moose', tail: 'stub' }),
  boar: (a, u) => quadruped(a, u, { build: 'heavy', ears: 'pointed', foot: 'hoof', tusks: true, tail: 'long', mane: true }),
  wolf: (a, u) => quadruped(a, u, { build: 'lean', ears: 'pointed', foot: 'paw', tail: 'bushy' }),
  elk: (a, u) => quadruped(a, u, { build: 'lean', ears: 'long', foot: 'hoof', antlers: 'elk', tail: 'stub' }),
  platypus: (a, u) => platypusFigure(a, u),
  mountainLion: (a, u) => quadruped(a, u, { build: 'cat', ears: 'round', foot: 'paw', tail: 'long' }),
  bobcat: (a, u) => quadruped(a, u, { build: 'cat', ears: 'tuft', foot: 'paw', tail: 'bob', spots: true }),
  buffalo: (a, u) => quadruped(a, u, { build: 'heavy', ears: 'round', foot: 'hoof', horns: true, hump: true, mane: true, tail: 'long' }),
  eagle: (a, u) => bird(a, u, { paleHead: true, size: 'large' }),
  falcon: (a, u) => bird(a, u, { cap: true, size: 'small' }),
  skulker: (a, u) => skulkerFigure(a, u),
  sessik: (a, u) => sessikFigure(a, u),
  weaver: (a, u) => weaverFigure(a, u),
  vethra: (a, u) => vethraFigure(a, u),
};

interface SpriteProps {
  art: ArtId;
  color: string;
  /** rendered height in px; width follows the 120:160 aspect */
  size?: number;
  dimmed?: boolean;
  flip?: boolean;
  className?: string;
  title?: string;
  onClick?: () => void;
  /** stagger the idle bob so a group doesn't move in lockstep */
  delay?: number;
  /** Holds the photo sprite on one facing instead of auto-cycling through every angle: 'front'
   * is the resting/listening pose, 'toward' is the profile that (once `flip` is accounted for)
   * always reads as facing the opponent, whichever side of the field this unit is on. Battle and
   * dialogue pass this so two sides visibly face each other instead of drifting through a pose
   * that turns a fighter away from the fight; omit it to keep the old free-running showcase
   * cycle used by the bond-choice grid, where there's no "opponent" to face. */
  pose?: 'front' | 'toward';
  /** Gem ids worn in each necklace slot (null = empty). Mahery-only - pass this whenever this
   * Sprite IS Mahery so his equipped gems actually show up on him, not just as stat numbers on
   * the Items screen. */
  necklace?: (string | null)[];
}

// Many characters are now rendered from real photo references instead of the hand-drawn
// vector figures the rest still use: Mahery himself (a plain-human set shown before bonding
// and for any animal without hybrid art yet, plus a hero-hybrid set per bonded animal that has
// one), the companion animals that have reference art, and the two enemy lines (snake-bonded,
// spider-bonded). Each set's angles idle-cycle through a slow crossfade so the character reads
// as alive even though nothing about a still photo can be re-posed frame-by-frame; the CSS
// driving that lives in global.css under ".photo-sprite" (a 2-layer and a 3-layer cycle, picked
// by set size below). Art ids missing from this map (e.g. platypus, falcon-hero) keep using
// their SVG figure from FIGURES instead.
const photoSet = (dir: string) => [`${dir}/front.png`, `${dir}/right.png`, `${dir}/left.png`];
const PHOTO_SETS: Partial<Record<ArtId, string[]>> = {
  mahery: photoSet('/art/mahery/default'),
  'mahery-bear': photoSet('/art/mahery/bear'),
  'mahery-moose': photoSet('/art/mahery/moose'),
  'mahery-boar': photoSet('/art/mahery/boar'),
  'mahery-wolf': photoSet('/art/mahery/wolf'),
  'mahery-elk': photoSet('/art/mahery/elk'),
  'mahery-mountainLion': photoSet('/art/mahery/mountainLion'),
  'mahery-bobcat': photoSet('/art/mahery/bobcat'),
  'mahery-buffalo': photoSet('/art/mahery/buffalo'),
  'mahery-eagle': photoSet('/art/mahery/eagle'),
  'mahery-platypus': photoSet('/art/mahery/platypus'),
  'mahery-falcon': photoSet('/art/mahery/falcon'),
  bear: photoSet('/art/companions/bear'),
  moose: photoSet('/art/companions/moose'),
  boar: photoSet('/art/companions/boar'),
  wolf: photoSet('/art/companions/wolf'),
  elk: photoSet('/art/companions/elk'),
  mountainLion: photoSet('/art/companions/mountainLion'),
  bobcat: photoSet('/art/companions/bobcat'),
  buffalo: photoSet('/art/companions/buffalo'),
  eagle: photoSet('/art/companions/eagle'),
  falcon: photoSet('/art/companions/falcon'),
  platypus: photoSet('/art/companions/platypus'),
  'enemy-snake': photoSet('/art/enemies/snake'),
  'enemy-spider': photoSet('/art/enemies/spider'),
  'enemy-crocodile': photoSet('/art/enemies/crocodile'),
  'enemy-vulture': photoSet('/art/enemies/vulture'),
  'enemy-raven': photoSet('/art/enemies/raven'),
  // Yorrun is Direwolf-bonded - close enough to reuse the proven wolf hero-hybrid photos
  // rather than a hand-drawn figure (oldChiefFigure exists as a fallback but reads poorly
  // at small sizes; real reference art wins whenever it's a reasonable fit).
  oldChief: photoSet('/art/mahery/wolf'),
};
const PHOTO_CYCLE_STEP_SECONDS = 3;

export function Sprite({ art, color, size = 160, dimmed, flip, className = '', title, onClick, delay = 0, pose, necklace }: SpriteProps) {
  // Namespace this instance's gradient ids so two sprites on screen at once (e.g. the bond
  // grid's 11 companions) never resolve to each other's <radialGradient> definitions.
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const boxStyle = { width: size * 0.75, height: size };
  // The flip lives on its own static wrapper, never on an element that also carries a CSS
  // keyframe animation touching `transform` (photo-sway does): once a transform-animation is
  // running on an element, its keyframe values completely replace any inline `transform` for
  // that element for as long as it runs, silently dropping the mirror - the bug that meant
  // enemies were never actually shown facing the party. A plain, unanimated wrapper box can't
  // lose the flip that way.
  const flipStyle: CSSProperties = { ...boxStyle, transform: flip ? 'scaleX(-1)' : undefined };
  const photos = PHOTO_SETS[art];
  // Every photo sprite gets its own random phase (crossfade), sway timing, and limb-sway timing,
  // fixed once at mount, so a row of companions - or the two party members standing side by side
  // - never hold, turn, or breathe in lockstep. Without this every instance shares the same
  // animation clock and visibly moves as one unit.
  const phase = useMemo(() => Math.random() * 10, []);
  const swayDelay = useMemo(() => -(Math.random() * 5), []);
  const swayDuration = useMemo(() => 4.2 + Math.random() * 1.6, []);
  const limbDelay = useMemo(() => -(Math.random() * 4), []);
  const limbDuration = useMemo(() => 3.2 + Math.random() * 1.4, []);
  const limbVars = { '--limb-dur': `${limbDuration}s`, '--limb-delay': `${limbDelay}s` } as CSSProperties;
  return (
    <div
      className={`sprite ${className}`}
      style={{ opacity: dimmed ? 0.4 : 1, animationDelay: `${delay}s` }}
      onClick={onClick}
      title={title}
      data-art={art}
    >
      <div className="sprite-flip" style={flipStyle}>
        {photos && pose ? (
          // Posed mode (combat units, dialogue portraits) always renders the front-facing photo -
          // never the turnaround's side angles, whose "toward camera" side isn't consistent from
          // one character's reference art to the next (some are a 3/4 front turn, some are nearly
          // a back view) - so a fighter never ends up appearing to face away from the fight. The
          // 'toward' pose state instead reads as a slightly bigger, leaning-in sway on the same
          // photo, via the .engaged class below.
          <div
            className={`photo-sprite photo-posed ${pose === 'toward' ? 'engaged' : ''}`}
            style={{ animationDelay: `${swayDelay}s`, animationDuration: `${swayDuration}s` }}
            role="img"
            aria-label={title}
          >
            <div className="photo-sprite-shadow" />
            <div className="limb-band band-upper" style={{ ...limbVars, backgroundImage: `url(${photos[0]})` }} />
            <div className="limb-band band-lower" style={{ ...limbVars, backgroundImage: `url(${photos[0]})` }} />
          </div>
        ) : photos ? (
          <div
            className="photo-sprite"
            style={{ animationDelay: `${swayDelay}s`, animationDuration: `${swayDuration}s` }}
            role="img"
            aria-label={title}
          >
            <div className="photo-sprite-shadow" />
            {photos.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className={`photo-sprite-layer ${photos.length === 2 ? 'cycle-2' : 'cycle-3'} ${i % 2 === 0 ? 'drift-a' : 'drift-b'}`}
                style={{ animationDelay: `${-(i * PHOTO_CYCLE_STEP_SECONDS + phase)}s` }}
              />
            ))}
          </div>
        ) : (
          <svg viewBox="0 0 120 160" aria-label={title} role="img">
            <ellipse cx="60" cy="154" rx="34" ry="5" fill="rgba(0,0,0,0.35)" />
            {FIGURES[art](color, uid)}
          </svg>
        )}
      </div>
      {necklace && necklace.some((id) => id) && (
        // Sits outside .sprite-flip so it's never mirrored - necklace is Mahery-only, and Mahery
        // is never flip'd, but this keeps gem order stable regardless. A thin gold choker band
        // (generic, not per-character - the source art is one 3/4 studio angle that can't be
        // fitted to 11 different necks) sits behind the row of real gem icons, so every hybrid
        // form reads as "wearing a necklace" rather than just floating colored stones.
        <div className="necklace-gems">
          <svg className="necklace-band" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={`band-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f6e2a0" />
                <stop offset="50%" stopColor="#c9973f" />
                <stop offset="100%" stopColor="#6e4f18" />
              </linearGradient>
            </defs>
            <path d="M3,9 Q50,15 97,9 L97,15 Q50,21 3,15 Z" fill={`url(#band-${uid})`} stroke="#4a3610" strokeWidth="1" />
          </svg>
          <div className="necklace-gem-row">
            {necklace.map((id, i) => {
              if (!id) return null;
              const gem = getGem(id);
              const gemColor = GEM_KIND_COLOR[gem.kind];
              return (
                <img
                  key={i}
                  src={GEM_KIND_ICON[gem.kind]}
                  alt=""
                  className="gem-dot"
                  style={{ filter: `drop-shadow(0 0 3px ${gemColor}) drop-shadow(0 1px 1px rgba(0,0,0,0.6))` }}
                  title={gem.name}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CSS class for the caster's one-shot attack animation, keyed by skill.anim and which side of
 * the field the unit is on (player units lunge right toward enemies; enemy units lunge left
 * toward the player, matching how they're already positioned and flipped to face each other).
 */
function attackClassFor(anim: AnimStyle | undefined, side: Unit['side']): string {
  if (!anim) return '';
  const dir = side === 'enemy' ? 'l' : 'r';
  switch (anim) {
    case 'strike': return `atk-strike-${dir}`;
    case 'charge': return `atk-charge-${dir}`;
    case 'venom': return `atk-venom-${dir}`;
    case 'diveStrike': return `atk-dive-strike-${dir}`;
    case 'cast': return 'atk-cast';
    case 'aoe': return 'atk-aoe';
    case 'dive': return 'atk-dive-up';
  }
}

/**
 * Which impact effect flashes on the TARGET when a hit lands, keyed by the attacking skill's
 * anim style: a bladed/blunt hit reads as three crossing slash marks, anything projected or cast
 * at range (a spit, a bolt, a spell) reads as a beam shooting in. Skyfall's landing strike counts
 * as a slash too; the leap itself ('dive') isn't an impact and gets nothing here.
 */
function impactEffectFor(anim: AnimStyle | undefined): 'slash' | 'beam' | null {
  switch (anim) {
    case 'strike': case 'charge': case 'diveStrike': return 'slash';
    case 'venom': case 'cast': case 'aoe': return 'beam';
    default: return null;
  }
}

const FLOAT_LABEL: Record<NonNullable<Unit['lastHit']>['kind'], (n: number) => string> = {
  damage: (n) => `-${n}`,
  crit: (n) => `-${n}!`,
  heal: (n) => `+${n}`,
  miss: () => 'miss',
  shield: (n) => `+${n} shield`,
  poison: (n) => `-${n}`,
};

interface UnitSpriteProps {
  unit: Unit;
  size?: number;
  active?: boolean;
  targetable?: boolean;
  onClick?: () => void;
  /** null hides the label entirely */
  label?: string | null;
  delay?: number;
  /** Mahery's equipped gems, shown on his necklace - pass only when `unit` is Mahery. */
  necklace?: (string | null)[];
}

/** A combat unit's figure with floating damage numbers and a name label. */
export function UnitSprite({ unit, size = 170, active, targetable, onClick, label, delay, necklace }: UnitSpriteProps) {
  const down = unit.health <= 0;
  const airborne = !down && unit.statuses.some((st) => st.id === 'airborne');
  const charging = !down && unit.statuses.some((st) => st.id === 'charging');
  const cls = [
    down ? 'down' : '', active ? 'active-glow' : '', targetable && !down ? 'targetable' : '',
    airborne ? 'airborne' : '', charging ? 'charging' : '', unit.corrupted ? 'corrupted-kin' : '',
  ].filter(Boolean).join(' ');
  const hit = unit.lastHit;
  // A real hit shakes the target; a dodge or a killing blow (already collapsing) does not.
  const flinch = !down && !!hit && hit.kind !== 'miss';
  const attackCls = attackClassFor(unit.lastAction?.anim, unit.side);
  const impact = hit && (hit.kind === 'damage' || hit.kind === 'crit') ? impactEffectFor(hit.effectAnim) : null;
  // Two fighters should read as facing each other, not drift through a pose that turns one of
  // them away from the fight. Default to the resting 'front' pose; lean into the 'toward' (facing
  // the opponent) pose only while it's this unit's turn, or briefly after it lands/takes a hit -
  // so the pose changes because something happened, not on a constant timer.
  const [hitFlash, setHitFlash] = useState(false);
  useEffect(() => {
    if (!hit) return;
    setHitFlash(true);
    const t = setTimeout(() => setHitFlash(false), 1000);
    return () => clearTimeout(t);
  }, [hit?.seq]);
  const pose: 'front' | 'toward' = active || hitFlash ? 'toward' : 'front';
  return (
    <div className="sprite-wrap">
      <div key={`act-${unit.lastAction?.seq ?? 0}`} className={`attack-anchor ${attackCls}`}>
        <div key={`hit-${hit?.seq ?? 0}`} className={`hit-frame ${flinch ? 'flinch' : ''}`}>
          <Sprite
            art={unit.art}
            color={unit.color}
            size={unit.corrupted ? size * 1.3 : unit.isBoss ? size * 1.2 : size}
            flip={unit.side === 'enemy'}
            className={cls}
            title={unit.name}
            onClick={targetable && !down ? onClick : undefined}
            delay={delay}
            pose={pose}
            necklace={necklace}
          />
          {impact === 'slash' && (
            <div className="impact-slash">
              <span className="slash-mark" />
              <span className="slash-mark" />
              <span className="slash-mark" />
            </div>
          )}
          {impact === 'beam' && <div className={`impact-beam ${unit.side === 'enemy' ? 'from-left' : 'from-right'}`} />}
        </div>
      </div>
      {hit && <span key={hit.seq} className={`float ${hit.kind}`}>{FLOAT_LABEL[hit.kind](hit.amount)}</span>}
      {label !== null && <div className="sprite-label">{label ?? unit.name}</div>}
    </div>
  );
}
