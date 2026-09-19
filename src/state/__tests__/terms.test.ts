import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_BLURB, TERMS_INTRO, TERMS_SECTIONS, TERMS_UPDATED, TERMS_VERSION } from '../../data/terms';

const KEY = 'mahery.terms.accepted';

// Vitest runs in a plain node environment (no localStorage), so each test hands the store a fake
// one. The store reads localStorage once at module load, so it's re-imported fresh every time.
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
  };
}

async function freshStore() {
  vi.resetModules();
  return (await import('../termsStore')).useTerms;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('terms acceptance gate', () => {
  it('asks a brand-new device to accept', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    const useTerms = await freshStore();
    expect(useTerms.getState().accepted).toBe(false);
  });

  it('accepting flips the gate and remembers the accepted version on the device', async () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    const useTerms = await freshStore();
    useTerms.getState().accept();
    expect(useTerms.getState().accepted).toBe(true);
    expect(storage.data.get(KEY)).toBe(TERMS_VERSION);
  });

  it('does not ask again on the next launch once the current version is accepted', async () => {
    vi.stubGlobal('localStorage', fakeStorage({ [KEY]: TERMS_VERSION }));
    const useTerms = await freshStore();
    expect(useTerms.getState().accepted).toBe(true);
  });

  it('asks again when the accepted version is not the current one', async () => {
    vi.stubGlobal('localStorage', fakeStorage({ [KEY]: '2000-01-01' }));
    const useTerms = await freshStore();
    expect(useTerms.getState().accepted).toBe(false);
  });

  it('survives storage that refuses access: gated on load, still playable after accepting', async () => {
    const denied = () => { throw new Error('storage denied'); };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied });
    const useTerms = await freshStore();
    expect(useTerms.getState().accepted).toBe(false);
    expect(() => useTerms.getState().accept()).not.toThrow();
    expect(useTerms.getState().accepted).toBe(true);
  });
});

describe('terms content', () => {
  it('keeps the version stamp and the displayed "last updated" date in step', () => {
    const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(TERMS_VERSION) ?? [];
    expect(y, 'TERMS_VERSION must be YYYY-MM-DD').toBeDefined();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    expect(TERMS_UPDATED).toBe(`${months[Number(m) - 1]} ${Number(d)}, ${y}`);
  });

  it('has a plainly worded AI disclosure both as a blurb and as a section', () => {
    expect(AI_BLURB.toLowerCase()).toContain('ai');
    const aiSection = TERMS_SECTIONS.find((s) => /\bAI\b/.test(s.title));
    expect(aiSection, 'an AI section').toBeDefined();
    expect(aiSection!.body.join(' ')).toMatch(/artificial intelligence/i);
  });

  it('has an intro and well-formed sections (unique titles - they are React keys - and no empty bodies)', () => {
    expect(TERMS_INTRO.length).toBeGreaterThan(0);
    const titles = TERMS_SECTIONS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const s of TERMS_SECTIONS) {
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      for (const p of s.body) expect(p.trim().length).toBeGreaterThan(0);
    }
  });

  it('covers the standard clauses a store listing expects', () => {
    const titles = TERMS_SECTIONS.map((s) => s.title.toLowerCase()).join(' | ');
    for (const clause of ['license', 'ownership', 'privacy', 'warrant', 'liability', 'termination', 'changes', 'contact']) {
      expect(titles, `a "${clause}" section`).toContain(clause);
    }
  });
});
