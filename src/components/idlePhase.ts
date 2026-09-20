import { useEffect, useState } from 'react';

// Fighters that rest on the same looping clip (three skulkers, say) move in perfect lockstep: the
// browser keeps ONE animation clock per image URL, so every <img> pointing at that URL shows the
// same frame at the same moment no matter when it mounted. To break that up each fighter gets its
// own copy of the clip, rebuilt in memory (nothing is re-encoded) so it starts at a different
// point in the loop and runs a touch faster or slower than the shipped file.
//
// A WebP animation stores most frames as small patches on top of the previous one, so a loop can
// only start at a frame that is a complete picture by itself - the exporter drops one of those in
// every few frames (a "keyframe": whole canvas, no blending). Starting at one and carrying on
// round to the frames before it is just a reordering of the same chunks. One seam needs care: the
// file's first frame is a patch that expects the clean canvas the browser hands it at every loop
// start, but in the reordered file it follows the last frame - so that frame is flagged "clear the
// canvas afterwards", which gives it the same clean slate.

/** How a field slot's idle differs from the shipped clip: `at` is how far round the loop its copy
 * starts (0..1, snapped to the nearest keyframe) and `speed` its playback rate. Slot 0 is the
 * shipped file itself; the rest are spread out so the most fighters that share a screen all land
 * on different points, with rates just different enough that they keep drifting apart. */
export const IDLE_PHASES: readonly { at: number; speed: number }[] = [
  { at: 0, speed: 1 },
  { at: 0.45, speed: 0.96 },
  { at: 0.2, speed: 1.05 },
  { at: 0.7, speed: 0.98 },
];

const tag = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const u24 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32 = (b: Uint8Array, o: number) => (u24(b, o) | (b[o + 3] << 24)) >>> 0;

/** Offsets inside an ANMF chunk (counted from the chunk's own start, so past its 8-byte header):
 * the frame's duration in ms (3 bytes) and its flags byte (bit 1: don't blend; bit 0: clear the
 * frame's area afterwards). Before those come x/2, y/2, width-1 and height-1, 3 bytes each. */
const ANMF_DURATION = 8 + 12;
const ANMF_FLAGS = 8 + 15;

export interface ClipFrame {
  /** byte range of the whole ANMF chunk, header included */
  start: number;
  end: number;
  /** covers the whole canvas without blending, so it never depends on an earlier frame */
  keyframe: boolean;
}

/** The frames of an animated WebP in file order, or null if this isn't a plain animation
 * (frames back to back, at least two). */
export function readClipFrames(bytes: Uint8Array): ClipFrame[] | null {
  if (bytes.length < 12 || tag(bytes, 0) !== 'RIFF' || tag(bytes, 8) !== 'WEBP') return null;
  let canvasW = 0;
  let canvasH = 0;
  const frames: ClipFrame[] = [];
  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const size = u32(bytes, pos + 4);
    const body = pos + 8;
    const end = body + size + (size & 1);
    if (end > bytes.length) return null;
    const type = tag(bytes, pos);
    if (type === 'VP8X') {
      canvasW = u24(bytes, body + 4) + 1;
      canvasH = u24(bytes, body + 7) + 1;
    } else if (type === 'ANMF') {
      const whole = u24(bytes, body) === 0 && u24(bytes, body + 3) === 0
        && u24(bytes, body + 6) + 1 === canvasW && u24(bytes, body + 9) + 1 === canvasH;
      frames.push({ start: pos, end, keyframe: whole && (bytes[body + 15] & 2) !== 0 });
    }
    pos = end;
  }
  if (frames.length < 2) return null;
  for (let i = 1; i < frames.length; i++) if (frames[i].start !== frames[i - 1].end) return null;
  return frames;
}

/** A copy of an idle clip that starts `at` of the way round its loop (on the nearest keyframe)
 * and plays `speed` times as fast. Null when the file can't be shifted safely - no keyframe to
 * start on, or not an animation this understands - so callers just keep the shipped clip. */
export function rotateIdleClip(bytes: Uint8Array, at: number, speed = 1): { bytes: Uint8Array; startFrame: number } | null {
  const frames = readClipFrames(bytes);
  if (!frames) return null;
  const target = at * frames.length;
  let startFrame = -1;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].keyframe && (startFrame < 0 || Math.abs(i - target) < Math.abs(startFrame - target))) startFrame = i;
  }
  if (startFrame < 0) return null;

  const out = new Uint8Array(bytes.length);
  out.set(bytes.subarray(0, frames[0].start));
  const placedAt: number[] = [];
  let write = frames[0].start;
  const indices = frames.map((_, i) => i);
  for (const i of [...indices.slice(startFrame), ...indices.slice(0, startFrame)]) {
    const f = frames[i];
    out.set(bytes.subarray(f.start, f.end), write);
    placedAt[i] = write;
    const scaled = Math.max(1, Math.round(u24(out, write + ANMF_DURATION) / speed));
    out[write + ANMF_DURATION] = scaled & 255;
    out[write + ANMF_DURATION + 1] = (scaled >> 8) & 255;
    out[write + ANMF_DURATION + 2] = (scaled >> 16) & 255;
    write += f.end - f.start;
  }
  out.set(bytes.subarray(frames[frames.length - 1].end), write);
  // The seam: the original last frame now runs straight into the original first frame.
  out[placedAt[frames.length - 1] + ANMF_FLAGS] |= 1;
  return { bytes: out, startFrame };
}

/** Finished copies, oldest first - capped so a long session doesn't pile up megabyte-sized blobs.
 * A battle only ever holds a handful, so an evicted copy is never one still on screen. */
const MAX_COPIES = 12;
const built = new Map<string, string>();
const building = new Map<string, Promise<string | undefined>>();

function remember(key: string, url: string) {
  built.delete(key);
  built.set(key, url);
  while (built.size > MAX_COPIES) {
    const oldest = built.keys().next().value as string;
    URL.revokeObjectURL(built.get(oldest) as string);
    built.delete(oldest);
  }
}

function copyFor(src: string, key: string, phase: { at: number; speed: number }): Promise<string | undefined> {
  const pending = building.get(key);
  if (pending) return pending;
  const job = (async () => {
    try {
      const res = await fetch(src);
      if (!res.ok) return undefined;
      const rotated = rotateIdleClip(new Uint8Array(await res.arrayBuffer()), phase.at, phase.speed);
      if (!rotated) return undefined;
      const url = URL.createObjectURL(new Blob([rotated.bytes as BlobPart], { type: 'image/webp' }));
      // Decode it once up front so swapping it onto the <img> is instant instead of a blank flash -
      // but decode() waits for a rendered frame, so a page that isn't being painted (a backgrounded
      // app) must not be able to hold the swap hostage.
      const probe = new Image();
      probe.src = url;
      await Promise.race([probe.decode().catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 300))]);
      remember(key, url);
      return url;
    } catch {
      return undefined;
    } finally {
      building.delete(key);
    }
  })();
  building.set(key, job);
  return job;
}

/** The idle clip URL a fighter in field slot `slot` should rest on: its own out-of-step copy of
 * `src` once that's ready, the shipped file until then (or forever, if a copy can't be made -
 * the fighter then just moves in step with its neighbours like before). */
export function useIdlePhase(src: string | undefined, slot: number): string | undefined {
  const phaseIndex = slot % IDLE_PHASES.length;
  const key = src && phaseIndex > 0 ? `${src}@${phaseIndex}` : undefined;
  const [copy, setCopy] = useState<{ key: string; url: string } | null>(() => {
    const url = key ? built.get(key) : undefined;
    return key && url ? { key, url } : null;
  });
  useEffect(() => {
    if (!src || !key) return;
    const ready = built.get(key);
    if (ready) { setCopy({ key, url: ready }); return; }
    let cancelled = false;
    void copyFor(src, key, IDLE_PHASES[phaseIndex]).then((url) => {
      if (!cancelled && url) setCopy({ key, url });
    });
    return () => { cancelled = true; };
  }, [key]);
  return copy && copy.key === key ? copy.url : src;
}
