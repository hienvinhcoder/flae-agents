import { FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Citation } from "../types/chat";

interface CitationListProps {
  citations: readonly Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <ul aria-label={t("CHAT_UI.CITATIONS_ARIA")} className="flex flex-wrap gap-1.5">
      {citations.map((citation, index) => {
        const expanded = expandedIndex === index;
        return (
          <li className="max-w-full" key={`${citation.source_document}-${index}`}>
            <button
              aria-expanded={expanded}
              aria-label={expanded
                ? t("CHAT_UI.COLLAPSE_CITATION", { source: citation.source_document })
                : t("CHAT_UI.EXPAND_CITATION", { source: citation.source_document })}
              className="glass-chip flex max-w-full cursor-pointer items-center gap-1.5 rounded-ui-status px-2.5 py-1 text-left transition-colors duration-200 hover:bg-ui-interactive"
              onClick={() => setExpandedIndex(expanded ? null : index)}
              type="button"
            >
              <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand-text" />
              <span className="truncate text-xs font-medium text-ui-ink">{citation.source_document}</span>
              {citation.score === undefined ? null : (
                <span className="shrink-0 text-[0.6875rem] font-medium text-brand-text">
                  {t("CHAT_UI.CITATION_SCORE", { percent: Math.round(citation.score * 100) })}
                </span>
              )}
            </button>
            {expanded ? (
              <p className="mt-1.5 max-w-md rounded-ui-control bg-ui-interactive px-2.5 py-2 text-xs leading-5 text-ui-ink-secondary">
                {citation.content}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
