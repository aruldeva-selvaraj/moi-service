import { Component, Input, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// ── Shared template & styles ──────────────────────────────────────────────────
const ERROR_PAGE_TEMPLATE = `
  <div class="error-page-container">
    <div class="error-page-card">
      <mat-icon class="error-illustration">{{ icon }}</mat-icon>
      <div class="error-code">{{ errorCode }}</div>
      <h1 class="error-title">{{ errorMessage }}</h1>
      <p class="error-detail">
        @if (errorCode === 404) {
          The page you are looking for does not exist or has been moved.
        } @else if (errorCode === 500) {
          An unexpected error occurred. Our team has been notified. Please try again shortly.
        } @else {
          An error occurred. Please try again or return to the dashboard.
        }
      </p>
      <div class="error-actions">
        <a mat-raised-button color="primary" routerLink="/dashboard">
          <mat-icon>home</mat-icon> Go to Dashboard
        </a>
        <button mat-stroked-button color="primary" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon> Go Back
        </button>
      </div>
    </div>
  </div>
`;

const ERROR_PAGE_STYLES = [`
  .error-page-container {
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .error-page-card {
    text-align: center;
    max-width: 480px;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .error-illustration {
    font-size: 6rem;
    width: 6rem;
    height: 6rem;
    color: var(--mat-sys-primary, #6750a4);
    opacity: 0.7;
    margin-bottom: 8px;
  }
  .error-code {
    font-size: 5.5rem;
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, var(--mat-sys-primary, #6750a4), var(--mat-sys-tertiary, #9c27b0));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 4px;
  }
  .error-title {
    font-size: 1.6rem;
    font-weight: 600;
    margin: 4px 0;
    color: var(--mat-sys-on-surface, #1c1b1f);
  }
  .error-detail {
    color: var(--mat-sys-on-surface-variant, #49454f);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 4px 0 20px;
  }
  .error-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 8px;
  }
`];

const ERROR_PAGE_IMPORTS = [RouterLink, MatButtonModule, MatIconModule];

// ── NotFoundComponent (404) ───────────────────────────────────────────────────
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: ERROR_PAGE_IMPORTS,
  template: ERROR_PAGE_TEMPLATE,
  styles: ERROR_PAGE_STYLES,
})
export class NotFoundComponent {
  @Input() errorCode = 404;
  @Input() errorMessage = 'Page not found';
  @Input() icon = 'search_off';

  private location = inject(Location);
  goBack() { this.location.back(); }
}

// ── ServerErrorComponent (500) ────────────────────────────────────────────────
@Component({
  selector: 'app-server-error',
  standalone: true,
  imports: ERROR_PAGE_IMPORTS,
  template: ERROR_PAGE_TEMPLATE,
  styles: ERROR_PAGE_STYLES,
})
export class ServerErrorComponent {
  @Input() errorCode = 500;
  @Input() errorMessage = 'Something went wrong on our end';
  @Input() icon = 'error_outline';

  private location = inject(Location);
  goBack() { this.location.back(); }
}
