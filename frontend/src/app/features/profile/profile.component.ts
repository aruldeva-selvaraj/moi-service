import { Component, inject, signal, effect, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '../../shared/components/index';
import { ThemePickerComponent } from '../../shared/components/theme-picker.component';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule, MatDividerModule,
    PageHeaderComponent,
    ThemePickerComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  saving = signal(false);
  profileSaving = signal(false);
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  downloading = signal(false);

  /** Language preference — persisted in localStorage */
  language = signal<string>(localStorage.getItem('moify_lang') || 'en');

  editForm = this.fb.group({
    full_name: ['', Validators.required],
    mobile_number: [''],
  });

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.editForm.patchValue({
          full_name: user.full_name || '',
          mobile_number: user.mobile_number || '',
        });
      }
    });
  }

  pwForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  /**
   * Persist the chosen language and optionally activate it via TranslateService
   * (if present). Also syncs the preference to the server profile.
   */
  setLanguage(lang: string): void {
    this.language.set(lang);
    localStorage.setItem('moify_lang', lang);

    // Opportunistically call TranslateService when available (ngx-translate).
    // We avoid a hard inject() so the component compiles without the dependency.
    try {
      const translate = (window as unknown as Record<string, unknown>)['__ngxTranslate__'];
      if (translate && typeof (translate as { use?: (l: string) => void }).use === 'function') {
        (translate as { use: (l: string) => void }).use(lang);
      }
    } catch { /* not available */ }

    // Sync to server — ignore errors silently
    this.http.patch(`${environment.apiUrl}/api/auth/profile`, { language: lang }).subscribe({
      error: () => { /* non-critical */ },
    });
  }

  updateProfile() {
    if (this.editForm.invalid) return;
    this.profileSaving.set(true);

    const currentTheme = this.themeService.config();
    const payload = {
      ...this.editForm.value,
      theme: currentTheme,
    };

    this.http.patch(`${environment.apiUrl}/api/auth/profile`, payload).subscribe({
      next: () => {
        this.snackBar.open('Profile updated', 'Close', { duration: 3000 });
        this.auth.updateCurrentUser(this.editForm.value as Partial<AuthUser>);
        this.profileSaving.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to update profile';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        this.profileSaving.set(false);
      },
    });
  }

  changePassword() {
    if (this.pwForm.invalid) return;
    this.saving.set(true);
    const { currentPassword, newPassword } = this.pwForm.value;
    this.http.post(`${environment.apiUrl}/api/auth/change-password`, {
      username: this.auth.currentUser()?.username,
      current_password: currentPassword,
      new_password: newPassword,
    }).subscribe({
      next: () => {
        this.snackBar.open('Password changed successfully', 'Close', { duration: 3000 });
        this.pwForm.reset();
        this.saving.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to change password';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        this.saving.set(false);
      },
    });
  }

  /** Download the current user's event data as a file. */
  downloadMyData(): void {
    this.downloading.set(true);
    this.http.get(`${environment.apiUrl}/api/events/export`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moify-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to export data';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        this.downloading.set(false);
      },
    });
  }
}
