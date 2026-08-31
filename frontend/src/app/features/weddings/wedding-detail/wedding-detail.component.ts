import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EventService } from '../../../core/services/event.service';
import { MoiService } from '../../../core/services/moi.service';
import { ReceiptService, PaperSize, PrintSide, PrintFilter, ReceiptLang } from '../../../core/services/receipt.service';
import { VoiceRecognitionService } from '../../../core/services/voice-recognition.service';
import { Event, getEventConfig, getEventTitle, EventTypeConfig, EventReport } from '../../../core/models/event.model';
import { MoiEntry, MoiEntryCreate, MoiFilter } from '../../../core/models/moi.model';
import { StatCardComponent, EmptyStateComponent, LoadingSpinnerComponent } from '../../../shared/components/index';
import type { AiEntryDialogData, ConfirmDialogData } from '../../../shared/components/index';


@Component({
  selector: 'app-wedding-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, MatTooltipModule, MatChipsModule, MatTabsModule,
    MatButtonToggleModule, MatAutocompleteModule, MatDialogModule,
    MatCheckboxModule,
    StatCardComponent, EmptyStateComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './wedding-detail.component.html',
  styleUrls: ['./wedding-detail.component.scss'],
})
export class WeddingDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly String = String;

  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly moiService = inject(MoiService);
  private readonly receiptService = inject(ReceiptService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  readonly voice = inject(VoiceRecognitionService);

  // ── AI Smart Entry ─────────────────────────────────────
  aiText = '';
  aiListening = signal(false);

  @ViewChild('guestNameInput') guestNameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('entriesSentinel') entriesSentinel!: ElementRef<HTMLDivElement>;
  private scrollObserver?: IntersectionObserver;

  eventId!: number;
  loading = signal(true);
  entriesLoading = signal(false);
  submitting = signal(false);
  event = signal<Event | null>(null);
  entries = signal<MoiEntry[]>([]);
  totalEntries = signal(0);
  paperSize = signal<PaperSize>('80');
  receiptLang = signal<ReceiptLang>('en');
  showPrintModal = signal(false);
  dupWarning = signal<{ name: string; amount: number } | null>(null);
  editingEntry = signal<MoiEntry | null>(null);
  editSubmitting = signal(false);
  justAddedId = signal<number | null>(null);
  activityLog = signal<{ id: number; name: string; amount: number; time: Date }[]>([]);
  autoPrint = signal(true);
  topDonors = signal<any[]>([]);
  highlightId = signal<number | null>(null);
  eventReport = signal<EventReport | null>(null);
  filterReceivedBy = '';
  entriesPage = signal(1);
  pageSize = signal(30);
  allEntriesLoaded = signal(false);

  // CONFIGURABLE PRESETS: signal-based, loaded from localStorage per event
  amountPresets = signal<number[]>([500, 1000, 2000, 5000, 10000]);

  private sessionWarningTimer?: ReturnType<typeof setTimeout>;

  readonly citySuggestions = computed(() =>
    [...new Set(this.entries().map(e => e.city).filter((v): v is string => !!v?.trim()))].sort()
  );
  readonly districtSuggestions = computed(() =>
    [...new Set(this.entries().map(e => e.district).filter((v): v is string => !!v?.trim()))].sort()
  );
  readonly relationshipSuggestions = computed(() =>
    [...new Set(this.entries().map(e => e.relationship).filter((v): v is string => !!v?.trim()))].sort()
  );
  readonly receivedBySuggestions = computed(() =>
    [...new Set(this.entries().map(e => e.received_by).filter((v): v is string => !!v?.trim()))].sort()
  );

  eventConfig = computed<EventTypeConfig>(() => getEventConfig(this.event()?.event_type ?? 'wedding'));
  eventTitle = computed(() => {
    const ev = this.event();
    return ev ? getEventTitle(ev) : '';
  });

  formStep = signal(1);

  filterSide = '';
  filterPayment = '';
  filterCity = '';
  filterDistrict = '';
  searchQuery = '';

  printFilterCity = '';
  printFilterDistrict = '';

  displayedColumns = ['guest_name', 'side', 'amount', 'payment_mode', 'city', 'district', 'received_by', 'actions'];
  expandedColumns = ['expandedEdit'];

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
      district: '',
      phone: '',
      notes: '',
      received_by: '',
      party_size: 1,
    };
  }

  moiForm: FormGroup = this.fb.group({
    guest_name: ['', Validators.required],
    relationship: [''],
    side: ['groom'],
    amount: [null, [Validators.required, Validators.min(1), Validators.pattern(/^[0-9]+$/)]],
    payment_mode: ['cash'],
    cheque_number: [''],
    transaction_ref: [''],
    city: [''],
    district: [''],
    phone: ['', Validators.pattern(/^[0-9]{10}$/)],
    notes: [''],
    received_by: [''],
    party_size: [1, Validators.min(1)],
  });

  editForm: FormGroup = this.fb.group({
    guest_name: ['', Validators.required],
    relationship: [''],
    side: ['groom'],
    amount: [null, [Validators.required, Validators.min(1), Validators.pattern(/^[0-9]+$/)]],
    payment_mode: ['cash'],
    cheque_number: [''],
    transaction_ref: [''],
    city: [''],
    district: [''],
    phone: ['', Validators.pattern(/^[0-9]{10}$/)],
    notes: [''],
    received_by: [''],
    party_size: [1, Validators.min(1)],
  });

  private get settingsKey() { return `moify_last_${this.eventId}`; }
  private get presetsKey() { return `moify_presets_${this.eventId}`; }

  private loadLastSettings(): void {
    try {
      const saved = localStorage.getItem(this.settingsKey);
      if (saved) {
        const s = JSON.parse(saved);
        this.moiForm.patchValue({
          side: s.side ?? 'groom',
          payment_mode: s.payment_mode ?? 'cash',
          received_by: s.received_by ?? '',
          city: s.city ?? '',
          district: s.district ?? '',
        });
      }
    } catch {}
  }

  private saveLastSettings(): void {
    try {
      const v = this.moiForm.value;
      localStorage.setItem(this.settingsKey, JSON.stringify({
        side: v.side,
        payment_mode: v.payment_mode,
        received_by: v.received_by,
        city: v.city,
        district: v.district,
      }));
    } catch {}
  }

  private loadPresetsFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.presetsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.amountPresets.set(parsed.map(Number).filter(n => !isNaN(n) && n > 0));
        }
      }
    } catch {}
  }

  /** Update a single preset by index and persist to localStorage */
  setPreset(index: number, value: number): void {
    if (index < 0 || value <= 0) return;
    this.amountPresets.update(presets => {
      const updated = [...presets];
      if (index < updated.length) {
        updated[index] = value;
      } else {
        updated.push(value);
      }
      try {
        localStorage.setItem(this.presetsKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }

  private playKaChing(): void {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1047, ctx.currentTime);
      osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(1568, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    // Ctrl+Enter → submit form
    if (e.ctrlKey && e.key === 'Enter' && !this.submitting() && !this.loading()) {
      e.preventDefault();
      this.submitMoi();
    }
    // F1–F5 → set amount to preset 0–4
    if (e.key === 'F1') { e.preventDefault(); this.setAmount(this.amountPresets()[0]); }
    if (e.key === 'F2') { e.preventDefault(); this.setAmount(this.amountPresets()[1]); }
    if (e.key === 'F3') { e.preventDefault(); this.setAmount(this.amountPresets()[2]); }
    if (e.key === 'F4') { e.preventDefault(); this.setAmount(this.amountPresets()[3]); }
    if (e.key === 'F5') { e.preventDefault(); this.setAmount(this.amountPresets()[4]); }
    // Ctrl+L → focus guest name field
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      this.guestNameInput?.nativeElement?.focus();
    }
    // Ctrl+D → toggle side groom/bride
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      const currentSide = this.moiForm.get('side')?.value;
      this.moiForm.get('side')?.setValue(currentSide === 'groom' ? 'bride' : 'groom');
    }
  }

  setAmount(val: number): void {
    this.moiForm.get('amount')?.setValue(String(val));
  }

  checkDuplicate(): void {
    const name = (this.moiForm.get('guest_name')?.value ?? '').trim().toLowerCase();
    if (name.length < 3) { this.dupWarning.set(null); return; }
    const match = this.entries().find(e => {
      const existing = e.guest_name.toLowerCase().trim();
      return existing.includes(name) || name.includes(existing);
    });
    this.dupWarning.set(match ? { name: match.guest_name, amount: match.amount } : null);
  }

  ngOnInit() {
    this.eventId = +this.route.snapshot.paramMap.get('id')!;
    this.loadEvent();
    this.loadEntries();

    this.loadLastSettings();
    this.loadPresetsFromStorage();
    // Read highlight param
    const h = this.route.snapshot.queryParamMap.get('highlight');
    if (h && Number.isInteger(+h) && +h > 0) this.highlightId.set(+h);
    // Load top donors
    this.moiService.getTopDonors(this.eventId, 5).subscribe({ next: (d) => this.topDonors.set(d), error: () => {} });
    // Load activity from localStorage
    try {
      const saved = localStorage.getItem('moify_activity_' + this.eventId);
      if (saved) this.activityLog.set(JSON.parse(saved).filter((a: any) => Date.now() - new Date(a.time).getTime() < 86400000));
    } catch {}

    // Session expiry warning
    const token = localStorage.getItem('moify_token') || localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const expiresIn = payload.exp * 1000 - Date.now();
        const warnAt = expiresIn - 5 * 60 * 1000; // 5 min before expiry
        if (warnAt > 0) {
          this.sessionWarningTimer = setTimeout(() => {
            this.snackBar.open('Your session expires in 5 minutes. Save your work!', 'OK', {
              duration: 30000, panelClass: 'warn-snackbar',
            });
          }, warnAt);
        }
      } catch {}
    }
  }

  ngAfterViewInit(): void {
    this.scrollObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) this.loadMoreEntries();
    }, { threshold: 0.1 });
    if (this.entriesSentinel) this.scrollObserver.observe(this.entriesSentinel.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.sessionWarningTimer) clearTimeout(this.sessionWarningTimer);
    this.scrollObserver?.disconnect();
  }

  loadEvent() {
    this.loading.set(true);
    this.eventService.getById(this.eventId).subscribe({
      next: (ev) => {
        this.event.set(ev);
        this.loading.set(false);
        this.loadReport();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadReport() {
    this.eventService.getReport(this.eventId).subscribe({
      next: (r) => this.eventReport.set(r),
      error: () => {},
    });
  }

  loadEntries() {
    this.entriesPage.set(1);
    this.allEntriesLoaded.set(false);
    this.entriesLoading.set(true);
    const filter: MoiFilter = {
      event_id: this.eventId,
      page: 1,
      page_size: this.pageSize(),
      sort_field: 'created_at',
      sort_dir: 'desc',
      side: (this.filterSide as any) || undefined,
      payment_mode: (this.filterPayment as any) || undefined,
      search: this.searchQuery || undefined,
      city: this.filterCity || undefined,
      district: this.filterDistrict || undefined,
      received_by: this.filterReceivedBy || undefined,
    };
    this.moiService.getAll(filter).subscribe({
      next: (resp) => {
        this.entries.set(resp.items);
        this.totalEntries.set(resp.total);
        this.allEntriesLoaded.set(resp.items.length >= resp.total);
        this.entriesLoading.set(false);
      },
      error: () => this.entriesLoading.set(false),
    });
  }

  loadMoreEntries() {
    if (this.allEntriesLoaded() || this.entriesLoading()) return;
    const nextPage = this.entriesPage() + 1;
    this.entriesPage.set(nextPage);
    this.entriesLoading.set(true);
    const filter: MoiFilter = {
      event_id: this.eventId,
      page: nextPage,
      page_size: this.pageSize(),
      sort_field: 'created_at',
      sort_dir: 'desc',
      side: (this.filterSide as any) || undefined,
      payment_mode: (this.filterPayment as any) || undefined,
      search: this.searchQuery || undefined,
      city: this.filterCity || undefined,
      district: this.filterDistrict || undefined,
      received_by: this.filterReceivedBy || undefined,
    };
    this.moiService.getAll(filter).subscribe({
      next: (resp) => {
        this.entries.update(existing => [...existing, ...resp.items]);
        this.allEntriesLoaded.set(this.entries().length >= resp.total);
        this.entriesLoading.set(false);
      },
      error: () => this.entriesLoading.set(false),
    });
  }

  applyFilter() {
    this.loadEntries();
  }

  nextStep(): void {
    const step = this.formStep();
    if (step === 1) {
      const nameCtrl = this.moiForm.get('guest_name');
      nameCtrl?.markAsTouched();
      if (nameCtrl?.invalid) return;
    }
    if (step === 2) {
      const amtCtrl = this.moiForm.get('amount');
      amtCtrl?.markAsTouched();
      if (amtCtrl?.invalid) return;
    }
    if (step < 3) this.formStep.set(step + 1);
  }

  prevStep(): void {
    if (this.formStep() > 1) this.formStep.set(this.formStep() - 1);
  }

  submitMoi() {
    if (this.moiForm.invalid) {
      this.moiForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const formValue = { ...this.moiForm.value };
    // Coerce text amount to number before sending
    if (formValue.amount !== null && formValue.amount !== undefined) {
      formValue.amount = Number(formValue.amount);
    }
    const data: MoiEntryCreate = { ...formValue, event_id: this.eventId };

    this.moiService.create(data).subscribe({
      next: (entry: MoiEntry) => {
        this.snackBar.open('Moi recorded! Printing receipt... 🖨️', 'Close', {
          duration: 4000, panelClass: 'success-snackbar',
        });
        const receiptNo = entry.receipt_no ?? 1;
        if (this.autoPrint()) {
          this.receiptService.printReceipt(entry, this.event()!, this.paperSize(), receiptNo, this.receiptLang());
        }
        this.saveLastSettings();
        this.moiForm.reset(this.defaultMoiValues);
        this.loadLastSettings();
        this.dupWarning.set(null);
        this.submitting.set(false);
        this.formStep.set(1);
        this.playKaChing();
        this.justAddedId.set(entry.id);
        setTimeout(() => this.justAddedId.set(null), 5000);
        this.activityLog.update(log => [
          { id: entry.id, name: entry.guest_name, amount: entry.amount, time: new Date() },
          ...log,
        ].slice(0, 10));
        setTimeout(() => this.guestNameInput?.nativeElement?.focus(), 150);
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
      this.receiptService.printReceipt(entry, this.event()!, this.paperSize(), entry.receipt_no ?? 1, this.receiptLang());
    }
  }

  async deleteEntry(entry: MoiEntry): Promise<void> {
    const { ConfirmDialogComponent } = await import('../../../shared/components/index');
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Entry',
        message: `Delete moi entry for "${entry.guest_name}" (₹${Number(entry.amount).toLocaleString('en-IN')})? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        confirmColor: 'warn',
        icon: 'delete_forever',
      } as ConfirmDialogData,
      width: '400px',
      disableClose: false,
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      if (this.editingEntry()?.id === entry.id) this.editingEntry.set(null);
      this.moiService.delete(entry.id).subscribe({
        next: () => {
          this.entries.update(list => list.filter(e => e.id !== entry.id));
          this.totalEntries.update(n => n - 1);
          this.snackBar.open(`Deleted: ${entry.guest_name}`, 'Close', { duration: 3000, panelClass: 'warn-snackbar' });
          this.loadEvent();
        },
        error: () => {
          this.snackBar.open('Delete failed. Please try again.', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
        },
      });
    });
  }

  startEdit(entry: MoiEntry): void {
    this.editingEntry.set(entry);
    this.editForm.patchValue({
      guest_name:    entry.guest_name,
      relationship:  entry.relationship  ?? '',
      side:          entry.side,
      amount:        String(Math.round(Number(entry.amount))),
      payment_mode:  entry.payment_mode,
      cheque_number: entry.cheque_number ?? '',
      transaction_ref: entry.transaction_ref ?? '',
      city:          entry.city          ?? '',
      district:      entry.district      ?? '',
      phone:         entry.phone         ?? '',
      notes:         entry.notes         ?? '',
      received_by:   entry.received_by   ?? '',
      party_size:    (entry as any).party_size ?? 1,
    });
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  cancelEdit(): void {
    this.editingEntry.set(null);
  }

  saveEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.snackBar.open('Please fix the highlighted errors before saving', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
      return;
    }
    this.editSubmitting.set(true);
    const entry = this.editingEntry()!;
    const formValue = { ...this.editForm.value };
    if (formValue.amount !== null && formValue.amount !== undefined) {
      formValue.amount = Number(formValue.amount);
    }
    this.moiService.update(entry.id, { ...formValue, event_id: this.eventId }).subscribe({
      next: () => {
        this.editingEntry.set(null);
        this.editSubmitting.set(false);
        this.snackBar.open('Entry updated ✓', 'Close', { duration: 2000, panelClass: 'success-snackbar' });
        this.loadEvent();
        this.loadEntries();
      },
      error: () => {
        this.editSubmitting.set(false);
        this.snackBar.open('Error updating entry', 'Close', { duration: 2000, panelClass: 'error-snackbar' });
      },
    });
  }

  filterSuggestions(list: string[], query: string | null): string[] {
    const q = (query ?? '').toLowerCase().trim();
    return q ? list.filter(v => v.toLowerCase().includes(q)) : list;
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

  openA4PrintModal(): void {
    if (this.entries().length > 0) {
      this.showPrintModal.set(true);
    }
  }

  printA4WithSide(side: PrintSide): void {
    this.showPrintModal.set(false);
    if (this.event()) {
      const filter: PrintFilter = {
        side,
        city: this.printFilterCity || undefined,
        district: this.printFilterDistrict || undefined,
      };
      this.receiptService.printA4Sheet(this.entries(), this.event()!, filter);
    }
  }

  downloadA4WithSide(side: PrintSide): void {
    this.showPrintModal.set(false);
    if (this.event()) {
      const filter: PrintFilter = {
        side,
        city: this.printFilterCity || undefined,
        district: this.printFilterDistrict || undefined,
      };
      this.receiptService.downloadA4Sheet(this.entries(), this.event()!, filter);
    }
  }

  printMoiList() {
    if (this.event() && this.entries().length > 0) {
      this.receiptService.printA4Sheet(this.entries(), this.event()!, { side: 'all' });
    }
  }

  // ── AI Smart Entry methods ──────────────────────────────

  startAiVoice(): void {
    if (this.voice.activeField() === 'ai_entry') {
      this.voice.stopListening();
      this.aiListening.set(false);
      return;
    }
    this.aiListening.set(true);
    this.voice.startListening(
      'ai_entry',
      (transcript: string) => {
        this.aiText = transcript;
        this.aiListening.set(false);
        this.openAiDialog();
      },
      (error: string) => {
        this.aiListening.set(false);
        this.snackBar.open(error, 'Close', { duration: 4000, panelClass: 'error-snackbar' });
      },
      'en-IN'
    );
  }

  async openAiDialog(): Promise<void> {
    const { AiEntryDialogComponent } = await import('../../../shared/components/index');
    const parsed = this.parseAiInput(this.aiText);
    const ref = this.dialog.open(AiEntryDialogComponent, {
      data: { parsed, eventId: this.eventId, eventConfig: this.eventConfig() } as AiEntryDialogData,
      width: '700px',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((result: MoiEntryCreate | null) => {
      if (!result) return;
      this.aiText = '';
      this.submitting.set(true);
      this.moiService.create(result).subscribe({
        next: (entry: MoiEntry) => {
          this.snackBar.open('Moi recorded! Printing receipt... 🖨️', 'Close', {
            duration: 4000, panelClass: 'success-snackbar',
          });
          if (this.autoPrint()) {
            this.receiptService.printReceipt(entry, this.event()!, '80', entry.receipt_no ?? 1, this.receiptLang());
          }
          this.submitting.set(false);
          this.playKaChing();
          this.justAddedId.set(entry.id);
          setTimeout(() => this.justAddedId.set(null), 5000);
          this.activityLog.update(log => [
            { id: entry.id, name: entry.guest_name, amount: entry.amount, time: new Date() },
            ...log,
          ].slice(0, 10));
          this.loadEvent();
          this.loadEntries();
        },
        error: () => {
          this.submitting.set(false);
          this.snackBar.open('Error recording moi', 'Close', { duration: 3000, panelClass: 'error-snackbar' });
        },
      });
    });
  }

  parseAiInput(rawText: string): Partial<MoiEntryCreate> {
    const result: Partial<MoiEntryCreate> = {};
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // Keyword → field map (longest/most specific first to avoid partial matches)
    const keyMap: Array<{ kw: string; field: string }> = [
      { kw: 'received by', field: 'received_by' },
      { kw: 'receivedby',  field: 'received_by' },
      { kw: 'guest name',  field: 'guest_name'  },
      { kw: 'relationship',field: 'relationship' },
      { kw: 'district',    field: 'district'     },
      { kw: 'relation',    field: 'relationship' },
      { kw: 'rupees',      field: 'amount'       },
      { kw: 'amount',      field: 'amount'       },
      { kw: 'mobile',      field: 'phone'        },
      { kw: 'phone',       field: 'phone'        },
      { kw: 'notes',       field: 'notes'        },
      { kw: 'note',        field: 'notes'        },
      { kw: 'guest',       field: 'guest_name'   },
      { kw: 'city',        field: 'city'         },
      { kw: 'dist',        field: 'district'     },
      { kw: 'name',        field: 'guest_name'   },
      { kw: 'side',        field: 'side'         },
    ];

    interface Token { pos: number; endPos: number; field: string }
    const tokens: Token[] = [];
    const usedPos = new Set<number>();

    for (const { kw, field } of keyMap) {
      let i = 0;
      while ((i = lower.indexOf(kw, i)) !== -1) {
        const end = i + kw.length;
        const okBefore = i === 0 || !/[a-z0-9]/i.test(lower[i - 1]);
        const okAfter  = end >= lower.length || !/[a-z0-9]/i.test(lower[end]);
        if (okBefore && okAfter && !usedPos.has(i)) {
          tokens.push({ pos: i, endPos: end, field });
          for (let j = i; j < end; j++) usedPos.add(j);
        }
        i += 1;
      }
    }

    tokens.sort((a, b) => a.pos - b.pos);

    for (let i = 0; i < tokens.length; i++) {
      const { endPos, field } = tokens[i];
      const nextPos = i + 1 < tokens.length ? tokens[i + 1].pos : text.length;
      const val = text.slice(endPos, nextPos).replace(/^[\s:,\-]+/, '').trim();
      if (!val) continue;

      switch (field) {
        case 'guest_name':
        case 'city':
        case 'district':
        case 'phone':
        case 'relationship':
        case 'received_by':
        case 'notes':
          (result as Record<string, unknown>)[field] = val;
          break;
        case 'amount': {
          const n = this.parseWordAmount(val);
          if (n !== null) result.amount = n;
          break;
        }
        case 'side': {
          const v = val.toLowerCase();
          result.side = v.startsWith('bride') ? 'bride' : v.startsWith('both') ? 'both' : 'groom';
          break;
        }
      }
    }

    // Detect payment mode from anywhere in text
    if (/\bonline\b|\bupi\b|\bgpay\b|\bpaytm\b|\bneft\b/i.test(text)) result.payment_mode = 'online';
    else if (/\bcheque\b|\bcheck\b/i.test(text)) result.payment_mode = 'cheque';
    else if (/\bdd\b/i.test(text)) result.payment_mode = 'dd';

    // Detect side from anywhere if not already set
    if (!result.side) {
      if (/\bbride\b/i.test(text)) result.side = 'bride';
      else if (/\bboth\b/i.test(text)) result.side = 'both';
    }

    // Positional fallback: text before first keyword token → name
    if (!result.guest_name && tokens.length > 0 && tokens[0].pos > 0) {
      const before = text.slice(0, tokens[0].pos).trim();
      if (before) result.guest_name = before;
    }

    // Positional fallback: first standalone number → amount
    if (!result.amount) {
      const m = text.match(/\b(\d[\d,]*)\b/);
      if (m) {
        const n = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(n) && n > 0) result.amount = n;
      }
    }

    return result;
  }

  private parseWordAmount(text: string): number | null {
    const t = text.replace(/,/g, '').trim();
    const direct = parseFloat(t);
    if (!isNaN(direct) && direct > 0) return direct;
    const m = t.match(/\d+(\.\d+)?/);
    if (m) { const n = parseFloat(m[0]); if (!isNaN(n) && n > 0) return n; }

    const ONES: Record<string, number> = {
      zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
      eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16,
      seventeen:17, eighteen:18, nineteen:19, twenty:20, thirty:30, forty:40,
      fifty:50, sixty:60, seventy:70, eighty:80, ninety:90,
    };
    const MULTI: Record<string, number> = { hundred:100, thousand:1000, lakh:100000, lakhs:100000, lac:100000 };

    let total = 0, current = 0;
    for (const w of t.toLowerCase().split(/[\s\-]+/)) {
      if (MULTI[w] !== undefined) {
        if (MULTI[w] === 100) { current = (current || 1) * 100; }
        else { total += (current || 1) * MULTI[w]; current = 0; }
      } else if (ONES[w] !== undefined) {
        current += ONES[w];
      }
    }
    total += current;
    return total > 0 ? total : null;
  }

  startVoice(field: 'guest_name' | 'city' | 'amount'): void {
    if (this.voice.activeField() === field) {
      this.voice.stopListening();
      return;
    }

    const onError = (msg: string) => {
      this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: 'error-snackbar' });
    };

    this.voice.startListening(
      field,
      (transcript) => {
        if (field === 'amount') {
          const num = this.voice.parseAmount(transcript);
          if (num !== null) {
            this.moiForm.get('amount')?.setValue(String(num));
            this.snackBar.open(`Amount set: ₹${num}`, 'Close', { duration: 2000, panelClass: 'success-snackbar' });
          } else {
            onError(`Could not parse amount from: "${transcript}"`);
          }
        } else {
          this.moiForm.get(field)?.setValue(transcript);
          this.snackBar.open(`${field === 'guest_name' ? 'Guest name' : 'City'} set: ${transcript}`, 'Close', {
            duration: 2000, panelClass: 'success-snackbar',
          });
        }
      },
      onError
    );
  }


  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i += 2; continue; }
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
        continue;
      } else {
        current += ch;
      }
      i++;
    }
    result.push(current.trim());
    return result;
  }

  onImportFile(fileEvent: globalThis.Event): void {
    const input = fileEvent.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        this.snackBar.open('CSV must have a header row and at least one data row', 'Close', { duration: 3000 });
        return;
      }
      const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
      const entries: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = this.parseCSVLine(lines[i]);
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
        if (!row.guest_name || !row.amount) continue;
        const amt = parseFloat(row.amount);
        if (isNaN(amt) || amt <= 0) continue;
        entries.push({
          guest_name: row.guest_name,
          amount: amt,
          side: row.side || 'groom',
          payment_mode: row.payment_mode || 'cash',
          relationship: row.relationship || '',
          city: row.city || '',
          district: row.district || '',
          phone: row.phone || '',
          received_by: row.received_by || '',
          notes: row.notes || '',
        });
      }
      if (entries.length === 0) {
        this.snackBar.open('No valid rows found in CSV', 'Close', { duration: 3000 });
        return;
      }
      this.moiService.bulkCreate({ event_id: this.eventId, entries }).subscribe({
        next: (res) => {
          this.snackBar.open(`Imported ${res.created} entries${res.errors.length ? ', ' + res.errors.length + ' failed' : ''}`, 'Close', { duration: 4000, panelClass: 'success-snackbar' });
          this.loadEvent();
          this.loadEntries();
        },
        error: () => this.snackBar.open('Import failed', 'Close', { duration: 3000, panelClass: 'error-snackbar' }),
      });
    };
    reader.readAsText(file);
    input.value = '';
  }

  exportCsv(): void {
    this.moiService.getAll({ event_id: this.eventId, page: 1, page_size: this.totalEntries() || 9999 }).subscribe({
      next: (resp) => {
        const cols = ['guest_name', 'relationship', 'side', 'amount', 'payment_mode', 'cheque_number', 'transaction_ref', 'city', 'district', 'phone', 'received_by', 'notes'];
        const header = cols.map(c => '"' + c + '"').join(',');
        const rows = resp.items.map((e: any) =>
          cols.map(c => '"' + (e[c] ?? '').toString().replace(/"/g, '""') + '"').join(',')
        );
        const csv = '﻿' + [header, ...rows].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'moi-event-' + this.eventId + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 150);
      },
    });
  }
}
