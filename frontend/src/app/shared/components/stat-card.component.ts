import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <div class="stat-card">
      <div class="stat-icon">{{ icon }}</div>
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
      @if (sub) {
        <div class="stat-sub">{{ sub }}</div>
      }
    </div>
  `,
  styles: [`
    .stat-sub {
      font-size: 0.75rem;
      color: var(--text-muted, #aaa);
      margin-top: 4px;
    }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) value!: string | number;
  @Input({ required: true }) label!: string;
  @Input() sub?: string;
}
