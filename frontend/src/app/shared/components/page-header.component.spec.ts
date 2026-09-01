import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let component: PageHeaderComponent;
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
    component.title = 'Test Page';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders title', () => {
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Test Page');
  });

  it('does not render subtitle when not set', () => {
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('renders subtitle when set', () => {
    component.subtitle = 'Sub text';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p')?.textContent).toContain('Sub text');
  });

  it('does not apply row class when hasActions is false', () => {
    const el: HTMLElement = fixture.nativeElement.querySelector('.page-header');
    expect(el?.classList.contains('page-header--row')).toBe(false);
  });

  it('applies row class when hasActions is true', () => {
    component.hasActions = true;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('.page-header');
    expect(el?.classList.contains('page-header--row')).toBe(true);
  });

  it('hasActions defaults to false', () => {
    expect(component.hasActions).toBe(false);
  });
});
