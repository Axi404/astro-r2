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

  return (
    <div className="space-y-6">
      <section className="panel panel-light overflow-hidden p-6 sm:p-8">
        <div className="grid gap-5 xl:grid-cols-[1.16fr_0.84fr]">
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-[var(--muted)]">Upload Workbench</p>
                <p className="mt-3 text-sm leading-8 text-[var(--ink-soft)] sm:text-base">
                  直接拖拽、粘贴或多选图片。入口只负责接收文件，命名和压缩留在右侧收束，不再把说明堆在操作前面。
                </p>
              </div>
              <a href="/gallery" className="button-ghost shrink-0 self-start whitespace-nowrap px-5 text-center">
                查看图库
              </a>
            </div>

            <div
              className={`relative flex min-h-[390px] flex-col justify-center rounded-[18px] border px-8 py-10 text-center transition-colors sm:px-12 ${
                isDragging
                  ? 'border-[rgba(86,109,90,0.46)] bg-[rgba(255,255,255,0.9)] shadow-[0_24px_60px_rgba(41,37,30,0.09)]'
                  : 'border-dashed border-[var(--line-strong)] bg-[linear-gradient(180deg,rgba(249,246,239,0.9),rgba(242,236,226,0.9))]'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="absolute inset-x-10 top-8 hidden h-px bg-[linear-gradient(90deg,transparent,var(--line),transparent)] sm:block" />
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.9)] text-[var(--ink)] shadow-[0_12px_28px_rgba(34,39,34,0.06)]">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h3 className="mt-6 font-display text-[2.6rem] leading-none text-[var(--ink)] sm:text-[3rem]">
                {isDragging ? '松开以上传' : '把图片拖到这里'}
              </h3>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-[var(--ink-soft)]">
                支持 JPG、PNG、GIF、WebP、SVG，也可以直接从剪贴板粘贴图片。
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <span className="surface-tag">Drag</span>
                <span className="surface-tag">Paste</span>
                <span className="surface-tag">Multi Select</span>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? '上传中...' : '选择文件'}
                </button>
                <div className="status-pill text-[var(--ink-soft)]">
                  {previewImages.length > 0 ? `${previewImages.length} 待处理` : '等待文件'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="metric-card p-4">
                <p className="eyebrow text-[var(--muted)]">队列</p>
                <p className="mt-2 font-display text-[2rem] leading-none text-[var(--ink)]">
                  {previewImages.length}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  waiting
                </p>
              </div>
              <div className="metric-card p-4">
                <p className="eyebrow text-[var(--muted)]">压缩</p>
                <p className="mt-2 font-display text-[2rem] leading-none text-[var(--ink)]">
                  {compressedCount}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  prepared
                </p>
              </div>
              <div className="metric-card p-4">
                <p className="eyebrow text-[var(--muted)]">处理中</p>
                <p className="mt-2 font-display text-[2rem] leading-none text-[var(--ink)]">
                  {processingCount}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  active
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="metric-card overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-6">
                <div className="max-w-sm">
                  <p className="eyebrow text-[var(--muted)]">Current Strategy</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    命名规则、压缩开关和质量控制收进同一侧栏，避免界面在首屏分成太多块。
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    Format
                  </p>
                  <p className="mt-2 font-display text-3xl text-[var(--ink)]">
                    {enableWebpCompression ? 'WebP' : 'Original'}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[var(--line)]">
                <label className="flex cursor-pointer gap-4 px-5 py-5 sm:px-6">
                  <input
                    type="checkbox"
                    checked={useHashName}
                    onChange={(event) => setUseHashName(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] focus:ring-[rgba(31,79,122,0.18)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">随机文件名</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          {useHashName ? '使用哈希命名。' : '保留原名并追加时间戳。'}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                        {useHashName ? 'hash' : 'timestamp'}
                      </span>
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer gap-4 px-5 py-5 sm:px-6">
                  <input
                    type="checkbox"
                    checked={enableWebpCompression}
                    onChange={(event) => setEnableWebpCompression(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] focus:ring-[rgba(31,79,122,0.18)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">WebP 预览压缩</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          {enableWebpCompression ? '浏览器内生成对照预览。' : '保持原始格式上传。'}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                        {enableWebpCompression ? 'on' : 'off'}
                      </span>
                    </div>
                  </div>
                </label>

                <div className="px-5 py-5 sm:px-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="eyebrow text-[var(--muted)]">压缩质量</p>
                      <p className="mt-2 font-display text-4xl text-[var(--ink)]">{quality}%</p>
                    </div>
                    <div className="status-pill text-[var(--ink-soft)]">
                      {enableWebpCompression ? 'Active' : 'Disabled'}
                    </div>
                  </div>

                  {enableWebpCompression ? (
                    <div className="mt-5">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={quality}
                        onChange={(event) => setQuality(Number.parseInt(event.target.value, 10))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(28,35,29,0.1)]"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <div className="mt-2 flex justify-between text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                        <span>更小</span>
                        <span>更清晰</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      关闭时不会生成压缩预览。
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="panel panel-muted p-5 sm:p-6">
              <p className="eyebrow text-[var(--muted)]">Current Mode</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="status-pill text-[var(--ink-soft)]">
                  {useHashName ? 'Hash naming' : 'Timestamp naming'}
                </div>
                <div className="status-pill text-[var(--ink-soft)]">
                  {enableWebpCompression ? `WebP ${quality}%` : 'Original format'}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                文件进入队列后，会在下方预览区显示原图与处理结果，再决定是否上传。
              </p>
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
      </section>

      {previewImages.length > 0 ? (
        <div className="panel panel-light p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow text-[var(--muted)]">Preview Queue</p>
              <h3 className="mt-2 font-display text-3xl text-[var(--ink)] sm:text-4xl">
                待上传 {previewImages.length}
              </h3>
              <p className="mt-3 text-sm leading-8 text-[var(--ink-soft)]">
                先确认画面、体积和命名方式，再一次性提交。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="status-pill text-[var(--ink-soft)]">
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
                  className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-[rgba(255,252,247,0.74)]"
                >
                  <div className="border-b border-[var(--line)] px-5 py-4">
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
                        <h5 className="eyebrow text-[var(--muted)]">Original</h5>
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
                          {enableWebpCompression ? 'Processed / WebP' : 'Original Format'}
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
                        <p className="eyebrow text-[var(--muted)]">Upload</p>
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

      {uploadedImages.length > 0 ? (
        <div className="panel panel-light p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-[var(--muted)]">Recent</p>
              <h3 className="mt-2 font-display text-3xl text-[var(--ink)] sm:text-4xl">最近上传</h3>
              <p className="mt-3 text-sm leading-8 text-[var(--ink-soft)]">
                刚完成的内容会暂时留在这里，方便立即复制和继续整理。
              </p>
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
                className="flex flex-col gap-4 rounded-[18px] border border-[var(--line)] bg-[rgba(255,252,247,0.72)] p-4 sm:flex-row sm:items-center"
              >
                <img
                  src={image.url}
                  alt="Uploaded"
                  className="h-24 w-full rounded-[14px] object-cover sm:w-24"
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
