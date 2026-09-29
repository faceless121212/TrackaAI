import type { ComponentProps, ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}
