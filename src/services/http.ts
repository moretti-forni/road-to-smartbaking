import axios from 'axios';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
export const usesPublicApi = process.env.NEXT_PUBLIC_CATALOG_SOURCE !== 'fixtures';
export const publicHttp = axios.create({ baseURL: apiBaseUrl, timeout: 12000 });
