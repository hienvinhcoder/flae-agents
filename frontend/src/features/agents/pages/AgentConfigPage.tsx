import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../../core/stores/auth-store";
import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { Select } from "../../../shared/ui/Select";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useAgentActions, useAgentDetail, useCurrentWorkspaceRole } from "../hooks/use-agents";
import { agentCreateSchema } from "../schemas/agent-schema";
import type { AgentCreatePayload, AgentUpdatePayload } from "../types/agent";
import { AgentAppearancePreview } from "../ui/agent-appearance";

const DEFAULT_VALUES: AgentCreatePayload = {
  avatar_color: "bg-indigo-500",
  avatar_icon: "bot",
  is_default: false,
  model_name: "gemini-2.5-flash",
  name: "",
  system_prompt: "",
  temperature: 0.2,
};

const COLOR_OPTION_DEFINITIONS = [
  { labelKey: "AGENT_APPEARANCE.COLOR_INDIGO", value: "bg-indigo-500" },
  { labelKey: "AGENT_APPEARANCE.COLOR_EMERALD", value: "bg-emerald-500" },
  { labelKey: "AGENT_APPEARANCE.COLOR_ROSE", value: "bg-rose-500" },
  { labelKey: "AGENT_APPEARANCE.COLOR_AMBER", value: "bg-amber-500" },
  { labelKey: "AGENT_APPEARANCE.COLOR_SKY", value: "bg-sky-500" },
  { labelKey: "AGENT_APPEARANCE.COLOR_PURPLE", value: "bg-purple-500" },
] as const;
const ICON_OPTION_DEFINITIONS = [
  { labelKey: "AGENT_APPEARANCE.ICON_BOT", value: "bot" },
  { labelKey: "AGENT_APPEARANCE.ICON_BRAIN", value: "brain" },
  { labelKey: "AGENT_APPEARANCE.ICON_SPARKLES", value: "sparkles" },
  { labelKey: "AGENT_APPEARANCE.ICON_DATABASE", value: "database" },
  { labelKey: "AGENT_APPEARANCE.ICON_TERMINAL", value: "terminal" },
  { labelKey: "AGENT_APPEARANCE.ICON_BRIEFCASE", value: "briefcase" },
] as const;
const MODEL_OPTIONS = [
  { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
  { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
];

export function AgentConfigPage() {
  const { t } = useTranslation();
  const colorOptions = COLOR_OPTION_DEFINITIONS.map(({ labelKey, value }) => ({ label: t(labelKey), value }));
  const iconOptions = ICON_OPTION_DEFINITIONS.map(({ labelKey, value }) => ({ label: t(labelKey), value }));
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
  const avatarColor = useWatch({ control: form.control, name: "avatar_color" });
  const avatarIcon = useWatch({ control: form.control, name: "avatar_icon" });
  const avatarColorLabel = colorOptions.find((option) => option.value === avatarColor)?.label ?? avatarColor;
  const avatarIconLabel = iconOptions.find((option) => option.value === avatarIcon)?.label ?? avatarIcon;

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
    } catch {
      setSubmitError(t(isEdit ? "AGENT_CONFIG.SAVE_ERROR" : "AGENT_CONFIG.CREATE_ERROR"));
    }
  });
  const isSaving = actions.create.isPending || actions.update.isPending;

  if (isEdit && detailQuery.isPending) {
    return (
      <section className="mx-auto w-full max-w-5xl">
        <Skeleton label={t("AGENT_CONFIG.LOADING")} lines={8} />
      </section>
    );
  }

  return (
    <section aria-labelledby="agent-config-title" className="mx-auto grid w-full max-w-5xl gap-6">
      <Link
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-ui-control px-1 text-sm font-semibold text-ui-ink-secondary transition-colors duration-200 hover:text-ui-ink motion-reduce:transition-none"
        to="/dashboard/agents"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t("AGENT_CONFIG.BACK_TO_AGENTS")}
      </Link>
      <PageHeader
        description={t("AGENT_CONFIG.DESCRIPTION")}
        eyebrow={t("AGENT_CONFIG.EYEBROW")}
        title={t(isEdit ? "AGENT_CONFIG.EDIT_TITLE" : "AGENT_CONFIG.CREATE_TITLE")}
        titleId="agent-config-title"
      />

      <form className="grid gap-6" onSubmit={(event) => void submit(event)}>
        <section aria-labelledby="agent-identity-title" className="border-t border-ui-divider pt-6">
          <h2 className="text-xl font-semibold text-ui-ink" id="agent-identity-title">
            {t("AGENT_CONFIG.IDENTITY_SECTION")}
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid gap-5">
              <Input
                error={form.formState.errors.name?.message}
                label={t("AGENT_CONFIG.NAME")}
                placeholder={t("AGENT_CONFIG.NAME_PLACEHOLDER")}
                {...form.register("name")}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Select
                  error={form.formState.errors.avatar_color?.message}
                  label={t("AGENT_CONFIG.AVATAR_COLOR")}
                  options={colorOptions}
                  {...form.register("avatar_color")}
                />
                <Select
                  error={form.formState.errors.avatar_icon?.message}
                  label={t("AGENT_CONFIG.AVATAR_ICON")}
                  options={iconOptions}
                  {...form.register("avatar_icon")}
                />
              </div>
            </div>
            <AgentAppearancePreview
              color={avatarColor}
              colorLabel={t("AGENT_CONFIG.AVATAR_COLOR")}
              colorValue={avatarColorLabel}
              icon={avatarIcon}
              iconLabel={t("AGENT_CONFIG.AVATAR_ICON")}
              iconValue={avatarIconLabel}
            />
          </div>
        </section>

        <section aria-labelledby="agent-instructions-title" className="border-t border-ui-divider pt-6">
          <h2 className="text-xl font-semibold text-ui-ink" id="agent-instructions-title">
            {t("AGENT_CONFIG.INSTRUCTIONS_SECTION")}
          </h2>
          <div className="mt-5 grid gap-2">
            <label className="font-semibold text-ui-ink" htmlFor="agent-system-prompt">
              {t("AGENT_CONFIG.SYSTEM_PROMPT")}
            </label>
            <textarea
              aria-describedby={form.formState.errors.system_prompt ? "agent-system-prompt-error" : undefined}
              aria-invalid={Boolean(form.formState.errors.system_prompt)}
              className="min-h-40 w-full resize-y rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong motion-reduce:transition-none"
              id="agent-system-prompt"
              placeholder={t("AGENT_CONFIG.SYSTEM_PROMPT_PLACEHOLDER")}
              {...form.register("system_prompt")}
            />
            {form.formState.errors.system_prompt ? (
              <p className="text-sm text-state-danger" id="agent-system-prompt-error">
                {form.formState.errors.system_prompt.message}
              </p>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="agent-model-title" className="border-t border-ui-divider pt-6">
          <h2 className="text-xl font-semibold text-ui-ink" id="agent-model-title">
            {t("AGENT_CONFIG.MODEL_SECTION")}
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:items-start">
            <Select
              error={form.formState.errors.model_name?.message}
              hint={t("AGENT_CONFIG.MODEL_HINT")}
              label={t("AGENT_CONFIG.AI_MODEL")}
              options={MODEL_OPTIONS}
              {...form.register("model_name")}
            />
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <label className="font-semibold text-ui-ink" htmlFor="agent-temperature">
                  {t("AGENT_CONFIG.TEMPERATURE")}
                </label>
                <output className="rounded-full bg-ui-interactive px-2 py-1 text-xs font-bold text-state-info" htmlFor="agent-temperature">
                  {temperature}
                </output>
              </div>
              <input
                aria-describedby="agent-temperature-hint"
                className="min-h-11 w-full accent-[var(--color-primary)]"
                id="agent-temperature"
                max="2"
                min="0"
                step="0.1"
                type="range"
                {...form.register("temperature", { valueAsNumber: true })}
              />
              <p className="text-sm text-ui-ink-muted" id="agent-temperature-hint">
                {t("AGENT_CONFIG.TEMPERATURE_HINT")}
              </p>
            </div>
          </div>
        </section>

        {submitError ? (
          <p className="rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-sm text-state-danger" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="sticky bottom-3 flex flex-wrap items-center justify-end gap-3 rounded-ui-control border border-ui-line bg-ui-raised/95 p-3 shadow-ui-panel">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-ui-control border border-ui-line bg-ui-raised px-4 py-2 font-semibold text-ui-ink transition-colors duration-200 hover:bg-ui-interactive motion-reduce:transition-none"
            to="/dashboard/agents"
          >
            {t("AGENT_CONFIG.CANCEL")}
          </Link>
          <Button
            isLoading={isSaving}
            loadingText={t(isEdit ? "AGENT_CONFIG.SAVING" : "AGENT_CONFIG.CREATING")}
            type="submit"
          >
            <Save aria-hidden className="h-4 w-4" />
            {t(isEdit ? "AGENT_CONFIG.SAVE" : "AGENT_CONFIG.CREATE")}
          </Button>
        </div>
      </form>
    </section>
  );
}
