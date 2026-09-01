import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    component.icon = '💰';
    component.value = '₹1,000';
    component.label = 'Total';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders icon', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-icon')?.textContent).toContain('💰');
  });

  it('renders value', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-value')?.textContent).toContain('₹1,000');
  });

  it('renders label', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-label')?.textContent).toContain('Total');
  });

  it('does not render sub element when sub is not set', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-sub')).toBeNull();
  });

  it('renders sub element when sub is set', () => {
    component.sub = '25%';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-sub')?.textContent).toContain('25%');
  });

  it('renders numeric value', () => {
    component.value = 42;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-value')?.textContent).toContain('42');
  });

  it('renders null value as empty', () => {
    component.value = null;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-value')?.textContent?.trim()).toBe('');
  });

  it('hides sub when sub is null', () => {
    component.sub = null;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.stat-sub')).toBeNull();
  });
});
