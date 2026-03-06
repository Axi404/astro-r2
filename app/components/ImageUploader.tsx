import React, { useCallback, useEffect, useRef, useState } from 'react';
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

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
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
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      await handleFiles(event.dataTransfer.files);
    },
    [enableWebpCompression, quality]
  );

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('链接已复制到剪贴板');
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
    const badgeClass = delta >= 0
      ? 'bg-[rgba(58,160,114,0.92)] text-white'
      : 'bg-[rgba(241,91,42,0.92)] text-[var(--night)]';
    const badgeText = delta >= 0 ? `-${percent}%` : `+${percent}%`;

    return (
      <div className={`absolute bottom-3 right-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${badgeClass}`}>
        {badgeText}
      </div>
    );
  };

  const processingCount = previewImages.filter((image) => image.isProcessing).length;
  const compressedCount = previewImages.filter((image) => image.compressedSize).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.22fr_0.78fr]">
        <div className="panel panel-light grain p-6 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="eyebrow text-[var(--muted)]">Upload Bench</p>
                <h2 className="mt-3 max-w-3xl font-display text-4xl text-[var(--ink)] sm:text-5xl lg:text-6xl">
                  先看结果，再决定怎么发
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
                  上传区被拆成控制板、投递区和预览轨道三层。开关集中、流程顺序明确，避免上传前后信息混在一起。
                </p>
              </div>

              <a
                href="/gallery"
                className="button-secondary"
              >
                查看全部档案
                <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="grid gap-4">
                <div className="metric-card p-5">
                  <p className="eyebrow text-[var(--muted)]">Naming</p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={useHashName}
                      onChange={(event) => setUseHashName(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] focus:ring-[rgba(241,91,42,0.28)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--ink)]">使用随机文件名</span>
                      <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                        {useHashName ? '当前会生成随机哈希名称。' : '当前保持原始文件名，并追加时间戳前缀。'}
                      </span>
                    </span>
                  </label>
                </div>

                <div className="metric-card p-5">
                  <p className="eyebrow text-[var(--muted)]">Compression</p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={enableWebpCompression}
                      onChange={(event) => setEnableWebpCompression(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] focus:ring-[rgba(241,91,42,0.28)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--ink)]">启用 WebP 压缩</span>
                      <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">
                        {enableWebpCompression ? '会在本地生成压缩对照预览。' : '会保留原始格式直接上传。'}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="panel panel-muted p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow text-[var(--muted)]">Quality Dial</p>
                    <p className="mt-3 font-display text-5xl text-[var(--ink)]">{quality}%</p>
                  </div>
                  <div className="status-pill bg-[rgba(241,91,42,0.12)] text-[var(--accent)]">
                    {enableWebpCompression ? 'Preview Active' : 'Bypass'}
                  </div>
                </div>

                {enableWebpCompression ? (
                  <div className="mt-6">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(event) => setQuality(Number.parseInt(event.target.value, 10))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(23,18,13,0.14)]"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div className="mt-2 flex justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      <span>Smaller</span>
                      <span>Sharper</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,255,255,0.5)] p-4">
                        <p className="eyebrow text-[var(--muted)]">Low</p>
                        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">更激进的压缩，适合分享图。</p>
                      </div>
                      <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,255,255,0.5)] p-4">
                        <p className="eyebrow text-[var(--muted)]">Balanced</p>
                        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">默认推荐，通常能兼顾清晰度和体积。</p>
                      </div>
                      <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,255,255,0.5)] p-4">
                        <p className="eyebrow text-[var(--muted)]">High</p>
                        <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">保真优先，适合细节较多的图像。</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                    当前关闭压缩预览，滑杆不会参与上传。
                  </div>
                )}
              </div>
            </div>

            <div
              className={`relative overflow-hidden rounded-[34px] border p-8 transition-all duration-300 sm:p-12 ${
                isDragging
                  ? 'border-[rgba(241,91,42,0.42)] bg-[rgba(255,244,230,0.92)] shadow-[0_28px_70px_rgba(241,91,42,0.12)]'
                  : 'border-[var(--line)] bg-[linear-gradient(155deg,rgba(255,252,246,0.9),rgba(238,224,200,0.62))] hover:border-[rgba(241,91,42,0.26)]'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full border border-[rgba(241,91,42,0.12)] bg-[radial-gradient(circle,_rgba(241,91,42,0.14),_transparent_70%)]" />
              <div className="pointer-events-none absolute bottom-[-34px] left-[-16px] h-28 w-28 rounded-full bg-[radial-gradient(circle,_rgba(23,18,13,0.08),_transparent_68%)]" />

              <div className="relative flex flex-col items-center justify-center space-y-5 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-[var(--line-inverse)] bg-[linear-gradient(180deg,rgba(241,91,42,0.96),rgba(224,79,34,0.92))] text-[var(--night)] shadow-[0_18px_38px_rgba(241,91,42,0.22)]">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div className="font-display text-4xl text-[var(--ink)] sm:text-5xl">
                  {isDragging ? '释放后开始准备预览' : '拖拽图片到这里'}
                </div>
                <p className="max-w-xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
                  支持 JPG、PNG、GIF、WebP、SVG。你也可以直接点击选择文件，或者复制图片后按 Ctrl+V 粘贴。
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="surface-tag">Drag & Drop</span>
                  <span className="surface-tag">Paste</span>
                  <span className="surface-tag">Multi Upload</span>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? '上传中...' : '选择文件'}
                </button>
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
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel panel-dark p-6">
            <p className="eyebrow text-[rgba(240,226,204,0.48)]">Session Snapshot</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[24px] border border-[var(--line-inverse)] bg-[rgba(255,255,255,0.04)] p-5">
                <p className="eyebrow text-[rgba(240,226,204,0.46)]">Queue</p>
                <p className="mt-4 font-display text-5xl">{previewImages.length}</p>
                <p className="mt-2 text-sm text-[rgba(240,226,204,0.72)]">当前待处理图片数</p>
              </div>
              <div className="rounded-[24px] border border-[var(--line-inverse)] bg-[rgba(255,255,255,0.04)] p-5">
                <p className="eyebrow text-[rgba(240,226,204,0.46)]">Preview Ready</p>
                <p className="mt-4 font-display text-5xl">{compressedCount}</p>
                <p className="mt-2 text-sm text-[rgba(240,226,204,0.72)]">已有压缩对照的图片</p>
              </div>
              <div className="rounded-[24px] border border-[var(--line-inverse)] bg-[rgba(255,255,255,0.04)] p-5">
                <p className="eyebrow text-[rgba(240,226,204,0.46)]">Processing</p>
                <p className="mt-4 font-display text-5xl">{processingCount}</p>
                <p className="mt-2 text-sm text-[rgba(240,226,204,0.72)]">正在计算中的预览</p>
              </div>
            </div>
          </div>

          <div className="panel panel-light p-6">
            <p className="eyebrow text-[var(--muted)]">Workflow</p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"></span>
                <span>拖入或粘贴图片，系统会生成原图与压缩后的对照预览。</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"></span>
                <span>根据体积变化决定是否保留压缩，再统一发起上传。</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"></span>
                <span>上传完成后可复制直链，也可以切去图库查看现有全部内容。</span>
              </li>
            </ul>
            <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.56)] p-5">
              <p className="eyebrow text-[var(--muted)]">Dispatch Rule</p>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                如果当前还有压缩任务未完成，上传按钮会自动保持不可用，避免在结果还没稳定时就直接发出。
              </p>
            </div>
          </div>
        </div>
      </section>

      {previewImages.length > 0 ? (
        <div className="panel panel-light p-6 sm:p-7">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow text-[var(--muted)]">Preview Rail</p>
              <h3 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">
                图片预览 ({previewImages.length} 张)
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                原图与处理后的版本并排显示，方便快速决策。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="status-pill bg-[rgba(255,255,255,0.7)] text-[var(--ink-soft)]">
                {processingCount > 0 ? `处理中 ${processingCount}` : 'Ready'}
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
                  className="overflow-hidden rounded-[30px] border border-[var(--line)] bg-[rgba(255,255,255,0.7)] shadow-[0_18px_42px_rgba(21,17,13,0.08)]"
                >
                  <div className="border-b border-[rgba(80,60,35,0.12)] px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="eyebrow text-[var(--muted)]">Pending Item</p>
                        <h4 className="mt-2 truncate font-display text-3xl text-[var(--ink)]">
                          {previewImage.file.name}
                        </h4>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {formatFileSize(previewImage.originalSize)} • {previewImage.file.type}
                        </p>
                      </div>
                      <button
                        onClick={() => void removePreviewImage(previewImage.id)}
                        className="rounded-full border border-[var(--line)] bg-white/80 p-2 text-[var(--muted)] transition-colors hover:text-[var(--danger)]"
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
                        <h5 className="eyebrow text-[var(--muted)]">Original</h5>
                        <div className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(245,239,229,0.82)] p-2">
                          <img
                            src={previewImage.preview}
                            alt="Original"
                            className="h-44 w-full rounded-[18px] object-cover"
                          />
                          <div className="absolute bottom-4 left-4 rounded-full bg-[rgba(18,14,10,0.78)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--paper)]">
                            {formatFileSize(previewImage.originalSize)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="eyebrow text-[var(--muted)]">
                          {enableWebpCompression ? 'Processed / WebP' : 'Original Format'}
                        </h5>
                        <div className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(245,239,229,0.82)] p-2">
                          {previewImage.isProcessing ? (
                            <div className="flex h-44 w-full items-center justify-center rounded-[18px] border border-dashed border-[var(--line)] bg-white/70">
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
                                className="h-44 w-full rounded-[18px] object-cover"
                              />
                              <div className="absolute bottom-4 left-4 rounded-full bg-[rgba(18,14,10,0.78)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--paper)]">
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
                      <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
                        <p className="eyebrow text-[var(--muted)]">Source</p>
                        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                          原图保持在队列中，上传时会按当前开关和质量参数处理。
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4">
                        <p className="eyebrow text-[var(--muted)]">Delta</p>
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
                            {previewImage.isProcessing ? '正在计算压缩结果。' : '当前保持原始格式，不生成差值。'}
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

      {uploadedImages.length > 0 ? (
        <div className="panel panel-light p-6 sm:p-7">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-[var(--muted)]">Recent Dispatches</p>
              <h3 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">最近上传的图片</h3>
            </div>
            <a
              href="/gallery"
              className="button-secondary"
            >
              去完整档案页
            </a>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {uploadedImages.map((image, index) => (
              <div
                key={`${image.key}-${index}`}
                className="flex flex-col gap-4 rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.68)] p-4 shadow-[0_18px_38px_rgba(21,17,13,0.07)] sm:flex-row sm:items-center"
              >
                <img
                  src={image.url}
                  alt="Uploaded"
                  className="h-24 w-full rounded-[22px] object-cover sm:w-24"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-2xl text-[var(--ink)]">
                    {image.key.split('/').pop()}
                  </div>
                  <div className="mt-1 text-sm text-[var(--ink-soft)]">
                    {formatFileSize(image.size)} • {image.mimeType}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    {new Date(image.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void copyToClipboard(image.url)}
                    className="button-secondary px-4 py-3"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => void copyToClipboard(`![Image](${image.url})`)}
                    className="button-primary px-4 py-3"
                  >
                    Markdown
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ToastManager toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
