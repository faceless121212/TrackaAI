import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TextFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: string;
  errors?: string[];
  description?: ReactNode;
};

export function TextField({ name, label, errors, description, ...props }: TextFieldProps) {
  const invalid = Boolean(errors?.length);
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} aria-invalid={invalid} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errors?.[0]}</FieldError>
    </Field>
  );
}

/** A form-level error; with `upgradeHref` (a plan limit) it links to the plans instead. */
export function FormError({ message, upgradeHref }: { message?: string; upgradeHref?: string }) {
  if (!message) return null;
  if (upgradeHref) {
    return (
      <p role="alert" className="text-muted-foreground text-sm">
        {message}{" "}
        <Link href={upgradeHref} className="text-foreground font-medium underline underline-offset-4">
          See plans
        </Link>
      </p>
    );
  }
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

/** A labelled Radix Select that submits with its form under `name`. */
export function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger id={name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
