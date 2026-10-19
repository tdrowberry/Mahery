import { describe, expect, it } from 'vitest';
import { attackTimingFor, travelKeyframes } from '../Sprite';
import type { Unit } from '../../engine/combat';

const actor = { art: 'skulker', lastAction: { seq: 1, anim: 'strike' } } as Unit;
describe('combat motion timing', () => {
  it.each([50, 300, 900])('holds at the target throughout the clip at distance %i', (distance) => {
    const timing = attackTimingFor(actor, distance)!;
    expect(timing.impactMs).toBeGreaterThan(timing.travelInMs);
    expect(timing.impactMs).toBeLessThan(timing.travelInMs + timing.holdMs);
    const css = travelKeyframes('test', timing, distance, -40);
    const arrival = timing.travelInMs / timing.totalMs * 100;
    const departure = (timing.travelInMs + timing.holdMs) / timing.totalMs * 100;
    expect(css).toContain(`${arrival}% { transform: translate3d(${distance}px,-40px,0)`);
    expect(css).toContain(`${departure}% { transform: translate3d(${distance}px,-40px,0)`);
    expect(css).toContain('100% { transform: translate3d(0px,0px,0)');
  });
  it('keeps support casts in place', () => {
    const caster = { ...actor, lastAction: { seq: 1, anim: 'cast' as const } };
    expect(attackTimingFor(caster, 900)?.travelInMs).toBe(0);
  });
});
