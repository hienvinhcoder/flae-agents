import { GitMerge } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppError } from "../../../core/api/errors";
import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import { createTopicMergeSchema } from "../schemas/topic-schema";
import type { Topic, TopicMergePayload } from "../types/topic";

interface TopicMergeDialogProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: TopicMergePayload) => Promise<boolean>;
  open: boolean;
  topics: readonly Topic[];
}

function publicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return fallback;
  return error instanceof Error ? error.message : fallback;
}

export function TopicMergeDialog({
  isSubmitting,
  onClose,
  onSubmit,
  open,
  topics,
}: TopicMergeDialogProps) {
  const { t } = useTranslation();
  const schema = useMemo(
    () => createTopicMergeSchema((key) => t(key)),
    [t],
  );
  const [targetId, setTargetId] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const resetAndClose = () => {
    setTargetId("");
    setSourceIds([]);
    setError(undefined);
    onClose();
  };

  const submit = async () => {
    const result = schema.safeParse({
      source_topic_ids: sourceIds,
      target_topic_id: targetId,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? t("TOPICS.MERGE_ERROR"));
      return;
    }
    setError(undefined);
    try {
      const merged = await onSubmit(result.data);
      if (!merged) {
        setError(t("TOPICS.MERGE_ERROR"));
        return;
      }
      resetAndClose();
    } catch (submitError) {
      setError(publicErrorMessage(submitError, t("TOPICS.MERGE_ERROR")));
    }
  };

  return (
    <Dialog
      closeLabel={t("SHELL.CLOSE_DIALOG")}
      description={t("TOPICS.MERGE_CONFIRM_MSG")}
      dismissible={!isSubmitting}
      onClose={resetAndClose}
      open={open}
      title={t("TOPICS.MERGE_DIALOG_TITLE")}
    >
      <div className="grid gap-5">
        <Select
          disabled={isSubmitting}
          label={t("TOPICS.MERGE_TARGET_LABEL")}
          onChange={(event) => {
            setTargetId(event.target.value);
            setSourceIds([]);
            setError(undefined);
          }}
          options={[
            { label: t("TOPICS.MERGE_TARGET_PLACEHOLDER"), value: "" },
            ...topics.map((topic) => ({ label: topic.name, value: topic.topic_id })),
          ]}
          value={targetId}
        />

        <fieldset className="grid gap-3">
          <legend className="font-semibold text-ui-ink">
            {t("TOPICS.MERGE_SOURCES_LABEL")}
          </legend>
          <p className="text-sm text-ui-ink-muted">
            {t("TOPICS.MERGE_SOURCE_HINT")}
          </p>
          <div className="grid max-h-52 gap-2 overflow-y-auto rounded-ui-control border border-ui-line bg-ui-canvas p-3">
            {topics
              .filter((topic) => topic.topic_id !== targetId)
              .map((topic) => (
                <label
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-ui-control px-2 py-1.5 text-ui-ink transition-colors duration-200 motion-reduce:transition-none hover:bg-ui-interactive"
                  key={topic.topic_id}
                >
                  <input
                    checked={sourceIds.includes(topic.topic_id)}
                    className="h-4 w-4 accent-brand"
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setError(undefined);
                      setSourceIds((current) =>
                        event.target.checked
                          ? [...current, topic.topic_id]
                          : current.filter((id) => id !== topic.topic_id),
                      );
                    }}
                    type="checkbox"
                  />
                  <span>{topic.name}</span>
                </label>
              ))}
          </div>
        </fieldset>

        {error ? (
          <p className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-sm text-state-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-ui-divider pt-4">
          <Button disabled={isSubmitting} onClick={resetAndClose} variant="ghost">
            {t("COMMON.CANCEL")}
          </Button>
          <Button
            disabled={!targetId || sourceIds.length === 0}
            isLoading={isSubmitting}
            loadingText={t("TOPICS.MERGING")}
            onClick={() => void submit()}
          >
            <GitMerge aria-hidden className="h-4 w-4" />
            {t("TOPICS.MERGE_ACTION")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
