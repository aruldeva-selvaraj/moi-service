import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MoiService } from '../../../core/services/moi.service';
import { EventService } from '../../../core/services/event.service';
import { MoiEntry, MoiFilter } from '../../../core/models/moi.model';
import { Event, getEventTitle, getEventConfig } from '../../../core/models/event.model';
import { EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent, SkeletonLoaderComponent } from '../../../shared/components/index';

@Component({
  selector: 'app-moi-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatTableModule, MatSortModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule, MatPaginatorModule,
    EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent, SkeletonLoaderComponent,
  ],
  templateUrl: './moi-list.component.html',
  styleUrls: ['./moi-list.component.scss'],
})
export class MoiListComponent implements OnInit {
  private readonly moiService = inject(MoiService);
  private readonly eventService = inject(EventService);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(true);
  entries = signal<MoiEntry[]>([]);
  events = signal<Event[]>([]);
  total = signal(0);

  selectedEventId: number | null = null;
  filterSide = '';
  filterPayment = '';
  searchQuery = '';
  page = 1;
  pageSize = 20;
  sortField: 'guest_name' | 'amount' | 'created_at' | '' = '';
  sortDir: 'asc' | 'desc' = 'desc';

  displayedColumns = ['event', 'guest_name', 'side', 'amount', 'payment_mode', 'city', 'date', 'actions'];

  sortedEntries = computed(() => {
    const list = [...this.entries()];
    if (!this.sortField) return list;
    const field = this.sortField;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const av = (a as any)[field];
      const bv = (b as any)[field];
      if (typeof av === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  });

  ngOnInit() {
    this.eventService.getAll().subscribe({ next: (ev) => this.events.set(ev) });
    this.loadEntries();
  }

  getEventName(id: number): string {
    const ev = this.events().find(x => x.id === id);
    return ev ? `${getEventConfig(ev.event_type).emoji} ${getEventTitle(ev)}` : 'Unknown';
  }

  getSideLabel(side: string, eventId: number): string {
    const ev = this.events().find(x => x.id === eventId);
    const cfg = ev ? getEventConfig(ev.event_type) : getEventConfig('other');
    const labels: Record<string, string> = {
      groom: `${cfg.sideAEmoji} ${cfg.sideALabel}`,
      bride: `${cfg.sideBEmoji} ${cfg.sideBLabel}`,
      both: 'Both',
    };
    return labels[side] || side;
  }

  getSideBadge(side: string): string {
    return { groom: 'badge-groom', bride: 'badge-bride', both: 'badge-both' }[side] || '';
  }

  loadEntries() {
    this.loading.set(true);
    const filter: MoiFilter = {
      page: this.page,
      page_size: this.pageSize,
      event_id: this.selectedEventId ?? undefined,
      side: (this.filterSide as any) || undefined,
      payment_mode: (this.filterPayment as any) || undefined,
      search: this.searchQuery || undefined,
    };
    this.moiService.getAll(filter).subscribe({
      next: (resp) => {
        this.entries.set(resp.items);
        this.total.set(resp.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter() {
    this.page = 1;
    this.loadEntries();
  }

  clearFilters() {
    this.selectedEventId = null;
    this.filterSide = '';
    this.filterPayment = '';
    this.searchQuery = '';
    this.applyFilter();
  }

  onSort(field: 'guest_name' | 'amount' | 'created_at'): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = field === 'amount' ? 'desc' : 'asc';
    }
  }

  sortIcon(field: string): string {
    if (this.sortField !== field) return 'unfold_more';
    return this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  onPageChange(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadEntries();
  }

  deleteEntry(entry: MoiEntry) {
    if (confirm(`Delete moi entry for ${entry.guest_name}?`)) {
      this.moiService.delete(entry.id).subscribe({
        next: () => {
          this.snackBar.open('Entry deleted', 'Close', { duration: 2000, panelClass: 'success-snackbar' });
          this.loadEntries();
        },
        error: () => this.snackBar.open('Error deleting', 'Close', { duration: 2000, panelClass: 'error-snackbar' }),
      });
    }
  }
}
