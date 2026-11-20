const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) {
    return null;
  }

  const body = await res.json().catch(() => ({ success: false, data: null, error: 'Invalid server response' }));
  if (!res.ok || !body.success) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body.data;
}

export function get(path) {
  return request(path);
}

export function post(path, data) {
  return request(path, { method: 'POST', body: JSON.stringify(data) });
}

export function patch(path, data) {
  return request(path, { method: 'PATCH', body: JSON.stringify(data) });
}
