import { Filter, LayoutGrid, List, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";

export type KnowledgeViewMode = "grid" | "list";

interface KnowledgeLibraryToolbarProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onViewModeChange: (mode: KnowledgeViewMode) => void;
  resultCount: number;
  search: string;
  status: string;
  totalCount: number;
  viewMode: KnowledgeViewMode;
}

export function KnowledgeLibraryToolbar({
  hasActiveFilters,
  onClearFilters,
  onSearchChange,
  onStatusChange,
  onViewModeChange,
  resultCount,
  search,
  status,
  viewMode,
}: KnowledgeLibraryToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <input
            aria-label={t("KNOWLEDGE.SEARCH_LABEL")}
            className="h-9 w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring sm:w-[280px]"
            id="knowledge-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("KNOWLEDGE.SEARCH_PLACEHOLDER")}
            type="search"
            value={search}
          />
        </div>

        <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-muted-foreground hover:bg-muted">
          <Filter aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          <span>{t("KNOWLEDGE.STATUS_FILTER")}</span>
          <select
            aria-label={t("KNOWLEDGE.STATUS_FILTER")}
            className="max-w-[9rem] border-0 bg-transparent text-[13px] font-medium text-foreground focus:outline-none"
            onChange={(event) => onStatusChange(event.target.value)}
            value={status}
          >
            <option value="all">{t("KNOWLEDGE.ALL_STATUSES")}</option>
            <option value="pending">{t("KNOWLEDGE.STATUS_PENDING")}</option>
            <option value="processing">{t("KNOWLEDGE.STATUS_PROCESSING")}</option>
            <option value="completed">{t("KNOWLEDGE.STATUS_COMPLETED")}</option>
            <option value="failed">{t("KNOWLEDGE.STATUS_FAILED")}</option>
          </select>
        </label>

        {hasActiveFilters ? (
          <Button onClick={onClearFilters} size="sm" variant="ghost">
            <X aria-hidden className="h-4 w-4" />
            {t("KNOWLEDGE.CLEAR_FILTERS")}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="font-mono tabular-nums">
          {t("KNOWLEDGE.RESULT_COUNT", { count: resultCount })}
        </span>
        <span aria-hidden className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <div
          aria-label={t("KNOWLEDGE.VIEW_MODE")}
          className="flex rounded-md bg-muted p-0.5"
          role="group"
        >
          <button
            aria-label={t("KNOWLEDGE.LIST_VIEW")}
            aria-pressed={viewMode === "list"}
            className={`rounded p-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewModeChange("list")}
            type="button"
          >
            <List aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            aria-label={t("KNOWLEDGE.GRID_VIEW")}
            aria-pressed={viewMode === "grid"}
            className={`rounded p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onViewModeChange("grid")}
            type="button"
          >
            <LayoutGrid aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
