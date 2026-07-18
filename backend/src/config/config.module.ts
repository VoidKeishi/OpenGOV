import { Global, Injectable, Module } from '@nestjs/common';
import { AppConfig, loadConfig } from './config';

/** Holds the resolved AppConfig; inject by type anywhere. */
@Injectable()
export class AppConfigService {
  readonly config: AppConfig;
  constructor() {
    this.config = loadConfig();
  }
}

@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
