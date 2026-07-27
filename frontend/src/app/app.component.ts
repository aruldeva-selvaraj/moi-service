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
    query(':enter', [style({ opacity: 0, transform: 'translateY(12px)' })], { optional: true }),
    group([
      query(':leave', [animate('160ms ease-out', style({ opacity: 0, transform: 'translateY(-8px)' }))], { optional: true }),
      query(':enter', [animate('220ms 80ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))], { optional: true }),
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
    return outlet?.activatedRouteData?.['animation'] ?? outlet?.activatedRoute?.snapshot?.url?.[0]?.path ?? '';
  }

  ngAfterViewInit(): void {
    const loader = this.doc.getElementById('app-init-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 450);
    }
  }
}
