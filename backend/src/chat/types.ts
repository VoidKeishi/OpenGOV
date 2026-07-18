import type { Card } from './cards';

export type ChatEvent =
  | { type: 'session'; session_id: string }
  | { type: 'token'; text: string }
  | { type: 'card'; payload: Card }
  | { type: 'tool'; name: string; args: any }
  | { type: 'warning'; message: string }
  | { type: 'done'; cards_count: number }
  | { type: 'error'; message: string };

export type Emit = (event: ChatEvent) => void;
