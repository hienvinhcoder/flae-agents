import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "../../../shared/ui/EmptyState";
import { PageHeader } from "../../../shared/ui/PageHeader";

export function InboxPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8">
      <PageHeader
        description={t("OVERVIEW.INBOX_DESCRIPTION")}
        eyebrow={t("OVERVIEW.FOCUS_EYEBROW")}
        title={t("NAV.INBOX", { defaultValue: "Omnichannel inbox" })}
      />
      <div className="border-y border-ui-divider bg-ui-raised/45">
        <EmptyState
          description={t("OVERVIEW.INBOX_PREVIEW_DESCRIPTION")}
          icon={Inbox}
          title={t("OVERVIEW.COMING_SOON")}
        />
      </div>
    </section>
  );
}
