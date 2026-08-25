/**
 * Thin API client for the Express backend.
 *
 * Always uses relative URLs (`/api/...`) so the same bundle works behind the
 * Vite dev proxy and in production where both are served from one origin.
 *
 * XMLHttpRequest is used for the upload because `fetch` still cannot report
 * upload progress — and a progress bar is a core requirement here.
 */

import type {
  ApiEnvelope,
  AudioLanguage,
  HealthStatus,
  ServerInfo,
  TranscriptionResult,
} from '../types';
import type { LayoutResponse } from '../types/layout';
import type { WidgetCatalogue, WidgetConfigResponse, WidgetPublicStats } from '../types/widgets';

/** Error carrying the server's stable `code`, which the UI maps to a locale string. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError('NETWORK', 'Could not reach the server.');
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !body?.success) {
    throw new ApiError(
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? `Request failed (${response.status}).`,
      response.status,
    );
  }
  return body.data as T;
}

export const getHealth = (signal?: AbortSignal) => getJson<HealthStatus>('/health', signal);
export const getServerInfo = (signal?: AbortSignal) => getJson<ServerInfo>('/api/info', signal);

export type TranscribeOptions = {
  file: File;
  language: AudioLanguage;
  /** 0–100 while the file is being uploaded. */
  onUploadProgress?: (percent: number) => void;
  /** Fired once the upload finishes and the model starts working. */
  onUploadComplete?: () => void;
  /** Fired when the server begins streaming its response back. */
  onResponseStart?: () => void;
  signal?: AbortSignal;
};

export function transcribe({
  file,
  language,
  onUploadProgress,
  onUploadComplete,
  onResponseStart,
  signal,
}: TranscribeOptions): Promise<{ result: TranscriptionResult; durationMs?: number }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('audio', file);
    if (language !== 'auto') form.append('language', language);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/transcribe', true);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    // Upload finished; the server is now waiting on the AI model.
    xhr.upload.addEventListener('load', () => {
      onUploadProgress?.(100);
      onUploadComplete?.();
    });

    // HEADERS_RECEIVED: the model has finished and the server is replying.
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) onResponseStart?.();
    });

    xhr.addEventListener('load', () => {
      // responseType 'json' can still yield a string on some browsers.
      const raw = xhr.response;
      const body: ApiEnvelope<TranscriptionResult> | null =
        typeof raw === 'string' ? safeParse(raw) : raw;

      if (xhr.status >= 200 && xhr.status < 300 && body?.success && body.data) {
        resolve({ result: body.data, durationMs: body.meta?.durationMs });
        return;
      }

      reject(
        new ApiError(
          body?.error?.code ?? 'UNKNOWN',
          body?.error?.message ?? `Request failed (${xhr.status}).`,
          xhr.status,
        ),
      );
    });

    xhr.addEventListener('error', () => {
      reject(new ApiError('NETWORK', 'Could not reach the server.'));
    });
    xhr.addEventListener('timeout', () => {
      reject(new ApiError('UPSTREAM_TIMEOUT', 'The request timed out.'));
    });
    xhr.addEventListener('abort', () => {
      reject(new ApiError('CANCELLED', 'The request was cancelled.'));
    });

    // Detach on settle: without this the listener keeps the XHR (and its
    // FormData/File) reachable for as long as the caller holds the signal.
    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    xhr.addEventListener('loadend', () => signal?.removeEventListener('abort', onAbort));

    // Generous ceiling: a 10 MB clip on a cold model can legitimately take minutes.
    xhr.timeout = 300_000;
    xhr.send(form);
  });
}

/**
 * Header/footer layout. Public and unauthenticated: the site's first paint
 * depends on it. The server falls back to defaults if the database is down,
 * so this resolves even during a CMS outage.
 */
export function getLayout(signal?: AbortSignal): Promise<LayoutResponse> {
  return getJson<LayoutResponse>('/api/layout/header-footer', signal);
}

/* ---------------- Sidebar widget engine ---------------- */

/**
 * The active sidebar arrangement. Public for the same reason as the layout:
 * the website's first paint depends on it, and the server degrades to its
 * built-in defaults rather than erroring when the database is down.
 */
export const getWidgetConfig = (signal?: AbortSignal) =>
  getJson<WidgetConfigResponse>('/api/widgets/config', signal);

/**
 * The type registry and its per-type settings schema.
 *
 * Fetched rather than hardcoded so the admin form is generated from exactly
 * the schema the server validates against — adding a widget type server-side
 * cannot leave the editor out of date.
 */
export const getWidgetCatalogue = (signal?: AbortSignal) =>
  getJson<WidgetCatalogue>('/api/widgets/catalogue', signal);

/** Aggregate counts for the live widgets. Never per-visitor detail. */
export const getWidgetPublicStats = (signal?: AbortSignal) =>
  getJson<WidgetPublicStats>('/api/widgets/public-stats', signal);

function safeParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
