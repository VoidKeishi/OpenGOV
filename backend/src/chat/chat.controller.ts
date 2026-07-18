import { Body, Controller, Post, Res } from '@nestjs/common';
import { ChatService } from './chat.service';
import type { ChatEvent } from './types';

/** Minimal server-response surface we need for SSE (avoids an @types/express dependency). */
interface SseResponse {
  setHeader(name: string, value: string): void;
  write(chunk: string): void;
  end(): void;
  flushHeaders?(): void;
}

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('chat')
  async chat_(@Body() body: { session_id?: string; message?: string }, @Res() res: SseResponse) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const emit = (event: ChatEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    try {
      await this.chat.handleChat(body?.session_id, body?.message ?? '', emit);
    } catch {
      emit({ type: 'error', message: 'internal_error' });
    }
    res.write('event: end\ndata: {}\n\n');
    res.end();
  }
}
