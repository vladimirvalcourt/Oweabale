import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-(--color-accent) focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-(--color-surface-elevated) text-(--color-content-secondary)",
        secondary:
          "border-transparent bg-(--color-accent-muted) text-(--color-accent)",
        destructive:
          "border-transparent bg-(--color-danger-bg) text-(--color-danger) border-(--color-danger-border)",
        warning:
          "border-transparent bg-(--color-warning-bg) text-(--color-warning) border-(--color-warning-border)",
        success:
          "border-transparent bg-(--color-success-bg) text-(--color-success) border-(--color-success-border)",
        outline:
          "text-(--color-content-secondary) border-(--color-surface-border)",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
