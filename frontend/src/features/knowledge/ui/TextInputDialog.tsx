import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import { Textarea } from "../../../shared/ui/Textarea";
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

const footerButtonClassName =
  "!h-8 !min-h-8 rounded-ui-control !px-3.5 text-[13px] shadow-sm";


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
      layout="composer"
      onClose={requestClose}
      open={open}
      size="xl"
      title={t("KNOWLEDGE.ADD_TEXT")}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="grid gap-6">
            <Input
              density="compact"
              disabled={isSubmitting}
              error={errors.title?.message}
              id="manual-title"
              label={t("KNOWLEDGE.COMPOSER_TITLE_LABEL")}
              {...register("title")}
            />
            <Input
              density="compact"
              disabled={isSubmitting}
              error={errors.description?.message}
              id="manual-description"
              label={t("KNOWLEDGE.COMPOSER_DESCRIPTION_LABEL")}
              optionalHint={t("KNOWLEDGE.OPTIONAL_HINT")}
              placeholder={t("KNOWLEDGE.DESCRIPTION_PLACEHOLDER")}
              {...register("description")}
            />
            <Textarea
              disabled={isSubmitting}
              error={errors.content_text?.message}
              id="manual-content"
              label={t("KNOWLEDGE.CONTENT_LABEL")}
              placeholder={t("KNOWLEDGE.CONTENT_PLACEHOLDER")}
              {...register("content_text")}
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="sticky bottom-0 flex shrink-0 items-center justify-end gap-3 border-t border-border/50 bg-secondary/30 px-6 py-4">
          <Button
            className={footerButtonClassName}
            disabled={isSubmitting}
            onClick={requestClose}
            type="button"
            variant="secondary"
          >
            {t("KNOWLEDGE.CANCEL")}
          </Button>
          <Button
            className={footerButtonClassName}
            isLoading={isSubmitting}
            loadingText={t("KNOWLEDGE.SAVING_CONTENT")}
            type="submit"
          >
            {t("KNOWLEDGE.SAVE_CONTENT")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
