import { ROLES } from './constants';

// Can unlock?
export const canUnlock = (role) =>
  [ROLES.OWNER, ROLES.ADMIN, ROLES.USER, ROLES.GUEST].includes(role);

// Can manage users?
export const canManageUsers = (role) => role === ROLES.OWNER;

// Can manage RFID/Fingerprint?
export const canManageRFID = (role) =>
  [ROLES.OWNER, ROLES.ADMIN].includes(role);

// Can access admin panel?
export const canAccessAdmin = (role) =>
  [ROLES.OWNER, ROLES.ADMIN].includes(role);

// Is owner?
export const isOwner = (role) => role === ROLES.OWNER;

// Role display label
export const getRoleLabel = (role) => {
  const labels = {
    [ROLES.OWNER]: 'Owner',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.USER]:  'User',
    [ROLES.GUEST]: 'Guest',
  };
  return labels[role] || 'Unknown';
};

// Role color (matches colors.js)
export const getRoleColor = (role) => {
  const roleColors = {
    [ROLES.OWNER]: '#7C3AED',
    [ROLES.ADMIN]: '#1A73E8',
    [ROLES.USER]:  '#10B981',
    [ROLES.GUEST]: '#F59E0B',
  };
  return roleColors[role] || '#9CA3AF';
};