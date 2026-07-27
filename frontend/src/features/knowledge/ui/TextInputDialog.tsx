import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import {
  manualDocumentSchema,
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
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ManualDocumentInput, unknown, ManualDocumentForm>({
    defaultValues: { content_text: "", description: "", title: "" },
    resolver: zodResolver(manualDocumentSchema),
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
      description={t("KNOWLEDGE.MANUAL_DESCRIPTION")}
      onClose={close}
      open={open}
      title={t("KNOWLEDGE.ADD_TEXT")}
    >
      <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
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
        <div className="grid gap-2">
          <label className="font-semibold text-ui-ink" htmlFor="manual-content">
            Content
          </label>
          <textarea
            aria-describedby={errors.content_text ? "manual-content-error" : undefined}
            aria-invalid={Boolean(errors.content_text)}
            className="min-h-44 resize-y rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong motion-reduce:transition-none"
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
          <Button onClick={close} type="button" variant="secondary">Cancel</Button>
          <Button isLoading={isSubmitting} loadingText="Saving content" type="submit">
            Save content
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
