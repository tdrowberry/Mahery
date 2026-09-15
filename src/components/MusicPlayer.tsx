import { useEffect, useRef } from 'react';
import { useGame } from '../state/gameStore';
import { useAudioSettings } from '../state/audioStore';

// Three music zones instead of one track per screen: battle has its own pool, everything that
// isn't the title screen or a fight (hub, skills, inventory, story, bond, results, ending) shares
// the "camp" pool - all narrative/menu downtime between fights, matching how the tracks were
// actually written. A zone only switches (and only then rolls a new random track) when the
// screen crosses into a different zone, so navigating hub -> skills -> inventory never restarts
// the music, and a single battle keeps whichever fight track it started with turn to turn.
type Zone = 'title' | 'battle' | 'camp';

const ZONE_TRACKS: Record<Zone, string[]> = {
  title: ['/audio/main-theme.mp3'],
  battle: ['/audio/fight-1.mp3', '/audio/fight-2.mp3'],
  camp: ['/audio/camp-1.mp3', '/audio/camp-2.mp3', '/audio/camp-3.mp3'],
};

function zoneForScreen(screen: string): Zone {
  if (screen === 'title') return 'title';
  if (screen === 'battle') return 'battle';
  return 'camp';
}

/** Pure audio engine, no UI of its own (see SettingsPanel for the volume/mute controls) - loops
 * ambient music keyed to which "zone" of the game you're in. Rendered once at the app root: a
 * single imperative Audio object outlives every screen switch, so switching screens within a
 * zone never interrupts playback. */
export function MusicPlayer() {
  const screen = useGame((s) => s.screen);
  const volume = useAudioSettings((s) => s.volume);
  const muted = useAudioSettings((s) => s.muted);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const zoneRef = useRef<Zone | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;
    return () => { audio.pause(); audioRef.current = null; };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const zone = zoneForScreen(screen);
    if (zone === zoneRef.current) return;
    zoneRef.current = zone;
    const audio = audioRef.current;
    if (!audio) return;
    const pool = ZONE_TRACKS[zone];
    audio.src = pool[Math.floor(Math.random() * pool.length)];
    audio.currentTime = 0;
    const tryPlay = () => { audio.play().catch(() => { /* blocked until a user gesture */ }); };
    tryPlay();
    // Browsers refuse autoplay with sound until the page has seen a user gesture; once this
    // fires, whichever zone is active at that moment picks the retry back up.
    document.addEventListener('pointerdown', tryPlay, { once: true });
    return () => document.removeEventListener('pointerdown', tryPlay);
  }, [screen]);

  return null;
}
