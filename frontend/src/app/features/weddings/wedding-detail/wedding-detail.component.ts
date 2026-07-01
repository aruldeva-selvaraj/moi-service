import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { EventService } from '../../../core/services/event.service';
import { MoiService } from '../../../core/services/moi.service';
import { ReceiptService, PaperSize } from '../../../core/services/receipt.service';
import { Event, getEventConfig, getEventTitle, EventTypeConfig } from '../../../core/models/event.model';
import { MoiEntry, MoiEntryCreate, MoiFilter } from '../../../core/models/moi.model';
import { StatCardComponent, EmptyStateComponent, LoadingSpinnerComponent } from '../../../shared/components/index';

@Component({
  selector: 'app-wedding-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, MatTooltipModule, MatChipsModule, MatTabsModule,
    MatButtonToggleModule,
    StatCardComponent, EmptyStateComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './wedding-detail.component.html',
  styleUrls: ['./wedding-detail.component.scss'],
})
export class WeddingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly moiService = inject(MoiService);
  private readonly receiptService = inject(ReceiptService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  eventId!: number;
  loading = signal(true);
  entriesLoading = signal(false);
  submitting = signal(false);
  event = signal<Event | null>(null);
  entries = signal<MoiEntry[]>([]);
  totalEntries = signal(0);
  paperSize = signal<PaperSize>('80');

  eventConfig = computed<EventTypeConfig>(() => getEventConfig(this.event()?.event_type ?? 'wedding'));
  eventTitle = computed(() => {
    const ev = this.event();
    return ev ? getEventTitle(ev) : '';
  });

  filterSide = '';
  filterPayment = '';
  searchQuery = '';

  displayedColumns = ['guest_name', 'side', 'amount', 'payment_mode', 'city', 'received_by', 'actions'];

  get defaultMoiValues() {
    return {
      guest_name: '',
      relationship: '',
      side: 'groom',
      amount: null,
      payment_mode: 'cash',
      cheque_number: '',
      transaction_ref: '',
      city: '',
      phone: '',
      notes: '',
      received_by: '',
    };
  }

  moiForm: FormGroup = this.fb.group({
    guest_name: ['', Validators.required],
    relationship: [''],
    side: ['groom'],
    amount: [null, [Validators.required, Validators.min(1)]],
    payment_mode: ['cash'],
    cheque_number: [''],
    transaction_ref: [''],
    city: [''],
    phone: [''],
    notes: [''],
    received_by: [''],
  });

  ngOnInit() {
    this.eventId = +this.route.snapshot.paramMap.get('id')!;
    this.loadEvent();
    this.loadEntries();
  }

  loadEvent() {
    this.loading.set(true);
    this.eventService.getById(this.eventId).subscribe({
      next: (ev) => { this.event.set(ev); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadEntries() {
    this.entriesLoading.set(true);
    const filter: MoiFilter = {
      event_id: this.eventId,
      page: 1,
      page_size: 100,
      side: (this.filterSide as any) || undefined,
      payment_mode: (this.filterPayment as any) || undefined,
      search: this.searchQuery || undefined,
    };
    this.moiService.getAll(filter).subscribe({
      next: (resp) => {
        this.entries.set(resp.items);
        this.totalEntries.set(resp.total);
        this.entriesLoading.set(false);
      },
      error: () => this.entriesLoading.set(false),
    });
  }

  applyFilter() {
    this.loadEntries();
  }

  submitMoi() {
    if (this.moiForm.invalid) {
      this.moiForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const data: MoiEntryCreate = { ...this.moiForm.value, event_id: this.eventId };

    this.moiService.create(data).subscribe({
      next: (entry: MoiEntry) => {
        this.snackBar.open('Moi recorded! Printing receipt... 🖨️', 'Close', {
          duration: 4000, panelClass: 'success-snackbar',
        });
        this.receiptService.printReceipt(entry, this.event()!, this.paperSize());
        this.moiForm.reset(this.defaultMoiValues);
        this.submitting.set(false);
        this.loadEvent();
        this.loadEntries();
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open('Error recording moi', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
      },
    });
  }

  printEntry(entry: MoiEntry): void {
    if (this.event()) {
      this.receiptService.printReceipt(entry, this.event()!, this.paperSize());
    }
  }

  deleteEntry(entry: MoiEntry) {
    if (confirm(`Remove moi entry for ${entry.guest_name} (₹${entry.amount})?`)) {
      this.moiService.delete(entry.id).subscribe({
        next: () => {
          this.snackBar.open('Entry deleted', 'Close', { duration: 2000, panelClass: 'success-snackbar' });
          this.loadEvent();
          this.loadEntries();
        },
        error: () => this.snackBar.open('Error deleting entry', 'Close', { duration: 2000, panelClass: 'error-snackbar' }),
      });
    }
  }

  getSideLabel(side: string): string {
    const cfg = this.eventConfig();
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

  printGuestListA4(): void {
    if (this.event()) {
      this.receiptService.printGuestList(this.entries(), this.event()!);
    }
  }

  printConsolidatedA4(): void {
    if (this.event()) {
      this.receiptService.printConsolidatedSheet(this.entries(), this.event()!);
    }
  }

  printMoiList() {
    window.print();
  }
}
