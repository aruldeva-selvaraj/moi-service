import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { WeddingListComponent } from './wedding-list.component';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';

const makeEvent = (id: number, status = 'approved', date = '2026-12-01', type = 'wedding') => ({
  id, status, event_type: type,
  primary_name: `Primary ${id}`, secondary_name: `Secondary ${id}`,
  family_name: `Family ${id}`, venue: `Venue ${id}`,
  event_date: date, moi_count: id, total_moi: id * 100,
});

describe('WeddingListComponent', () => {
  let component: WeddingListComponent;
  let fixture: ComponentFixture<WeddingListComponent>;
  let eventSvc: any;
  let authSvc: any;

  beforeEach(async () => {
    eventSvc = {
      getAll: vi.fn().mockReturnValue(of([makeEvent(1), makeEvent(2, 'pending'), makeEvent(3, 'completed')])),
      approve: vi.fn().mockReturnValue(of({})),
      reject: vi.fn().mockReturnValue(of({})),
      delete: vi.fn().mockReturnValue(of({})),
      clone: vi.fn().mockReturnValue(of({})),
      complete: vi.fn().mockReturnValue(of({})),
    };
    authSvc = {
      isLoggedIn: signal(true),
      currentUser: signal({ username: 'admin', role: 'admin' }),
      isAdmin: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [WeddingListComponent, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatDialogModule],
      providers: [
        { provide: EventService, useValue: eventSvc },
        { provide: AuthService, useValue: authSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeddingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads events on init', () => {
    expect(component.events().length).toBe(3);
  });

  it('loading becomes false after events load', () => {
    expect(component.loading()).toBe(false);
  });

  it('pendingEvents filters pending', () => {
    expect(component.pendingEvents().length).toBe(1);
  });

  it('approvedEvents filters approved', () => {
    expect(component.approvedEvents().length).toBe(1);
  });

  describe('filteredEvents computed()', () => {
    it('filters by search query on primary_name', () => {
      component.searchQuery.set('Primary 1');
      expect(component.filteredEvents().length).toBe(1);
    });

    it('filters by event type', () => {
      component.events.set([makeEvent(1, 'approved', '2026-12-01', 'wedding'), makeEvent(2, 'approved', '2026-12-01', 'engagement')] as any);
      component.typeFilter.set('engagement');
      expect(component.filteredEvents().length).toBe(1);
    });

    it('filters past events by upcomingFilter past', () => {
      component.events.set([makeEvent(1, 'approved', '2020-01-01'), makeEvent(2, 'approved', '2030-01-01')] as any);
      component.upcomingFilter.set('past');
      expect(component.filteredEvents().length).toBe(1);
    });

    it('filters upcoming events', () => {
      component.events.set([makeEvent(1, 'approved', '2020-01-01'), makeEvent(2, 'approved', '2030-01-01')] as any);
      component.upcomingFilter.set('upcoming');
      expect(component.filteredEvents().length).toBe(1);
    });

    it('filters by totalMoiMin', () => {
      component.events.set([makeEvent(5, 'approved'), makeEvent(50, 'approved')] as any);
      component.totalMoiMin.set(1000);
      expect(component.filteredEvents().length).toBe(1);
    });

    it('filters by totalMoiMax', () => {
      component.events.set([makeEvent(5, 'approved'), makeEvent(50, 'approved')] as any);
      component.totalMoiMax.set(600);
      expect(component.filteredEvents().length).toBe(1);
    });

    it('returns all when no filters', () => {
      expect(component.filteredEvents().length).toBe(3);
    });
  });

  describe('getEventStatusBadge()', () => {
    it('returns null for undefined date', () => {
      expect(component.getEventStatusBadge({ event_date: null } as any)).toBeNull();
    });

    it('returns Today badge for today', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = component.getEventStatusBadge({ event_date: today, status: 'approved' } as any);
      expect(result?.label).toContain('Today');
    });

    it('returns Past badge for past date', () => {
      const result = component.getEventStatusBadge({ event_date: '2020-01-01', status: 'approved' } as any);
      expect(result?.label).toBe('Past');
    });

    it('returns Completed badge for completed past event', () => {
      const result = component.getEventStatusBadge({ event_date: '2020-01-01', status: 'completed' } as any);
      expect(result?.label).toBe('Completed');
    });

    it('returns null for far future dates (> 30 days)', () => {
      const result = component.getEventStatusBadge({ event_date: '2030-01-01', status: 'approved' } as any);
      expect(result).toBeNull();
    });
  });

  it('isEventPastDate returns true for past date', () => {
    expect(component.isEventPastDate({ event_date: '2020-01-01' } as any)).toBe(true);
  });

  it('isEventPastDate returns false for future date', () => {
    expect(component.isEventPastDate({ event_date: '2030-01-01' } as any)).toBe(false);
  });

  it('isEventPastDate returns false for missing date', () => {
    expect(component.isEventPastDate({ event_date: null } as any)).toBe(false);
  });

  it('getEventTitle returns string', () => {
    expect(typeof component.getEventTitle(makeEvent(1) as any)).toBe('string');
  });

  it('getEventEmoji returns string', () => {
    expect(typeof component.getEventEmoji(makeEvent(1) as any)).toBe('string');
  });

  it('getEventTypeLabel returns string', () => {
    expect(typeof component.getEventTypeLabel(makeEvent(1) as any)).toBe('string');
  });

  it('approveEvent calls eventService.approve', () => {
    const ev = makeEvent(1);
    component.approveEvent(ev as any, new MouseEvent('click'));
    expect(eventSvc.approve).toHaveBeenCalledWith(1);
  });

  it('approveEvent handles error gracefully', () => {
    eventSvc.approve.mockReturnValue(throwError(() => new Error('fail')));
    expect(() => component.approveEvent(makeEvent(1) as any, new MouseEvent('click'))).not.toThrow();
  });

  it('rejectEvent calls eventService.reject when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.rejectEvent(makeEvent(1) as any, new MouseEvent('click'));
    expect(eventSvc.reject).toHaveBeenCalledWith(1);
  });

  it('rejectEvent does not call reject when cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.rejectEvent(makeEvent(1) as any, new MouseEvent('click'));
    expect(eventSvc.reject).not.toHaveBeenCalled();
  });

  it('confirmDelete calls eventService.delete when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.confirmDelete(makeEvent(1) as any, new MouseEvent('click'));
    expect(eventSvc.delete).toHaveBeenCalledWith(1);
  });

  it('confirmDelete does not call delete when cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.confirmDelete(makeEvent(1) as any, new MouseEvent('click'));
    expect(eventSvc.delete).not.toHaveBeenCalled();
  });

  it('cloneEvent calls eventService.clone', () => {
    component.cloneEvent(1, new MouseEvent('click'));
    expect(eventSvc.clone).toHaveBeenCalledWith(1);
  });

  it('loadEvents handles error gracefully', () => {
    eventSvc.getAll.mockReturnValue(throwError(() => new Error('fail')));
    component.loadEvents();
    expect(component.loading()).toBe(false);
  });

  it('ngOnDestroy disconnects observer', () => {
    const disconnectSpy = vi.fn();
    component['observer'] = { disconnect: disconnectSpy } as any;
    component.ngOnDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
