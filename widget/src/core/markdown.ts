// Hand-rolled sanitized mini-markdown for assistant prose (WIDGET.md §5.3).
// Processing order is normative: (1) escape ALL HTML; (2) **bold**;
// (3) [text](url) + bare URLs → <a> (http/https only); (4) `- `/`* ` → <ul>,
// `1. ` → <ol>; (5) remaining newlines → <br>. No headings, no tables, no
// code blocks — raw model HTML is NEVER rendered.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function anchor(url: string, text: string): string {
  // url/text are already HTML-escaped (escape ran first), safe in attr/body
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

/** Inline transforms on one already-escaped line: bold + links. */
function inline(line: string): string {
  let s = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) => anchor(url, text));
  // Bare URLs — the leading guard keeps URLs inside generated href="..."/">text"
  // from matching twice.
  s = s.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, (_m, pre, url) => pre + anchor(url, url));
  return s;
}

export function miniMarkdown(src: string): string {
  const lines = escapeHtml(src).split('\n');
  const parts: { list: boolean; html: string }[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    parts.push({
      list: true,
      html: `<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`,
    });
    list = null;
  };

  for (const line of lines) {
    const ul = /^\s*[-*] (.*)$/.exec(line);
    const ol = /^\s*\d+\. (.*)$/.exec(line);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (!list || list.tag !== tag) {
        flush();
        list = { tag, items: [] };
      }
      list.items.push(inline((ul ?? ol)![1] ?? ''));
    } else {
      flush();
      parts.push({ list: false, html: inline(line) });
    }
  }
  flush();

  let html = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (i > 0 && !part.list && !parts[i - 1]!.list) html += '<br>';
    html += part.html;
  }
  return html;
}
