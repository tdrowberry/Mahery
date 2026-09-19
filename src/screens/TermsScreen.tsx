import { useState } from 'react';
import { useTerms } from '../state/termsStore';
import { AI_BLURB } from '../data/terms';
import { TermsText } from '../components/TermsText';

/** First-launch gate (and again whenever TERMS_VERSION changes): nothing else in the app is
 * reachable until the terms are accepted, and acceptance is an explicit, unchecked-by-default
 * checkbox plus a button - never a pre-ticked box or a bare "continue". */
export function TermsScreen() {
  const accept = useTerms((s) => s.accept);
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="game terms-screen">
      <div className="steel terms-card">
        <h1 className="terms-title">Terms &amp; Conditions</h1>
        <div className="muted small terms-lede">Please read and accept these terms to play Mahery.</div>
        <div className="terms-scroll" tabIndex={0} role="region" aria-label="Terms and Conditions">
          <TermsText />
        </div>
        <label className="terms-agree">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} data-testid="terms-checkbox" />
          <span>I have read and agree to the Terms &amp; Conditions.</span>
        </label>
        <button className="btn btn-primary" disabled={!agreed} onClick={accept} data-testid="terms-accept">
          Accept &amp; Continue
        </button>
        <div className="muted small terms-lede">If you do not agree, please close the app.</div>
        <div className="terms-footer">{AI_BLURB}</div>
      </div>
    </div>
  );
}
