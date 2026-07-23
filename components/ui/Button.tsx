"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef, useState } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  children: React.ReactNode;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  children,
  disabled,
  asChild,
  ...props
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variantStyles = {
    primary: {
      base: {
        background: 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
        color: '#000',
        fontWeight: 600,
      },
      hover: {
        background: 'linear-gradient(135deg, #00e8e8 0%, #00d4d4 100%)',
        boxShadow: '0 0 30px rgba(0, 212, 212, 0.35)',
      },
    },
    secondary: {
      base: {
        background: '#1a1a24',
        color: '#f5f5f7',
        border: '1px solid #2a2a38',
      },
      hover: {
        background: '#1f1f2a',
        borderColor: 'rgba(0, 212, 212, 0.3)',
        color: '#00d4d4',
      },
    },
    danger: {
      base: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#fff',
        fontWeight: 600,
      },
      hover: {
        background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.35)',
      },
    },
    ghost: {
      base: {
        background: 'transparent',
        color: '#a0a0b0',
      },
      hover: {
        background: 'rgba(0, 212, 212, 0.1)',
        color: '#00d4d4',
      },
    },
    outline: {
      base: {
        background: 'transparent',
        border: '1px solid #2a2a38',
        color: '#a0a0b0',
      },
      hover: {
        borderColor: 'rgba(0, 212, 212, 0.5)',
        background: 'rgba(0, 212, 212, 0.05)',
        color: '#00d4d4',
      },
    },
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs h-8",
    md: "px-4 py-2.5 text-sm h-10",
    lg: "px-6 py-3 text-base h-12",
    icon: "w-10 h-10 p-0",
  };

  const currentVariant = variantStyles[variant];
  const currentStyle = isHovered && !disabled 
    ? { ...currentVariant.base, ...currentVariant.hover }
    : currentVariant.base;

  return (
    <button
      ref={ref}
      className={cn(baseStyles, sizes[size], className)}
      style={currentStyle as React.CSSProperties}
      disabled={disabled || isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = "Button";
