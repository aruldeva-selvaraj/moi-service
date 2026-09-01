import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WeddingFormComponent } from './wedding-form.component';
import { EventService } from '../../../core/services/event.service';

const makeEvent = () => ({
  id: 1, event_type: 'wedding', primary_name: 'Ram',
  secondary_name: 'Sita', family_name: 'Sharma',
  event_date: '2026-12-01', venue: 'Hall', city: 'Chennai',
  district: 'Chennai', notes: '', status: 'approved',
  moi_count: 0, total_moi: 0,
});

describe('WeddingFormComponent (create mode)', () => {
  let component: WeddingFormComponent;
  let fixture: ComponentFixture<WeddingFormComponent>;
  let eventSvc: any;

  beforeEach(async () => {
    eventSvc = {
      getById: vi.fn().mockReturnValue(of(makeEvent())),
      create: vi.fn().mockReturnValue(of({ id: 99 })),
      update: vi.fn().mockReturnValue(of({ id: 1 })),
    };

    await TestBed.configureTestingModule({
      imports: [WeddingFormComponent, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule],
      providers: [
        { provide: EventService, useValue: eventSvc },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: vi.fn().mockReturnValue(null) } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeddingFormComponent);
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

  it('isEdit is false in create mode', () => {
    expect(component.isEdit).toBe(false);
  });

  it('form initialises with wedding event_type', () => {
    expect(component.form.get('event_type')?.value).toBe('wedding');
  });

  it('submitting starts false', () => {
    expect(component.submitting()).toBe(false);
  });

  it('eventTypes contains all event type configs', () => {
    expect(component.eventTypes.length).toBeGreaterThan(0);
    const vals = component.eventTypes.map(et => et.value);
    expect(vals).toContain('wedding');
    expect(vals).toContain('engagement');
  });

  it('selectedEventConfig returns config for current event_type', () => {
    component.form.patchValue({ event_type: 'engagement' });
    expect(component.selectedEventConfig).toBeTruthy();
  });

  it('isPastDate returns false when no date', () => {
    component.form.patchValue({ event_date: '' });
    expect(component.isPastDate).toBe(false);
  });

  it('isPastDate returns true for past date', () => {
    component.form.patchValue({ event_date: '2020-01-01' });
    expect(component.isPastDate).toBe(true);
  });

  it('isPastDate returns false for future date', () => {
    component.form.patchValue({ event_date: '2030-01-01' });
    expect(component.isPastDate).toBe(false);
  });

  it('hasUnsavedChanges returns false when form is pristine', () => {
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('hasUnsavedChanges returns true when form is dirty', () => {
    component.form.markAsDirty();
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('hasUnsavedChanges returns false when submitting', () => {
    component.form.markAsDirty();
    component.submitting.set(true);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  describe('onSubmit()', () => {
    it('marks form touched and returns when form invalid', () => {
      component.form.patchValue({ primary_name: '', event_date: '' });
      component.onSubmit();
      expect(eventSvc.create).not.toHaveBeenCalled();
    });

    it('calls eventService.create in create mode', () => {
      component.form.patchValue({
        primary_name: 'Ram', event_date: new Date('2026-12-01'),
      });
      component.onSubmit();
      expect(eventSvc.create).toHaveBeenCalled();
    });

    it('handles create error gracefully', () => {
      eventSvc.create.mockReturnValue(throwError(() => new Error('fail')));
      component.form.patchValue({ primary_name: 'Ram', event_date: new Date('2026-12-01') });
      component.onSubmit();
      expect(component.submitting()).toBe(false);
    });

    it('formats Date object to ISO date string', () => {
      component.form.patchValue({ primary_name: 'Ram', event_date: new Date(2026, 11, 1) });
      component.onSubmit();
      expect(eventSvc.create).toHaveBeenCalledWith(
        expect.objectContaining({ event_date: '2026-12-01' })
      );
    });

    it('leaves string date as is', () => {
      component.form.patchValue({ primary_name: 'Ram', event_date: '2026-12-01' });
      component.onSubmit();
      expect(eventSvc.create).toHaveBeenCalledWith(
        expect.objectContaining({ event_date: '2026-12-01' })
      );
    });
  });
});

describe('WeddingFormComponent (edit mode)', () => {
  let component: WeddingFormComponent;
  let fixture: ComponentFixture<WeddingFormComponent>;
  let eventSvc: any;

  beforeEach(async () => {
    eventSvc = {
      getById: vi.fn().mockReturnValue(of(makeEvent())),
      create: vi.fn().mockReturnValue(of({ id: 99 })),
      update: vi.fn().mockReturnValue(of({ id: 1 })),
    };

    await TestBed.configureTestingModule({
      imports: [WeddingFormComponent, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule],
      providers: [
        { provide: EventService, useValue: eventSvc },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: vi.fn().mockReturnValue('1') } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeddingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('isEdit is true in edit mode', () => {
    expect(component.isEdit).toBe(true);
  });

  it('loads event data and patches form', () => {
    expect(component.form.get('primary_name')?.value).toBe('Ram');
  });

  it('onSubmit calls eventService.update in edit mode', () => {
    component.form.patchValue({ primary_name: 'Updated', event_date: new Date('2026-12-01') });
    component.onSubmit();
    expect(eventSvc.update).toHaveBeenCalledWith(1, expect.any(Object));
  });
});
