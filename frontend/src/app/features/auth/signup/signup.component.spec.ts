import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SignupComponent } from './signup.component';
import { AuthService } from '../../../core/services/auth.service';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let authMock: Partial<AuthService>;

  beforeEach(async () => {
    authMock = {
      currentUser: vi.fn().mockReturnValue(null) as any,
      createUser: vi.fn().mockResolvedValue({ ok: true }),
    };

    await TestBed.configureTestingModule({
      imports: [SignupComponent, RouterTestingModule, FormsModule, MatSnackBarModule],
      providers: [{ provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
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

  it('initialises with idle state', () => {
    expect(component.state).toBe('idle');
  });

  it('has 3 roles', () => {
    expect(component.roles).toHaveLength(3);
    expect(component.roles.map(r => r.value)).toEqual(
      expect.arrayContaining(['admin', 'superadmin', 'user'])
    );
  });

  it('default role is user', () => {
    expect(component.role).toBe('user');
  });

  describe('onSubmit()', () => {
    it('sets error when username empty', async () => {
      component.username = '';
      component.password = 'pass123';
      await component.onSubmit();
      expect(component.state).toBe('error');
      expect(component.errorMsg).toBeTruthy();
    });

    it('sets error when password empty', async () => {
      component.username = 'newuser';
      component.password = '';
      await component.onSubmit();
      expect(component.state).toBe('error');
    });

    it('sets error when password too short', async () => {
      component.username = 'newuser';
      component.password = 'abc';
      component.confirmPw = 'abc';
      await component.onSubmit();
      expect(component.errorMsg).toContain('6 characters');
    });

    it('sets error when passwords do not match', async () => {
      component.username = 'newuser';
      component.password = 'pass123';
      component.confirmPw = 'different';
      await component.onSubmit();
      expect(component.errorMsg).toContain('match');
    });

    it('sets error for invalid mobile number', async () => {
      component.username = 'newuser';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      component.mobile_number = '123';
      await component.onSubmit();
      expect(component.errorMsg).toContain('10');
    });

    it('accepts valid 10-digit mobile number', async () => {
      component.username = 'newuser';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      component.mobile_number = '9876543210';
      await component.onSubmit();
      expect(component.state).toBe('success');
    });

    it('accepts empty mobile number (optional)', async () => {
      component.username = 'newuser';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      component.mobile_number = '';
      await component.onSubmit();
      expect(component.state).toBe('success');
    });

    it('sets success state and successMsg on createUser ok', async () => {
      component.username = 'newuser';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      await component.onSubmit();
      expect(component.state).toBe('success');
      expect(component.successMsg).toContain('newuser');
    });

    it('resets form fields after success', async () => {
      component.username = 'newuser';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      component.full_name = 'New User';
      await component.onSubmit();
      expect(component.username).toBe('');
      expect(component.password).toBe('');
      expect(component.full_name).toBe('');
    });

    it('sets error state on createUser failure', async () => {
      (authMock.createUser as any).mockResolvedValue({ ok: false, error: 'Username taken' });
      component.username = 'existing';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      await component.onSubmit();
      expect(component.state).toBe('error');
      expect(component.errorMsg).toBe('Username taken');
    });

    it('uses default error message when error field absent', async () => {
      (authMock.createUser as any).mockResolvedValue({ ok: false });
      component.username = 'user';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      await component.onSubmit();
      expect(component.errorMsg).toBe('Failed to create user.');
    });

    it('trims username whitespace', async () => {
      component.username = '  admin  ';
      component.password = 'pass123';
      component.confirmPw = 'pass123';
      await component.onSubmit();
      expect(authMock.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'admin' })
      );
    });
  });

  describe('clearState()', () => {
    it('resets state from error to idle', () => {
      component.state = 'error';
      component.errorMsg = 'err';
      component.clearState();
      expect(component.state).toBe('idle');
      expect(component.errorMsg).toBe('');
    });

    it('resets state from success to idle', () => {
      component.state = 'success';
      component.successMsg = 'done';
      component.clearState();
      expect(component.state).toBe('idle');
      expect(component.successMsg).toBe('');
    });

    it('does nothing when state is idle', () => {
      component.state = 'idle';
      component.clearState();
      expect(component.state).toBe('idle');
    });

    it('does nothing when state is loading', () => {
      component.state = 'loading';
      component.clearState();
      expect(component.state).toBe('loading');
    });
  });
});
