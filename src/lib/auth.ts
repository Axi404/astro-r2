import type { APIContext } from 'astro';

// 检查用户是否已认证
export function isAuthenticated(context: APIContext): boolean {
  const authToken = context.cookies.get('auth-token');
  return authToken !== undefined && authToken.value !== '';
}

// 认证中间件 - 用于保护需要认证的API端点
export function requireAuth(context: APIContext): Response | null {
  if (!isAuthenticated(context)) {
    return new Response(JSON.stringify({ 
      error: 'Authentication required' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return null;
}

// 客户端认证状态检查
export function checkAuthStatus(): Promise<boolean> {
  // 在客户端，我们可以通过发送请求到验证端点来检查认证状态
  return fetch('/api/auth/verify')
    .then(response => response.ok)
    .catch(() => false);
}