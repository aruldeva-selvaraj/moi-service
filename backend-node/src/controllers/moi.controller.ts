import {del, get, param, post, put, requestBody, HttpErrors, RestBindings, Response, Request} from '@loopback/rest';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {MoiEntryRepository, EventRepository} from '../repositories';
import {extractCaller, isAdmin} from '../utils/jwt.utils';

interface MoiBulkDto {
  event_id: number;
  entries: Array<{
    guest_name: string;
    amount: number;
    side?: string;
    payment_mode?: string;
    relationship?: string;
    city?: string;
    district?: string;
    phone?: string;
    received_by?: string;
    notes?: string;
    cheque_number?: string;
    transaction_ref?: string;
    party_size?: number;
  }>;
}

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
  district?: string;
  phone?: string;
  notes?: string;
  received_by?: string;
  party_size?: number;
}

export class MoiController {
  constructor(
    @repository(MoiEntryRepository)
    private moiRepo: MoiEntryRepository,
    @repository(EventRepository)
    private eventRepo: EventRepository,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
    @inject(RestBindings.Http.REQUEST)
    private request: Request,
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
    @param.query.string('city')        city?:        string,
    @param.query.string('district')    district?:    string,
    @param.query.string('date_from')   dateFrom?:    string,
    @param.query.string('date_to')     dateTo?:      string,
    @param.query.string('sort_field')   sortField?:    string,
    @param.query.string('sort_dir')     sortDir?:      string,
    @param.query.number('amount_min')   amountMin?:    number,
    @param.query.number('amount_max')   amountMax?:    number,
    @param.query.string('relationship') relationship?: string,
    @param.query.string('received_by')  receivedBy?:   string,
    @param.query.number('page')         page  = 1,
    @param.query.number('page_size')    pageSize = 20,
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const conditions: string[] = ['m.deleted_at IS NULL'];
    const params: unknown[] = [];
    let pIdx = 1;

    let joinClause: string;
    if (isAdmin(caller)) {
      joinClause = 'FROM moi_entries m LEFT JOIN public.users u2 ON m.created_by = u2.id';
    } else {
      params.push(caller?.sub ?? 0);
      joinClause = `FROM moi_entries m
         INNER JOIN events e ON m.event_id = e.id AND e.created_by = $${pIdx++}
         LEFT JOIN public.users u2 ON m.created_by = u2.id`;
    }

    if (eventId)     { conditions.push(`m.event_id = $${pIdx++}`);               params.push(eventId);           }
    if (side)        { conditions.push(`m.side = $${pIdx++}`);                   params.push(side);              }
    if (paymentMode) { conditions.push(`m.payment_mode = $${pIdx++}`);           params.push(paymentMode);       }
    if (search)       { const n = pIdx++; conditions.push(`(m.guest_name ILIKE $${n} OR m.phone ILIKE $${n} OR m.city ILIKE $${n})`); params.push(`%${search}%`); }
    if (city)         { conditions.push(`m.city ILIKE $${pIdx++}`);              params.push(`%${city}%`);       }
    if (district)     { conditions.push(`m.district ILIKE $${pIdx++}`);          params.push(`%${district}%`);   }
    if (dateFrom)     { conditions.push(`m.created_at >= $${pIdx++}`);           params.push(dateFrom);          }
    if (dateTo)       { conditions.push(`m.created_at <= $${pIdx++}`);           params.push(dateTo);            }
    if (amountMin !== undefined) { conditions.push(`m.amount >= $${pIdx++}`);    params.push(amountMin);         }
    if (amountMax !== undefined) { conditions.push(`m.amount <= $${pIdx++}`);    params.push(amountMax);         }
    if (relationship) { conditions.push(`m.relationship ILIKE $${pIdx++}`);      params.push(`%${relationship}%`); }
    if (receivedBy)   { conditions.push(`m.received_by ILIKE $${pIdx++}`);       params.push(`%${receivedBy}%`); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const SORT_FIELDS = ['guest_name', 'amount', 'created_at', 'payment_mode'];
    const resolvedSortField = SORT_FIELDS.includes(sortField ?? '') ? sortField! : 'created_at';
    const resolvedSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';
    const orderBy = `ORDER BY m.${resolvedSortField} ${resolvedSortDir}`;

    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    pageSize = Math.min(pageSize, 200);

    const countRows = await this.moiRepo.query(
      `SELECT COUNT(*)::int AS total ${joinClause} ${where}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const items = await this.moiRepo.query(
      `SELECT m.*, u2.username AS created_by_username ${joinClause} ${where}
       ${orderBy}
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
  @get('/api/moi/summary', {
    responses: {'200': {description: 'Moi summary stats'}},
  })
  async getSummary(
    @param.query.number('event_id') eventId?: number,
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    const userId = caller?.sub;

    let rows: Record<string, unknown>[];

    if (eventId) {
      let ownerClause: string;
      let summaryParams: unknown[];
      if (admin) {
        ownerClause = '';
        summaryParams = [eventId];
      } else {
        ownerClause = `AND e.created_by = $2`;
        summaryParams = [eventId, userId ?? 0];
      }
      rows = await this.moiRepo.query(
        `SELECT
           1::int AS total_events,
           COUNT(m.*)::int AS total_moi_entries,
           COALESCE(SUM(m.amount), 0)::float AS total_amount,
           COALESCE(AVG(m.amount), 0)::float AS avg_amount
         FROM moi_entries m
         INNER JOIN events e ON m.event_id = e.id
         WHERE m.event_id = $1 AND m.deleted_at IS NULL ${ownerClause}`,
        summaryParams,
      );
    } else if (admin) {
      rows = await this.moiRepo.query(
        `SELECT
           (SELECT COUNT(*)::int FROM events) AS total_events,
           COUNT(*)::int AS total_moi_entries,
           COALESCE(SUM(amount), 0)::float AS total_amount,
           COALESCE(AVG(amount), 0)::float AS avg_amount
         FROM moi_entries
         WHERE deleted_at IS NULL`,
        [],
      );
    } else {
      rows = await this.moiRepo.query(
        `SELECT
           (SELECT COUNT(*)::int FROM events WHERE created_by = $1) AS total_events,
           COUNT(m.*)::int AS total_moi_entries,
           COALESCE(SUM(m.amount), 0)::float AS total_amount,
           COALESCE(AVG(m.amount), 0)::float AS avg_amount
         FROM moi_entries m
         INNER JOIN events e ON m.event_id = e.id
         WHERE e.created_by = $1 AND m.deleted_at IS NULL`,
        [userId ?? 0],
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
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    const userId = caller?.sub;

    const conditions: string[] = ['m.deleted_at IS NULL'];
    const params: unknown[] = [];
    let pIdx = 1;

    let joinClause: string;
    if (admin) {
      joinClause = '';
    } else {
      params.push(userId ?? 0);
      joinClause = `INNER JOIN events e ON m.event_id = e.id AND e.created_by = $${pIdx++}`;
    }

    if (eventId) { conditions.push(`m.event_id = $${pIdx++}`); params.push(eventId); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    return this.moiRepo.query(
      `SELECT
         COALESCE(m.relationship, 'Other') AS relationship,
         COUNT(*)::int                     AS count,
         COALESCE(SUM(m.amount), 0)::float AS total_amount,
         COALESCE(AVG(m.amount), 0)::float AS avg_amount
       FROM moi_entries m ${joinClause} ${where}
       GROUP BY m.relationship
       ORDER BY total_amount DESC`,
      params,
    );
  }

  // ── GET /api/moi/by-received-by ───────────────────────
  @get('/api/moi/by-received-by', {
    responses: {'200': {description: 'Moi grouped by received_by'}},
  })
  async getByReceivedBy(
    @param.query.number('event_id') eventId?: number,
  ): Promise<object[]> {
    const caller = extractCaller(this.request);
    if (eventId === undefined) throw new HttpErrors.BadRequest('event_id is required');
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    const userId = caller?.sub;
    let joinClause = '';
    let queryParams: unknown[] = [eventId];
    if (!admin) {
      joinClause = 'INNER JOIN events e ON moi_entries.event_id = e.id AND e.created_by = $2';
      queryParams = [eventId, userId ?? 0];
    }
    return this.moiRepo.query(
      `SELECT received_by, COUNT(*)::int AS count, SUM(amount)::float AS total_amount
       FROM moi_entries ${joinClause}
       WHERE moi_entries.event_id=$1 AND moi_entries.received_by IS NOT NULL AND moi_entries.received_by != ''
         AND moi_entries.deleted_at IS NULL
       GROUP BY received_by
       ORDER BY total_amount DESC`,
      queryParams,
    );
  }

  // ── GET /api/moi/top-donors ───────────────────────────
  @get('/api/moi/top-donors', {
    responses: {'200': {description: 'Top donors by amount'}},
  })
  async getTopDonors(
    @param.query.number('event_id') eventId?: number,
    @param.query.number('limit')    limit = 5,
  ): Promise<object[]> {
    const caller = extractCaller(this.request);
    if (eventId === undefined) throw new HttpErrors.BadRequest('event_id is required');
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    const userId = caller?.sub;
    let joinClause: string;
    let queryParams: unknown[];
    let limitParam: string;
    if (admin) {
      joinClause = '';
      queryParams = [eventId, limit];
      limitParam = '$2';
    } else {
      joinClause = 'INNER JOIN events e ON m.event_id = e.id AND e.created_by = $2';
      queryParams = [eventId, userId ?? 0, limit];
      limitParam = '$3';
    }
    return this.moiRepo.query(
      `SELECT m.* FROM moi_entries m ${joinClause} WHERE m.event_id=$1 AND m.deleted_at IS NULL ORDER BY m.amount DESC LIMIT ${limitParam}`,
      queryParams,
    );
  }

  // ── GET /api/moi/by-hour ──────────────────────────────
  @get('/api/moi/by-hour', {
    responses: {'200': {description: 'Moi entries grouped by hour'}},
  })
  async getByHour(
    @param.query.number('event_id') eventId?: number,
  ): Promise<object[]> {
    const caller = extractCaller(this.request);
    if (eventId === undefined) throw new HttpErrors.BadRequest('event_id is required');
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    const userId = caller?.sub;
    let joinClause: string;
    let queryParams: unknown[];
    if (admin) {
      joinClause = '';
      queryParams = [eventId];
    } else {
      joinClause = 'INNER JOIN events e ON moi_entries.event_id = e.id AND e.created_by = $2';
      queryParams = [eventId, userId ?? 0];
    }
    return this.moiRepo.query(
      `SELECT date_trunc('hour', moi_entries.created_at) AS hour, COUNT(*)::int AS count, SUM(moi_entries.amount)::float AS total_amount
       FROM moi_entries ${joinClause}
       WHERE moi_entries.event_id=$1 AND moi_entries.deleted_at IS NULL
       GROUP BY hour
       ORDER BY hour`,
      queryParams,
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
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    let ownerJoin: string;
    let getMoiParams: unknown[];
    if (admin) {
      ownerJoin = '';
      getMoiParams = [id];
    } else {
      ownerJoin = `INNER JOIN events e ON m.event_id = e.id AND e.created_by = $2`;
      getMoiParams = [id, caller?.sub ?? 0];
    }
    const rows = await this.moiRepo.query(
      `SELECT m.* FROM moi_entries m ${ownerJoin} WHERE m.id = $1 AND m.deleted_at IS NULL`,
      getMoiParams,
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
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    let ownerClause: string;
    let eventQueryParams: unknown[];
    if (isAdmin(caller)) {
      ownerClause = `WHERE id = $1`;
      eventQueryParams = [data.event_id];
    } else {
      ownerClause = `WHERE id = $1 AND created_by = $2`;
      eventQueryParams = [data.event_id, caller?.sub ?? 0];
    }
    const event = await this.eventRepo.query(
      `SELECT id, status FROM events ${ownerClause}`,
      eventQueryParams,
    );
    if (!event.length)
      throw new HttpErrors.NotFound(`Event ${data.event_id} not found or not approved`);
    if (event[0].status === 'completed') {
      throw new HttpErrors.BadRequest('This event is completed and no longer accepting entries');
    }
    if (event[0].status !== 'approved')
      throw new HttpErrors.UnprocessableEntity('Event is not approved for entries');

    const now = new Date();
    const result = await this.moiRepo.query(
      `INSERT INTO moi_entries
         (event_id, guest_name, relationship, side, amount, payment_mode,
          cheque_number, transaction_ref, city, district, phone, notes, received_by,
          party_size, created_at, updated_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        data.event_id,
        data.guest_name,
        data.relationship    ?? null,
        data.side            ?? 'groom',
        data.amount,
        data.payment_mode    ?? 'cash',
        data.cheque_number   ?? null,
        data.transaction_ref ?? null,
        data.city            ?? null,
        data.district        ?? null,
        data.phone           ?? null,
        data.notes           ?? null,
        data.received_by     ?? null,
        data.party_size      ?? null,
        now,
        now,
        caller?.sub          ?? null,
      ],
    );

    const created = result[0];
    await this.moiRepo.query(
      `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,new_value)
       VALUES($1,$2,$3,'moi_entry',$4,$5)`,
      [
        caller?.sub ?? null,
        caller?.username ?? null,
        'CREATE',
        created.id,
        JSON.stringify(created),
      ],
    );

    this.response.status(201);
    return created;
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
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    let ownerJoin: string;
    let checkParams: unknown[];
    if (admin) {
      ownerJoin = '';
      checkParams = [id];
    } else {
      ownerJoin = `INNER JOIN events e ON m.event_id = e.id AND e.created_by = $2`;
      checkParams = [id, caller?.sub ?? 0];
    }
    const existing = await this.moiRepo.query(
      `SELECT m.id FROM moi_entries m ${ownerJoin} WHERE m.id = $1 AND m.deleted_at IS NULL`,
      checkParams,
    );
    if (!existing.length) throw new HttpErrors.NotFound('Moi entry not found');

    const ALLOWED_MOI_FIELDS = [
      'guest_name', 'relationship', 'side', 'amount', 'payment_mode',
      'cheque_number', 'transaction_ref', 'city', 'district', 'phone',
      'notes', 'received_by', 'party_size',
    ];
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k, v]) => v !== undefined && ALLOWED_MOI_FIELDS.includes(k)),
    );
    const fields = Object.entries(filtered);
    if (!fields.length) return this.getMoi(id);

    const setClauses = fields.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    const values: unknown[] = fields.map(([, v]) => v);
    const updIdx = fields.length + 1;
    const idIdx  = fields.length + 2;
    values.push(new Date());
    values.push(id);

    const result = await this.moiRepo.query(
      `UPDATE moi_entries SET ${setClauses}, updated_at = $${updIdx} WHERE id = $${idIdx} RETURNING id`,
      values,
    );
    if (!result.length) throw new HttpErrors.NotFound('Moi entry not found');

    const updated = await this.getMoi(id);
    await this.moiRepo.query(
      `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,new_value)
       VALUES($1,$2,$3,'moi_entry',$4,$5)`,
      [
        caller?.sub ?? null,
        caller?.username ?? null,
        'UPDATE',
        id,
        JSON.stringify(updated),
      ],
    );

    return updated;
  }

  // ── GET /api/moi/by-city ──────────────────────────────
  @get('/api/moi/by-city', {
    responses: {'200': {description: 'Moi grouped by city'}},
  })
  async getByCity(
    @param.query.number('event_id') eventId?: number,
  ): Promise<object[]> {
    const caller = extractCaller(this.request);
    if (eventId === undefined) throw new HttpErrors.BadRequest('event_id is required');
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    const userId = caller?.sub;
    let joinClause: string;
    let queryParams: unknown[];
    if (admin) {
      joinClause = '';
      queryParams = [eventId];
    } else {
      joinClause = `INNER JOIN events e ON moi_entries.event_id = e.id AND e.created_by = $2`;
      queryParams = [eventId, userId ?? 0];
    }
    return this.moiRepo.query(
      `SELECT city, COUNT(*)::int AS count, SUM(amount)::float AS total_amount
       FROM moi_entries ${joinClause}
       WHERE moi_entries.event_id = $1 AND moi_entries.city IS NOT NULL AND moi_entries.city != ''
         AND moi_entries.deleted_at IS NULL
       GROUP BY city
       ORDER BY total_amount DESC
       LIMIT 20`,
      queryParams,
    );
  }

  // ── GET /api/moi/by-district ───────────────────────────
  @get('/api/moi/by-district', {
    responses: {'200': {description: 'Moi grouped by district'}},
  })
  async getByDistrict(
    @param.query.number('event_id') eventId?: number,
  ): Promise<object[]> {
    const caller = extractCaller(this.request);
    if (eventId === undefined) throw new HttpErrors.BadRequest('event_id is required');
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    const userId = caller?.sub;
    let joinClause: string;
    let queryParams: unknown[];
    if (admin) {
      joinClause = '';
      queryParams = [eventId];
    } else {
      joinClause = `INNER JOIN events e ON moi_entries.event_id = e.id AND e.created_by = $2`;
      queryParams = [eventId, userId ?? 0];
    }
    return this.moiRepo.query(
      `SELECT district, COUNT(*)::int AS count, SUM(amount)::float AS total_amount
       FROM moi_entries ${joinClause}
       WHERE moi_entries.event_id = $1 AND moi_entries.district IS NOT NULL AND moi_entries.district != ''
         AND moi_entries.deleted_at IS NULL
       GROUP BY district
       ORDER BY total_amount DESC
       LIMIT 20`,
      queryParams,
    );
  }

  // ── DELETE /api/moi/:id ────────────────────────────────
  @del('/api/moi/{id}', {
    responses: {
      '204': {description: 'Moi entry deleted'},
      '404': {description: 'Not found'},
    },
  })
  async deleteMoi(@param.path.number('id') id: number): Promise<void> {
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    const admin = isAdmin(caller);
    let ownerJoin: string;
    let deleteCheckParams: unknown[];
    if (admin) {
      ownerJoin = '';
      deleteCheckParams = [id];
    } else {
      ownerJoin = `INNER JOIN events e ON m.event_id = e.id AND e.created_by = $2`;
      deleteCheckParams = [id, caller?.sub ?? 0];
    }
    const existing = await this.moiRepo.query(
      `SELECT m.id FROM moi_entries m ${ownerJoin} WHERE m.id = $1 AND m.deleted_at IS NULL`,
      deleteCheckParams,
    );
    if (!existing.length) throw new HttpErrors.NotFound('Moi entry not found');

    const result = await this.moiRepo.query(
      `UPDATE public.moi_entries SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    );
    if (!result.length) throw new HttpErrors.NotFound('Moi entry not found');

    await this.moiRepo.query(
      `INSERT INTO public.audit_log(actor_id,actor_username,action,entity_type,entity_id,new_value)
       VALUES($1,$2,$3,'moi_entry',$4,$5)`,
      [
        caller?.sub ?? null,
        caller?.username ?? null,
        'DELETE',
        id,
        null,
      ],
    );

    this.response.status(204);
  }

  // ── POST /api/moi/bulk ────────────────────────────────
  @post('/api/moi/bulk', {
    responses: {
      '200': {description: 'Bulk moi entries result'},
      '404': {description: 'Event not found'},
    },
  })
  async bulkCreateMoi(
    @requestBody({content: {'application/json': {schema: {type: 'object'}}}})
    data: MoiBulkDto,
  ): Promise<object> {
    const caller = extractCaller(this.request);
    if (!caller) throw new HttpErrors.Unauthorized('Authentication required');
    if (!data?.event_id) throw new HttpErrors.UnprocessableEntity('event_id is required');
    let ownerClause: string;
    let eventQueryParams: unknown[];
    if (isAdmin(caller)) {
      ownerClause = `WHERE id = $1 AND status = 'approved'`;
      eventQueryParams = [data.event_id];
    } else {
      ownerClause = `WHERE id = $1 AND status = 'approved' AND created_by = $2`;
      eventQueryParams = [data.event_id, caller?.sub ?? 0];
    }
    const event = await this.eventRepo.query(
      `SELECT id FROM events ${ownerClause}`,
      eventQueryParams,
    );
    if (!event.length)
      throw new HttpErrors.NotFound(`Event ${data.event_id} not found or not approved`);

    if (!Array.isArray(data?.entries) || !data.entries.length) throw new HttpErrors.UnprocessableEntity('entries must be a non-empty array');

    let created = 0;
    const errors: Array<{row: number; message: string}> = [];
    const now = new Date();

    await this.moiRepo.query('BEGIN');
    try {
      for (let i = 0; i < data.entries.length; i++) {
        const e = data.entries[i];
        if (!e.guest_name || e.amount == null) {
          errors.push({row: i + 1, message: 'guest_name and amount are required'});
          continue;
        }
        const entry = data.entries[i];
        await this.moiRepo.query(
          `INSERT INTO moi_entries
             (event_id, guest_name, relationship, side, amount, payment_mode,
              cheque_number, transaction_ref, city, district, phone, notes, received_by,
              party_size, created_at, updated_at, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [
            data.event_id,
            entry.guest_name,
            entry.relationship    ?? null,
            entry.side            ?? 'groom',
            entry.amount,
            entry.payment_mode    ?? 'cash',
            entry.cheque_number   ?? null,
            entry.transaction_ref ?? null,
            entry.city            ?? null,
            entry.district        ?? null,
            entry.phone           ?? null,
            entry.notes           ?? null,
            entry.received_by     ?? null,
            entry.party_size      ?? null,
            now,
            now,
            caller?.sub           ?? null,
          ],
        );
        created++;
      }
      await this.moiRepo.query('COMMIT');
    } catch (e) {
      await this.moiRepo.query('ROLLBACK');
      throw e;
    }

    return {created, errors};
  }
}
