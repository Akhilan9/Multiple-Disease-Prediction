// API Configuration
// Defaults to '/api' in production and local Vite dev proxy.
// Can be overridden via VITE_API_BASE_URL if backend is hosted externally.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
