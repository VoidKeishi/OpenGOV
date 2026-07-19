// Phase-2 integration: custom elements do bundle trợ lý OpenGOV (script tag ở
// layout.tsx) định nghĩa — clone chỉ đặt markup, không import code nào.
import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "opengov-field-hint": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { field: string; hint?: string };
      "opengov-check-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
