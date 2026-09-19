import { TERMS_INTRO, TERMS_SECTIONS, TERMS_UPDATED } from '../data/terms';

/** The terms themselves, shared by the first-launch acceptance screen and the re-read overlay. */
export function TermsText() {
  return (
    <div className="terms-text">
      <p className="muted small">Last updated: {TERMS_UPDATED}</p>
      <p>{TERMS_INTRO}</p>
      {TERMS_SECTIONS.map((section, i) => (
        <section key={section.title}>
          <h3>{i + 1}. {section.title}</h3>
          {section.body.map((paragraph, j) => <p key={j}>{paragraph}</p>)}
        </section>
      ))}
    </div>
  );
}
