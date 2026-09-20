import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IDLE_PHASES, readClipFrames, rotateIdleClip, type ClipFrame } from '../idlePhase';

// These run against the idle clips that actually ship, so re-exporting them in a way that
// breaks out-of-step idles (no keyframes left to start on, say) fails here rather than quietly
// putting every fighter back in lockstep.
const DIR = 'public/art/animations/idle-death';
const CLIPS = readdirSync(DIR).filter((f) => f.endsWith('-idle-animated-v2.webp'));
const load = (name: string) => new Uint8Array(readFileSync(`${DIR}/${name}`));

// An ANMF chunk is an 8-byte chunk header, then a 16-byte frame header (x, y, width, height,
// duration, flags), then the frame's image data.
const duration = (b: Uint8Array, f: ClipFrame) => b[f.start + 20] | (b[f.start + 21] << 8) | (b[f.start + 22] << 16);
const flags = (b: Uint8Array, f: ClipFrame) => b[f.start + 23];
const picture = (b: Uint8Array, f: ClipFrame) => Buffer.from(b.subarray(f.start + 24, f.end)).toString('base64');
const frames = (b: Uint8Array) => readClipFrames(b) as ClipFrame[];

describe('out-of-step idle clips', () => {
  it('found the shipped idle clips to test against', () => {
    expect(CLIPS.length).toBeGreaterThanOrEqual(30);
  });

  it('keeps slot 0 on the file exactly as shipped', () => {
    expect(IDLE_PHASES[0]).toEqual({ at: 0, speed: 1 });
  });

  it('gives every shipped clip a different starting frame for every other slot', () => {
    for (const name of CLIPS) {
      const original = load(name);
      const starts = IDLE_PHASES.slice(1).map((p) => rotateIdleClip(original, p.at, p.speed)?.startFrame);
      expect(starts.every((s) => s !== undefined && s > 0), `${name} can start each slot on a keyframe`).toBe(true);
      expect(new Set(starts).size, `${name} slots start on different frames`).toBe(starts.length);
    }
  });

  it('only reorders the frames: same size, same header, same pictures in shifted order', () => {
    for (const name of CLIPS) {
      const original = load(name);
      const rotated = rotateIdleClip(original, 0.45, 1);
      expect(rotated, name).not.toBeNull();
      const { bytes, startFrame } = rotated!;
      const before = frames(original);
      const after = frames(bytes);
      expect(bytes.length).toBe(original.length);
      expect(Buffer.from(bytes.subarray(0, before[0].start)).equals(Buffer.from(original.subarray(0, before[0].start)))).toBe(true);
      expect(after.length).toBe(before.length);
      after.forEach((f, j) => {
        expect(picture(bytes, f), `${name} frame ${j}`).toBe(picture(original, before[(startFrame + j) % before.length]));
      });
    }
  });

  it('starts on a complete picture, so it never depends on a frame it no longer follows', () => {
    for (const name of CLIPS) {
      const rotated = rotateIdleClip(load(name), 0.2, 1)!;
      expect(frames(rotated.bytes)[0].keyframe, name).toBe(true);
    }
  });

  it('clears the canvas after the old last frame, and changes no other frame flag', () => {
    for (const name of CLIPS) {
      const original = load(name);
      const before = frames(original);
      const { bytes, startFrame } = rotateIdleClip(original, 0.7, 1)!;
      const after = frames(bytes);
      after.forEach((f, j) => {
        const oldIndex = (startFrame + j) % before.length;
        const expected = oldIndex === before.length - 1 ? flags(original, before[oldIndex]) | 1 : flags(original, before[oldIndex]);
        expect(flags(bytes, f), `${name} frame ${j}`).toBe(expected);
      });
    }
  });

  it('scales every frame duration by the speed', () => {
    const original = load(CLIPS[0]);
    const before = frames(original);
    const { bytes, startFrame } = rotateIdleClip(original, 0.45, 1.05)!;
    frames(bytes).forEach((f, j) => {
      expect(duration(bytes, f)).toBe(Math.round(duration(original, before[(startFrame + j) % before.length]) / 1.05));
    });
  });

  it('refuses anything it cannot shift safely', () => {
    const original = load(CLIPS[0]);
    expect(rotateIdleClip(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]), 0.45)).toBeNull();
    expect(rotateIdleClip(original.subarray(0, 400), 0.45)).toBeNull();
    // no frame is a keyframe once the "don't blend" bit is cleared everywhere
    const blended = original.slice();
    for (const f of frames(original)) blended[f.start + 23] &= ~2;
    expect(rotateIdleClip(blended, 0.45)).toBeNull();
  });
});
