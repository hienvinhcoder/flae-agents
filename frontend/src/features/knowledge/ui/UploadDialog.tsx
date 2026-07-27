import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import {
  uploadDocumentSchema,
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
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<UploadDocumentInput, unknown, UploadDocumentForm>({
    defaultValues: { description: "", title: "" },
    resolver: zodResolver(uploadDocumentSchema),
  });
  const close = () => {
    reset();
    onClose();
  };
  const submit = handleSubmit(async (payload) => {
    try {
      await onSubmit(payload);
      close();
    } catch {
      /* Mutation state keeps the dialog open with a safe error. */
    }
  });

  return (
    <Dialog
      description={t("KNOWLEDGE.UPLOAD_DESCRIPTION")}
      onClose={close}
      open={open}
      title={t("KNOWLEDGE.UPLOAD_FILE")}
    >
      <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
        <Controller
          control={control}
          name="file"
          render={({ field: { onChange, ref } }) => (
            <div className="grid gap-2">
              <label className="font-semibold text-ui-ink" htmlFor="knowledge-file">
                Document file
              </label>
              <input
                accept=".pdf,.md,.txt"
                aria-describedby={errors.file ? "knowledge-file-error" : undefined}
                aria-invalid={Boolean(errors.file)}
                className="min-h-11 rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 file:mr-3 file:rounded-ui-control file:border-0 file:bg-ui-interactive file:px-3 file:py-1 hover:border-ui-line-strong motion-reduce:transition-none"
                id="knowledge-file"
                onChange={(event) => onChange(event.target.files?.[0])}
                ref={ref}
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
          label="Document title"
          {...register("title")}
        />
        <Input
          error={errors.description?.message}
          label="Description"
          {...register("description")}
        />
        {error ? <p className="text-state-danger" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button onClick={close} type="button" variant="secondary">Cancel</Button>
          <Button isLoading={isSubmitting} loadingText="Uploading" type="submit">
            Upload
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
