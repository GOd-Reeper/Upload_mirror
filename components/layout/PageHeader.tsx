"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function PageHeader({ title, description, children, className, badge }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 animate-fade-in", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {badge && <div className="mb-2">{badge}</div>}
          <h1 
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: '#f5f5f7' }}
          >
            {title}
          </h1>
          {description && (
            <p 
              className="mt-2 text-base"
              style={{ color: '#a0a0b0' }}
            >
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
