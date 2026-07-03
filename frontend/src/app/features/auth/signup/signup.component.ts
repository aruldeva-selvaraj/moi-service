import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatFormFieldModule, MatInputModule,
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;

  username      = '';
  full_name     = '';
  mobile_number = '';
  password      = '';
  confirmPw     = '';
  role          = 'user';
  showPw        = false;

  state: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  errorMsg = '';
  successMsg = '';

  readonly roles = [
    { value: 'admin',      label: 'Admin',       icon: 'admin_panel_settings' },
    { value: 'superadmin', label: 'Super Admin', icon: 'security' },
    { value: 'user',       label: 'User',        icon: 'person' },
  ];

  async onSubmit() {
    this.errorMsg = '';
    if (!this.username.trim() || !this.password || !this.role) {
      this.errorMsg = 'Username, password, and role are required.';
      this.state = 'error'; return;
    }
    if (this.password.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      this.state = 'error'; return;
    }
    if (this.password !== this.confirmPw) {
      this.errorMsg = 'Passwords do not match.';
      this.state = 'error'; return;
    }

    this.state = 'loading';
    const mobile = this.mobile_number.trim();
    if (mobile && !/^\d{10,15}$/.test(mobile)) {
      this.errorMsg = 'Mobile number must be 10–15 digits.';
      this.state = 'error'; return;
    }

    const result = await this.auth.createUser({
      username:      this.username.trim(),
      password:      this.password,
      role:          this.role,
      full_name:     this.full_name.trim() || undefined,
      mobile_number: mobile || undefined,
    });

    if (result.ok) {
      this.state = 'success';
      this.successMsg = `User "${this.username.trim()}" created successfully!`;
      this.resetForm();
    } else {
      this.state = 'error';
      this.errorMsg = result.error ?? 'Failed to create user.';
    }
  }

  clearState() {
    if (this.state === 'error' || this.state === 'success') {
      this.state = 'idle';
      this.errorMsg = '';
      this.successMsg = '';
    }
  }

  private resetForm() {
    this.username      = '';
    this.full_name     = '';
    this.mobile_number = '';
    this.password      = '';
    this.confirmPw     = '';
    this.role          = 'user';
    this.showPw        = false;
  }
}
