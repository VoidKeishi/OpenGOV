import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ValidateRequest, ValidationService } from './validation.service';

@Controller()
export class ValidationController {
  constructor(private readonly svc: ValidationService) {}

  @Post('validate')
  async validate(@Body() body: Partial<ValidateRequest>) {
    if (!body || typeof body.procedure_code !== 'string' || !body.procedure_code) {
      throw new BadRequestException('procedure_code is required');
    }
    return this.svc.validate({
      procedure_code: body.procedure_code,
      fields: body.fields ?? {},
      case_facts: body.case_facts ?? {},
    });
  }
}
