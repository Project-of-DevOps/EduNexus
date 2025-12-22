/**
 * Centralized configuration for API URLs.
 * 
 * In production (Render/Vercel), we should set VITE_PYTHON_API_URL to the actual backend URL.
 * In development, we fallback to the local python service port (8000).
 */

export const getPythonApiUrl = (): string => {
    // 1. Check for explicit environment variable (set in Render/Vercel dashboard)
    if (import.meta.env.VITE_PYTHON_API_URL) {
        return import.meta.env.VITE_PYTHON_API_URL.replace(/\/$/, ''); // Remove trailing slash
    }

    // 2. Fallback for Development (Localhost)
    // We assume the python service runs on port 8000 locally
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
};
