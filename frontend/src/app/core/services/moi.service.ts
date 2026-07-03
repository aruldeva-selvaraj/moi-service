import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MoiEntry, MoiEntryCreate, PaginatedMoiResponse,
  SummaryStats, RelationshipReport, MoiFilter
} from '../models/moi.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MoiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/moi`;

  getAll(filter: MoiFilter): Observable<PaginatedMoiResponse> {
    let params = new HttpParams()
      .set('page', filter.page.toString())
      .set('page_size', filter.page_size.toString());

    if (filter.event_id) params = params.set('event_id', filter.event_id.toString());
    if (filter.side) params = params.set('side', filter.side);
    if (filter.payment_mode) params = params.set('payment_mode', filter.payment_mode);
    if (filter.search) params = params.set('search', filter.search);

    return this.http.get<PaginatedMoiResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<MoiEntry> {
    return this.http.get<MoiEntry>(`${this.baseUrl}/${id}`);
  }

  create(data: MoiEntryCreate): Observable<MoiEntry> {
    return this.http.post<MoiEntry>(this.baseUrl, data);
  }

  update(id: number, data: Partial<MoiEntryCreate>): Observable<MoiEntry> {
    return this.http.put<MoiEntry>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getSummary(eventId?: number): Observable<SummaryStats> {
    let params = new HttpParams();
    if (eventId) params = params.set('event_id', eventId.toString());
    return this.http.get<SummaryStats>(`${this.baseUrl}/summary`, { params });
  }

  getByRelationship(eventId?: number): Observable<RelationshipReport[]> {
    let params = new HttpParams();
    if (eventId) params = params.set('event_id', eventId.toString());
    return this.http.get<RelationshipReport[]>(`${this.baseUrl}/by-relationship`, { params });
  }
}
