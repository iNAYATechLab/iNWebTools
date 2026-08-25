/**
 * Types for the admin dashboard API.
 *
 * Field names are snake_case where they come straight from a MySQL row, and
 * camelCase where the server composes the object. Keeping that distinction
 * visible avoids a translation layer that would only hide where data is from.
 */

/** Roles are stored on the single `users` table; staff are admin/super_admin. */
export type AdminRole = 'user' | 'admin' | 'super_admin';

/** Roles allowed into the operator dashboard. */
export const STAFF_ROLES: AdminRole[] = ['admin', 'super_admin'];

export type AdminUser = {
  id: number;
  username: string;
  email?: string | null;
  fullName?: string | null;
  role: AdminRole;
  /** Where this role belongs after signing in; decided server-side. */
  homePath?: string;
};

export type LoginResponse = {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  tokenType: string;
};

/* ---------------- Userinfo ---------------- */

export type VisitorSession = {
  session_id: string;
  ip_address: string;
  user_agent?: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  isp: string | null;
  geo_status: 'pending' | 'ok' | 'failed' | 'skipped';
  page_views: number;
  first_seen_at: string;
  last_seen_at: string;
  seconds_since_seen?: number;
  session_seconds?: number;
};

export type OnlineNowResponse = {
  windowSeconds: number;
  summary: {
    onlineTotal: number;
    mobile: number;
    desktop: number;
    tablet: number;
    countries: number;
  };
  sessions: VisitorSession[];
  geoLookupEnabled: boolean;
};

export type SessionDetail = {
  session: VisitorSession;
  conversions: ConversionLog[];
};

export type TimeRange = 'today' | 'yesterday' | 'last7days' | 'monthly' | 'yearly' | 'alltime';

export type TimeRangeStats = {
  range: TimeRange;
  granularity: 'hour' | 'day';
  totals: {
    conversions: number;
    successes: number;
    failures: number;
    successRate: number;
    characters: number;
    words: number;
    bytes: number;
    avgDurationMs: number;
    uniqueVisitors: number;
  };
  byLanguage: { language: string; count: number }[];
  byCountry: { country_code: string; count: number }[];
  timeseries: { bucket: string; count: number; successes: number }[];
};

/* ---------------- Logs ---------------- */

export type ConversionLog = {
  id?: number;
  request_id: string;
  session_id?: string | null;
  ip_address?: string | null;
  country_code?: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  file_format?: string | null;
  language: string | null;
  model?: string | null;
  status: 'success' | 'failed';
  error_code: string | null;
  characters: number | null;
  words?: number | null;
  duration_ms: number | null;
  transcript_sample?: string | null;
  created_at: string;
};

export type SystemErrorLog = {
  id: number;
  request_id: string | null;
  level: 'warn' | 'error' | 'fatal';
  code: string;
  message: string;
  http_status: number | null;
  route: string | null;
  method: string | null;
  ip_address: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type Paged<T> = {
  items: T[];
  pagination: Pagination;
};

export type SystemErrorsResponse = Paged<SystemErrorLog> & {
  summary: { fatal: number; error: number; warn: number; unresolved: number };
};

/* ---------------- Settings ---------------- */

export type LimitsConfig = {
  value: { maxUploadSizeMb: number };
  updatedAt: string | null;
  updatedBy: string | null;
  envMaxUploadSizeMb: number;
};

export type GlobalNotice = {
  value: {
    enabled: boolean;
    message: string;
    messageBn: string;
    variant: 'info' | 'warning' | 'critical';
  };
  updatedAt: string | null;
  updatedBy: string | null;
};

/* ---------------- Security ---------------- */

export type AdminAccountRow = {
  id: number;
  username: string;
  role: AdminRole;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
};

export type AuditEntry = {
  id: number;
  username: string | null;
  action: string;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
};

export type AdminAccessResponse = {
  currentUser: AdminUser;
  admins: AdminAccountRow[];
  auditLog: AuditEntry[];
  posture: {
    jwtConfigured: boolean;
    accessTokenTtlMinutes: number;
    refreshTokenTtlDays: number;
    loginMaxAttempts: number;
    loginWindowMinutes: number;
    failedLogins24h: number;
    geoLookupEnabled: boolean;
    minPasswordLength: number;
  };
};
