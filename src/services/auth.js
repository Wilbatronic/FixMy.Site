const API_URL = '/api/';

const register = (name, email, password, website_url, phone_country, phone_number, confirmPassword) => {
  return fetch(API_URL + 'register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, confirmPassword, website_url, phone_country, phone_number }),
  }).then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || 'Registration failed');
    }
    try { return JSON.parse(text); } catch { return { ok: true }; }
  });
};

const login = async (email, password) => {
  const res = await fetch(API_URL + 'login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || 'Login failed');
  }
  if (data && data.token) {
    try {
      const meRes = await fetch(API_URL + 'me', { headers: { 'Authorization': `Bearer ${data.token}` }, credentials: 'include' });
      const me = meRes.ok ? await meRes.json() : {};
      const merged = { ...data, ...me };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    } catch (_) {
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    }
  }
  return data;
};

const refreshCurrentUser = async () => {
  const user = getCurrentUser();
  if (!user || !user.token) return null;
  try {
    const meRes = await fetch(API_URL + 'me', { headers: { 'Authorization': `Bearer ${user.token}` }, credentials: 'include' });
    if (!meRes.ok) return user;
    const me = await meRes.json();
    const merged = { ...user, ...me };
    localStorage.setItem('user', JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.warn('User refresh failed:', error);
    return user;
  }
};

const refreshAccessToken = async () => {
  try {
    const res = await fetch(API_URL + 'token/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    const current = getCurrentUser();
    if (current && data?.token) {
      const merged = { ...current, token: data.token };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    }
    return null;
  } catch (error) {
    console.warn('Token refresh failed:', error);
    // Clear invalid user data
    localStorage.removeItem('user');
    return null;
  }
};

const logout = () => {
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

const getAuthHeader = () => {
  const user = getCurrentUser();
  if (user && user.token) {
    return { 'Authorization': `Bearer ${user.token}` };
  } else {
    return {};
  }
}

export default {
  register,
  login,
  logout,
  getCurrentUser,
  getAuthHeader,
  refreshCurrentUser,
  refreshAccessToken,
};
