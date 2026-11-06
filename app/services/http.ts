import axios from 'axios';

export const publicHttp = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_BASE_URL,
  timeout: 12000,
});
