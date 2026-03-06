import type { Route } from './+types/api.images';

import { parseDeleteKeys, parseImageListQuery } from '~/lib/images-api';
import { deleteImages, listImages } from '~/lib/r2.server';
import { ensureAuthenticatedApiRequest } from '~/lib/session.server';

export async function loader({ request }: Route.LoaderArgs) {
  const authError = await ensureAuthenticatedApiRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const { limit, cursor, prefix } = parseImageListQuery(new URL(request.url));
    const result = await listImages(prefix, limit, cursor);

    return Response.json(
      {
        success: true,
        data: result.images,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('List images error:', error);
    return Response.json(
      {
        error: 'Failed to list images',
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

export async function action({ request }: Route.ActionArgs) {
  const authError = await ensureAuthenticatedApiRequest(request);
  if (authError) {
    return authError;
  }

  if (request.method !== 'DELETE') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as
      | { key?: unknown; keys?: unknown }
      | null;
    const keys = parseDeleteKeys(payload);

    if (keys.length === 0) {
      return Response.json(
        { error: 'No keys provided' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const result = await deleteImages(keys);

    return Response.json(
      {
        success: result.failed.length === 0,
        deleted: result.deleted,
        failed: result.failed,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Delete image error:', error);
    return Response.json(
      {
        error: 'Failed to delete image',
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
