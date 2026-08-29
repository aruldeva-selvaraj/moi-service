import { Component, OnInit, inject, signal, ElementRef, ViewChild, DestroyRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
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
    FormsModule, RouterLink, RouterLinkActive, CurrencyPipe, DatePipe,
    MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule,
    MatSidenavModule, MatListModule,
  ],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent implements OnInit {
  readonly ts   = inject(ThemeService);
  auth          = inject(AuthService);
  private moiService    = inject(MoiService);
  private eventService  = inject(EventService);
  private readonly router      = inject(Router);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly searchQuery$ = new Subject<string>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  searchOpen    = signal(false);
  searchLoading = signal(false);
  searchQuery   = '';
  searchResults = signal<SearchResult[]>([]);
  pendingCount  = signal(0);
  eventResults  = signal<any[]>([]);
  mobileMenuOpen = signal(false);

  private deferredInstallPrompt: any = null;
  showInstallBtn = signal(false);

  private events: Event[] = [];

  ngOnInit(): void {
    this.refreshPendingCount();

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.showInstallBtn.set(true);
    });

    // Close mobile menu and refresh count on navigation
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.searchOpen.set(false);
      this.mobileMenuOpen.set(false);
      this.clearSearch();
      this.refreshPendingCount();
    });

    // Search pipeline: debounce + switchMap for moi entries
    this.searchQuery$.pipe(
      debounceTime(300),
      switchMap(q => q.length < 2 ? [] : this.moiService.getAll({ page: 1, page_size: 10, search: q })),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (resp: any) => {
        this.searchResults.set((resp.items || []).map((r: any) => ({
          ...r,
          event_name: this.events.find((e: any) => e.id === r.event_id)?.primary_name || 'Event',
        })));
        this.searchLoading.set(false);
      },
      error: () => this.searchLoading.set(false),
    });
  }

  refreshPendingCount(): void {
    this.eventService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (evs: any[]) => this.pendingCount.set(evs.filter((e: any) => e.status === 'pending').length),
      error: () => {},
    });
  }

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

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  installPwa(): void {
    if (!this.deferredInstallPrompt) return;
    this.deferredInstallPrompt.prompt();
    this.deferredInstallPrompt.userChoice.then(() => {
      this.deferredInstallPrompt = null;
      this.showInstallBtn.set(false);
    });
  }

  getUserInitials(): string {
    const user = this.auth.currentUser?.();
    if (!user) return '?';
    const name: string = (user as any).full_name || (user as any).username || '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('') || '?';
  }

  getDisplayName(): string {
    const user = this.auth.currentUser?.();
    if (!user) return 'User';
    return (user as any).full_name || (user as any).username || 'User';
  }

  getRole(): string {
    const user = this.auth.currentUser?.();
    if (!user) return '';
    return (user as any).role || '';
  }

  private loadEvents(): void {
    if (this.events.length) return;
    this.eventService.getAll().subscribe({ next: evs => this.events = evs });
  }

  onSearchInput(): void {
    const q = this.searchQuery;
    if (q.length < 2) {
      this.searchResults.set([]);
      this.eventResults.set(this.events.filter(e =>
        (e.primary_name || '').toLowerCase().includes(q.toLowerCase()) ||
        (e.family_name || '').toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5));
      return;
    }
    this.searchLoading.set(true);
    this.eventResults.set(this.events.filter(e =>
      (e.primary_name || '').toLowerCase().includes(q.toLowerCase()) ||
      (e.family_name || '').toLowerCase().includes(q.toLowerCase())
    ).slice(0, 5));
    this.searchQuery$.next(q);
  }

  private getEventName(id: number): string {
    const ev = this.events.find(e => e.id === id);
    if (!ev) return `Event #${id}`;
    return ev.secondary_name ? `${ev.primary_name} ♡ ${ev.secondary_name}` : ev.primary_name;
  }
}
