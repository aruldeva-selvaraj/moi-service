import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
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
import { EventService } from '../../../core/services/event.service';
import { MoiService } from '../../../core/services/moi.service';
import { ReceiptService, PaperSize, PrintSide, PrintFilter, ReceiptLang } from '../../../core/services/receipt.service';
import { VoiceRecognitionService } from '../../../core/services/voice-recognition.service';
import { Event, getEventConfig, getEventTitle, EventTypeConfig } from '../../../core/models/event.model';
import { MoiEntry, MoiEntryCreate, MoiFilter } from '../../../core/models/moi.model';
import { StatCardComponent, EmptyStateComponent, LoadingSpinnerComponent, AiEntryDialogComponent, AiEntryDialogData } from '../../../shared/components/index';

@Component({
  selector: 'app-wedding-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, MatTooltipModule, MatChipsModule, MatTabsModule,
    MatButtonToggleModule, MatAutocompleteModule, MatDialogModule,
    StatCardComponent, EmptyStateComponent, LoadingSpinnerComponent, AiEntryDialogComponent,
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
  private readonly dialog = inject(MatDialog);
  readonly voice = inject(VoiceRecognitionService);

  // ── AI Smart Entry ─────────────────────────────────────
  aiText = '';
  aiListening = signal(false);

  @ViewChild('guestNameInput') guestNameInput!: ElementRef<HTMLInputElement>;

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

  readonly amountPresets = [500, 1000, 2000, 5000, 10000];
  private readonly pendingDeletes = new Map<number, ReturnType<typeof setTimeout>>();

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
    district: [''],
    phone: [''],
    notes: [''],
    received_by: [''],
  });

  editForm: FormGroup = this.fb.group({
    guest_name: ['', Validators.required],
    relationship: [''],
    side: ['groom'],
    amount: [null, [Validators.required, Validators.min(1)]],
    payment_mode: ['cash'],
    cheque_number: [''],
    transaction_ref: [''],
    city: [''],
    district: [''],
    phone: [''],
    notes: [''],
    received_by: [''],
  });

  private get settingsKey() { return `moify_last_${this.eventId}`; }

  private loadLastSettings(): void {
    try {
      const saved = localStorage.getItem(this.settingsKey);
      if (saved) {
        const s = JSON.parse(saved);
        this.moiForm.patchValue({
          side: s.side ?? 'groom',
          payment_mode: s.payment_mode ?? 'cash',
          received_by: s.received_by ?? '',
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
      }));
    } catch {}
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
    if (e.ctrlKey && e.key === 'Enter' && !this.submitting() && !this.loading()) {
      e.preventDefault();
      this.submitMoi();
    }
  }

  setAmount(val: number): void {
    this.moiForm.get('amount')?.setValue(val);
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
      page_size: 200,
      side: (this.filterSide as any) || undefined,
      payment_mode: (this.filterPayment as any) || undefined,
      search: this.searchQuery || undefined,
      city: this.filterCity || undefined,
      district: this.filterDistrict || undefined,
    };
    this.moiService.getAll(filter).subscribe({
      next: (resp) => {
        this.entries.set([...resp.items].sort((a, b) => b.id - a.id));
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
        const receiptNo = (this.event()?.moi_count ?? 0) + 1;
        this.receiptService.printReceipt(entry, this.event()!, this.paperSize(), receiptNo, this.receiptLang());
        this.saveLastSettings();
        this.moiForm.reset(this.defaultMoiValues);
        this.loadLastSettings();
        this.dupWarning.set(null);
        this.submitting.set(false);
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
      const idx = this.entries().findIndex(e => e.id === entry.id);
      const receiptNo = idx >= 0 ? idx + 1 : undefined;
      this.receiptService.printReceipt(entry, this.event()!, this.paperSize(), receiptNo, this.receiptLang());
    }
  }

  deleteEntry(entry: MoiEntry): void {
    if (this.editingEntry()?.id === entry.id) this.editingEntry.set(null);
    this.entries.update(list => list.filter(e => e.id !== entry.id));
    this.totalEntries.update(n => n - 1);

    const ref = this.snackBar.open(`Deleted: ${entry.guest_name}`, 'UNDO', {
      duration: 5000, panelClass: 'warn-snackbar',
    });

    const timerId = setTimeout(() => {
      this.pendingDeletes.delete(entry.id);
      this.moiService.delete(entry.id).subscribe({
        next: () => this.loadEvent(),
        error: () => {
          this.entries.update(list => [entry, ...list].sort((a, b) => b.id - a.id));
          this.totalEntries.update(n => n + 1);
          this.snackBar.open('Delete failed — entry restored', 'Close', { duration: 3000 });
        },
      });
    }, 5000);

    this.pendingDeletes.set(entry.id, timerId);

    ref.onAction().subscribe(() => {
      clearTimeout(this.pendingDeletes.get(entry.id));
      this.pendingDeletes.delete(entry.id);
      this.entries.update(list => [entry, ...list].sort((a, b) => b.id - a.id));
      this.totalEntries.update(n => n + 1);
    });
  }

  startEdit(entry: MoiEntry): void {
    this.editingEntry.set(entry);
    this.editForm.patchValue({
      guest_name:    entry.guest_name,
      relationship:  entry.relationship  ?? '',
      side:          entry.side,
      amount:        entry.amount,
      payment_mode:  entry.payment_mode,
      cheque_number: entry.cheque_number ?? '',
      transaction_ref: entry.transaction_ref ?? '',
      city:          entry.city          ?? '',
      district:      entry.district      ?? '',
      phone:         entry.phone         ?? '',
      notes:         entry.notes         ?? '',
      received_by:   entry.received_by   ?? '',
    });
  }

  cancelEdit(): void {
    this.editingEntry.set(null);
  }

  saveEdit(): void {
    if (this.editForm.invalid) return;
    this.editSubmitting.set(true);
    const entry = this.editingEntry()!;
    this.moiService.update(entry.id, { ...this.editForm.value, event_id: this.eventId }).subscribe({
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
    window.print();
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

  openAiDialog(): void {
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
          const receiptNo = (this.event()?.moi_count ?? 0) + 1;
          this.receiptService.printReceipt(entry, this.event()!, '80', receiptNo, this.receiptLang());
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
            this.moiForm.get('amount')?.setValue(num);
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
}
