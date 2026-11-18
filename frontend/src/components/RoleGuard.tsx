import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface RoleGuardProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || '').toLowerCase();

  // If no role restriction specified, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Administrator has absolute unrestricted access to all pages
  if (!role || role.includes('admin')) {
    return <>{children}</>;
  }

  // Check if current role matches any of the allowed roles
  const isAllowed = allowedRoles.some((r) => role.includes(r.toLowerCase()));
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
