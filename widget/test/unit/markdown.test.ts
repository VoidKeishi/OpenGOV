// Mini-markdown (WIDGET.md §5.3): escape-first sanitization, bold, safe links,
// lists, <br>.
import { describe, expect, it } from 'vitest';
import { miniMarkdown } from '../../src/core/markdown';

describe('miniMarkdown', () => {
  it('escapes all raw HTML — script/img payloads become text', () => {
    expect(miniMarkdown('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(miniMarkdown('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
  });

  it('renders **bold**', () => {
    expect(miniMarkdown('cần **Tờ khai CT01** nhé')).toBe(
      'cần <strong>Tờ khai CT01</strong> nhé',
    );
  });

  it('markdown links: http/https only, target _blank + noopener', () => {
    expect(miniMarkdown('[Cổng DVC](https://dichvucong.gov.vn/a?b=1)')).toBe(
      '<a href="https://dichvucong.gov.vn/a?b=1" target="_blank" rel="noopener noreferrer">Cổng DVC</a>',
    );
  });

  it('javascript: URLs are never linked', () => {
    const out = miniMarkdown('[bấm](javascript:alert(1))');
    expect(out).not.toContain('<a');
    expect(out).toContain('javascript:alert(1)');
  });

  it('bare URLs become links, once', () => {
    const out = miniMarkdown('xem https://dichvucong.gov.vn nhé');
    expect(out).toBe(
      'xem <a href="https://dichvucong.gov.vn" target="_blank" rel="noopener noreferrer">https://dichvucong.gov.vn</a> nhé',
    );
  });

  it('escaped quotes inside text do not break the href attribute', () => {
    const out = miniMarkdown('"https://a.vn"');
    expect(out).toContain('href="https://a.vn&quot;"');
  });

  it('- / * lines become <ul>, numbered lines become <ol>', () => {
    expect(miniMarkdown('- một\n- hai')).toBe('<ul><li>một</li><li>hai</li></ul>');
    expect(miniMarkdown('* một\n* hai')).toBe('<ul><li>một</li><li>hai</li></ul>');
    expect(miniMarkdown('1. một\n2. hai')).toBe('<ol><li>một</li><li>hai</li></ol>');
  });

  it('remaining newlines become <br>; list blocks do not get stray <br>', () => {
    expect(miniMarkdown('dòng 1\ndòng 2')).toBe('dòng 1<br>dòng 2');
    expect(miniMarkdown('mở đầu\n- a\n- b\nkết')).toBe(
      'mở đầu<ul><li>a</li><li>b</li></ul>kết',
    );
  });

  it('inline transforms apply inside list items', () => {
    expect(miniMarkdown('- **CT01** tại [đây](https://a.vn)')).toBe(
      '<ul><li><strong>CT01</strong> tại <a href="https://a.vn" target="_blank" rel="noopener noreferrer">đây</a></li></ul>',
    );
  });

  it('no headings, no tables, no code blocks', () => {
    expect(miniMarkdown('# tiêu đề')).toBe('# tiêu đề');
    expect(miniMarkdown('`code`')).toBe('`code`');
  });
});
