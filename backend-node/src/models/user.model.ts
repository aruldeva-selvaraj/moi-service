import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: false, postgresql: {table: 'users', schema: 'public'}}})
export class User extends Entity {
  @property({type: 'number', id: true, generated: true})
  id?: number;

  @property({type: 'string', required: true})
  username: string;

  @property({type: 'string', required: true, jsonSchema: {writeOnly: true}})
  password_hash: string;

  @property({type: 'string', required: true, default: 'admin'})
  role: string;

  @property({type: 'string'})
  full_name?: string;

  @property({type: 'boolean', default: true})
  is_active: boolean;

  @property({type: 'date', defaultFn: 'now'})
  created_at?: Date;

  @property({type: 'date', defaultFn: 'now'})
  updated_at?: Date;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {}
export type UserWithRelations = User & UserRelations;
