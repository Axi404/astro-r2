import type { Route } from './+types/api.upload';

import { getMaxFileSize, uploadImage } from '~/lib/r2.server';
import { ensureAuthenticatedApiRequest } from '~/lib/session.server';

const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export async function action({ request }: Route.ActionArgs) {
  const authError = await ensureAuthenticatedApiRequest(request);
  if (authError) {
    return authError;
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json(
        { error: 'No file provided' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const maxSize = getMaxFileSize();
    if (file.size > maxSize) {
      return Response.json(
        { error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB` },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { error: 'Invalid file type. Only images are allowed.' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const imageInfo = await uploadImage(file, {
      useHashName: formData.get('useHashName') === 'true',
    });

    return Response.json(
      {
        success: true,
        data: imageInfo,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
