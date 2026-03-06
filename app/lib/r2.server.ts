import mimeTypes from 'mime-types';

export interface UploadOptions {
  useHashName?: boolean;
}

export interface ImageInfo {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface ListImagesResult {
  images: ImageInfo[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface DeleteImagesResult {
  deleted: string[];
  failed: Array<{
    key: string;
    error: string;
  }>;
}

function getPublicUrlBase(env: Env): string {
  if (!env.R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL is not configured');
  }

  return env.R2_PUBLIC_URL.replace(/\/+$/, '');
}

function getBucket(env: Env): R2Bucket {
  if (!env.IMAGES_BUCKET) {
    throw new Error('IMAGES_BUCKET binding is not configured');
  }

  return env.IMAGES_BUCKET;
}

function encodeObjectKey(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function generateFileName(originalName: string, useHash = false): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() || '' : '';

  if (useHash) {
    const hash = crypto.randomUUID().replace(/-/g, '');
    return ext ? `${hash}.${ext}` : hash;
  }

  const timestamp = Date.now();
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${timestamp}_${cleanName}`;
}

function getMimeType(objectKey: string, fallback?: string | null): string {
  return fallback || mimeTypes.lookup(objectKey) || 'application/octet-stream';
}

function toImageInfo(
  key: string,
  size: number,
  uploadedAt: Date,
  mimeType: string,
  env: Env
): ImageInfo {
  return {
    key,
    url: `${getPublicUrlBase(env)}/${encodeObjectKey(key)}`,
    size,
    mimeType,
    uploadedAt,
  };
}

export async function uploadImage(
  env: Env,
  file: File,
  options: UploadOptions = {}
): Promise<ImageInfo> {
  const extFromMime = mimeTypes.extension(file.type) || 'bin';
  const normalizedOriginalName = file.name.includes('.')
    ? file.name
    : `${file.name}.${extFromMime}`;
  const key = generateFileName(normalizedOriginalName, options.useHashName);
  const bucket = getBucket(env);

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || getMimeType(key),
      cacheControl: 'public, max-age=31536000',
    },
  });

  const object = await bucket.head(key);
  if (!object) {
    throw new Error('Uploaded object could not be read back from R2');
  }

  return toImageInfo(
    object.key,
    object.size,
    object.uploaded,
    getMimeType(object.key, object.httpMetadata?.contentType || null),
    env
  );
}

export async function listImages(
  env: Env,
  prefix = '',
  maxKeys = 60,
  cursor?: string | null
): Promise<ListImagesResult> {
  const bucket = getBucket(env);
  const result = await bucket.list({
    prefix: prefix || undefined,
    limit: Math.min(Math.max(maxKeys, 1), 1000),
    cursor: cursor || undefined,
  });

  return {
    images: result.objects.map((object) =>
      toImageInfo(
        object.key,
        object.size,
        object.uploaded,
        getMimeType(object.key),
        env
      )
    ),
    nextCursor: result.truncated ? result.cursor || null : null,
    hasMore: result.truncated,
  };
}

export async function deleteImages(env: Env, keys: string[]): Promise<DeleteImagesResult> {
  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  const bucket = getBucket(env);
  const results = await Promise.allSettled(uniqueKeys.map((key) => bucket.delete(key)));

  return results.reduce<DeleteImagesResult>(
    (accumulator, result, index) => {
      const key = uniqueKeys[index];

      if (result.status === 'fulfilled') {
        accumulator.deleted.push(key);
        return accumulator;
      }

      accumulator.failed.push({
        key,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      });
      return accumulator;
    },
    {
      deleted: [],
      failed: [],
    }
  );
}

export function getMaxFileSize(env: Env): number {
  const value = env.MAX_FILE_SIZE || '10485760';
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 10485760;
}
