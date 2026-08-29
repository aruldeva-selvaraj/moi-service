import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface QueuedEntry {
  id?: number;
  eventId: number;
  data: any;
  queuedAt: number;
  retries: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly http = inject(HttpClient);
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'moify_offline';
  private readonly STORE = 'moi_queue';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          db.createObjectStore(this.STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = (e) => { this.db = (e.target as IDBOpenDBRequest).result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async enqueue(entry: Omit<QueuedEntry, 'id' | 'queuedAt' | 'retries'>): Promise<void> {
    if (!this.db) await this.init();
    const item: QueuedEntry = { ...entry, queuedAt: Date.now(), retries: 0 };
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).add(item).onsuccess = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll(): Promise<QueuedEntry[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async remove(id: number): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).delete(id).onsuccess = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async syncAll(): Promise<{ synced: number; failed: number }> {
    const entries = await this.getAll();
    let synced = 0; let failed = 0;
    for (const entry of entries) {
      try {
        await this.http.post(`${environment.apiUrl}/api/moi`, entry.data).toPromise();
        await this.remove(entry.id!);
        synced++;
      } catch {
        failed++;
      }
    }
    return { synced, failed };
  }

  get queueLength(): Promise<number> {
    return this.getAll().then(a => a.length);
  }

  setupAutoSync(): void {
    window.addEventListener('online', async () => {
      const result = await this.syncAll();
      if (result.synced > 0) {
        console.log(`[OfflineQueue] Synced ${result.synced} entries`);
      }
    });
  }
}
