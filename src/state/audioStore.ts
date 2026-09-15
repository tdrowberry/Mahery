import { create } from 'zustand';

// Device-level audio preference, not part of a save file - it should stick around even before
// a game is started (title screen music) and isn't something you'd want per-character anyway.
const VOLUME_KEY = 'mahery.music.volume';
const MUTED_KEY = 'mahery.music.muted';

function readVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 0.45;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.45;
  } catch { return 0.45; }
}
function readMuted(): boolean {
  try { return localStorage.getItem(MUTED_KEY) === '1'; } catch { return false; }
}

interface AudioSettingsState {
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  toggleMuted: () => void;
}

export const useAudioSettings = create<AudioSettingsState>((set, get) => ({
  volume: readVolume(),
  muted: readMuted(),
  setVolume: (v) => {
    const clamped = Math.min(1, Math.max(0, v));
    try { localStorage.setItem(VOLUME_KEY, String(clamped)); } catch { /* ignore */ }
    set({ volume: clamped });
  },
  setMuted: (m) => {
    try { localStorage.setItem(MUTED_KEY, m ? '1' : '0'); } catch { /* ignore */ }
    set({ muted: m });
  },
  toggleMuted: () => {
    const next = !get().muted;
    try { localStorage.setItem(MUTED_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    set({ muted: next });
  },
}));
