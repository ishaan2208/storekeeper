import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusVariant =
  | "default"
  | "success"
  | "warning"
  | "destructive"
  | "secondary"

interface StatusBadgeProps {
  status: string
  variant?: StatusVariant
  className?: string
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const autoVariant = getStatusVariant(status)
  const finalVariant = variant || autoVariant

  return (
    <Badge variant={finalVariant} className={cn("font-medium", className)}>
      {status}
    </Badge>
  )
}

function getStatusVariant(status: string): StatusVariant {
  const statusLower = status.toLowerCase()

  if (
    statusLower.includes("active") ||
    statusLower.includes("available") ||
    statusLower.includes("completed") ||
    statusLower.includes("closed") ||
    statusLower.includes("good")
  ) {
    return "success"
  }

  if (
    statusLower.includes("pending") ||
    statusLower.includes("in_progress") ||
    statusLower.includes("maintenance") ||
    statusLower.includes("fair")
  ) {
    return "warning"
  }

  if (
    statusLower.includes("inactive") ||
    statusLower.includes("damaged") ||
    statusLower.includes("scrap") ||
    statusLower.includes("poor")
  ) {
    return "destructive"
  }

  return "secondary"
}
