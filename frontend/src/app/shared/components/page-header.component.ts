import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header" [class.page-header--row]="hasActions">
      <div class="page-header-text">
        <h1>{{ title }}</h1>
        @if (subtitle) {
          <p>{{ subtitle }}</p>
        }
        <div class="page-header-divider"></div>
      </div>
      <ng-content />
    </div>
  `,
  styles: [`
    @keyframes fadeDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes gradientShift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
    @keyframes expandWidth { from { width: 0; } to { width: 60px; } }

    .page-header {
      margin-bottom: 28px;
      animation: fadeDown 0.5s ease both;
    }

    .page-header--row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-header-text h1 {
      font-family: var(--font-heading, 'Playfair Display', serif);
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--text-heading, #3A0D20) 0%, var(--color-primary, #C0446A) 80%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .page-header-text p {
      color: var(--text-muted, #7A5060);
      margin-top: 6px;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .page-header-divider {
      height: 2px;
      width: 60px;
      margin-top: 10px;
      background: linear-gradient(90deg, var(--color-primary, #C0446A), var(--color-gold, #D4AF37));
      border-radius: 1px;
      animation: expandWidth 0.6s 0.3s ease both;
    }
  `]
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() hasActions = false;
}
