import { Pause, Play } from "lucide-react";

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
  const Icon = physicsEnabled ? Pause : Play;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <label className="font-code text-[0.68rem] uppercase tracking-wider text-ui-ink-muted" htmlFor="graph-node-type">
          Entity type
        </label>
        <select
          className="min-h-10 max-w-52 rounded-ui-control border border-ui-line bg-ui-canvas/80 px-3 text-ui-ink"
          id="graph-node-type"
          onChange={(event) => onNodeTypeChange(event.target.value)}
          value={nodeType}
        >
          <option value="all">All entity types</option>
          {nodeTypes.map((type) => <option key={type} value={type}>{type || "Other"}</option>)}
        </select>
      </div>
      <button
        aria-label={`Physics ${physicsEnabled ? "on" : "off"}`}
        aria-pressed={physicsEnabled}
        className={`inline-flex min-h-10 items-center gap-2 rounded-ui-control border px-3 font-semibold transition-colors ${physicsEnabled ? "border-brand bg-brand-soft text-brand" : "border-ui-line bg-ui-raised text-ui-ink-secondary hover:bg-ui-interactive"}`}
        onClick={() => onPhysicsChange(!physicsEnabled)}
        type="button"
      >
        <Icon aria-hidden className="h-4 w-4" />
        Physics {physicsEnabled ? "on" : "off"}
      </button>
    </div>
  );
}
