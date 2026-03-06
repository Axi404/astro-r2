import { useEffect, useState } from 'react';
import { ToastManager } from './Toast';
import { useToast } from '../hooks/useToast';

interface ImageInfo {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

interface DeleteFailure {
  key: string;
  error: string;
}

interface ImagesResponse {
  success: boolean;
  data?: ImageInfo[];
  error?: string;
  details?: string;
  pagination?: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

interface DeleteImagesResponse {
  success: boolean;
  deleted?: string[];
  failed?: DeleteFailure[];
  error?: string;
  details?: string;
}

const IMAGES_PER_PAGE = 60;

function getLoginPath(): string {
  return `/login?next=${encodeURIComponent('/gallery')}`;
}

function getDisplayName(key: string): string {
  return key.split('/').pop() || key;
}

export default function ImageGallery() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [browseMode, setBrowseMode] = useState<'page' | 'all'>('page');
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImage, setActiveImage] = useState<ImageInfo | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  const currentCursor = cursorHistory[pageIndex] ?? null;

  useEffect(() => {
    if (browseMode !== 'page') {
      return;
    }

    void loadPage(currentCursor);
  }, [browseMode, currentCursor]);

  useEffect(() => {
    if (!activeImage) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImage]);

  const fetchImagePage = async (cursor: string | null) => {
    const params = new URLSearchParams({
      limit: IMAGES_PER_PAGE.toString(),
    });

    if (cursor) {
      params.set('cursor', cursor);
    }

    const response = await fetch(`/api/images?${params.toString()}`);
    if (response.status === 401) {
      window.location.assign(getLoginPath());
      throw new Error('登录已过期，请重新登录');
    }

    const result = (await response.json().catch(() => ({}))) as ImagesResponse;

    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.error || result.details || '加载图片失败');
    }

    return {
      images: result.data,
      nextCursor: result.pagination?.nextCursor || null,
      hasMore: Boolean(result.pagination?.hasMore),
    };
  };

  const loadPage = async (cursor: string | null = currentCursor) => {
    try {
      setLoading(true);
      const result = await fetchImagePage(cursor);

      setImages(result.images);
      setNextCursor(result.nextCursor);
      setLoadedCount(result.images.length);
      setSelectedImages(new Set());
      setError(null);
      setErrorDetails(null);
    } catch (err) {
      console.error('加载图片失败:', err);
      setError(err instanceof Error ? err.message : '网络错误');
      setErrorDetails(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const loadAllImages = async () => {
    try {
      setBrowseMode('all');
      setLoading(true);
      setLoadingAll(true);
      setSelectedImages(new Set());

      let cursor: string | null = null;
      let collected: ImageInfo[] = [];
      let pageCounter = 0;

      while (true) {
        const result = await fetchImagePage(cursor);
        pageCounter += 1;
        collected = [...collected, ...result.images];
        setImages(collected);
        setLoadedCount(collected.length);

        if (!result.nextCursor) {
          setNextCursor(null);
          break;
        }

        cursor = result.nextCursor;
      }

      setError(null);
      setErrorDetails(null);
      showSuccess(
        collected.length > 0
          ? `已加载全部内容，共 ${collected.length} 张`
          : `已完成全量扫描，共 ${pageCounter} 页`
      );
    } catch (err) {
      console.error('加载全部图片失败:', err);
      setError(err instanceof Error ? err.message : '网络错误');
      setErrorDetails(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
      setLoadingAll(false);
    }
  };

  const switchToPagedMode = () => {
    setBrowseMode('page');
    setPageIndex(0);
    setCursorHistory([null]);
    setNextCursor(null);
  };

  const deleteImages = async (keys: string[]) => {
    if (keys.length === 0) {
      showInfo('请先选择要删除的图片');
      return;
    }

    try {
      setActionLoading(true);

      const payload = keys.length === 1 ? { key: keys[0] } : { keys };
      const response = await fetch('/api/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        window.location.assign(getLoginPath());
        return;
      }

      const result = (await response.json().catch(() => ({}))) as DeleteImagesResponse;

      if (!response.ok) {
        showError(result.error || '删除失败');
        return;
      }

      const deletedCount = result.deleted?.length || 0;
      const failedCount = result.failed?.length || 0;

      if (deletedCount > 0) {
        showSuccess(deletedCount === 1 ? '图片已删除' : `已删除 ${deletedCount} 张图片`);
      }

      if (failedCount > 0) {
        showError(
          failedCount === 1
            ? `删除失败: ${result.failed?.[0].error || '未知错误'}`
            : `${failedCount} 张图片删除失败`
        );
      }

      if (browseMode === 'all') {
        await loadAllImages();
      } else {
        await loadPage(currentCursor);
      }
    } catch (err) {
      console.error('删除图片失败:', err);
      showError('删除失败: 网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteImage = async (key: string) => {
    if (!window.confirm('确定要删除这张图片吗？')) {
      return;
    }

    await deleteImages([key]);
  };

  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0) {
      showInfo('请先选择要删除的图片');
      return;
    }

    if (!window.confirm(`确定要删除选中的 ${selectedImages.size} 张图片吗？`)) {
      return;
    }

    await deleteImages(Array.from(selectedImages));
  };

  const toggleImageSelection = (key: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
      return;
    }

    setSelectedImages(new Set(images.map((image) => image.key)));
  };

  const goToPreviousPage = () => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    if (!nextCursor) {
      return;
    }

    setCursorHistory((prev) => {
      const nextHistory = prev.slice(0, pageIndex + 1);
      nextHistory.push(nextCursor);
      return nextHistory;
    });
    setPageIndex((prev) => prev + 1);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('链接已复制到剪贴板');
    } catch (copyError) {
      console.error('复制失败:', copyError);
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

  const handleRefresh = async () => {
    if (browseMode === 'all') {
      await loadAllImages();
      return;
    }

    await loadPage(currentCursor);
  };

  if (loading && images.length === 0) {
    return (
      <div className="panel panel-light p-10">
        <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--accent)]"></div>
          <div>
            <p className="font-display text-3xl text-[var(--ink)]">加载中</p>
            <p className="mt-2 text-sm tracking-[0.16em] text-[var(--muted)]">
              {loadingAll ? `已加载 ${loadedCount} 张` : '读取当前结果'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel panel-light border-[rgba(167,96,82,0.18)] p-6 sm:p-7">
        <div className="flex items-start space-x-4">
          <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(167,96,82,0.12)] text-[var(--danger)]">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-display text-3xl text-[var(--ink)]">加载失败</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--danger)]">{error}</p>
            {errorDetails ? (
              <div className="mt-4 rounded-[22px] border border-[rgba(167,96,82,0.16)] bg-white/60 px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                {errorDetails}
              </div>
            ) : null}
            <button
              onClick={() => void handleRefresh()}
              className="button-danger mt-5"
            >
              重新抓取
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="panel panel-light p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="metric-card p-4">
                <p className="eyebrow text-[var(--muted)]">已载入</p>
                <p className="mt-3 font-display text-3xl text-[var(--ink)]">{loadedCount}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  {browseMode === 'all' ? 'all items' : 'current page'}
                </p>
              </div>
              <div className="metric-card p-4">
                <p className="eyebrow text-[var(--muted)]">已选中</p>
                <p className="mt-3 font-display text-3xl text-[var(--ink)]">{selectedImages.size}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  ready to delete
                </p>
              </div>
              <div className="metric-card p-4">
                <p className="eyebrow text-[var(--muted)]">视图</p>
                <p className="mt-3 font-display text-3xl text-[var(--ink)]">
                  {viewMode === 'grid' ? 'Grid' : 'List'}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  {browseMode === 'all' ? 'All' : `Page ${pageIndex + 1}`}
                </p>
              </div>
            </div>
          </div>

          <div className="panel panel-light p-5 sm:p-6">
            <div className="mb-4">
              <p className="eyebrow text-[var(--muted)]">Archive Actions</p>
              <p className="mt-3 text-sm leading-8 text-[var(--ink-soft)]">
                读取范围、批量选择和显示方式都集中在这里，减少来回查找。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void loadAllImages()}
                disabled={loadingAll || actionLoading}
                className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAll ? `抓取中 ${loadedCount}` : '全部'}
              </button>
              <button
                onClick={switchToPagedMode}
                disabled={browseMode === 'page' || loading || actionLoading}
                className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                分页
              </button>
              <button
                onClick={selectAllImages}
                disabled={images.length === 0 || actionLoading}
                className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selectedImages.size === images.length && images.length > 0 ? '取消全选' : '全选'}
              </button>
              <button
                onClick={() => void deleteSelectedImages()}
                disabled={selectedImages.size === 0 || actionLoading}
                className="button-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '删除'}
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'button-primary' : 'button-secondary'}
              >
                网格
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'button-primary' : 'button-secondary'}
              >
                列表
              </button>
              <button
                onClick={() => void handleRefresh()}
                disabled={loading || actionLoading || loadingAll}
                className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                刷新
              </button>
            </div>
          </div>
        </section>

        {images.length === 0 ? (
          <div className="panel panel-light p-12 text-center sm:p-14">
            <p className="eyebrow text-[var(--muted)]">Empty Archive</p>
            <p className="mt-4 font-display text-4xl text-[var(--ink)]">这里还没有图片</p>
            <p className="mt-3 text-sm leading-8 text-[var(--muted)]">
              先上传一些内容，再回来整理和复制链接。
            </p>
            <a
              href="/"
              className="button-primary mt-7"
            >
              去上传图片
            </a>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {images.map((image, index) => (
              <article
                key={image.key}
                className={`group overflow-hidden rounded-[28px] border bg-[rgba(255,252,247,0.78)] transition-all duration-300 ${
                  selectedImages.has(image.key)
                    ? 'border-[var(--accent)] shadow-[0_12px_32px_rgba(86,109,90,0.1)]'
                    : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                }`}
              >
                <div className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--surface)]">
                  <button
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className="block aspect-[4/3] w-full"
                  >
                    <img
                      src={image.url}
                      alt={getDisplayName(image.key)}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </button>
                  <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(255,252,247,0.9)] backdrop-blur">
                    <input
                      type="checkbox"
                      checked={selectedImages.has(image.key)}
                      onChange={() => toggleImageSelection(image.key)}
                      className="h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] focus:ring-[rgba(86,109,90,0.24)]"
                    />
                  </div>
                  <div className="absolute right-4 top-4 flex translate-y-1 items-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <button
                      onClick={() => void copyToClipboard(image.url)}
                      className="button-secondary px-4 py-2.5"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => void deleteImage(image.key)}
                      className="button-danger px-4 py-2.5"
                    >
                      删除
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="eyebrow text-[var(--muted)]">
                        Item {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-2 truncate font-display text-[2rem] text-[var(--ink)]">
                        {getDisplayName(image.key)}
                      </h3>
                      <p className="mt-2 truncate text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {image.key}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveImage(image)}
                      className="button-secondary shrink-0 px-4 py-3"
                    >
                      查看
                    </button>
                  </div>

                  <div className="grid gap-3 text-sm text-[var(--ink-soft)] sm:grid-cols-3">
                    <div>
                      <p className="eyebrow text-[var(--muted)]">Size</p>
                      <p className="mt-1 text-[var(--ink)]">{formatFileSize(image.size)}</p>
                    </div>
                    <div>
                      <p className="eyebrow text-[var(--muted)]">Date</p>
                      <p className="mt-1 text-[var(--ink)]">{new Date(image.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="eyebrow text-[var(--muted)]">Type</p>
                      <p className="mt-1 truncate text-[var(--ink)]">{image.mimeType}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel panel-light overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--line)]">
                <thead className="bg-[rgba(244,240,232,0.8)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={selectedImages.size === images.length && images.length > 0}
                        onChange={selectAllImages}
                        className="h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] focus:ring-[rgba(241,91,42,0.3)]"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                      预览
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                      文件名
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                      大小
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                      类型
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                      上传时间
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {images.map((image) => (
                    <tr key={image.key} className="hover:bg-[rgba(255,255,255,0.46)]">
                      <td className="whitespace-nowrap px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedImages.has(image.key)}
                          onChange={() => toggleImageSelection(image.key)}
                          className="h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--paper)] text-[var(--accent)] focus:ring-[rgba(241,91,42,0.3)]"
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-5">
                        <button type="button" onClick={() => setActiveImage(image)}>
                          <img
                            src={image.url}
                            alt={getDisplayName(image.key)}
                            className="h-16 w-16 rounded-[18px] object-cover"
                            loading="lazy"
                          />
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <div className="max-w-sm">
                          <div className="truncate font-display text-2xl text-[var(--ink)]">
                            {getDisplayName(image.key)}
                          </div>
                          <div className="mt-1 truncate text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                            {image.key}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-5 text-sm text-[var(--ink-soft)]">
                        {formatFileSize(image.size)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-5 text-sm text-[var(--ink-soft)]">
                        {image.mimeType}
                      </td>
                      <td className="whitespace-nowrap px-6 py-5 text-sm text-[var(--ink-soft)]">
                        {new Date(image.uploadedAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => void copyToClipboard(image.url)}
                            className="button-secondary px-4 py-2.5"
                          >
                            复制
                          </button>
                          <button
                            onClick={() => void copyToClipboard(`![Image](${image.url})`)}
                            className="button-secondary px-4 py-2.5"
                          >
                            Markdown
                          </button>
                          <button
                            onClick={() => void deleteImage(image.key)}
                            className="button-danger px-4 py-2.5"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {browseMode === 'page' && images.length > 0 ? (
          <div className="panel panel-light p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow text-[var(--muted)]">Pagination</p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  第 {pageIndex + 1} 页，当前 {images.length} 张{nextCursor ? '，后面还有更多' : '，已经到尾页'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={pageIndex === 0 || loading}
                  className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一页
                </button>
                <div className="status-pill bg-[var(--night)] text-[var(--paper-strong)]">
                  {pageIndex + 1}
                </div>
                <button
                  onClick={goToNextPage}
                  disabled={!nextCursor || loading}
                  className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {browseMode === 'all' && images.length > 0 ? (
          <div className="panel panel-muted p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow text-[var(--muted)]">Complete Archive</p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  已在当前页面加载全部 {images.length} 张内容，可直接滚动浏览。
                </p>
              </div>
              <div className="status-pill text-[var(--ink-soft)]">
                Full sweep complete
              </div>
            </div>
          </div>
        ) : null}

        <ToastManager toasts={toasts} removeToast={removeToast} />
      </div>

      {activeImage ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(24,30,24,0.7)] px-4 py-8 backdrop-blur-sm"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="grid max-h-full w-full max-w-6xl gap-0 overflow-hidden rounded-[34px] border border-[var(--line)] bg-[var(--paper-strong)] shadow-[0_40px_110px_rgba(24,30,24,0.18)] lg:grid-cols-[1.25fr_0.75fr]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-[320px] items-center justify-center bg-[linear-gradient(180deg,rgba(244,240,232,0.96),rgba(233,228,218,0.9))] p-6">
              <img
                src={activeImage.url}
                alt={getDisplayName(activeImage.key)}
                className="max-h-[72vh] w-auto max-w-full rounded-[24px] object-contain shadow-[0_26px_80px_rgba(24,30,24,0.14)]"
              />
            </div>
            <aside className="flex flex-col justify-between gap-6 border-t border-[var(--line)] bg-[rgba(248,245,239,0.88)] p-6 text-[var(--ink)] lg:border-l lg:border-t-0">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <p className="eyebrow text-[var(--muted)]">Current Item</p>
                  <button
                    type="button"
                    onClick={() => setActiveImage(null)}
                    className="button-ghost px-4 py-3"
                  >
                    Close
                  </button>
                </div>
                <h3 className="mt-5 break-words font-display text-4xl leading-tight text-[var(--ink)]">
                  {getDisplayName(activeImage.key)}
                </h3>
                <p className="mt-4 break-all text-sm leading-7 text-[var(--ink-soft)]">
                  {activeImage.key}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(255,255,255,0.54)] p-4">
                  <p className="eyebrow text-[var(--muted)]">Metadata</p>
                  <div className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
                    <div className="flex justify-between gap-4">
                      <span>文件大小</span>
                      <span>{formatFileSize(activeImage.size)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>类型</span>
                      <span>{activeImage.mimeType}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>上传时间</span>
                      <span>{new Date(activeImage.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void copyToClipboard(activeImage.url)}
                    className="button-secondary"
                  >
                    复制链接
                  </button>
                  <button
                    onClick={() => void copyToClipboard(`![Image](${activeImage.url})`)}
                    className="button-ghost"
                  >
                    复制 Markdown
                  </button>
                  <button
                    onClick={() => void deleteImage(activeImage.key)}
                    className="button-danger"
                  >
                    删除
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}
