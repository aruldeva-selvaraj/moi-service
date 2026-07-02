import {Entity, model, property} from '@loopback/repository';

@model({
  settings: {
    postgresql: {schema: 'public', table: 'events'},
    strict: false,
  },
})
export class Event extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
    postgresql: {columnName: 'id', dataType: 'integer'},
  })
  id?: number;

  @property({
    type: 'string',
    default: 'wedding',
    postgresql: {columnName: 'event_type'},
  })
  event_type: string;

  @property({
    type: 'string',
    required: true,
    postgresql: {columnName: 'primary_name'},
  })
  primary_name: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'secondary_name'},
  })
  secondary_name?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'family_name'},
  })
  family_name?: string;

  @property({
    type: 'date',
    required: true,
    postgresql: {columnName: 'event_date', dataType: 'date'},
  })
  event_date: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'venue'},
  })
  venue?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'city'},
  })
  city?: string;

  @property({
    type: 'string',
    postgresql: {columnName: 'notes'},
  })
  notes?: string;

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

  constructor(data?: Partial<Event>) {
    super(data);
  }
}

export interface EventRelations {}
export type EventWithRelations = Event & EventRelations;
