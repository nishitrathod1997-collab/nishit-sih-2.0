/** Backend origin — set VITE_BACKEND_URL in dashboard/.env when PORT differs (avoid 6000: browsers block it). */
export const BACKEND_ORIGIN =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:8080';
