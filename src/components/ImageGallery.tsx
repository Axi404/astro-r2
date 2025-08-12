import React, { useState, useEffect } from 'react';

interface ImageInfo {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

interface ImagesResponse {
  success: boolean;
  data?: ImageInfo[];
  error?: string;
}

export default function ImageGallery() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const imagesPerPage = 1000;

  useEffect(() => {
    loadImages(1);
  }, []);

  useEffect(() => {
    loadImages(currentPage);
  }, [currentPage]);

  const loadImages = async (page: number = 1) => {
    try {
      setLoading(true);
      const offset = (page - 1) * imagesPerPage;
      const response = await fetch(`/api/images?limit=${imagesPerPage}&offset=${offset}`);
      const result: ImagesResponse = await response.json();
      
      if (result.success && result.data) {
        setImages(result.data);
        setHasMore(result.data.length === imagesPerPage);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || '加载图片失败');
        setErrorDetails(null);
      }
    } catch (err: any) {
      console.error('加载图片失败:', err);
      
      if (err.message?.includes('Missing or invalid environment variables')) {
        setError('环境变量配置错误');
        setErrorDetails('请检查 .env 文件中的 R2 配置信息是否正确填写。参考 ENVIRONMENT_SETUP.md 文件获取详细配置指南。');
      } else if (err.message?.includes('SignatureDoesNotMatch')) {
        setError('R2 认证失败');
        setErrorDetails('访问密钥或秘密密钥不正确。请检查 R2_ACCESS_KEY_ID 和 R2_SECRET_ACCESS_KEY 是否正确。');
      } else if (err.message?.includes('NoSuchBucket')) {
        setError('存储桶不存在');
        setErrorDetails('指定的 R2 存储桶不存在。请检查 R2_BUCKET_NAME 是否正确。');
      } else if (err.message?.includes('AccessDenied')) {
        setError('访问被拒绝');
        setErrorDetails('没有访问该存储桶的权限。请检查 API Token 的权限设置。');
      } else {
        setError('网络错误');
        setErrorDetails(err.message || '未知错误');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (key: string) => {
    if (!confirm('确定要删除这张图片吗？')) {
      return;
    }

    try {
      const response = await fetch('/api/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      });

      const result = await response.json();
      
      if (result.success) {
        setImages(prev => prev.filter(img => img.key !== key));
        setSelectedImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (err) {
      alert('删除失败: 网络错误');
      console.error('删除图片失败:', err);
    }
  };

  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0) {
      alert('请先选择要删除的图片');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedImages.size} 张图片吗？`)) {
      return;
    }

    for (const key of selectedImages) {
      try {
        await fetch('/api/images', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key }),
        });
      } catch (err) {
        console.error(`删除图片 ${key} 失败:`, err);
      }
    }

    // 重新加载图片列表
    await loadImages(currentPage);
    setSelectedImages(new Set());
  };

  const toggleImageSelection = (key: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.key)));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('链接已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">配置错误: {error}</h3>
            {errorDetails && (
              <div className="text-red-700 mb-4 leading-relaxed">
                {errorDetails}
              </div>
            )}
            <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
              <h4 className="font-semibold text-red-800 mb-2">解决方案:</h4>
              <ul className="text-red-700 text-sm space-y-1">
                <li>1. 确保项目根目录有 <code className="bg-red-200 px-1 rounded">.env</code> 文件</li>
                <li>2. 检查 R2 配置信息是否正确填写</li>
                <li>3. 确认 API Token 有正确的权限</li>
                <li>4. 参考 <code className="bg-red-200 px-1 rounded">ENVIRONMENT_SETUP.md</code> 获取详细指南</li>
              </ul>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={loadImages}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                重试
              </button>
              <a 
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Cloudflare API 设置
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              图片管理 ({images.length} 张)
            </h2>
            {selectedImages.size > 0 && (
              <span className="text-sm text-primary-600">
                已选择 {selectedImages.size} 张
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllImages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {selectedImages.size === images.length ? '取消全选' : '全选'}
            </button>
            
            {selectedImages.size > 0 && (
              <button
                onClick={deleteSelectedImages}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                删除选中
              </button>
            )}
            
            <div className="flex border border-gray-300 rounded">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'grid' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                网格
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'list' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                列表
              </button>
            </div>
            
            <button
              onClick={() => loadImages(currentPage)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 图片展示 */}
      {images.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="text-gray-500">暂无图片</div>
          <a 
            href="/" 
            className="mt-4 inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            去上传图片
          </a>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => (
            <div 
              key={image.key} 
              className={`bg-white rounded-lg shadow-sm border overflow-hidden group hover:shadow-md transition-shadow ${
                selectedImages.has(image.key) ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="relative">
                <img 
                  src={image.url} 
                  alt={image.key.split('/').pop()} 
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => toggleImageSelection(image.key)}
                />
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.key)}
                    onChange={() => toggleImageSelection(image.key)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                {selectedImages.has(image.key) && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-blue-500"></div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity space-x-2 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(image.url);
                      }}
                      className="px-2 py-1 text-xs bg-white text-gray-800 rounded hover:bg-gray-100"
                    >
                      复制链接
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteImage(image.key);
                      }}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div 
                  className="text-sm font-medium text-gray-900 truncate cursor-help"
                  title={image.key.split('/').pop()}
                >
                  {image.key.split('/').pop()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatFileSize(image.size)} • {new Date(image.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedImages.size === images.length && images.length > 0}
                      onChange={selectAllImages}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    预览
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    文件名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    大小
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    上传时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {images.map((image) => (
                  <tr key={image.key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedImages.has(image.key)}
                        onChange={() => toggleImageSelection(image.key)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img 
                        src={image.url} 
                        alt={image.key.split('/').pop()} 
                        className="w-12 h-12 object-cover rounded cursor-pointer"
                        onClick={() => toggleImageSelection(image.key)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div 
                        className="max-w-xs truncate cursor-help" 
                        title={image.key.split('/').pop()}
                      >
                        {image.key.split('/').pop()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(image.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {image.mimeType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(image.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => copyToClipboard(image.url)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        复制链接
                      </button>
                      <button
                        onClick={() => copyToClipboard(`![Image](${image.url})`)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={() => deleteImage(image.key)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 分页 */}
      {images.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              第 {currentPage} 页，共 {images.length} 张图片
              {hasMore && " (可能还有更多)"}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!hasMore}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}