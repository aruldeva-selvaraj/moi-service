import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {schema: 'public', table: 'moi_entries'},
    strict: false,
  },
})
export class MoiEntry extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    postgresql: {columnName: 'id', dataType: 'integer'},
  })
  id?: number;

  @property({
    type: 'number',
    required: true,
    postgresql: {columnName: 'event_id', dataType: 'integer'},
  })
  event_id: number;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'guest_name'},
  })
  guest_name: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'relationship'},
  })
  relationship?: string;

  @property({
    type: 'string',
    default: 'groom',
    postgresql: {columnName: 'side'},
  })
  side: string;

  @property({
    type: 'number',
    required: true,
    postgresql: {columnName: 'amount', dataType: 'numeric'},
  })
  amount: number;

  @property({
    type: 'string',
    default: 'cash',
    postgresql: {columnName: 'payment_mode'},
  })
  payment_mode: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'cheque_number'},
  })
  cheque_number?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'transaction_ref'},
  })
  transaction_ref?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'city'},
  })
  city?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'phone'},
  })
  phone?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'notes'},
  })
  notes?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'received_by'},
  })
  received_by?: string;

  @property({
    type: 'date',
    postgresql: {columnName: 'created_at'},
  })
  created_at?: Date;

  @property({
    type: 'date',
    postgresql: {columnName: 'updated_at'},
  })
  updated_at?: Date;

  constructor(data?: Partial<MoiEntry>) {
    super(data);
  }
}

export interface MoiEntryRelations {}
export type MoiEntryWithRelations = MoiEntry & MoiEntryRelations;
