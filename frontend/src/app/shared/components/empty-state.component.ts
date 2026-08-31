import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon }}</div>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      @if (actionLabel && actionLink) {
        <a mat-raised-button color="primary" [routerLink]="actionLink" class="empty-action">
          {{ actionLabel }}
        </a>
      }
    </div>
  `,
  styles: [`.empty-action { margin-top: 16px; }`]
})
export class EmptyStateComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) message!: string;
  @Input() actionLabel?: string;
  @Input() actionLink?: string | string[];
}
