import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import {Request} from '@loopback/rest';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'moify_jwt_secret_change_in_prod') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set and non-default in production');
  }
}

const EFFECTIVE_SECRET = JWT_SECRET ?? 'moify_jwt_secret_change_in_prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h';

export interface CallerPayload {
  sub: number;
  username: string;
  role: string;
  mobile_number?: string;
  jti?: string;
}

export const ADMIN_ROLES = ['admin', 'superadmin'];

export function signToken(payload: Omit<CallerPayload, 'jti'>): string {
  return jwt.sign(
    {...payload, jti: randomUUID()},
    EFFECTIVE_SECRET,
    {expiresIn: JWT_EXPIRES} as jwt.SignOptions,
  );
}

export function extractCaller(request: Request): CallerPayload | null {
  const auth = ((request.headers['authorization'] as string) ?? '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    const payload = jwt.verify(token, EFFECTIVE_SECRET) as jwt.JwtPayload;
    return {
      sub:           payload['sub'] as number,
      username:      payload['username'] as string,
      role:          payload['role'] as string,
      mobile_number: payload['mobile_number'] as string | undefined,
      jti:           payload['jti'] as string | undefined,
    };
  } catch {
    return null;
  }
}

export function isAdmin(caller: CallerPayload | null): boolean {
  return !!caller && ADMIN_ROLES.includes(caller.role);
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}
