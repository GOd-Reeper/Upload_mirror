import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatMB(mb: number): string {
  if (mb >= 1024) {
    return (mb / 1024).toFixed(2) + " GB";
  }
  return mb.toFixed(0) + " MB";
}

export function calculateStoragePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
}

export function getStorageStatus(used: number, limit: number): "available" | "almost-full" | "full" {
  const percentage = calculateStoragePercentage(used, limit);
  if (percentage >= 95) return "full";
  if (percentage >= 80) return "almost-full";
  return "available";
}

export function generateId(): string {
  return crypto.randomUUID();
}

