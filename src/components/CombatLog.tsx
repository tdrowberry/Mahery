import { useEffect, useRef } from 'react';
import type { LogEntry } from '../engine/combat';

export function CombatLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);
  return (
    <div className="log" ref={ref} data-testid="combat-log">
      {entries.map((e) => (
        <div key={e.seq} className={`l-${e.kind}`}>{e.text}</div>
      ))}
    </div>
  );
}
