import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="ls-wrap" [style.padding]="padding">
      <div class="ls-ring" [style.width.px]="diameter + 20" [style.height.px]="diameter + 20">
        <svg [attr.width]="diameter + 20" [attr.height]="diameter + 20"
             [attr.viewBox]="'0 0 ' + (diameter + 20) + ' ' + (diameter + 20)"
             fill="none">
          <circle
            [attr.cx]="(diameter + 20) / 2" [attr.cy]="(diameter + 20) / 2"
            [attr.r]="diameter / 2 + 6"
            stroke="#f0d8df" stroke-width="3"/>
          <circle
            [attr.cx]="(diameter + 20) / 2" [attr.cy]="(diameter + 20) / 2"
            [attr.r]="diameter / 2 + 6"
            stroke="#c0446a" stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="40 130"
            class="ls-arc"/>
        </svg>
        <div class="ls-circle" [style.width.px]="diameter" [style.height.px]="diameter">
          <img src="assets/images/brand-logo.jpeg" alt="Moify" class="ls-logo-img">
        </div>
      </div>
      @if (message) {
        <p class="ls-msg">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .ls-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px;
    }
    .ls-ring {
      position: relative;
      flex-shrink: 0;
    }
    .ls-ring svg {
      position: absolute;
      inset: 0;
      animation: ls-spin 1.2s linear infinite;
    }
    @keyframes ls-spin {
      to { transform: rotate(360deg); }
    }
    .ls-arc {
      transform-origin: center;
    }
    .ls-circle {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      overflow: hidden;
      background: #f5f0ee;
      box-shadow: 0 3px 12px rgba(123,26,54,0.2);
    }
    .ls-circle::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(192,68,106,0.15) 0%, transparent 70%);
      animation: ls-pulse 1.8s ease-in-out infinite;
    }
    @keyframes ls-pulse {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50%       { transform: scale(1.2); opacity: 0; }
    }
    .ls-logo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .ls-msg {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted, #a07060);
      letter-spacing: 0.3px;
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
