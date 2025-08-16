import authService from '@/services/auth';

const BASE = '/api/';

async function withRefresh(fetcher) {
  try {
    const res = await fetcher();
    if (res.status !== 401 && res.status !== 403) return res;
    const refreshed = await authService.refreshAccessToken();
    if (!refreshed || !refreshed.token) return res;
    return await fetcher();
  } catch (error) {
    console.warn('API request failed:', error);
    // Return a mock response to prevent unhandled rejections
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function apiFetch(path, options = {}) {
  const doFetch = () => {
    const headers = {
      ...(options.headers || {}),
      ...authService.getAuthHeader(),
    };
    return fetch(BASE + path.replace(/^\//, ''), { 
      ...options, 
      headers, 
      credentials: 'include',
    });
  };
  
  try {
    return await withRefresh(doFetch);
  } catch (error) {
    console.warn('API fetch failed:', error);
    // Return a mock response to prevent unhandled rejections
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { ok: res.ok, status: res.status, data: json };
}


