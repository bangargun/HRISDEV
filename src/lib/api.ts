import { supabase } from './supabase';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hr-api`;

const headers = () => ({
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export const api = {
  async select(table: string, params?: Record<string, string>) {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        searchParams.set(key, value);
      }
    }
    const url = `${API_URL}/tables/${table}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    return res.json();
  },

  async insert(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
    const res = await fetch(`${API_URL}/tables/${table}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Insert failed' }));
      throw new Error(err.error || err.message || 'Insert failed');
    }
    return res.json();
  },

  async update(table: string, id: string, data: Record<string, unknown>) {
    const res = await fetch(`${API_URL}/tables/${table}/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(err.error || err.message || 'Update failed');
    }
    return res.json();
  },

  async delete(table: string, id: string) {
    const res = await fetch(`${API_URL}/tables/${table}/${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(err.error || err.message || 'Delete failed');
    }
    return res.json();
  },
};

// Auth operations still use direct Supabase client
export { supabase };
