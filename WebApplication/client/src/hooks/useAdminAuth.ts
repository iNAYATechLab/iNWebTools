import { useContext } from 'react';

import { AdminAuthContext } from '../pages/AdminDashboard/AdminAuthContext';

/** Access the signed-in admin and the sign-in/out actions. */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used inside <AdminAuthProvider>.');
  }
  return context;
}
