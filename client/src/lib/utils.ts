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

export function getCountryFlag(country: string): string {
  // Special cases for countries that don't follow the two-letter code pattern
  const specialCases: Record<string, string> = {
    "United States": "US",
    "United Kingdom": "GB",
    "South Korea": "KR",
    "North Korea": "KP",
  };

  // Get the two-letter country code
  const countryCode = specialCases[country] || 
    country.split(' ')[0].slice(0, 2).toUpperCase();

  // Convert country code to regional indicator symbols
  return countryCode
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('');
}