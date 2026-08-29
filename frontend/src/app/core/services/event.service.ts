import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Event, EventCreate, EventReport } from '../models/event.model';
import { environment } from '../../../environments/environment';

export interface EventFilters {
  search?: string;
  event_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  sort_field?: string;
  sort_dir?: string;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/events`;

  getAll(filters?: EventFilters): Observable<Event[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.search !== undefined && filters.search !== null && filters.search !== '') {
        params = params.set('search', filters.search);
      }
      if (filters.event_type !== undefined && filters.event_type !== null && filters.event_type !== '') {
        params = params.set('event_type', filters.event_type);
      }
      if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
        params = params.set('status', filters.status);
      }
      if (filters.date_from !== undefined && filters.date_from !== null && filters.date_from !== '') {
        params = params.set('date_from', filters.date_from);
      }
      if (filters.date_to !== undefined && filters.date_to !== null && filters.date_to !== '') {
        params = params.set('date_to', filters.date_to);
      }
      if (filters.sort_field !== undefined && filters.sort_field !== null && filters.sort_field !== '') {
        params = params.set('sort_field', filters.sort_field);
      }
      if (filters.sort_dir !== undefined && filters.sort_dir !== null && filters.sort_dir !== '') {
        params = params.set('sort_dir', filters.sort_dir);
      }
    }
    return this.http.get<Event[]>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}/${id}`);
  }

  create(data: EventCreate): Observable<Event> {
    return this.http.post<Event>(this.baseUrl, data);
  }

  update(id: number, data: Partial<EventCreate>): Observable<Event> {
    return this.http.put<Event>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getReport(id: number): Observable<EventReport> {
    return this.http.get<EventReport>(`${this.baseUrl}/${id}/report`);
  }

  approve(id: number): Observable<Event> {
    return this.http.patch<Event>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: number): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.baseUrl}/${id}/reject`, {});
  }

  clone(id: number): Observable<Event> {
    return this.http.post<Event>(`${this.baseUrl}/${id}/clone`, {});
  }

  complete(id: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/complete`, {});
  }
}
