import { Telegraf, Context } from 'telegraf';

export class App {
  start(): Promise<void>;
  stop(): Promise<void>;
  private setupMiddleware(): void;
}

export const app: App;
export const bot: Telegraf<Context>;
