import { useUiStore } from '../state/uiStore';
import { AI_BLURB } from '../data/terms';
import { TermsText } from './TermsText';

/** Read-only copy of the terms, for re-reading after they've been accepted (title screen footer,
 * Settings). Sits above the Settings overlay so opening it from there stacks on top of it. */
export function TermsViewer() {
  const open = useUiStore((s) => s.termsOpen);
  const closeTerms = useUiStore((s) => s.closeTerms);
  if (!open) return null;
  return (
    <div className="settings-overlay terms-overlay" onClick={closeTerms}>
      <div className="steel terms-panel" role="dialog" aria-modal="true" aria-label="Terms and Conditions" onClick={(e) => e.stopPropagation()}>
        <div className="ab-title">Terms &amp; Conditions</div>
        <div className="terms-scroll">
          <TermsText />
        </div>
        <div className="terms-footer">{AI_BLURB}</div>
        <button className="btn btn-primary" onClick={closeTerms} data-testid="terms-close">Close</button>
      </div>
    </div>
  );
}
