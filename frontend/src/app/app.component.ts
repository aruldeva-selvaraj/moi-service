import { Component, inject, AfterViewInit, DOCUMENT } from '@angular/core';
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
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
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

  ngAfterViewInit(): void {
    const loader = this.doc.getElementById('app-init-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 450);
    }
  }
}
