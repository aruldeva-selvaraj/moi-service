import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EventService } from '../../core/services/event.service';
import { MoiService } from '../../core/services/moi.service';
import { ReceiptService } from '../../core/services/receipt.service';
import { AuthService } from '../../core/services/auth.service';
import { Event, EventReport, getEventConfig, getEventTitle } from '../../core/models/event.model';
import { SummaryStats } from '../../core/models/moi.model';
import { StatCardComponent, EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent } from '../../shared/components/index';
import { OnboardingOverlayComponent } from '../../shared/components/onboarding-overlay.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe, PercentPipe, FormsModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatFormFieldModule, MatSelectModule,
    StatCardComponent, EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent,
    OnboardingOverlayComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly eventService = inject(EventService);
  private readonly moiService = inject(MoiService);
  private readonly receiptService = inject(ReceiptService);
  readonly auth = inject(AuthService);

  showOnboarding = signal(!localStorage.getItem('moify_onboarded'));

  // ── Carousel ──────────────────────────────────────────────
  readonly banners = [
    'assets/images/banner/banner1.jpeg',
  ];
  activeSlide = signal(0);
  private slideTimer: ReturnType<typeof setInterval> | null = null;

  loading = signal(true);
  reportLoading = signal(false);
  events = signal<Event[]>([]);
  stats = signal<SummaryStats | null>(null);
  selectedEventId = signal<number | null>(null);
  eventReport = signal<EventReport | null>(null);

  // Include both approved and completed events
  approvedEvents = computed(() =>
    this.events().filter((ev: Event) => ev.status === 'approved' || ev.status === 'completed')
  );
  pendingCount = computed(() => this.events().filter((ev: Event) => ev.status === 'pending').length);
  recentEvents = computed(() => this.approvedEvents().slice(0, 6));

  selectedEvent = computed(() =>
    this.approvedEvents().find((ev: Event) => ev.id === this.selectedEventId()) ?? null
  );

  selectedEventConfig = computed(() => {
    const ev = this.selectedEvent();
    return ev ? getEventConfig(ev.event_type) : getEventConfig('wedding');
  });

  ngOnInit() {
    this.loadData();
    if (this.banners.length > 1) {
      this.slideTimer = setInterval(() => this.nextSlide(), 4000);
    }
  }

  ngOnDestroy() {
    if (this.slideTimer) clearInterval(this.slideTimer);
  }

  nextSlide() {
    this.activeSlide.update((i: number) => (i + 1) % this.banners.length);
  }

  prevSlide() {
    this.activeSlide.update((i: number) => (i - 1 + this.banners.length) % this.banners.length);
  }

  goToSlide(index: number) {
    this.activeSlide.set(index);
  }

  getEventTitle(ev: Event): string {
    return getEventTitle(ev);
  }

  getEventEmoji(ev: Event): string {
    return getEventConfig(ev.event_type).emoji;
  }

  onEventChange(eventId: number | null) {
    this.selectedEventId.set(eventId);
    this.loadEventReport(eventId);
  }

  // Export moi entries for the selected event as CSV with BOM
  exportEventCsv() {
    const eventId = this.selectedEventId();
    if (!eventId) return;

    this.moiService.getAll({ event_id: eventId, page: 1, page_size: 5000 }).subscribe({
      next: (r) => {
        const entries = r.items;
        if (!entries.length) return;
        const cols = ['guest_name', 'relationship', 'side', 'amount', 'payment_mode', 'city', 'district', 'received_by'];
        const header = cols.map(c => `"${c}"`).join(',');
        const rows = entries.map((e: any) =>
          cols.map(c => `"${(e[c] ?? '').toString().replace(/"/g, '""')}"`).join(',')
        );
        const csv = '﻿' + [header, ...rows].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moi-entries-event-${eventId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      },
    });
  }

  generatePdfReport() {
    const ev = this.selectedEvent();
    const report = this.eventReport();
    if (ev && report) {
      this.receiptService.printEventReport(report, ev);
    }
  }

  private loadData() {
    this.loading.set(true);
    let loaded = 0;
    const checkDone = () => { if (++loaded === 2) this.loading.set(false); };

    this.eventService.getAll().subscribe({
      next: (data) => {
        this.events.set(data);
        const approvedOrCompleted = data.filter(
          (ev: Event) => ev.status === 'approved' || ev.status === 'completed'
        );
        if (approvedOrCompleted.length > 0) {
          this.selectedEventId.set(approvedOrCompleted[0].id);
          this.loadEventReport(approvedOrCompleted[0].id);
        }
        checkDone();
      },
      error: () => checkDone(),
    });

    this.moiService.getSummary().subscribe({
      next: (data) => { this.stats.set(data); checkDone(); },
      error: () => checkDone(),
    });
  }

  private loadEventReport(eventId: number | null) {
    if (!eventId) {
      this.eventReport.set(null);
      return;
    }
    this.reportLoading.set(true);
    this.eventService.getReport(eventId).subscribe({
      next: (r: EventReport) => { this.eventReport.set(r); this.reportLoading.set(false); },
      error: () => this.reportLoading.set(false),
    });
  }
}
