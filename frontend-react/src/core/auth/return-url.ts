const LOCAL_ORIGIN = 'https://app.flae.local';

export function localReturnUrl(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;

  try {
    const parsed = new URL(value, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function safeReturnUrl(value: string | null) {
  return localReturnUrl(value) ?? '/dashboard';
}

export function authPathWithReturnUrl(path: '/auth/login' | '/auth/register', value: string | null) {
  const returnUrl = localReturnUrl(value);
  if (!returnUrl) return path;
  return `${path}?${new URLSearchParams({ returnUrl }).toString()}`;
}
