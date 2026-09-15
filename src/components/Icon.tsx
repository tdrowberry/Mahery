import type { ReactElement } from 'react';
import type { IconId } from '../data/types';

// Skill glyphs for the action bar, ability tree and pool. Simple line art in a 40x40 box,
// drawn in the animal's accent color on a dark disc.

const GLYPHS: Record<IconId, ReactElement> = {
  slash: <path d="M9 9 L31 31 M15 8 L33 26 M8 15 L26 33" />,
  shield: <path d="M20 6 L32 11 V20 C32 28 26 33 20 35 C14 33 8 28 8 20 V11 Z" />,
  roar: <path d="M14 20 a6 6 0 1 1 12 0 M9 14 a12 12 0 1 1 22 0 M6 9 a17 17 0 1 1 28 0 M20 24 v10" />,
  heal: <path d="M20 8 V32 M8 20 H32 M12 12 l16 16 M28 12 l-16 16" strokeWidth={3} />,
  guardAlly: <path d="M14 10 a4 4 0 1 0 0.1 0 M26 10 a4 4 0 1 0 0.1 0 M6 34 v-8 a8 8 0 0 1 16 0 v8 M18 34 v-8 a8 8 0 0 1 16 0 v8" />,
  resolve: <path d="M20 5 L34 12 V22 C34 29 27 34 20 36 C13 34 6 29 6 22 V12 Z M14 20 l4 4 8 -8" />,
  charge: <path d="M6 20 H26 M18 12 L28 20 L18 28 M8 10 l4 -5 M8 30 l4 5 M30 8 l4 4 M32 26 l4 3" />,
  rampage: <path d="M20 6 C10 14 8 22 12 30 C16 34 24 34 28 30 C32 22 30 14 20 6 Z M16 30 L20 20 L24 30" />,
  pack: <path d="M8 26 l6 -8 6 8 M20 26 l6 -8 6 8 M12 14 l2 -6 4 6 M22 14 l2 -6 4 6 M6 34 h28" />,
  blessing: <path d="M20 6 v8 M20 26 v8 M6 20 h8 M26 20 h8 M11 11 l5 5 M24 24 l5 5 M29 11 l-5 5 M16 24 l-5 5 M20 16 a4 4 0 1 0 0.1 0" />,
  venom: <path d="M20 6 C14 14 10 20 10 26 a10 10 0 0 0 20 0 C30 20 26 14 20 6 Z M16 26 a4 4 0 0 0 4 4" />,
  pounce: <path d="M6 30 C12 18 18 12 30 8 M22 8 l8 0 0 8 M8 30 l6 -2 M12 34 l2 -6 M14 18 l3 3 M22 14 l3 3" />,
  shadow: <path d="M20 6 a14 14 0 1 0 0.1 0 M24 10 a10 10 0 1 0 6 16 A9 9 0 0 1 24 10 Z" />,
  stampede: <path d="M6 24 h28 M8 18 l6 -8 M18 18 l6 -8 M28 18 l6 -8 M6 32 h6 M16 32 h6 M26 32 h6" />,
  dive: <path d="M20 6 v22 M12 20 l8 8 8 -8 M8 34 h24 M6 10 l6 4 M34 10 l-6 4" />,
  wind: <path d="M6 14 h18 a4 4 0 1 0 -4 -4 M6 22 h24 a4 4 0 1 1 -4 4 M6 30 h14 a3 3 0 1 0 -3 -3" />,
  power: <path d="M14 14 H26 V22 A6 6 0 0 1 14 22 Z M9 9 l4 4 M31 9 l-4 4 M6 24 l6 -2 M34 24 l-6 -2" />,
  weaken: <path d="M20 5 V19 M14 13 l6 6 6 -6 M9 25 H31 M13 31 H27" />,
  rally: <path d="M20 30 C10 22 8 14 14 10 C18 7 20 11 20 11 C20 11 22 7 26 10 C32 14 30 22 20 30 Z M20 6 v6 M17 9 h6" />,
};

interface IconProps {
  icon: IconId;
  color: string;
  size?: number;
  dim?: boolean;
  className?: string;
}

export function SkillIcon({ icon, color, size = 44, dim, className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={`skill-icon ${className}`} style={{ opacity: dim ? 0.35 : 1 }}>
      <circle cx="20" cy="20" r="19" fill="#141110" stroke={color} strokeWidth="2" />
      <g fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {GLYPHS[icon]}
      </g>
    </svg>
  );
}
