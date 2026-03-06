import type { APIRoute } from 'astro';
import {
  getAdminPassword,
  sanitizeNextPath,
  setSessionCookie,
} from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';
    const nextPath = sanitizeNextPath(typeof body.next === 'string' ? body.next : null);

    if (!password.trim()) {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    const adminPassword = getAdminPassword();
    if (password !== adminPassword) {
      return new Response(JSON.stringify({
        error: 'Invalid password',
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    setSessionCookie(cookies);

    return new Response(JSON.stringify({
      success: true,
      redirectTo: nextPath,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};
