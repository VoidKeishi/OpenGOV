import { Module } from '@nestjs/common';
import { ProceduresModule } from '../procedures/procedures.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [ProceduresModule, SessionsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
