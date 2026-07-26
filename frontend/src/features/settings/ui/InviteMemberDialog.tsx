import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import { Select } from "../../../shared/ui/Select";
import {
  inviteMemberFormSchema,
  type InviteMemberForm,
} from "../schemas/workspace-schema";

interface InviteMemberDialogProps {
  error?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: InviteMemberForm) => Promise<void>;
  open: boolean;
}

export function InviteMemberDialog({
  error,
  isSubmitting,
  onClose,
  onSubmit,
  open,
}: InviteMemberDialogProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<InviteMemberForm>({
    defaultValues: { email: "", role: "member" },
    resolver: zodResolver(inviteMemberFormSchema),
  });
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
      description="Send a workspace invitation with the appropriate access level."
      onClose={close}
      open={open}
      title="Invite member"
    >
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <Input
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          type="email"
          {...register("email")}
        />
        <Select
          error={errors.role?.message}
          label="Role"
          options={[
            { label: "Administrator", value: "admin" },
            { label: "Member", value: "member" },
            { label: "Viewer", value: "viewer" },
          ]}
          {...register("role")}
        />
        {error ? (
          <p className="text-state-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button onClick={close} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            isLoading={isSubmitting}
            loadingText="Sending invitation"
            type="submit"
          >
            Send invitation
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
