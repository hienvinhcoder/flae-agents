import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Select } from "../../../shared/ui/Select";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useAgentActions, useAgentDetail, useCurrentWorkspaceRole } from "../hooks/use-agents";
import { agentCreateSchema } from "../schemas/agent-schema";
import type { AgentCreatePayload, AgentUpdatePayload } from "../types/agent";

const DEFAULT_VALUES: AgentCreatePayload = {
  avatar_color: "bg-indigo-500",
  avatar_icon: "bot",
  is_default: false,
  model_name: "gemini-2.5-flash",
  name: "",
  system_prompt: "",
  temperature: 0.2,
};

const COLOR_OPTIONS = [
  { label: "Indigo", value: "bg-indigo-500" },
  { label: "Emerald", value: "bg-emerald-500" },
  { label: "Rose", value: "bg-rose-500" },
  { label: "Amber", value: "bg-amber-500" },
  { label: "Sky", value: "bg-sky-500" },
  { label: "Purple", value: "bg-purple-500" },
];
const ICON_OPTIONS = ["bot", "brain", "sparkles", "database", "terminal", "briefcase"].map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));
const MODEL_OPTIONS = [
  { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
  { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AgentConfigPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const userUid = useAuthStore((state) => state.user?.firebase_uid ?? null);
  const roleQuery = useCurrentWorkspaceRole(workspaceId, userUid);
  const detailQuery = useAgentDetail(workspaceId, agentId ?? null);
  const actions = useAgentActions(workspaceId, agentId ?? null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(agentId);
  const form = useForm<AgentCreatePayload>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(agentCreateSchema),
  });
  const temperature = useWatch({ control: form.control, name: "temperature" });

  useEffect(() => {
    if (!workspaceId || !userUid || roleQuery.isError) {
      void navigate("/dashboard/agents", { replace: true });
      return;
    }
    if (roleQuery.data && roleQuery.data !== "owner" && roleQuery.data !== "admin") {
      void navigate("/dashboard/agents", { replace: true });
    }
  }, [navigate, roleQuery.data, roleQuery.isError, userUid, workspaceId]);

  useEffect(() => {
    if (detailQuery.isError) void navigate("/dashboard/agents", { replace: true });
  }, [detailQuery.isError, navigate]);

  useEffect(() => {
    if (!detailQuery.data) return;
    form.reset({
      avatar_color: detailQuery.data.avatar_color,
      avatar_icon: detailQuery.data.avatar_icon,
      is_default: detailQuery.data.is_default,
      model_name: detailQuery.data.model_name || "gemini-2.5-flash",
      name: detailQuery.data.name,
      system_prompt: detailQuery.data.system_prompt,
      temperature: detailQuery.data.temperature ?? 0.2,
    });
  }, [detailQuery.data, form]);

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (isEdit) {
        const dirty = form.formState.dirtyFields;
        const payload: AgentUpdatePayload = {};
        if (dirty.avatar_color) payload.avatar_color = values.avatar_color;
        if (dirty.avatar_icon) payload.avatar_icon = values.avatar_icon;
        if (dirty.model_name) payload.model_name = values.model_name;
        if (dirty.name) payload.name = values.name;
        if (dirty.system_prompt) payload.system_prompt = values.system_prompt;
        if (dirty.temperature) payload.temperature = values.temperature;
        await actions.update.mutateAsync(payload);
      } else {
        await actions.create.mutateAsync(values);
      }
      void navigate("/dashboard/agents");
    } catch (error) {
      setSubmitError(errorMessage(error, isEdit ? "Unable to save agent." : "Unable to create agent."));
    }
  });
  const isSaving = actions.create.isPending || actions.update.isPending;

  if (isEdit && detailQuery.isPending) {
    return <section className="surface-panel mx-auto max-w-3xl p-7"><Skeleton label="Loading agent configuration" lines={8} /></section>;
  }

  return (
    <section aria-labelledby="agent-config-title" className="mx-auto w-full max-w-3xl">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-ui-ink-secondary hover:text-ui-ink" to="/dashboard/agents">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        AI agents
      </Link>
      <div className="surface-panel mt-5 p-6 sm:p-8">
        <p className="text-metadata">Agent configuration</p>
        <h1 className="mt-2 text-2xl font-bold text-ui-ink" id="agent-config-title">
          {isEdit ? "Edit AI agent" : "Create AI agent"}
        </h1>
        <p className="mt-2 text-ui-ink-secondary">Define the assistant's identity, instructions, model, and response style.</p>

        <form className="mt-8 grid gap-6" onSubmit={(event) => void submit(event)}>
          <Input
            error={form.formState.errors.name?.message}
            label="Agent name"
            placeholder="Operations guide"
            {...form.register("name")}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select error={form.formState.errors.avatar_color?.message} label="Avatar color" options={COLOR_OPTIONS} {...form.register("avatar_color")} />
            <Select error={form.formState.errors.avatar_icon?.message} label="Avatar icon" options={ICON_OPTIONS} {...form.register("avatar_icon")} />
          </div>
          <div className="grid gap-2">
            <label className="font-semibold text-ui-ink" htmlFor="agent-system-prompt">System prompt</label>
            <textarea
              aria-describedby={form.formState.errors.system_prompt ? "agent-system-prompt-error" : undefined}
              aria-invalid={Boolean(form.formState.errors.system_prompt)}
              className="min-h-40 w-full resize-y rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink placeholder:text-ui-ink-muted hover:border-ui-line-strong"
              id="agent-system-prompt"
              placeholder="Describe the agent's role, boundaries, and expected answers."
              {...form.register("system_prompt")}
            />
            {form.formState.errors.system_prompt ? <p className="text-sm text-state-danger" id="agent-system-prompt-error">{form.formState.errors.system_prompt.message}</p> : null}
          </div>
          <div className="rounded-ui-panel border border-ui-line bg-ui-interactive p-5">
            <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
              <Select error={form.formState.errors.model_name?.message} label="AI model" options={MODEL_OPTIONS} {...form.register("model_name")} />
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="font-semibold text-ui-ink" htmlFor="agent-temperature">Temperature</label>
                  <output className="rounded-full bg-ui-raised px-2 py-1 text-xs font-bold text-state-info" htmlFor="agent-temperature">
                    {temperature}
                  </output>
                </div>
                <input className="min-h-11 w-full accent-[var(--color-primary)]" id="agent-temperature" max="2" min="0" step="0.1" type="range" {...form.register("temperature", { valueAsNumber: true })} />
                <p className="text-xs text-ui-ink-muted">Lower is precise; higher is more exploratory.</p>
              </div>
            </div>
          </div>
          {submitError ? <p className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-sm text-state-danger" role="alert">{submitError}</p> : null}
          <div className="flex flex-col-reverse gap-3 border-t border-ui-line pt-5 sm:flex-row sm:justify-end">
            <Link className="inline-flex min-h-10 items-center justify-center rounded-ui-control border border-ui-line bg-ui-raised px-4 py-2 font-semibold text-ui-ink" to="/dashboard/agents">Cancel</Link>
            <Button isLoading={isSaving} loadingText={isEdit ? "Saving changes" : "Creating agent"} type="submit">
              <Save aria-hidden className="h-4 w-4" />
              {isEdit ? "Save changes" : "Create agent"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
