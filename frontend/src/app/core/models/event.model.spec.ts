import { describe, it, expect } from 'vitest';
import {
  EVENT_TYPE_CONFIGS,
  getEventConfig,
  getEventTitle,
  getEventTypeLabel,
} from './event.model';

describe('EVENT_TYPE_CONFIGS', () => {
  it('has all six event types', () => {
    const keys = Object.keys(EVENT_TYPE_CONFIGS);
    expect(keys).toEqual(
      expect.arrayContaining(['wedding', 'birthday', 'baby_shower', 'engagement', 'anniversary', 'other'])
    );
    expect(keys.length).toBe(6);
  });

  it('wedding config has correct labels', () => {
    const cfg = EVENT_TYPE_CONFIGS['wedding'];
    expect(cfg.label).toBe('Wedding');
    expect(cfg.emoji).toBe('💒');
    expect(cfg.sideALabel).toBe("Groom's Side");
    expect(cfg.sideBLabel).toBe("Bride's Side");
    expect(cfg.showSecondary).toBe(true);
  });

  it('birthday config shows no secondary', () => {
    expect(EVENT_TYPE_CONFIGS['birthday'].showSecondary).toBe(false);
  });

  it('other config shows no secondary', () => {
    expect(EVENT_TYPE_CONFIGS['other'].showSecondary).toBe(false);
  });

  it('engagement config has showSecondary true', () => {
    expect(EVENT_TYPE_CONFIGS['engagement'].showSecondary).toBe(true);
  });

  it('anniversary config has correct labels', () => {
    const cfg = EVENT_TYPE_CONFIGS['anniversary'];
    expect(cfg.sideALabel).toBe("Husband's Side");
    expect(cfg.sideBLabel).toBe("Wife's Side");
  });

  it('baby_shower config has correct labels', () => {
    const cfg = EVENT_TYPE_CONFIGS['baby_shower'];
    expect(cfg.sideALabel).toBe("Mom's Side");
    expect(cfg.sideBLabel).toBe("Dad's Side");
    expect(cfg.showSecondary).toBe(true);
  });
});

describe('getEventConfig', () => {
  it('returns correct config for known type', () => {
    const cfg = getEventConfig('wedding');
    expect(cfg.label).toBe('Wedding');
  });

  it('returns "other" config for unknown type', () => {
    const cfg = getEventConfig('unknown_type');
    expect(cfg.label).toBe('Other Event');
  });

  it('returns birthday config', () => {
    expect(getEventConfig('birthday').emoji).toBe('🎂');
  });

  it('returns baby_shower config', () => {
    expect(getEventConfig('baby_shower').emoji).toBe('👶');
  });

  it('returns engagement config', () => {
    expect(getEventConfig('engagement').emoji).toBe('💍');
  });

  it('returns anniversary config', () => {
    expect(getEventConfig('anniversary').emoji).toBe('💑');
  });

  it('returns other config', () => {
    expect(getEventConfig('other').emoji).toBe('🎉');
  });

  it('returns other config when type is empty string', () => {
    const cfg = getEventConfig('');
    expect(cfg.label).toBe('Other Event');
  });
});

describe('getEventTitle', () => {
  it('returns "primary ♡ secondary" when showSecondary is true and secondary_name provided', () => {
    const event = { primary_name: 'Ram', secondary_name: 'Priya', event_type: 'wedding' as const };
    expect(getEventTitle(event)).toBe('Ram ♡ Priya');
  });

  it('returns only primary_name when secondary_name is absent', () => {
    const event = { primary_name: 'Arjun', event_type: 'wedding' as const };
    expect(getEventTitle(event)).toBe('Arjun');
  });

  it('returns only primary_name when showSecondary is false even if secondary_name provided', () => {
    const event = { primary_name: 'Karthik', secondary_name: 'Deepa', event_type: 'birthday' as const };
    expect(getEventTitle(event)).toBe('Karthik');
  });

  it('returns primary_name for other event type', () => {
    const event = { primary_name: 'Family Fest', event_type: 'other' as const };
    expect(getEventTitle(event)).toBe('Family Fest');
  });

  it('uses other config for unknown event_type', () => {
    const event = { primary_name: 'My Event', secondary_name: 'Co', event_type: 'custom' };
    // other.showSecondary = false → just primary
    expect(getEventTitle(event)).toBe('My Event');
  });

  it('returns "primary ♡ secondary" for engagement', () => {
    const event = { primary_name: 'A', secondary_name: 'B', event_type: 'engagement' as const };
    expect(getEventTitle(event)).toBe('A ♡ B');
  });
});

describe('getEventTypeLabel', () => {
  it('returns label for wedding', () => {
    expect(getEventTypeLabel('wedding')).toBe('Wedding');
  });

  it('returns label for birthday', () => {
    expect(getEventTypeLabel('birthday')).toBe('Birthday');
  });

  it('returns label for baby_shower', () => {
    expect(getEventTypeLabel('baby_shower')).toBe('Baby Shower');
  });

  it('returns label for engagement', () => {
    expect(getEventTypeLabel('engagement')).toBe('Engagement');
  });

  it('returns label for anniversary', () => {
    expect(getEventTypeLabel('anniversary')).toBe('Anniversary');
  });

  it('returns label for other', () => {
    expect(getEventTypeLabel('other')).toBe('Other Event');
  });

  it('returns "Other Event" label for unknown type', () => {
    expect(getEventTypeLabel('random')).toBe('Other Event');
  });
});
