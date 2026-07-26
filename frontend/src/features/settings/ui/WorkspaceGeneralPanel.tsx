import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import {
  workspaceNameFormSchema,
  type WorkspaceNameForm,
} from "../schemas/workspace-schema";
import type { Workspace } from "../types/workspace";

interface WorkspaceGeneralPanelProps {
  createMode: boolean;
  error?: string;
  isSaving: boolean;
  onCancelCreate: () => void;
  onSave: (payload: WorkspaceNameForm) => Promise<void>;
  workspace: Workspace | null;
}

export function WorkspaceGeneralPanel({
  createMode,
  error,
  isSaving,
  onCancelCreate,
  onSave,
  workspace,
}: WorkspaceGeneralPanelProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<WorkspaceNameForm>({
    defaultValues: { name: createMode ? "" : (workspace?.name ?? "") },
    resolver: zodResolver(workspaceNameFormSchema),
  });

  useEffect(
    () => reset({ name: createMode ? "" : (workspace?.name ?? "") }),
    [createMode, reset, workspace],
  );
  const submit = handleSubmit(async (payload) => {
    try {
      await onSave(payload);
    } catch {
      /* Mutation state renders the retryable error. */
    }
  });

  if (!createMode && !workspace) {
    return (
      <p className="surface-panel p-6 text-ui-ink-secondary">
        Select a workspace before editing its settings.
      </p>
    );
  }

  return (
    <form
      className="surface-panel grid gap-5 p-6"
      onSubmit={(event) => void submit(event)}
    >
      <div>
        <h2 className="text-xl font-semibold text-ui-ink">
          {createMode ? "Create workspace" : "General information"}
        </h2>
        <p className="mt-1 text-ui-ink-secondary">
          Use a clear name your team will recognize.
        </p>
      </div>
      <Input
        autoComplete="organization"
        error={errors.name?.message}
        label="Workspace name"
        {...register("name")}
      />
      {error ? (
        <p className="text-state-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          isLoading={isSaving}
          loadingText="Saving workspace"
          type="submit"
        >
          Save workspace
        </Button>
        {createMode ? (
          <Button onClick={onCancelCreate} type="button" variant="secondary">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
