import { Sunrise } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "../../../shared/ui/EmptyState";
import { PageHeader } from "../../../shared/ui/PageHeader";

export function BriefingPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8">
      <PageHeader
        description={t("OVERVIEW.BRIEFING_DESCRIPTION")}
        eyebrow={t("OVERVIEW.FOCUS_EYEBROW")}
        title={t("NAV.BRIEFING", { defaultValue: "Morning briefing" })}
      />
      <div className="border-y border-ui-divider bg-ui-raised/45">
        <EmptyState
          description={t("OVERVIEW.BRIEFING_PREVIEW_DESCRIPTION")}
          icon={Sunrise}
          title={t("OVERVIEW.COMING_SOON")}
        />
      </div>
    </div>
  );
}
