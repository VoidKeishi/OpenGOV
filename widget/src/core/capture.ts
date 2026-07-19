// DOM capture for "Kiểm tra hồ sơ" (WIDGET.md §6.3). Pure functions over a
// ParentNode — unit-tested against the capture contract table.

const SKIP_INPUT_TYPES = new Set(['file', 'submit', 'button', 'reset', 'image']);
const FIELD_SELECTOR = 'input[name], select[name], textarea[name]';

/**
 * Main form = the <form> containing the most DISTINCT schema field names.
 * No form contains any → capture over the whole document.
 */
export function pickMainForm(doc: ParentNode, fieldKeys: string[]): ParentNode {
  const keys = new Set(fieldKeys);
  let best: ParentNode | null = null;
  let bestCount = 0;
  for (const form of doc.querySelectorAll('form')) {
    const present = new Set<string>();
    for (const el of form.querySelectorAll(FIELD_SELECTOR)) {
      const name = el.getAttribute('name');
      if (name && keys.has(name)) present.add(name);
    }
    if (present.size > bestCount) {
      best = form;
      bestCount = present.size;
    }
  }
  return best ?? doc;
}

/**
 * Capture every named field in the root. Values verbatim (engine trims):
 * - radio: value of the checked one in the name group, "" if none checked
 * - checkbox: checked ? (value or "on") : "" — unchecked MUST be "" so the
 *   engine's `required` rule (fires on empty) works; never "false".
 *   Multiple checkboxes sharing a name: last write wins (unspecified edge).
 * - file/submit/button/reset/image: skipped
 * - everything else (select, textarea, date, number, hidden, readonly,
 *   disabled): .value as-is, no trim
 * Keys outside the schema are sent too — the engine ignores them.
 */
export function captureFields(root: ParentNode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const el of root.querySelectorAll(FIELD_SELECTOR)) {
    const name = el.getAttribute('name');
    if (!name) continue;
    if (el.tagName === 'INPUT') {
      const input = el as HTMLInputElement;
      const type = input.type;
      if (SKIP_INPUT_TYPES.has(type)) continue;
      if (type === 'radio') {
        if (input.checked) out[name] = input.value;
        else if (!(name in out)) out[name] = '';
      } else if (type === 'checkbox') {
        out[name] = input.checked ? input.value || 'on' : '';
      } else {
        out[name] = input.value;
      }
    } else {
      out[name] = (el as HTMLSelectElement | HTMLTextAreaElement).value;
    }
  }
  return out;
}

/**
 * The portal's submit/next button — resolution target for the `submit` guide
 * anchor (WIDGET.md §12.2). Tried most-specific first: a button explicitly
 * associated to a form (the clone's shared "Tiếp tục/Nộp hồ sơ" button), then
 * any submit button inside a form, then any submit control.
 */
export function findSubmit(doc: ParentNode): Element | null {
  return (
    doc.querySelector('button[form]') ??
    doc.querySelector('form button[type="submit"]') ??
    doc.querySelector('button[type="submit"], input[type="submit"]')
  );
}

/** First element carrying this field name (used for labels and scroll-to-field). */
export function findField(doc: ParentNode, fieldName: string): Element | null {
  const esc = fieldName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return doc.querySelector(
    `input[name="${esc}"], select[name="${esc}"], textarea[name="${esc}"]`,
  );
}

/**
 * Human label for a validation result item (§6.4): <label for> → wrapping
 * <label> → immediately preceding <label> sibling → null (caller falls back
 * to errors[].field).
 */
export function fieldLabel(doc: ParentNode, fieldName: string): string | null {
  const el = findField(doc, fieldName);
  if (!el) return null;
  const clean = (s: string | null | undefined) => s?.replace(/\s+/g, ' ').trim() || null;
  const id = el.getAttribute('id');
  if (id) {
    const esc = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const byFor = doc.querySelector(`label[for="${esc}"]`);
    if (byFor) return clean(byFor.textContent);
  }
  const wrapping = el.closest('label');
  if (wrapping) return clean(wrapping.textContent);
  const prev = el.previousElementSibling;
  if (prev && prev.tagName === 'LABEL') return clean(prev.textContent);
  return null;
}
