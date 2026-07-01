import { Component, inject } from '@angular/core';
import { ThemeService, PRESET_THEMES, Mood, Depth, Vibe } from '../../core/services/theme.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './theme-picker.component.html',
  styleUrls: ['./theme-picker.component.scss'],
})
export class ThemePickerComponent {
  ts = inject(ThemeService);
  presets = PRESET_THEMES;

  primarySwatches = ['#8B4513', '#6B21A8', '#1E40AF', '#BE185D', '#065F46', '#1E293B', '#B45309', '#0F766E'];
  accentSwatches  = ['#8B0000', '#C084FC', '#06B6D4', '#F43F5E', '#10B981', '#3B82F6', '#F59E0B', '#EC4899'];

  getEventValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  isActivePreset(preset: { config: { primaryColor: string; accentColor: string; mood: string; depth: string; vibe: string } }): boolean {
    const c = this.ts.config();
    return c.primaryColor === preset.config.primaryColor &&
           c.accentColor  === preset.config.accentColor  &&
           c.mood  === preset.config.mood  &&
           c.depth === preset.config.depth &&
           c.vibe  === preset.config.vibe;
  }
}
