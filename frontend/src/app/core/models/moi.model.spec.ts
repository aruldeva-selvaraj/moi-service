import { describe, it, expect } from 'vitest';
import type {
  MoiEntry, MoiEntryCreate, PaginatedMoiResponse,
  SummaryStats, RelationshipReport, GeoBreakdownItem, MoiFilter,
} from './moi.model';

describe('MoiEntry interface', () => {
  it('can construct a full MoiEntry object', () => {
    const entry: MoiEntry = {
      id: 1,
      event_id: 10,
      guest_name: 'Rajan',
      relationship: 'Uncle',
      side: 'groom',
      amount: 5000,
      payment_mode: 'cash',
      cheque_number: undefined,
      transaction_ref: undefined,
      city: 'Chennai',
      district: 'Chennai',
      phone: '9876543210',
      notes: 'Late arrival',
      received_by: 'Kumar',
      receipt_no: 42,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by_username: 'admin',
    };
    expect(entry.id).toBe(1);
    expect(entry.side).toBe('groom');
    expect(entry.payment_mode).toBe('cash');
    expect(entry.receipt_no).toBe(42);
  });

  it('allows optional fields to be absent', () => {
    const entry: MoiEntry = {
      id: 2,
      event_id: 3,
      guest_name: 'Meena',
      side: 'bride',
      amount: 1000,
      payment_mode: 'online',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    expect(entry.relationship).toBeUndefined();
    expect(entry.city).toBeUndefined();
    expect(entry.receipt_no).toBeUndefined();
  });

  it('supports "both" side value', () => {
    const entry: MoiEntry = {
      id: 3,
      event_id: 5,
      guest_name: 'Vel',
      side: 'both',
      amount: 2000,
      payment_mode: 'cheque',
      cheque_number: 'CHQ123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    expect(entry.side).toBe('both');
    expect(entry.cheque_number).toBe('CHQ123');
  });

  it('supports "dd" payment mode', () => {
    const entry: MoiEntry = {
      id: 4,
      event_id: 6,
      guest_name: 'Mani',
      side: 'groom',
      amount: 10000,
      payment_mode: 'dd',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    expect(entry.payment_mode).toBe('dd');
  });
});

describe('MoiEntryCreate interface', () => {
  it('can construct a minimal create payload', () => {
    const payload: MoiEntryCreate = {
      event_id: 1,
      guest_name: 'Guest',
      side: 'bride',
      amount: 500,
      payment_mode: 'cash',
    };
    expect(payload.event_id).toBe(1);
    expect(payload.payment_mode).toBe('cash');
  });
});

describe('PaginatedMoiResponse interface', () => {
  it('can construct a paginated response', () => {
    const resp: PaginatedMoiResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    };
    expect(resp.total_pages).toBe(0);
    expect(resp.items).toHaveLength(0);
  });
});

describe('SummaryStats interface', () => {
  it('can construct summary stats', () => {
    const stats: SummaryStats = {
      total_events: 5,
      total_moi_entries: 100,
      total_amount: 50000,
      avg_amount: 500,
    };
    expect(stats.avg_amount).toBe(500);
  });
});

describe('RelationshipReport interface', () => {
  it('can construct a relationship report', () => {
    const report: RelationshipReport = {
      relationship: 'Uncle',
      count: 10,
      total_amount: 5000,
      avg_amount: 500,
    };
    expect(report.relationship).toBe('Uncle');
    expect(report.avg_amount).toBe(500);
  });
});

describe('GeoBreakdownItem interface', () => {
  it('can construct a geo breakdown with city', () => {
    const item: GeoBreakdownItem = {
      city: 'Chennai',
      count: 20,
      total_amount: 10000,
    };
    expect(item.city).toBe('Chennai');
    expect(item.district).toBeUndefined();
  });

  it('can construct a geo breakdown with district', () => {
    const item: GeoBreakdownItem = {
      district: 'Coimbatore',
      count: 5,
      total_amount: 2500,
    };
    expect(item.district).toBe('Coimbatore');
  });
});

describe('MoiFilter interface', () => {
  it('can construct a minimal filter', () => {
    const filter: MoiFilter = { page: 1, page_size: 20 };
    expect(filter.page).toBe(1);
    expect(filter.search).toBeUndefined();
  });

  it('can construct a full filter', () => {
    const filter: MoiFilter = {
      search: 'Rajan',
      side: 'groom',
      payment_mode: 'cash',
      event_id: 1,
      page: 1,
      page_size: 50,
      city: 'Chennai',
      district: 'Chennai',
      date_from: '2024-01-01',
      date_to: '2024-12-31',
      sort_field: 'amount',
      sort_dir: 'desc',
      amount_min: 100,
      amount_max: 50000,
      relationship: 'Uncle',
      received_by: 'Kumar',
    };
    expect(filter.sort_dir).toBe('desc');
    expect(filter.amount_min).toBe(100);
  });
});
