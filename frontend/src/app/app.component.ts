import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavComponent } from './shared/components/nav.component';
import { ThemePickerComponent } from './shared/components/theme-picker.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavComponent, ThemePickerComponent],
  template: `
    @if (!isLoginPage()) {
      <app-nav />
    }
    <main [class.main-content]="!isLoginPage()">
      <router-outlet />
    </main>
    @if (!isLoginPage()) {
      <app-theme-picker />
    }
  `,
  styles: [`
    .main-content {
      min-height: calc(100vh - 64px);
      background-color: var(--bg-page);
      transition: background-color 0.4s ease;
    }
  `]
})
export class AppComponent {
  private _theme = inject(ThemeService);
  private router = inject(Router);

  isLoginPage = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.startsWith('/login'))
    ),
    { initialValue: false }
  );
}
