import type { APIRoute } from 'astro';
import { R2Service, getR2Config } from '../../lib/r2';

export const GET: APIRoute = async ({ url }) => {
  try {
    const config = getR2Config();
    const r2Service = new R2Service(config);

    const searchParams = new URL(url).searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const prefix = searchParams.get('prefix') || '';

    const images = await r2Service.listImages(prefix, limit);

    return new Response(JSON.stringify({
      success: true,
      data: images
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('List images error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to list images',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const config = getR2Config();
    const r2Service = new R2Service(config);

    const { key } = await request.json();
    
    if (!key) {
      return new Response(JSON.stringify({ error: 'No key provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await r2Service.deleteImage(key);

    return new Response(JSON.stringify({
      success: true,
      message: 'Image deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete image error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete image',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};