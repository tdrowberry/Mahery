import { useGame, type Screen } from '../state/gameStore';
import { useUiStore } from '../state/uiStore';
import { useAudioSettings } from '../state/audioStore';
import { AI_BLURB } from '../data/terms';

/** Screens that already have their own Settings button - MenuStrip's (see MenuStrip.tsx) for
 * hub/inventory/shop/skills, and BattleScreen's own copy (next to its home/exit button) for
 * battle. The floating gear here only needs to cover everywhere else (title, story, bond,
 * results, ending), so Settings is always one click away no matter what's on screen. */
const HAS_MENU_STRIP: Screen[] = ['hub', 'inventory', 'shop', 'skills', 'battle'];

/** Gear icon rendered once at the app root (App.tsx). The overlay it opens is shared with the
 * MenuStrip's own Settings button (see uiStore) - one settingsOpen flag, two possible triggers,
 * so the panel itself is a plain overlay, not a routed screen, reachable from anywhere. */
export function SettingsPanel() {
  const screen = useGame((s) => s.screen);
  const open = useUiStore((s) => s.settingsOpen);
  const openSettings = useUiStore((s) => s.openSettings);
  const closeSettings = useUiStore((s) => s.closeSettings);
  const openTerms = useUiStore((s) => s.openTerms);
  const volume = useAudioSettings((s) => s.volume);
  const muted = useAudioSettings((s) => s.muted);
  const setVolume = useAudioSettings((s) => s.setVolume);
  const setMuted = useAudioSettings((s) => s.setMuted);

  return (
    <>
      {!HAS_MENU_STRIP.includes(screen) && (
        <button
          className="settings-toggle"
          onClick={openSettings}
          title="Settings"
          aria-label="Settings"
        >
          ⚙
        </button>
      )}
      {open && (
        <div className="settings-overlay" onClick={closeSettings}>
          <div className="steel settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="ab-title">Settings</div>

            <div className="settings-section">
              <div className="settings-row">
                <label htmlFor="music-volume">Music volume</label>
                <span className="muted small">{muted ? 'Off' : `${Math.round(volume * 100)}%`}</span>
              </div>
              <input
                id="music-volume"
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                disabled={muted}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="settings-slider"
              />
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setMuted(!muted)}>
                {muted ? 'Unmute music' : 'Mute music'}
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-row"><span>Cloud save</span></div>
              <div className="muted small" style={{ marginBottom: 8 }}>
                Sign in with your Google Play account to keep saves synced across devices - available
                once Mahery is published to the Play Store. For now, progress saves locally on this
                device.
              </div>
              <button className="btn btn-sm" disabled title="Coming once Mahery is on the Play Store">
                Sign in with Google Play (coming soon)
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-row"><span>About</span></div>
              <div className="muted small" style={{ marginBottom: 8 }}>{AI_BLURB}.</div>
              <button className="btn btn-sm" onClick={openTerms} data-testid="settings-terms-btn">Terms &amp; Conditions</button>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 4, width: '100%' }} onClick={closeSettings}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
