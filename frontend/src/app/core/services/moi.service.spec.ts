import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MoiService } from './moi.service';
import { MoiEntryCreate, MoiFilter } from '../models/moi.model';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/api/moi`;

const baseFilter: MoiFilter = { page: 1, page_size: 20 };

describe('MoiService', () => {
  let service: MoiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(MoiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll()', () => {
    it('sends page and page_size params', () => {
      service.getAll({ page: 2, page_size: 50 }).subscribe();
      const req = httpMock.expectOne(r =>
        r.url === BASE && r.params.get('page') === '2' && r.params.get('page_size') === '50'
      );
      req.flush({ items: [], total: 0, page: 2, page_size: 50, total_pages: 0 });
    });

    it('adds event_id param when set', () => {
      service.getAll({ ...baseFilter, event_id: 5 }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('event_id') === '5');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds side param when set', () => {
      service.getAll({ ...baseFilter, side: 'groom' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('side') === 'groom');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds payment_mode param', () => {
      service.getAll({ ...baseFilter, payment_mode: 'cash' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('payment_mode') === 'cash');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds search param', () => {
      service.getAll({ ...baseFilter, search: 'Rajan' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('search') === 'Rajan');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds city param', () => {
      service.getAll({ ...baseFilter, city: 'Chennai' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('city') === 'Chennai');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds district param', () => {
      service.getAll({ ...baseFilter, district: 'Coimbatore' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('district') === 'Coimbatore');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds date_from and date_to params', () => {
      service.getAll({ ...baseFilter, date_from: '2024-01-01', date_to: '2024-12-31' }).subscribe();
      const req = httpMock.expectOne(r =>
        r.params.get('date_from') === '2024-01-01' && r.params.get('date_to') === '2024-12-31'
      );
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds sort_field and sort_dir params', () => {
      service.getAll({ ...baseFilter, sort_field: 'amount', sort_dir: 'desc' }).subscribe();
      const req = httpMock.expectOne(r =>
        r.params.get('sort_field') === 'amount' && r.params.get('sort_dir') === 'desc'
      );
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds amount_min and amount_max params', () => {
      service.getAll({ ...baseFilter, amount_min: 100, amount_max: 5000 }).subscribe();
      const req = httpMock.expectOne(r =>
        r.params.get('amount_min') === '100' && r.params.get('amount_max') === '5000'
      );
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds relationship param', () => {
      service.getAll({ ...baseFilter, relationship: 'Uncle' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('relationship') === 'Uncle');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('adds received_by param', () => {
      service.getAll({ ...baseFilter, received_by: 'Kumar' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('received_by') === 'Kumar');
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });

    it('does not add amount params when null', () => {
      service.getAll({ ...baseFilter, amount_min: null, amount_max: null }).subscribe();
      const req = httpMock.expectOne(r => r.url === BASE);
      expect(req.request.params.has('amount_min')).toBe(false);
      req.flush({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
    });
  });

  describe('getById()', () => {
    it('makes GET to correct URL', () => {
      service.getById(42).subscribe();
      const req = httpMock.expectOne(`${BASE}/42`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('create()', () => {
    it('makes POST with payload', () => {
      const payload: MoiEntryCreate = { event_id: 1, guest_name: 'Rajan', side: 'groom', amount: 1000, payment_mode: 'cash' };
      service.create(payload).subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.guest_name).toBe('Rajan');
      req.flush({});
    });
  });

  describe('update()', () => {
    it('POSTs to /update endpoint with id', () => {
      service.update(5, { amount: 2000 }).subscribe();
      const req = httpMock.expectOne(`${BASE}/update`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.id).toBe(5);
      expect(req.request.body.amount).toBe(2000);
      req.flush({});
    });
  });

  describe('delete()', () => {
    it('POSTs to /delete endpoint with id', () => {
      service.delete(7).subscribe();
      const req = httpMock.expectOne(`${BASE}/delete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.id).toBe(7);
      req.flush({ success: true });
    });
  });

  describe('getSummary()', () => {
    it('makes GET to /summary without eventId', () => {
      service.getSummary().subscribe();
      const req = httpMock.expectOne(`${BASE}/summary`);
      expect(req.request.params.has('event_id')).toBe(false);
      req.flush({});
    });

    it('makes GET to /summary with eventId', () => {
      service.getSummary(3).subscribe();
      const req = httpMock.expectOne(r => r.url === `${BASE}/summary` && r.params.get('event_id') === '3');
      req.flush({});
    });
  });

  describe('getByRelationship()', () => {
    it('makes GET to /by-relationship without eventId', () => {
      service.getByRelationship().subscribe();
      const req = httpMock.expectOne(`${BASE}/by-relationship`);
      req.flush([]);
    });

    it('makes GET to /by-relationship with eventId', () => {
      service.getByRelationship(2).subscribe();
      const req = httpMock.expectOne(r => r.params.get('event_id') === '2');
      req.flush([]);
    });
  });

  describe('bulkCreate()', () => {
    it('POSTs to /bulk endpoint', () => {
      service.bulkCreate({ event_id: 1, entries: [{ guest_name: 'A' }] }).subscribe();
      const req = httpMock.expectOne(`${BASE}/bulk`);
      expect(req.request.method).toBe('POST');
      req.flush({ created: 1, errors: [] });
    });
  });

  describe('getByReceivedBy()', () => {
    it('makes GET to /by-received-by with eventId', () => {
      service.getByReceivedBy(4).subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${BASE}/by-received-by` && r.params.get('event_id') === '4'
      );
      req.flush([]);
    });
  });

  describe('getTopDonors()', () => {
    it('makes GET with eventId and default limit', () => {
      service.getTopDonors(1).subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${BASE}/top-donors` &&
        r.params.get('event_id') === '1' &&
        r.params.get('limit') === '5'
      );
      req.flush([]);
    });

    it('makes GET with custom limit', () => {
      service.getTopDonors(1, 10).subscribe();
      const req = httpMock.expectOne(r => r.params.get('limit') === '10');
      req.flush([]);
    });
  });

  describe('getByHour()', () => {
    it('makes GET to /by-hour with eventId', () => {
      service.getByHour(1).subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${BASE}/by-hour` && r.params.get('event_id') === '1'
      );
      req.flush([]);
    });
  });

  describe('getByCityBreakdown()', () => {
    it('makes GET to /by-city without eventId', () => {
      service.getByCityBreakdown().subscribe();
      const req = httpMock.expectOne(`${BASE}/by-city`);
      req.flush([]);
    });

    it('makes GET to /by-city with eventId', () => {
      service.getByCityBreakdown(5).subscribe();
      const req = httpMock.expectOne(r => r.params.get('event_id') === '5');
      req.flush([]);
    });
  });

  describe('getByDistrictBreakdown()', () => {
    it('makes GET to /by-district without eventId', () => {
      service.getByDistrictBreakdown().subscribe();
      const req = httpMock.expectOne(`${BASE}/by-district`);
      req.flush([]);
    });

    it('makes GET to /by-district with eventId', () => {
      service.getByDistrictBreakdown(6).subscribe();
      const req = httpMock.expectOne(r => r.params.get('event_id') === '6');
      req.flush([]);
    });
  });
});
