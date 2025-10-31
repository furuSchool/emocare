export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

type Query = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params?: Query) {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function apiGet<T>(path: string, params?: Query): Promise<T> {
  const url = `${API_BASE}${path}${buildQuery(params)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // If a token is stored (e.g., after login), attach it
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${url} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

