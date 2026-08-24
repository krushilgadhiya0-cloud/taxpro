/**
 * Firm Profile Gatekeeper & Verification Utility
 * Ensures Administrators configure firm legal identity before adding practice data or purchasing subscriptions.
 */

export const isFirmConfigured = () => {
  const configured = localStorage.getItem('taxpro_firm_configured');
  const name = localStorage.getItem('taxpro_firm_name');
  return configured === 'true' && Boolean(name && name.trim());
};

export const requireFirmSetup = (onShowToast) => {
  if (!isFirmConfigured()) {
    if (onShowToast) {
      onShowToast('⚠️ Practice Profile Required: Please enter your Firm details (Legal Name, PAN, Address) first before adding records or purchasing subscriptions.', 'warning');
    }
    window.dispatchEvent(new CustomEvent('taxpro_open_firm_modal', { detail: { isDirectSetup: true } }));
    return false;
  }
  return true;
};
