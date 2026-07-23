"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, className, hover = false, glow = false, onClick, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl p-6 transition-all duration-300",
        hover && "cursor-pointer hover:-translate-y-1 hover:shadow-xl",
        glow && "relative before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-accent/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:-z-10",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        background: '#16161e',
        border: '1px solid #2a2a38',
        ...style,
        ...(hover ? {
          ['--hover-border' as string]: 'rgba(0, 212, 212, 0.3)',
          ['--hover-bg' as string]: '#1c1c26',
        } : {})
      }}
      onMouseEnter={hover ? (e) => {
        e.currentTarget.style.borderColor = 'rgba(0, 212, 212, 0.3)';
        e.currentTarget.style.background = '#1c1c26';
      } : undefined}
      onMouseLeave={hover ? (e) => {
        e.currentTarget.style.borderColor = '#2a2a38';
        e.currentTarget.style.background = '#16161e';
      } : undefined}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 
      className={cn("text-lg font-semibold", className)}
      style={{ color: '#f5f5f7' }}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p 
      className={cn("text-sm mt-1", className)}
      style={{ color: '#a0a0b0' }}
    >
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("", className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div 
      className={cn("mt-4 pt-4", className)}
      style={{ borderTop: '1px solid #2a2a38' }}
    >
      {children}
    </div>
  );
}
