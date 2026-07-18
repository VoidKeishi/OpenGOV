import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from './config/config.module';
import { DbModule } from './db/db.module';
import { ErrorsModule } from './errors/errors.module';
import { OpenRouterModule } from './openrouter/openrouter.module';
import { ProceduresModule } from './procedures/procedures.module';
import { SessionsModule } from './sessions/sessions.module';
import { ValidationModule } from './validation/validation.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule,
    DbModule,
    ErrorsModule,
    OpenRouterModule,
    ProceduresModule,
    SessionsModule,
    ValidationModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
