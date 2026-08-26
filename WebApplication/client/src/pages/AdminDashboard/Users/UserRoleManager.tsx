import { useEffect, useState } from 'react';

import { useAdminAuth } from '../../../hooks/useAdminAuth';
import {
  deleteUser,
  getAdminUsersList,
  updateUserRole,
  updateUserStatus,
} from '../../../services/adminApi';
import type { AdminRole, AdminUserItem } from '../../../types/admin';

export function UserRoleManager() {
  const { user: currentAdmin } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, search, roleFilter]);

  const loadUsers = () => {
    setLoading(true);
    getAdminUsersList({
      page,
      limit,
      search: search || undefined,
      role: roleFilter !== 'all' ? roleFilter : undefined,
    })
      .then((res) => {
        setUsers(res.items);
        setTotal(res.pagination.total);
      })
      .catch((err) => showToast(err.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleRoleChange = async (targetUser: AdminUserItem, newRole: AdminRole) => {
    if (targetUser.id === currentAdmin?.id && newRole !== 'super_admin') {
      showToast('You cannot demote your own account.');
      return;
    }

    try {
      await updateUserRole(targetUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)));
      showToast(`User "${targetUser.username}" role updated to ${newRole}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update role.');
    }
  };

  const handleToggleStatus = async (targetUser: AdminUserItem) => {
    if (targetUser.id === currentAdmin?.id) {
      showToast('You cannot deactivate your own account.');
      return;
    }

    const nextStatus = !targetUser.is_active;
    try {
      await updateUserStatus(targetUser.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextStatus } : u)),
      );
      showToast(`User "${targetUser.username}" ${nextStatus ? 'unbanned' : 'banned'}`);
    } catch (err: any) {
      showToast(err.message || 'Status update failed.');
    }
  };

  const handleDelete = async (targetUser: AdminUserItem) => {
    if (targetUser.id === currentAdmin?.id) {
      showToast('You cannot delete your own account.');
      return;
    }

    if (
      !window.confirm(`Are you sure you want to permanently delete user "${targetUser.username}"?`)
    ) {
      return;
    }

    try {
      await deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setTotal((prev) => Math.max(prev - 1, 0));
      showToast(`User "${targetUser.username}" deleted.`);
    } catch (err: any) {
      showToast(err.message || 'Delete failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-brand-400/30 bg-slate-900 p-4 text-xs font-semibold text-brand-300 shadow-2xl backdrop-blur">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          User & Role Governance (RBAC)
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage platform accounts, promote administrators, deactivate abusive accounts, and ban
          IPs.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Search Users
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username, email or name..."
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Role Filter
          </label>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
          >
            <option value="all">All Roles ({total})</option>
            <option value="super_admin">Super Admins</option>
            <option value="admin">Admins</option>
            <option value="user">Regular Users</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">User Details</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Joined Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading users list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{item.full_name || item.username}</span>
                        {item.id === currentAdmin?.id && (
                          <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] text-brand-300 font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">@{item.username}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{item.email || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.role}
                        disabled={item.id === currentAdmin?.id}
                        onChange={(e) => handleRoleChange(item, e.target.value as AdminRole)}
                        className={`rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[11px] font-semibold uppercase ${
                          item.role === 'super_admin'
                            ? 'text-purple-400'
                            : item.role === 'admin'
                              ? 'text-brand-400'
                              : 'text-slate-400'
                        } focus:outline-none`}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={item.id === currentAdmin?.id}
                        onClick={() => handleToggleStatus(item)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase transition-colors ${
                          item.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Banned'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.id !== currentAdmin?.id && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-white/5 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1 text-slate-300 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1 text-slate-300 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
