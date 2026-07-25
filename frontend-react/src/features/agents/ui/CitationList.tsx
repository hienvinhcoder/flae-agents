import { FileText } from "lucide-react";

import type { Citation } from "../types/agent";

interface CitationListProps {
  citations: readonly Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  return (
    <ul aria-label="Message citations" className="grid gap-2.5">
      {citations.map((citation, index) => (
        <li className="rounded-ui-panel border border-ui-line bg-ui-raised p-3" key={`${citation.source_document}-${index}`}>
          <div className="flex items-start gap-2">
            <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ui-ink-muted" />
            <p className="min-w-0 flex-1 truncate text-xs font-bold text-ui-ink">
              {citation.source_document}
            </p>
            {citation.score === undefined ? null : (
              <span className="shrink-0 rounded-full border border-state-success bg-state-success-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-state-success">
                {Math.round(citation.score * 100)}% match
              </span>
            )}
          </div>
          <p className="mt-2 text-xs italic leading-5 text-ui-ink-secondary">{citation.content}</p>
        </li>
      ))}
    </ul>
  );
}
