import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function createPageUrl(name) {
  const safe = String(name || '').trim().toLowerCase();
  return `/${safe}`;
}


