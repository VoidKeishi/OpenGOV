# plan.md — dichvucong.gov.vn clone

> Purpose: a faithful mock of the real portal that hosts our live demo. **Hard rule for Stages 1–3: this package must be built with zero knowledge of OpenGOV.** No widget imports, no placeholder divs, no `data-opengov-*` attributes, no mention in code or comments. The integration happens only in Stage 4, in separate commits — that blindness is the point: it proves the widget integrates into a portal that was never built for it.

## Stage 1 — Capture the real portal

Playwright scripts in `tools/capture/`:

- Full-page screenshots (desktop 1440px + mobile 390px) and HTML snapshots of:
  1. Trang chủ dichvucong.gov.vn (header, nav, search, service categories)
  2. Tra cứu thủ tục hành chính — search page + results list
  3. Chi tiết thủ tục for each pilot procedure (đăng ký khai sinh, đăng ký thường trú, GPXD nhà ở riêng lẻ): trình tự thực hiện, thành phần hồ sơ, biểu mẫu, thời hạn, lệ phí, cơ quan thực hiện
  4. Any publicly reachable "Nộp trực tuyến" entry screens
- Extract design tokens from snapshots: colors, fonts, spacing, logo treatment. Recreate assets — do not hotlink or copy binaries from the portal.
- **Known limitation:** the actual online submission forms sit behind VNeID login and cannot be captured. Reconstruct them from the official form templates instead (mẫu tờ khai đăng ký khai sinh, tờ khai thay đổi thông tin cư trú CT01, đơn đề nghị cấp GPXD) available in the public biểu mẫu catalog. Field names and structure fidelity matter more than pixel fidelity here — these fields feed the validation demo.

Output: `tools/capture/output/` (screenshots, HTML, tokens).

## Stage 2 — Write CLONE_SPEC.md from captures

A human (or agent with vision) reviews the captures and writes `dichvucong/CLONE_SPEC.md`:

- **Global:** layout shell, header/nav/footer, color tokens, typography, responsive behavior.
- **Per screen:** component breakdown, content structure, navigation links between screens, which content is static vs. data-driven.
- **Forms (most important section):** for each pilot procedure, the exact field list — label, input type, required/optional, format expectations, multi-step grouping if the real flow is multi-step. Include realistic fields that enable good validation demos (số CCCD, ngày sinh, quê quán/mã tỉnh, quan hệ với người được khai sinh...).
- Mark visible deviations from the real portal as intentional (e.g., "MÔI TRƯỜNG DEMO" banner, no real auth — a fake logged-in state).

The spec is the implementation contract; the agent in Stage 3 codes from the spec + screenshots, not from the live site.

## Stage 3 — Blind implementation

- **Stack:** Next.js (App Router), static/mock data in local JSON, Tailwind mapped to the extracted tokens. Deployable to Vercel as-is.
- Implement screens per CLONE_SPEC.md: home → search → procedure detail → online submission form (multi-step) → fake submit confirmation.
- Procedure detail content comes from `data/` procedure sheets (same source of truth the backend uses) — but accessed as plain JSON, no backend calls.
- Forms are plain controlled forms with native HTML semantics (`<label for>`, `name`, sensible `id`s) and only trivial browser validation — the portal itself stays "dumb", exactly like the real one. Do not add smart validation here; that is the widget's job later.
- Acceptance: a user can navigate the full journey and fill every pilot form end-to-end with no console errors, desktop + mobile.

**Reminder:** no OpenGOV references. Treat this stage as if the clone were a different team's product.

## Stage 4 — Integration commits (after Stages 1–3 are merged)

Separate, clearly-messaged commits:

1. **`feat: embed OpenGOV widget (Phase 1)`** — the diff is one `<script>` tag in the root layout. Nothing else. Verify: bubble appears on every page; on form pages, "Kiểm tra hồ sơ" in the chat reads the form via DOM and shows results in-chat. Screenshot this diff for `docs/`.
2. **`feat: Phase 2 deep integration`** — add a field-ID → procedure-schema mapping config, mount `<opengov-check-button>` next to the form's submit button, render inline `<opengov-field-hint>` highlights from `/validate` responses. Gate behind a visible "Phase 2 preview" toggle so the demo can show both integration depths.

## Out of scope

- Real auth / VNeID, real submission, admin screens, any procedure beyond the pilot three, pixel-perfect fidelity on non-critical pages.