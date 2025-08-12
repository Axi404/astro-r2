import type { APIRoute } from 'astro';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { password } = await request.json();
    
    // 从环境变量获取管理员密码
    const adminPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: ADMIN_PASSWORD not set' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (password !== adminPassword) {
      return new Response(JSON.stringify({ 
        error: 'Invalid password' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 设置认证cookie（24小时有效）
    const token = generateAuthToken();
    cookies.set('auth-token', token, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24小时
      path: '/'
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Login successful' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// 生成简单的认证token
function generateAuthToken(): string {
  return crypto.randomBytes(32).toString('hex');
}