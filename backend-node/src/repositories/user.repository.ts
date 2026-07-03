import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresDataSource} from '../datasources';
import {User, UserRelations} from '../models';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
  ) {
    super(User, dataSource);
  }

  async query(sql: string, params: unknown[]): Promise<Record<string, unknown>[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.dataSource as any).execute(sql, params);
  }
}
