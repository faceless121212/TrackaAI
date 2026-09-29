"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/**
 * A text input that commits on Enter (and optionally on blur) and cancels on
 * Escape. Used for quick-add, new columns and column renames.
 */
export function InlineInput({
  initialValue = "",
  onSubmit,
  onCancel,
  submitOnBlur = false,
  keepOpen = false,
  ...props
}: Omit<ComponentProps<typeof Input>, "onSubmit"> & {
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  submitOnBlur?: boolean;
  /** Clear and stay open after submitting (rapid entry). */
  keepOpen?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return onCancel();
    onSubmit(trimmed);
    if (keepOpen) setValue("");
  }

  return (
    <Input
      autoFocus
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => (submitOnBlur && value.trim() ? submit() : onCancel())}
      {...props}
    />
  );
}
