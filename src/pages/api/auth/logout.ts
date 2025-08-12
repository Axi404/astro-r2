import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  // 清除认证cookie
  cookies.delete('auth-token', {
    path: '/'
  });
  
  return new Response(JSON.stringify({ 
    success: true,
    message: 'Logout successful' 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};