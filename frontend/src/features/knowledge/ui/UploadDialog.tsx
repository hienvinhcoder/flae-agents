import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, type FormEvent } from "react";
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
import { FileDropzone } from "./FileDropzone";

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
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<UploadDocumentInput, unknown, UploadDocumentForm>({
    defaultValues: { description: "", title: "" },
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
          render={({ field: { onChange, value, name } }) => (
            <FileDropzone
              accept=".pdf,.md,.txt"
              browseLabel={t('KNOWLEDGE.DROPZONE_BROWSE')}
              clearLabel={t('KNOWLEDGE.FILE_CHIP_CLEAR')}
              disabled={isSubmitting}
              dropLabel={t('KNOWLEDGE.DROPZONE_TITLE')}
              error={errors.file?.message}
              file={value}
              id="knowledge-file"
              label={t('KNOWLEDGE.DOCUMENT_FILE_LABEL')}
              name={name}
              onClear={() => {
                onChange(undefined);
              }}
              onFileChange={(file) => {
                onChange(file);
                if (file && !getValues('title').trim()) {
                  const autofilledTitle = file.name.replace(/\.[^.]+$/, '');
                  setValue('title', autofilledTitle, { shouldValidate: true });
                }
              }}
              typesLabel={t('KNOWLEDGE.DROPZONE_TYPES')}
            />
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
        {isSubmitting ? (
          <p className="text-muted-foreground text-sm">{t('KNOWLEDGE.UPLOAD_PROGRESS')}</p>
        ) : null}
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
