import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="page-header" [class.page-header--row]="hasActions">
      <div>
        <h1>{{ title }}</h1>
        @if (subtitle) {
          <p>{{ subtitle }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
  styles: [`
    .page-header--row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
  `]
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() hasActions = false;
}
