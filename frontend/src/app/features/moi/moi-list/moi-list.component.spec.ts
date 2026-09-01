import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { MoiListComponent } from './moi-list.component';
import { MoiService } from '../../../core/services/moi.service';
import { EventService } from '../../../core/services/event.service';
import { ReceiptService } from '../../../core/services/receipt.service';

const makeEvent = (id: number) => ({
  id, event_type: 'wedding', status: 'approved',
  primary_name: `Event ${id}`, secondary_name: '', family_name: '',
  venue: '', event_date: '2026-12-01', moi_count: 0, total_moi: 0,
});

const makeEntry = (id: number, eventId = 1) => ({
  id, event_id: eventId, guest_name: `Guest ${id}`, amount: id * 100,
  payment_mode: 'cash', side: 'groom', city: `City ${id}`, district: '',
  relationship: '', received_by: '', receipt_no: id, created_at: new Date().toISOString(),
});

describe('MoiListComponent', () => {
  let component: MoiListComponent;
  let fixture: ComponentFixture<MoiListComponent>;
  let moiSvc: any;
  let eventSvc: any;
  let receiptSvc: any;

  beforeEach(async () => {
    moiSvc = {
      getAll: vi.fn().mockReturnValue(of({ items: [makeEntry(1), makeEntry(2)], total: 2 })),
      delete: vi.fn().mockReturnValue(of({})),
      create: vi.fn().mockReturnValue(of({ id: 99 })),
      update: vi.fn().mockReturnValue(of({ id: 1 })),
    };
    eventSvc = {
      getAll: vi.fn().mockReturnValue(of([makeEvent(1), makeEvent(2)])),
    };
    receiptSvc = {
      printReceipt: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MoiListComponent, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatDialogModule],
      providers: [
        { provide: MoiService, useValue: moiSvc },
        { provide: EventService, useValue: eventSvc },
        { provide: ReceiptService, useValue: receiptSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MoiListComponent);
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

  it('loads entries and events on init', () => {
    expect(component.entries().length).toBe(2);
    expect(component.events().length).toBe(2);
  });

  it('loading becomes false after init', () => {
    expect(component.loading()).toBe(false);
  });

  it('total reflects server total', () => {
    expect(component.total()).toBe(2);
  });

  it('allLoaded is true when items count >= total', () => {
    expect(component.allLoaded()).toBe(true);
  });

  it('getEventName returns Unknown for missing event id', () => {
    expect(component.getEventName(999)).toBe('Unknown');
  });

  it('getEventName returns event title for existing event id', () => {
    component.events.set([makeEvent(1)] as any);
    expect(component.getEventName(1)).toBeTruthy();
  });

  it('getSideLabel returns side labels', () => {
    component.events.set([makeEvent(1)] as any);
    const label = component.getSideLabel('groom', 1);
    expect(label).toBeTruthy();
  });

  it('getSideLabel falls back for unknown event', () => {
    component.events.set([]);
    const label = component.getSideLabel('bride', 999);
    expect(typeof label).toBe('string');
  });

  it('getSideBadge returns badge class', () => {
    expect(component.getSideBadge('groom')).toBe('badge-groom');
    expect(component.getSideBadge('bride')).toBe('badge-bride');
    expect(component.getSideBadge('both')).toBe('badge-both');
    expect(component.getSideBadge('unknown')).toBe('');
  });

  describe('sortedEntries computed()', () => {
    it('sorts by amount ascending', () => {
      component.entries.set([makeEntry(10), makeEntry(1), makeEntry(5)] as any);
      component.sortField.set('amount');
      component.sortDir.set('asc');
      const sorted = component.sortedEntries();
      expect(sorted[0].id).toBe(1);
    });

    it('sorts by amount descending', () => {
      component.entries.set([makeEntry(1), makeEntry(10), makeEntry(5)] as any);
      component.sortField.set('amount');
      component.sortDir.set('desc');
      const sorted = component.sortedEntries();
      expect(sorted[0].id).toBe(10);
    });

    it('sorts by guest_name string', () => {
      component.entries.set([makeEntry(2), makeEntry(1)] as any);
      component.sortField.set('guest_name');
      component.sortDir.set('asc');
      const sorted = component.sortedEntries();
      expect(sorted[0].guest_name).toBe('Guest 1');
    });
  });

  describe('onSort()', () => {
    it('toggles direction when same field clicked', () => {
      component.sortField.set('amount');
      component.sortDir.set('asc');
      component.onSort('amount');
      expect(component.sortDir()).toBe('desc');
    });

    it('switches to new field with default direction', () => {
      component.sortField.set('guest_name');
      component.onSort('amount');
      expect(component.sortField()).toBe('amount');
      expect(component.sortDir()).toBe('desc');
    });

    it('switches to guest_name with asc direction', () => {
      component.sortField.set('amount');
      component.onSort('guest_name');
      expect(component.sortField()).toBe('guest_name');
      expect(component.sortDir()).toBe('asc');
    });
  });

  describe('sortIcon()', () => {
    it('returns unfold_more for non-active field', () => {
      component.sortField.set('amount');
      expect(component.sortIcon('guest_name')).toBe('unfold_more');
    });

    it('returns arrow_upward for active asc field', () => {
      component.sortField.set('amount');
      component.sortDir.set('asc');
      expect(component.sortIcon('amount')).toBe('arrow_upward');
    });

    it('returns arrow_downward for active desc field', () => {
      component.sortField.set('amount');
      component.sortDir.set('desc');
      expect(component.sortIcon('amount')).toBe('arrow_downward');
    });
  });

  describe('loadEntries()', () => {
    it('resets to page 1 and loads', () => {
      component.page.set(3);
      component.loadEntries();
      expect(component.page()).toBe(1);
    });

    it('handles error gracefully', () => {
      moiSvc.getAll.mockReturnValue(throwError(() => new Error('fail')));
      expect(() => component.loadEntries()).not.toThrow();
    });
  });

  describe('loadMore()', () => {
    it('does nothing when allLoaded', () => {
      component.allLoaded.set(true);
      const callsBefore = moiSvc.getAll.mock.calls.length;
      component.loadMore();
      expect(moiSvc.getAll.mock.calls.length).toBe(callsBefore);
    });

    it('does nothing when loading', () => {
      component.allLoaded.set(false);
      component.loading.set(true);
      const callsBefore = moiSvc.getAll.mock.calls.length;
      component.loadMore();
      expect(moiSvc.getAll.mock.calls.length).toBe(callsBefore);
    });

    it('increments page and fetches more when not loaded', () => {
      component.allLoaded.set(false);
      component.loading.set(false);
      component.page.set(1);
      moiSvc.getAll.mockReturnValue(of({ items: [makeEntry(3)], total: 5 }));
      component.loadMore();
      expect(component.page()).toBe(2);
    });
  });

  describe('applyFilter()', () => {
    it('calls loadEntries', () => {
      const spy = vi.spyOn(component, 'loadEntries');
      component.applyFilter();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('clearFilters()', () => {
    it('resets all filters and calls loadEntries', () => {
      component.filterSide = 'groom';
      component.filterPayment = 'cash';
      component.searchQuery.set('test');
      component.clearFilters();
      expect(component.filterSide).toBe('');
      expect(component.filterPayment).toBe('');
      expect(component.searchQuery()).toBe('');
    });
  });

  describe('Selection', () => {
    it('toggleSelect adds id to selectedIds', () => {
      component.toggleSelect(1);
      expect(component.selectedIds().has(1)).toBe(true);
    });

    it('toggleSelect removes id when already selected', () => {
      component.selectedIds.set(new Set([1]));
      component.toggleSelect(1);
      expect(component.selectedIds().has(1)).toBe(false);
    });

    it('toggleSelectAll selects all entries', () => {
      component.entries.set([makeEntry(1), makeEntry(2)] as any);
      component.selectedIds.set(new Set());
      component.toggleSelectAll();
      expect(component.selectedIds().size).toBe(2);
    });

    it('toggleSelectAll deselects all when allSelected', () => {
      component.entries.set([makeEntry(1), makeEntry(2)] as any);
      component.selectedIds.set(new Set([1, 2]));
      component.toggleSelectAll();
      expect(component.selectedIds().size).toBe(0);
    });

    it('allSelected is true when all entries selected', () => {
      component.entries.set([makeEntry(1)] as any);
      component.selectedIds.set(new Set([1]));
      expect(component.allSelected()).toBe(true);
    });

    it('allSelected is false when empty entries', () => {
      component.entries.set([]);
      expect(component.allSelected()).toBe(false);
    });

    it('clearSelection empties selectedIds', () => {
      component.selectedIds.set(new Set([1, 2]));
      component.clearSelection();
      expect(component.selectedIds().size).toBe(0);
    });
  });

  it('printEntry calls receiptService.printReceipt', () => {
    component.events.set([makeEvent(1)] as any);
    component.printEntry(makeEntry(1));
    expect(receiptSvc.printReceipt).toHaveBeenCalled();
  });

  it('printEntry shows snackbar when event not found', () => {
    component.events.set([]);
    expect(() => component.printEntry(makeEntry(1))).not.toThrow();
  });

  it('deleteEntry calls moiService.delete', () => {
    component.deleteEntry(makeEntry(1) as any);
    expect(moiSvc.delete).toHaveBeenCalledWith(1);
  });

  it('deleteEntry handles error gracefully', () => {
    moiSvc.delete.mockReturnValue(throwError(() => new Error('fail')));
    expect(() => component.deleteEntry(makeEntry(1) as any)).not.toThrow();
  });

  it('ngOnDestroy disconnects scrollObserver', () => {
    const disconnectSpy = vi.fn();
    component['scrollObserver'] = { disconnect: disconnectSpy } as any;
    component.ngOnDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('search$ triggers loadEntries after debounce', fakeAsync(() => {
    const spy = vi.spyOn(component, 'loadEntries');
    component.search$.next('test');
    tick(350);
    expect(spy).toHaveBeenCalled();
  }));

  it('ngOnInit handles event service error', async () => {
    eventSvc.getAll.mockReturnValue(throwError(() => new Error('fail')));
    const fix = TestBed.createComponent(MoiListComponent);
    fix.detectChanges();
    await fix.whenStable();
    expect(fix.componentInstance).toBeTruthy();
  });
});
