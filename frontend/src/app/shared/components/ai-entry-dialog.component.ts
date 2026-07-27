import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MoiEntryCreate } from '../../core/models/moi.model';
import { EventTypeConfig } from '../../core/models/event.model';

export interface AiEntryDialogData {
  parsed: Partial<MoiEntryCreate>;
  eventId: number;
  eventConfig: EventTypeConfig;
}

@Component({
  selector: 'app-ai-entry-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="aic">
      <h2 mat-dialog-title class="aic-title">
        <mat-icon class="aic-star">auto_awesome</mat-icon>
        Review &amp; Confirm Entry
      </h2>

      <mat-dialog-content class="aic-content">
        <p class="aic-hint">AI parsed your input — edit any field before saving.</p>

        <form [formGroup]="form">
          <div class="aic-grid">
            <mat-form-field appearance="outline">
              <mat-label>Guest Name *</mat-label>
              <input matInput formControlName="guest_name" />
              <mat-icon matPrefix>person</mat-icon>
              @if (form.get('guest_name')?.hasError('required') && form.get('guest_name')?.touched) {
                <mat-error>Required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Relationship</mat-label>
              <input matInput formControlName="relationship" placeholder="Uncle, Friend, Colleague…" />
              <mat-icon matPrefix>people</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Amount (₹) *</mat-label>
              <input matInput type="number" formControlName="amount" min="1" />
              <mat-icon matPrefix>currency_rupee</mat-icon>
              @if (form.get('amount')?.invalid && form.get('amount')?.touched) {
                <mat-error>Valid amount required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Side</mat-label>
              <mat-select formControlName="side">
                <mat-option value="groom">{{ data.eventConfig.sideAEmoji }} {{ data.eventConfig.sideALabel }}</mat-option>
                <mat-option value="bride">{{ data.eventConfig.sideBEmoji }} {{ data.eventConfig.sideBLabel }}</mat-option>
                <mat-option value="both">Both</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Payment Mode</mat-label>
              <mat-select formControlName="payment_mode">
                <mat-option value="cash">💵 Cash</mat-option>
                <mat-option value="cheque">📝 Cheque</mat-option>
                <mat-option value="online">📱 Online</mat-option>
                <mat-option value="dd">🏦 DD</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" placeholder="10-digit number" />
              <mat-icon matPrefix>phone</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>City</mat-label>
              <input matInput formControlName="city" />
              <mat-icon matPrefix>location_city</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>District</mat-label>
              <input matInput formControlName="district" />
              <mat-icon matPrefix>map</mat-icon>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="aic-full">
            <mat-label>Received By</mat-label>
            <input matInput formControlName="received_by" />
            <mat-icon matPrefix>assignment_ind</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="aic-full">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="2"></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="aic-actions">
        <button mat-stroked-button mat-dialog-close>
          <mat-icon>close</mat-icon> Cancel
        </button>
        <button mat-raised-button color="primary"
                [disabled]="form.invalid"
                (click)="confirm()">
          <mat-icon>print</mat-icon> Save &amp; Print (80mm)
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .aic { min-width: 580px; max-width: 700px; }

    .aic-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.2rem;
      padding: 20px 24px 0;
      margin: 0;
    }

    .aic-star { color: #f59e0b; }

    .aic-content { padding: 8px 24px 4px !important; }

    .aic-hint {
      font-size: 0.82rem;
      color: #888;
      margin: 0 0 12px;
    }

    .aic-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
    }

    .aic-full {
      width: 100%;
      display: block;
    }

    mat-form-field { width: 100%; }

    .aic-actions {
      padding: 12px 24px 16px;
      gap: 12px;
    }

    @media (max-width: 620px) {
      .aic { min-width: unset; }
      .aic-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AiEntryDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AiEntryDialogComponent>);
  readonly data: AiEntryDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    guest_name:      [this.data.parsed.guest_name      ?? '', Validators.required],
    relationship:    [this.data.parsed.relationship    ?? ''],
    side:            [this.data.parsed.side            ?? 'groom'],
    amount:          [this.data.parsed.amount          ?? null, [Validators.required, Validators.min(1)]],
    payment_mode:    [this.data.parsed.payment_mode    ?? 'cash'],
    cheque_number:   [this.data.parsed.cheque_number   ?? ''],
    transaction_ref: [this.data.parsed.transaction_ref ?? ''],
    city:            [this.data.parsed.city            ?? ''],
    district:        [this.data.parsed.district        ?? ''],
    phone:           [this.data.parsed.phone           ?? ''],
    notes:           [this.data.parsed.notes           ?? ''],
    received_by:     [this.data.parsed.received_by     ?? ''],
  });

  confirm(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.dialogRef.close({
      ...this.form.value,
      event_id: this.data.eventId,
    } as MoiEntryCreate);
  }
}
