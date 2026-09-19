import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="ls-wrap" [style.padding]="padding">
      <div class="ls-ring" [style.width.px]="diameter + 24" [style.height.px]="diameter + 24">
        <!-- Outer ring -->
        <svg class="ls-svg-outer"
             [attr.width]="diameter + 24" [attr.height]="diameter + 24"
             [attr.viewBox]="'0 0 ' + (diameter + 24) + ' ' + (diameter + 24)"
             fill="none" style="position:absolute;inset:0;">
          <circle
            [attr.cx]="(diameter + 24) / 2" [attr.cy]="(diameter + 24) / 2"
            [attr.r]="diameter / 2 + 8"
            stroke="rgba(212,175,55,0.2)" stroke-width="1.5"/>
          <circle
            [attr.cx]="(diameter + 24) / 2" [attr.cy]="(diameter + 24) / 2"
            [attr.r]="diameter / 2 + 8"
            stroke="url(#ls-grad)" stroke-width="2"
            stroke-linecap="round"
            stroke-dasharray="35 140"
            class="ls-arc"/>
          <defs>
            <linearGradient id="ls-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFD700"/>
              <stop offset="100%" stop-color="#C0446A"/>
            </linearGradient>
          </defs>
        </svg>
        <!-- Inner ring (reverse) -->
        <svg class="ls-svg-inner"
             [attr.width]="diameter + 4" [attr.height]="diameter + 4"
             [attr.viewBox]="'0 0 ' + (diameter + 4) + ' ' + (diameter + 4)"
             fill="none"
             [style.width.px]="diameter + 4"
             [style.height.px]="diameter + 4"
             style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
          <circle
            [attr.cx]="(diameter + 4) / 2" [attr.cy]="(diameter + 4) / 2"
            [attr.r]="diameter / 2"
            stroke="#C0446A" stroke-width="1.5"
            stroke-linecap="round"
            stroke-dasharray="20 100"
            class="ls-arc"/>
        </svg>
        <div class="ls-circle" [style.width.px]="diameter - 8" [style.height.px]="diameter - 8">
          <img src="assets/images/brand-logo.jpeg" alt="Moify" class="ls-logo-img">
        </div>
      </div>
      @if (message) {
        <p class="ls-msg">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    @keyframes ls-spin     { to { transform: rotate(360deg); } }
    @keyframes ls-spin-rev { to { transform: rotate(-360deg); } }
    @keyframes ls-pulse    { 0%,100% { transform:scale(1); opacity:0.6; } 50% { transform:scale(1.25); opacity:0; } }
    @keyframes ls-fade-in  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

    .ls-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px;
      animation: ls-fade-in 0.5s ease both;
    }

    .ls-ring {
      position: relative;
      flex-shrink: 0;
    }

    .ls-ring svg {
      position: absolute; inset: 0;
    }

    .ls-svg-outer { animation: ls-spin 1.4s linear infinite; }
    .ls-svg-inner { animation: ls-spin-rev 1s linear infinite; inset: 10px !important; position: absolute; }

    .ls-arc { transform-origin: center; }

    .ls-circle {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      overflow: hidden;
      background: linear-gradient(135deg, #2a0f1f, #1a0a14);
      box-shadow:
        0 0 0 2px rgba(212,175,55,0.3),
        0 0 20px rgba(192,68,106,0.4),
        inset 0 0 10px rgba(0,0,0,0.3);
    }

    .ls-circle::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(192,68,106,0.2) 0%, transparent 70%);
      animation: ls-pulse 1.8s ease-in-out infinite;
    }

    .ls-logo-img {
      width: 100%; height: 100%;
      object-fit: cover; border-radius: 50%;
    }

    .ls-msg {
      margin: 0;
      font-size: 0.8rem;
      background: linear-gradient(90deg, var(--color-primary, #C0446A), var(--color-gold, #D4AF37));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() diameter = 48;
  @Input() message?: string;

  get padding() {
    return this.diameter <= 32 ? '16px' : '32px';
  }
}
