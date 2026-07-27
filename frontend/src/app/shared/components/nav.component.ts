import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { MoiService } from '../../core/services/moi.service';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';
import { MoiEntry } from '../../core/models/moi.model';

interface SearchResult extends MoiEntry { event_name: string; }

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, RouterLinkActive, CurrencyPipe,
    MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
  ],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent {
  ts   = inject(ThemeService);
  auth = inject(AuthService);
  private moiService   = inject(MoiService);
  private eventService = inject(EventService);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  searchOpen    = signal(false);
  searchLoading = signal(false);
  searchQuery   = '';
  searchResults = signal<SearchResult[]>([]);

  private events: Event[] = [];
  private searchTimer?: ReturnType<typeof setTimeout>;

  toggleSearch(): void {
    this.searchOpen.update(v => !v);
    if (this.searchOpen()) {
      this.loadEvents();
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 80);
    } else {
      this.clearSearch();
    }
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
  }

  private loadEvents(): void {
    if (this.events.length) return;
    this.eventService.getAll().subscribe({ next: evs => this.events = evs });
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    if (this.searchQuery.length < 2) { this.searchResults.set([]); return; }
    this.searchLoading.set(true);
    this.searchTimer = setTimeout(() => {
      this.moiService.getAll({ search: this.searchQuery, page: 1, page_size: 8 }).subscribe({
        next: resp => {
          const results = resp.items.map(e => ({
            ...e,
            event_name: this.getEventName(e.event_id),
          }));
          this.searchResults.set(results);
          this.searchLoading.set(false);
        },
        error: () => this.searchLoading.set(false),
      });
    }, 300);
  }

  private getEventName(id: number): string {
    const ev = this.events.find(e => e.id === id);
    if (!ev) return `Event #${id}`;
    return ev.secondary_name ? `${ev.primary_name} ♡ ${ev.secondary_name}` : ev.primary_name;
  }
}
