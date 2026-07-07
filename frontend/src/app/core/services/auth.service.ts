import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'moify_token';
const USER_KEY  = 'moify_user';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  full_name: string;
  mobile_number: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiBase = environment.apiUrl;

  isLoggedIn = signal(!!sessionStorage.getItem(TOKEN_KEY));
  currentUser = signal<AuthUser | null>(this.loadUser());

  private loadUser(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; user: AuthUser; error?: string }>(
          `${this.apiBase}/api/auth/login`,
          { username, password },
          { observe: 'body' }
        )
      );

      if (!res.token) {
        return { ok: false, error: res.error ?? 'Login failed' };
      }

      sessionStorage.setItem(TOKEN_KEY, res.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
      this.isLoggedIn.set(true);
      this.currentUser.set(res.user);
      return { ok: true };
    } catch (err: unknown) {
      const msg = this.extractError(err);
      return { ok: false, error: msg };
    }
  }

  async verifyToken(): Promise<boolean> {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      const res = await firstValueFrom(
        this.http.post<{ valid: boolean }>(`${this.apiBase}/api/auth/verify`, { token })
      );
      return res.valid === true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'superadmin';
  }

  async createUser(
    payload: { username: string; password: string; role: string; full_name?: string; mobile_number?: string }
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.http.post<{ success: boolean }>(
          `${this.apiBase}/api/auth/create-user`, payload
        )
      );
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: this.extractError(err) };
    }
  }

  async lookupUser(identifier: string): Promise<{ found: boolean; masked_name?: string; error?: string }> {
    try {
      return await firstValueFrom(
        this.http.post<{ found: boolean; masked_name?: string }>(
          `${this.apiBase}/api/auth/lookup-user`, { identifier }
        )
      );
    } catch (err: unknown) {
      return { found: false, error: this.extractError(err) };
    }
  }

  async adminResetPassword(
    admin_username: string,
    admin_password: string,
    target: string,
    new_password: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.http.post<{ success: boolean }>(
          `${this.apiBase}/api/auth/admin-reset-password`,
          { admin_username, admin_password, target, new_password }
        )
      );
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: this.extractError(err) };
    }
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  private clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
  }

  private extractError(err: unknown): string {
    if (err && typeof err === 'object') {
      const e = err as { status?: number; error?: { error?: string } };
      if (e.status === 401 || e.status === 403) {
        return e.error?.error ?? 'Invalid username or password';
      }
      if (e.status === 0) return 'Cannot connect to server. Is the backend running?';
    }
    return 'Login failed. Please try again.';
  }
}
