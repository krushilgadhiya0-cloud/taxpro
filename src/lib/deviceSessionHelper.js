// Device & Active Session Security Helper for TaxPro
// Handles client fingerprinting, active session registry, revocation, and security heartbeat.

export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return 'dev_server';
  let devId = localStorage.getItem('taxpro_device_id');
  if (!devId) {
    devId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    localStorage.setItem('taxpro_device_id', devId);
  }
  return devId;
}

export function getOrCreateSessionToken() {
  if (typeof window === 'undefined') return 'ses_server';
  try {
    const pgRaw = localStorage.getItem('taxpro_pg_session');
    if (pgRaw) {
      const parsed = JSON.parse(pgRaw);
      if (parsed?.access_token) return parsed.access_token;
    }
  } catch (e) {}

  let token = localStorage.getItem('taxpro_session_token');
  if (!token) {
    token = 'ses_tok_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('taxpro_session_token', token);
  }
  return token;
}

export function getClientDeviceProfile() {
  if (typeof window === 'undefined') {
    return {
      deviceName: 'Workstation PC • Google Chrome',
      deviceType: 'desktop',
      osName: 'Windows 11',
      browserName: 'Google Chrome'
    };
  }

  const ua = navigator.userAgent || '';
  let deviceType = 'desktop';
  let osName = 'Windows PC';
  let browserName = 'Chrome';

  // Device Type & OS
  if (/mobile/i.test(ua)) {
    deviceType = 'mobile';
    if (/iphone/i.test(ua)) osName = 'iOS (iPhone)';
    else if (/android/i.test(ua)) osName = 'Android Mobile';
    else osName = 'Mobile Phone';
  } else if (/ipad|tablet/i.test(ua)) {
    deviceType = 'tablet';
    if (/ipad/i.test(ua)) osName = 'iPadOS (Apple iPad)';
    else osName = 'Android Tablet';
  } else {
    deviceType = 'desktop';
    if (/windows/i.test(ua)) osName = 'Windows 11 PC';
    else if (/macintosh|mac os x/i.test(ua)) osName = 'macOS (MacBook/iMac)';
    else if (/linux/i.test(ua)) osName = 'Linux Desktop';
    else osName = 'Workstation PC';
  }

  // Browser Name
  if (/edg/i.test(ua)) browserName = 'Microsoft Edge';
  else if (/chrome|crios/i.test(ua)) browserName = 'Google Chrome';
  else if (/firefox|fxios/i.test(ua)) browserName = 'Mozilla Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browserName = 'Apple Safari';
  else if (/opr|opera/i.test(ua)) browserName = 'Opera';
  else if (/brave/i.test(ua)) browserName = 'Brave Browser';

  const deviceName = `${osName} • ${browserName}`;
  return { deviceName, deviceType, osName, browserName };
}

// Register current device session with backend
export async function registerCurrentDeviceSession(email) {
  const cleanEmail = (email || localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').trim().toLowerCase();
  const sessionToken = getOrCreateSessionToken();
  const deviceId = getOrCreateDeviceId();
  const profile = getClientDeviceProfile();

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const res = await fetch(`${baseUrl}/api/auth/register-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        sessionToken,
        deviceId,
        deviceName: profile.deviceName,
        deviceType: profile.deviceType,
        osName: profile.osName,
        browserName: profile.browserName
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('[Device Registry Warning]:', err.message);
    return { success: false, error: err.message };
  }
}

// Fetch all active sessions for user account
export async function fetchUserActiveSessions(email) {
  const cleanEmail = (email || localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').trim().toLowerCase();
  const sessionToken = getOrCreateSessionToken();
  const deviceId = getOrCreateDeviceId();

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const res = await fetch(`${baseUrl}/api/auth/sessions?email=${encodeURIComponent(cleanEmail)}&currentToken=${encodeURIComponent(sessionToken)}&deviceId=${encodeURIComponent(deviceId)}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[Fetch Sessions Warning]:', err.message);
    return { success: false, sessions: [] };
  }
}

// Revoke a specific device session
export async function revokeDeviceSession(sessionId, sessionToken, email) {
  const cleanEmail = (email || localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').trim().toLowerCase();

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const res = await fetch(`${baseUrl}/api/auth/revoke-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        sessionId,
        sessionToken
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('[Revoke Session Warning]:', err.message);
    return { success: false, error: err.message };
  }
}

// Revoke all other devices (except this one)
export async function revokeAllOtherDevices(email) {
  const cleanEmail = (email || localStorage.getItem('taxpro_user_email') || 'admin@taxpro.com').trim().toLowerCase();
  const currentToken = getOrCreateSessionToken();
  const currentDeviceId = getOrCreateDeviceId();

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const res = await fetch(`${baseUrl}/api/auth/revoke-all-other-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        currentToken,
        currentDeviceId
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('[Revoke All Other Warning]:', err.message);
    return { success: false, error: err.message };
  }
}

// Session security heartbeat check
export async function checkSessionSecurityStatus(email) {
  const token = getOrCreateSessionToken();
  const deviceId = getOrCreateDeviceId();

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const res = await fetch(`${baseUrl}/api/auth/check-session?token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(deviceId)}`);
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: true, valid: true };
  }
}
