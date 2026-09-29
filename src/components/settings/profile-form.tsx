"use client";

import { useTheme } from "next-themes";
import { toast } from "sonner";
import { SelectField, TextField } from "@/components/forms/fields";
import { useFormAction } from "@/components/forms/use-form-action";
import { MemberAvatar } from "@/components/tasks/member-avatar";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import type { Theme, User } from "@/lib/domain";
import { updateProfileAction } from "@/server/actions/profile";

export function ProfileForm({ user }: { user: Pick<User, "name" | "email" | "avatarUrl" | "theme"> }) {
  const { setTheme } = useTheme();
  const [state, action, pending] = useFormAction(
    async (prev, formData) => {
      const result = await updateProfileAction(prev, formData);
      if (result.ok) setTheme(String(formData.get("theme")) as Theme);
      return result;
    },
    () => toast.success("Profile saved"),
  );

  return (
    <form action={action} className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <MemberAvatar member={user} className="size-12 text-base" />
        <div className="text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <FieldGroup>
        <TextField
          name="name"
          label="Name"
          required
          defaultValue={state.values?.name ?? user.name}
          errors={state.fieldErrors?.name}
        />
        <TextField
          name="avatarUrl"
          label="Avatar URL"
          type="url"
          placeholder="https://…"
          description="Image uploads arrive with Supabase Storage; paste a link for now."
          defaultValue={state.values?.avatarUrl ?? user.avatarUrl ?? ""}
          errors={state.fieldErrors?.avatarUrl}
        />
        <SelectField
          name="theme"
          label="Theme"
          defaultValue={state.values?.theme || user.theme || "dark"}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "System" },
          ]}
        />
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        Save profile
      </Button>
    </form>
  );
}
