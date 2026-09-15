import { useState } from 'react';
import { useAudioSettings } from '../state/audioStore';

/** Gear icon rendered once at the app root (App.tsx), so it - and the settings it opens - are
 * reachable from every screen without leaving whatever you're doing (mid-battle included). The
 * panel itself is a plain overlay, not a routed screen, for the same reason. */
export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const volume = useAudioSettings((s) => s.volume);
  const muted = useAudioSettings((s) => s.muted);
  const setVolume = useAudioSettings((s) => s.setVolume);
  const setMuted = useAudioSettings((s) => s.setMuted);

  return (
    <>
      <button
        className="settings-toggle"
        onClick={() => setOpen(true)}
        title="Settings"
        aria-label="Settings"
      >
        ⚙
      </button>
      {open && (
        <div className="settings-overlay" onClick={() => setOpen(false)}>
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

            <button className="btn btn-primary" style={{ marginTop: 4, width: '100%' }} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
