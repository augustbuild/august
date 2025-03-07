import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(title: string, companyName: string): string {
  // Combine title and company name
  const combined = `${title}-${companyName}`;

  // Convert to lowercase, replace spaces and special chars with hyphens
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '')     // Remove leading/trailing hyphens
    .replace(/-+/g, '-');        // Replace multiple consecutive hyphens with single hyphen
}