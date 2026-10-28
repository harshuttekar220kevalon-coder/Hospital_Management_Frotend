// Local and Live (Render) API Endpoints
export const LOCAL_API_URL = "http://127.0.0.1:8000/api";
export const LIVE_API_URL = "https://hospital-management-backend-fo01.onrender.com/api";

// Check whether browser is currently running in an offline local environment
export const isLocalEnvironment = () => {
  if (typeof window === "undefined") return true;
  const host = (window.location.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
};

// Switch between Live Render API and Local API for local development:
// Set to true to test the Render Live backend while running locally, or false for Local Django server
export const USE_LIVE_API = false;

// Active API Base URL with environment variable support and automatic production/online fallback
export const resolveApiBaseUrl = () => {
  // 1. Explicit Vite environment variable (Render dashboard or .env)
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. If opened from an online deployed host (Render, Vercel, Netlify, custom domain)
  if (typeof window !== "undefined" && !isLocalEnvironment()) {
    return LIVE_API_URL;
  }

  // 3. If production build
  if (import.meta.env?.PROD) {
    return LIVE_API_URL;
  }

  // 4. Offline local development
  return USE_LIVE_API ? LIVE_API_URL : LOCAL_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.appointments)) return resData.appointments;
  if (Array.isArray(resData.patients)) return resData.patients;
  if (Array.isArray(resData.doctors)) return resData.doctors;
  if (Array.isArray(resData.nurses)) return resData.nurses;
  if (Array.isArray(resData.hospitals)) return resData.hospitals;
  if (Array.isArray(resData.rows)) return resData.rows;
  return [];
};

export const fetchWorkingEndpoint = async (endpoints, options = {}) => {
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, options);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        const data = extractArray(json);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
  }
  return [];
};

export const getNotificationRole = (role) => {
  const value = String(role || '').toUpperCase();
  if (value.includes('SUPER')) return 'SUPER_ADMIN';
  if (value.includes('ADMIN')) return 'ADMIN';
  if (value.includes('DOCTOR')) return 'DOCTOR';
  if (value.includes('NURSE')) return 'NURSES';
  if (value.includes('RECEPTION')) return 'RECEPTIONISTS';
  if (value.includes('PATIENT')) return 'PATIENTS';
  return '';
};

export const getNotificationEndpoint = (role) => {
  const roleKey = getNotificationRole(role);
  const paths = {
    PATIENTS: '/patients/notifications/',
    DOCTOR: '/doctors/notifications/',
    NURSES: '/nurses/notifications/',
    RECEPTIONISTS: '/receptionists/notifications/',
    ADMIN: '/admins/notifications/',
    SUPER_ADMIN: '/super-admin/notifications/',
  };
  return paths[roleKey] ? `${API_BASE_URL}${paths[roleKey]}` : '';
};

export const getNotificationParams = (currentUser) => {
  const params = new URLSearchParams();
  if (currentUser?.email) params.set('recipient_email', currentUser.email);
  const role = getNotificationRole(currentUser?.role);
  if (role) params.set('recipient_role', role);
  return params;
};

export const getNotificationHeaders = (currentUser, json = false) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(currentUser?.notification_token ? { Authorization: `Bearer ${currentUser.notification_token}` } : {}),
});

export const getChatRole = (role) => {
  const value = String(role || '').toUpperCase();
  if (value.includes('ADMIN') && !value.includes('SUPER')) return 'ADMIN';
  if (value.includes('DOCTOR')) return 'DOCTOR';
  if (value.includes('NURSE')) return 'NURSES';
  if (value.includes('RECEPTION')) return 'RECEPTIONISTS';
  return '';
};

export const getChatEndpoint = (role) => {
  const roleKey = getChatRole(role);
  const paths = {
    ADMIN: '/admins/chats/',
    DOCTOR: '/doctors/chats/',
    NURSES: '/nurses/chats/',
    RECEPTIONISTS: '/receptionists/chats/',
  };
  return paths[roleKey] ? `${API_BASE_URL}${paths[roleKey]}` : '';
};

/**
 * formatValue
 * Formats any backend field value. If empty, null, undefined, or blank, returns '-'.
 * Once real data is available, returns the real data string/number.
 */
export const formatValue = (val, fallback = '-') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      !trimmed ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed === 'None' ||
      trimmed === 'nan' ||
      trimmed === 'NaN' ||
      trimmed === 'N/A' ||
      trimmed === 'n/a'
    ) {
      return fallback;
    }
    return val;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  if (Array.isArray(val)) {
    return val.length > 0 ? val : fallback;
  }
  if (typeof val === 'object') {
    return Object.keys(val).length > 0 ? val : fallback;
  }
  return val;
};

export default API_BASE_URL;
