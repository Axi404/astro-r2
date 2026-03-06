export function sanitizeNextPath(nextPath: string | null | undefined): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/';
  }

  return nextPath;
}

export function getLoginPath(url: URL): string {
  const nextPath = sanitizeNextPath(`${url.pathname}${url.search}`);
  return nextPath === '/' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`;
}
