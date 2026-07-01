import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EventService } from '../../../core/services/event.service';
import { EventType, EVENT_TYPE_CONFIGS, getEventConfig } from '../../../core/models/event.model';
import { PageHeaderComponent } from '../../../shared/components/index';

@Component({
  selector: 'app-wedding-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    PageHeaderComponent,
  ],
  templateUrl: './wedding-form.component.html',
  styleUrls: ['./wedding-form.component.scss'],
})
export class WeddingFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly snackBar = inject(MatSnackBar);

  isEdit = false;
  eventId?: number;
  submitting = signal(false);

  readonly eventTypes: { value: EventType; label: string; emoji: string }[] = Object.entries(EVENT_TYPE_CONFIGS).map(
    ([value, cfg]) => ({ value: value as EventType, label: cfg.label, emoji: cfg.emoji })
  );

  form: FormGroup = this.fb.group({
    event_type: ['wedding', Validators.required],
    primary_name: ['', [Validators.required, Validators.minLength(1)]],
    secondary_name: [''],
    family_name: [''],
    event_date: ['', Validators.required],
    venue: [''],
    city: [''],
    notes: [''],
  });

  get selectedEventConfig() {
    return getEventConfig(this.form.get('event_type')?.value ?? 'wedding');
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.eventId = +id;
      this.eventService.getById(this.eventId).subscribe({
        next: (ev) => {
          this.form.patchValue({ ...ev, event_date: new Date(ev.event_date) });
        },
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formValue = { ...this.form.value };

    if (formValue.event_date instanceof Date) {
      formValue.event_date = formValue.event_date.toISOString().split('T')[0];
    }

    const obs = this.isEdit && this.eventId
      ? this.eventService.update(this.eventId, formValue)
      : this.eventService.create(formValue);

    obs.subscribe({
      next: (ev) => {
        this.snackBar.open(
          this.isEdit ? 'Event updated!' : 'Event created!',
          'Close', { duration: 3000, panelClass: 'success-snackbar' },
        );
        this.router.navigate(['/events', ev.id]);
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open('Error saving event', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
      },
    });
  }
}
