import { Module } from '@nestjs/common';
import { ProceduresModule } from '../procedures/procedures.module';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';

@Module({
  imports: [ProceduresModule],
  controllers: [ValidationController],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
