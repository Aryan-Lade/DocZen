import axios from 'axios';

// In production (Railway), set VITE_API_URL to your backend URL, e.g. https://your-api.up.railway.app
const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('doczen_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('doczen_token');
      localStorage.removeItem('doczen_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Extract a readable message from an axios error (handles blob responses too)
export const errMessage = async (err: any): Promise<string> => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json.message || json.error || 'Something went wrong';
    } catch {
      return 'Something went wrong';
    }
  }
  if (typeof data === 'object' && data) {
    return data.message || data.error || (data.errors?.[0]?.msg ?? 'Something went wrong');
  }
  return err?.message || 'Something went wrong';
};

// Trigger browser download from blob response
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatDate = (d: string | Date): string => {
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};
