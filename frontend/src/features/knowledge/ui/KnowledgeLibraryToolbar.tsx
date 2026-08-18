import { LayoutGrid, List, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Select } from "../../../shared/ui/Select";

export type KnowledgeViewMode = "grid" | "list";

interface KnowledgeLibraryToolbarProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onViewModeChange: (mode: KnowledgeViewMode) => void;
  search: string;
  status: string;
  viewMode: KnowledgeViewMode;
}

export function KnowledgeLibraryToolbar({
  hasActiveFilters,
  onClearFilters,
  onSearchChange,
  onStatusChange,
  onViewModeChange,
  search,
  status,
  viewMode,
}: KnowledgeLibraryToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 border-b border-ui-divider bg-ui-panel/60 p-4 sm:p-5 lg:grid-cols-[minmax(16rem,1fr)_13rem_auto_auto] lg:items-end">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ui-ink" htmlFor="knowledge-search">
          {t("KNOWLEDGE.SEARCH_LABEL")}
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-ink-muted"
            strokeWidth={1.75}
          />
          <input
            className="min-h-10 w-full rounded-ui-control border border-ui-line bg-ui-raised py-2 pl-10 pr-3 text-sm text-ui-ink placeholder:text-ui-ink-muted hover:border-ui-line-strong focus:border-brand-text focus:outline-none"
            id="knowledge-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("KNOWLEDGE.SEARCH_PLACEHOLDER")}
            type="search"
            value={search}
          />
        </div>
      </div>

      <Select
        label={t("KNOWLEDGE.STATUS_FILTER")}
        onChange={(event) => onStatusChange(event.target.value)}
        options={[
          { label: t("KNOWLEDGE.ALL_STATUSES"), value: "all" },
          { label: t("KNOWLEDGE.STATUS_PENDING"), value: "pending" },
          { label: t("KNOWLEDGE.STATUS_PROCESSING"), value: "processing" },
          { label: t("KNOWLEDGE.STATUS_COMPLETED"), value: "completed" },
          { label: t("KNOWLEDGE.STATUS_FAILED"), value: "failed" },
        ]}
        value={status}
      />

      <div className="grid gap-2">
        <span className="text-sm font-semibold text-ui-ink">
          {t("KNOWLEDGE.VIEW_MODE")}
        </span>
        <div
          aria-label={t("KNOWLEDGE.VIEW_MODE")}
          className="inline-flex min-h-10 w-fit rounded-ui-control border border-ui-line bg-ui-raised p-1"
          role="group"
        >
          <button
            aria-label={t("KNOWLEDGE.GRID_VIEW")}
            aria-pressed={viewMode === "grid"}
            className={`grid min-h-8 min-w-10 place-items-center rounded-ui-control transition-colors duration-150 motion-reduce:transition-none ${
              viewMode === "grid"
                ? "bg-brand-soft text-brand-text"
                : "text-ui-ink-muted hover:bg-ui-interactive hover:text-ui-ink"
            }`}
            onClick={() => onViewModeChange("grid")}
            type="button"
          >
            <LayoutGrid aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            aria-label={t("KNOWLEDGE.LIST_VIEW")}
            aria-pressed={viewMode === "list"}
            className={`grid min-h-8 min-w-10 place-items-center rounded-ui-control transition-colors duration-150 motion-reduce:transition-none ${
              viewMode === "list"
                ? "bg-brand-soft text-brand-text"
                : "text-ui-ink-muted hover:bg-ui-interactive hover:text-ui-ink"
            }`}
            onClick={() => onViewModeChange("list")}
            type="button"
          >
            <List aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {hasActiveFilters ? (
        <Button onClick={onClearFilters} size="sm" variant="ghost">
          <X aria-hidden className="h-4 w-4" />
          {t("KNOWLEDGE.CLEAR_FILTERS")}
        </Button>
      ) : null}
    </div>
  );
}
