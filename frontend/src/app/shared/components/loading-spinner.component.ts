import { Component, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading-container">
      <mat-spinner [diameter]="diameter"></mat-spinner>
      @if (message) {
        <p class="loading-message">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      text-align: center;
      padding: 60px;

      mat-spinner { margin: 0 auto; }
    }
    .loading-message {
      margin-top: 16px;
      color: var(--text-muted, #8B6347);
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() diameter = 48;
  @Input() message?: string;
}
