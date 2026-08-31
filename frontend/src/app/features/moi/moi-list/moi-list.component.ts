import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, DestroyRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, lastValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MoiService } from '../../../core/services/moi.service';
import { ReceiptService } from '../../../core/services/receipt.service';
import { EventService } from '../../../core/services/event.service';
import { MoiEntry, MoiFilter } from '../../../core/models/moi.model';
import { Event, getEventTitle, getEventConfig } from '../../../core/models/event.model';
import { EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent, SkeletonLoaderComponent } from '../../../shared/components/index';

@Component({
  selector: 'app-confirm-delete-moi-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Delete Entry?</h2>
    <mat-dialog-content><p id="confirm-desc">Delete moi entry for "{{ data.name }}"? This cannot be undone.</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true" aria-describedby="confirm-desc">Delete</button>
    </mat-dialog-actions>
  `
})
class ConfirmDeleteMoiDialog {
  data = inject(MAT_DIALOG_DATA) as { name: string };
}

@Component({
  selector: 'app-quick-add-moi-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Quick Add Moi Entry</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px;">
        <mat-form-field appearance="outline">
          <mat-label>Event</mat-label>
          <mat-select formControlName="event_id" required>
            @for (ev of data.events; track ev.id) {
              <mat-option [value]="ev.id">{{ ev.primary_name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Guest Name</mat-label>
          <input matInput formControlName="guest_name" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount (₹)</mat-label>
          <input matInput type="number" formControlName="amount" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Side</mat-label>
          <mat-select formControlName="side">
            <mat-option value="groom">Groom</mat-option>
            <mat-option value="bride">Bride</mat-option>
            <mat-option value="both">Both</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Payment Mode</mat-label>
          <mat-select formControlName="payment_mode">
            <mat-option value="cash">Cash</mat-option>
            <mat-option value="cheque">Cheque</mat-option>
            <mat-option value="online">Online/UPI</mat-option>
            <mat-option value="dd">DD</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="submit()">Add Entry</button>
    </mat-dialog-actions>
  `
})
class QuickAddMoiDialog {
  data = inject(MAT_DIALOG_DATA) as { events: Event[] };
  private readonly dialogRef = inject<MatDialogRef<QuickAddMoiDialog>>(MatDialogRef);
  private readonly moiService = inject(MoiService);
  form: FormGroup = inject(FormBuilder).group({
    event_id: [null, Validators.required],
    guest_name: ['', Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]],
    side: ['groom'],
    payment_mode: ['cash'],
  });
  submit(): void {
    if (this.form.invalid) return;
    this.moiService.create(this.form.value).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {},
    });
  }
}

@Component({
  selector: 'app-edit-moi-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Edit Moi Entry</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px;">
        <mat-form-field appearance="outline">
          <mat-label>Event</mat-label>
          <mat-select formControlName="event_id" required>
            @for (ev of data.events; track ev.id) {
              <mat-option [value]="ev.id">{{ ev.primary_name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Guest Name</mat-label>
          <input matInput formControlName="guest_name" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Amount (₹)</mat-label>
          <input matInput type="number" formControlName="amount" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Relationship</mat-label>
          <input matInput formControlName="relationship" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>City</mat-label>
          <input matInput formControlName="city" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Side</mat-label>
          <mat-select formControlName="side">
            <mat-option value="groom">Groom</mat-option>
            <mat-option value="bride">Bride</mat-option>
            <mat-option value="both">Both</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Payment Mode</mat-label>
          <mat-select formControlName="payment_mode">
            <mat-option value="cash">Cash</mat-option>
            <mat-option value="cheque">Cheque</mat-option>
            <mat-option value="online">Online/UPI</mat-option>
            <mat-option value="dd">DD</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Received By</mat-label>
          <input matInput formControlName="received_by" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="submit()">Save Changes</button>
    </mat-dialog-actions>
  `
})
class EditMoiDialog {
  readonly data = inject(MAT_DIALOG_DATA) as { entry: MoiEntry; events: Event[] };
  private readonly dialogRef = inject<MatDialogRef<EditMoiDialog>>(MatDialogRef);
  private readonly moiService = inject(MoiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  form!: FormGroup;

  constructor() {
    const e = this.data.entry;
    this.form = this.fb.group({
      event_id:     [e.event_id,           Validators.required],
      guest_name:   [e.guest_name,         Validators.required],
      amount:       [e.amount,             [Validators.required, Validators.min(1)]],
      relationship: [e.relationship ?? ''],
      city:         [e.city         ?? ''],
      side:         [e.side         ?? 'groom'],
      payment_mode: [e.payment_mode ?? 'cash'],
      received_by:  [e.received_by  ?? ''],
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.moiService.update(this.data.entry.id, this.form.value).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.snackBar.open('Error updating entry. Please try again.', 'Close', { duration: 3000, panelClass: 'error-snackbar' }),
    });
  }
}

@Component({
  selector: 'app-moi-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatTableModule, MatSortModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule,
    MatAutocompleteModule, MatDialogModule, MatCheckboxModule, ReactiveFormsModule,
    EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent, SkeletonLoaderComponent,
    QuickAddMoiDialog, ConfirmDeleteMoiDialog, EditMoiDialog,
  ],
  templateUrl: './moi-list.component.html',
  styleUrls: ['./moi-list.component.scss'],
})
export class MoiListComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly moiService = inject(MoiService);
  private readonly eventService = inject(EventService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly receiptService = inject(ReceiptService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('moiSentinel') moiSentinel!: ElementRef<HTMLDivElement>;
  private scrollObserver?: IntersectionObserver;

  readonly search$ = new Subject<string>();

  loading = signal(true);
  entries = signal<MoiEntry[]>([]);
  events = signal<Event[]>([]);
  total = signal(0);
  allLoaded = signal(false);

  selectedEventId: number | null = null;
  filterSide = '';
  filterPayment = '';
  searchQuery = signal('');
  page = signal(1);
  pageSize = 30;


  relationshipFilter = signal('');
  receivedByFilter = signal('');
  sortField = signal('created_at');
  sortDir = signal<'asc' | 'desc'>('desc');

  selectedIds = signal<Set<number>>(new Set());
  allSelected = computed(() =>
    this.entries().length > 0 && this.entries().every(e => this.selectedIds().has(e.id))
  );

  displayedColumns = ['select', 'event', 'guest_name', 'side', 'amount', 'payment_mode', 'city', 'date', 'actions'];

  sortedEntries = computed(() => {
    const list = [...this.entries()];
    const field = this.sortField();
    if (!field) return list;
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const av = (a as any)[field];
      const bv = (b as any)[field];
      if (typeof av === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  });

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.page.set(1);
      this.loadEntries();
    });

    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events.set(data.filter((e: any) => e.status === 'approved' || e.status === 'completed'));
        this.loadEntries();
      },
      error: () => {
        this.snackBar.open('Failed to load events', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
        this.loadEntries();
      },
    });
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

  private buildFilter(pg: number): MoiFilter {
    return {
      page: pg,
      page_size: this.pageSize,
      event_id: this.selectedEventId ?? undefined,
      side: (this.filterSide as any) || undefined,
      payment_mode: (this.filterPayment as any) || undefined,
      search: this.searchQuery() || undefined,
      relationship: this.relationshipFilter() || undefined,
      received_by: this.receivedByFilter() || undefined,
      sort_field: this.sortField(),
      sort_dir: this.sortDir(),
    };
  }

  loadEntries() {
    this.page.set(1);
    this.allLoaded.set(false);
    this.loading.set(true);
    this.moiService.getAll(this.buildFilter(1)).subscribe({
      next: (resp) => {
        this.entries.set(resp.items);
        this.total.set(resp.total);
        this.allLoaded.set(resp.items.length >= resp.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore() {
    if (this.allLoaded() || this.loading()) return;
    const nextPage = this.page() + 1;
    this.page.set(nextPage);
    this.loading.set(true);
    this.moiService.getAll(this.buildFilter(nextPage)).subscribe({
      next: (resp) => {
        this.entries.update(e => [...e, ...resp.items]);
        this.allLoaded.set(this.entries().length >= resp.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter() {
    this.loadEntries();
  }

  clearFilters() {
    this.selectedEventId = null;
    this.filterSide = '';
    this.filterPayment = '';
    this.searchQuery.set('');
    this.relationshipFilter.set('');
    this.receivedByFilter.set('');
    this.loadEntries();
  }

  onSort(field: 'guest_name' | 'amount' | 'created_at'): void {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'amount' ? 'desc' : 'asc');
    }
  }

  sortIcon(field: string): string {
    if (this.sortField() !== field) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  ngAfterViewInit() {
    this.scrollObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) this.loadMore();
    }, { threshold: 0.1 });
    if (this.moiSentinel) this.scrollObserver.observe(this.moiSentinel.nativeElement);
  }

  ngOnDestroy() {
    this.scrollObserver?.disconnect();
  }

  deleteEntry(entry: MoiEntry) {
    this.moiService.delete(entry.id).subscribe({
      next: () => {
        this.snackBar.open('Entry deleted', 'Close', { duration: 2000, panelClass: 'success-snackbar' });
        this.loadEntries();
      },
      error: () => this.snackBar.open('Error deleting', 'Close', { duration: 2000, panelClass: 'error-snackbar' }),
    });
  }

  printEntry(entry: any): void {
    const ev = this.events().find(e => e.id === entry.event_id);
    if (!ev) { this.snackBar.open('Event not found', 'Close', { duration: 2000 }); return; }
    this.receiptService.printReceipt(entry, ev, '80', entry.receipt_no ?? 1, 'en');
  }

  openDeleteDialog(entry: any): void {
    const ref = this.dialog.open(ConfirmDeleteMoiDialog, {
      data: { name: entry.guest_name }, width: '360px',
    });
    ref.afterClosed().subscribe(confirmed => { if (confirmed) this.deleteEntry(entry); });
  }

  openQuickAdd(): void {
    const ref = this.dialog.open(QuickAddMoiDialog, {
      data: { events: this.events() }, width: '520px', maxWidth: '95vw',
    });
    ref.afterClosed().subscribe(result => {
      if (result) { this.snackBar.open('Moi entry added!', 'Close', { duration: 2000, panelClass: 'success-snackbar' }); this.loadEntries(); }
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  toggleSelect(id: number): void {
    this.selectedIds.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.entries().map(e => e.id)));
    }
  }

  bulkDelete(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const ref = this.dialog.open(ConfirmDeleteMoiDialog, { data: { name: ids.length + ' entries' }, width: '360px' });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      Promise.all(ids.map(id => lastValueFrom(this.moiService.delete(id)))).then(() => {
        this.selectedIds.set(new Set());
        this.loadEntries();
        this.snackBar.open('Deleted ' + ids.length + ' entries', 'Close', { duration: 3000 });
      });
    });
  }

  openEditDialog(entry: MoiEntry): void {
    const ref = this.dialog.open(EditMoiDialog, {
      data: { entry, events: this.events() }, width: '520px', maxWidth: '95vw',
    });
    ref.afterClosed().subscribe(result => {
      if (result) { this.snackBar.open('Entry updated!', 'Close', { duration: 2000, panelClass: 'success-snackbar' }); this.loadEntries(); }
    });
  }
}
