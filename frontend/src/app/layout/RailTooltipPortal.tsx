import { createPortal } from "react-dom";

import type { RailTooltipState } from "./use-rail-tooltip";

interface RailTooltipPortalProps {
  hiddenAtLarge: boolean;
  tooltip: RailTooltipState | null;
}

export function RailTooltipPortal({
  hiddenAtLarge,
  tooltip,
}: RailTooltipPortalProps) {
  if (!tooltip) return null;

  return createPortal(
    <span
      aria-hidden="true"
      className={`pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-ui-control border border-ui-divider bg-ui-raised px-3 py-2 text-sm font-medium text-ui-ink shadow-ui-panel ${hiddenAtLarge ? "lg:hidden" : ""}`}
      data-testid="admin-sidebar-tooltip"
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      {tooltip.label}
    </span>,
    document.body,
  );
}
