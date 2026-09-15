import { useMemo } from 'react';

/** A handful of slow-drifting embers over the whole viewport, behind every screen - the fixed
 * "steel panel" screens never fill the full window, and a plain black void below/around them
 * read as broken rather than atmospheric. Rendered once at the app root (before the screen
 * switch, so DOM order alone keeps it behind real content - no z-index tricks needed). */
export function Embers() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        key: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 2.5,
        duration: 9 + Math.random() * 10,
        delay: -(Math.random() * 18),
        drift: (Math.random() - 0.5) * 60,
      })),
    [],
  );
  return (
    <div className="embers" aria-hidden="true">
      {sparks.map((s) => (
        <span
          key={s.key}
          className="ember"
          style={{
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            ['--drift' as string]: `${s.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
