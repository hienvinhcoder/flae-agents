import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type TooltipInteraction = "focus" | "hover";

export interface RailTooltipState {
  label: string;
  left: number;
  top: number;
}

interface RailTooltipTarget {
  label: string;
  target: HTMLElement;
}

interface RailTooltipSession {
  resetKey: string;
  tooltip: RailTooltipState | null;
}

interface UseRailTooltipOptions {
  disabled: boolean;
  resetKey: string;
}

const emptyTooltipTargets = (): Record<
  TooltipInteraction,
  RailTooltipTarget | null
> => ({
  focus: null,
  hover: null,
});

export function useRailTooltip({ disabled, resetKey }: UseRailTooltipOptions) {
  const [session, setSession] = useState<RailTooltipSession>({
    resetKey,
    tooltip: null,
  });
  const tooltipTargetsRef = useRef(emptyTooltipTargets());

  if (session.resetKey !== resetKey) {
    setSession({ resetKey, tooltip: null });
  }

  useLayoutEffect(() => {
    tooltipTargetsRef.current = emptyTooltipTargets();
  }, [resetKey]);

  const positionTooltip = useCallback(
    (nextTooltip: RailTooltipTarget | null) => {
      if (!nextTooltip) {
        setSession({ resetKey, tooltip: null });
        return;
      }

      const rect = nextTooltip.target.getBoundingClientRect();
      setSession({
        resetKey,
        tooltip: {
          label: nextTooltip.label,
          left: rect.right + 13,
          top: rect.top + rect.height / 2,
        },
      });
    },
    [resetKey],
  );

  const clearTooltip = useCallback(() => {
    tooltipTargetsRef.current = emptyTooltipTargets();
    setSession({ resetKey, tooltip: null });
  }, [resetKey]);

  const showTooltip = useCallback(
    (target: HTMLElement, label: string, interaction: TooltipInteraction) => {
      const nextTooltip = { label, target };
      tooltipTargetsRef.current[interaction] = nextTooltip;
      positionTooltip(nextTooltip);
    },
    [positionTooltip],
  );

  const hideTooltip = useCallback(
    (target: HTMLElement, interaction: TooltipInteraction) => {
      const targets = tooltipTargetsRef.current;
      if (targets[interaction]?.target === target) targets[interaction] = null;
      positionTooltip(targets.hover ?? targets.focus);
    },
    [positionTooltip],
  );

  useEffect(() => {
    if (disabled) return undefined;

    window.addEventListener("resize", clearTooltip);
    return () => window.removeEventListener("resize", clearTooltip);
  }, [clearTooltip, disabled]);

  return {
    clearTooltip,
    hideTooltip,
    showTooltip,
    tooltip: session.resetKey === resetKey ? session.tooltip : null,
  } as const;
}
