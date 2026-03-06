import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
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

type RequiredEnvKey =
  | 'R2_ACCESS_KEY_ID'
  | 'R2_SECRET_ACCESS_KEY'
  | 'R2_BUCKET_NAME'
  | 'R2_ENDPOINT'
  | 'R2_PUBLIC_URL';

let r2ClientSingleton: S3Client | null = null;

function getRequiredEnv(key: RequiredEnvKey): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
}

function getR2Client(): S3Client {
  if (!r2ClientSingleton) {
    r2ClientSingleton = new S3Client({
      region: 'auto',
      endpoint: getRequiredEnv('R2_ENDPOINT'),
      credentials: {
        accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  return r2ClientSingleton;
}

function getBucketName(): string {
  return getRequiredEnv('R2_BUCKET_NAME');
}

function getPublicUrlBase(): string {
  return getRequiredEnv('R2_PUBLIC_URL').replace(/\/+$/, '');
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
    const hash = randomUUID().replace(/-/g, '');
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
  mimeType: string
): ImageInfo {
  return {
    key,
    url: `${getPublicUrlBase()}/${encodeObjectKey(key)}`,
    size,
    mimeType,
    uploadedAt,
  };
}

export async function uploadImage(file: File, options: UploadOptions = {}): Promise<ImageInfo> {
  const extFromMime = mimeTypes.extension(file.type) || 'bin';
  const normalizedOriginalName = file.name.includes('.')
    ? file.name
    : `${file.name}.${extFromMime}`;
  const key = generateFileName(normalizedOriginalName, options.useHashName);
  const body = Buffer.from(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: file.type || getMimeType(key),
      CacheControl: 'public, max-age=31536000',
    })
  );

  return toImageInfo(
    key,
    body.length,
    new Date(),
    file.type || getMimeType(key)
  );
}

export async function listImages(
  prefix = '',
  maxKeys = 60,
  cursor?: string | null
): Promise<ListImagesResult> {
  const result = await getR2Client().send(
    new ListObjectsV2Command({
      Bucket: getBucketName(),
      Prefix: prefix || undefined,
      MaxKeys: Math.min(Math.max(maxKeys, 1), 1000),
      ContinuationToken: cursor || undefined,
    })
  );

  return {
    images: (result.Contents || [])
      .filter((object): object is typeof object & { Key: string } => Boolean(object.Key))
      .map((object) =>
        toImageInfo(
          object.Key,
          object.Size || 0,
          object.LastModified || new Date(),
          getMimeType(object.Key)
        )
      ),
    nextCursor: result.NextContinuationToken || null,
    hasMore: Boolean(result.IsTruncated && result.NextContinuationToken),
  };
}

async function deleteImage(key: string) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
}

export async function deleteImages(keys: string[]): Promise<DeleteImagesResult> {
  const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  const results = await Promise.allSettled(uniqueKeys.map((key) => deleteImage(key)));

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

export function getMaxFileSize(): number {
  const value = process.env.MAX_FILE_SIZE || '10485760';
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 10485760;
}
