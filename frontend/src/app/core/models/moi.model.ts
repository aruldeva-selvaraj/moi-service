export type Side = 'groom' | 'bride' | 'both';
export type PaymentMode = 'cash' | 'cheque' | 'online' | 'dd';

export interface MoiEntry {
  id: number;
  event_id: number;
  guest_name: string;
  relationship?: string;
  side: Side;
  amount: number;
  payment_mode: PaymentMode;
  cheque_number?: string;
  transaction_ref?: string;
  city?: string;
  district?: string;
  phone?: string;
  notes?: string;
  received_by?: string;
  created_at: string;
  updated_at: string;
  created_by_username?: string;
}

export interface MoiEntryCreate {
  event_id: number;
  guest_name: string;
  relationship?: string;
  side: Side;
  amount: number;
  payment_mode: PaymentMode;
  cheque_number?: string;
  transaction_ref?: string;
  city?: string;
  district?: string;
  phone?: string;
  notes?: string;
  received_by?: string;
}

export interface PaginatedMoiResponse {
  items: MoiEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SummaryStats {
  total_events: number;
  total_moi_entries: number;
  total_amount: number;
  avg_amount: number;
}

export interface RelationshipReport {
  relationship: string;
  count: number;
  total_amount: number;
  avg_amount: number;
}

export interface GeoBreakdownItem {
  city?: string;
  district?: string;
  count: number;
  total_amount: number;
}

export interface MoiFilter {
  search?: string;
  side?: 'groom' | 'bride' | 'both';
  payment_mode?: string;
  event_id?: number;
  page: number;
  page_size: number;
  city?: string;
  district?: string;
  date_from?: string;
  date_to?: string;
  sort_field?: string;
  sort_dir?: 'asc' | 'desc';
  amount_min?: number | null;
  amount_max?: number | null;
  relationship?: string;
  received_by?: string;
}
