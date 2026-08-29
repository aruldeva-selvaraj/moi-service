import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Component, Inject } from '@angular/core';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, throwError } from 'rxjs';

interface ErrorDialogData {
  statusCode: number;
  title: string;
  message: string;
}

@Component({
  selector: 'app-error-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  styles: [`
    .error-dialog-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 8px 0 4px;
      text-align: center;
    }
    .error-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .error-icon-circle mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #fff;
    }
    .status-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 2px 10px;
      border-radius: 12px;
      display: inline-block;
    }
    .error-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin: 0;
      color: #1c1b1f;
    }
    .error-message {
      font-size: 0.92rem;
      color: #49454f;
      line-height: 1.55;
      margin: 0;
      max-width: 340px;
    }
  `],
  template: `
    <mat-dialog-content>
      <div class="error-dialog-wrapper">
        <div class="error-icon-circle" [style.background]="iconBg">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        <span class="status-badge" [style.background]="badgeBg" [style.color]="badgeColor">
          HTTP {{ data.statusCode }}
        </span>
        <p class="error-title">{{ data.title }}</p>
        <p class="error-message">{{ data.message }}</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="center" style="padding-bottom:16px;">
      <button mat-raised-button [style.background]="iconBg" style="color:#fff;min-width:100px;" (click)="close()">
        Close
      </button>
    </mat-dialog-actions>
  `
})
export class ErrorDialogComponent {
  icon: string;
  iconBg: string;
  badgeBg: string;
  badgeColor: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ErrorDialogData,
    private readonly dialogRef: MatDialogRef<ErrorDialogComponent>,
  ) {
    const s = data.statusCode;
    if (s === 0) {
      this.icon = 'wifi_off';
      this.iconBg = '#607d8b';
      this.badgeBg = '#eceff1';
      this.badgeColor = '#455a64';
    } else if (s >= 500) {
      this.icon = 'dns';
      this.iconBg = '#d32f2f';
      this.badgeBg = '#ffebee';
      this.badgeColor = '#c62828';
    } else if (s === 403) {
      this.icon = 'lock';
      this.iconBg = '#f57c00';
      this.badgeBg = '#fff3e0';
      this.badgeColor = '#e65100';
    } else if (s === 404) {
      this.icon = 'search_off';
      this.iconBg = '#5c6bc0';
      this.badgeBg = '#e8eaf6';
      this.badgeColor = '#3949ab';
    } else if (s === 409) {
      this.icon = 'sync_problem';
      this.iconBg = '#7b1fa2';
      this.badgeBg = '#f3e5f5';
      this.badgeColor = '#6a1b9a';
    } else {
      this.icon = 'warning_amber';
      this.iconBg = '#f9a825';
      this.badgeBg = '#fffde7';
      this.badgeColor = '#f57f17';
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

function extractMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Unable to reach the server. Please check your internet connection or try again later.';
  }
  const body = error.error;
  if (body) {
    if (typeof body === 'string') return body;
    if (body.error?.message) return body.error.message;
    if (body.message) return body.message;
    if (body.error && typeof body.error === 'string') return body.error;
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

function getTitle(statusCode: number): string {
  const titles: Record<number, string> = {
    0:   'No Connection',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Access Denied',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return titles[statusCode] ?? `Error ${statusCode}`;
}

// Errors that are already handled gracefully by the component (snackbar, redirect, etc.)
const SKIP_STATUSES = new Set([401]);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const dialog = inject(MatDialog);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!SKIP_STATUSES.has(error.status)) {
        // Avoid stacking duplicate dialogs for the same status
        const alreadyOpen = dialog.openDialogs.some(
          d => d.componentInstance instanceof ErrorDialogComponent &&
               d.componentInstance.data?.statusCode === error.status
        );
        if (!alreadyOpen) {
          dialog.open(ErrorDialogComponent, {
            data: {
              statusCode: error.status,
              title: getTitle(error.status),
              message: extractMessage(error),
            } satisfies ErrorDialogData,
            width: '420px',
            maxWidth: '95vw',
            disableClose: false,
            panelClass: 'error-dialog-panel',
          });
        }
      }
      return throwError(() => error);
    })
  );
};
