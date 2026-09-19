import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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

    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes gradientShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
    @keyframes cardReveal { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 26px 20px 20px;
      background: var(--bg-card, #fff);
      border: var(--card-border, 1px solid rgba(192,68,106,0.12));
      border-radius: var(--radius-md, 16px);
      box-shadow: var(--card-shadow, 0 4px 20px rgba(60,10,30,0.08));
      gap: 8px;
      min-height: 130px;
      position: relative;
      overflow: hidden;
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease;
      animation: cardReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
      cursor: default;

      /* Gradient top accent */
      &::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #C0446A, #D4AF37, #C0446A);
        background-size: 200% auto;
        animation: gradientShift 3s ease infinite;
        border-radius: 16px 16px 0 0;
      }

      /* Corner glow */
      &::after {
        content: '';
        position: absolute;
        top: -30px; right: -30px;
        width: 80px; height: 80px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(212,175,55,0.15), transparent 70%);
        pointer-events: none;
      }

      &:hover {
        transform: translateY(-6px) scale(1.03);
        box-shadow: 0 16px 50px rgba(192,68,106,0.18), 0 4px 16px rgba(0,0,0,0.1);
      }
    }

    .stat-icon {
      font-size: 2.4rem;
      line-height: 1;
      flex-shrink: 0;
      animation: float 4s ease-in-out infinite;
      filter: drop-shadow(0 2px 8px rgba(192,68,106,0.25));
      position: relative; z-index: 1;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      font-family: var(--font-heading, 'Playfair Display', serif);
      background: linear-gradient(135deg, #C0446A 0%, #8B1A36 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.1;
      word-break: break-word;
      position: relative; z-index: 1;
    }

    .stat-label {
      font-size: 0.74rem;
      color: var(--text-muted, #7A5060);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      line-height: 1.3;
      position: relative; z-index: 1;
    }

    .stat-sub {
      font-size: 0.72rem;
      color: var(--text-muted, #7A5060);
      opacity: 0.7;
      margin-top: 2px;
      position: relative; z-index: 1;
    }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) value!: string | number | null;
  @Input({ required: true }) label!: string;
  @Input() sub?: string | null;
}
