import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {post, get, requestBody, RestBindings, Response, Request} from '@loopback/rest';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {UserRepository} from '../repositories';

const JWT_SECRET = process.env.JWT_SECRET ?? 'moify_jwt_secret_change_in_prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h';
const ALLOWED_ROLES = ['admin', 'superadmin', 'user'];
const CREATE_USER_ROLES = ['admin', 'superadmin'];

export class AuthController {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @inject(RestBindings.Http.RESPONSE) private response: Response,
    @inject(RestBindings.Http.REQUEST) private request: Request,
  ) {}

  // ── Ensure users table exists and seed default admin ──────────────────────
  @get('/api/auth/setup', {
    responses: {'200': {description: 'Setup status'}},
  })
  async setup(): Promise<object> {
    await this.ensureTable();
    const existing = await this.userRepo.query(
      'SELECT id FROM public.users LIMIT 1',
      [],
    );
    if (existing.length === 0) {
      const hash = await bcrypt.hash('moify@2024', 12);
      console.log("password : "+hash);
      await this.userRepo.query(
        `INSERT INTO public.users (username, password_hash, role, full_name, mobile_number, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin', hash, 'admin', 'Administrator', '9789616611', true],
      );
      return {status: 'created', message: 'Default admin user created (admin / moify@2024)'};
    }
    // Ensure admin mobile number is set on existing installs
    await this.userRepo.query(
      `UPDATE public.users SET mobile_number = '9789616611'
       WHERE username = 'admin' AND mobile_number IS NULL`,
      [],
    );
    return {status: 'ok', message: 'Users table ready'};
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  @post('/api/auth/login', {
    responses: {
      '200': {description: 'Login success — returns JWT token'},
      '401': {description: 'Invalid credentials'},
      '403': {description: 'Access denied — insufficient role'},
    },
  })
  async login(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: {type: 'string'},
              password: {type: 'string'},
            },
          },
        },
      },
    })
    body: {username: string; password: string},
  ): Promise<object> {
    const {username, password} = body;

    const raw = username.trim();
    const identifier = raw.toLowerCase();
    // Normalise mobile: strip +91 / leading 0 so 9789616611, +919789616611, 09789616611 all match
    const mobileNorm = raw.replace(/^\+91/, '').replace(/^0(\d{10})$/, '$1').trim();

    const rows = await this.userRepo.query(
      `SELECT * FROM public.users
       WHERE (lower(username) = $1
          OR trim(mobile_number) = $2
          OR trim(mobile_number) = $1)
         AND is_active = TRUE LIMIT 1`,
      [identifier, mobileNorm],
    );

    if (rows.length === 0) {
      this.response.status(401);
      return {error: 'Invalid username or password'};
    }

    const user = rows[0] as {
      id: number;
      username: string;
      password_hash: string;
      role: string;
      full_name: string | null;
      mobile_number: string | null;
      is_active: boolean;
    };

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      this.response.status(401);
      return {error: 'Invalid username or password'};
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      this.response.status(403);
      return {error: 'Access denied — admin role required'};
    }

    const token = jwt.sign(
      {sub: user.id, username: user.username, role: user.role, mobile_number: user.mobile_number ?? null},
      JWT_SECRET,
      {expiresIn: JWT_EXPIRES} as jwt.SignOptions,
    );

    return {
      token,
      user: {
        id:            user.id,
        username:      user.username,
        role:          user.role,
        full_name:     user.full_name ?? user.username,
        mobile_number: user.mobile_number ?? null,
      },
    };
  }

  // ── Verify token (used by frontend on refresh) ────────────────────────────
  @post('/api/auth/verify', {
    responses: {'200': {description: 'Token payload or 401'}},
  })
  async verify(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['token'],
            properties: {token: {type: 'string'}},
          },
        },
      },
    })
    body: {token: string},
  ): Promise<object> {
    try {
      const payload = jwt.verify(body.token, JWT_SECRET) as jwt.JwtPayload;
      return {valid: true, user: {id: payload['sub'], username: payload['username'], role: payload['role']}};
    } catch {
      this.response.status(401);
      return {valid: false, error: 'Token expired or invalid'};
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  @post('/api/auth/change-password', {
    responses: {'200': {description: 'Password changed'}},
  })
  async changePassword(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'current_password', 'new_password'],
            properties: {
              username: {type: 'string'},
              current_password: {type: 'string'},
              new_password: {type: 'string'},
            },
          },
        },
      },
    })
    body: {username: string; current_password: string; new_password: string},
  ): Promise<object> {
    const rows = await this.userRepo.query(
      'SELECT * FROM public.users WHERE username = $1 AND is_active = TRUE LIMIT 1',
      [body.username.trim().toLowerCase()],
    );
    if (rows.length === 0) {
      this.response.status(401);
      return {error: 'Invalid credentials'};
    }
    const user = rows[0] as {id: number; password_hash: string};
    const match = await bcrypt.compare(body.current_password, user.password_hash);
    if (!match) {
      this.response.status(401);
      return {error: 'Current password is incorrect'};
    }
    if (body.new_password.length < 6) {
      this.response.status(400);
      return {error: 'New password must be at least 6 characters'};
    }
    const newHash = await bcrypt.hash(body.new_password, 12);
    await this.userRepo.query(
      'UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, user.id],
    );
    return {success: true, message: 'Password changed successfully'};
  }

  // ── Create user (admin / superadmin only) ────────────────────────────────
  @post('/api/auth/create-user', {
    responses: {
      '201': {description: 'User created'},
      '400': {description: 'Validation error'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
      '409': {description: 'Username already exists'},
    },
  })
  async createUser(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['username', 'password', 'role'],
            properties: {
              username:      {type: 'string'},
              password:      {type: 'string'},
              role:          {type: 'string', enum: ['admin', 'superadmin', 'user']},
              full_name:     {type: 'string'},
              mobile_number: {type: 'string'},
            },
          },
        },
      },
    })
    body: {username: string; password: string; role: string; full_name?: string; mobile_number?: string},
  ): Promise<object> {
    const caller = this.extractTokenPayload();
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    if (!CREATE_USER_ROLES.includes(caller.role)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can create users'};
    }

    const {username, password, role, full_name, mobile_number} = body;

    if (!username?.trim() || !password || !role) {
      this.response.status(400);
      return {error: 'username, password and role are required'};
    }
    if (password.length < 6) {
      this.response.status(400);
      return {error: 'Password must be at least 6 characters'};
    }
    if (!['admin', 'superadmin', 'user'].includes(role)) {
      this.response.status(400);
      return {error: 'role must be admin, superadmin, or user'};
    }

    const existing = await this.userRepo.query(
      'SELECT id FROM public.users WHERE lower(username) = lower($1) LIMIT 1',
      [username.trim()],
    );
    if (existing.length > 0) {
      this.response.status(409);
      return {error: 'Username already exists'};
    }

    // Normalise: strip +91 / leading 0, keep only digits
    const mobileVal = mobile_number?.trim()
      .replace(/^\+91/, '')
      .replace(/^0(\d{10})$/, '$1')
      || null;
    if (mobileVal) {
      const mobileExists = await this.userRepo.query(
        'SELECT id FROM public.users WHERE mobile_number = $1 LIMIT 1',
        [mobileVal],
      );
      if (mobileExists.length > 0) {
        this.response.status(409);
        return {error: 'Mobile number already registered'};
      }
    }

    const hash = await bcrypt.hash(password, 12);
    const rows = await this.userRepo.query(
      `INSERT INTO public.users (username, password_hash, role, full_name, mobile_number, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, username, role, full_name, mobile_number`,
      [username.trim().toLowerCase(), hash, role, full_name?.trim() ?? null, mobileVal],
    );

    this.response.status(201);
    return {success: true, user: rows[0]};
  }

  // ── Lookup user by username or mobile (for forgot-password step 1) ─────────
  @post('/api/auth/lookup-user', {
    responses: {'200': {description: 'User lookup result'}},
  })
  async lookupUser(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['identifier'],
            properties: {identifier: {type: 'string'}},
          },
        },
      },
    })
    body: {identifier: string},
  ): Promise<object> {
    const raw = body.identifier?.trim() ?? '';
    if (!raw) {
      this.response.status(400);
      return {found: false, error: 'Identifier is required'};
    }
    const identifier = raw.toLowerCase();
    const mobileNorm = raw.replace(/^\+91/, '').replace(/^0(\d{10})$/, '$1').trim();

    const rows = await this.userRepo.query(
      `SELECT username, full_name FROM public.users
       WHERE (lower(username) = $1 OR trim(mobile_number) = $2 OR trim(mobile_number) = $1)
         AND is_active = TRUE LIMIT 1`,
      [identifier, mobileNorm],
    );

    if (rows.length === 0) return {found: false};

    const u = rows[0] as {username: string; full_name: string | null};
    // Mask: show first 2 chars then ***
    const maskStr = (s: string) =>
      s.length <= 2 ? s + '***' : s.slice(0, 2) + '*'.repeat(Math.min(s.length - 2, 4));
    const displayName = u.full_name
      ? u.full_name.split(' ').map(maskStr).join(' ')
      : maskStr(u.username);

    return {found: true, masked_name: displayName};
  }

  // ── Admin reset password (admin auth required) ────────────────────────────
  @post('/api/auth/admin-reset-password', {
    responses: {
      '200': {description: 'Password reset success'},
      '400': {description: 'Validation error'},
      '401': {description: 'Admin credentials invalid'},
      '404': {description: 'Target user not found'},
    },
  })
  async adminResetPassword(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['admin_username', 'admin_password', 'target', 'new_password'],
            properties: {
              admin_username: {type: 'string'},
              admin_password: {type: 'string'},
              target:         {type: 'string'},
              new_password:   {type: 'string'},
            },
          },
        },
      },
    })
    body: {admin_username: string; admin_password: string; target: string; new_password: string},
  ): Promise<object> {
    const {admin_username, admin_password, target, new_password} = body;

    if (!admin_username?.trim() || !admin_password || !target?.trim() || !new_password) {
      this.response.status(400);
      return {error: 'All fields are required'};
    }
    if (new_password.length < 6) {
      this.response.status(400);
      return {error: 'New password must be at least 6 characters'};
    }

    // Verify admin credentials
    const adminRows = await this.userRepo.query(
      `SELECT id, password_hash, role FROM public.users
       WHERE lower(username) = $1 AND is_active = TRUE LIMIT 1`,
      [admin_username.trim().toLowerCase()],
    );
    if (adminRows.length === 0) {
      this.response.status(401);
      return {error: 'Invalid admin credentials'};
    }
    const admin = adminRows[0] as {id: number; password_hash: string; role: string};
    const adminMatch = await bcrypt.compare(admin_password, admin.password_hash);
    if (!adminMatch) {
      this.response.status(401);
      return {error: 'Invalid admin credentials'};
    }
    if (!['admin', 'superadmin'].includes(admin.role)) {
      this.response.status(401);
      return {error: 'Only admin or superadmin can reset passwords'};
    }

    // Find target user
    const raw = target.trim();
    const targetId = raw.toLowerCase();
    const mobileNorm = raw.replace(/^\+91/, '').replace(/^0(\d{10})$/, '$1').trim();
    const targetRows = await this.userRepo.query(
      `SELECT id, username FROM public.users
       WHERE (lower(username) = $1 OR trim(mobile_number) = $2 OR trim(mobile_number) = $1)
         AND is_active = TRUE LIMIT 1`,
      [targetId, mobileNorm],
    );
    if (targetRows.length === 0) {
      this.response.status(404);
      return {error: 'User not found'};
    }
    const targetUser = targetRows[0] as {id: number; username: string};

    const newHash = await bcrypt.hash(new_password, 12);
    await this.userRepo.query(
      'UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, targetUser.id],
    );

    return {success: true, message: `Password reset for "${targetUser.username}" successfully`};
  }

  // ── Private: extract JWT payload from Authorization header ───────────────
  private extractTokenPayload(): {sub: number; username: string; role: string} | null {
    const auth = this.request.headers['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    try {
      return jwt.verify(token, JWT_SECRET) as unknown as {sub: number; username: string; role: string};
    } catch {
      return null;
    }
  }

  // ── Private: create users table if missing ────────────────────────────────
  private async ensureTable(): Promise<void> {
    await this.userRepo.query(
      `CREATE TABLE IF NOT EXISTS public.users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(50)  NOT NULL DEFAULT 'admin',
        full_name     VARCHAR(200),
        mobile_number VARCHAR(15)  UNIQUE,
        is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
      )`,
      [],
    );
    // Add mobile_number if upgrading from older schema
    await this.userRepo.query(
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15) UNIQUE`,
      [],
    );
    // Add created_by and status to events if upgrading from older schema
    await this.userRepo.query(
      `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL`,
      [],
    ).catch(() => { /* events table may not exist yet — ignore */ });
    await this.userRepo.query(
      `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved'`,
      [],
    ).catch(() => { /* events table may not exist yet — ignore */ });
  }
}
