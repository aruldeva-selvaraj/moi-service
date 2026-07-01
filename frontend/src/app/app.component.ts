import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './shared/components/nav.component';
import { ThemePickerComponent } from './shared/components/theme-picker.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, ThemePickerComponent],
  template: `
    <app-nav />
    <main class="main-content">
      <router-outlet />
    </main>
    <app-theme-picker />
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
  // Inject to trigger theme initialization on app start
  private _theme = inject(ThemeService);
}
