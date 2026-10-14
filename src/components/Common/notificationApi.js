import { API_BASE_URL } from '../Api/Api';

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
