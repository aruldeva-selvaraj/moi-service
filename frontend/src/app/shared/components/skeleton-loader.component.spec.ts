import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

describe('SkeletonLoaderComponent', () => {
  let component: SkeletonLoaderComponent;
  let fixture: ComponentFixture<SkeletonLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonLoaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has default variant of "lines"', () => {
    expect(component.variant).toBe('lines');
  });

  it('has default count of 3', () => {
    expect(component.count).toBe(3);
  });

  it('has default colCount of 6', () => {
    expect(component.colCount).toBe(6);
  });

  it('initialises rows to Array(3)', () => {
    expect(component.rows).toHaveLength(3);
  });

  it('initialises cols to Array(6)', () => {
    expect(component.cols).toHaveLength(6);
  });

  it('ngOnChanges updates rows from count input', () => {
    component.count = 5;
    component.ngOnChanges();
    expect(component.rows).toHaveLength(5);
  });

  it('ngOnChanges updates cols from colCount input', () => {
    component.colCount = 4;
    component.ngOnChanges();
    expect(component.cols).toHaveLength(4);
  });

  it('renders lines variant with sk-line elements', () => {
    component.variant = 'lines';
    component.count = 3;
    component.ngOnChanges();
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll('.sk-line');
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('renders cards variant with sk-card elements', () => {
    component.variant = 'cards';
    component.count = 2;
    component.ngOnChanges();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.sk-card');
    expect(cards.length).toBe(2);
  });

  it('renders table variant with sk-table', () => {
    component.variant = 'table';
    component.count = 3;
    component.colCount = 4;
    component.ngOnChanges();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sk-table')).toBeTruthy();
  });

  it('sets role="status" on wrapper', () => {
    const wrapper = fixture.nativeElement.querySelector('.skeleton-wrapper');
    expect(wrapper?.getAttribute('role')).toBe('status');
  });

  it('sets data-variant attribute', () => {
    component.variant = 'table';
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('.skeleton-wrapper');
    expect(wrapper?.getAttribute('data-variant')).toBe('table');
  });

  describe('lineWidth()', () => {
    it('returns 100% for index 0', () => {
      expect(component.lineWidth(0)).toBe('100%');
    });

    it('returns 80% for index 1', () => {
      expect(component.lineWidth(1)).toBe('80%');
    });

    it('returns 90% for index 2', () => {
      expect(component.lineWidth(2)).toBe('90%');
    });

    it('returns 65% for index 3', () => {
      expect(component.lineWidth(3)).toBe('65%');
    });

    it('returns 75% for index 4', () => {
      expect(component.lineWidth(4)).toBe('75%');
    });

    it('cycles widths for index >= 5', () => {
      expect(component.lineWidth(5)).toBe('100%');
      expect(component.lineWidth(6)).toBe('80%');
    });
  });
});
