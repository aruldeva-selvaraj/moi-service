import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ReportsComponent } from './reports.component';
import { EventService } from '../../core/services/event.service';
import { MoiService } from '../../core/services/moi.service';
import { ReceiptService } from '../../core/services/receipt.service';

const makeEvent = (id: number, status = 'approved', type = 'wedding') => ({
  id, status, event_type: type, primary_name: `Event ${id}`,
  secondary_name: '', family_name: '', venue: '', event_date: '2026-12-01',
  moi_count: 0, total_moi: 0,
});

const makeReport = () => ({
  moi_count: 10, total_amount: 5000,
  cash_amount: 2000, cheque_amount: 1000, online_amount: 2000, dd_amount: 0,
});

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let eventSvc: any;
  let moiSvc: any;
  let receiptSvc: any;

  beforeEach(async () => {
    eventSvc = {
      getAll: vi.fn().mockReturnValue(of([makeEvent(1), makeEvent(2)])),
      getReport: vi.fn().mockReturnValue(of(makeReport())),
    };
    moiSvc = {
      getByRelationship: vi.fn().mockReturnValue(of([])),
      getAll: vi.fn().mockReturnValue(of({ items: [], total: 0 })),
      getByReceivedBy: vi.fn().mockReturnValue(of([])),
      getByCityBreakdown: vi.fn().mockReturnValue(of([])),
      getByDistrictBreakdown: vi.fn().mockReturnValue(of([])),
    };
    receiptSvc = {
      printEventReport: vi.fn(),
      printA4Sheet: vi.fn(),
      downloadA4Sheet: vi.fn(),
      shareReportAsPdf: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ReportsComponent, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule],
      providers: [
        { provide: EventService, useValue: eventSvc },
        { provide: MoiService, useValue: moiSvc },
        { provide: ReceiptService, useValue: receiptSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
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

  it('loads events on init filtering approved and completed', () => {
    expect(component.events().length).toBe(2);
  });

  it('events excludes pending', () => {
    eventSvc.getAll.mockReturnValue(of([makeEvent(1, 'pending'), makeEvent(2, 'approved')]));
    component.ngOnInit();
    expect(component.events().length).toBe(1);
  });

  it('loading becomes false after init', async () => {
    expect(component.loading()).toBe(false);
  });

  it('getEventTitle returns string with emoji', () => {
    const ev = makeEvent(1);
    const title = component.getEventTitle(ev as any);
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  it('getSelectedEvent returns undefined when no selectedEventId', () => {
    component.selectedEventId = null;
    expect(component.getSelectedEvent()).toBeUndefined();
  });

  it('getSelectedEvent returns event matching selectedEventId', () => {
    component.selectedEventId = 1;
    const ev = component.getSelectedEvent();
    expect(ev?.id).toBe(1);
  });

  it('getSelectedEventConfig returns config for selected event', () => {
    component.selectedEventId = 1;
    const cfg = component.getSelectedEventConfig();
    expect(cfg).toBeTruthy();
  });

  it('getSelectedEventConfig returns wedding config when no event selected', () => {
    component.selectedEventId = null;
    const cfg = component.getSelectedEventConfig();
    expect(cfg).toBeTruthy();
  });

  describe('loadReport()', () => {
    it('fetches 6 datasets when selectedEventId is set', () => {
      component.selectedEventId = 1;
      component.loadReport();
      expect(eventSvc.getReport).toHaveBeenCalledWith(1);
      expect(moiSvc.getByRelationship).toHaveBeenCalledWith(1);
      expect(moiSvc.getAll).toHaveBeenCalled();
    });

    it('fetches only relationship data when no selectedEventId', () => {
      component.selectedEventId = null;
      component.loadReport();
      expect(moiSvc.getByRelationship).toHaveBeenCalledWith();
    });

    it('handles eventService error gracefully', () => {
      eventSvc.getReport.mockReturnValue(throwError(() => new Error('fail')));
      component.selectedEventId = 1;
      expect(() => component.loadReport()).not.toThrow();
    });
  });

  describe('Chart helpers', () => {
    it('donutDash returns correct format', () => {
      const result = component.donutDash(1000, 5000);
      expect(result).toContain(' ');
    });

    it('donutDash returns 0 pct when total is 0', () => {
      const result = component.donutDash(100, 0);
      expect(result.startsWith('0.0')).toBe(true);
    });

    it('donutOffset calculates offset', () => {
      const result = component.donutOffset(500, 5000);
      expect(typeof result).toBe('number');
    });

    it('barWidth returns 0 when total is 0', () => {
      expect(component.barWidth(100, 0)).toBe(0);
    });

    it('barWidth returns at least 2 for non-zero amounts', () => {
      expect(component.barWidth(1, 10000)).toBeGreaterThanOrEqual(2);
    });

    it('barWidth returns 100 when amount equals total', () => {
      expect(component.barWidth(100, 100)).toBe(100);
    });

    it('avgAmount uses avg_amount field when present', () => {
      const r = { count: 5, total_amount: 5000, avg_amount: 1000 } as any;
      expect(component.avgAmount(r)).toBe(1000);
    });

    it('avgAmount computes from total when avg_amount absent', () => {
      const r = { count: 4, total_amount: 4000 } as any;
      expect(component.avgAmount(r)).toBe(1000);
    });

    it('avgAmount returns 0 when count is 0', () => {
      const r = { count: 0, total_amount: 0 } as any;
      expect(component.avgAmount(r)).toBe(0);
    });

    it('topRelMax returns 1 for empty relationship data', () => {
      component.relationshipData.set([]);
      expect(component.topRelMax()).toBe(1);
    });

    it('topRelMax returns max total_amount', () => {
      component.relationshipData.set([
        { relationship: 'friend', count: 2, total_amount: 2000 },
        { relationship: 'cousin', count: 1, total_amount: 5000 },
      ] as any);
      expect(component.topRelMax()).toBe(5000);
    });
  });

  describe('Print/Download', () => {
    beforeEach(() => {
      component.selectedEventId = 1;
      component.allEntries.set([{ id: 1, guest_name: 'G', amount: 100 } as any]);
    });

    it('openA4PrintModal sets showPrintModal true when entries exist', () => {
      component.openA4PrintModal();
      expect(component.showPrintModal()).toBe(true);
    });

    it('openA4PrintModal does nothing when entries empty', () => {
      component.allEntries.set([]);
      component.openA4PrintModal();
      expect(component.showPrintModal()).toBe(false);
    });

    it('printA4WithSide closes modal and calls receiptService', () => {
      component.showPrintModal.set(true);
      component.printA4WithSide('all');
      expect(component.showPrintModal()).toBe(false);
      expect(receiptSvc.printA4Sheet).toHaveBeenCalled();
    });

    it('downloadA4WithSide closes modal and calls receiptService', () => {
      component.showPrintModal.set(true);
      component.downloadA4WithSide('all');
      expect(component.showPrintModal()).toBe(false);
      expect(receiptSvc.downloadA4Sheet).toHaveBeenCalled();
    });

    it('printEventReport calls receiptService when event and report are set', () => {
      component.eventReport.set(makeReport() as any);
      component.printEventReport();
      expect(receiptSvc.printEventReport).toHaveBeenCalled();
    });

    it('printEventReport does nothing when no event or report', () => {
      component.selectedEventId = null;
      component.eventReport.set(null);
      component.printEventReport();
      expect(receiptSvc.printEventReport).not.toHaveBeenCalled();
    });
  });

  describe('exportCsv()', () => {
    it('does nothing when allEntries is empty', () => {
      component.allEntries.set([]);
      expect(() => component.exportCsv()).not.toThrow();
    });

    it('triggers download when entries exist', () => {
      const createSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '', download: '', click: vi.fn(), style: {},
        setAttribute: vi.fn(),
      } as any);
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(el => el);
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(el => el);
      component.allEntries.set([{ id: 1, guest_name: 'Test', amount: 100 } as any]);
      component.exportCsv();
      createSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('exportSummaryCsv()', () => {
    it('does nothing when no eventReport', () => {
      component.eventReport.set(null);
      expect(() => component.exportSummaryCsv()).not.toThrow();
    });

    it('triggers download when report exists', () => {
      component.eventReport.set(makeReport() as any);
      const createSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '', download: '', click: vi.fn(), style: {},
        setAttribute: vi.fn(),
      } as any);
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(el => el);
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(el => el);
      component.exportSummaryCsv();
      createSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('shareEventSummary()', () => {
    it('calls shareReportAsPdf when event and report are set', async () => {
      component.selectedEventId = 1;
      component.eventReport.set(makeReport() as any);
      await component.shareEventSummary();
      expect(receiptSvc.shareReportAsPdf).toHaveBeenCalled();
    });

    it('does nothing when sharing is already in progress', async () => {
      component.sharing.set(true);
      await component.shareEventSummary();
      expect(receiptSvc.shareReportAsPdf).not.toHaveBeenCalled();
    });

    it('does nothing when no event or report', async () => {
      component.selectedEventId = null;
      component.eventReport.set(null);
      await component.shareEventSummary();
      expect(receiptSvc.shareReportAsPdf).not.toHaveBeenCalled();
    });

    it('resets sharing to false after success', async () => {
      component.selectedEventId = 1;
      component.eventReport.set(makeReport() as any);
      await component.shareEventSummary();
      expect(component.sharing()).toBe(false);
    });
  });

  it('ngOnInit handles error from eventService', async () => {
    eventSvc.getAll.mockReturnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });

  it('getEventConfig returns config object', () => {
    const ev = makeEvent(1) as any;
    expect(component.getEventConfig(ev)).toBeTruthy();
  });
});
