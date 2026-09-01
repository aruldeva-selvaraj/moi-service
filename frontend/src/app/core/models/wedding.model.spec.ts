import { describe, it, expect } from 'vitest';
import type { Wedding, WeddingCreate, WeddingReport } from './wedding.model';

describe('Wedding interface', () => {
  it('can construct a full Wedding object', () => {
    const w: Wedding = {
      id: 1,
      groom_name: 'Ram',
      bride_name: 'Priya',
      family_name: 'Sharma',
      wedding_date: '2024-06-15',
      venue: 'Grand Hall',
      city: 'Chennai',
      notes: 'Evening ceremony',
      total_moi: 100000,
      moi_count: 50,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    expect(w.id).toBe(1);
    expect(w.groom_name).toBe('Ram');
    expect(w.bride_name).toBe('Priya');
    expect(w.total_moi).toBe(100000);
  });

  it('allows optional fields to be absent', () => {
    const w: Wedding = {
      id: 2,
      groom_name: 'Arjun',
      bride_name: 'Meena',
      wedding_date: '2024-07-20',
      total_moi: 50000,
      moi_count: 25,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    expect(w.family_name).toBeUndefined();
    expect(w.venue).toBeUndefined();
    expect(w.notes).toBeUndefined();
  });
});

describe('WeddingCreate interface', () => {
  it('can construct a create payload', () => {
    const payload: WeddingCreate = {
      groom_name: 'Karthik',
      bride_name: 'Divya',
      wedding_date: '2024-08-10',
    };
    expect(payload.groom_name).toBe('Karthik');
    expect(payload.family_name).toBeUndefined();
  });

  it('can include optional fields', () => {
    const payload: WeddingCreate = {
      groom_name: 'Suresh',
      bride_name: 'Lakshmi',
      family_name: 'Pillai',
      wedding_date: '2024-09-01',
      venue: 'Temple Hall',
      city: 'Madurai',
      notes: 'Traditional ceremony',
    };
    expect(payload.city).toBe('Madurai');
    expect(payload.notes).toBe('Traditional ceremony');
  });
});

describe('WeddingReport interface', () => {
  it('can construct a wedding report', () => {
    const report: WeddingReport = {
      wedding_id: 1,
      groom_name: 'Ram',
      bride_name: 'Priya',
      wedding_date: '2024-06-15',
      total_amount: 200000,
      moi_count: 100,
      bride_side_amount: 90000,
      groom_side_amount: 110000,
      cash_amount: 150000,
      cheque_amount: 30000,
      online_amount: 20000,
    };
    expect(report.total_amount).toBe(200000);
    expect(report.bride_side_amount + report.groom_side_amount).toBe(200000);
  });
});
