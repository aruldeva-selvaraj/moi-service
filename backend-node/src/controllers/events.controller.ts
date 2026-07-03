import {del, get, param, patch, post, put, requestBody, HttpErrors, RestBindings, Response, Request} from '@loopback/rest';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {EventRepository} from '../repositories';
import {extractCaller, isAdmin} from '../utils/jwt.utils';

interface EventCreateDto {
  event_type?: string;
  primary_name: string;
  secondary_name?: string;
  family_name?: string;
  event_date: string;
  venue?: string;
  city?: string;
  notes?: string;
}

const EVENT_SELECT = `
  e.id, e.event_type, e.primary_name, e.secondary_name,
  e.family_name, e.event_date::text, e.venue, e.city, e.notes,
  e.created_by, e.status, e.created_at, e.updated_at,
  COALESCE(SUM(m.amount), 0)::float AS total_moi,
  COUNT(m.id)::int                  AS moi_count`;

const EVENT_JOIN = `LEFT JOIN moi_entries m ON e.id = m.event_id`;

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
  async listEvents(): Promise<object[]> {
    const caller = extractCaller(this.request);
    if (isAdmin(caller)) {
      // Admin sees all events (pending + approved)
      return this.eventRepo.query(
        `SELECT ${EVENT_SELECT}
         FROM events e ${EVENT_JOIN}
         GROUP BY e.id
         ORDER BY e.status ASC, e.event_date DESC`,
        [],
      );
    }
    // User: own approved events + own pending events
    const userId = caller?.sub;
    if (!userId) return [];
    return this.eventRepo.query(
      `SELECT ${EVENT_SELECT}
       FROM events e ${EVENT_JOIN}
       WHERE e.created_by = $1
       GROUP BY e.id
       ORDER BY e.status ASC, e.event_date DESC`,
      [userId],
    );
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
    // Admin / superadmin events are auto-approved; user events require approval
    const status = isAdmin(caller) ? 'approved' : 'pending';
    const now = new Date();
    const result = await this.eventRepo.query(
      `INSERT INTO events
         (event_type, primary_name, secondary_name, family_name,
          event_date, venue, city, notes, created_by, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, event_type, primary_name, secondary_name, family_name,
                 event_date::text, venue, city, notes, created_by, status,
                 created_at, updated_at,
                 0::float AS total_moi, 0::int AS moi_count`,
      [
        data.event_type ?? 'wedding',
        data.primary_name,
        data.secondary_name ?? null,
        data.family_name ?? null,
        data.event_date,
        data.venue ?? null,
        data.city ?? null,
        data.notes ?? null,
        caller?.sub ?? null,
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
    const ownerClause = isAdmin(caller) ? '' : `AND e.created_by = ${caller?.sub ?? 0}`;
    const rows = await this.eventRepo.query(
      `SELECT ${EVENT_SELECT}
       FROM events e ${EVENT_JOIN}
       WHERE e.id = $1 ${ownerClause}
       GROUP BY e.id`,
      [id],
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
    const ownerClause = isAdmin(caller) ? '' : `AND created_by = ${caller?.sub ?? 0}`;
    const existing = await this.eventRepo.query(
      `SELECT id FROM events WHERE id = $1 ${ownerClause}`,
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) return this.getEvent(id);

    const setClauses = fields.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values: unknown[] = fields.map(([, v]) => v);
    const updIdx = fields.length + 1;
    const idIdx = fields.length + 2;
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
      `SELECT id FROM events WHERE id = $1`,
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');

    await this.eventRepo.query(
      `UPDATE events SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [id],
    );
    return this.getEvent(id);
  }

  // ── PATCH /api/events/:id/reject ──────────────────────
  @patch('/api/events/{id}/reject', {
    responses: {
      '200': {description: 'Event rejected and deleted'},
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
      `SELECT id FROM events WHERE id = $1`,
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');

    // Rejection permanently deletes the event and its moi entries (CASCADE)
    await this.eventRepo.query(`DELETE FROM events WHERE id = $1`, [id]);
    return {success: true, message: `Event ${id} rejected and deleted`};
  }

  // ── DELETE /api/events/:id ─────────────────────────────
  @del('/api/events/{id}', {
    responses: {
      '204': {description: 'Event deleted'},
      '404': {description: 'Not found'},
    },
  })
  async deleteEvent(@param.path.number('id') id: number): Promise<void> {
    const caller = extractCaller(this.request);
    const ownerClause = isAdmin(caller) ? '' : `AND created_by = ${caller?.sub ?? 0}`;
    const existing = await this.eventRepo.query(
      `SELECT id FROM events WHERE id = $1 ${ownerClause}`,
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Event not found');
    await this.eventRepo.query('DELETE FROM events WHERE id = $1', [id]);
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
    const ownerClause = isAdmin(caller) ? '' : `AND created_by = ${caller?.sub ?? 0}`;
    const events = await this.eventRepo.query(
      `SELECT id, event_type, primary_name, secondary_name, event_date::text
       FROM events WHERE id = $1 AND status = 'approved' ${ownerClause}`,
      [id],
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
         COALESCE(SUM(amount) FILTER (WHERE payment_mode = 'online'), 0)::float    AS online_amount
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
    };
  }
}
