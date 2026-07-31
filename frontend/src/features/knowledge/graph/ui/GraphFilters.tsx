import { Pause, Play } from "lucide-react";
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
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <label className="font-code text-[0.68rem] uppercase tracking-wider text-ui-ink-muted" htmlFor="graph-node-type">
          {t("GRAPH.ENTITY_TYPE")}
        </label>
        <select
          className="min-h-11 min-w-11 min-w-[12rem] max-w-52 cursor-pointer rounded-ui-control border border-ui-line bg-ui-raised px-3 text-ui-ink shadow-sm transition-colors duration-200 hover:border-ui-line-strong focus:border-ui-focus focus:outline-none focus:ring-2 focus:ring-ui-focus/25 motion-reduce:transition-none"
          id="graph-node-type"
          onChange={(event) => onNodeTypeChange(event.target.value)}
          value={nodeType}
        >
          <option value="all">{t("GRAPH.ALL_ENTITY_TYPES")}</option>
          {nodeTypes.map((type) => <option key={type} value={type}>{type || "-"}</option>)}
        </select>
      </div>
      <button
        aria-label={physicsLabel}
        aria-pressed={physicsEnabled}
        className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-ui-control border px-4.5 font-semibold shadow-sm transition-colors duration-200 motion-reduce:transition-none ${
          physicsEnabled
            ? "border-brand-text bg-brand-soft/80 text-brand-text font-bold"
            : "border-ui-line bg-ui-raised text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink"
        }`}
        onClick={() => onPhysicsChange(!physicsEnabled)}
        type="button"
      >
        <Icon aria-hidden className={`h-4 w-4 ${physicsEnabled ? "animate-pulse" : ""}`} />
        <span>{physicsLabel}</span>
        {physicsEnabled && (
          <span className="relative flex h-2 w-2 ml-1">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-chart-2"></span>
          </span>
        )}
      </button>
    </div>
  );
}
