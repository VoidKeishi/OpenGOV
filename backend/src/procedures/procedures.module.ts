import { Module } from '@nestjs/common';
import { ProceduresService } from './procedures.service';
import { SchemasController } from './schemas.controller';

@Module({
  controllers: [SchemasController],
  providers: [ProceduresService],
  exports: [ProceduresService],
})
export class ProceduresModule {}
