"use client";

import { cn } from "@/lib/utils";
import { formatMB, calculateStoragePercentage, getStorageStatus } from "@/lib/utils";

interface StorageBarProps {
  used: number; // MB
  limit: number; // MB
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StorageBar({
  used,
  limit,
  showLabels = true,
  size = "md",
  className,
}: StorageBarProps) {
  const percentage = calculateStoragePercentage(used, limit);
  const status = getStorageStatus(used, limit);

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const statusColors = {
    available: "from-accent to-cyan-400",
    "almost-full": "from-warning to-orange-400",
    full: "from-error to-red-400",
  };

  const statusBg = {
    available: "bg-accent/10",
    "almost-full": "bg-warning/10",
    full: "bg-error/10",
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-muted">
            {formatMB(used)} / {formatMB(limit)}
          </span>
          <span
            className={cn(
              "font-medium",
              status === "available" && "text-accent",
              status === "almost-full" && "text-warning",
              status === "full" && "text-error"
            )}
          >
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          heights[size],
          statusBg[status]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
            statusColors[status]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

