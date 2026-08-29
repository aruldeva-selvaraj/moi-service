import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MoiEntry, MoiEntryCreate, PaginatedMoiResponse,
  SummaryStats, RelationshipReport, MoiFilter, GeoBreakdownItem
} from '../models/moi.model';
import { environment } from '../../../environments/environment';

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
    if (filter.city) params = params.set('city', filter.city);
    if (filter.district) params = params.set('district', filter.district);
    if (filter.date_from) params = params.set('date_from', filter.date_from);
    if (filter.date_to) params = params.set('date_to', filter.date_to);
    if (filter.sort_field) params = params.set('sort_field', filter.sort_field);
    if (filter.sort_dir) params = params.set('sort_dir', filter.sort_dir);
    if (filter.amount_min != null) params = params.set('amount_min', filter.amount_min.toString());
    if (filter.amount_max != null) params = params.set('amount_max', filter.amount_max.toString());
    if (filter.relationship) params = params.set('relationship', filter.relationship);
    if (filter.received_by) params = params.set('received_by', filter.received_by);

    return this.http.get<PaginatedMoiResponse>(this.baseUrl, { params });
  }

  getById(id: number): Observable<MoiEntry> {
    return this.http.get<MoiEntry>(`${this.baseUrl}/${id}`);
  }

  create(data: MoiEntryCreate): Observable<MoiEntry> {
    return this.http.post<MoiEntry>(this.baseUrl, data);
  }

  update(id: number, data: Partial<MoiEntryCreate>): Observable<MoiEntry> {
    return this.http.post<MoiEntry>(`${this.baseUrl}/update`, { id, ...data });
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/delete`, { id });
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

  bulkCreate(payload: { event_id: number; entries: any[] }): Observable<{ created: number; errors: any[] }> {
    return this.http.post<{ created: number; errors: any[] }>(`${this.baseUrl}/bulk`, payload);
  }

  getByReceivedBy(eventId: number): Observable<{ received_by: string; count: number; total_amount: number }[]> {
    const params = new HttpParams().set('event_id', eventId.toString());
    return this.http.get<{ received_by: string; count: number; total_amount: number }[]>(`${this.baseUrl}/by-received-by`, { params });
  }

  getTopDonors(eventId: number, limit = 5): Observable<any[]> {
    const params = new HttpParams().set('event_id', eventId.toString()).set('limit', limit.toString());
    return this.http.get<any[]>(`${this.baseUrl}/top-donors`, { params });
  }

  getByHour(eventId: number): Observable<{ hour: number; count: number; total_amount: number }[]> {
    const params = new HttpParams().set('event_id', eventId.toString());
    return this.http.get<{ hour: number; count: number; total_amount: number }[]>(`${this.baseUrl}/by-hour`, { params });
  }

  getByCityBreakdown(eventId?: number): Observable<GeoBreakdownItem[]> {
    let params = new HttpParams();
    if (eventId) params = params.set('event_id', eventId.toString());
    return this.http.get<GeoBreakdownItem[]>(`${this.baseUrl}/by-city`, { params });
  }

  getByDistrictBreakdown(eventId?: number): Observable<GeoBreakdownItem[]> {
    let params = new HttpParams();
    if (eventId) params = params.set('event_id', eventId.toString());
    return this.http.get<GeoBreakdownItem[]>(`${this.baseUrl}/by-district`, { params });
  }
}
