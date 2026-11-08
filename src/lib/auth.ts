export const COOKIE = 'voluntarios_session';
export const MAX_AGE = 60 * 60 * 24 * 90; // 90 días

/** Token derivado de la contraseña (funciona en middleware/edge y en node). */
export async function token(password: string) {
  const data = new TextEncoder().encode(`voluntarios-bar:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isSession(cookieValue: string | undefined) {
  const pw = process.env.APP_PASSWORD;
  if (!pw || !cookieValue) return false;
  return cookieValue === (await token(pw));
}
