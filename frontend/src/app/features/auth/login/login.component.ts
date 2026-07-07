import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  showPassword = false;
  loginState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  errorMsg = '';

  petals: { left: number; delay: number; duration: number; size: number; color: string }[] = [];
  private redirectTimer?: ReturnType<typeof setTimeout>;

  // ── Forgot password state ──────────────────────────────────────────────────
  forgotStep: 'off' | 'lookup' | 'confirm' | 'done' = 'off';
  fpIdentifier = '';
  fpMaskedName = '';
  fpAdminUsername = '';
  fpAdminPassword = '';
  fpNewPassword = '';
  fpConfirmPassword = '';
  fpShowAdminPw = false;
  fpShowNewPw = false;
  fpShowConfirmPw = false;
  fpLoading = false;
  fpError = '';

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.generatePetals();
  }

  ngOnDestroy() {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }

  generatePetals() {
    const colors = ['#e91e63','#f06292','#ff8a65','#ffcc02','#ce93d8','#81c784','#4fc3f7'];
    this.petals = Array.from({ length: 18 }, (_, i) => ({
      left: (i * 5.5 + Math.random() * 4) % 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 6,
      size: 8 + Math.random() * 10,
      color: colors[i % colors.length],
    }));
  }

  async onSubmit() {
    if (!this.username || !this.password) {
      this.errorMsg = 'Please enter username and password.';
      this.loginState = 'error';
      return;
    }

    this.loginState = 'loading';
    this.errorMsg = '';

    const result = await this.auth.login(this.username, this.password);

    if (result.ok) {
      this.loginState = 'success';
      this.redirectTimer = setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2200);
    } else {
      this.loginState = 'error';
      this.errorMsg = result.error ?? 'Login failed.';
    }
  }

  clearError() {
    if (this.loginState === 'error') {
      this.loginState = 'idle';
      this.errorMsg = '';
    }
  }

  // ── Forgot password methods ────────────────────────────────────────────────
  showForgot() {
    this.forgotStep = 'lookup';
    this.fpIdentifier = '';
    this.fpMaskedName = '';
    this.fpAdminUsername = '';
    this.fpAdminPassword = '';
    this.fpNewPassword = '';
    this.fpConfirmPassword = '';
    this.fpError = '';
  }

  backToLogin() {
    this.forgotStep = 'off';
    this.fpError = '';
  }

  async lookupUser() {
    if (!this.fpIdentifier.trim()) {
      this.fpError = 'Please enter your username or mobile number.';
      return;
    }
    this.fpLoading = true;
    this.fpError = '';
    const res = await this.auth.lookupUser(this.fpIdentifier.trim());
    this.fpLoading = false;
    if (!res.found) {
      this.fpError = 'No account found with that username or mobile number.';
      return;
    }
    this.fpMaskedName = res.masked_name ?? '';
    this.forgotStep = 'confirm';
  }

  async resetPassword() {
    if (!this.fpAdminUsername.trim() || !this.fpAdminPassword) {
      this.fpError = 'Enter admin username and password.';
      return;
    }
    if (!this.fpNewPassword) {
      this.fpError = 'Enter a new password.';
      return;
    }
    if (this.fpNewPassword.length < 6) {
      this.fpError = 'New password must be at least 6 characters.';
      return;
    }
    if (this.fpNewPassword !== this.fpConfirmPassword) {
      this.fpError = 'Passwords do not match.';
      return;
    }
    this.fpLoading = true;
    this.fpError = '';
    const res = await this.auth.adminResetPassword(
      this.fpAdminUsername.trim(),
      this.fpAdminPassword,
      this.fpIdentifier.trim(),
      this.fpNewPassword,
    );
    this.fpLoading = false;
    if (!res.ok) {
      this.fpError = res.error ?? 'Reset failed. Please try again.';
      return;
    }
    this.forgotStep = 'done';
  }
}
