import authService from '@/services/auth';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

function getSessionId() {
  try {
    const key = 'analytics_session_id';
    let sid = localStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(key, sid);
    }
    return sid;
  } catch (_) {
    return undefined;
  }
}

export async function trackEvent(eventName, data = {}) {
  try {
    const headers = { 'Content-Type': 'application/json', ...authService.getAuthHeader() };
    const body = {
      event_name: eventName,
      session_id: getSessionId(),
      ...data,
    };
    await fetch(`${API_BASE}/analytics`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (_) {
    // ignore
  }
}

export function trackPageView(pathname) {
  const ref = document.referrer || undefined;
  return trackEvent('page_view', { path: pathname, referrer: ref });
}


