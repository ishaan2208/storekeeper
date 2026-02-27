"use client"

import { Loader2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type VariantProps } from "class-variance-authority"
import * as React from "react"

interface SubmitButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  isSubmitting?: boolean
  loadingText?: string
  asChild?: boolean
}

export function SubmitButton({
  isSubmitting,
  loadingText = "Saving...",
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isSubmitting}
      className={cn(className)}
      {...props}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
