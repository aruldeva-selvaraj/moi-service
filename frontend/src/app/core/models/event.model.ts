export type EventType = 'wedding' | 'birthday' | 'baby_shower' | 'engagement' | 'anniversary' | 'other';

export interface EventTypeConfig {
  label: string;
  emoji: string;
  primaryLabel: string;
  secondaryLabel: string;
  sideALabel: string;
  sideBLabel: string;
  sideAEmoji: string;
  sideBEmoji: string;
  dateLabel: string;
  showSecondary: boolean;
}

export const EVENT_TYPE_CONFIGS: Record<EventType, EventTypeConfig> = {
  wedding: {
    label: 'Wedding',
    emoji: '💒',
    primaryLabel: "Groom's Name",
    secondaryLabel: "Bride's Name",
    sideALabel: "Groom's Side",
    sideBLabel: "Bride's Side",
    sideAEmoji: '🤵',
    sideBEmoji: '👰',
    dateLabel: 'Wedding Date',
    showSecondary: true,
  },
  birthday: {
    label: 'Birthday',
    emoji: '🎂',
    primaryLabel: "Person's Name",
    secondaryLabel: "Co-Host Name",
    sideALabel: 'Friends',
    sideBLabel: 'Family',
    sideAEmoji: '👥',
    sideBEmoji: '👨‍👩‍👧',
    dateLabel: 'Birthday Date',
    showSecondary: false,
  },
  baby_shower: {
    label: 'Baby Shower',
    emoji: '👶',
    primaryLabel: "Mother's Name",
    secondaryLabel: "Father's Name",
    sideALabel: "Mom's Side",
    sideBLabel: "Dad's Side",
    sideAEmoji: '👩',
    sideBEmoji: '👨',
    dateLabel: 'Event Date',
    showSecondary: true,
  },
  engagement: {
    label: 'Engagement',
    emoji: '💍',
    primaryLabel: "Partner A Name",
    secondaryLabel: "Partner B Name",
    sideALabel: "Partner A Side",
    sideBLabel: "Partner B Side",
    sideAEmoji: '💍',
    sideBEmoji: '💍',
    dateLabel: 'Engagement Date',
    showSecondary: true,
  },
  anniversary: {
    label: 'Anniversary',
    emoji: '💑',
    primaryLabel: "Husband's Name",
    secondaryLabel: "Wife's Name",
    sideALabel: "Husband's Side",
    sideBLabel: "Wife's Side",
    sideAEmoji: '👨',
    sideBEmoji: '👩',
    dateLabel: 'Anniversary Date',
    showSecondary: true,
  },
  other: {
    label: 'Other Event',
    emoji: '🎉',
    primaryLabel: 'Host Name',
    secondaryLabel: "Co-Host Name",
    sideALabel: 'Side A',
    sideBLabel: 'Side B',
    sideAEmoji: '👤',
    sideBEmoji: '👤',
    dateLabel: 'Event Date',
    showSecondary: false,
  },
};

export function getEventConfig(type: EventType | string): EventTypeConfig {
  return EVENT_TYPE_CONFIGS[type as EventType] ?? EVENT_TYPE_CONFIGS['other'];
}

export function getEventTitle(event: { primary_name: string; secondary_name?: string; event_type: EventType | string }): string {
  const cfg = getEventConfig(event.event_type);
  if (event.secondary_name && cfg.showSecondary) {
    return `${event.primary_name} ♡ ${event.secondary_name}`;
  }
  return event.primary_name;
}

export function getEventTypeLabel(type: EventType | string): string {
  return (EVENT_TYPE_CONFIGS[type as EventType] ?? EVENT_TYPE_CONFIGS['other']).label;
}

export interface Event {
  id: number;
  event_type: EventType;
  primary_name: string;
  secondary_name?: string;
  family_name?: string;
  event_date: string;
  venue?: string;
  city?: string;
  notes?: string;
  total_moi: number;
  moi_count: number;
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  event_type: EventType;
  primary_name: string;
  secondary_name?: string;
  family_name?: string;
  event_date: string;
  venue?: string;
  city?: string;
  notes?: string;
}

export interface EventReport {
  event_id: number;
  event_type: EventType;
  primary_name: string;
  secondary_name?: string;
  event_date: string;
  total_amount: number;
  moi_count: number;
  groom_count: number;
  bride_count: number;
  groom_amount: number;
  bride_amount: number;
  cash_amount: number;
  cheque_amount: number;
  online_amount: number;
}
