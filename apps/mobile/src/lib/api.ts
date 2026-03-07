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

function buildErrorMessage(errorBody: any, status: number): string {
  if (typeof errorBody?.message === 'string' && errorBody.message.trim()) {
    if (errorBody.code === 'VALIDATION_ERROR' && errorBody.details?.fieldErrors) {
      const fieldErrors = Object.values(errorBody.details.fieldErrors)
        .flat()
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

      if (fieldErrors.length > 0) {
        return fieldErrors[0];
      }
    }

    return errorBody.message;
  }

  if (status === 401) {
    return 'Your session expired. Please sign in again.';
  }

  return 'Request failed';
}

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
    if (error instanceof Error) {
      throw new Error(
        `Cannot reach API at ${API_BASE_URL}. If you are using a phone, replace localhost in apps/mobile/.env with your computer's LAN IP.`
      );
    }

    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(buildErrorMessage(errorBody, response.status));
  }

  return response.json() as Promise<T>;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
