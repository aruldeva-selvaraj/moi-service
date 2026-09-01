import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventService } from './event.service';
import { Event, EventCreate, EventReport } from '../models/event.model';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/api/events`;

const mockEvent: Event = {
  id: 1,
  event_type: 'wedding',
  primary_name: 'Ram',
  secondary_name: 'Priya',
  event_date: '2024-06-15',
  total_moi: 100000,
  moi_count: 50,
  status: 'approved',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('EventService', () => {
  let service: EventService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EventService);
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
    it('makes GET request without params when no filters', () => {
      service.getAll().subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.method).toBe('GET');
      req.flush([mockEvent]);
    });

    it('adds search param when filter.search is set', () => {
      service.getAll({ search: 'Ram' }).subscribe();
      const req = httpMock.expectOne(r => r.url === BASE && r.params.get('search') === 'Ram');
      req.flush([]);
    });

    it('adds event_type param', () => {
      service.getAll({ event_type: 'wedding' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('event_type') === 'wedding');
      req.flush([]);
    });

    it('adds status param', () => {
      service.getAll({ status: 'approved' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('status') === 'approved');
      req.flush([]);
    });

    it('adds date_from param', () => {
      service.getAll({ date_from: '2024-01-01' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('date_from') === '2024-01-01');
      req.flush([]);
    });

    it('adds date_to param', () => {
      service.getAll({ date_to: '2024-12-31' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('date_to') === '2024-12-31');
      req.flush([]);
    });

    it('adds sort_field param', () => {
      service.getAll({ sort_field: 'event_date' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('sort_field') === 'event_date');
      req.flush([]);
    });

    it('adds sort_dir param', () => {
      service.getAll({ sort_dir: 'desc' }).subscribe();
      const req = httpMock.expectOne(r => r.params.get('sort_dir') === 'desc');
      req.flush([]);
    });

    it('does not add param when filter value is empty string', () => {
      service.getAll({ search: '' }).subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.params.has('search')).toBe(false);
      req.flush([]);
    });

    it('does not add param when filter value is undefined', () => {
      service.getAll({ search: undefined }).subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.params.has('search')).toBe(false);
      req.flush([]);
    });

    it('returns list of events', () => {
      let result: Event[] = [];
      service.getAll().subscribe(r => result = r);
      httpMock.expectOne(BASE).flush([mockEvent]);
      expect(result).toHaveLength(1);
      expect(result[0].primary_name).toBe('Ram');
    });
  });

  describe('getById()', () => {
    it('makes GET request to correct URL', () => {
      service.getById(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockEvent);
    });

    it('returns event data', () => {
      let result: Event | undefined;
      service.getById(1).subscribe(r => result = r);
      httpMock.expectOne(`${BASE}/1`).flush(mockEvent);
      expect(result?.id).toBe(1);
    });
  });

  describe('create()', () => {
    it('makes POST request with payload', () => {
      const payload: EventCreate = { event_type: 'wedding', primary_name: 'Test', event_date: '2024-01-01' };
      service.create(payload).subscribe();
      const req = httpMock.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.primary_name).toBe('Test');
      req.flush(mockEvent);
    });
  });

  describe('update()', () => {
    it('makes PUT request to correct URL', () => {
      service.update(1, { primary_name: 'Updated' }).subscribe();
      const req = httpMock.expectOne(`${BASE}/1`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockEvent);
    });
  });

  describe('delete()', () => {
    it('makes DELETE request to correct URL', () => {
      service.delete(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getReport()', () => {
    it('makes GET request to report endpoint', () => {
      service.getReport(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1/report`);
      expect(req.request.method).toBe('GET');
      req.flush({} as EventReport);
    });
  });

  describe('approve()', () => {
    it('makes PATCH request to approve endpoint', () => {
      service.approve(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1/approve`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mockEvent);
    });
  });

  describe('reject()', () => {
    it('makes PATCH request to reject endpoint', () => {
      service.reject(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1/reject`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });
    });
  });

  describe('clone()', () => {
    it('makes POST request to clone endpoint', () => {
      service.clone(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1/clone`);
      expect(req.request.method).toBe('POST');
      req.flush(mockEvent);
    });
  });

  describe('complete()', () => {
    it('makes PATCH request to complete endpoint', () => {
      service.complete(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1/complete`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true });
    });
  });
});
