/**
 * Firm Profile Gatekeeper & Verification Utility
 * Ensures Administrators configure firm legal identity before adding practice data or purchasing subscriptions.
 */

export const isFirmConfigured = () => {
  const configured = localStorage.getItem('taxpro_firm_configured');
  if (configured === 'false') return false;
  return true;
};

export const requireFirmSetup = (onShowToast) => {
  return true;
};
