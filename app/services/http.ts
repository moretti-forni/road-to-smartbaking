import axios from 'axios';

const apiBaseUrl =
  import.meta.env.VITE_PUBLIC_API_BASE_URL ?? (import.meta.env.DEV ? '/api/v1' : '');
export const usesPublicApi = Boolean(apiBaseUrl);

export const publicHttp = axios.create({
  baseURL: apiBaseUrl,
  timeout: 12000,
});
