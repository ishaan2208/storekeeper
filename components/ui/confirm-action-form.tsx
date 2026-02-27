"use client";

import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";

type ServerAction = (formData: FormData) => void | Promise<void>;

type ConfirmActionFormProps = {
  action: ServerAction;
  confirmMessage: string;
  fields: Record<string, string>;
  formClassName?: string;
} & Omit<React.ComponentProps<"button">, "type" | "onClick"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function ConfirmActionForm({
  action,
  confirmMessage,
  fields,
  formClassName,
  className,
  children,
  ...buttonProps
}: ConfirmActionFormProps) {
  return (
    <form
      action={action}
      className={cn("inline", formClassName)}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" className={cn(className)} {...buttonProps}>
        {children}
      </Button>
    </form>
  );
}

