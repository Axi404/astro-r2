import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import crypto from 'crypto';
import mimeTypes from 'mime-types';

export interface R2Config {
  accountId?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  publicUrl: string;
}

export interface UploadOptions {
  useHashName?: boolean;
  compressToWebp?: boolean;
  quality?: number;
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

export class R2Service {
  private client: S3Client;
  private config: R2Config;

  constructor(config: R2Config) {
    this.config = config;
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  private generateFileName(originalName: string, useHash: boolean = false): string {
    const ext = originalName.split('.').pop() || '';
    
    if (useHash) {
      const hash = crypto.randomBytes(16).toString('hex');
      return `${hash}.${ext}`;
    }
    
    const timestamp = Date.now();
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${timestamp}_${cleanName}`;
  }

  private async processImage(
    buffer: Buffer,
    mimeType: string,
    options: UploadOptions
  ): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
    const shouldSkipCompression =
      !options.compressToWebp ||
      !mimeType.startsWith('image/') ||
      mimeType === 'image/svg+xml' ||
      mimeType === 'image/gif';

    if (shouldSkipCompression) {
      return {
        buffer,
        mimeType,
        ext: mimeTypes.extension(mimeType) || 'bin',
      };
    }

    try {
      const sharp = (await import('sharp')).default;
      const webpBuffer = await sharp(buffer)
        .webp({ quality: options.quality || 80 })
        .toBuffer();
      
      return {
        buffer: webpBuffer,
        mimeType: 'image/webp',
        ext: 'webp'
      };
    } catch (error) {
      console.warn('Failed to convert to WebP, using original format:', error);
      return {
        buffer,
        mimeType,
        ext: mimeTypes.extension(mimeType) || 'bin',
      };
    }
  }

  async uploadImage(
    file: File | Buffer,
    originalName: string,
    options: UploadOptions = {}
  ): Promise<ImageInfo> {
    let buffer: Buffer;
    let mimeType: string;

    if (file instanceof File) {
      buffer = Buffer.from(await file.arrayBuffer());
      mimeType = file.type;
      originalName = file.name;
    } else {
      buffer = file;
      mimeType = mimeTypes.lookup(originalName) || 'application/octet-stream';
    }

    const processed = await this.processImage(buffer, mimeType, options);

    const normalizedOriginalName = originalName.includes('.')
      ? originalName.replace(/\.[^/.]+$/, `.${processed.ext}`)
      : `${originalName}.${processed.ext}`;
    const fileName = this.generateFileName(normalizedOriginalName, options.useHashName);

    const key = fileName;

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: processed.buffer,
      ContentType: processed.mimeType,
      CacheControl: 'public, max-age=31536000',
    });

    await this.client.send(command);

    return {
      key,
      url: `${this.config.publicUrl}/${key}`,
      size: processed.buffer.length,
      mimeType: processed.mimeType,
      uploadedAt: new Date(),
    };
  }

  async deleteImage(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  async deleteImages(keys: string[]): Promise<DeleteImagesResult> {
    const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
    const results = await Promise.allSettled(uniqueKeys.map((key) => this.deleteImage(key)));

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

  async listImages(
    prefix: string = '',
    maxKeys: number = 60,
    cursor?: string | null
  ): Promise<ListImagesResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.config.bucketName,
      Prefix: prefix || undefined,
      MaxKeys: Math.min(Math.max(maxKeys, 1), 1000),
      ContinuationToken: cursor || undefined,
    });

    const response = await this.client.send(command);

    const images = (response.Contents || []).map((object) => ({
      key: object.Key!,
      url: `${this.config.publicUrl}/${object.Key}`,
      size: object.Size || 0,
      mimeType: mimeTypes.lookup(object.Key!) || 'application/octet-stream',
      uploadedAt: object.LastModified || new Date(),
    }));

    return {
      images,
      nextCursor: response.NextContinuationToken || null,
      hasMore: Boolean(response.IsTruncated && response.NextContinuationToken),
    };
  }
}

let r2ServiceSingleton: R2Service | null = null;

function getRequiredValue(key: string): string {
  const value = import.meta.env[key] || process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getR2Config(): R2Config {
  const publicUrl = getRequiredValue('R2_PUBLIC_URL').replace(/\/+$/, '');

  return {
    accountId: import.meta.env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID,
    accessKeyId: getRequiredValue('R2_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredValue('R2_SECRET_ACCESS_KEY'),
    bucketName: getRequiredValue('R2_BUCKET_NAME'),
    endpoint: getRequiredValue('R2_ENDPOINT'),
    publicUrl,
  };
}

export function getR2Service(): R2Service {
  if (!r2ServiceSingleton) {
    r2ServiceSingleton = new R2Service(getR2Config());
  }

  return r2ServiceSingleton;
}
