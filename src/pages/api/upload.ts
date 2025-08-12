import type { APIRoute } from 'astro';
import { R2Service, getR2Config } from '../../lib/r2';
import { requireAuth } from '../../lib/auth';

export const POST: APIRoute = async (context) => {
  const authError = requireAuth(context);
  if (authError) return authError;
  const { request } = context;
  try {
    const config = getR2Config();
    const r2Service = new R2Service(config);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查文件大小
    const maxSize = parseInt(import.meta.env.MAX_FILE_SIZE || process.env.MAX_FILE_SIZE || '10485760'); // 10MB 默认
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ 
        error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type. Only images are allowed.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const options = {
      useHashName: (formData.get('useHashName') as string) === 'true',
      compressToWebp: (formData.get('enableWebpCompression') as string) === 'true',
      quality: parseInt(formData.get('quality') as string || '80'),
    };

    const imageInfo = await r2Service.uploadImage(file, file.name, options);

    return new Response(JSON.stringify({
      success: true,
      data: imageInfo
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Upload failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};