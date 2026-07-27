import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import {
  createWorkspaceNameFormSchema,
  type WorkspaceNameForm,
} from "../schemas/workspace-schema";
import type { Workspace } from "../types/workspace";

interface WorkspaceGeneralPanelProps {
  announceError?: boolean;
  createMode: boolean;
  error?: string;
  isSaving: boolean;
  onCancelCreate: () => void;
  onSave: (payload: WorkspaceNameForm) => Promise<void>;
  workspace: Workspace | null;
}

export function WorkspaceGeneralPanel({
  announceError = true,
  createMode,
  error,
  isSaving,
  onCancelCreate,
  onSave,
  workspace,
}: WorkspaceGeneralPanelProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const validationSchema = useMemo(
    () =>
      createWorkspaceNameFormSchema({
        workspaceNameMax: t("SETTINGS_VALIDATION.WORKSPACE_NAME_MAX"),
        workspaceNameMin: t("SETTINGS_VALIDATION.WORKSPACE_NAME_MIN"),
      }),
    [t],
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    trigger,
  } = useForm<WorkspaceNameForm>({
    defaultValues: { name: createMode ? "" : (workspace?.name ?? "") },
    resolver: zodResolver(validationSchema),
  });

  useEffect(
    () => reset({ name: createMode ? "" : (workspace?.name ?? "") }),
    [createMode, reset, workspace],
  );
  useEffect(() => {
    if (Object.keys(errors).length > 0) void trigger();
  }, [errors, locale, trigger]);
  const submit = handleSubmit(async (payload) => {
    try {
      await onSave(payload);
    } catch {
      /* Mutation state renders the retryable error. */
    }
  });

  if (!createMode && !workspace) {
    return (
      <p className="border-y border-ui-divider bg-ui-raised/45 p-6 text-ui-ink-secondary">
        {t("SETTINGS_UI.SELECT_WORKSPACE")}
      </p>
    );
  }

  return (
    <form
      className="grid gap-5 border-t border-ui-divider pt-6"
      onSubmit={(event) => void submit(event)}
    >
      <div>
        <h2 className="text-xl font-semibold text-ui-ink">
          {t(
            createMode
              ? "SETTINGS_UI.CREATE_WORKSPACE"
              : "SETTINGS_UI.GENERAL_INFORMATION",
          )}
        </h2>
        <p className="mt-1 text-ui-ink-secondary">
          {t("SETTINGS_UI.GENERAL_DESCRIPTION")}
        </p>
      </div>
      <Input
        autoComplete="organization"
        error={errors.name?.message}
        label={t("SETTINGS_UI.WORKSPACE_NAME")}
        {...register("name")}
      />
      {error ? (
        <p
          className="text-state-danger"
          role={announceError ? "alert" : undefined}
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          isLoading={isSaving}
          loadingText={t("SETTINGS_UI.SAVING_WORKSPACE")}
          type="submit"
        >
          {t("SETTINGS_UI.SAVE_WORKSPACE")}
        </Button>
        {createMode ? (
          <Button onClick={onCancelCreate} type="button" variant="secondary">
            {t("SETTINGS_UI.CANCEL")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
