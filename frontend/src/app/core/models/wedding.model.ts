export interface Wedding {
  id: number;
  groom_name: string;
  bride_name: string;
  family_name?: string;
  wedding_date: string;
  venue?: string;
  city?: string;
  notes?: string;
  total_moi: number;
  moi_count: number;
  created_at: string;
  updated_at: string;
}

export interface WeddingCreate {
  groom_name: string;
  bride_name: string;
  family_name?: string;
  wedding_date: string;
  venue?: string;
  city?: string;
  notes?: string;
}

export interface WeddingReport {
  wedding_id: number;
  groom_name: string;
  bride_name: string;
  wedding_date: string;
  total_amount: number;
  moi_count: number;
  bride_side_amount: number;
  groom_side_amount: number;
  cash_amount: number;
  cheque_amount: number;
  online_amount: number;
}
