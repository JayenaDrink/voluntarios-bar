export const COOKIE = 'voluntarios_session';
export const ADMIN_COOKIE = 'voluntarios_admin';
export const MAX_AGE = 60 * 60 * 24 * 90; // 90 días
export const ADMIN_MAX_AGE = 60 * 60 * 12; // 12 horas

/** Token derivado de la contraseña (funciona en middleware/edge y en node). */
export async function token(password: string, scope = 'voluntarios-bar') {
  const data = new TextEncoder().encode(`${scope}:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const adminToken = (password: string) => token(password, 'voluntarios-bar-admin');

export async function isSession(cookieValue: string | undefined) {
  const pw = process.env.APP_PASSWORD;
  if (!pw || !cookieValue) return false;
  return cookieValue === (await token(pw));
}

export async function isAdminSession(cookieValue: string | undefined) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !cookieValue) return false;
  return cookieValue === (await adminToken(pw));
}
