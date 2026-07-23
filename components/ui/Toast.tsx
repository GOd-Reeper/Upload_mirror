"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={removeToast}
          index={index}
        />
      ))}
    </div>
  );
}

const toastStyles = {
  success: {
    bg: 'rgba(22, 22, 30, 0.95)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    iconBg: 'rgba(34, 197, 94, 0.1)',
    iconColor: '#22c55e',
    glow: '0 0 20px rgba(34, 197, 94, 0.15)',
  },
  error: {
    bg: 'rgba(22, 22, 30, 0.95)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColor: '#ef4444',
    glow: '0 0 20px rgba(239, 68, 68, 0.15)',
  },
  warning: {
    bg: 'rgba(22, 22, 30, 0.95)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: '#f59e0b',
    glow: '0 0 20px rgba(245, 158, 11, 0.15)',
  },
  info: {
    bg: 'rgba(22, 22, 30, 0.95)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    iconBg: 'rgba(59, 130, 246, 0.1)',
    iconColor: '#3b82f6',
    glow: '0 0 20px rgba(59, 130, 246, 0.15)',
  },
};

function ToastItem({
  toast,
  onRemove,
  index,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
  index: number;
}) {
  const [closeHovered, setCloseHovered] = useState(false);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const Icon = icons[toast.type];
  const style = toastStyles[toast.type];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 rounded-xl animate-slide-up pointer-events-auto",
        "min-w-[320px] max-w-[420px]"
      )}
      style={{ 
        animationDelay: `${index * 0.05}s`,
        background: style.bg,
        border: style.border,
        backdropFilter: 'blur(16px)',
        boxShadow: style.glow,
      }}
    >
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: style.iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: style.iconColor }} />
      </div>
      <p 
        className="flex-1 text-sm font-medium"
        style={{ color: '#f5f5f7' }}
      >
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        onMouseEnter={() => setCloseHovered(true)}
        onMouseLeave={() => setCloseHovered(false)}
        className="p-1.5 rounded-lg transition-colors"
        style={{
          color: closeHovered ? '#f5f5f7' : '#a0a0b0',
          background: closeHovered ? '#1a1a24' : 'transparent'
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
