import { Injectable, signal, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type Mood = 'light' | 'dark';
export type Depth = 'flat' | 'glass' | 'elevated' | 'neon' | 'liquid-glass';
export type Vibe = 'classic' | 'festive' | 'royal' | 'modern';

export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  mood: Mood;
  depth: Depth;
  vibe: Vibe;
}

export interface PresetTheme {
  name: string;
  icon: string;
  config: ThemeConfig;
}

const STORAGE_KEY = 'moi-theme-config';

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#8B4513',
  accentColor: '#8B0000',
  mood: 'light',
  depth: 'elevated',
  vibe: 'festive',
};

export const PRESET_THEMES: PresetTheme[] = [
  {
    name: 'Wedding Gold',
    icon: '🪔',
    config: { primaryColor: '#8B4513', accentColor: '#8B0000', mood: 'light', depth: 'elevated', vibe: 'festive' },
  },
  {
    name: 'Royal Purple',
    icon: '👑',
    config: { primaryColor: '#6B21A8', accentColor: '#C084FC', mood: 'dark', depth: 'glass', vibe: 'royal' },
  },
  {
    name: 'Ocean Blue',
    icon: '🌊',
    config: { primaryColor: '#1E40AF', accentColor: '#06B6D4', mood: 'light', depth: 'glass', vibe: 'modern' },
  },
  {
    name: 'Rose Gold',
    icon: '🌹',
    config: { primaryColor: '#BE185D', accentColor: '#F43F5E', mood: 'light', depth: 'elevated', vibe: 'classic' },
  },
  {
    name: 'Emerald',
    icon: '🍃',
    config: { primaryColor: '#065F46', accentColor: '#10B981', mood: 'light', depth: 'flat', vibe: 'modern' },
  },
  {
    name: 'Midnight Neon',
    icon: '🌙',
    config: { primaryColor: '#3B82F6', accentColor: '#A855F7', mood: 'dark', depth: 'neon', vibe: 'modern' },
  },
  {
    name: 'Liquid Glass',
    icon: '🫧',
    config: { primaryColor: '#5E5CE6', accentColor: '#BF5AF2', mood: 'light', depth: 'liquid-glass', vibe: 'modern' },
  },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private doc = inject(DOCUMENT);

  config = signal<ThemeConfig>(this.loadFromStorage());
  isPickerOpen = signal(false);

  constructor() {
    effect(() => {
      this.applyTheme(this.config());
      this.saveToStorage(this.config());
    });
  }

  togglePicker(): void {
    this.isPickerOpen.update(v => !v);
  }

  closePicker(): void {
    this.isPickerOpen.set(false);
  }

  applyPreset(preset: PresetTheme): void {
    this.config.set({ ...preset.config });
  }

  updateColor(key: 'primaryColor' | 'accentColor', value: string): void {
    this.config.update(c => ({ ...c, [key]: value }));
  }

  updateMood(mood: Mood): void {
    this.config.update(c => ({ ...c, mood }));
  }

  updateDepth(depth: Depth): void {
    this.config.update(c => ({ ...c, depth }));
  }

  updateVibe(vibe: Vibe): void {
    this.config.update(c => ({ ...c, vibe }));
  }

  reset(): void {
    this.config.set({ ...DEFAULT_THEME });
  }

  private applyTheme(cfg: ThemeConfig): void {
    const root = this.doc.documentElement;
    const [pr, pg, pb] = hexToRgb(cfg.primaryColor);
    const [ar, ag, ab] = hexToRgb(cfg.accentColor);

    // D1: Primary color variants
    root.style.setProperty('--color-primary', cfg.primaryColor);
    root.style.setProperty('--color-primary-dark', darken(cfg.primaryColor, 0.3));
    root.style.setProperty('--color-primary-darker', darken(cfg.primaryColor, 0.55));
    root.style.setProperty('--color-primary-light', lighten(cfg.primaryColor, 0.5));
    root.style.setProperty('--color-primary-lighter', lighten(cfg.primaryColor, 0.8));
    root.style.setProperty('--color-primary-rgb', `${pr}, ${pg}, ${pb}`);

    // D2: Accent color variants
    root.style.setProperty('--color-accent', cfg.accentColor);
    root.style.setProperty('--color-accent-dark', darken(cfg.accentColor, 0.3));
    root.style.setProperty('--color-accent-light', lighten(cfg.accentColor, 0.6));
    root.style.setProperty('--color-accent-rgb', `${ar}, ${ag}, ${ab}`);

    // D3: Mood — background and text
    const isDark = cfg.mood === 'dark';
    if (isDark) {
      root.style.setProperty('--bg-page', '#0f172a');
      root.style.setProperty('--bg-card', '#1e293b');
      root.style.setProperty('--bg-card-hover', '#273549');
      root.style.setProperty('--bg-stat', '#1e293b');
      root.style.setProperty('--text-heading', lighten(cfg.primaryColor, 0.5));
      root.style.setProperty('--text-body', '#e2e8f0');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-color', `rgba(${pr}, ${pg}, ${pb}, 0.3)`);
      root.style.setProperty('--nav-accent-color', lighten(cfg.primaryColor, 0.5));
      this.doc.body.setAttribute('data-mood', 'dark');
    } else {
      root.style.setProperty('--bg-page', lighten(cfg.primaryColor, 0.92));
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-hover', lighten(cfg.primaryColor, 0.94));
      root.style.setProperty('--bg-stat', lighten(cfg.primaryColor, 0.88));
      root.style.setProperty('--text-heading', darken(cfg.primaryColor, 0.3));
      root.style.setProperty('--text-body', darken(cfg.primaryColor, 0.6));
      root.style.setProperty('--text-muted', darken(cfg.primaryColor, 0.15));
      root.style.setProperty('--border-color', `rgba(${pr}, ${pg}, ${pb}, 0.3)`);
      root.style.setProperty('--nav-accent-color', getContrastColor(cfg.primaryColor));
      this.doc.body.setAttribute('data-mood', 'light');
    }

    // Nav gradient
    const navDark = darken(cfg.primaryColor, 0.35);
    const navMid = darken(cfg.primaryColor, 0.1);
    const navLight = cfg.primaryColor;
    root.style.setProperty('--nav-bg', `linear-gradient(135deg, ${navDark} 0%, ${navMid} 50%, ${navLight} 100%)`);

    // D4: Depth — card surface and shadow
    this.applyDepth(root, cfg, pr, pg, pb, ar, ag, ab);

    // D5: Vibe — geometry and motion
    this.applyVibe(root, cfg);

    // Data attributes for CSS-only selectors
    root.setAttribute('data-mood', cfg.mood);
    root.setAttribute('data-depth', cfg.depth);
    root.setAttribute('data-vibe', cfg.vibe);
  }

  private applyDepth(
    root: HTMLElement,
    cfg: ThemeConfig,
    pr: number, pg: number, pb: number,
    ar: number, ag: number, ab: number
  ): void {
    const isDark = cfg.mood === 'dark';
    switch (cfg.depth) {
      case 'flat':
        root.style.setProperty('--card-bg', 'var(--bg-card)');
        root.style.setProperty('--card-border', '1px solid var(--border-color)');
        root.style.setProperty('--card-shadow', 'none');
        root.style.setProperty('--card-hover-shadow', `0 4px 16px rgba(${pr}, ${pg}, ${pb}, 0.15)`);
        root.style.setProperty('--card-backdrop', 'none');
        root.style.setProperty('--glow', 'none');
        root.style.setProperty('--table-header-bg', `var(--color-primary)`);
        root.style.setProperty('--nav-backdrop', 'none');
        root.style.setProperty('--nav-shadow', `0 2px 8px rgba(0,0,0,0.2)`);
        break;

      case 'glass':
        root.style.setProperty('--card-bg', isDark ? 'rgba(30,41,59,0.55)' : 'rgba(255,255,255,0.55)');
        root.style.setProperty('--card-border', `1px solid rgba(${pr}, ${pg}, ${pb}, 0.2)`);
        root.style.setProperty('--card-shadow', `0 8px 32px rgba(${pr}, ${pg}, ${pb}, 0.1), 0 2px 8px rgba(0,0,0,0.05)`);
        root.style.setProperty('--card-hover-shadow', `0 16px 48px rgba(${pr}, ${pg}, ${pb}, 0.2)`);
        root.style.setProperty('--card-backdrop', 'blur(16px) saturate(180%)');
        root.style.setProperty('--glow', 'none');
        root.style.setProperty('--table-header-bg', `rgba(${pr}, ${pg}, ${pb}, 0.75)`);
        root.style.setProperty('--nav-backdrop', 'blur(20px) saturate(200%)');
        root.style.setProperty('--nav-shadow', `0 4px 24px rgba(${pr}, ${pg}, ${pb}, 0.3)`);
        break;

      case 'elevated':
        root.style.setProperty('--card-bg', 'var(--bg-card)');
        root.style.setProperty('--card-border', `1px solid rgba(${pr}, ${pg}, ${pb}, 0.18)`);
        root.style.setProperty('--card-shadow', `0 4px 16px rgba(${pr}, ${pg}, ${pb}, 0.1), 0 1px 4px rgba(0,0,0,0.06)`);
        root.style.setProperty('--card-hover-shadow', `0 12px 40px rgba(${pr}, ${pg}, ${pb}, 0.2), 0 4px 12px rgba(0,0,0,0.1)`);
        root.style.setProperty('--card-backdrop', 'none');
        root.style.setProperty('--glow', 'none');
        root.style.setProperty('--table-header-bg', `var(--color-primary)`);
        root.style.setProperty('--nav-backdrop', 'none');
        root.style.setProperty('--nav-shadow', `0 2px 16px rgba(${pr}, ${pg}, ${pb}, 0.35)`);
        break;

      case 'neon':
        root.style.setProperty('--card-bg', isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.97)');
        root.style.setProperty('--card-border', `1px solid rgba(${pr}, ${pg}, ${pb}, 0.5)`);
        root.style.setProperty('--card-shadow', `0 0 0 1px rgba(${pr}, ${pg}, ${pb}, 0.25), 0 4px 20px rgba(${pr}, ${pg}, ${pb}, 0.25)`);
        root.style.setProperty('--card-hover-shadow', `0 0 0 1px rgba(${ar}, ${ag}, ${ab}, 0.5), 0 8px 32px rgba(${ar}, ${ag}, ${ab}, 0.35), 0 0 60px rgba(${ar}, ${ag}, ${ab}, 0.15)`);
        root.style.setProperty('--card-backdrop', 'none');
        root.style.setProperty('--glow', `0 0 20px rgba(${pr}, ${pg}, ${pb}, 0.5), 0 0 40px rgba(${pr}, ${pg}, ${pb}, 0.2)`);
        root.style.setProperty('--table-header-bg', `var(--color-primary)`);
        root.style.setProperty('--nav-backdrop', 'none');
        root.style.setProperty('--nav-shadow', `0 0 0 1px rgba(${pr}, ${pg}, ${pb}, 0.4), 0 4px 24px rgba(${pr}, ${pg}, ${pb}, 0.4)`);
        break;

      case 'liquid-glass':
        root.style.setProperty('--card-bg', isDark ? 'rgba(15,23,42,0.48)' : 'rgba(255,255,255,0.62)');
        root.style.setProperty('--card-border', `1px solid rgba(255,255,255,${isDark ? '0.16' : '0.72'})`);
        root.style.setProperty('--card-shadow',
          `0 8px 40px rgba(${pr},${pg},${pb},0.18), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.85)`
        );
        root.style.setProperty('--card-hover-shadow',
          `0 24px 64px rgba(${pr},${pg},${pb},0.28), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.92)`
        );
        root.style.setProperty('--card-backdrop', `blur(48px) saturate(200%) brightness(${isDark ? '1.06' : '1.1'})`);
        root.style.setProperty('--glow', `0 0 32px rgba(${pr},${pg},${pb},0.3), 0 0 64px rgba(${ar},${ag},${ab},0.15)`);
        root.style.setProperty('--table-header-bg', `rgba(${pr},${pg},${pb},0.55)`);
        root.style.setProperty('--nav-backdrop', `blur(60px) saturate(220%) brightness(${isDark ? '1.06' : '1.12'})`);
        root.style.setProperty('--nav-shadow', `0 4px 32px rgba(${pr},${pg},${pb},0.22), inset 0 -1px 0 rgba(255,255,255,0.15)`);
        root.style.setProperty('--bg-card', isDark ? 'rgba(15,23,42,0.48)' : 'rgba(255,255,255,0.62)');
        root.style.setProperty('--bg-card-hover', isDark ? 'rgba(30,41,59,0.58)' : 'rgba(255,255,255,0.82)');
        root.style.setProperty('--bg-stat', isDark ? 'rgba(30,41,59,0.42)' : `rgba(${pr},${pg},${pb},0.05)`);
        root.style.setProperty('--border-color', `rgba(${pr},${pg},${pb},0.15)`);
        break;
    }
  }

  private applyVibe(root: HTMLElement, cfg: ThemeConfig): void {
    switch (cfg.vibe) {
      case 'classic':
        root.style.setProperty('--radius-sm', '4px');
        root.style.setProperty('--radius-md', '8px');
        root.style.setProperty('--radius-lg', '12px');
        root.style.setProperty('--radius-xl', '16px');
        root.style.setProperty('--font-heading', "'Times New Roman', serif");
        root.style.setProperty('--card-transition', '0.15s ease');
        break;
      case 'festive':
        root.style.setProperty('--radius-sm', '10px');
        root.style.setProperty('--radius-md', '16px');
        root.style.setProperty('--radius-lg', '22px');
        root.style.setProperty('--radius-xl', '30px');
        root.style.setProperty('--font-heading', "'Playfair Display', serif");
        root.style.setProperty('--card-transition', '0.3s cubic-bezier(0.34, 1.56, 0.64, 1)');
        break;
      case 'royal':
        root.style.setProperty('--radius-sm', '2px');
        root.style.setProperty('--radius-md', '4px');
        root.style.setProperty('--radius-lg', '6px');
        root.style.setProperty('--radius-xl', '8px');
        root.style.setProperty('--font-heading', "'Playfair Display', serif");
        root.style.setProperty('--card-transition', '0.2s ease');
        break;
      case 'modern':
        root.style.setProperty('--radius-sm', '12px');
        root.style.setProperty('--radius-md', '18px');
        root.style.setProperty('--radius-lg', '24px');
        root.style.setProperty('--radius-xl', '32px');
        root.style.setProperty('--font-heading', "'Inter', sans-serif");
        root.style.setProperty('--card-transition', '0.22s cubic-bezier(0.4, 0, 0.2, 1)');
        break;
    }
  }

  private loadFromStorage(): ThemeConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULT_THEME };
  }

  private saveToStorage(cfg: ThemeConfig): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }
}

// ── Color utilities ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const n = (x: number) => Math.min(255, Math.round(x + (255 - x) * amount));
  return toHex(n(r), n(g), n(b));
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const n = (x: number) => Math.max(0, Math.round(x * (1 - amount)));
  return toHex(n(r), n(g), n(b));
}

function toHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getContrastColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? darken(hex, 0.6) : '#FFD700';
}
