import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';
import { Event, getEventConfig, getEventTitle } from '../../../core/models/event.model';
import { EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent } from '../../../shared/components/index';

@Component({
  selector: 'app-wedding-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule, MatDividerModule, MatChipsModule,
    EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './wedding-list.component.html',
  styleUrls: ['./wedding-list.component.scss'],
})
export class WeddingListComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly snackBar = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  loading = signal(true);
  events = signal<Event[]>([]);

  pendingEvents = computed(() => this.events().filter(e => e.status === 'pending'));
  approvedEvents = computed(() => this.events().filter(e => e.status === 'approved'));

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.loading.set(true);
    this.eventService.getAll().subscribe({
      next: (data) => { this.events.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  getEventTitle(ev: Event): string { return getEventTitle(ev); }
  getEventEmoji(ev: Event): string { return getEventConfig(ev.event_type).emoji; }
  getEventTypeLabel(ev: Event): string { return getEventConfig(ev.event_type).label; }

  approveEvent(ev: Event, e: MouseEvent): void {
    e.stopPropagation();
    this.eventService.approve(ev.id).subscribe({
      next: () => {
        this.snackBar.open(`"${getEventTitle(ev)}" approved`, 'Close', { duration: 3000, panelClass: 'success-snackbar' });
        this.loadEvents();
      },
      error: () => this.snackBar.open('Error approving event', 'Close', { duration: 3000, panelClass: 'error-snackbar' }),
    });
  }

  rejectEvent(ev: Event, e: MouseEvent): void {
    e.stopPropagation();
    if (!confirm(`Reject and permanently delete "${getEventTitle(ev)}"? This cannot be undone.`)) return;
    this.eventService.reject(ev.id).subscribe({
      next: () => {
        this.snackBar.open(`"${getEventTitle(ev)}" rejected and deleted`, 'Close', { duration: 3500, panelClass: 'warn-snackbar' });
        this.loadEvents();
      },
      error: () => this.snackBar.open('Error rejecting event', 'Close', { duration: 3000, panelClass: 'error-snackbar' }),
    });
  }

  confirmDelete(ev: Event, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Delete "${getEventTitle(ev)}" event? All ${ev.moi_count} moi entries will also be deleted.`)) {
      this.eventService.delete(ev.id).subscribe({
        next: () => {
          this.snackBar.open('Event deleted successfully', 'Close', { duration: 3000, panelClass: 'success-snackbar' });
          this.loadEvents();
        },
        error: () => {
          this.snackBar.open('Error deleting event', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
        },
      });
    }
  }
}
