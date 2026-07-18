import { Global, Module } from '@nestjs/common';
import { databaseProvider } from './database.provider';
import { Dao } from './dao';

@Global()
@Module({
  providers: [databaseProvider, Dao],
  exports: [databaseProvider, Dao],
})
export class DbModule {}
