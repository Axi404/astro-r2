export const DEFAULT_IMAGE_PAGE_SIZE = 60;
export const MAX_IMAGE_PAGE_SIZE = 100;

export interface ImageListQuery {
  limit: number;
  cursor: string | null;
  prefix: string;
}

interface DeleteKeysPayload {
  key?: unknown;
  keys?: unknown;
}

function parseInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function clampImageListLimit(value: number): number {
  return Math.min(Math.max(value, 1), MAX_IMAGE_PAGE_SIZE);
}

export function parseImageListQuery(url: URL): ImageListQuery {
  const limit = clampImageListLimit(
    parseInteger(url.searchParams.get('limit'), DEFAULT_IMAGE_PAGE_SIZE)
  );
  const cursor = url.searchParams.get('cursor');
  const prefix = url.searchParams.get('prefix')?.trim() || '';

  return {
    limit,
    cursor: cursor || null,
    prefix,
  };
}

export function parseDeleteKeys(payload: DeleteKeysPayload | null | undefined): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (typeof payload.key === 'string') {
    return payload.key.trim() ? [payload.key.trim()] : [];
  }

  if (!Array.isArray(payload.keys)) {
    return [];
  }

  return [...new Set(payload.keys)]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}
