import { Module } from '@nestjs/common';
import { ProceduresService } from './procedures.service';

@Module({
  providers: [ProceduresService],
  exports: [ProceduresService],
})
export class ProceduresModule {}
