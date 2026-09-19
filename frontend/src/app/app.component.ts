import { Component, inject, AfterViewInit, DOCUMENT } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate, query, group } from '@angular/animations';
import { NavComponent } from './shared/components/nav.component';
import { ThemePickerComponent } from './shared/components/theme-picker.component';
import { ThemeService } from './core/services/theme.service';

export const routeAnimation = trigger('routeAnimation', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(18px) scale(0.98)' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('200ms cubic-bezier(0.4,0,1,1)', style({ opacity: 0, transform: 'translateY(-10px) scale(0.98)' }))
      ], { optional: true }),
      query(':enter', [
        animate('350ms 100ms cubic-bezier(0.34,1.56,0.64,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ], { optional: true }),
    ]),
  ]),
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavComponent, ThemePickerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [routeAnimation],
})
export class AppComponent implements AfterViewInit {
  private _theme = inject(ThemeService);
  private router = inject(Router);
  private doc = inject(DOCUMENT);

  isLoginPage = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.startsWith('/login'))
    ),
    { initialValue: false }
  );

  getRouteState(outlet: RouterOutlet) {
    if (!outlet?.isActivated) return '';
    return outlet.activatedRouteData?.['animation'] ?? outlet.activatedRoute?.snapshot?.url?.[0]?.path ?? '';
  }

  ngAfterViewInit(): void {
    const loader = this.doc.getElementById('app-init-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 450);
    }
  }
}
