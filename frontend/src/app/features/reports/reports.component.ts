import { Component, OnInit, inject, signal } from '@angular/core';
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
import { EventService } from '../../core/services/event.service';
import { MoiService } from '../../core/services/moi.service';
import { Event, EventReport, getEventConfig, getEventTitle } from '../../core/models/event.model';
import { RelationshipReport, MoiEntry } from '../../core/models/moi.model';
import { ReceiptService, PrintSide, PrintFilter } from '../../core/services/receipt.service';
import { StatCardComponent, PageHeaderComponent, LoadingSpinnerComponent } from '../../shared/components/index';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe, PercentPipe,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTableModule, MatTooltipModule,
    StatCardComponent, PageHeaderComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly moiService = inject(MoiService);
  private readonly receiptService = inject(ReceiptService);

  loading = signal(true);
  events = signal<Event[]>([]);
  eventReport = signal<EventReport | null>(null);
  relationshipData = signal<RelationshipReport[]>([]);
  allEntries = signal<MoiEntry[]>([]);
  selectedEventId: number | null = null;
  showPrintModal = signal(false);
  printFilterCity = '';
  printFilterDistrict = '';

  ngOnInit() {
    this.eventService.getAll().subscribe({
      next: (data) => { this.events.set(data); this.loadReport(); },
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

    if (this.selectedEventId) {
      let loaded = 0;
      const done = () => { if (++loaded === 3) this.loading.set(false); };

      this.eventService.getReport(this.selectedEventId).subscribe({
        next: (r) => { this.eventReport.set(r); done(); },
        error: () => done(),
      });

      this.moiService.getByRelationship(this.selectedEventId).subscribe({
        next: (r) => { this.relationshipData.set(r); done(); },
        error: () => done(),
      });

      this.moiService.getAll({ event_id: this.selectedEventId, page: 1, page_size: 1000 }).subscribe({
        next: (r) => { this.allEntries.set(r.items); done(); },
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

  topRelMax(): number {
    const data = this.relationshipData();
    return data.length ? Math.max(...data.map(r => r.total_amount)) : 1;
  }

  // ── WhatsApp / Share summary ───────────────────────────────────────────────

  shareEventSummary(): void {
    const ev = this.getSelectedEvent();
    const report = this.eventReport();
    const entries = this.allEntries();
    if (!ev || !report) return;

    const cfg = getEventConfig(ev.event_type);
    const fmt = (n: number) => new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(n);

    const lines = [
      `${cfg.emoji} *${getEventTitle(ev)}*`,
      `📅 ${new Date(ev.event_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      ev.venue ? `📍 ${ev.venue}` : '',
      ``,
      `💰 *Total Moi: ${fmt(report.total_amount)}*`,
      `👥 Guests: ${report.moi_count}`,
      report.moi_count > 0 ? `📊 Average: ${fmt(report.total_amount / report.moi_count)}` : '',
      ``,
      `🤵 ${cfg.sideALabel}: ${fmt(report.groom_amount)}`,
      `👰 ${cfg.sideBLabel}: ${fmt(report.bride_amount)}`,
      ``,
      `💵 Cash: ${fmt(report.cash_amount)}`,
      `📱 Online: ${fmt(report.online_amount)}`,
      `📝 Cheque: ${fmt(report.cheque_amount)}`,
      ``,
      `_Generated by Moify_ 📱`,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      navigator.share({ title: `${getEventTitle(ev)} — Moi Summary`, text: lines }).catch(() => {});
    } else {
      navigator.clipboard.writeText(lines).then(() => {
        alert('Summary copied to clipboard! Paste it in WhatsApp.');
      }).catch(() => {});
    }
  }
}
