import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ToastManager } from './Toast';
import { useToast } from '../hooks/useToast';

interface UploadedImage {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

interface UploadResponse {
  success: boolean;
  data?: UploadedImage;
  error?: string;
  details?: string;
}

interface PreviewImage {
  id: string;
  file: File;
  preview: string;
  originalSize: number;
  compressedSize?: number;
  compressedPreview?: string;
  compressedFile?: File;
  isProcessing: boolean;
}

const PREVIEW_CONCURRENCY = 2;
const UPLOAD_CONCURRENCY = 3;

function canCompress(file: File): boolean {
  return (
    file.type.startsWith('image/') &&
    file.type !== 'image/svg+xml' &&
    file.type !== 'image/gif'
  );
}

function revokePreviewUrls(image: PreviewImage): void {
  URL.revokeObjectURL(image.preview);
  if (image.compressedPreview) {
    URL.revokeObjectURL(image.compressedPreview);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let currentIndex = 0;

  const worker = async () => {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index], index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

export default function ImageUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [quality, setQuality] = useState(80);
  const [useHashName, setUseHashName] = useState(false);
  const [enableWebpCompression, setEnableWebpCompression] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImagesRef = useRef<PreviewImage[]>([]);
  const compressionRunIdRef = useRef(0);
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    previewImagesRef.current = previewImages;
  }, [previewImages]);

  const createCompressedPreview = async (
    file: File,
    nextQuality: number
  ): Promise<{ blob: Blob; url: string }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const image = new Image();
      const sourceUrl = URL.createObjectURL(file);

      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        context?.drawImage(image, 0, 0);
        URL.revokeObjectURL(sourceUrl);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create compressed preview'));
              return;
            }

            resolve({
              blob,
              url: URL.createObjectURL(blob),
            });
          },
          'image/webp',
          nextQuality / 100
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error('Failed to load image'));
      };

      image.src = sourceUrl;
    });
  };

  const redirectToLogin = () => {
    window.location.assign(`/login?next=${encodeURIComponent('/')}`);
  };

  const syncCompressionState = useCallback(
    async (
      images: PreviewImage[],
      nextQuality: number,
      compressionEnabled: boolean
    ) => {
      const runId = compressionRunIdRef.current + 1;
      compressionRunIdRef.current = runId;

      if (!compressionEnabled) {
        setPreviewImages((prev) =>
          prev.map((image) => {
            if (image.compressedPreview) {
              URL.revokeObjectURL(image.compressedPreview);
            }

            return {
              ...image,
              compressedPreview: undefined,
              compressedSize: undefined,
              compressedFile: undefined,
              isProcessing: false,
            };
          })
        );
        return;
      }

      const compressibleIds = new Set(
        images.filter((image) => canCompress(image.file)).map((image) => image.id)
      );

      setPreviewImages((prev) =>
        prev.map((image) => {
          if (!compressibleIds.has(image.id)) {
            if (image.compressedPreview) {
              URL.revokeObjectURL(image.compressedPreview);
            }

            return {
              ...image,
              compressedPreview: undefined,
              compressedSize: undefined,
              compressedFile: undefined,
              isProcessing: false,
            };
          }

          return {
            ...image,
            isProcessing: true,
          };
        })
      );

      await mapWithConcurrency(
        images.filter((image) => compressibleIds.has(image.id)),
        PREVIEW_CONCURRENCY,
        async (image) => {
          try {
            const compressed = await createCompressedPreview(image.file, nextQuality);
            if (compressionRunIdRef.current !== runId) {
              URL.revokeObjectURL(compressed.url);
              return;
            }

            setPreviewImages((prev) =>
              prev.map((item) => {
                if (item.id !== image.id) {
                  return item;
                }

                if (item.compressedPreview && item.compressedPreview !== compressed.url) {
                  URL.revokeObjectURL(item.compressedPreview);
                }

                return {
                  ...item,
                  compressedSize: compressed.blob.size,
                  compressedPreview: compressed.url,
                  compressedFile: new File(
                    [compressed.blob],
                    item.file.name.replace(/\.[^/.]+$/, '') + '.webp',
                    { type: 'image/webp' }
                  ),
                  isProcessing: false,
                };
              })
            );
          } catch (error) {
            console.error('Failed to create compressed preview:', error);
            if (compressionRunIdRef.current !== runId) {
              return;
            }

            setPreviewImages((prev) =>
              prev.map((item) =>
                item.id === image.id
                  ? {
                      ...item,
                      isProcessing: false,
                    }
                  : item
              )
            );
          }
        }
      );
    },
    []
  );

  useEffect(() => {
    if (previewImages.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      void syncCompressionState(previewImagesRef.current, quality, enableWebpCompression);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [enableWebpCompression, quality, syncCompressionState]);

  useEffect(() => {
    return () => {
      compressionRunIdRef.current += 1;
      previewImagesRef.current.forEach(revokePreviewUrls);
    };
  }, []);

  const replacePreviews = (images: PreviewImage[]) => {
    compressionRunIdRef.current += 1;
    setPreviewImages((prev) => {
      prev.forEach(revokePreviewUrls);
      return images;
    });
  };

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      showError('请选择图片文件');
      return;
    }

    const nextPreviewImages = imageFiles.map<PreviewImage>((file, index) => ({
      id: `${file.name}-${file.lastModified}-${file.size}-${index}-${crypto.randomUUID()}`,
      file,
      preview: URL.createObjectURL(file),
      originalSize: file.size,
      isProcessing: enableWebpCompression && canCompress(file),
    }));

    replacePreviews(nextPreviewImages);
    await syncCompressionState(nextPreviewImages, quality, enableWebpCompression);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('useHashName', useHashName.toString());

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.status === 401) {
      redirectToLogin();
      throw new Error('登录已过期，请重新登录');
    }

    const result = (await response.json().catch(() => ({}))) as UploadResponse;
    if (!response.ok) {
      throw new Error(result.error || result.details || '上传失败');
    }

    return result;
  };

  const uploadPreviewImages = async () => {
    if (previewImages.length === 0) {
      showInfo('没有可上传的图片');
      return;
    }

    setIsUploading(true);

    try {
      const snapshots = [...previewImagesRef.current];
      const results = await mapWithConcurrency(
        snapshots,
        UPLOAD_CONCURRENCY,
        async (image) => {
          const fileToUpload =
            enableWebpCompression && canCompress(image.file) && image.compressedFile
              ? image.compressedFile
              : image.file;

          try {
            const result = await uploadFile(fileToUpload);
            return {
              id: image.id,
              fileName: fileToUpload.name,
              result,
            };
          } catch (error) {
            return {
              id: image.id,
              fileName: image.file.name,
              error: error instanceof Error ? error.message : '上传失败',
            };
          }
        }
      );

      const successfulIds = new Set<string>();
      const nextUploadedImages: UploadedImage[] = [];
      const failedFiles: string[] = [];

      results.forEach((item) => {
        if (item.result?.success && item.result.data) {
          successfulIds.add(item.id);
          nextUploadedImages.push(item.result.data);
          return;
        }

        failedFiles.push(`${item.fileName}: ${item.error || item.result?.error || '上传失败'}`);
      });

      if (nextUploadedImages.length > 0) {
        setUploadedImages((prev) => [...nextUploadedImages.reverse(), ...prev].slice(0, 12));
        showSuccess(
          nextUploadedImages.length === 1
            ? '图片上传成功'
            : `成功上传 ${nextUploadedImages.length} 张图片`
        );
      }

      if (failedFiles.length > 0) {
        showError(
          failedFiles.length === 1
            ? failedFiles[0]
            : `${failedFiles.length} 张图片上传失败`
        );
      }

      if (successfulIds.size > 0) {
        setPreviewImages((prev) => {
          const remaining = prev.filter((image) => !successfulIds.has(image.id));
          prev
            .filter((image) => successfulIds.has(image.id))
            .forEach(revokePreviewUrls);
          return remaining;
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removePreviewImage = async (id: string) => {
    const currentImages = previewImagesRef.current;
    const imageToRemove = currentImages.find((image) => image.id === id);
    if (!imageToRemove) {
      return;
    }

    revokePreviewUrls(imageToRemove);
    const remainingImages = currentImages.filter((image) => image.id !== id);
    compressionRunIdRef.current += 1;
    setPreviewImages(remainingImages);

    if (remainingImages.length > 0) {
      await syncCompressionState(remainingImages, quality, enableWebpCompression);
    }
  };

  const clearPreviews = () => {
    compressionRunIdRef.current += 1;
    setPreviewImages((prev) => {
      prev.forEach(revokePreviewUrls);
      return [];
    });
  };

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      await handleFiles(event.dataTransfer.files);
    },
    [enableWebpCompression, quality]
  );

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }

    await handleFiles(files);
  };

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const files: File[] = [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.type.startsWith('image/')) {
          continue;
        }

        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }

      if (files.length > 0) {
        await handleFiles(files);
      }
    },
    [enableWebpCompression, quality]
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const copyToClipboard = async (text: string, label: '链接' | 'Markdown' = '链接') => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`已复制${label}`, 1800);
    } catch (error) {
      console.error('复制失败:', error);
      showError('复制失败，请手动复制');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const renderCompressionBadge = (previewImage: PreviewImage) => {
    if (!previewImage.compressedSize) {
      return null;
    }

    const delta = previewImage.originalSize - previewImage.compressedSize;
    const percent = Math.round(Math.abs(delta / previewImage.originalSize) * 100);
    const badgeClass =
      delta >= 0
        ? 'border border-[rgba(94,125,102,0.18)] bg-[rgba(94,125,102,0.92)] text-[var(--paper-strong)]'
        : 'border border-[rgba(167,96,82,0.18)] bg-[rgba(167,96,82,0.92)] text-[var(--paper-strong)]';
    const badgeText = delta >= 0 ? `-${percent}%` : `+${percent}%`;

    return (
      <div
        className={`absolute bottom-3 right-3 rounded-[12px] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${badgeClass}`}
      >
        {badgeText}
      </div>
    );
  };

  const processingCount = previewImages.filter((image) => image.isProcessing).length;
  const compressedCount = previewImages.filter((image) => image.compressedSize).length;
  const recentCountLabel = uploadedImages.length > 0 ? `${uploadedImages.length} 条` : '暂无';

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <section className="panel panel-light p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl text-[var(--ink)] sm:text-4xl">上传</h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">拖拽、粘贴或选择文件。</p>
            </div>
            <a href="/gallery" className="button-ghost whitespace-nowrap px-4 py-2.5">
              图库
            </a>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div
              className={`flex min-h-[260px] flex-col items-center justify-center rounded-[16px] border px-6 py-8 text-center ${
                isDragging
                  ? 'border-[var(--accent)] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                  : 'border-dashed border-[var(--line-strong)] bg-[rgba(255,255,255,0.58)]'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <h3 className="font-display text-[2rem] leading-tight text-[var(--ink)] sm:text-[2.4rem]">
                {isDragging ? '松开上传' : '拖拽到此上传'}
              </h3>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                支持 JPG / PNG / GIF / WebP / SVG
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="button-primary px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? '上传中' : '选择文件'}
                </button>
                <span className="status-pill text-[var(--ink-soft)]">
                  {previewImages.length > 0 ? `${previewImages.length} 待上传` : '空队列'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="metric-card p-4">
                <div className="space-y-3">
                  <label className="flex items-start gap-3 text-sm text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={useHashName}
                      onChange={(event) => setUseHashName(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)]"
                    />
                    <span>随机文件名</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={enableWebpCompression}
                      onChange={(event) => setEnableWebpCompression(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)]"
                    />
                    <span>上传前压缩为 WebP</span>
                  </label>
                </div>

                {enableWebpCompression ? (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <div className="mb-2 flex items-center justify-between text-sm text-[var(--ink-soft)]">
                      <span>压缩质量</span>
                      <span className="font-semibold text-[var(--ink)]">{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(event) => setQuality(Number.parseInt(event.target.value, 10))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(28,35,29,0.1)]"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="metric-card p-3 text-center">
                  <p className="text-[11px] text-[var(--muted)]">队列</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{previewImages.length}</p>
                </div>
                <div className="metric-card p-3 text-center">
                  <p className="text-[11px] text-[var(--muted)]">压缩</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{compressedCount}</p>
                </div>
                <div className="metric-card p-3 text-center">
                  <p className="text-[11px] text-[var(--muted)]">处理中</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{processingCount}</p>
                </div>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </section>

        {previewImages.length > 0 ? (
        <div className="panel panel-light p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow text-[var(--muted)]">上传前检查</p>
              <h3 className="mt-2 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                待上传 {previewImages.length}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">确认后上传。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="status-pill text-[var(--ink-soft)]">
                {processingCount > 0 ? `处理中 ${processingCount}` : '已就绪'}
              </div>
              <button
                onClick={clearPreviews}
                className="button-secondary"
              >
                清空预览
              </button>
              <button
                onClick={() => void uploadPreviewImages()}
                disabled={isUploading || previewImages.some((image) => image.isProcessing)}
                className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? '上传中...' : '开始上传'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {previewImages.map((previewImage) => {
              const showOriginalFallback =
                !enableWebpCompression || !previewImage.compressedPreview;

              return (
                <article
                  key={previewImage.id}
                  className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-[rgba(255,252,247,0.74)]"
                >
                  <div className="border-b border-[var(--line)] px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="eyebrow text-[var(--muted)]">待上传文件</p>
                        <h4 className="mt-2 truncate font-display text-3xl text-[var(--ink)]">
                          {previewImage.file.name}
                        </h4>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {formatFileSize(previewImage.originalSize)} • {previewImage.file.type}
                        </p>
                      </div>
                      <button
                        onClick={() => void removePreviewImage(previewImage.id)}
                        className="rounded-[12px] border border-[var(--line)] bg-white/80 p-2 text-[var(--muted)] transition-colors hover:border-[rgba(167,96,82,0.22)] hover:text-[var(--danger)]"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <h5 className="eyebrow text-[var(--muted)]">原图</h5>
                        <div className="relative overflow-hidden rounded-[16px] border border-[var(--line)] bg-[rgba(244,240,232,0.84)] p-2">
                          <img
                            src={previewImage.preview}
                            alt="Original"
                            className="h-44 w-full rounded-[12px] object-cover"
                          />
                          <div className="absolute bottom-4 left-4 rounded-[12px] bg-[rgba(31,38,34,0.82)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--paper-strong)]">
                            {formatFileSize(previewImage.originalSize)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="eyebrow text-[var(--muted)]">
                          {enableWebpCompression ? '压缩后（WebP）' : '原图格式'}
                        </h5>
                        <div className="relative overflow-hidden rounded-[16px] border border-[var(--line)] bg-[rgba(244,240,232,0.84)] p-2">
                          {previewImage.isProcessing ? (
                            <div className="flex h-44 w-full items-center justify-center rounded-[12px] border border-dashed border-[var(--line)] bg-white/70">
                              <div className="text-center">
                                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-b-2 border-[var(--accent)]"></div>
                                <div className="eyebrow text-[var(--muted)]">压缩中</div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <img
                                src={showOriginalFallback ? previewImage.preview : previewImage.compressedPreview}
                                alt="Processed"
                                className="h-44 w-full rounded-[12px] object-cover"
                              />
                              <div className="absolute bottom-4 left-4 rounded-[12px] bg-[rgba(31,38,34,0.82)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--paper-strong)]">
                                {formatFileSize(
                                  showOriginalFallback
                                    ? previewImage.originalSize
                                    : previewImage.compressedSize || 0
                                )}
                              </div>
                              {!showOriginalFallback ? renderCompressionBadge(previewImage) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
                        <p className="eyebrow text-[var(--muted)]">上传方式</p>
                        <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
                          {useHashName ? '随机文件名' : '原名 + 时间戳'}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          {enableWebpCompression && previewImage.compressedFile
                            ? '按 WebP 结果上传'
                            : '按原始格式上传'}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
                        <p className="eyebrow text-[var(--muted)]">体积变化</p>
                        {previewImage.compressedSize && !previewImage.isProcessing ? (
                          <>
                            <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
                              {formatFileSize(previewImage.originalSize)} → {formatFileSize(previewImage.compressedSize)}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                              {previewImage.originalSize >= previewImage.compressedSize
                                ? `节省 ${formatFileSize(previewImage.originalSize - previewImage.compressedSize)}`
                                : `增加 ${formatFileSize(previewImage.compressedSize - previewImage.originalSize)}`}
                            </p>
                          </>
                        ) : (
                          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                            {previewImage.isProcessing ? '正在计算。' : '当前没有压缩差值。'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        ) : null}
      </div>

      <aside className="panel panel-light p-5 sm:p-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7.6rem)] xl:overflow-y-auto">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-[var(--muted)]">最近上传</p>
            <h3 className="mt-1 font-display text-2xl text-[var(--ink)]">快速复制</h3>
          </div>
          <span className="text-xs text-[var(--muted)]">{recentCountLabel}</span>
        </div>

        <div className="space-y-3">
          {uploadedImages.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              上传完成后会出现在这里，可直接复制链接。
            </div>
          ) : (
            uploadedImages.map((image, index) => (
              <article
                key={`${image.key}-${index}`}
                className="rounded-[14px] border border-[var(--line)] bg-[rgba(255,255,255,0.74)] p-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={image.url}
                    alt="Uploaded"
                    className="h-14 w-14 rounded-[10px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {image.key.split('/').pop()}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {formatFileSize(image.size)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void copyToClipboard(image.url, '链接')}
                    className="button-secondary px-3 py-2"
                  >
                    链接
                  </button>
                  <button
                    onClick={() => void copyToClipboard(`![Image](${image.url})`, 'Markdown')}
                    className="button-secondary px-3 py-2"
                  >
                    Markdown
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <a href="/gallery" className="button-secondary mt-4 w-full">
          打开图库
        </a>
      </aside>

      <ToastManager toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
