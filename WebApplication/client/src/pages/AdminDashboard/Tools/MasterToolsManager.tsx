import { useEffect, useState, type FormEvent } from 'react';

import { getAdminToolsList, syncAdminTools, updateAdminTool } from '../../../services/adminApi';
import type { AdminToolItem, AdminToolPatch } from '../../../types/admin';

export function MasterToolsManager() {
  const [tools, setTools] = useState<AdminToolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Edit Modal State
  const [editingTool, setEditingTool] = useState<AdminToolItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    tagline: string;
    description: string;
    tags: string;
    status: 'draft' | 'published' | 'archived';
    isFeatured: boolean;
    isPremium: boolean;
  }>({
    name: '',
    tagline: '',
    description: '',
    tags: '',
    status: 'published',
    isFeatured: false,
    isPremium: false,
  });

  useEffect(() => {
    loadTools();
  }, [page, search, moduleFilter, statusFilter]);

  const loadTools = () => {
    setLoading(true);
    getAdminToolsList({
      page,
      limit,
      search: search || undefined,
      module: moduleFilter !== 'all' ? moduleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
      .then((res) => {
        setTools(res.items);
        setTotal(res.pagination.total);
      })
      .catch((err) => {
        setToast(err.message || 'Failed to load tools.');
      })
      .finally(() => setLoading(false));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleStatus = async (tool: AdminToolItem) => {
    const nextStatus = tool.status === 'published' ? 'draft' : 'published';
    try {
      await updateAdminTool(tool.slug, { status: nextStatus });
      setTools((prev) =>
        prev.map((t) => (t.slug === tool.slug ? { ...t, status: nextStatus } : t)),
      );
      showToast(`Status updated to ${nextStatus} for ${tool.name}`);
    } catch (err: any) {
      showToast(err.message || 'Status update failed.');
    }
  };

  const handleToggleFeatured = async (tool: AdminToolItem) => {
    const nextFeatured = !tool.isFeatured;
    try {
      await updateAdminTool(tool.slug, { isFeatured: nextFeatured });
      setTools((prev) =>
        prev.map((t) => (t.slug === tool.slug ? { ...t, isFeatured: nextFeatured } : t)),
      );
      showToast(`${tool.name} ${nextFeatured ? 'marked featured' : 'unmarked featured'}`);
    } catch (err: any) {
      showToast(err.message || 'Update failed.');
    }
  };

  const handleTogglePremium = async (tool: AdminToolItem) => {
    const nextPremium = !tool.isPremium;
    try {
      await updateAdminTool(tool.slug, { isPremium: nextPremium });
      setTools((prev) =>
        prev.map((t) => (t.slug === tool.slug ? { ...t, isPremium: nextPremium } : t)),
      );
      showToast(`${tool.name} premium flag updated.`);
    } catch (err: any) {
      showToast(err.message || 'Update failed.');
    }
  };

  const openEditModal = (tool: AdminToolItem) => {
    setEditingTool(tool);
    setEditFormData({
      name: tool.name,
      tagline: tool.tagline || '',
      description: tool.description || '',
      tags: Array.isArray(tool.tags) ? tool.tags.join(', ') : '',
      status: tool.status,
      isFeatured: Boolean(tool.isFeatured),
      isPremium: Boolean(tool.isPremium),
    });
  };

  const saveToolChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTool) return;

    try {
      const patch: AdminToolPatch = {
        name: editFormData.name,
        tagline: editFormData.tagline,
        description: editFormData.description,
        tags: editFormData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        status: editFormData.status,
        isFeatured: editFormData.isFeatured,
        isPremium: editFormData.isPremium,
      };

      await updateAdminTool(editingTool.slug, patch);
      showToast(`Changes saved for "${editingTool.name}"`);
      setEditingTool(null);
      loadTools();
    } catch (err: any) {
      showToast(err.message || 'Save failed.');
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await syncAdminTools();
      showToast(res.message || 'Registry synchronized.');
      loadTools();
    } catch (err: any) {
      showToast(err.message || 'Sync failed.');
    } finally {
      setSyncing(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Master Tools Manager</h1>
          <p className="mt-1 text-sm text-slate-400">
            Control publication status, featured flags, taglines, and metadata for all {total}{' '}
            tools.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-xs font-semibold text-brand-300 hover:bg-brand-500/20 disabled:opacity-50 transition-colors"
        >
          <span>🔄</span>
          <span>{syncing ? 'Syncing...' : 'Sync Catalog from JSON'}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur">
        {/* Search Input */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Search Tools
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, slug or keyword..."
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>

        {/* Module Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Suite / Module
          </label>
          <select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
          >
            <option value="all">All 10 Modules</option>
            <option value="document-pdf">Document & PDF Tools</option>
            <option value="image-graphics">Image & Graphics Tools</option>
            <option value="audio-video">Audio & Video Tools</option>
            <option value="developer-code">Developer & Code Tools</option>
            <option value="security-network">Security & Network Tools</option>
            <option value="text-calculators">Text & Calculator Tools</option>
            <option value="seo-webmaster">SEO & Webmaster Tools</option>
            <option value="color-design">Color & Design Tools</option>
            <option value="ai-productivity">AI & Productivity Tools</option>
            <option value="math-science">Health & Math Science</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-brand-400 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Tools Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Tool Name & Slug</th>
                <th className="px-4 py-3.5">Module</th>
                <th className="px-4 py-3.5">Executions</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Featured</th>
                <th className="px-4 py-3.5">Premium</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading tools catalogue...
                  </td>
                </tr>
              ) : tools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No tools matching your filters found.
                  </td>
                </tr>
              ) : (
                tools.map((tool) => (
                  <tr key={tool.slug} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{tool.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{tool.slug}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-400">
                      {tool.module?.replace('-', ' ') || 'General'}
                    </td>
                    <td className="px-4 py-3 font-mono">{tool.usageCount}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(tool)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase transition-colors ${
                          tool.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                        }`}
                      >
                        {tool.status}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(tool)}
                        className={`text-base transition-transform hover:scale-125 ${
                          tool.isFeatured ? 'text-amber-400' : 'text-slate-600'
                        }`}
                      >
                        ★
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePremium(tool)}
                        className={`text-sm transition-transform hover:scale-125 ${
                          tool.isPremium ? 'text-purple-400' : 'text-slate-600'
                        }`}
                      >
                        🔒
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(tool)}
                        className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        Edit
                      </button>
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tools
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

      {/* Edit Modal */}
      {editingTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h2 className="text-base font-bold text-white">Edit Tool: {editingTool.slug}</h2>
              <button
                type="button"
                onClick={() => setEditingTool(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveToolChanges} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tool Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-2.5 text-white focus:border-brand-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tagline</label>
                <input
                  type="text"
                  value={editFormData.tagline}
                  onChange={(e) => setEditFormData({ ...editFormData, tagline: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-2.5 text-white focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-2.5 text-white focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-2.5 text-white focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value as any })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 text-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={editFormData.isFeatured}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, isFeatured: e.target.checked })
                    }
                    className="rounded border-white/20 bg-slate-950 text-brand-500"
                  />
                  <label htmlFor="isFeatured" className="text-slate-300">
                    Featured
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isPremium"
                    checked={editFormData.isPremium}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, isPremium: e.target.checked })
                    }
                    className="rounded border-white/20 bg-slate-950 text-purple-500"
                  />
                  <label htmlFor="isPremium" className="text-slate-300">
                    Premium
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTool(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-500 px-5 py-2 font-semibold text-white hover:bg-brand-400"
                >
                  Save Tool Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
