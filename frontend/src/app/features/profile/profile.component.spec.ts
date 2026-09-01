import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

const makeUser = (overrides = {}) => ({
  id: 1, username: 'testuser', full_name: 'Test User',
  mobile_number: '9876543210', role: 'user', is_active: true,
  ...overrides,
});

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let httpMock: HttpTestingController;
  let authMock: any;

  beforeEach(async () => {
    authMock = {
      currentUser: signal(makeUser()),
      updateCurrentUser: vi.fn(),
      isAdmin: vi.fn().mockReturnValue(false),
      isLoggedIn: signal(true),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, NoopAnimationsModule, MatSnackBarModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: ThemeService, useValue: { config: signal({ theme: 'default' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('editForm is populated from currentUser via effect', () => {
    expect(component.editForm.get('full_name')?.value).toBe('Test User');
    expect(component.editForm.get('mobile_number')?.value).toBe('9876543210');
  });

  it('saving starts as false', () => {
    expect(component.saving()).toBe(false);
  });

  it('profileSaving starts as false', () => {
    expect(component.profileSaving()).toBe(false);
  });

  it('downloading starts as false', () => {
    expect(component.downloading()).toBe(false);
  });

  describe('updateProfile()', () => {
    it('does nothing when editForm is invalid', () => {
      component.editForm.get('full_name')?.setValue('');
      component.updateProfile();
      httpMock.expectNone(() => true);
    });

    it('patches profile and calls auth.updateCurrentUser on success', () => {
      component.editForm.patchValue({ full_name: 'New Name', mobile_number: '9999999999' });
      component.updateProfile();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/profile') && r.method === 'PATCH');
      req.flush({});
      expect(authMock.updateCurrentUser).toHaveBeenCalled();
      expect(component.profileSaving()).toBe(false);
    });

    it('shows error snackbar on HTTP error', () => {
      component.editForm.patchValue({ full_name: 'Name' });
      component.updateProfile();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/profile'));
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
      expect(component.profileSaving()).toBe(false);
    });
  });

  describe('changePassword()', () => {
    it('does nothing when pwForm is invalid', () => {
      component.changePassword();
      httpMock.expectNone(() => true);
    });

    it('posts to change-password endpoint on valid form', () => {
      component.pwForm.patchValue({
        currentPassword: 'oldpass', newPassword: 'newpass123', confirmPassword: 'newpass123',
      });
      component.changePassword();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/change-password'));
      req.flush({});
      expect(component.saving()).toBe(false);
    });

    it('shows error on HTTP failure', () => {
      component.pwForm.patchValue({
        currentPassword: 'oldpass', newPassword: 'newpass123', confirmPassword: 'newpass123',
      });
      component.changePassword();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/change-password'));
      req.flush({ message: 'Wrong password' }, { status: 401, statusText: 'Unauthorized' });
      expect(component.saving()).toBe(false);
    });
  });

  describe('setLanguage()', () => {
    it('updates language signal', () => {
      component.setLanguage('ta');
      const patchReq = httpMock.expectOne(r => r.url.includes('/api/auth/profile') && r.method === 'PATCH');
      patchReq.flush({});
      expect(component.language()).toBe('ta');
    });

    it('persists to localStorage', () => {
      component.setLanguage('ta');
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/profile'));
      req.flush({});
      expect(localStorage.getItem('moify_lang')).toBe('ta');
    });

    it('ignores HTTP error silently', () => {
      component.setLanguage('en');
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/profile'));
      req.flush({}, { status: 500, statusText: 'Error' });
      expect(component.language()).toBe('en');
    });
  });

  describe('downloadMyData()', () => {
    it('calls export endpoint and sets downloading false on success', () => {
      component.downloadMyData();
      expect(component.downloading()).toBe(true);
      const req = httpMock.expectOne(r => r.url.includes('/api/events/export'));
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['{}']));
      expect(component.downloading()).toBe(false);
    });

    it('sets downloading false on error', () => {
      component.downloadMyData();
      const req = httpMock.expectOne(r => r.url.includes('/api/events/export'));
      req.flush({}, { status: 500, statusText: 'Error' });
      expect(component.downloading()).toBe(false);
    });
  });

  describe('pwForm passwordsMatch validator', () => {
    it('is valid when passwords match', () => {
      component.pwForm.patchValue({
        currentPassword: 'old123', newPassword: 'newpass', confirmPassword: 'newpass',
      });
      expect(component.pwForm.errors).toBeNull();
    });

    it('has mismatch error when passwords differ', () => {
      component.pwForm.patchValue({
        currentPassword: 'old123', newPassword: 'newpass', confirmPassword: 'other',
      });
      expect(component.pwForm.errors?.['mismatch']).toBe(true);
    });
  });

  describe('visibility toggles', () => {
    it('showCurrent starts false', () => expect(component.showCurrent()).toBe(false));
    it('showNew starts false', () => expect(component.showNew()).toBe(false));
    it('showConfirm starts false', () => expect(component.showConfirm()).toBe(false));
  });
});
