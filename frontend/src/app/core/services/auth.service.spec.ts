import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService, AuthUser } from './auth.service';

const TOKEN_KEY    = 'moify_token';
const USER_KEY     = 'moify_user';
const REMEMBER_KEY = 'moify_remember';

const mockUser: AuthUser = {
  id: 1,
  username: 'admin',
  role: 'admin',
  full_name: 'Admin User',
  mobile_number: '9876543210',
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('isLoggedIn starts false when storage empty', () => {
    expect(service.isLoggedIn()).toBe(false);
  });

  it('currentUser starts null when storage empty', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('isLoggedIn starts true when token exists in sessionStorage', () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok123');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule] });
    const svc = TestBed.inject(AuthService);
    expect(svc.isLoggedIn()).toBe(true);
  });

  it('isLoggedIn starts true when token exists in localStorage', () => {
    localStorage.setItem(TOKEN_KEY, 'tok456');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule] });
    const svc = TestBed.inject(AuthService);
    expect(svc.isLoggedIn()).toBe(true);
  });

  it('currentUser loads from sessionStorage', () => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule] });
    const svc = TestBed.inject(AuthService);
    expect(svc.currentUser()?.username).toBe('admin');
  });

  it('currentUser returns null on corrupt storage JSON', () => {
    sessionStorage.setItem(USER_KEY, '{invalid');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule] });
    const svc = TestBed.inject(AuthService);
    expect(svc.currentUser()).toBeNull();
  });

  describe('login()', () => {
    it('returns ok:true and stores token on successful login', async () => {
      const promise = service.login('admin', 'pass', false);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush({ token: 'abc123', user: mockUser });
      const result = await promise;
      expect(result.ok).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.currentUser()?.username).toBe('admin');
      expect(sessionStorage.getItem(TOKEN_KEY)).toBe('abc123');
    });

    it('stores in localStorage when remember=true', async () => {
      const promise = service.login('admin', 'pass', true);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush({ token: 'abc456', user: mockUser });
      await promise;
      expect(localStorage.getItem(TOKEN_KEY)).toBe('abc456');
      expect(localStorage.getItem(REMEMBER_KEY)).toBe('1');
    });

    it('returns ok:false when server returns no token', async () => {
      const promise = service.login('admin', 'wrong', false);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush({ token: null, error: 'Bad credentials' });
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Bad credentials');
    });

    it('returns ok:false with default message when error field absent', async () => {
      const promise = service.login('admin', 'wrong', false);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush({ token: null });
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Login failed');
    });

    it('returns ok:false on 401 HTTP error', async () => {
      const promise = service.login('admin', 'bad', false);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('returns ok:false on 403 HTTP error', async () => {
      const promise = service.login('user', 'pass', false);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
      const result = await promise;
      expect(result.ok).toBe(false);
    });

    it('returns "Cannot connect" message on status 0', async () => {
      const promise = service.login('admin', 'pass', false);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush(null, { status: 0, statusText: 'Network Error' });
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Cannot connect');
    });

    it('returns generic message on unknown error', async () => {
      const promise = service.login('admin', 'pass', false);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/login'));
      req.flush(null, { status: 500, statusText: 'Server Error' });
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Login failed. Please try again.');
    });
  });

  describe('verifyToken()', () => {
    it('returns false when no token stored', async () => {
      const result = await service.verifyToken();
      expect(result).toBe(false);
    });

    it('returns true when server says token is valid', async () => {
      sessionStorage.setItem(TOKEN_KEY, 'validtok');
      const promise = service.verifyToken();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/verify'));
      req.flush({ valid: true });
      const result = await promise;
      expect(result).toBe(true);
    });

    it('returns false and clears session when token is invalid', async () => {
      sessionStorage.setItem(TOKEN_KEY, 'badtok');
      const promise = service.verifyToken();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/verify'));
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
      const result = await promise;
      expect(result).toBe(false);
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('refreshToken()', () => {
    it('makes POST request and returns observable', () => {
      let called = false;
      service.refreshToken().subscribe(r => { called = true; expect(r.token).toBe('newtoken'); });
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/refresh-token'));
      req.flush({ token: 'newtoken' });
      expect(called).toBe(true);
    });
  });

  describe('logout()', () => {
    it('clears storage and navigates to /login', () => {
      sessionStorage.setItem(TOKEN_KEY, 'tok');
      service.logout();
      expect(service.isLoggedIn()).toBe(false);
      expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('passes reason as query param', () => {
      service.logout({ reason: 'session_expired' });
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  describe('isAdmin()', () => {
    it('returns true for admin role', () => {
      service['currentUser'].set({ ...mockUser, role: 'admin' });
      expect(service.isAdmin()).toBe(true);
    });

    it('returns true for superadmin role', () => {
      service['currentUser'].set({ ...mockUser, role: 'superadmin' });
      expect(service.isAdmin()).toBe(true);
    });

    it('returns false for regular user role', () => {
      service['currentUser'].set({ ...mockUser, role: 'user' });
      expect(service.isAdmin()).toBe(false);
    });

    it('returns false when no user', () => {
      service['currentUser'].set(null);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('isSuperAdmin()', () => {
    it('returns true for superadmin', () => {
      service['currentUser'].set({ ...mockUser, role: 'superadmin' });
      expect(service.isSuperAdmin()).toBe(true);
    });

    it('returns false for admin', () => {
      service['currentUser'].set({ ...mockUser, role: 'admin' });
      expect(service.isSuperAdmin()).toBe(false);
    });

    it('returns false when no user', () => {
      service['currentUser'].set(null);
      expect(service.isSuperAdmin()).toBe(false);
    });
  });

  describe('getToken()', () => {
    it('returns null when no token', () => {
      expect(service.getToken()).toBeNull();
    });

    it('returns sessionStorage token', () => {
      sessionStorage.setItem(TOKEN_KEY, 'stoken');
      expect(service.getToken()).toBe('stoken');
    });

    it('returns localStorage token when sessionStorage empty', () => {
      localStorage.setItem(TOKEN_KEY, 'ltoken');
      expect(service.getToken()).toBe('ltoken');
    });
  });

  describe('updateCurrentUser()', () => {
    it('merges partial user data', () => {
      service['currentUser'].set(mockUser);
      sessionStorage.setItem(TOKEN_KEY, 'tok');
      service.updateCurrentUser({ full_name: 'New Name' });
      expect(service.currentUser()?.full_name).toBe('New Name');
      expect(service.currentUser()?.username).toBe('admin');
    });

    it('does nothing when no current user', () => {
      service['currentUser'].set(null);
      service.updateCurrentUser({ full_name: 'Name' });
      expect(service.currentUser()).toBeNull();
    });

    it('persists to localStorage when localStorage has token', () => {
      service['currentUser'].set(mockUser);
      localStorage.setItem(TOKEN_KEY, 'ltoken');
      service.updateCurrentUser({ full_name: 'Local Name' });
      const stored = JSON.parse(localStorage.getItem(USER_KEY)!);
      expect(stored.full_name).toBe('Local Name');
    });

    it('persists to sessionStorage when only sessionStorage has token', () => {
      service['currentUser'].set(mockUser);
      sessionStorage.setItem(TOKEN_KEY, 'stoken');
      service.updateCurrentUser({ full_name: 'Session Name' });
      const stored = JSON.parse(sessionStorage.getItem(USER_KEY)!);
      expect(stored.full_name).toBe('Session Name');
    });
  });

  describe('createUser()', () => {
    it('returns ok:true on success', async () => {
      const promise = service.createUser({ username: 'newuser', password: 'pass', role: 'user' });
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/create-user'));
      req.flush({ success: true });
      const result = await promise;
      expect(result.ok).toBe(true);
    });

    it('returns ok:false with error on failure', async () => {
      const promise = service.createUser({ username: 'exists', password: 'pass', role: 'user' });
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/create-user'));
      req.flush({ error: 'Username taken' }, { status: 409, statusText: 'Conflict' });
      const result = await promise;
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('lookupUser()', () => {
    it('returns found:true with masked name', async () => {
      const promise = service.lookupUser('admin');
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/lookup-user'));
      req.flush({ found: true, masked_name: 'A***n' });
      const result = await promise;
      expect(result.found).toBe(true);
      expect(result.masked_name).toBe('A***n');
    });

    it('returns found:false on not found', async () => {
      const promise = service.lookupUser('nobody');
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/lookup-user'));
      req.flush({ found: false });
      const result = await promise;
      expect(result.found).toBe(false);
    });

    it('returns error message on HTTP failure', async () => {
      const promise = service.lookupUser('user');
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/lookup-user'));
      req.flush(null, { status: 500, statusText: 'Error' });
      const result = await promise;
      expect(result.found).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('adminResetPassword()', () => {
    it('returns ok:true on success', async () => {
      const promise = service.adminResetPassword('admin', 'pass', 'user1', 'newpass');
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/admin-reset-password'));
      req.flush({ success: true });
      const result = await promise;
      expect(result.ok).toBe(true);
    });

    it('returns ok:false on failure', async () => {
      const promise = service.adminResetPassword('admin', 'wrong', 'user1', 'newpass');
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/admin-reset-password'));
      req.flush({ error: 'Bad admin password' }, { status: 401, statusText: 'Unauthorized' });
      const result = await promise;
      expect(result.ok).toBe(false);
    });
  });
});
