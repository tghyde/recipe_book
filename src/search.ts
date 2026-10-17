import type { Recipe, SortKey } from './types'
import { lastCooked } from './util'

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function haystack(r: Recipe): { title: string; tags: string; rest: string } {
  return {
    title: normalize(r.title),
    tags: normalize(r.tags.join(' ')),
    rest: normalize([r.description, ...r.ingredients, ...r.steps, r.notes, r.source].join(' ')),
  }
}

export function filterRecipes(recipes: Recipe[], query: string, activeTags: string[], sort: SortKey): Recipe[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  const scored: Array<{ r: Recipe; score: number }> = []

  for (const r of recipes) {
    if (activeTags.length && !activeTags.every((t) => r.tags.includes(t))) continue
    let score = 0
    if (tokens.length) {
      const h = haystack(r)
      let ok = true
      for (const tok of tokens) {
        if (h.title.includes(tok)) score += h.title.startsWith(tok) ? 6 : 4
        else if (h.tags.includes(tok)) score += 3
        else if (h.rest.includes(tok)) score += 1
        else {
          ok = false
          break
        }
      }
      if (!ok) continue
    }
    scored.push({ r, score })
  }

  const cmp = comparator(sort)
  scored.sort((a, b) => b.score - a.score || cmp(a.r, b.r))
  return scored.map((s) => s.r)
}

function comparator(sort: SortKey): (a: Recipe, b: Recipe) => number {
  switch (sort) {
    case 'alpha':
      return (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    case 'newest':
      return (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)
    case 'neglected':
      // Longest since cooked first; never cooked go last (they aren't "forgotten" yet).
      return (a, b) => {
        const la = lastCooked(a)
        const lb = lastCooked(b)
        if (la === null && lb === null) return a.createdAt < b.createdAt ? -1 : 1
        if (la === null) return 1
        if (lb === null) return -1
        return la < lb ? -1 : la > lb ? 1 : 0
      }
    case 'cooked':
    default:
      // Most recently cooked first; never cooked go last, newest of those first.
      return (a, b) => {
        const la = lastCooked(a)
        const lb = lastCooked(b)
        if (la === null && lb === null) return a.createdAt < b.createdAt ? 1 : -1
        if (la === null) return 1
        if (lb === null) return -1
        return la < lb ? 1 : la > lb ? -1 : 0
      }
  }
}

export function allTags(recipes: Recipe[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const r of recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
