import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { UserManagementComponent } from './user-management.component';
import { AuthService } from '../../core/services/auth.service';

const makeUser = (id: number, role = 'user', active = true) => ({
  id, username: `user${id}`, full_name: `User ${id}`,
  mobile_number: '9876543210', role, is_active: active,
  created_at: new Date().toISOString(),
});

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let httpMock: HttpTestingController;
  let authMock: any;

  beforeEach(async () => {
    authMock = {
      isLoggedIn: signal(true),
      currentUser: signal(makeUser(0, 'superadmin')),
      isAdmin: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [
        UserManagementComponent, RouterTestingModule, NoopAnimationsModule,
        MatSnackBarModule, MatDialogModule, HttpClientTestingModule,
      ],
      providers: [
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne(r => r.url.includes('/api/auth/users'));
    req.flush({ users: [makeUser(1), makeUser(2, 'admin'), makeUser(3, 'superadmin')] });
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads users on init', () => {
    expect(component.users().length).toBe(3);
  });

  it('loading becomes false after users load', () => {
    expect(component.loading()).toBe(false);
  });

  describe('filteredUsers computed()', () => {
    it('returns all when no search', () => {
      expect(component.filteredUsers().length).toBe(3);
    });

    it('filters by username', () => {
      component.search.set('user1');
      expect(component.filteredUsers().length).toBe(1);
    });

    it('filters by full_name', () => {
      component.search.set('User 2');
      expect(component.filteredUsers().length).toBe(1);
    });

    it('filters by mobile_number', () => {
      component.search.set('9876543210');
      expect(component.filteredUsers().length).toBe(3);
    });

    it('returns empty for no match', () => {
      component.search.set('zzznomatch');
      expect(component.filteredUsers().length).toBe(0);
    });
  });

  describe('roleColor()', () => {
    it('returns warn for superadmin', () => {
      expect(component.roleColor('superadmin')).toBe('warn');
    });

    it('returns accent for admin', () => {
      expect(component.roleColor('admin')).toBe('accent');
    });

    it('returns primary for user', () => {
      expect(component.roleColor('user')).toBe('primary');
    });
  });

  describe('inline edit methods', () => {
    it('startEdit sets editingUserId and pre-fills edit signals', () => {
      component.startEdit(makeUser(1) as any);
      expect(component.editingUserId()).toBe(1);
      expect(component.editName()).toBe('User 1');
      expect(component.editMobile()).toBe('9876543210');
    });

    it('cancelEdit clears editingUserId', () => {
      component.editingUserId.set(1);
      component.cancelEdit();
      expect(component.editingUserId()).toBeNull();
    });

    it('saveEdit patches user and clears editingUserId on success', () => {
      component.users.set([makeUser(1)] as any);
      component.editingUserId.set(1);
      component.editName.set('Updated Name');
      component.editMobile.set('1234567890');
      component.saveEdit(1);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/users/1') && r.method === 'PATCH');
      req.flush({});
      expect(component.editingUserId()).toBeNull();
      expect(component.users().find(u => u.id === 1)?.full_name).toBe('Updated Name');
    });

    it('saveEdit shows error on HTTP failure', () => {
      component.users.set([makeUser(1)] as any);
      component.editingUserId.set(1);
      component.saveEdit(1);
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/users/1'));
      req.flush({}, { status: 500, statusText: 'Error' });
      expect(component.editingUserId()).toBe(1);
    });
  });

  describe('updateRole()', () => {
    it('does nothing when old role equals new role', () => {
      const user = makeUser(1, 'user') as any;
      component.users.set([user]);
      component.updateRole(user, 'user');
      httpMock.expectNone(() => true);
    });

    it('optimistically updates role signal', () => {
      component.users.set([makeUser(1, 'user')] as any);
      const user = component.users()[0];
      component.updateRole(user, 'admin');
      expect(component.users().find(u => u.id === 1)?.role).toBe('admin');
      const patchReq = httpMock.expectOne(r => r.url.includes('/api/auth/users/1/role'));
      patchReq.flush({});
    });
  });

  describe('loadUsers()', () => {
    it('handles flat array response', () => {
      component.loadUsers();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/users'));
      req.flush([makeUser(10), makeUser(11)]);
      expect(component.users().length).toBe(2);
    });

    it('handles HTTP error gracefully', () => {
      component.loadUsers();
      const req = httpMock.expectOne(r => r.url.includes('/api/auth/users'));
      req.flush({}, { status: 500, statusText: 'Error' });
      expect(component.loading()).toBe(false);
    });
  });
});
