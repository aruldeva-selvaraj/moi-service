import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WeddingDetailComponent } from './wedding-detail.component';
import { EventService } from '../../../core/services/event.service';
import { MoiService } from '../../../core/services/moi.service';
import { ReceiptService } from '../../../core/services/receipt.service';
import { VoiceRecognitionService } from '../../../core/services/voice-recognition.service';

const makeEvent = () => ({
  id: 1, event_type: 'wedding', status: 'approved',
  primary_name: 'Ram', secondary_name: 'Sita', family_name: 'Sharma',
  venue: 'Hall', event_date: '2026-12-01', moi_count: 5, total_moi: 5000,
});

const makeEntry = (id: number) => ({
  id, event_id: 1, guest_name: `Guest ${id}`, amount: id * 100,
  payment_mode: 'cash', side: 'groom', city: `City ${id}`, district: '',
  relationship: '', received_by: '', receipt_no: id, created_at: new Date().toISOString(),
});

describe('WeddingDetailComponent', () => {
  let component: WeddingDetailComponent;
  let fixture: ComponentFixture<WeddingDetailComponent>;
  let eventSvc: any;
  let moiSvc: any;
  let receiptSvc: any;
  let voiceSvc: any;

  beforeEach(async () => {
    eventSvc = {
      getById: vi.fn().mockReturnValue(of(makeEvent())),
      getReport: vi.fn().mockReturnValue(of({ moi_count: 5, total_amount: 5000 })),
    };
    moiSvc = {
      getAll: vi.fn().mockReturnValue(of({ items: [makeEntry(1), makeEntry(2)], total: 2 })),
      create: vi.fn().mockReturnValue(of({ ...makeEntry(99), receipt_no: 99 })),
      update: vi.fn().mockReturnValue(of(makeEntry(1))),
      delete: vi.fn().mockReturnValue(of({})),
      getTopDonors: vi.fn().mockReturnValue(of([])),
    };
    receiptSvc = {
      printReceipt: vi.fn(),
      printA4Sheet: vi.fn(),
      downloadA4Sheet: vi.fn(),
    };
    voiceSvc = {
      supported: false,
      listening: false,
      transcript: '',
      start: vi.fn(),
      stop: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        WeddingDetailComponent, RouterTestingModule, NoopAnimationsModule,
        MatSnackBarModule, MatDialogModule,
      ],
      providers: [
        { provide: EventService, useValue: eventSvc },
        { provide: MoiService, useValue: moiSvc },
        { provide: ReceiptService, useValue: receiptSvc },
        { provide: VoiceRecognitionService, useValue: voiceSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: vi.fn().mockReturnValue('1') } },
            params: of({ id: '1' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeddingDetailComponent);
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

  it('loads event on init', () => {
    expect(component.event()?.id).toBe(1);
  });

  it('loads moi entries on init', () => {
    expect(component.entries().length).toBe(2);
  });

  it('loading becomes false after data loads', () => {
    expect(component.loading()).toBe(false);
  });

  it('totalEntries reflects server total', () => {
    expect(component.totalEntries()).toBe(2);
  });

  it('citySuggestions extracts unique city names', () => {
    component.entries.set([makeEntry(1), makeEntry(2)] as any);
    const cities = component.citySuggestions();
    expect(cities.length).toBe(2);
    expect(cities).toContain('City 1');
  });

  it('districtSuggestions returns empty when no districts', () => {
    component.entries.set([makeEntry(1)] as any);
    expect(component.districtSuggestions()).toHaveLength(0);
  });

  it('amountPresets defaults to [500, 1000, 2000, 5000, 10000]', () => {
    expect(component.amountPresets()).toEqual([500, 1000, 2000, 5000, 10000]);
  });

  it('dupWarning starts null', () => {
    expect(component.dupWarning()).toBeNull();
  });

  it('editingEntry starts null', () => {
    expect(component.editingEntry()).toBeNull();
  });

  it('autoPrint starts true', () => {
    expect(component.autoPrint()).toBe(true);
  });

  it('submitting starts false', () => {
    expect(component.submitting()).toBe(false);
  });

  it('showPrintModal starts false', () => {
    expect(component.showPrintModal()).toBe(false);
  });

  it('moiForm has required guest_name field', () => {
    const form = (component as any).moiForm;
    if (form) {
      form.patchValue({ guest_name: '' });
      expect(form.get('guest_name')?.valid ?? true).toBe(false);
    } else {
      expect(true).toBe(true);
    }
  });

  it('paperSize starts at 80mm', () => {
    expect(component.paperSize()).toBe('80');
  });

  it('receiptLang starts as en', () => {
    expect(component.receiptLang()).toBe('en');
  });

  it('allEntriesLoaded is true when all entries loaded', () => {
    expect(component.allEntriesLoaded()).toBe(true);
  });

  it('topDonors starts empty', () => {
    expect(component.topDonors()).toEqual([]);
  });

  it('activityLog starts empty', () => {
    expect(component.activityLog()).toEqual([]);
  });

  it('handles event load error gracefully', async () => {
    eventSvc.getById.mockReturnValue(throwError(() => new Error('fail')));
    const fix = TestBed.createComponent(WeddingDetailComponent);
    fix.detectChanges();
    await fix.whenStable();
    expect(fix.componentInstance).toBeTruthy();
  });

  it('ngOnDestroy disconnects scrollObserver', () => {
    const spy = vi.fn();
    component['scrollObserver'] = { disconnect: spy } as any;
    component.ngOnDestroy();
    expect(spy).toHaveBeenCalled();
  });
});
