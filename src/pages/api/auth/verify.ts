import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';

export const GET: APIRoute = async (context) => {
  const authenticated = isAuthenticated(context);
  
  return new Response(JSON.stringify({ 
    authenticated 
  }), {
    status: authenticated ? 200 : 401,
    headers: { 'Content-Type': 'application/json' }
  });
};