import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WeddingService } from './wedding.service';
import { Wedding, WeddingCreate } from '../models/wedding.model';
import { environment } from '../../environments/environment';

const BASE = `${environment.apiUrl}/api/weddings`;

const mockWedding: Wedding = {
  id: 1,
  groom_name: 'Ram',
  bride_name: 'Priya',
  wedding_date: '2024-06-15',
  total_moi: 100000,
  moi_count: 50,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('WeddingService', () => {
  let service: WeddingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(WeddingService);
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
    it('makes GET request to correct URL', () => {
      service.getAll().subscribe();
      const req = httpMock.expectOne(`${BASE}/`);
      expect(req.request.method).toBe('GET');
      req.flush([mockWedding]);
    });

    it('returns list of weddings', () => {
      let result: Wedding[] = [];
      service.getAll().subscribe(r => result = r);
      httpMock.expectOne(`${BASE}/`).flush([mockWedding]);
      expect(result).toHaveLength(1);
      expect(result[0].groom_name).toBe('Ram');
    });
  });

  describe('getById()', () => {
    it('makes GET request to correct URL', () => {
      service.getById(1).subscribe();
      const req = httpMock.expectOne(`${BASE}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockWedding);
    });
  });

  describe('create()', () => {
    it('makes POST request with payload', () => {
      const payload: WeddingCreate = { groom_name: 'Suresh', bride_name: 'Meena', wedding_date: '2024-08-01' };
      service.create(payload).subscribe();
      const req = httpMock.expectOne(`${BASE}/`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.groom_name).toBe('Suresh');
      req.flush(mockWedding);
    });
  });

  describe('update()', () => {
    it('makes PUT request to correct URL', () => {
      service.update(1, { groom_name: 'Updated' }).subscribe();
      const req = httpMock.expectOne(`${BASE}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.groom_name).toBe('Updated');
      req.flush(mockWedding);
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
      req.flush({});
    });
  });
});
