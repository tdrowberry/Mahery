// Retimes the looping idle clips in place by rewriting each animated-WebP frame's duration field.
// Pixel data is untouched, so it's lossless and file sizes don't change. The exported idle loops
// run in ~1.02s; the game plays them at 45% speed (2267ms). Re-run after any idle re-export -
// it targets an absolute loop length, so running it twice is harmless.
//
//   node reference-art/animation-library/retime-idle-clips.mjs [loopMs=2267]
//
// Keep the default in sync with IDLE_MS in src/data/idleDeathAnimations.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const loopMs = Number(process.argv[2] ?? 2267);
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/art/animations/idle-death');

let files = 0;
for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('-idle-animated-v2.webp'))) {
  const file = path.join(dir, name);
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${name}: not a WebP`);

  // Walk the RIFF chunks; an ANMF chunk's payload has the frame duration (24-bit LE ms) at byte 12.
  const durationAt = [];
  for (let pos = 12; pos + 8 <= buf.length;) {
    const size = buf.readUInt32LE(pos + 4);
    if (buf.toString('ascii', pos, pos + 4) === 'ANMF') durationAt.push(pos + 8 + 12);
    pos += 8 + size + (size & 1);
  }
  if (durationAt.length === 0) throw new Error(`${name}: no animation frames`);

  // Spread the loop evenly across the frames, rounding cumulatively so the total is exact.
  let prevEnd = 0;
  durationAt.forEach((at, i) => {
    const end = Math.round(((i + 1) * loopMs) / durationAt.length);
    const d = end - prevEnd;
    prevEnd = end;
    buf[at] = d & 0xff;
    buf[at + 1] = (d >> 8) & 0xff;
    buf[at + 2] = (d >> 16) & 0xff;
  });
  fs.writeFileSync(file, buf);
  files++;
}
console.log(`retimed ${files} idle clips to ${loopMs}ms loops`);
