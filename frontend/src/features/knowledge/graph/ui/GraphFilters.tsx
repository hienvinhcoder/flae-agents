import { Filter, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GraphFiltersProps {
  nodeType: string;
  nodeTypes: readonly string[];
  onNodeTypeChange: (type: string) => void;
  onPhysicsChange: (enabled: boolean) => void;
  physicsEnabled: boolean;
}

export function GraphFilters({
  nodeType,
  nodeTypes,
  onNodeTypeChange,
  onPhysicsChange,
  physicsEnabled,
}: GraphFiltersProps) {
  const { t } = useTranslation();
  const Icon = physicsEnabled ? Pause : Play;
  const physicsLabel = t(physicsEnabled ? "GRAPH.PHYSICS_ON" : "GRAPH.PHYSICS_OFF");

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative flex items-center">
        <label
          className="sr-only"
          htmlFor="graph-node-type"
        >
          {t("GRAPH.ENTITY_TYPE")}
        </label>
        <div className="pointer-events-none absolute left-3 flex items-center text-ui-ink-muted">
          <Filter aria-hidden="true" className="h-3.5 w-3.5" />
        </div>
        <select
          className="min-h-11 min-w-11 min-w-[12rem] max-w-56 cursor-pointer appearance-none rounded-xl border border-ui-line/60 bg-ui-raised/80 pl-8 pr-8 text-xs font-medium text-ui-ink shadow-sm backdrop-blur-md transition-all duration-200 hover:border-ui-line-strong focus:border-ui-focus focus:outline-none focus:ring-2 focus:ring-ui-focus/25 motion-reduce:transition-none"
          id="graph-node-type"
          onChange={(event) => onNodeTypeChange(event.target.value)}
          value={nodeType}
        >
          <option value="all">{t("GRAPH.ALL_ENTITY_TYPES")}</option>
          {nodeTypes.map((type) => (
            <option key={type} value={type}>
              {type || "-"}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 flex items-center font-code text-[0.65rem] text-ui-ink-muted">
          ▼
        </div>
      </div>

      <button
        aria-label={physicsLabel}
        aria-pressed={physicsEnabled}
        className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl border px-3.5 font-semibold text-xs shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95 motion-reduce:transition-none ${
          physicsEnabled
            ? "border-brand-text/60 bg-brand-soft/80 text-brand-text shadow-glow-primary"
            : "border-ui-line/60 bg-ui-raised/80 text-ui-ink-secondary hover:border-ui-line-strong hover:bg-ui-interactive hover:text-ui-ink"
        }`}
        onClick={() => onPhysicsChange(!physicsEnabled)}
        type="button"
      >
        <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${physicsEnabled ? "animate-pulse" : ""}`} />
        <span>{physicsLabel}</span>
        {physicsEnabled ? (
          <span className="relative flex h-2 w-2 ml-0.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-chart-2" />
          </span>
        ) : null}
      </button>
    </div>
  );
}
