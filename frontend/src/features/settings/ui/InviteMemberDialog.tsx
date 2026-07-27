import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import { Select } from "../../../shared/ui/Select";
import {
  createInviteMemberFormSchema,
  type InviteMemberForm,
} from "../schemas/workspace-schema";

interface InviteMemberDialogProps {
  announceError?: boolean;
  error?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: InviteMemberForm) => Promise<void>;
  open: boolean;
}

export function InviteMemberDialog({
  announceError = true,
  error,
  isSubmitting,
  onClose,
  onSubmit,
  open,
}: InviteMemberDialogProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const validationSchema = useMemo(
    () =>
      createInviteMemberFormSchema({
        emailInvalid: t("SETTINGS_VALIDATION.EMAIL_INVALID"),
      }),
    [t],
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    trigger,
  } = useForm<InviteMemberForm>({
    defaultValues: { email: "", role: "member" },
    resolver: zodResolver(validationSchema),
  });
  useEffect(() => {
    if (Object.keys(errors).length > 0) void trigger();
  }, [errors, locale, trigger]);
  const close = () => {
    reset();
    onClose();
  };
  const submit = handleSubmit(async (payload) => {
    try {
      await onSubmit(payload);
    } catch {
      /* Mutation state keeps the dialog open with an error. */
    }
  });

  return (
    <Dialog
      closeLabel={t("SETTINGS_UI.CANCEL")}
      description={t("SETTINGS_UI.INVITE_DESCRIPTION")}
      onClose={close}
      open={open}
      title={t("SETTINGS_UI.INVITE_TITLE")}
    >
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <Input
          autoComplete="email"
          error={errors.email?.message}
          label={t("SETTINGS_UI.EMAIL")}
          type="email"
          {...register("email")}
        />
        <Select
          error={errors.role?.message}
          label={t("SETTINGS_UI.ROLE_LABEL")}
          options={[
            { label: t("SETTINGS_UI.ROLE_ADMIN"), value: "admin" },
            { label: t("SETTINGS_UI.ROLE_MEMBER"), value: "member" },
            { label: t("SETTINGS_UI.ROLE_VIEWER"), value: "viewer" },
          ]}
          {...register("role")}
        />
        {error ? (
          <p
            className="text-state-danger"
            role={announceError ? "alert" : undefined}
          >
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button onClick={close} type="button" variant="secondary">
            {t("SETTINGS_UI.CANCEL")}
          </Button>
          <Button
            isLoading={isSubmitting}
            loadingText={t("SETTINGS_UI.SENDING_INVITE")}
            type="submit"
          >
            {t("SETTINGS_UI.SEND_INVITE")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
