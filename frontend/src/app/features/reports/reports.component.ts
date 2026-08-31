import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EventService } from '../../core/services/event.service';
import { MoiService } from '../../core/services/moi.service';
import { Event, EventReport, getEventConfig, getEventTitle } from '../../core/models/event.model';
import { RelationshipReport, MoiEntry, GeoBreakdownItem } from '../../core/models/moi.model';
import { ReceiptService, PrintSide, PrintFilter } from '../../core/services/receipt.service';
import { StatCardComponent, PageHeaderComponent, LoadingSpinnerComponent } from '../../shared/components/index';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, PercentPipe,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTableModule, MatTooltipModule, MatSnackBarModule,
    StatCardComponent, PageHeaderComponent, LoadingSpinnerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly moiService = inject(MoiService);
  private readonly receiptService = inject(ReceiptService);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(true);
  reportLoading = signal(false);
  events = signal<Event[]>([]);
  eventReport = signal<EventReport | null>(null);
  relationshipData = signal<RelationshipReport[]>([]);
  allEntries = signal<MoiEntry[]>([]);
  receivedByData = signal<{received_by: string; count: number; total_amount: number}[]>([]);
  cityData = signal<GeoBreakdownItem[]>([]);
  districtData = signal<GeoBreakdownItem[]>([]);
  selectedEventId: number | null = null;
  showPrintModal = signal(false);
  printFilterCity = '';
  printFilterDistrict = '';

  ngOnInit() {
    this.eventService.getAll().subscribe({
      next: (data) => {
        const filtered = data.filter(
          ev => ev.status === 'approved' || ev.status === 'completed'
        );
        this.events.set(filtered);
        this.loadReport();
      },
      error: () => this.loading.set(false),
    });
  }

  getEventTitle(ev: Event): string {
    return `${getEventConfig(ev.event_type).emoji} ${getEventTitle(ev)}`;
  }

  getEventConfig(ev: Event) {
    return getEventConfig(ev.event_type);
  }

  getSelectedEvent(): Event | undefined {
    return this.events().find(ev => ev.id === this.selectedEventId);
  }

  getSelectedEventConfig() {
    const ev = this.getSelectedEvent();
    return ev ? getEventConfig(ev.event_type) : getEventConfig('wedding');
  }

  loadReport() {
    this.loading.set(true);
    this.eventReport.set(null);
    this.allEntries.set([]);
    this.receivedByData.set([]);
    this.cityData.set([]);
    this.districtData.set([]);

    if (this.selectedEventId) {
      const eventId = this.selectedEventId;
      let loaded = 0;
      const total = 6;
      const done = () => { if (++loaded === total) this.loading.set(false); };

      this.eventService.getReport(eventId).subscribe({
        next: (r) => { this.eventReport.set(r); done(); },
        error: () => done(),
      });

      this.moiService.getByRelationship(eventId).subscribe({
        next: (r) => { this.relationshipData.set(r); done(); },
        error: () => done(),
      });

      // Paginated fetch: use page_size 5000; warn if result hits the cap
      this.moiService.getAll({ event_id: eventId, page: 1, page_size: 5000 }).subscribe({
        next: (r) => {
          this.allEntries.set(r.items);
          if (r.items.length >= 5000) {
            this.snackBar.open(
              'Warning: Only the first 5000 entries are loaded. Some records may be missing.',
              'Dismiss',
              { duration: 6000, panelClass: ['snack-warn'] }
            );
          }
          done();
        },
        error: () => done(),
      });

      this.moiService.getByReceivedBy(eventId).subscribe({
        next: (d) => { this.receivedByData.set(d); done(); },
        error: () => done(),
      });

      this.moiService.getByCityBreakdown(eventId).subscribe({
        next: (d) => { this.cityData.set(d); done(); },
        error: () => done(),
      });

      this.moiService.getByDistrictBreakdown(eventId).subscribe({
        next: (d) => { this.districtData.set(d); done(); },
        error: () => done(),
      });
    } else {
      this.moiService.getByRelationship().subscribe({
        next: (r) => { this.relationshipData.set(r); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    }
  }

  openA4PrintModal(): void {
    if (this.allEntries().length > 0) {
      this.printFilterCity = '';
      this.printFilterDistrict = '';
      this.showPrintModal.set(true);
    }
  }

  printA4WithSide(side: PrintSide): void {
    this.showPrintModal.set(false);
    const ev = this.getSelectedEvent();
    if (ev) {
      const filter: PrintFilter = {
        side,
        city: this.printFilterCity || undefined,
        district: this.printFilterDistrict || undefined,
      };
      this.receiptService.printA4Sheet(this.allEntries(), ev, filter);
    }
  }

  downloadA4WithSide(side: PrintSide): void {
    this.showPrintModal.set(false);
    const ev = this.getSelectedEvent();
    if (ev) {
      const filter: PrintFilter = {
        side,
        city: this.printFilterCity || undefined,
        district: this.printFilterDistrict || undefined,
      };
      this.receiptService.downloadA4Sheet(this.allEntries(), ev, filter);
    }
  }

  printEventReport(): void {
    const ev = this.getSelectedEvent();
    const report = this.eventReport();
    if (ev && report) {
      this.receiptService.printEventReport(report, ev);
    }
  }

  exportCsv(): void {
    const entries = this.allEntries();
    if (!entries.length) return;
    const cols = ['guest_name','relationship','side','amount','payment_mode','city','district','received_by'];
    const header = cols.map(c => '"'+c+'"').join(',');
    const rows = entries.map((e:any) => cols.map(c => '"'+(e[c]??'').toString().replace(/"/g,'""')+'"').join(','));
    const csv = '﻿' + [header,...rows].join('\r\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='moi-entries.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),150);
  }

  exportSummaryCsv(): void {
    const report = this.eventReport();
    if (!report) return;
    const rows = [
      ['"Metric"','"Value"'],
      ['"Total Guests"',report.moi_count],
      ['"Total Amount"',report.total_amount],
      ['"Cash"',report.cash_amount],
      ['"Cheque"',report.cheque_amount],
      ['"Online"',report.online_amount],
      ['"DD"',report.dd_amount ?? 0],
    ];
    const csv = '﻿' + rows.map(r=>r.join(',')).join('\r\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='event-summary.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),150);
  }

  // ── Chart helpers ──────────────────────────────────────────────────────────

  private readonly C = 251.3; // 2 * π * 40

  donutDash(amount: number, total: number): string {
    const pct = total ? amount / total : 0;
    return `${(pct * this.C).toFixed(1)} ${this.C}`;
  }

  donutOffset(priorAmount: number, total: number): number {
    const prior = total ? priorAmount / total : 0;
    return this.C / 4 - prior * this.C;
  }

  barWidth(amount: number, total: number): number {
    return total ? Math.max(2, Math.round((amount / total) * 100)) : 0;
  }

  readonly topRelMax = computed(() => {
    const data = this.relationshipData();
    return data.length ? Math.max(...data.map(r => r.total_amount)) : 1;
  });

  avgAmount(r: RelationshipReport): number {
    if ((r as any).avg_amount !== undefined && (r as any).avg_amount !== null) {
      return (r as any).avg_amount;
    }
    return r.count > 0 ? r.total_amount / r.count : 0;
  }

  sharing = signal(false);

  // ── WhatsApp / Share summary with PDF attachment ───────────────────────────

  async shareEventSummary(): Promise<void> {
    const ev = this.getSelectedEvent();
    const report = this.eventReport();
    if (!ev || !report || this.sharing()) return;

    this.sharing.set(true);
    try {
      await this.receiptService.shareReportAsPdf(report, ev);
    } catch {
      this.snackBar.open('Could not share. Please try again.', 'Close', { duration: 3000 });
    } finally {
      this.sharing.set(false);
    }
  }
}
