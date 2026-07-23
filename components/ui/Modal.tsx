"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useCallback, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  showClose?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
}: ModalProps) {
  const [closeHovered, setCloseHovered] = useState(false);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ 
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full rounded-2xl animate-scale-in",
          sizes[size]
        )}
        style={{
          background: '#16161e',
          border: '1px solid #2a2a38',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              {title && (
                <h2 
                  className="text-xl font-semibold"
                  style={{ color: '#f5f5f7' }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p 
                  className="text-sm mt-1"
                  style={{ color: '#a0a0b0' }}
                >
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                onMouseEnter={() => setCloseHovered(true)}
                onMouseLeave={() => setCloseHovered(false)}
                className="p-2 -mr-2 -mt-2 rounded-xl transition-colors"
                style={{
                  color: closeHovered ? '#f5f5f7' : '#a0a0b0',
                  background: closeHovered ? '#1a1a24' : 'transparent'
                }}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          "px-6 pb-6",
          !title && !showClose && "pt-6"
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}
