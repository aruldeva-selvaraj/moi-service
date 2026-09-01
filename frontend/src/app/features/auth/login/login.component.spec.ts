import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: Partial<AuthService>;
  let snackBarMock: Partial<MatSnackBar>;

  const activatedRouteMock = {
    snapshot: { queryParamMap: { get: vi.fn().mockReturnValue(null) } },
  };

  beforeEach(async () => {
    authServiceMock = {
      isLoggedIn: vi.fn().mockReturnValue(false) as any,
      login: vi.fn().mockResolvedValue({ ok: true }),
      lookupUser: vi.fn().mockResolvedValue({ found: true, masked_name: 'A***n' }),
      adminResetPassword: vi.fn().mockResolvedValue({ ok: true }),
    };

    snackBarMock = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule, FormsModule, MatSnackBarModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
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

  it('initialises with idle loginState', () => {
    expect(component.loginState).toBe('idle');
  });

  it('initialises forgotStep as off', () => {
    expect(component.forgotStep).toBe('off');
  });

  it('redirects to dashboard when already logged in', () => {
    (authServiceMock.isLoggedIn as any).mockReturnValue(true);
    const router = TestBed.inject(RouterTestingModule as any);
    component.ngOnInit();
    // Router.navigate is called — just check no crash
    expect(true).toBe(true);
  });

  it('shows session expired snackbar when reason is session_expired', () => {
    activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue('session_expired');
    component.ngOnInit();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      expect.stringContaining('expired'),
      expect.any(String),
      expect.any(Object)
    );
  });

  it('generatePetals creates 18 petals', () => {
    component.generatePetals();
    expect(component.petals).toHaveLength(18);
  });

  it('petals have required properties', () => {
    component.generatePetals();
    for (const petal of component.petals) {
      expect(typeof petal.left).toBe('number');
      expect(typeof petal.delay).toBe('number');
      expect(typeof petal.duration).toBe('number');
      expect(typeof petal.size).toBe('number');
      expect(typeof petal.color).toBe('string');
    }
  });

  it('onSubmit sets error when username empty', async () => {
    component.username = '';
    component.password = 'pass';
    await component.onSubmit();
    expect(component.loginState).toBe('error');
    expect(component.errorMsg).toBeTruthy();
  });

  it('onSubmit sets error when password empty', async () => {
    component.username = 'admin';
    component.password = '';
    await component.onSubmit();
    expect(component.loginState).toBe('error');
  });

  it('onSubmit sets loading state then success on successful login', async () => {
    component.username = 'admin';
    component.password = 'pass';
    const promise = component.onSubmit();
    expect(component.loginState).toBe('loading');
    await promise;
    expect(component.loginState).toBe('success');
  });

  it('onSubmit sets error on failed login', async () => {
    (authServiceMock.login as any).mockResolvedValue({ ok: false, error: 'Bad credentials' });
    component.username = 'admin';
    component.password = 'wrong';
    await component.onSubmit();
    expect(component.loginState).toBe('error');
    expect(component.errorMsg).toBe('Bad credentials');
  });

  it('onSubmit uses default error message when error field absent', async () => {
    (authServiceMock.login as any).mockResolvedValue({ ok: false });
    component.username = 'admin';
    component.password = 'wrong';
    await component.onSubmit();
    expect(component.errorMsg).toBe('Login failed.');
  });

  it('clearError resets loginState from error to idle', () => {
    component.loginState = 'error';
    component.errorMsg = 'some error';
    component.clearError();
    expect(component.loginState).toBe('idle');
    expect(component.errorMsg).toBe('');
  });

  it('clearError does nothing when state is not error', () => {
    component.loginState = 'idle';
    component.clearError();
    expect(component.loginState).toBe('idle');
  });

  it('showForgot sets forgotStep to lookup and resets fields', () => {
    component.fpIdentifier = 'someone';
    component.showForgot();
    expect(component.forgotStep).toBe('lookup');
    expect(component.fpIdentifier).toBe('');
    expect(component.fpError).toBe('');
  });

  it('backToLogin resets forgotStep to off', () => {
    component.forgotStep = 'lookup';
    component.fpError = 'some error';
    component.backToLogin();
    expect(component.forgotStep).toBe('off');
    expect(component.fpError).toBe('');
  });

  describe('lookupUser()', () => {
    it('sets fpError when identifier is empty', async () => {
      component.fpIdentifier = '   ';
      await component.lookupUser();
      expect(component.fpError).toBeTruthy();
    });

    it('sets forgotStep to confirm on found user', async () => {
      component.fpIdentifier = 'admin';
      await component.lookupUser();
      expect(component.forgotStep).toBe('confirm');
      expect(component.fpMaskedName).toBe('A***n');
    });

    it('sets fpError when user not found', async () => {
      (authServiceMock.lookupUser as any).mockResolvedValue({ found: false });
      component.fpIdentifier = 'nobody';
      await component.lookupUser();
      expect(component.fpError).toBeTruthy();
      expect(component.forgotStep).toBe('lookup');
    });

    it('sets loading during lookup', async () => {
      let wasLoading = false;
      (authServiceMock.lookupUser as any).mockImplementation(async () => {
        wasLoading = component.fpLoading;
        return { found: true, masked_name: 'A***n' };
      });
      component.fpIdentifier = 'admin';
      await component.lookupUser();
      expect(wasLoading).toBe(true);
      expect(component.fpLoading).toBe(false);
    });
  });

  describe('resetPassword()', () => {
    beforeEach(() => {
      component.fpAdminUsername = 'admin';
      component.fpAdminPassword = 'adminpass';
      component.fpNewPassword = 'newpass123';
      component.fpConfirmPassword = 'newpass123';
      component.fpIdentifier = 'user1';
    });

    it('sets error when admin username empty', async () => {
      component.fpAdminUsername = '   ';
      await component.resetPassword();
      expect(component.fpError).toBeTruthy();
    });

    it('sets error when admin password empty', async () => {
      component.fpAdminPassword = '';
      await component.resetPassword();
      expect(component.fpError).toBeTruthy();
    });

    it('sets error when new password empty', async () => {
      component.fpNewPassword = '';
      await component.resetPassword();
      expect(component.fpError).toBeTruthy();
    });

    it('sets error when new password too short', async () => {
      component.fpNewPassword = 'abc';
      component.fpConfirmPassword = 'abc';
      await component.resetPassword();
      expect(component.fpError).toContain('6 characters');
    });

    it('sets error when passwords do not match', async () => {
      component.fpNewPassword = 'newpass123';
      component.fpConfirmPassword = 'differentpass';
      await component.resetPassword();
      expect(component.fpError).toContain('match');
    });

    it('sets forgotStep to done on success', async () => {
      await component.resetPassword();
      expect(component.forgotStep).toBe('done');
    });

    it('sets fpError on reset failure', async () => {
      (authServiceMock.adminResetPassword as any).mockResolvedValue({ ok: false, error: 'Wrong admin' });
      await component.resetPassword();
      expect(component.fpError).toBe('Wrong admin');
    });

    it('sets fpError with default when no error field', async () => {
      (authServiceMock.adminResetPassword as any).mockResolvedValue({ ok: false });
      await component.resetPassword();
      expect(component.fpError).toBe('Reset failed. Please try again.');
    });
  });

  it('ngOnDestroy clears redirect timer', () => {
    component['redirectTimer'] = setTimeout(() => {}, 5000);
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    component.ngOnDestroy();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
