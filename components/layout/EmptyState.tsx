"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-20 text-center animate-fade-in",
      className
    )}>
      {/* Icon with glow effect */}
      <div className="relative mb-6">
        <div 
          className="absolute inset-0 w-20 h-20 rounded-2xl blur-xl"
          style={{ background: 'rgba(0, 212, 212, 0.2)' }}
        />
        <div 
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.2) 0%, rgba(0, 212, 212, 0.05) 100%)',
            border: '1px solid rgba(0, 212, 212, 0.2)'
          }}
        >
          <Icon className="w-10 h-10" style={{ color: '#00d4d4' }} strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 
        className="text-xl font-semibold mb-2"
        style={{ color: '#f5f5f7' }}
      >
        {title}
      </h3>
      <p 
        className="max-w-md mb-8 text-base"
        style={{ color: '#a0a0b0' }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}
