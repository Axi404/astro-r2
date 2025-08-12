import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import sharp from 'sharp';
import mimeTypes from 'mime-types';

export interface R2Config {
  accountId: string;
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
    if (!options.compressToWebp || !mimeType.startsWith('image/')) {
      return { 
        buffer, 
        mimeType, 
        ext: mimeTypes.extension(mimeType) || 'bin' 
      };
    }

    try {
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
        ext: mimeTypes.extension(mimeType) || 'bin' 
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

    // 处理图片（可选压缩为 WebP）
    const processed = await this.processImage(buffer, mimeType, options);
    
    // 生成文件名
    const fileName = this.generateFileName(
      originalName.replace(/\.[^/.]+$/, `.${processed.ext}`),
      options.useHashName
    );

    const key = fileName;

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: processed.buffer,
      ContentType: processed.mimeType,
      CacheControl: 'public, max-age=31536000', // 1年缓存
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

  async listImages(prefix: string = '', maxKeys: number = 100, offset: number = 0): Promise<ImageInfo[]> {
    // R2/S3 doesn't directly support offset, so we need to fetch more and slice
    // For better performance, we could implement marker-based pagination in the future
    const fetchLimit = maxKeys + offset;
    
    const command = new ListObjectsV2Command({
      Bucket: this.config.bucketName,
      Prefix: prefix,
      MaxKeys: Math.min(fetchLimit, 1000), // R2 max limit is 1000
    });

    const response = await this.client.send(command);
    
    const allImages = (response.Contents || []).map(object => ({
      key: object.Key!,
      url: `${this.config.publicUrl}/${object.Key}`,
      size: object.Size || 0,
      mimeType: mimeTypes.lookup(object.Key!) || 'application/octet-stream',
      uploadedAt: object.LastModified || new Date(),
    }));

    // Apply offset and limit
    return allImages.slice(offset, offset + maxKeys);
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }
}

// 获取环境变量配置
export function getR2Config(): R2Config {
  const getValue = (key: string) => import.meta.env[key] || process.env[key];

  return {
    accountId: getValue('R2_ACCOUNT_ID') || '',
    accessKeyId: getValue('R2_ACCESS_KEY_ID') || '',
    secretAccessKey: getValue('R2_SECRET_ACCESS_KEY') || '',
    bucketName: getValue('R2_BUCKET_NAME') || '',
    endpoint: getValue('R2_ENDPOINT') || '',
    publicUrl: getValue('R2_PUBLIC_URL') || '',
  };
}