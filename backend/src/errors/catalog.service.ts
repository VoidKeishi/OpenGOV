import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.module';
import { Catalog, loadCatalog, resolveError, ResolvedError } from './catalog';

/** Loads the error catalog once at startup and resolves codes for the validation pipeline. */
@Injectable()
export class CatalogService {
  private readonly catalog: Catalog;

  constructor(cfg: AppConfigService) {
    this.catalog = loadCatalog(cfg.config.errorsCatalogPath);
  }

  has(code: string): boolean {
    return code in this.catalog;
  }

  get raw(): Catalog {
    return this.catalog;
  }

  resolve(code: string, params: Record<string, string>, field?: string): ResolvedError | null {
    return resolveError(this.catalog, code, params, field);
  }
}
