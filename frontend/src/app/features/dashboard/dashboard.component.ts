import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { EventService } from '../../core/services/event.service';
import { MoiService } from '../../core/services/moi.service';
import { Event, getEventConfig, getEventTitle } from '../../core/models/event.model';
import { SummaryStats } from '../../core/models/moi.model';
import { StatCardComponent, EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent } from '../../shared/components/index';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CurrencyPipe, DatePipe,
    MatButtonModule, MatIconModule, MatDividerModule,
    StatCardComponent, EmptyStateComponent, PageHeaderComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly moiService = inject(MoiService);

  loading = signal(true);
  events = signal<Event[]>([]);
  stats = signal<SummaryStats | null>(null);

  ngOnInit() {
    this.loadData();
  }

  getEventTitle(ev: Event): string {
    return getEventTitle(ev);
  }

  getEventEmoji(ev: Event): string {
    return getEventConfig(ev.event_type).emoji;
  }

  private loadData() {
    this.loading.set(true);
    let loaded = 0;
    const checkDone = () => { if (++loaded === 2) this.loading.set(false); };

    this.eventService.getAll().subscribe({
      next: (data) => { this.events.set(data.slice(0, 6)); checkDone(); },
      error: () => checkDone(),
    });

    this.moiService.getSummary().subscribe({
      next: (data) => { this.stats.set(data); checkDone(); },
      error: () => checkDone(),
    });
  }
}
