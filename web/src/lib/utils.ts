import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSavingRange(min?: number, max?: number): string | null {
  if (!min && !max) return null;

  // Convert pence to pounds (divide by 100)
  const minPounds = min ? min / 100 : undefined;
  const maxPounds = max ? max / 100 : undefined;

  if (minPounds && maxPounds && minPounds !== maxPounds) {
    return `£${minPounds.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}-£${maxPounds.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const value = minPounds || maxPounds || 0;
  return `£${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
