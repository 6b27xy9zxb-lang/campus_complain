const TOKEN_KEY = 'campus_portal_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null, rememberMe = true) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (token) {
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function uploadFiles(files: File[]) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return apiRequest<{
    files: { file_name: string; file_url: string; file_type: string; file_size: number }[];
  }>('/api/upload', {
    method: 'POST',
    body: formData,
  });
}
