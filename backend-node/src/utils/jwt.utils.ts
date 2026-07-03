import * as jwt from 'jsonwebtoken';
import {Request} from '@loopback/rest';

const JWT_SECRET = process.env.JWT_SECRET ?? 'moify_jwt_secret_change_in_prod';

export interface CallerPayload {
  sub: number;
  username: string;
  role: string;
  mobile_number?: string;
}

export const ADMIN_ROLES = ['admin', 'superadmin'];

export function extractCaller(request: Request): CallerPayload | null {
  const auth = ((request.headers['authorization'] as string) ?? '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as CallerPayload;
  } catch {
    return null;
  }
}

export function isAdmin(caller: CallerPayload | null): boolean {
  return !!caller && ADMIN_ROLES.includes(caller.role);
}
