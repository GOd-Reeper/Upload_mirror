"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const baseStyle: React.CSSProperties = {
    background: '#0a0a0f',
    border: `1px solid ${error ? '#ef4444' : '#3a3a4a'}`,
    borderRadius: '12px',
    color: '#f5f5f7',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  };

  const focusStyle: React.CSSProperties = {
    background: '#0a0a0f',
    border: `1px solid ${error ? '#ef4444' : '#00d4d4'}`,
    borderRadius: '12px',
    color: '#f5f5f7',
    boxShadow: error 
      ? '0 0 0 3px rgba(239, 68, 68, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.3)'
      : '0 0 0 3px rgba(0, 212, 212, 0.15), 0 0 20px rgba(0, 212, 212, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.3)',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label 
          className="block text-sm font-medium"
          style={{ color: '#a0a0b0' }}
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div 
            className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10"
            style={{ color: isFocused ? '#00d4d4' : '#606070' }}
          >
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 text-sm transition-all duration-200 focus:outline-none placeholder:text-[#505060]",
            leftIcon && "pl-11",
            rightIcon && "pr-11",
            className
          )}
          style={isFocused ? focusStyle : baseStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && (
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            style={{ color: '#606070' }}
          >
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p 
          className="text-xs flex items-center gap-1.5"
          style={{ color: '#ef4444' }}
        >
          <span 
            className="w-1 h-1 rounded-full"
            style={{ background: '#ef4444' }}
          />
          {error}
        </p>
      )}
      {hint && !error && (
        <p 
          className="text-xs"
          style={{ color: '#606070' }}
        >
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
