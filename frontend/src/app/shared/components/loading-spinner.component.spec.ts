import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has default diameter of 48', () => {
    expect(component.diameter).toBe(48);
  });

  it('renders SVG ring', () => {
    expect(fixture.nativeElement.querySelector('svg')).toBeTruthy();
  });

  it('renders logo image inside circle', () => {
    expect(fixture.nativeElement.querySelector('.ls-logo-img')).toBeTruthy();
  });

  it('does not render message when not set', () => {
    expect(fixture.nativeElement.querySelector('.ls-msg')).toBeNull();
  });

  it('renders message when set', () => {
    component.message = 'Loading data...';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ls-msg')?.textContent).toContain('Loading data...');
  });

  it('returns "32px" padding when diameter <= 32', () => {
    component.diameter = 24;
    expect(component.padding).toBe('16px');
  });

  it('returns "32px" padding when diameter is exactly 32', () => {
    component.diameter = 32;
    expect(component.padding).toBe('16px');
  });

  it('returns "32px" padding when diameter > 32', () => {
    component.diameter = 48;
    expect(component.padding).toBe('32px');
  });

  it('applies custom diameter to SVG width', () => {
    component.diameter = 64;
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('84'); // 64 + 20
  });
});
