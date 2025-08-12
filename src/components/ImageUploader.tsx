import React, { useState, useRef, useCallback } from 'react';
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
  file: File;
  preview: string;
  originalSize: number;
  compressedSize?: number;
  compressedPreview?: string;
  isProcessing: boolean;
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
  const { toasts, removeToast, showSuccess, showError } = useToast();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 创建本地压缩预览
  const createCompressedPreview = async (file: File, quality: number): Promise<{ blob: Blob; url: string }> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 设置画布尺寸
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制图片
        ctx?.drawImage(img, 0, 0);
        
        // 转换为 WebP 格式
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve({ blob, url });
            } else {
              reject(new Error('Failed to create compressed preview'));
            }
          },
          'image/webp',
          quality / 100
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // 处理预览图片
  const processPreviewImage = async (file: File) => {
    const originalPreview = URL.createObjectURL(file);
    
    const previewImage: PreviewImage = {
      file,
      preview: originalPreview,
      originalSize: file.size,
      isProcessing: true,
    };

    setPreviewImages(prev => [...prev, previewImage]);

    try {
      // 创建压缩预览
      if (enableWebpCompression && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
        const compressed = await createCompressedPreview(file, quality);
        
        setPreviewImages(prev => prev.map(img => 
          img.file === file 
            ? { 
                ...img, 
                compressedSize: compressed.blob.size,
                compressedPreview: compressed.url,
                isProcessing: false 
              }
            : img
        ));
      } else {
        // 对于 SVG 等不压缩的格式
        setPreviewImages(prev => prev.map(img => 
          img.file === file 
            ? { ...img, isProcessing: false }
            : img
        ));
      }
    } catch (error) {
      console.error('Failed to create compressed preview:', error);
      setPreviewImages(prev => prev.map(img => 
        img.file === file 
          ? { ...img, isProcessing: false }
          : img
      ));
    }
  };

  const uploadFile = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', quality.toString());
    formData.append('useHashName', useHashName.toString());
    formData.append('enableWebpCompression', enableWebpCompression.toString());

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    return await response.json();
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      alert('请选择图片文件');
      return;
    }

    // 清空之前的预览
    setPreviewImages([]);

    // 创建预览
    for (const file of imageFiles) {
      await processPreviewImage(file);
    }
  };

  const uploadPreviewImages = async () => {
    setIsUploading(true);

    for (const previewImage of previewImages) {
      try {
        const result = await uploadFile(previewImage.file);
        if (result.success && result.data) {
          setUploadedImages(prev => [result.data!, ...prev]);
        } else {
          console.error('上传失败:', result.error);
          let errorMessage = result.error || '未知错误';
          if (result.details) {
            if (result.details.includes('Missing or invalid environment variables')) {
              errorMessage = '环境变量配置错误，请检查 .env 文件';
            } else if (result.details.includes('SignatureDoesNotMatch')) {
              errorMessage = 'R2 认证失败，请检查访问密钥';
            }
          }
          alert(`上传 ${previewImage.file.name} 失败: ${errorMessage}`);
        }
      } catch (error: any) {
        console.error('上传错误:', error);
        let errorMessage = '网络错误';
        if (error.message?.includes('Missing or invalid environment variables')) {
          errorMessage = '环境变量配置错误，请检查 .env 文件';
        }
        alert(`上传 ${previewImage.file.name} 出错: ${errorMessage}`);
      }
    }

    // 清空预览
    setPreviewImages([]);
    setIsUploading(false);
  };

  const removePreviewImage = (file: File) => {
    setPreviewImages(prev => {
      const updated = prev.filter(img => img.file !== file);
      // 清理 URL 对象
      const toRemove = prev.find(img => img.file === file);
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview);
        if (toRemove.compressedPreview) {
          URL.revokeObjectURL(toRemove.compressedPreview);
        }
      }
      return updated;
    });
  };

  const clearPreviews = () => {
    previewImages.forEach(img => {
      URL.revokeObjectURL(img.preview);
      if (img.compressedPreview) {
        URL.revokeObjectURL(img.compressedPreview);
      }
    });
    setPreviewImages([]);
  };

  // 当质量改变时重新生成压缩预览
  const updateCompressionQuality = async (newQuality: number) => {
    setQuality(newQuality);
    
    for (const previewImage of previewImages) {
      if (enableWebpCompression && previewImage.file.type.startsWith('image/') && previewImage.file.type !== 'image/svg+xml') {
        setPreviewImages(prev => prev.map(img => 
          img.file === previewImage.file 
            ? { ...img, isProcessing: true }
            : img
        ));

        try {
          const compressed = await createCompressedPreview(previewImage.file, newQuality);
          
          setPreviewImages(prev => prev.map(img => 
            img.file === previewImage.file 
              ? { 
                  ...img, 
                  compressedSize: compressed.blob.size,
                  compressedPreview: compressed.url,
                  isProcessing: false 
                }
              : img
          ));

          // 清理旧的预览 URL
          if (previewImage.compressedPreview) {
            URL.revokeObjectURL(previewImage.compressedPreview);
          }
        } catch (error) {
          console.error('Failed to update compressed preview:', error);
          setPreviewImages(prev => prev.map(img => 
            img.file === previewImage.file 
              ? { ...img, isProcessing: false }
              : img
          ));
        }
      }
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    await handleFiles(files);
  }, [quality, enableWebpCompression]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleFiles(files);
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      await handleFiles(files);
    }
  }, [quality, enableWebpCompression]);

  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // 清理内存泄漏
  React.useEffect(() => {
    return () => {
      previewImages.forEach(img => {
        URL.revokeObjectURL(img.preview);
        if (img.compressedPreview) {
          URL.revokeObjectURL(img.compressedPreview);
        }
      });
    };
  }, []);

  React.useEffect(() => {
    return () => {
      previewImages.forEach(img => {
        URL.revokeObjectURL(img.preview);
        if (img.compressedPreview) {
          URL.revokeObjectURL(img.compressedPreview);
        }
      });
    };
  }, [previewImages]);

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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">上传图片</h2>
          <p className="text-gray-600 mb-6">
            拖拽图片到此处，或点击选择文件，或直接粘贴剪贴板中的图片（Ctrl+V）
          </p>

          {/* 上传选项 */}
          <div className="mb-6 space-y-4">
            {/* 文件名选项 */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useHashName}
                  onChange={(e) => setUseHashName(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  使用随机文件名 (Hash)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {useHashName ? '文件将使用随机哈希名称' : '保持原始文件名（时间戳前缀）'}
              </p>
            </div>

            {/* WebP 压缩选项 */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableWebpCompression}
                  onChange={(e) => setEnableWebpCompression(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  启用 WebP 压缩
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {enableWebpCompression ? '图片将压缩为 WebP 格式以减小文件大小' : '保持原始格式'}
              </p>
            </div>

            {/* 质量设置 */}
            {enableWebpCompression && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WebP 压缩质量: {quality}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => updateCompressionQuality(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>较小文件</span>
                  <span>较高质量</span>
                </div>
              </div>
            )}
          </div>

          {/* 拖拽区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 transition-colors ${
              isDragging 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <svg 
                className="w-12 h-12 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                />
              </svg>
              <div className="text-lg font-medium text-gray-900">
                {isDragging ? '释放文件开始上传' : '拖拽图片到此处'}
              </div>
              <div className="text-sm text-gray-500">
                支持 JPG, PNG, GIF, WebP, SVG 格式
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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

      {/* 预览区域 */}
      {previewImages.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              图片预览 ({previewImages.length} 张)
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={clearPreviews}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                清空预览
              </button>
              <button
                onClick={uploadPreviewImages}
                disabled={isUploading || previewImages.some(img => img.isProcessing)}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '上传中...' : '开始上传'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {previewImages.map((previewImage, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {previewImage.file.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(previewImage.originalSize)} • {previewImage.file.type}
                    </p>
                  </div>
                  <button
                    onClick={() => removePreviewImage(previewImage.file)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 原始图片 */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-gray-700">原始图片</h5>
                    <div className="relative">
                      <img 
                        src={previewImage.preview} 
                        alt="Original" 
                        className="w-full h-32 object-cover rounded border"
                      />
                      <div className="absolute bottom-1 left-1 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                        {formatFileSize(previewImage.originalSize)}
                      </div>
                    </div>
                  </div>

                  {/* 压缩后图片 */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-gray-700">
                      {enableWebpCompression ? '压缩后 (WebP)' : '不压缩'}
                    </h5>
                    <div className="relative">
                      {previewImage.isProcessing ? (
                        <div className="w-full h-32 border border-dashed rounded flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                            <div className="text-xs text-gray-500">压缩中...</div>
                          </div>
                        </div>
                      ) : previewImage.compressedPreview ? (
                        <>
                          <img 
                            src={previewImage.compressedPreview} 
                            alt="Compressed" 
                            className="w-full h-32 object-cover rounded border"
                          />
                          <div className="absolute bottom-1 left-1 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                            {formatFileSize(previewImage.compressedSize || 0)}
                          </div>
                          {previewImage.compressedSize && (
                            <div className="absolute bottom-1 right-1 px-2 py-1 bg-green-600 bg-opacity-80 text-white text-xs rounded">
                              -{Math.round((1 - previewImage.compressedSize / previewImage.originalSize) * 100)}%
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-32 border border-dashed rounded flex items-center justify-center bg-gray-50">
                          <div className="text-xs text-gray-500">不支持压缩</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 压缩统计 */}
                {previewImage.compressedSize && !previewImage.isProcessing && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-800">压缩效果:</span>
                      <span className="font-medium text-green-900">
                        {formatFileSize(previewImage.originalSize)} → {formatFileSize(previewImage.compressedSize)}
                      </span>
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      节省 {formatFileSize(previewImage.originalSize - previewImage.compressedSize)} 
                      ({Math.round((1 - previewImage.compressedSize / previewImage.originalSize) * 100)}%)
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传结果 */}
      {uploadedImages.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近上传的图片</h3>
          <div className="space-y-4">
            {uploadedImages.map((image, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <img 
                  src={image.url} 
                  alt="Uploaded" 
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {image.key.split('/').pop()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatFileSize(image.size)} • {image.mimeType}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(image.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(image.url)}
                    className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                  >
                    复制链接
                  </button>
                  <button
                    onClick={() => copyToClipboard(`![Image](${image.url})`)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Markdown
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Toast Manager */}
      <ToastManager toasts={toasts} removeToast={removeToast} />
    </div>
  );
}