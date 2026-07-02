import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {PostgresDataSource} from '../datasources';
import {MoiEntry, MoiEntryRelations} from '../models';

export class MoiEntryRepository extends DefaultCrudRepository<
  MoiEntry,
  typeof MoiEntry.prototype.id,
  MoiEntryRelations
> {
  constructor(
    @inject('datasources.postgres') dataSource: PostgresDataSource,
  ) {
    super(MoiEntry, dataSource);
  }

  async execute(
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.dataSource as any).execute(sql, params);
  }
}
