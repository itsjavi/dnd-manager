import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function assetUrl(path: string) {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return import.meta.env.DEV ? safePath : `/dnd-manager${safePath}`
}
