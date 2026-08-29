import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog-container">
      <div class="confirm-dialog-header">
        @if (data.icon) {
          <mat-icon class="confirm-dialog-icon" [class.warn-icon]="data.confirmColor === 'warn'">{{ data.icon }}</mat-icon>
        }
        <h2 mat-dialog-title class="confirm-dialog-title">{{ data.title }}</h2>
      </div>
      <mat-dialog-content class="confirm-dialog-content">
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="confirm-dialog-actions">
        <button mat-stroked-button (click)="dialogRef.close(false)">
          {{ data.cancelLabel ?? 'Cancel' }}
        </button>
        <button mat-raised-button [color]="data.confirmColor ?? 'primary'" (click)="dialogRef.close(true)">
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog-container { min-width: 320px; max-width: 480px; }
    .confirm-dialog-header { display: flex; align-items: center; gap: 12px; padding: 20px 24px 0; }
    .confirm-dialog-icon { font-size: 28px; width: 28px; height: 28px; }
    .warn-icon { color: #f44336; }
    .confirm-dialog-title { margin: 0; font-size: 1.15rem; font-weight: 600; }
    .confirm-dialog-content { padding: 12px 24px 8px; color: rgba(0,0,0,.7); }
    .confirm-dialog-actions { padding: 8px 16px 16px; gap: 8px; }
  `],
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
