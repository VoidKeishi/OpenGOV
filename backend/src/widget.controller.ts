import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppConfigService } from './config/config.module';

/** Minimal response surface we need (avoids an @types/express dependency). */
interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

/**
 * R3 (WIDGET.md §10): one deploy serves both the API and the embed bundle —
 * the portal's script tag needs a single host. The bundle is a build artifact
 * (widget/dist, built in the Docker image); missing → 404, never a crash.
 */
@Controller()
export class WidgetController {
  constructor(private readonly cfg: AppConfigService) {}

  @Get('widget/opengov.js')
  bundle(@Res({ passthrough: true }) res: HeaderResponse): string {
    const path = join(this.cfg.config.widgetDistDir, 'opengov.js');
    if (!existsSync(path)) {
      throw new NotFoundException('widget bundle not built');
    }
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    // Short TTL + `?v=` cache-busting on the embed side (WIDGET.md §1).
    res.setHeader('Cache-Control', 'public, max-age=300');
    return readFileSync(path, 'utf8');
  }
}
