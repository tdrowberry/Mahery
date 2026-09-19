import { create } from 'zustand';

// Transient, cross-screen UI state that doesn't belong in a save file and isn't a navigable
// screen of its own - the Settings overlay can open from a floating button (screens with no
// MenuStrip: title, story, bond, results, ending), from BattleScreen's own controls, or from the
// MenuStrip's own Settings button (Hub/Items/Shop/Abilities), so its open/closed state has to
// live above all of them. The Terms viewer is the same idea: reachable from the title screen's
// footer and from Settings.
interface UiState {
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  termsOpen: boolean;
  openTerms: () => void;
  closeTerms: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  termsOpen: false,
  openTerms: () => set({ termsOpen: true }),
  closeTerms: () => set({ termsOpen: false }),
}));
