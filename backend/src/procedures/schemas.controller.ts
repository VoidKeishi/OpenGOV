import { Controller, Get } from '@nestjs/common';
import { ProceduresService } from './procedures.service';

/** R1 (WIDGET.md §10): schema index for the widget's DOM-match detection. */
@Controller()
export class SchemasController {
  constructor(private readonly procedures: ProceduresService) {}

  @Get('schemas')
  schemas() {
    return this.procedures.listSchemaIndex();
  }
}
