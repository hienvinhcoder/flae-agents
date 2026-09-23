import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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

const TYPE_CHIPS = ["PDF", "MD", "TXT"] as const;

const footerButtonClassName =
  "!h-8 !min-h-8 rounded-ui-control !px-3.5 text-[13px] shadow-sm";


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
      description={t("KNOWLEDGE.UPLOAD_COMPOSER_DESCRIPTION")}
      dismissible={!isSubmitting}
      layout="composer"
      onClose={requestClose}
      open={open}
      size="xl"
      title={t("KNOWLEDGE.UPLOAD_FILE")}
    >
      <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={submit}>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="grid gap-6">
            <Controller
              control={control}
              name="file"
              render={({ field: { onChange, value, name } }) => (
                <FileDropzone
                  accept=".pdf,.md,.txt"
                  clearLabel={t("KNOWLEDGE.FILE_CHIP_CLEAR")}
                  disabled={isSubmitting}
                  dropLabel={t("KNOWLEDGE.DROPZONE_TITLE")}
                  error={errors.file?.message}
                  file={value}
                  id="knowledge-file"
                  label={t("KNOWLEDGE.DOCUMENT_FILE_LABEL")}
                  maxSizeLabel={t("KNOWLEDGE.DROPZONE_MAX_SIZE")}
                  name={name}
                  onClear={() => onChange(undefined)}
                  onFileChange={(nextFile) => {
                    onChange(nextFile);
                    if (nextFile && !getValues("title").trim()) {
                      setValue("title", nextFile.name.replace(/\.[^.]+$/, ""), {
                        shouldValidate: true,
                      });
                    }
                  }}
                  typeChips={TYPE_CHIPS}
                />
              )}
            />
            <div className="grid gap-4">
              <Input
                density="compact"
                disabled={isSubmitting}
                error={errors.title?.message}
                id="knowledge-upload-title"
                label={t("KNOWLEDGE.COMPOSER_TITLE_LABEL")}
                {...register("title")}
              />
              <Input
                density="compact"
                disabled={isSubmitting}
                error={errors.description?.message}
                id="knowledge-upload-description"
                label={t("KNOWLEDGE.COMPOSER_DESCRIPTION_LABEL")}
                optionalHint={t("KNOWLEDGE.OPTIONAL_HINT")}
                placeholder={t("KNOWLEDGE.DESCRIPTION_PLACEHOLDER")}
                {...register("description")}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 flex shrink-0 items-center justify-end gap-3 border-t border-border/50 bg-secondary/30 px-6 py-4">
          {isSubmitting ? (
            <div
              aria-live="polite"
              className="mr-auto flex min-w-0 flex-1 items-center gap-3"
              role="status"
            >
              <Loader2
                aria-hidden
                className="h-4 w-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
              />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-[45%] rounded-full bg-primary" />
              </div>
              <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                {t("KNOWLEDGE.UPLOAD_PROGRESS")}
              </span>
            </div>
          ) : null}
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
            loadingText={t("KNOWLEDGE.UPLOADING")}
            type="submit"
          >
            {t("KNOWLEDGE.UPLOAD_COMPOSER_ACTION")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
