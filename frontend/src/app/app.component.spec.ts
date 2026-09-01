import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RouterOutlet } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DOCUMENT } from '@angular/common';
import { AppComponent } from './app.component';
import { NavComponent } from './shared/components/nav.component';
import { ThemePickerComponent } from './shared/components/theme-picker.component';
import { AuthService } from './core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  const authMock = {
    isLoggedIn: signal(false),
    currentUser: signal(null),
    isAdmin: vi.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        RouterTestingModule,
        NoopAnimationsModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('isLoginPage defaults to false', () => {
    expect(component.isLoginPage()).toBe(false);
  });

  describe('getRouteState()', () => {
    it('returns animation data when present', () => {
      const outlet = { activatedRouteData: { animation: 'dashboard' } } as any;
      expect(component.getRouteState(outlet)).toBe('dashboard');
    });

    it('returns path when no animation data', () => {
      const outlet = {
        activatedRouteData: {},
        activatedRoute: { snapshot: { url: [{ path: 'events' }] } },
      } as any;
      expect(component.getRouteState(outlet)).toBe('events');
    });

    it('returns empty string when outlet has no data or url', () => {
      const outlet = {
        activatedRouteData: {},
        activatedRoute: { snapshot: { url: [] } },
      } as any;
      expect(component.getRouteState(outlet)).toBe('');
    });

    it('returns empty string for null outlet', () => {
      expect(component.getRouteState(null as any)).toBe('');
    });
  });

  describe('ngAfterViewInit()', () => {
    it('adds hidden class to loader element and removes it', async () => {
      const doc = TestBed.inject(DOCUMENT);
      const loader = doc.createElement('div');
      loader.id = 'app-init-loader';
      doc.body.appendChild(loader);

      component.ngAfterViewInit();
      expect(loader.classList.contains('hidden')).toBe(true);

      await new Promise(r => setTimeout(r, 500));
      expect(doc.getElementById('app-init-loader')).toBeNull();
    });

    it('does nothing when loader element absent', () => {
      expect(() => component.ngAfterViewInit()).not.toThrow();
    });
  });
});
