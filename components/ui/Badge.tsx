"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "accent";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

const variantStyles = {
  default: {
    background: '#1a1a24',
    color: '#a0a0b0',
    border: '1px solid rgba(42, 42, 56, 0.5)',
    dotColor: '#a0a0b0',
  },
  success: {
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    dotColor: '#22c55e',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    dotColor: '#f59e0b',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    dotColor: '#ef4444',
  },
  info: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    dotColor: '#3b82f6',
  },
  accent: {
    background: 'rgba(0, 212, 212, 0.1)',
    color: '#00d4d4',
    border: '1px solid rgba(0, 212, 212, 0.2)',
    dotColor: '#00d4d4',
  },
};

export function Badge({ 
  children, 
  variant = "default", 
  size = "md",
  className,
  dot = false 
}: BadgeProps) {
  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  const style = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full transition-colors",
        sizes[size],
        className
      )}
      style={{
        background: style.background,
        color: style.color,
        border: style.border,
      }}
    >
      {dot && (
        <span 
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: style.dotColor }}
        />
      )}
      {children}
    </span>
  );
}
