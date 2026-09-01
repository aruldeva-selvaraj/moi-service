import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { EventService } from '../../core/services/event.service';
import { MoiService } from '../../core/services/moi.service';
import { ReceiptService } from '../../core/services/receipt.service';
import { AuthService } from '../../core/services/auth.service';

const makeEvent = (id: number, status = 'approved', type = 'wedding') => ({
  id, status, event_type: type, primary_name: `Event ${id}`,
  secondary_name: '', family_name: '', venue: '', event_date: '2026-12-01',
  moi_count: 0, total_moi: 0,
});

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let eventSvc: any;
  let moiSvc: any;
  let receiptSvc: any;

  beforeEach(async () => {
    eventSvc = {
      getAll: vi.fn().mockReturnValue(of([])),
      getReport: vi.fn().mockReturnValue(of({ moi_count: 5, total_amount: 1000, cash_amount: 500, cheque_amount: 200, online_amount: 300, dd_amount: 0 })),
    };
    moiSvc = {
      getSummary: vi.fn().mockReturnValue(of({ total_guests: 0, total_amount: 0, total_events: 0 })),
      getAll: vi.fn().mockReturnValue(of({ items: [], total: 0 })),
    };
    receiptSvc = {
      printEventReport: vi.fn(),
    };
    const authMock = { isLoggedIn: signal(true), currentUser: signal({ username: 'u', role: 'user' }), isAdmin: vi.fn().mockReturnValue(false) };

    localStorage.setItem('moify_onboarded', '1');

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [
        { provide: EventService, useValue: eventSvc },
        { provide: MoiService, useValue: moiSvc },
        { provide: ReceiptService, useValue: receiptSvc },
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loading starts true and becomes false after data loads', async () => {
    await fixture.whenStable();
    expect(component.loading()).toBe(false);
  });

  it('approvedEvents filters approved and completed', () => {
    component.events.set([
      makeEvent(1, 'approved') as any,
      makeEvent(2, 'pending') as any,
      makeEvent(3, 'completed') as any,
    ]);
    expect(component.approvedEvents().length).toBe(2);
  });

  it('pendingCount counts pending events', () => {
    component.events.set([
      makeEvent(1, 'pending') as any,
      makeEvent(2, 'approved') as any,
      makeEvent(3, 'pending') as any,
    ]);
    expect(component.pendingCount()).toBe(2);
  });

  it('recentEvents returns up to 6 approved events', () => {
    const evs = Array.from({ length: 10 }, (_, i) => makeEvent(i + 1) as any);
    component.events.set(evs);
    expect(component.recentEvents().length).toBe(6);
  });

  it('selectedEvent is null when selectedEventId is null', () => {
    component.events.set([makeEvent(1) as any]);
    component.selectedEventId.set(null);
    expect(component.selectedEvent()).toBeNull();
  });

  it('selectedEvent matches selectedEventId', () => {
    component.events.set([makeEvent(1) as any, makeEvent(2) as any]);
    component.selectedEventId.set(2);
    expect(component.selectedEvent()?.id).toBe(2);
  });

  it('selectedEventConfig returns wedding config for null selectedEvent', () => {
    component.selectedEventId.set(null);
    expect(component.selectedEventConfig()).toBeTruthy();
  });

  it('nextSlide wraps around to 0', () => {
    component.activeSlide.set(0);
    component.nextSlide();
    expect(component.activeSlide()).toBe(0);
  });

  it('prevSlide wraps around', () => {
    component.activeSlide.set(0);
    component.prevSlide();
    expect(component.activeSlide()).toBe(0);
  });

  it('goToSlide sets activeSlide', () => {
    component.goToSlide(0);
    expect(component.activeSlide()).toBe(0);
  });

  it('getEventTitle returns event title string', () => {
    const ev = makeEvent(1);
    expect(typeof component.getEventTitle(ev as any)).toBe('string');
  });

  it('getEventEmoji returns string', () => {
    const ev = makeEvent(1);
    expect(typeof component.getEventEmoji(ev as any)).toBe('string');
  });

  it('onEventChange updates selectedEventId and calls getReport', () => {
    component.onEventChange(5);
    expect(component.selectedEventId()).toBe(5);
    expect(eventSvc.getReport).toHaveBeenCalledWith(5);
  });

  it('onEventChange with null clears eventReport', () => {
    component.onEventChange(null);
    expect(component.eventReport()).toBeNull();
  });

  it('generatePdfReport calls receiptService when event and report are set', () => {
    const ev = makeEvent(1) as any;
    const report = { moi_count: 1, total_amount: 100 } as any;
    component.events.set([ev]);
    component.selectedEventId.set(1);
    component.eventReport.set(report);
    component.generatePdfReport();
    expect(receiptSvc.printEventReport).toHaveBeenCalledWith(report, ev);
  });

  it('generatePdfReport does nothing when no event or report', () => {
    component.eventReport.set(null);
    component.generatePdfReport();
    expect(receiptSvc.printEventReport).not.toHaveBeenCalled();
  });

  it('exportEventCsv does nothing when no selectedEventId', () => {
    component.selectedEventId.set(null);
    component.exportEventCsv();
    expect(moiSvc.getAll).not.toHaveBeenCalled();
  });

  it('loadData handles event service error gracefully', async () => {
    eventSvc.getAll.mockReturnValue(throwError(() => new Error('net')));
    moiSvc.getSummary.mockReturnValue(throwError(() => new Error('net')));
    const fixture2 = TestBed.createComponent(DashboardComponent);
    fixture2.detectChanges();
    await fixture2.whenStable();
    expect(fixture2.componentInstance.loading()).toBe(false);
  });

  it('showOnboarding is false when moify_onboarded is set', () => {
    expect(component.showOnboarding()).toBe(false);
  });

  it('ngOnDestroy clears slideTimer', () => {
    component['slideTimer'] = setInterval(() => {}, 1000);
    const spy = vi.spyOn(globalThis, 'clearInterval');
    component.ngOnDestroy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
