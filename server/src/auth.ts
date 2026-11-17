import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Hash de senha com scrypt e sal aleatório. Formato: scrypt$N$r$p$sal$hash */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16), key = await scrypt(pw, salt, 64, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [alg, N, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64url');
  const got = await scrypt(pw, Buffer.from(salt, 'base64url'), want.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Token de sessão: 256 bits aleatórios. Só o hash vai para o banco. */
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== 'string' || pw.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (pw.length > 200) return 'Senha longa demais.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use letras e números na senha.';
  return null;
}

export const guestName = () => 'Tecelão' + randomInt(1000, 99999);

/** Verificação do login com Google (ID token do Google Identity Services). */
let googleJwks: JWTVerifyGetKey | null = null;
export function setGoogleJwksForTests(k: JWTVerifyGetKey | null) { googleJwks = k; }
export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<{ sub: string; email: string | null; name: string | null }> {
  googleJwks ??= createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  const { payload } = await jwtVerify(idToken, googleJwks, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: clientId });
  if (typeof payload.sub !== 'string') throw new Error('token sem sub');
  const email = payload.email_verified ? (payload.email as string) : null;
  return { sub: payload.sub, email, name: (payload.given_name as string) || (payload.name as string) || null };
}
