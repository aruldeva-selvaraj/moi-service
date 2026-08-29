import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { AuthService } from '../../../core/services/auth.service';
import { Event, getEventConfig, getEventTitle } from '../../../core/models/event.model';
import { EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent, SkeletonLoaderComponent } from '../../../shared/components/index';

@Component({
  selector: 'app-confirm-complete-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Mark Event as Completed?</h2>
    <mat-dialog-content>
      <p>"{{ data.title }}" will be marked as completed. No more moi entries can be added after this.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Mark Complete</button>
    </mat-dialog-actions>
  `
})
class ConfirmCompleteDialog {
  data = inject(MAT_DIALOG_DATA) as { title: string };
}

@Component({
  selector: 'app-wedding-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule, MatDividerModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonToggleModule, MatPaginatorModule,
    MatDialogModule, FormsModule,
    EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent, SkeletonLoaderComponent,
    ConfirmCompleteDialog,
  ],
  templateUrl: './wedding-list.component.html',
  styleUrls: ['./wedding-list.component.scss'],
})
export class WeddingListComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly snackBar = inject(MatSnackBar);
  readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  loading = signal(true);
  events = signal<Event[]>([]);

  searchQuery = signal('');
  typeFilter = signal('');
  upcomingFilter = signal<'all' | 'upcoming' | 'past'>('all');
  totalMoiMin = signal<number | null>(null);
  totalMoiMax = signal<number | null>(null);
  eventsPage = signal(1);
  eventsPageSize = signal(12);

  filteredEvents = computed(() => {
    let list = this.events();
    const q = this.searchQuery().toLowerCase().trim();
    if (q) list = list.filter(e =>
      (e.primary_name || '').toLowerCase().includes(q) ||
      (e.secondary_name || '').toLowerCase().includes(q) ||
      (e.family_name || '').toLowerCase().includes(q) ||
      (e.venue || '').toLowerCase().includes(q)
    );
    if (this.typeFilter()) list = list.filter(e => e.event_type === this.typeFilter());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const up = this.upcomingFilter();
    if (up === 'upcoming') list = list.filter(e => { const d = new Date(e.event_date); d.setHours(0, 0, 0, 0); return d >= today; });
    else if (up === 'past') list = list.filter(e => { const d = new Date(e.event_date); d.setHours(0, 0, 0, 0); return d < today; });
    const mn = this.totalMoiMin(), mx = this.totalMoiMax();
    if (mn != null) list = list.filter(e => (e.total_moi ?? 0) >= mn);
    if (mx != null) list = list.filter(e => (e.total_moi ?? 0) <= mx);
    return list;
  });

  pendingEvents = computed(() => this.events().filter(e => e.status === 'pending'));
  approvedEvents = computed(() => this.events().filter(e => e.status === 'approved'));

  pagedEvents = computed(() => {
    const start = (this.eventsPage() - 1) * this.eventsPageSize();
    return this.filteredEvents().slice(start, start + this.eventsPageSize());
  });

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.loading.set(true);
    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events.set(data);
        this.loading.set(false);
        if (this.auth.isAdmin()) this.notifyPending(data.filter(e => e.status === 'pending').length);
      },
      error: () => { this.loading.set(false); },
    });
  }

  private notifyPending(count: number): void {
    if (count === 0 || !('Notification' in window)) return;
    const send = () => new Notification('Moify — Pending Approval', {
      body: `${count} event${count > 1 ? 's' : ''} waiting for your approval`,
      icon: '/favicon.ico',
    });
    if (Notification.permission === 'granted') send();
    else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') send(); });
  }

  getEventTitle(ev: Event): string { return getEventTitle(ev); }
  getEventEmoji(ev: Event): string { return getEventConfig(ev.event_type).emoji; }
  getEventTypeLabel(ev: Event): string { return getEventConfig(ev.event_type).label; }

  getEventStatusBadge(ev: Event): { label: string; css: string } | null {
    if (!ev.event_date) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const evDate = new Date(ev.event_date); evDate.setHours(0, 0, 0, 0);
    const diff = Math.round((evDate.getTime() - today.getTime()) / 86400000);
    if (diff < 0)   return { label: ev.status === 'completed' ? 'Completed' : 'Past', css: 'ev-status-done' };
    if (diff === 0) return { label: '🎉 Today!', css: 'ev-status-today' };
    if (diff <= 7)  return { label: `In ${diff} day${diff === 1 ? '' : 's'}`, css: 'ev-status-soon' };
    if (diff <= 30) return { label: `In ${diff} days`, css: 'ev-status-upcoming' };
    return null;
  }

  isEventPastDate(ev: Event): boolean {
    if (!ev.event_date) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(ev.event_date); d.setHours(0, 0, 0, 0);
    return d < today;
  }

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

  cloneEvent(id: number, e: MouseEvent): void {
    e.stopPropagation();
    this.eventService.clone(id).subscribe({
      next: () => {
        this.snackBar.open('Event cloned successfully', 'Close', { duration: 3000, panelClass: 'success-snackbar' });
        this.loadEvents();
      },
      error: () => this.snackBar.open('Error cloning event', 'Close', { duration: 3000, panelClass: 'error-snackbar' }),
    });
  }

  completeEvent(ev: Event, e: MouseEvent): void {
    e.stopPropagation();
    const ref = this.dialog.open(ConfirmCompleteDialog, {
      data: { title: getEventTitle(ev) }, width: '380px',
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.eventService.complete(ev.id).subscribe({
        next: () => {
          this.snackBar.open(`"${getEventTitle(ev)}" marked as completed`, 'Close', { duration: 3000, panelClass: 'success-snackbar' });
          this.loadEvents();
        },
        error: () => this.snackBar.open('Error completing event', 'Close', { duration: 3000, panelClass: 'error-snackbar' }),
      });
    });
  }

  onPageChange(e: PageEvent): void {
    this.eventsPage.set(e.pageIndex + 1);
    this.eventsPageSize.set(e.pageSize);
  }
}
