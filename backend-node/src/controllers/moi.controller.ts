import {del, get, param, post, put, requestBody, HttpErrors, RestBindings, Response} from '@loopback/rest';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {MoiEntryRepository, EventRepository} from '../repositories';

interface MoiCreateDto {
  event_id: number;
  guest_name: string;
  relationship?: string;
  side?: string;
  amount: number;
  payment_mode?: string;
  cheque_number?: string;
  transaction_ref?: string;
  city?: string;
  phone?: string;
  notes?: string;
  received_by?: string;
}

export class MoiController {
  constructor(
    @repository(MoiEntryRepository)
    private moiRepo: MoiEntryRepository,
    @repository(EventRepository)
    private eventRepo: EventRepository,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
  ) {}

  // ── GET /api/moi ───────────────────────────────────────
  @get('/api/moi', {
    responses: {'200': {description: 'Paginated moi entries'}},
  })
  async listMoi(
    @param.query.number('event_id')    eventId?:     number,
    @param.query.string('side')        side?:        string,
    @param.query.string('payment_mode') paymentMode?: string,
    @param.query.string('search')      search?:      string,
    @param.query.number('page')        page  = 1,
    @param.query.number('page_size')   pageSize = 20,
  ): Promise<object> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (eventId)     { conditions.push(`event_id = $${pIdx++}`);           params.push(eventId);           }
    if (side)        { conditions.push(`side = $${pIdx++}`);               params.push(side);              }
    if (paymentMode) { conditions.push(`payment_mode = $${pIdx++}`);       params.push(paymentMode);       }
    if (search)      { conditions.push(`guest_name ILIKE $${pIdx++}`);     params.push(`%${search}%`);     }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.moiRepo.query(
      `SELECT COUNT(*)::int AS total FROM moi_entries ${where}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const items = await this.moiRepo.query(
      `SELECT * FROM moi_entries ${where}
       ORDER BY created_at DESC
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      dataParams,
    );

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  }

  // ── GET /api/moi/summary ───────────────────────────────
  // Must be defined BEFORE /:id to avoid route conflict
  @get('/api/moi/summary', {
    responses: {'200': {description: 'Moi summary stats'}},
  })
  async getSummary(
    @param.query.number('event_id') eventId?: number,
  ): Promise<object> {
    let rows: Record<string, unknown>[];
    if (eventId) {
      rows = await this.moiRepo.query(
        `SELECT
           1::int AS total_events,
           COUNT(*)::int AS total_moi_entries,
           COALESCE(SUM(amount), 0)::float AS total_amount,
           COALESCE(AVG(amount), 0)::float AS avg_amount
         FROM moi_entries WHERE event_id = $1`,
        [eventId],
      );
    } else {
      rows = await this.moiRepo.query(
        `SELECT
           (SELECT COUNT(*)::int FROM events) AS total_events,
           COUNT(*)::int AS total_moi_entries,
           COALESCE(SUM(amount), 0)::float AS total_amount,
           COALESCE(AVG(amount), 0)::float AS avg_amount
         FROM moi_entries`,
        [],
      );
    }
    return rows[0] ?? {total_events: 0, total_moi_entries: 0, total_amount: 0, avg_amount: 0};
  }

  // ── GET /api/moi/by-relationship ───────────────────────
  @get('/api/moi/by-relationship', {
    responses: {'200': {description: 'Moi grouped by relationship'}},
  })
  async getByRelationship(
    @param.query.number('event_id') eventId?: number,
  ): Promise<object[]> {
    const where = eventId ? 'WHERE event_id = $1' : '';
    const params = eventId ? [eventId] : [];
    return this.moiRepo.query(
      `SELECT
         COALESCE(relationship, 'Other') AS relationship,
         COUNT(*)::int                   AS count,
         COALESCE(SUM(amount), 0)::float AS total_amount,
         COALESCE(AVG(amount), 0)::float AS avg_amount
       FROM moi_entries ${where}
       GROUP BY relationship
       ORDER BY total_amount DESC`,
      params,
    );
  }

  // ── GET /api/moi/:id ───────────────────────────────────
  @get('/api/moi/{id}', {
    responses: {
      '200': {description: 'Moi entry by id'},
      '404': {description: 'Not found'},
    },
  })
  async getMoi(@param.path.number('id') id: number): Promise<object> {
    const rows = await this.moiRepo.query(
      'SELECT * FROM moi_entries WHERE id = $1',
      [id],
    );
    if (!rows.length) throw new HttpErrors.NotFound('Moi entry not found');
    return rows[0];
  }

  // ── POST /api/moi ──────────────────────────────────────
  @post('/api/moi', {
    responses: {
      '201': {description: 'Moi entry created'},
      '404': {description: 'Event not found'},
    },
  })
  async createMoi(
    @requestBody({content: {'application/json': {schema: {type: 'object'}}}})
    data: MoiCreateDto,
  ): Promise<object> {
    const event = await this.eventRepo.query(
      'SELECT id FROM events WHERE id = $1',
      [data.event_id],
    );
    if (!event.length)
      throw new HttpErrors.NotFound(`Event ${data.event_id} not found`);

    const now = new Date();
    const result = await this.moiRepo.query(
      `INSERT INTO moi_entries
         (event_id, guest_name, relationship, side, amount, payment_mode,
          cheque_number, transaction_ref, city, phone, notes, received_by,
          created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        data.event_id,
        data.guest_name,
        data.relationship   ?? null,
        data.side           ?? 'groom',
        data.amount,
        data.payment_mode   ?? 'cash',
        data.cheque_number  ?? null,
        data.transaction_ref ?? null,
        data.city           ?? null,
        data.phone          ?? null,
        data.notes          ?? null,
        data.received_by    ?? null,
        now,
        now,
      ],
    );
    this.response.status(201);
    return result[0];
  }

  // ── PUT /api/moi/:id ───────────────────────────────────
  @put('/api/moi/{id}', {
    responses: {
      '200': {description: 'Moi entry updated'},
      '404': {description: 'Not found'},
    },
  })
  async updateMoi(
    @param.path.number('id') id: number,
    @requestBody({content: {'application/json': {schema: {type: 'object'}}}})
    data: Partial<MoiCreateDto>,
  ): Promise<object> {
    const existing = await this.moiRepo.query(
      'SELECT id FROM moi_entries WHERE id = $1',
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Moi entry not found');

    const fields = Object.entries(data).filter(([, v]) => v !== undefined);
    if (!fields.length) return this.getMoi(id);

    const setClauses = fields.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values: unknown[] = fields.map(([, v]) => v);
    const updIdx = fields.length + 1;
    const idIdx  = fields.length + 2;
    values.push(new Date()); // updated_at
    values.push(id);         // WHERE id

    await this.moiRepo.query(
      `UPDATE moi_entries SET ${setClauses}, updated_at = $${updIdx} WHERE id = $${idIdx}`,
      values,
    );
    return this.getMoi(id);
  }

  // ── DELETE /api/moi/:id ────────────────────────────────
  @del('/api/moi/{id}', {
    responses: {
      '204': {description: 'Moi entry deleted'},
      '404': {description: 'Not found'},
    },
  })
  async deleteMoi(@param.path.number('id') id: number): Promise<void> {
    const existing = await this.moiRepo.query(
      'SELECT id FROM moi_entries WHERE id = $1',
      [id],
    );
    if (!existing.length) throw new HttpErrors.NotFound('Moi entry not found');
    await this.moiRepo.query('DELETE FROM moi_entries WHERE id = $1', [id]);
    this.response.status(204);
  }
}
