import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { NotFoundComponent, ServerErrorComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent, RouterTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has default errorCode 404', () => {
    expect(component.errorCode).toBe(404);
  });

  it('has default errorMessage', () => {
    expect(component.errorMessage).toBe('Page not found');
  });

  it('has default icon search_off', () => {
    expect(component.icon).toBe('search_off');
  });

  it('renders errorCode in template', () => {
    expect(fixture.nativeElement.querySelector('.error-code')?.textContent).toContain('404');
  });

  it('renders errorMessage in template', () => {
    expect(fixture.nativeElement.querySelector('.error-title')?.textContent).toContain('Page not found');
  });

  it('renders 404-specific detail text', () => {
    expect(fixture.nativeElement.querySelector('.error-detail')?.textContent).toContain('does not exist');
  });

  it('renders 500-specific detail text when errorCode is 500', () => {
    component.errorCode = 500;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error-detail')?.textContent).toContain('unexpected error');
  });

  it('renders generic detail text for other error codes', () => {
    component.errorCode = 403;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error-detail')?.textContent).toContain('An error occurred');
  });

  it('goBack() calls location.back()', () => {
    const location = TestBed.inject(Location);
    const backSpy = vi.spyOn(location, 'back');
    component.goBack();
    expect(backSpy).toHaveBeenCalled();
  });
});

describe('ServerErrorComponent', () => {
  let component: ServerErrorComponent;
  let fixture: ComponentFixture<ServerErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerErrorComponent, RouterTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ServerErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has default errorCode 500', () => {
    expect(component.errorCode).toBe(500);
  });

  it('has default icon error_outline', () => {
    expect(component.icon).toBe('error_outline');
  });

  it('renders 500 in template', () => {
    expect(fixture.nativeElement.querySelector('.error-code')?.textContent).toContain('500');
  });

  it('goBack() calls location.back()', () => {
    const location = TestBed.inject(Location);
    const backSpy = vi.spyOn(location, 'back');
    component.goBack();
    expect(backSpy).toHaveBeenCalled();
  });
});
