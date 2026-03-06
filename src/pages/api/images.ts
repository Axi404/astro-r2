import type { APIRoute } from 'astro';
import { parseDeleteKeys, parseImageListQuery } from '../../lib/images-api';
import { requireAuth } from '../../lib/auth';
import { getR2Service } from '../../lib/r2';

export const GET: APIRoute = async (context) => {
  const authError = requireAuth(context);
  if (authError) return authError;

  try {
    const r2Service = getR2Service();
    const { limit, cursor, prefix } = parseImageListQuery(context.url);
    const result = await r2Service.listImages(prefix, limit, cursor);

    return new Response(JSON.stringify({
      success: true,
      data: result.images,
      pagination: {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('List images error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to list images',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  const authError = requireAuth(context);
  if (authError) return authError;

  const { request } = context;

  try {
    const r2Service = getR2Service();
    const payload = await request.json().catch(() => null);
    const keys = parseDeleteKeys(payload);

    if (keys.length === 0) {
      return new Response(JSON.stringify({ error: 'No keys provided' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const result = await r2Service.deleteImages(keys);

    return new Response(JSON.stringify({
      success: result.failed.length === 0,
      deleted: result.deleted,
      failed: result.failed,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Delete image error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete image',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};
