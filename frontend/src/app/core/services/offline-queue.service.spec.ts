import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OfflineQueueService } from './offline-queue.service';

// Minimal IDBDatabase / indexedDB mock
function makeIdbMock() {
  const store: any[] = [];
  let nextId = 1;

  const objectStore = {
    add: vi.fn((item: any) => {
      const newItem = { ...item, id: nextId++ };
      store.push(newItem);
      const req: any = { onsuccess: null };
      setTimeout(() => req.onsuccess?.());
      return req;
    }),
    getAll: vi.fn(() => {
      const req: any = { result: [...store], onsuccess: null, onerror: null };
      setTimeout(() => req.onsuccess?.());
      return req;
    }),
    delete: vi.fn((id: number) => {
      const idx = store.findIndex(i => i.id === id);
      if (idx > -1) store.splice(idx, 1);
      const req: any = { onsuccess: null };
      setTimeout(() => req.onsuccess?.());
      return req;
    }),
  };

  const tx: any = {
    objectStore: vi.fn(() => objectStore),
    onerror: null,
  };

  const db: any = {
    transaction: vi.fn(() => tx),
    objectStoreNames: { contains: vi.fn(() => false) },
    createObjectStore: vi.fn(),
  };

  return { db, store, objectStore, tx };
}

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(OfflineQueueService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  describe('init()', () => {
    it('opens the IndexedDB database', async () => {
      const { db } = makeIdbMock();
      const openReq: any = { onupgradeneeded: null, onsuccess: null, onerror: null };
      const idbOpen = vi.fn(() => openReq);
      (globalThis as any).indexedDB = { open: idbOpen };

      const promise = service.init();
      openReq.onsuccess?.({ target: { result: db } });
      await promise;

      expect(idbOpen).toHaveBeenCalledWith('moify_offline', 1);
    });

    it('rejects on indexedDB error', async () => {
      const openReq: any = { onupgradeneeded: null, onsuccess: null, onerror: null, error: new Error('fail') };
      (globalThis as any).indexedDB = { open: () => openReq };

      const promise = service.init();
      openReq.onerror?.();
      await expect(promise).rejects.toEqual(new Error('fail'));
    });

    it('creates object store on upgradeneeded when store not exists', async () => {
      const { db } = makeIdbMock();
      db.objectStoreNames.contains.mockReturnValue(false);
      const openReq: any = { onupgradeneeded: null, onsuccess: null, onerror: null };
      (globalThis as any).indexedDB = { open: () => openReq };

      const promise = service.init();
      openReq.onupgradeneeded?.({ target: { result: db } });
      openReq.onsuccess?.({ target: { result: db } });
      await promise;

      expect(db.createObjectStore).toHaveBeenCalledWith('moi_queue', { keyPath: 'id', autoIncrement: true });
    });

    it('skips createObjectStore when store already exists', async () => {
      const { db } = makeIdbMock();
      db.objectStoreNames.contains.mockReturnValue(true);
      const openReq: any = { onupgradeneeded: null, onsuccess: null, onerror: null };
      (globalThis as any).indexedDB = { open: () => openReq };

      const promise = service.init();
      openReq.onupgradeneeded?.({ target: { result: db } });
      openReq.onsuccess?.({ target: { result: db } });
      await promise;

      expect(db.createObjectStore).not.toHaveBeenCalled();
    });
  });

  describe('enqueue()', () => {
    it('adds item to store with queuedAt and retries', async () => {
      const { db, objectStore } = makeIdbMock();
      service['db'] = db;

      await service.enqueue({ eventId: 1, data: { guest_name: 'Rajan' } });

      expect(objectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: 1, retries: 0 })
      );
    });
  });

  describe('getAll()', () => {
    it('returns items from store', async () => {
      const { db, objectStore } = makeIdbMock();
      objectStore.getAll.mockReturnValue({
        result: [{ id: 1, eventId: 1, data: {}, queuedAt: 0, retries: 0 }],
        onsuccess: null,
        onerror: null,
      });
      // Make onsuccess fire synchronously for test
      const origGetAll = objectStore.getAll;
      objectStore.getAll.mockImplementation(() => {
        const req: any = {
          result: [{ id: 1, eventId: 1, data: {}, queuedAt: 0, retries: 0 }],
          onsuccess: null,
        };
        setTimeout(() => req.onsuccess?.());
        return req;
      });
      service['db'] = db;

      const items = await service.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].eventId).toBe(1);
    });
  });

  describe('remove()', () => {
    it('deletes item from store by id', async () => {
      const { db, objectStore } = makeIdbMock();
      service['db'] = db;

      await service.remove(5);
      expect(objectStore.delete).toHaveBeenCalledWith(5);
    });
  });

  describe('queueLength', () => {
    it('returns count of queued items', async () => {
      const { db, objectStore } = makeIdbMock();
      objectStore.getAll.mockImplementation(() => {
        const req: any = {
          result: [{ id: 1 }, { id: 2 }],
          onsuccess: null,
        };
        setTimeout(() => req.onsuccess?.());
        return req;
      });
      service['db'] = db;

      const len = await service.queueLength;
      expect(len).toBe(2);
    });
  });

  describe('syncAll()', () => {
    it('returns synced:0 failed:0 when queue is empty', async () => {
      const { db, objectStore } = makeIdbMock();
      objectStore.getAll.mockImplementation(() => {
        const req: any = { result: [], onsuccess: null };
        setTimeout(() => req.onsuccess?.());
        return req;
      });
      service['db'] = db;

      const result = await service.syncAll();
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('increments synced on HTTP success and removes item', async () => {
      const { db, objectStore } = makeIdbMock();
      objectStore.getAll.mockImplementation(() => {
        const req: any = {
          result: [{ id: 1, eventId: 1, data: { guest_name: 'A' }, queuedAt: 0, retries: 0 }],
          onsuccess: null,
        };
        setTimeout(() => req.onsuccess?.());
        return req;
      });
      service['db'] = db;

      const promise = service.syncAll();
      const req = httpMock.expectOne(r => r.url.includes('/api/moi'));
      req.flush({});
      const result = await promise;
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('increments failed on HTTP error', async () => {
      const { db, objectStore } = makeIdbMock();
      objectStore.getAll.mockImplementation(() => {
        const req: any = {
          result: [{ id: 2, eventId: 1, data: { guest_name: 'B' }, queuedAt: 0, retries: 0 }],
          onsuccess: null,
        };
        setTimeout(() => req.onsuccess?.());
        return req;
      });
      service['db'] = db;

      const promise = service.syncAll();
      const req = httpMock.expectOne(r => r.url.includes('/api/moi'));
      req.flush(null, { status: 500, statusText: 'Error' });
      const result = await promise;
      expect(result.failed).toBe(1);
      expect(result.synced).toBe(0);
    });
  });

  describe('setupAutoSync()', () => {
    it('attaches online event listener', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      service.setupAutoSync();
      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
      addSpy.mockRestore();
    });
  });
});
