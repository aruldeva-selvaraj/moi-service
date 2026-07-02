import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { Event, EventReport, getEventConfig, getEventTitle } from '../../core/models/event.model';
import { SummaryStats } from '../../core/models/moi.model';
import { StatCardComponent, EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent } from '../../shared/components/index';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe, PercentPipe, FormsModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatFormFieldModule, MatSelectModule,
    StatCardComponent, EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly moiService = inject(MoiService);
  private readonly receiptService = inject(ReceiptService);

  loading = signal(true);
  reportLoading = signal(false);
  events = signal<Event[]>([]);
  stats = signal<SummaryStats | null>(null);
  selectedEventId = signal<number | null>(null);
  eventReport = signal<EventReport | null>(null);

  selectedEvent = computed(() =>
    this.events().find((ev: Event) => ev.id === this.selectedEventId()) ?? null
  );

  selectedEventConfig = computed(() => {
    const ev = this.selectedEvent();
    return ev ? getEventConfig(ev.event_type) : getEventConfig('wedding');
  });

  ngOnInit() {
    this.loadData();
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
        if (data.length > 0) {
          this.selectedEventId.set(data[0].id);
          this.loadEventReport(data[0].id);
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
