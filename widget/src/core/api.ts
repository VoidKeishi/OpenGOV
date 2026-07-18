// Thin wrappers over the backend HTTP surface (WIDGET.md §3). Failures resolve
// to harmless fallbacks wherever the spec says to degrade instead of erroring.
import type {
  Health,
  SchemaIndexEntry,
  SessionState,
  ValidationError,
} from '../types';

/** null = backend unreachable → OFFLINE state (§7). */
export async function fetchHealth(backend: string): Promise<Health | null> {
  try {
    const res = await fetch(`${backend}/health`);
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

/** null = R1 endpoint missing/erroring → check feature silently disables (§6.1). */
export async function fetchSchemas(backend: string): Promise<SchemaIndexEntry[] | null> {
  try {
    const res = await fetch(`${backend}/schemas`);
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return Array.isArray(json) ? (json as SchemaIndexEntry[]) : null;
  } catch {
    return null;
  }
}

/** null = failed → let /chat mint the id via its `session` event (§8). */
export async function createSession(backend: string): Promise<string | null> {
  try {
    const res = await fetch(`${backend}/sessions`, { method: 'POST' });
    if (!res.ok) return null;
    const json = (await res.json()) as { session_id?: string };
    return json?.session_id ?? null;
  } catch {
    return null;
  }
}

/** null covers 404 (stale id — caller drops it silently) and network errors. */
export async function fetchSession(backend: string, sid: string): Promise<SessionState | null> {
  try {
    const res = await fetch(`${backend}/sessions/${encodeURIComponent(sid)}`);
    if (!res.ok) return null;
    return (await res.json()) as SessionState;
  } catch {
    return null;
  }
}

export type ValidateResult =
  | { kind: 'ok'; errors: ValidationError[] }
  | { kind: 'schema_error'; message: string } // 422 — show verbatim, never retry (§3.5)
  | { kind: 'network' }; // network/5xx — offer [Thử lại]

export async function postValidate(
  backend: string,
  body: {
    procedure_code: string;
    fields: Record<string, string>;
    case_facts: Record<string, unknown>;
  },
): Promise<ValidateResult> {
  try {
    const res = await fetch(`${backend}/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 422) {
      // As-built 422 body is exactly { message } — show it verbatim.
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      return { kind: 'schema_error', message: json?.message ?? 'Không thể kiểm tra hồ sơ.' };
    }
    if (!res.ok) return { kind: 'network' };
    const json = (await res.json()) as { errors?: ValidationError[] };
    return { kind: 'ok', errors: Array.isArray(json?.errors) ? json.errors : [] };
  } catch {
    return { kind: 'network' };
  }
}
