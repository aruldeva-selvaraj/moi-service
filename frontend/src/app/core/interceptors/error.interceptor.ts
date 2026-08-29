import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Component, ViewEncapsulation } from '@angular/core';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, throwError } from 'rxjs';

interface ErrorDialogData {
  statusCode: number;
  title: string;
  message: string;
}

interface ApiErrorBody {
  error?: { message?: string } | string;
  message?: string;
}

@Component({
  selector: 'app-error-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .err-dlg-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 8px 0 4px;
      text-align: center;
    }
    .err-dlg-icon-ring {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .err-dlg-icon-ring .mat-icon {
      font-size: 32px !important;
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      color: #fff !important;
    }
    .err-dlg-badge {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 2px 10px;
      border-radius: 12px;
      display: inline-block;
    }
    .err-dlg-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
      color: #1c1b1f;
    }
    .err-dlg-msg {
      font-size: 0.9rem;
      color: #49454f;
      line-height: 1.55;
      margin: 0;
      max-width: 340px;
      word-break: break-word;
    }
  `],
  template: `
    <mat-dialog-content>
      <div class="err-dlg-wrap">
        <div class="err-dlg-icon-ring" [style.background]="iconBg">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        <span class="err-dlg-badge" [style.background]="badgeBg" [style.color]="badgeColor">
          HTTP {{ data.statusCode || 'ERR' }}
        </span>
        <p class="err-dlg-title">{{ data.title }}</p>
        <p class="err-dlg-msg">{{ data.message }}</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="center" style="padding-bottom:16px;">
      <button mat-raised-button [style.background]="iconBg" style="color:#fff;min-width:100px;" (click)="close()">
        Close
      </button>
    </mat-dialog-actions>
  `,
})
export class ErrorDialogComponent {
  readonly data = inject<ErrorDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ErrorDialogComponent>>(MatDialogRef);

  icon = 'warning_amber';
  iconBg = '#f9a825';
  badgeBg = '#fffde7';
  badgeColor = '#f57f17';

  constructor() {
    const s = this.data.statusCode;
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
    }
    // s === 0 or 4xx default: warning yellow (already set above)
  }

  close(): void {
    this.dialogRef.close();
  }
}

function extractMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  const body = error.error as ApiErrorBody | string | null | undefined;
  if (typeof body === 'string' && body.length > 0) return body;
  if (body && typeof body === 'object') {
    const err = body.error;
    if (err && typeof err === 'object' && typeof err.message === 'string') return err.message;
    if (typeof err === 'string' && err.length > 0) return err;
    if (typeof body.message === 'string' && body.message.length > 0) return body.message;
  }
  return error.message?.length ? error.message : 'An unexpected error occurred. Please try again.';
}

function getTitle(statusCode: number): string {
  const map: Record<number, string> = {
    0:   'No Connection',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Access Denied',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return map[statusCode] ?? `Error ${statusCode}`;
}

// 401 is handled by AuthService (redirect to login) — skip dialog for it
const SKIP_STATUSES = new Set([401]);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const dialog = inject(MatDialog);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!SKIP_STATUSES.has(error.status)) {
        const alreadyOpen = dialog.openDialogs.some(
          d => d.componentInstance instanceof ErrorDialogComponent,
        );
        if (!alreadyOpen) {
          const data: ErrorDialogData = {
            statusCode: error.status,
            title: getTitle(error.status),
            message: extractMessage(error),
          };
          dialog.open(ErrorDialogComponent, {
            data,
            width: '420px',
            maxWidth: '95vw',
            disableClose: false,
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
