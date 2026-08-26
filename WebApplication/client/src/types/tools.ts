/**
 * Tool Registry & Execution Types for iNWebTools.
 */

export type ToolOptionType = 'select' | 'slider' | 'toggle' | 'text' | 'password';

export interface ToolOption {
  id: string;
  label: string;
  type: ToolOptionType;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  default?: string | number | boolean;
  unit?: string;
}

export interface ToolModule {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
}

export interface ToolDefinition {
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  module: 'document-pdf' | 'image-graphics' | string;
  categorySlug: string;
  subcategorySlug?: string;
  icon?: string;
  tags?: string[];
  inputFormats?: string[];
  outputFormats?: string[];
  defaultOutput?: string;
  isFeatured?: boolean;
  isPremium?: boolean;
  options?: ToolOption[];
  usageCount?: number;
  moduleInfo?: ToolModule;
}

export interface ColorSwatch {
  hex: string;
  rgb: string;
  hsl: string;
  name: string;
  dominance: number;
}

export interface ExifData {
  camera: {
    make: string;
    model: string;
    lens: string;
    software: string;
  };
  exposure: {
    iso: number;
    fNumber: string;
    exposureTime: string;
    focalLength: string;
    exposureCompensation: string;
  };
  image: {
    width: number;
    height: number;
    colorSpace: string;
    orientation: string;
    dateCreated: string;
  };
  gps?: {
    latitude: number;
    longitude: number;
    altitude: string;
    locationName: string;
  };
  file: {
    name: string;
    sizeBytes: number;
    format: string;
  };
}

export interface ToolExecutionResult {
  resultType: 'file' | 'text' | 'json' | 'data' | 'palette' | 'metadata';
  fileName?: string;
  mimeType?: string;
  content?: string;
  data?: unknown;
  palette?: ColorSwatch[];
  metadata?: ExifData | Record<string, unknown>;
  message?: string;
  stats?: Record<string, string | number | boolean>;
}

export interface ToolExecutionResponse {
  tool: {
    slug: string;
    name: string;
    module: string;
  };
  result: ToolExecutionResult;
  durationMs: number;
}
