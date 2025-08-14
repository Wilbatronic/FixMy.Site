import authService from '@/services/auth';

const BASE = '/api/';

async function withRefresh(fetcher) {
  const res = await fetcher();
  if (res.status !== 401 && res.status !== 403) return res;
  const refreshed = await authService.refreshAccessToken();
  if (!refreshed || !refreshed.token) return res;
  return await fetcher();
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
  return withRefresh(doFetch);
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { ok: res.ok, status: res.status, data: json };
}


