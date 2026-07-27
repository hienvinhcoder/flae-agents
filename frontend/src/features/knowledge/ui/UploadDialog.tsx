import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import {
  createUploadDocumentSchema,
  type UploadDocumentForm,
  type UploadDocumentInput,
} from "../schemas/knowledge-schema";

interface UploadDialogProps {
  error?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: UploadDocumentForm) => Promise<void>;
  open: boolean;
}

export function UploadDialog({
  error,
  isSubmitting,
  onClose,
  onSubmit,
  open,
}: UploadDialogProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const schema = useMemo(
    () =>
      createUploadDocumentSchema({
        descriptionMax: t("KNOWLEDGE.VALIDATION_DESCRIPTION_MAX"),
        fileMaxSize: t("KNOWLEDGE.VALIDATION_MAX_SIZE"),
        fileRequired: t("KNOWLEDGE.VALIDATION_SELECT_DOCUMENT"),
        fileUnsupported: t("KNOWLEDGE.VALIDATION_UNSUPPORTED_TYPE"),
        titleMax: t("KNOWLEDGE.VALIDATION_TITLE_MAX"),
        titleRequired: t("KNOWLEDGE.VALIDATION_TITLE_REQUIRED"),
      }),
    [t],
  );
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<UploadDocumentInput, unknown, UploadDocumentForm>({
    defaultValues: { description: "", title: "" },
    resolver: zodResolver(schema),
  });
  const resetAndClose = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    reset();
    onClose();
  };
  const requestClose = () => {
    if (isSubmitting) return;
    resetAndClose();
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(async (payload) => {
      try {
        await onSubmit(payload);
        resetAndClose();
      } catch {
        /* Mutation state keeps the dialog open with a safe error. */
      }
    })(event);
  };

  return (
    <Dialog
      closeLabel={t("SHELL.CLOSE_DIALOG")}
      description={t("KNOWLEDGE.UPLOAD_DESCRIPTION")}
      dismissible={!isSubmitting}
      onClose={requestClose}
      open={open}
      title={t("KNOWLEDGE.UPLOAD_FILE")}
    >
      <form
        className="grid gap-5"
        noValidate
        onSubmit={submit}
      >
        <Controller
          control={control}
          name="file"
          render={({ field: { onChange, ref } }) => (
            <div className="grid gap-2">
              <label className="font-semibold text-ui-ink" htmlFor="knowledge-file">
                {t("KNOWLEDGE.DOCUMENT_FILE_LABEL")}
              </label>
              <input
                accept=".pdf,.md,.txt"
                aria-describedby={errors.file ? "knowledge-file-error" : undefined}
                aria-invalid={Boolean(errors.file)}
                className="min-h-11 rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 file:mr-3 file:rounded-ui-control file:border-0 file:bg-ui-interactive file:px-3 file:py-1 hover:border-ui-line-strong motion-reduce:transition-none"
                disabled={isSubmitting}
                id="knowledge-file"
                onChange={(event) => onChange(event.target.files?.[0])}
                ref={(element) => {
                  fileInputRef.current = element;
                  ref(element);
                }}
                type="file"
              />
              {errors.file ? (
                <p className="text-sm text-state-danger" id="knowledge-file-error">
                  {errors.file.message}
                </p>
              ) : null}
            </div>
          )}
        />
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
        {error ? <p className="text-state-danger" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button disabled={isSubmitting} onClick={requestClose} type="button" variant="secondary">{t("KNOWLEDGE.CANCEL")}</Button>
          <Button isLoading={isSubmitting} loadingText={t("KNOWLEDGE.UPLOADING")} type="submit">
            {t("KNOWLEDGE.UPLOAD_ACTION")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
