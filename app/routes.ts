import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  layout('routes/_app.tsx', [
    index('routes/home.tsx'),
    route('gallery', 'routes/gallery.tsx'),
    route('about', 'routes/about.tsx'),
  ]),
  route('api/upload', 'routes/api.upload.ts'),
  route('api/images', 'routes/api.images.ts'),
  route('api/auth/login', 'routes/api.auth.login.ts'),
  route('api/auth/logout', 'routes/api.auth.logout.ts'),
  route('api/auth/verify', 'routes/api.auth.verify.ts'),
] satisfies RouteConfig;
