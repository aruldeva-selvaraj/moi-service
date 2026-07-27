import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper" [attr.data-variant]="variant">
      @if (variant === 'cards') {
        <div class="sk-grid">
          @for (_ of rows; track $index) {
            <div class="sk-card">
              <div class="sk-line sk-title"></div>
              <div class="sk-line sk-sub"></div>
              <div class="sk-divider"></div>
              <div class="sk-line sk-body"></div>
              <div class="sk-line sk-body sk-short"></div>
            </div>
          }
        </div>
      } @else if (variant === 'table') {
        <div class="sk-table">
          <div class="sk-table-header">
            @for (_ of cols; track $index) {
              <div class="sk-th"></div>
            }
          </div>
          @for (_ of rows; track $index) {
            <div class="sk-table-row">
              @for (_ of cols; track $index) {
                <div class="sk-td"></div>
              }
            </div>
          }
        </div>
      } @else {
        @for (_ of rows; track $index) {
          <div class="sk-line" [style.width]="lineWidth($index)"></div>
        }
      }
    </div>
  `,
  styles: [`
    .skeleton-wrapper { padding: 8px 0; }

    @keyframes sk-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }

    %shimmer {
      background: linear-gradient(90deg,
        var(--bg-stat, #f0f0f0) 25%,
        rgba(255,255,255,0.6) 50%,
        var(--bg-stat, #f0f0f0) 75%
      );
      background-size: 800px 100%;
      animation: sk-shimmer 1.4s ease-in-out infinite;
      border-radius: 6px;
    }

    .sk-line {
      @extend %shimmer;
      height: 14px;
      margin-bottom: 10px;
      width: 100%;

      &.sk-title  { height: 20px; width: 55%; margin-bottom: 8px; }
      &.sk-sub    { height: 12px; width: 35%; margin-bottom: 14px; }
      &.sk-body   { height: 13px; }
      &.sk-short  { width: 65%; }
    }

    .sk-divider {
      height: 1px;
      background: var(--border-color, #eee);
      margin: 10px 0;
    }

    .sk-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .sk-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #eee);
      border-radius: var(--radius-md, 12px);
      padding: 20px;
    }

    .sk-table { width: 100%; }

    .sk-table-header,
    .sk-table-row {
      display: flex;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-color, #f0f0f0);
    }

    .sk-table-header { background: var(--table-header-bg, rgba(139,69,19,0.08)); }

    .sk-th {
      @extend %shimmer;
      height: 14px;
      flex: 1;
    }

    .sk-td {
      @extend %shimmer;
      height: 12px;
      flex: 1;
    }
  `],
})
export class SkeletonLoaderComponent {
  @Input() variant: 'lines' | 'cards' | 'table' = 'lines';
  @Input() count = 3;
  @Input() colCount = 6;

  get rows(): number[] { return Array(this.count).fill(0); }
  get cols(): number[] { return Array(this.colCount).fill(0); }

  lineWidth(i: number): string {
    const widths = ['100%', '80%', '90%', '65%', '75%'];
    return widths[i % widths.length];
  }
}
