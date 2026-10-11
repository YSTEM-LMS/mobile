export function decodeJWT(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) throw new Error('Invalid JWT');

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  const json = decodeURIComponent(
    Array.from(
      bytes,
      (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
    ).join(''),
  );
  const payload: unknown = JSON.parse(json);

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid JWT payload');
  }

  return payload as Record<string, unknown>;
}
