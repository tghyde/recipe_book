import type { Recipe } from './types'

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function formatDate(iso: string): string {
  const d = iso.length > 10 ? new Date(iso) : parseLocalDate(iso)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function relativeDays(iso: string): string {
  const then = parseLocalDate(iso).getTime()
  const now = parseLocalDate(todayISO()).getTime()
  const days = Math.round((now - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  if (days < 365) return `${Math.round(days / 30)} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? 'a year ago' : `${years} years ago`
}

export function lastCooked(r: Recipe): string | null {
  if (r.cookLog.length === 0) return null
  return r.cookLog.reduce((a, b) => (a.date > b.date ? a : b)).date
}

export function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export function emptyRecipe(): Recipe {
  const now = new Date().toISOString()
  return {
    id: uid(),
    title: '',
    description: '',
    ingredients: [],
    steps: [],
    notes: '',
    tags: [],
    photos: [],
    source: '',
    createdAt: now,
    updatedAt: now,
    cookLog: [],
  }
}

export function thumbPath(path: string): string {
  return path.replace(/\.jpg$/, '-t.jpg')
}

export function normalizeTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, ' ')
}
