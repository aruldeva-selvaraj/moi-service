import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Wedding, WeddingCreate, WeddingReport } from '../models/wedding.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WeddingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/weddings`;

  getAll(): Observable<Wedding[]> {
    return this.http.get<Wedding[]>(this.baseUrl + '/');
  }

  getById(id: number): Observable<Wedding> {
    return this.http.get<Wedding>(`${this.baseUrl}/${id}`);
  }

  create(data: WeddingCreate): Observable<Wedding> {
    return this.http.post<Wedding>(this.baseUrl + '/', data);
  }

  update(id: number, data: Partial<WeddingCreate>): Observable<Wedding> {
    return this.http.put<Wedding>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getReport(id: number): Observable<WeddingReport> {
    return this.http.get<WeddingReport>(`${this.baseUrl}/${id}/report`);
  }
}
