import { Platform } from 'react-native';

const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!RAW_API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
}

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, '');

  try {
    const url = new URL(trimmed);

    if (
      Platform.OS === 'android' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    ) {
      url.hostname = '10.0.2.2';
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    if (Platform.OS === 'android') {
      return trimmed.replace('http://localhost', 'http://10.0.2.2').replace('http://127.0.0.1', 'http://10.0.2.2');
    }
    return trimmed;
  }
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });
  } catch (error) {
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorBody.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
