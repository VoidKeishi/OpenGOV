import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  create() {
    const s = this.sessions.create();
    return { session_id: s.id };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const s = this.sessions.get(id);
    if (!s) throw new NotFoundException(`session ${id} not found`);
    return { messages: s.messages, case_facts: s.case_facts };
  }
}
