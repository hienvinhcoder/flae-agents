import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import {
  createManualDocumentSchema,
  type ManualDocumentForm,
  type ManualDocumentInput,
} from "../schemas/knowledge-schema";

interface TextInputDialogProps {
  error?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ManualDocumentForm) => Promise<void>;
  open: boolean;
}

export function TextInputDialog({
  error,
  isSubmitting,
  onClose,
  onSubmit,
  open,
}: TextInputDialogProps) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      createManualDocumentSchema({
        contentRequired: t("KNOWLEDGE.VALIDATION_CONTENT_REQUIRED"),
        descriptionMax: t("KNOWLEDGE.VALIDATION_DESCRIPTION_MAX"),
        titleMax: t("KNOWLEDGE.VALIDATION_TITLE_MAX"),
        titleRequired: t("KNOWLEDGE.VALIDATION_TITLE_REQUIRED"),
      }),
    [t],
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ManualDocumentInput, unknown, ManualDocumentForm>({
    defaultValues: { content_text: "", description: "", title: "" },
    resolver: zodResolver(schema),
  });
  const resetAndClose = () => {
    reset();
    onClose();
  };
  const requestClose = () => {
    if (isSubmitting) return;
    resetAndClose();
  };
  const submit = handleSubmit(async (payload) => {
    try {
      await onSubmit(payload);
      resetAndClose();
    } catch {
      /* Mutation state keeps the dialog open with a safe error. */
    }
  });

  return (
    <Dialog
      closeLabel={t("SHELL.CLOSE_DIALOG")}
      description={t("KNOWLEDGE.MANUAL_DESCRIPTION")}
      dismissible={!isSubmitting}
      onClose={requestClose}
      open={open}
      title={t("KNOWLEDGE.ADD_TEXT")}
    >
      <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
        <Input
          error={errors.title?.message}
          disabled={isSubmitting}
          label={t("KNOWLEDGE.DOCUMENT_TITLE_LABEL")}
          {...register("title")}
        />
        <Input
          error={errors.description?.message}
          disabled={isSubmitting}
          label={t("KNOWLEDGE.DESCRIPTION_LABEL")}
          {...register("description")}
        />
        <div className="grid gap-2">
          <label className="font-semibold text-ui-ink" htmlFor="manual-content">
            {t("KNOWLEDGE.CONTENT_LABEL")}
          </label>
          <textarea
            aria-describedby={errors.content_text ? "manual-content-error" : undefined}
            aria-invalid={Boolean(errors.content_text)}
            className="min-h-44 resize-y rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong motion-reduce:transition-none"
            disabled={isSubmitting}
            id="manual-content"
            {...register("content_text")}
          />
          {errors.content_text ? (
            <p className="text-sm text-state-danger" id="manual-content-error">
              {errors.content_text.message}
            </p>
          ) : null}
        </div>
        {error ? <p className="text-state-danger" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button disabled={isSubmitting} onClick={requestClose} type="button" variant="secondary">{t("KNOWLEDGE.CANCEL")}</Button>
          <Button isLoading={isSubmitting} loadingText={t("KNOWLEDGE.SAVING_CONTENT")} type="submit">
            {t("KNOWLEDGE.SAVE_CONTENT")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
