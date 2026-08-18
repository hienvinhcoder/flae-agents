import { zodResolver } from "@hookform/resolvers/zod";
import { GitMerge } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AppError } from "../../../core/api/errors";
import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Select } from "../../../shared/ui/Select";
import {
  createTopicMergeSchema,
  type TopicMergeForm,
} from "../schemas/topic-schema";
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
  const {
    clearErrors,
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<TopicMergeForm>({
    defaultValues: { source_topic_ids: [], target_topic_id: "" },
    resolver: zodResolver(schema),
  });
  const targetId = useWatch({ control, name: "target_topic_id" });
  const sourceIds = useWatch({ control, name: "source_topic_ids" });
  const [submitError, setSubmitError] = useState<string>();

  const resetAndClose = () => {
    reset();
    setSubmitError(undefined);
    onClose();
  };

  const submit = async (payload: TopicMergeForm) => {
    setSubmitError(undefined);
    try {
      const merged = await onSubmit(payload);
      if (!merged) {
        setSubmitError(t("TOPICS.MERGE_ERROR"));
        return;
      }
      resetAndClose();
    } catch (submitError) {
      setSubmitError(publicErrorMessage(submitError, t("TOPICS.MERGE_ERROR")));
    }
  };

  const validationError = errors.target_topic_id?.message
    ?? errors.source_topic_ids?.message;

  return (
    <Dialog
      closeLabel={t("SHELL.CLOSE_DIALOG")}
      description={t("TOPICS.MERGE_CONFIRM_MSG")}
      dismissible={!isSubmitting}
      onClose={resetAndClose}
      open={open}
      title={t("TOPICS.MERGE_DIALOG_TITLE")}
    >
      <form
        className="grid gap-5"
        onSubmit={(event) => void handleSubmit(submit)(event)}
      >
        <Controller
          control={control}
          name="target_topic_id"
          render={({ field: { name, onBlur, onChange, ref, value } }) => (
            <Select
              disabled={isSubmitting}
              label={t("TOPICS.MERGE_TARGET_LABEL")}
              name={name}
              onBlur={onBlur}
              onChange={(event) => {
                onChange(event.target.value);
                setValue("source_topic_ids", []);
                clearErrors();
                setSubmitError(undefined);
              }}
              options={[
                { label: t("TOPICS.MERGE_TARGET_PLACEHOLDER"), value: "" },
                ...topics.map((topic) => ({ label: topic.name, value: topic.topic_id })),
              ]}
              ref={ref}
              value={value}
            />
          )}
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
                    className="h-4 w-4 accent-brand"
                    disabled={isSubmitting}
                    {...register("source_topic_ids", {
                      onChange: () => {
                        clearErrors("source_topic_ids");
                        setSubmitError(undefined);
                      },
                    })}
                    type="checkbox"
                    value={topic.topic_id}
                  />
                  <span>{topic.name}</span>
                </label>
              ))}
          </div>
        </fieldset>

        {validationError || submitError ? (
          <p className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-sm text-state-danger" role="alert">
            {validationError ?? submitError}
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
            type="submit"
          >
            <GitMerge aria-hidden className="h-4 w-4" />
            {t("TOPICS.MERGE_ACTION")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
