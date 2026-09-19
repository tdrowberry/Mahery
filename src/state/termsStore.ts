import { create } from 'zustand';
import { TERMS_VERSION } from '../data/terms';

// Whether this device has accepted the CURRENT terms. Device-level, not part of a save file - it
// has to be answered before a save slot even exists. Stores the version that was accepted, not a
// bare flag, so bumping TERMS_VERSION in data/terms.ts asks everyone to accept again.
const ACCEPTED_KEY = 'mahery.terms.accepted';

function readAccepted(): boolean {
  try { return localStorage.getItem(ACCEPTED_KEY) === TERMS_VERSION; } catch { return false; }
}

interface TermsState {
  accepted: boolean;
  accept: () => void;
}

export const useTerms = create<TermsState>((set) => ({
  accepted: readAccepted(),
  // If storage is unavailable the player can still continue this session; they'll just be asked again next launch.
  accept: () => {
    try { localStorage.setItem(ACCEPTED_KEY, TERMS_VERSION); } catch { /* ignore */ }
    set({ accepted: true });
  },
}));
