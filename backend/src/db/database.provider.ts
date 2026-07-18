import { Provider } from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { AppConfigService } from '../config/config.module';

/** Injection token for the shared better-sqlite3 connection. */
export const DB = Symbol('DB');
export type DBType = Database.Database;

export const databaseProvider: Provider = {
  provide: DB,
  useFactory: (cfg: AppConfigService): DBType => {
    const path = cfg.config.dbPath;
    if (!existsSync(path)) {
      throw new Error(
        `SQLite DB not found at ${path}. Run \`pnpm -C backend seed\` first (DATA.md §6).`,
      );
    }
    const db = new Database(path);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return db;
  },
  inject: [AppConfigService],
};
