import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <div class="stat-card">
      <div class="stat-icon"><span aria-hidden="true">{{ icon }}</span></div>
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
      @if (sub) {
        <div class="stat-sub">{{ sub }}</div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px 16px;
      background: var(--surface, #fff);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,.08);
      gap: 6px;
      min-height: 110px;
    }

    .stat-icon {
      font-size: 2rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .stat-value {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text-primary, #1a1a1a);
      line-height: 1.1;
      word-break: break-word;
    }

    .stat-label {
      font-size: 0.78rem;
      color: var(--text-muted, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.3;
    }

    .stat-sub {
      font-size: 0.75rem;
      color: var(--text-muted, #aaa);
      margin-top: 2px;
    }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) value!: string | number | null;
  @Input({ required: true }) label!: string;
  @Input() sub?: string | null;
}
