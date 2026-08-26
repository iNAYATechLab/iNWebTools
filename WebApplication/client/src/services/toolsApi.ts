/**
 * Tools API client — communicates with /api/tools endpoints.
 */

import type { ToolDefinition, ToolExecutionResponse, ToolModule } from '../types/tools';

interface RegistryResponse {
  modules: ToolModule[];
  total: number;
  tools: ToolDefinition[];
}

/**
 * Fetch tools from the registry.
 */
export async function getToolsRegistry(params?: {
  module?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  search?: string;
  featured?: boolean;
}): Promise<RegistryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.module) searchParams.set('module', params.module);
  if (params?.categorySlug) searchParams.set('categorySlug', params.categorySlug);
  if (params?.subcategorySlug) searchParams.set('subcategorySlug', params.subcategorySlug);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.featured !== undefined) searchParams.set('featured', String(params.featured));

  const queryStr = searchParams.toString();
  const url = `/api/tools/registry${queryStr ? `?${queryStr}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load tools registry (${res.status})`);
  }
  const body = (await res.json()) as { success: boolean; data: RegistryResponse };
  return body.data;
}

/**
 * Fetch a single tool definition by slug.
 */
export async function getToolBySlug(slug: string): Promise<ToolDefinition> {
  const res = await fetch(`/api/tools/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    throw new Error(`Tool "${slug}" not found`);
  }
  const body = (await res.json()) as { success: boolean; data: ToolDefinition };
  return body.data;
}

/**
 * Execute a tool processing request.
 */
export async function executeTool(
  slug: string,
  files: File[],
  options: Record<string, unknown>,
  rawContent?: string,
): Promise<ToolExecutionResponse> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  if (rawContent) {
    formData.append('content', rawContent);
  }

  formData.append('options', JSON.stringify(options));

  const res = await fetch(`/api/tools/execute/${encodeURIComponent(slug)}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(errorBody?.error?.message || `Processing failed with status ${res.status}`);
  }

  const body = (await res.json()) as { success: boolean; data: ToolExecutionResponse };
  return body.data;
}
