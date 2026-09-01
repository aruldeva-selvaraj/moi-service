import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService, PRESET_THEMES, DEFAULT_THEME } from './theme.service';

// Suppress localStorage errors from jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    localStorageMock.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('initialises config signal with default theme when no storage', () => {
    const cfg = service.config();
    expect(cfg.mood).toBe('light');
    expect(cfg.depth).toBe('elevated');
    expect(cfg.vibe).toBe('festive');
    expect(cfg.primaryColor).toBe('#8B4513');
  });

  it('isPickerOpen starts as false', () => {
    expect(service.isPickerOpen()).toBe(false);
  });

  it('togglePicker flips isPickerOpen', () => {
    service.togglePicker();
    expect(service.isPickerOpen()).toBe(true);
    service.togglePicker();
    expect(service.isPickerOpen()).toBe(false);
  });

  it('closePicker sets isPickerOpen to false', () => {
    service.togglePicker();
    service.closePicker();
    expect(service.isPickerOpen()).toBe(false);
  });

  it('applyPreset updates the config', () => {
    const preset = PRESET_THEMES.find(p => p.name === 'Royal Purple')!;
    service.applyPreset(preset);
    expect(service.config().mood).toBe('dark');
    expect(service.config().primaryColor).toBe('#6B21A8');
  });

  it('updateColor changes primaryColor', () => {
    service.updateColor('primaryColor', '#ff0000');
    expect(service.config().primaryColor).toBe('#ff0000');
  });

  it('updateColor changes accentColor', () => {
    service.updateColor('accentColor', '#00ff00');
    expect(service.config().accentColor).toBe('#00ff00');
  });

  it('updateMood changes mood to dark', () => {
    service.updateMood('dark');
    expect(service.config().mood).toBe('dark');
  });

  it('updateMood changes mood to light', () => {
    service.updateMood('dark');
    service.updateMood('light');
    expect(service.config().mood).toBe('light');
  });

  it('updateDepth changes depth', () => {
    service.updateDepth('glass');
    expect(service.config().depth).toBe('glass');
  });

  it('updateDepth changes to flat', () => {
    service.updateDepth('flat');
    expect(service.config().depth).toBe('flat');
  });

  it('updateDepth changes to neon', () => {
    service.updateDepth('neon');
    expect(service.config().depth).toBe('neon');
  });

  it('updateDepth changes to liquid-glass', () => {
    service.updateDepth('liquid-glass');
    expect(service.config().depth).toBe('liquid-glass');
  });

  it('updateVibe changes vibe', () => {
    service.updateVibe('modern');
    expect(service.config().vibe).toBe('modern');
  });

  it('updateVibe changes to classic', () => {
    service.updateVibe('classic');
    expect(service.config().vibe).toBe('classic');
  });

  it('updateVibe changes to royal', () => {
    service.updateVibe('royal');
    expect(service.config().vibe).toBe('royal');
  });

  it('reset restores the default theme', () => {
    service.updateColor('primaryColor', '#ff0000');
    service.updateMood('dark');
    service.reset();
    expect(service.config().primaryColor).toBe('#8B4513');
    expect(service.config().mood).toBe('light');
  });

  it('applies dark mood CSS vars to document', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateMood('dark');
    const bgPage = doc.documentElement.style.getPropertyValue('--bg-page');
    expect(bgPage).toBe('#0f172a');
  });

  it('applies light mood CSS vars to document', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateMood('dark');
    service.updateMood('light');
    const bgCard = doc.documentElement.style.getPropertyValue('--bg-card');
    expect(bgCard).toBe('#ffffff');
  });

  it('applies flat depth CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateDepth('flat');
    expect(doc.documentElement.style.getPropertyValue('--card-shadow')).toBe('none');
  });

  it('applies glass depth CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateDepth('glass');
    const backdrop = doc.documentElement.style.getPropertyValue('--card-backdrop');
    expect(backdrop).toContain('blur');
  });

  it('applies neon depth CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateDepth('neon');
    const glow = doc.documentElement.style.getPropertyValue('--glow');
    expect(glow).toContain('rgba');
  });

  it('applies liquid-glass depth CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateDepth('liquid-glass');
    const backdrop = doc.documentElement.style.getPropertyValue('--card-backdrop');
    expect(backdrop).toContain('blur');
  });

  it('applies classic vibe CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateVibe('classic');
    expect(doc.documentElement.style.getPropertyValue('--radius-sm')).toBe('4px');
  });

  it('applies festive vibe CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateVibe('festive');
    expect(doc.documentElement.style.getPropertyValue('--radius-sm')).toBe('10px');
  });

  it('applies royal vibe CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateVibe('royal');
    expect(doc.documentElement.style.getPropertyValue('--radius-sm')).toBe('2px');
  });

  it('applies modern vibe CSS vars', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateVibe('modern');
    expect(doc.documentElement.style.getPropertyValue('--radius-sm')).toBe('12px');
  });

  it('sets data-mood attribute on documentElement', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateMood('dark');
    expect(doc.documentElement.getAttribute('data-mood')).toBe('dark');
  });

  it('sets data-depth attribute on documentElement', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateDepth('flat');
    expect(doc.documentElement.getAttribute('data-depth')).toBe('flat');
  });

  it('sets data-vibe attribute on documentElement', () => {
    const doc = TestBed.inject(DOCUMENT);
    service.updateVibe('royal');
    expect(doc.documentElement.getAttribute('data-vibe')).toBe('royal');
  });

  it('PRESET_THEMES has 7 presets', () => {
    expect(PRESET_THEMES.length).toBe(7);
  });

  it('all presets have required fields', () => {
    for (const p of PRESET_THEMES) {
      expect(p.name).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.config.primaryColor).toBeTruthy();
      expect(p.config.mood).toMatch(/^(light|dark)$/);
    }
  });

  it('loads theme from localStorage on init', () => {
    localStorageMock.setItem('moi-theme-config', JSON.stringify({ mood: 'dark', primaryColor: '#111111' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.config().mood).toBe('dark');
    expect(fresh.config().primaryColor).toBe('#111111');
    // Defaults fill in missing keys
    expect(fresh.config().vibe).toBe('festive');
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorageMock.setItem('moi-theme-config', '{invalid-json}');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.config().mood).toBe('light');
  });
});
