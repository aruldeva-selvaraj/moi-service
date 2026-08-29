import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {post, get, patch, del, param, requestBody, HttpErrors, RestBindings, Response, Request} from '@loopback/rest';
import * as bcrypt from 'bcryptjs';
import {UserRepository} from '../repositories';
import {extractCaller, signToken} from '../utils/jwt.utils';

const ALLOWED_ROLES = ['admin', 'superadmin', 'user'];
const CREATE_USER_ROLES = ['admin', 'superadmin'];

export async function checkUserActive(
  repo: {query: (sql: string, params: unknown[]) => Promise<{is_active: boolean}[]>},
  userId: number,
): Promise<boolean> {
  const rows = await repo.query('SELECT is_active FROM public.users WHERE id = $1', [userId]);
  return rows.length > 0 && rows[0].is_active === true;
}

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
    const rawIp = this.request.ip
      ?? (this.request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ip = rawIp && rawIp !== 'unknown' ? rawIp : null;

    if (ip) {
      await this.userRepo.query(
        "DELETE FROM public.login_attempts WHERE attempt_time < NOW() - INTERVAL '1 minute'",
        [],
      );
      const countRows = await this.userRepo.query(
        'SELECT COUNT(*) AS cnt FROM public.login_attempts WHERE ip = $1',
        [ip],
      );
      if (Number((countRows[0] as {cnt: string}).cnt) > 10) {
        this.response.status(429);
        return {error: 'Too many login attempts, please try again later.'};
      }
    } else {
      console.warn('[auth] login request with unresolvable IP — rate limiting skipped');
    }

    const {username, password} = body;

    const raw = username.trim();
    const identifier = raw.toLowerCase();
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
      if (ip) {
        await this.userRepo.query('INSERT INTO public.login_attempts(ip) VALUES($1)', [ip]);
      }
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

    // is_active guard (belt-and-suspenders; the query already filters)
    if (!user.is_active) {
      this.response.status(401);
      return {error: 'Account deactivated'};
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      if (ip) {
        await this.userRepo.query('INSERT INTO public.login_attempts(ip) VALUES($1)', [ip]);
      }
      this.response.status(401);
      return {error: 'Invalid username or password'};
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      this.response.status(403);
      return {error: 'Access denied — admin role required'};
    }

    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      mobile_number: user.mobile_number ?? undefined,
    });

    await this.userRepo.query(
      "UPDATE public.users SET last_login_at = NOW() WHERE id = $1",
      [user.id],
    );
    if (ip) {
      await this.userRepo.query('DELETE FROM public.login_attempts WHERE ip = $1', [ip]);
    }

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
      const caller = extractCaller({
        ...this.request,
        headers: {...this.request.headers, authorization: `Bearer ${body.token}`},
      } as Request);
      if (!caller) throw new Error('invalid');

      const activeRows = await this.userRepo.query(
        'SELECT is_active FROM public.users WHERE id = $1',
        [caller.sub],
      );
      if (activeRows.length === 0 || !(activeRows[0] as {is_active: boolean}).is_active) {
        this.response.status(401);
        return {error: 'Account deactivated'};
      }
      return {valid: true, user: {id: caller.sub, username: caller.username, role: caller.role}};
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
              username:         {type: 'string'},
              current_password: {type: 'string'},
              new_password:     {type: 'string'},
            },
          },
        },
      },
    })
    body: {username: string; current_password: string; new_password: string},
  ): Promise<object> {
    // Rate limit: 5 attempts per hour per IP for change-password
    const rawIp = this.request.ip
      ?? (this.request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ip = rawIp && rawIp !== 'unknown' ? rawIp : null;
    const cpIpKey = ip ? `cp:${ip}` : null;

    if (cpIpKey) {
      await this.userRepo.query(
        "DELETE FROM public.login_attempts WHERE ip = $1 AND attempt_time < NOW() - INTERVAL '1 hour'",
        [cpIpKey],
      );
      const countRows = await this.userRepo.query(
        'SELECT COUNT(*) AS cnt FROM public.login_attempts WHERE ip = $1',
        [cpIpKey],
      );
      if (Number((countRows[0] as {cnt: string}).cnt) >= 5) {
        this.response.status(429);
        return {error: 'Too many password change attempts, please try again later.'};
      }
    }

    const rows = await this.userRepo.query(
      'SELECT * FROM public.users WHERE username = $1 AND is_active = TRUE LIMIT 1',
      [body.username.trim().toLowerCase()],
    );
    if (rows.length === 0) {
      if (cpIpKey) {
        await this.userRepo.query('INSERT INTO public.login_attempts(ip) VALUES($1)', [cpIpKey]);
      }
      this.response.status(401);
      return {error: 'Invalid credentials'};
    }
    const user = rows[0] as {id: number; username: string; password_hash: string};
    const match = await bcrypt.compare(body.current_password, user.password_hash);
    if (!match) {
      if (cpIpKey) {
        await this.userRepo.query('INSERT INTO public.login_attempts(ip) VALUES($1)', [cpIpKey]);
      }
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
    if (cpIpKey) {
      await this.userRepo.query('DELETE FROM public.login_attempts WHERE ip = $1', [cpIpKey]);
    }

    await this.logAudit(user.id, user.username, 'change_password', 'user', user.id, null, null);

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
    const caller = extractCaller(this.request);
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

  // ── Admin reset password (admin Bearer-token auth required) ───────────────
  @post('/api/auth/admin-reset-password', {
    responses: {
      '200': {description: 'Password reset success'},
      '400': {description: 'Validation error'},
      '401': {description: 'Not authenticated as admin'},
      '404': {description: 'Target user not found'},
    },
  })
  async adminResetPassword(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['target_username', 'new_password'],
            properties: {
              target_username: {type: 'string'},
              new_password:    {type: 'string'},
            },
          },
        },
      },
    })
    body: {target_username: string; new_password: string},
  ): Promise<object> {
    // Authenticate via Bearer token; require admin role
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    if (!['admin', 'superadmin'].includes(caller.role)) {
      this.response.status(401);
      return {error: 'Only admin or superadmin can reset passwords'};
    }

    const {target_username, new_password} = body;

    if (!target_username?.trim() || !new_password) {
      this.response.status(400);
      return {error: 'target_username and new_password are required'};
    }
    if (new_password.length < 6) {
      this.response.status(400);
      return {error: 'New password must be at least 6 characters'};
    }

    // Find target user
    const raw = target_username.trim();
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

    await this.logAudit(
      caller.sub, caller.username,
      'admin_reset_password', 'user', targetUser.id,
      null, {target_username: targetUser.username},
    );

    return {success: true, message: `Password reset for "${targetUser.username}" successfully`};
  }

  // ── GET /api/auth/users (admin only) ─────────────────────────────────────
  @get('/api/auth/users', {
    responses: {
      '200': {description: 'List of all users'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
    },
  })
  async listUsers(): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    if (!['admin', 'superadmin'].includes(caller.role)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can list users'};
    }
    const rows = await this.userRepo.query(
      `SELECT id, username, full_name, mobile_number, role, is_active, created_at, last_login_at
       FROM public.users
       ORDER BY created_at DESC`,
      [],
    );
    return {users: rows};
  }

  // ── PATCH /api/auth/users/:id/status (admin only) ────────────────────────
  @patch('/api/auth/users/{id}/status', {
    responses: {
      '200': {description: 'User status updated'},
      '400': {description: 'Validation error'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
      '404': {description: 'User not found'},
    },
  })
  async updateUserStatus(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['is_active'],
            properties: {is_active: {type: 'boolean'}},
          },
        },
      },
    })
    body: {is_active: boolean},
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    if (!['admin', 'superadmin'].includes(caller.role)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can update user status'};
    }
    if (typeof body.is_active !== 'boolean') {
      this.response.status(400);
      return {error: 'is_active must be a boolean'};
    }
    const existing = await this.userRepo.query(
      'SELECT id FROM public.users WHERE id = $1',
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('User not found');

    await this.userRepo.query(
      'UPDATE public.users SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [body.is_active, id],
    );
    const rows = await this.userRepo.query(
      'SELECT id, username, full_name, mobile_number, role, is_active, created_at FROM public.users WHERE id = $1',
      [id],
    );
    return {success: true, user: rows[0]};
  }

  // ── PATCH /api/auth/users/:id/role (admin only) ───────────────────────────
  @patch('/api/auth/users/{id}/role', {
    responses: {
      '200': {description: 'User role updated'},
      '400': {description: 'Validation error'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
      '404': {description: 'User not found'},
    },
  })
  async updateUserRole(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['role'],
            properties: {role: {type: 'string', enum: ['user', 'admin', 'superadmin']}},
          },
        },
      },
    })
    body: {role: string},
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    if (!['admin', 'superadmin'].includes(caller.role)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can update user roles'};
    }
    const allowedRoles = ['user', 'admin', 'superadmin'];
    if (!allowedRoles.includes(body.role)) {
      this.response.status(400);
      return {error: 'role must be one of: user, admin, superadmin'};
    }
    // Only superadmin can assign the superadmin role
    if (body.role === 'superadmin' && caller.role !== 'superadmin') {
      this.response.status(403);
      return {error: 'Only superadmin can assign the superadmin role'};
    }
    const existing = await this.userRepo.query(
      'SELECT id, username, role FROM public.users WHERE id = $1',
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('User not found');

    const prevUser = existing[0] as {id: number; username: string; role: string};

    await this.userRepo.query(
      'UPDATE public.users SET role = $1, updated_at = NOW() WHERE id = $2',
      [body.role, id],
    );
    const rows = await this.userRepo.query(
      'SELECT id, username, full_name, mobile_number, role, is_active, created_at FROM public.users WHERE id = $1',
      [id],
    );

    await this.logAudit(
      caller.sub, caller.username,
      'update_role', 'user', id,
      {role: prevUser.role}, {role: body.role},
    );

    return {success: true, user: rows[0]};
  }

  // ── PATCH /api/auth/profile (authenticated, any role) ────────────────────
  @patch('/api/auth/profile', {
    responses: {
      '200': {description: 'Profile updated'},
      '400': {description: 'Validation error'},
      '401': {description: 'Not authenticated'},
    },
  })
  async updateProfile(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              full_name:     {type: 'string'},
              mobile_number: {type: 'string'},
            },
          },
        },
      },
    })
    body: {full_name?: string; mobile_number?: string},
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const activeCheck = await this.userRepo.query(
      'SELECT is_active FROM public.users WHERE id = $1',
      [caller.sub],
    );
    if (!(activeCheck[0] as {is_active: boolean})?.is_active) {
      this.response.status(401);
      return {error: 'Account deactivated'};
    }
    const allowed: Record<string, unknown> = {};
    if (body.full_name !== undefined) allowed['full_name'] = body.full_name.trim();
    if (body.mobile_number !== undefined) allowed['mobile_number'] = body.mobile_number.trim() || null;
    if (Object.keys(allowed).length === 0) {
      this.response.status(400);
      return {error: 'Nothing to update'};
    }
    const keys = Object.keys(allowed);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values: unknown[] = keys.map(k => allowed[k]);
    values.push(caller.sub);
    const rows = await this.userRepo.query(
      `UPDATE public.users SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING id, username, full_name, mobile_number, role, is_active`,
      values,
    );
    return {success: true, user: rows[0]};
  }

  // ── DELETE /api/auth/users/:id (admin only) ───────────────────────────────
  @del('/api/auth/users/{id}', {
    responses: {
      '204': {description: 'User deleted'},
      '400': {description: 'Cannot delete own account'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
      '404': {description: 'User not found'},
    },
  })
  async deleteUser(
    @param.path.number('id') id: number,
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const activeCheckDel = await this.userRepo.query(
      'SELECT is_active FROM public.users WHERE id = $1',
      [caller.sub],
    );
    if (!(activeCheckDel[0] as {is_active: boolean})?.is_active) {
      this.response.status(401);
      return {error: 'Account deactivated'};
    }
    if (!['admin', 'superadmin'].includes(caller.role)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can delete users'};
    }
    if (id === caller.sub) {
      this.response.status(400);
      return {error: 'Cannot delete your own account'};
    }
    const existing = await this.userRepo.query(
      'SELECT id, username, role FROM public.users WHERE id = $1',
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('User not found');

    const deletedUser = existing[0] as {id: number; username: string; role: string};

    await this.userRepo.query(
      'DELETE FROM public.users WHERE id = $1',
      [id],
    );

    await this.logAudit(
      caller.sub, caller.username,
      'delete_user', 'user', id,
      {username: deletedUser.username, role: deletedUser.role}, null,
    );

    this.response.status(204);
    return {};
  }

  // ── PATCH /api/auth/users/:id (admin only) ────────────────────────────────
  @patch('/api/auth/users/{id}', {
    responses: {
      '200': {description: 'User updated'},
      '400': {description: 'Validation error'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
      '404': {description: 'User not found'},
    },
  })
  async updateUser(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              full_name:     {type: 'string'},
              mobile_number: {type: 'string'},
            },
          },
        },
      },
    })
    body: {full_name?: string; mobile_number?: string},
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const activeCheckUpd = await this.userRepo.query(
      'SELECT is_active FROM public.users WHERE id = $1',
      [caller.sub],
    );
    if (!(activeCheckUpd[0] as {is_active: boolean})?.is_active) {
      this.response.status(401);
      return {error: 'Account deactivated'};
    }
    if (!['admin', 'superadmin'].includes(caller.role)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can update users'};
    }
    const allowed: Record<string, unknown> = {};
    if (body.full_name !== undefined) allowed['full_name'] = body.full_name.trim();
    if (body.mobile_number !== undefined) allowed['mobile_number'] = body.mobile_number.trim() || null;
    if (Object.keys(allowed).length === 0) {
      this.response.status(400);
      return {error: 'Nothing to update'};
    }
    const existing = await this.userRepo.query(
      'SELECT id, username, full_name, mobile_number FROM public.users WHERE id = $1',
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('User not found');

    const prevUser = existing[0] as {id: number; username: string; full_name: string | null; mobile_number: string | null};

    const keys = Object.keys(allowed);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values: unknown[] = keys.map(k => allowed[k]);
    values.push(id);
    const rows = await this.userRepo.query(
      `UPDATE public.users SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING id, username, full_name, mobile_number, role, is_active`,
      values,
    );

    await this.logAudit(
      caller.sub, caller.username,
      'update_user', 'user', id,
      {full_name: prevUser.full_name, mobile_number: prevUser.mobile_number},
      allowed,
    );

    return {success: true, user: rows[0]};
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
        updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      )`,
      [],
    );
    // Add mobile_number if upgrading from older schema
    await this.userRepo.query(
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15) UNIQUE`,
      [],
    );
    await this.userRepo.query(
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP`,
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
    await this.userRepo.query(
      `CREATE TABLE IF NOT EXISTS public.login_attempts (
        ip           VARCHAR(45)  NOT NULL,
        attempt_time TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )`,
      [],
    );
  }

  // ── Private: write to audit_log (best-effort, never throws) ──────────────
  private async logAudit(
    actorId: number | null,
    actorUsername: string | null,
    action: string,
    entityType: string,
    entityId: number | null,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    try {
      const ip = this.request.ip ?? null;
      await this.userRepo.query(
        `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,old_value,new_value,ip_address)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          actorId,
          actorUsername,
          action,
          entityType,
          entityId,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          ip,
        ],
      );
    } catch { /* audit failures must never break the main flow */ }
  }
}
