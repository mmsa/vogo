import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSavingRange(min?: number, max?: number): string | null {
  if (!min && !max) return null;

  if (min && max && min !== max) {
    return `£${min.toLocaleString()}-£${max.toLocaleString()}`;
  }

  const value = min || max || 0;
  return `£${value.toLocaleString()}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
