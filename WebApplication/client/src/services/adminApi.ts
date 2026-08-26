/**
 * Admin dashboard API client.
 *
 * Token handling lives here rather than in components: a single place reads
 * the access token, attaches it, and reacts to a 401 by trying the refresh
 * token exactly once before giving up.
 */

import type {
  AdminAccessResponse,
  AdminToolItem,
  AdminToolPatch,
  AdminToolsResponse,
  AdminUserItem,
  AdminUsersResponse,
  ConversionLog,
  GlobalNotice,
  LimitsConfig,
  LoginResponse,
  MonetizationConfig,
  OnlineNowResponse,
  Paged,
  SessionDetail,
  SystemErrorsResponse,
  SystemStats,
  TimeRange,
  TimeRangeStats,
} from '../types/admin';
import type {
  Category,
  CategoryPatch,
  ReorderEntry,
  Subcategory,
  SubcategoryPatch,
} from '../types/categories';
import type { LayoutConfig } from '../types/layout';
import type { WidgetConfig } from '../types/widgets';

const ACCESS_KEY = 'inwebtools.admin.access';
const REFRESH_KEY = 'inwebtools.admin.refresh';

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;
  /** Per-field messages from a validation failure, keyed by field name. */
  readonly fields: Record<string, string>;

  constructor(code: string, message: string, status = 0, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

/* ---------------- Token storage ---------------- */

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/* ---------------- Core request ---------------- */

type Options = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /**
   * API prefix. Defaults to the admin namespace; the header/footer CMS lives
   * under /api/layout but still needs this client's token handling and its
   * refresh-once-on-401 behaviour, so it overrides the base rather than
   * duplicating that logic.
   */
  base?: string;
  /** Internal: prevents an infinite refresh loop. */
  _retried?: boolean;
};

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, signal, base = '/api/admin' } = options;
  const token = tokenStore.access;

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // An aborted request is not a failure — it means the caller unmounted or
    // superseded it. Rethrow it untouched so callers can tell the difference;
    // flattening it into a NETWORK error made callers treat a routine cleanup
    // as a broken session.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AdminApiError('NETWORK', 'Could not reach the server.');
  }

  const payload = (await response.json().catch(() => null)) as {
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: { fields?: Record<string, string> };
    };
  } | null;

  if (!response.ok || !payload?.success) {
    const code = payload?.error?.code ?? 'UNKNOWN';

    // Any rejected access token is recoverable while the refresh token is
    // still good — refresh once, then replay.
    //
    // This used to test for TOKEN_EXPIRED alone, but the server answers
    // TOKEN_INVALID whenever a token fails to verify for any other reason
    // (a restart with a different signing key, a truncated value in
    // localStorage, a token issued by another environment) and AUTH_REQUIRED
    // when the header never arrived. Those were treated as unrecoverable, so
    // a perfectly valid refresh token went unused and the operator was
    // bounced to the login screen.
    const recoverable =
      code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID' || code === 'AUTH_REQUIRED';

    if (response.status === 401 && recoverable && !options._retried && tokenStore.refresh) {
      const refreshed = await tryRefresh();
      if (refreshed) return request<T>(path, { ...options, _retried: true });
    }

    // Only give up the credentials once refreshing is no longer an option.
    if (response.status === 401) tokenStore.clear();

    throw new AdminApiError(
      code,
      payload?.error?.message ?? `Request failed (${response.status}).`,
      response.status,
      payload?.error?.details?.fields ?? {},
    );
  }

  return payload.data as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const payload = await res.json();
    if (!res.ok || !payload?.success) return false;

    tokenStore.set(payload.data.accessToken, payload.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/* ---------------- Auth ---------------- */

export async function login(username: string, password: string) {
  const data = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data.user;
}

export async function logout() {
  try {
    await request('/logout', { method: 'POST', base: '/api/auth' });
  } catch {
    // Signing out locally matters more than recording it.
  }
  tokenStore.clear();
}

/**
 * The signed-in account.
 *
 * Deliberately the public /api/auth/me, not the staff-only admin one: this is
 * called by the shared session context for every account. Pointing it at the
 * admin route made a signed-in 'user' get 403, which the context read as "no
 * session" — so signing in bounced straight back to the login form.
 */
export const getMe = (signal?: AbortSignal) =>
  request<{ user: LoginResponse['user'] }>('/me', { signal, base: '/api/auth' }).then(
    (d) => d.user,
  );

/* ---------------- Public auth (/api/auth) ---------------- */

/**
 * These share `request` for its token storage and refresh-once behaviour, but
 * point at the public namespace. Sign-in accepts a username or an email in one
 * field, and the server decides where the account belongs — `redirectTo` is
 * never chosen by the client.
 */

type AuthResult = LoginResponse & { redirectTo?: string };

export async function signIn(identifier: string, password: string) {
  const data = await request<AuthResult>('/login', {
    method: 'POST',
    body: { identifier, password },
    base: '/api/auth',
  });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

export async function signUp(input: {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}) {
  const data = await request<AuthResult>('/register', {
    method: 'POST',
    body: input,
    base: '/api/auth',
  });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

export const requestPasswordReset = (email: string) =>
  request<{ message: string; devLink?: string }>('/forgot-password', {
    method: 'POST',
    body: { email },
    base: '/api/auth',
  });

export const resetPassword = (token: string, password: string) =>
  request<{ message: string; redirectTo: string }>('/reset-password', {
    method: 'POST',
    body: { token, password },
    base: '/api/auth',
  });

/* ---------------- Userinfo ---------------- */

export const getOnlineNow = (signal?: AbortSignal) =>
  request<OnlineNowResponse>('/userinfo/online-now', { signal });

export const getSessionDetail = (sessionId: string, signal?: AbortSignal) =>
  request<SessionDetail>(`/userinfo/online-now/${encodeURIComponent(sessionId)}`, { signal });

export const getTimeRangeStats = (range: TimeRange, signal?: AbortSignal) =>
  request<TimeRangeStats>(`/userinfo/time-range-stats?range=${range}`, { signal });

/* ---------------- Logs ---------------- */

export const getConversions = (
  params: { page?: number; limit?: number; status?: string; search?: string },
  signal?: AbortSignal,
) => {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  return request<Paged<ConversionLog>>(`/logs/conversions?${q}`, { signal });
};

export const getSystemErrors = (
  params: { page?: number; limit?: number; level?: string; unresolved?: boolean },
  signal?: AbortSignal,
) => {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.level && params.level !== 'all') q.set('level', params.level);
  if (params.unresolved) q.set('unresolved', 'true');
  return request<SystemErrorsResponse>(`/logs/system-errors?${q}`, { signal });
};

export const resolveSystemError = (id: number, resolved: boolean) =>
  request<{ id: number; resolved: boolean }>(`/logs/system-errors/${id}`, {
    method: 'PATCH',
    body: { resolved },
  });

/* ---------------- Settings ---------------- */

export const getLimits = (signal?: AbortSignal) =>
  request<LimitsConfig>('/settings/limits', { signal });

export const updateLimits = (maxUploadSizeMb: number) =>
  request<{ value: { maxUploadSizeMb: number }; envMaxUploadSizeMb: number }>('/settings/limits', {
    method: 'PUT',
    body: { maxUploadSizeMb },
  });

export const getNotice = (signal?: AbortSignal) =>
  request<GlobalNotice>('/settings/notice', { signal });

export const updateNotice = (value: GlobalNotice['value']) =>
  request<{ value: GlobalNotice['value'] }>('/settings/notice', { method: 'PUT', body: value });

/* ---------------- Security ---------------- */

export const getAdminAccess = (signal?: AbortSignal) =>
  request<AdminAccessResponse>('/security/admin-access', { signal });

export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ changed: boolean }>('/security/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });

/* ---------------- Header/Footer CMS ---------------- */

/**
 * Save the layout. Reads go through the public client in `api.ts` (the website
 * needs them unauthenticated); only the write is an admin operation.
 */
export const saveLayout = (value: LayoutConfig) =>
  request<{ value: LayoutConfig; updatedBy: string }>('/header-footer', {
    method: 'POST',
    body: value,
    base: '/api/layout',
  });

/* ---------------- Sidebar widget engine ---------------- */

/**
 * Save the sidebar arrangement.
 *
 * Reads go through the public client in `api.ts` (the website needs them
 * unauthenticated); only the write is an admin operation. The document is
 * replaced wholesale rather than merged — see the route for why a reorder or
 * a delete has no sensible merge semantics.
 */
export const saveWidgetConfig = (value: WidgetConfig) =>
  request<{ value: WidgetConfig; updatedBy: string }>('/config', {
    method: 'POST',
    body: value,
    base: '/api/widgets',
  });

/* ---------------- Category registry ---------------- */

/**
 * Admin category operations.
 *
 * Reads for the *public* tree go through `api.ts`; this variant includes
 * deactivated rows, which the public read hides, so an admin can see and
 * re-enable something they turned off.
 */
export const getAdminCategoryTree = (signal?: AbortSignal) =>
  request<{ categories: Category[] }>('/admin/tree', { signal, base: '/api/categories' });

export const updateCategory = (id: string, patch: CategoryPatch) =>
  request<{ category: Category }>(`/admin/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
    base: '/api/categories',
  });

export const updateSubcategory = (id: string, patch: SubcategoryPatch) =>
  request<{ subcategory: Subcategory }>(`/admin/sub/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
    base: '/api/categories',
  });

export const reorderCategories = (level: 'category' | 'subcategory', order: ReorderEntry[]) =>
  request<{ level: string; updated: number }>('/admin/reorder', {
    method: 'POST',
    body: { level, order },
    base: '/api/categories',
  });

/* ---------------- Super Admin Overview ---------------- */

export const getSystemStats = (signal?: AbortSignal) =>
  request<SystemStats>('/overview/stats', { signal });

/* ---------------- Super Admin Master Tools Manager ---------------- */

export const getAdminToolsList = (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    module?: string;
    status?: string;
    featured?: boolean | string;
  },
  signal?: AbortSignal,
) => {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.module && params.module !== 'all') q.set('module', params.module);
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.featured !== undefined && params.featured !== 'all') {
    q.set('featured', String(params.featured));
  }
  return request<AdminToolsResponse>(`/tools/list?${q}`, { signal });
};

export const updateAdminTool = (slug: string, patch: AdminToolPatch) =>
  request<{ tool: AdminToolItem }>(`/tools/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: patch,
  });

export const syncAdminTools = () =>
  request<{ result: { inserted: number; updated: number; total: number }; message: string }>(
    '/tools/sync',
    {
      method: 'POST',
    },
  );

/* ---------------- Super Admin Monetization & Ads ---------------- */

export const getMonetizationSettings = (signal?: AbortSignal) =>
  request<MonetizationConfig>('/settings/monetization', { signal });

export const updateMonetizationSettings = (value: MonetizationConfig['value']) =>
  request<{ value: MonetizationConfig['value']; message: string }>('/settings/monetization', {
    method: 'PUT',
    body: value,
  });

/* ---------------- Super Admin User & Role Management ---------------- */

export const getAdminUsersList = (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: boolean | string;
  },
  signal?: AbortSignal,
) => {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  if (params.role && params.role !== 'all') q.set('role', params.role);
  if (params.status !== undefined && params.status !== 'all') {
    q.set('status', String(params.status));
  }
  return request<AdminUsersResponse>(`/users/list?${q}`, { signal });
};

export const updateUserRole = (id: number, role: 'user' | 'admin' | 'super_admin') =>
  request<{ user: AdminUserItem }>(`/users/${id}/role`, {
    method: 'PATCH',
    body: { role },
  });

export const updateUserStatus = (id: number, isActive: boolean) =>
  request<{ user: AdminUserItem }>(`/users/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  });

export const deleteUser = (id: number) =>
  request<{ deleted: boolean; id: number }>(`/users/${id}`, {
    method: 'DELETE',
  });
