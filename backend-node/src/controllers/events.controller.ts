import {authenticate} from '@loopback/authentication';
import {del, get, param, patch, post, put, requestBody, HttpErrors, RestBindings, Response, Request} from '@loopback/rest';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {EventRepository} from '../repositories';
import {extractCaller, isAdmin, isAdminRole} from '../utils/jwt.utils';

interface EventRow {
  id: number;
  event_type: string;
  primary_name: string;
  secondary_name: string | null;
  family_name: string | null;
  event_date: string;
  venue: string | null;
  city: string | null;
  district: string | null;
  notes: string | null;
  created_by: number;
  status: string;
  created_at: string;
  updated_at: string;
  total_moi: number;
  moi_count: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface EventCreateDto {
  event_type?: string;
  primary_name: string;
  secondary_name?: string;
  family_name?: string;
  event_date: string;
  venue?: string;
  city?: string;
  district?: string;
  notes?: string;
}

const EVENT_SELECT = `
  e.id, e.event_type, e.primary_name, e.secondary_name,
  e.family_name, e.event_date::text, e.venue, e.city, e.district, e.notes,
  e.created_by, e.status, e.created_at, e.updated_at,
  COALESCE(SUM(m.amount), 0)::float AS total_moi,
  COUNT(m.id)::int                  AS moi_count`;

const EVENT_JOIN = `LEFT JOIN moi_entries m ON e.id = m.event_id AND m.deleted_at IS NULL`;

const ALLOWED_EVENT_FIELDS = [
  'primary_name', 'secondary_name', 'family_name', 'event_date',
  'venue', 'city', 'district', 'notes', 'event_type',
];

export class EventsController {
  constructor(
    @repository(EventRepository)
    private eventRepo: EventRepository,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
    @inject(RestBindings.Http.REQUEST)
    private request: Request,
  ) {}

  // ── GET /api/events ────────────────────────────────────
  @get('/api/events', {
    responses: {'200': {description: 'List of events with moi totals'}},
  })
  async listEvents(
    @param.query.number('page')        page?:       number,
    @param.query.number('limit')       limit?:      number,
    @param.query.string('search')      search?:     string,
    @param.query.string('event_type')  event_type?: string,
    @param.query.string('status')      status?:     string,
    @param.query.string('date_from')   date_from?:  string,
    @param.query.string('date_to')     date_to?:    string,
    @param.query.string('sort_field')  sort_field?: string,
    @param.query.string('sort_dir')    sort_dir?:   string,
  ): Promise<EventRow[] | PaginatedResult<EventRow>> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'} as unknown as EventRow[];
    }
    const paginate = page !== undefined;
    const pageNum  = page  ?? 1;
    const pageSize = limit ?? 50;
    const offset   = (pageNum - 1) * pageSize;

    const conditions: string[] = ['e.deleted_at IS NULL'];
    const filterParams: unknown[] = [];
    let pIdx = 1;

    if (!isAdmin(caller)) {
      const userId = caller?.sub;
      if (!userId) return paginate ? {data: [], total: 0, page: pageNum, limit: pageSize} : [];
      conditions.push(`e.created_by = $${pIdx++}`);
      filterParams.push(userId);
    }

    if (search) {
      conditions.push(`(e.primary_name ILIKE $${pIdx} OR e.secondary_name ILIKE $${pIdx} OR e.family_name ILIKE $${pIdx})`);
      filterParams.push(`%${search}%`);
      pIdx++;
    }
    if (event_type) { conditions.push(`e.event_type = $${pIdx++}`);  filterParams.push(event_type); }
    if (status)     { conditions.push(`e.status = $${pIdx++}`);      filterParams.push(status); }
    if (date_from)  { conditions.push(`e.event_date >= $${pIdx++}`); filterParams.push(date_from); }
    if (date_to)    { conditions.push(`e.event_date <= $${pIdx++}`); filterParams.push(date_to); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const ALLOWED_SORT_FIELDS = ['event_date', 'primary_name', 'total_moi', 'moi_count', 'created_at'];
    const resolvedSortField = ALLOWED_SORT_FIELDS.includes(sort_field ?? '') ? sort_field! : 'event_date';
    const resolvedSortDir   = sort_dir === 'asc' ? 'ASC' : 'DESC';
    const sortExpr = ['total_moi', 'moi_count'].includes(resolvedSortField)
      ? `${resolvedSortField} ${resolvedSortDir}`
      : `e.${resolvedSortField} ${resolvedSortDir}`;

    if (paginate) {
      const countRows = await this.eventRepo.query(
        `SELECT COUNT(*)::int AS total FROM events e ${where}`,
        filterParams,
      );
      const total = Number(countRows[0]?.total ?? 0);
      const data = await this.eventRepo.query(
        `SELECT ${EVENT_SELECT}
         FROM events e ${EVENT_JOIN}
         ${where}
         GROUP BY e.id
         ORDER BY ${sortExpr}
         LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
        [...filterParams, pageSize, offset],
      );
      return {data: data as unknown as EventRow[], total, page: pageNum, limit: pageSize};
    }

    return this.eventRepo.query(
      `SELECT ${EVENT_SELECT}
       FROM events e ${EVENT_JOIN}
       ${where}
       GROUP BY e.id
       ORDER BY ${sortExpr}`,
      filterParams,
    ) as unknown as EventRow[];
  }

  // ── POST /api/events ───────────────────────────────────
  @post('/api/events', {
    responses: {'201': {description: 'Event created'}},
  })
  async createEvent(
    @requestBody({content: {'application/json': {schema: {type: 'object'}}}})
    data: EventCreateDto,
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const status = isAdmin(caller) ? 'approved' : 'pending';
    const now = new Date();
    const result = await this.eventRepo.query(
      `INSERT INTO events
         (event_type, primary_name, secondary_name, family_name,
          event_date, venue, city, district, notes,
          created_by, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, event_type, primary_name, secondary_name, family_name,
                 event_date::text, venue, city, district, notes,
                 created_by, status,
                 created_at, updated_at,
                 0::float AS total_moi, 0::int AS moi_count`,
      [
        data.event_type ?? 'wedding',
        data.primary_name,
        data.secondary_name ?? null,
        data.family_name    ?? null,
        data.event_date,
        data.venue          ?? null,
        data.city           ?? null,
        data.district       ?? null,
        data.notes          ?? null,
        caller?.sub         ?? null,
        status,
        now,
        now,
      ],
    );
    this.response.status(201);
    return result[0];
  }

  // ── GET /api/events/:id ────────────────────────────────
  @get('/api/events/{id}', {
    responses: {
      '200': {description: 'Event by id'},
      '404': {description: 'Not found'},
    },
  })
  async getEvent(@param.path.number('id') id: number): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const isOwnerRestricted = !isAdmin(caller);
    const getParams: unknown[] = [id];
    if (isOwnerRestricted) getParams.push(caller?.sub ?? 0);
    const ownerClause = isOwnerRestricted ? `AND e.created_by = $2` : '';
    const rows = await this.eventRepo.query(
      `SELECT ${EVENT_SELECT}
       FROM events e ${EVENT_JOIN}
       WHERE e.id = $1 AND e.deleted_at IS NULL ${ownerClause}
       GROUP BY e.id`,
      getParams,
    );
    if (!rows.length) throw new HttpErrors.NotFound('Event not found');
    return rows[0];
  }

  // ── PUT /api/events/:id ────────────────────────────────
  @put('/api/events/{id}', {
    responses: {
      '200': {description: 'Event updated'},
      '404': {description: 'Not found'},
    },
  })
  async updateEvent(
    @param.path.number('id') id: number,
    @requestBody({content: {'application/json': {schema: {type: 'object'}}}})
    data: Partial<EventCreateDto>,
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const isOwnerRestricted = !isAdmin(caller);
    const existParams: unknown[] = [id];
    if (isOwnerRestricted) existParams.push(caller?.sub ?? 0);
    const ownerClause = isOwnerRestricted ? `AND created_by = $2` : '';
    const existing = await this.eventRepo.query(
      `SELECT id FROM events WHERE id = $1 AND deleted_at IS NULL ${ownerClause}`,
      existParams,
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');

    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k, v]) => v !== undefined && ALLOWED_EVENT_FIELDS.includes(k)),
    );
    const fields = Object.entries(filtered);
    if (!fields.length) return this.getEvent(id);

    const setClauses = fields.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values: unknown[] = fields.map(([, v]) => v);
    const updIdx = fields.length + 1;
    const idIdx  = fields.length + 2;
    values.push(new Date());
    values.push(id);

    await this.eventRepo.query(
      `UPDATE events SET ${setClauses}, updated_at = $${updIdx} WHERE id = $${idIdx}`,
      values,
    );
    return this.getEvent(id);
  }

  // ── PATCH /api/events/:id/approve ─────────────────────
  @patch('/api/events/{id}/approve', {
    responses: {
      '200': {description: 'Event approved'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
      '404': {description: 'Not found'},
    },
  })
  async approveEvent(@param.path.number('id') id: number): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    if (!isAdmin(caller)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can approve events'};
    }
    const existing = await this.eventRepo.query(
      `SELECT id FROM events WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');

    await this.eventRepo.query(
      `UPDATE events SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [id],
    );
    await this.eventRepo.query(
      `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,new_value)
       VALUES($1,$2,$3,'event',$4,$5)`,
      [caller.sub, caller.username, 'approve', id, JSON.stringify({status: 'approved'})],
    );
    return this.getEvent(id);
  }

  // ── PATCH /api/events/:id/reject ──────────────────────
  @patch('/api/events/{id}/reject', {
    responses: {
      '200': {description: 'Event rejected'},
      '401': {description: 'Not authenticated'},
      '403': {description: 'Insufficient role'},
      '404': {description: 'Not found'},
    },
  })
  async rejectEvent(@param.path.number('id') id: number): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    if (!isAdmin(caller)) {
      this.response.status(403);
      return {error: 'Only admin or superadmin can reject events'};
    }
    const existing = await this.eventRepo.query(
      `SELECT id FROM events WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');

    await this.eventRepo.query(
      `UPDATE events SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [id],
    );
    await this.eventRepo.query(
      `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,new_value)
       VALUES($1,$2,$3,'event',$4,$5)`,
      [caller.sub, caller.username, 'reject', id, JSON.stringify({status: 'rejected'})],
    );
    return {message: 'Event rejected'};
  }

  // ── POST /api/events/:id/clone ────────────────────────
  @post('/api/events/{id}/clone', {
    responses: {
      '201': {description: 'Cloned event'},
      '401': {description: 'Not authenticated'},
      '404': {description: 'Not found'},
    },
  })
  async cloneEvent(@param.path.number('id') id: number): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const isOwnerRestricted = !isAdmin(caller);
    const fetchParams: unknown[] = [id];
    if (isOwnerRestricted) fetchParams.push(caller.sub ?? 0);
    const ownerClause = isOwnerRestricted ? `AND created_by = $2` : '';
    const existing = await this.eventRepo.query(
      `SELECT event_type, primary_name, secondary_name, family_name,
              event_date, venue, city, district, notes
       FROM events WHERE id = $1 AND deleted_at IS NULL ${ownerClause}`,
      fetchParams,
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');
    const src = existing[0];
    const now = new Date();
    const status = isAdmin(caller) ? 'approved' : 'pending';
    const result = await this.eventRepo.query(
      `INSERT INTO events
         (event_type, primary_name, secondary_name, family_name,
          event_date, venue, city, district, notes,
          created_by, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, event_type, primary_name, secondary_name, family_name,
                 event_date::text, venue, city, district, notes,
                 created_by, status,
                 created_at, updated_at,
                 0::float AS total_moi, 0::int AS moi_count`,
      [
        src.event_type,
        src.primary_name,
        src.secondary_name ?? null,
        src.family_name    ?? null,
        src.event_date,
        src.venue          ?? null,
        src.city           ?? null,
        src.district       ?? null,
        src.notes          ?? null,
        caller.sub         ?? null,
        status,
        now,
        now,
      ],
    );
    this.response.status(201);
    return result[0];
  }

  // ── PATCH /api/events/:id/complete ────────────────────
  @patch('/api/events/{id}/complete', {
    responses: {
      '200': {description: 'Event marked as completed'},
      '401': {description: 'Not authenticated'},
      '404': {description: 'Not found'},
    },
  })
  async completeEvent(@param.path.number('id') id: number): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return {error: 'Authentication required'};
    }
    const isOwnerRestricted = !isAdmin(caller);
    const existParams: unknown[] = [id];
    if (isOwnerRestricted) existParams.push(caller.sub ?? 0);
    const ownerClause = isOwnerRestricted ? `AND created_by = $2` : '';
    const existing = await this.eventRepo.query(
      `SELECT id, status FROM events WHERE id = $1 AND deleted_at IS NULL ${ownerClause}`,
      existParams,
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');
    if (existing[0].status !== 'approved') {
      this.response.status(400);
      return {error: 'Only approved events can be completed'};
    }
    await this.eventRepo.query(
      `UPDATE events SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [id],
    );
    await this.eventRepo.query(
      `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,new_value)
       VALUES($1,$2,$3,'event',$4,$5)`,
      [caller.sub, caller.username, 'complete', id, JSON.stringify({status: 'completed'})],
    );
    return {message: 'Event marked as completed'};
  }

  // ── DELETE /api/events/:id ─────────────────────────────
  @del('/api/events/{id}', {
    responses: {
      '204': {description: 'Event soft-deleted'},
      '404': {description: 'Not found'},
    },
  })
  async deleteEvent(@param.path.number('id') id: number): Promise<void> {
    const caller = extractCaller(this.request);
    if (!caller) {
      this.response.status(401);
      return;
    }
    const isOwnerRestricted = !isAdmin(caller);
    const delParams: unknown[] = [id];
    if (isOwnerRestricted) delParams.push(caller?.sub ?? 0);
    const ownerClause = isOwnerRestricted ? `AND created_by = $2` : '';

    const result = await this.eventRepo.query(
      `UPDATE public.events
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL ${ownerClause}
       RETURNING id`,
      delParams,
    );
    if (!result.length) throw new HttpErrors.NotFound('Event not found');

    await this.eventRepo.query(
      `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,new_value)
       VALUES($1,$2,$3,'event',$4,$5)`,
      [caller.sub, caller.username, 'delete', id, JSON.stringify({deleted_at: new Date().toISOString()})],
    );
    this.response.status(204);
  }

  // ── GET /api/events/:id/report ─────────────────────────
  @get('/api/events/{id}/report', {
    responses: {
      '200': {description: 'Event report with side and payment breakdowns'},
      '404': {description: 'Not found'},
    },
  })
  async getEventReport(@param.path.number('id') id: number): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) { this.response.status(401); return {error: 'Authentication required'}; }
    const isOwnerRestricted = !isAdmin(caller);
    const reportParams: unknown[] = [id];
    if (isOwnerRestricted) reportParams.push(caller?.sub ?? 0);
    const ownerClause = isOwnerRestricted ? `AND created_by = $2` : '';
    const events = await this.eventRepo.query(
      `SELECT id, event_type, primary_name, secondary_name, event_date::text
       FROM events WHERE id = $1 AND deleted_at IS NULL AND status IN ('approved', 'completed') ${ownerClause}`,
      reportParams,
    );
    if (!events.length) throw new HttpErrors.NotFound('Event not found or not approved');
    const ev = events[0];

    const rows = await this.eventRepo.query(
      `SELECT
         COALESCE(SUM(amount), 0)::float                                           AS total_amount,
         COUNT(id)::int                                                             AS moi_count,
         COUNT(id) FILTER (WHERE side = 'groom')::int                              AS groom_count,
         COUNT(id) FILTER (WHERE side = 'bride')::int                              AS bride_count,
         COALESCE(SUM(amount) FILTER (WHERE side = 'groom'),  0)::float            AS groom_amount,
         COALESCE(SUM(amount) FILTER (WHERE side = 'bride'),  0)::float            AS bride_amount,
         COALESCE(SUM(amount) FILTER (WHERE payment_mode = 'cash'),   0)::float    AS cash_amount,
         COALESCE(SUM(amount) FILTER (WHERE payment_mode = 'cheque'), 0)::float    AS cheque_amount,
         COALESCE(SUM(amount) FILTER (WHERE payment_mode = 'online'), 0)::float    AS online_amount,
         COALESCE(SUM(CASE WHEN payment_mode = 'dd' THEN amount ELSE 0 END), 0)::float AS dd_amount
       FROM moi_entries
       WHERE event_id = $1`,
      [id],
    );

    const r = rows[0] ?? {};
    return {
      event_id:       ev.id,
      event_type:     ev.event_type,
      primary_name:   ev.primary_name,
      secondary_name: ev.secondary_name ?? null,
      event_date:     ev.event_date,
      total_amount:   r.total_amount  ?? 0,
      moi_count:      r.moi_count     ?? 0,
      groom_count:    r.groom_count   ?? 0,
      bride_count:    r.bride_count   ?? 0,
      groom_amount:   r.groom_amount  ?? 0,
      bride_amount:   r.bride_amount  ?? 0,
      cash_amount:    r.cash_amount   ?? 0,
      cheque_amount:  r.cheque_amount ?? 0,
      online_amount:  r.online_amount ?? 0,
      dd_amount:      r.dd_amount     ?? 0,
    };
  }

  // ── GET /api/events/export ─────────────────────────────
  @authenticate('jwt')
  @get('/api/events/export', {
    responses: {'200': {description: 'Full data export for authenticated user'}},
  })
  async exportUserData(): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) { this.response.status(401); return {error: 'Unauthorized'}; }
    const isAdminUser = isAdminRole(caller.role);
    const ownerClause = isAdminUser ? '' : 'AND e.created_by = $1';
    const params = isAdminUser ? [] : [caller.sub];
    const events = await this.eventRepo.query(
      `SELECT e.*, COALESCE((SELECT json_agg(m.*) FROM public.moi_entries m WHERE m.event_id = e.id AND m.deleted_at IS NULL), '[]') as moi_entries
       FROM public.events e
       WHERE e.deleted_at IS NULL ${ownerClause}
       ORDER BY e.event_date DESC`,
      params,
    );
    this.response.setHeader('Content-Disposition', 'attachment; filename="moify-export.json"');
    this.response.setHeader('Content-Type', 'application/json');
    return {exported_at: new Date().toISOString(), events: events};
  }
}
