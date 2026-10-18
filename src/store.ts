import { useSyncExternalStore } from 'react'
import { ConflictError, commitFiles, fetchRecipeFile, getToken, setToken, type FileChange } from './github'
import { DATA_PATH } from './config'
import type { Recipe, SortKey, View } from './types'

export type Theme = 'auto' | 'light' | 'dark'

export interface State {
  recipes: Recipe[]
  loaded: boolean
  refreshing: boolean
  saving: boolean
  pending: number
  error: string | null
  lastSync: number | null
  token: string | null
  theme: Theme
  toast: { id: number; text: string; kind: 'ok' | 'err' } | null
  // Home screen UI state, kept here so it survives navigation.
  query: string
  activeTags: string[]
  sort: SortKey
  view: View
}

const CACHE_KEY = 'rb:cache'
const THEME_KEY = 'rb:theme'

function readCache(): { recipes: Recipe[]; at: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(recipes: Recipe[], at: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ recipes, at }))
  } catch {
    /* ignore */
  }
}

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'light' || t === 'dark' ? t : 'auto'
  } catch {
    return 'auto'
  }
}

const cached = readCache()

let state: State = {
  recipes: cached?.recipes ?? [],
  loaded: Boolean(cached),
  refreshing: false,
  saving: false,
  pending: 0,
  error: null,
  lastSync: cached?.at ?? null,
  token: getToken(),
  theme: readTheme(),
  toast: null,
  query: '',
  activeTags: [],
  sort: 'cooked',
  view: 'book',
}

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  emit()
}

export function getState(): State {
  return state
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

let toastTimer: number | undefined
export function toast(text: string, kind: 'ok' | 'err' = 'ok') {
  window.clearTimeout(toastTimer)
  setState({ toast: { id: Date.now(), text, kind } })
  toastTimer = window.setTimeout(() => setState({ toast: null }), kind === 'err' ? 6000 : 2500)
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* ignore */
  }
  setState({ theme })
}

export function saveToken(token: string) {
  const t = token.trim()
  setToken(t || null)
  setState({ token: t || null })
}

function sortRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

/** Pulls the latest recipes. Returns false if the fetch failed (state is left as it was). */
export async function refresh(): Promise<boolean> {
  if (state.refreshing) return false
  setState({ refreshing: true })
  try {
    const file = await fetchRecipeFile()
    const recipes = sortRecipes(file.recipes)
    const at = Date.now()
    writeCache(recipes, at)
    setState({ recipes, loaded: true, lastSync: at, error: null, refreshing: false })
    return true
  } catch (e) {
    setState({ refreshing: false, loaded: true, error: (e as Error).message })
    return false
  }
}

type Mutator = (recipes: Recipe[]) => Recipe[]

interface Job {
  message: string
  mutate: Mutator
  files: FileChange[]
}

// Commits run one at a time so two quick saves never race each other on this device.
let chain: Promise<void> = Promise.resolve()

function serialize(file: { recipes: Recipe[] }): string {
  return JSON.stringify({ version: 1, recipes: file.recipes }, null, 2) + '\n'
}

/**
 * Applies a change locally right away, then commits it. Every attempt re-reads the server copy and
 * applies the change on top of it, so a phone holding a stale cache can never push old data back up,
 * and if the other phone commits in between the change is simply re-applied (up to 4 tries).
 * Mutators must be idempotent: they may be applied more than once.
 * If the commit fails for good, the local copy is reverted so nothing looks saved that isn't.
 */
export function commit(job: Job): Promise<void> {
  const before = state.recipes
  const optimistic = sortRecipes(job.mutate(before))
  setState({ recipes: optimistic, saving: true, pending: state.pending + 1 })
  writeCache(optimistic, state.lastSync ?? Date.now())

  const run = async () => {
    let lastErr: unknown = null
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const base = (await fetchRecipeFile()).recipes
        const next = sortRecipes(job.mutate(base))
        const changes: FileChange[] = [...job.files, { path: DATA_PATH, content: serialize({ recipes: next }) }]
        await commitFiles(job.message, changes)
        const at = Date.now()
        writeCache(next, at)
        setState({ recipes: next, lastSync: at, error: null })
        return
      } catch (e) {
        lastErr = e
        if (!(e instanceof ConflictError)) break
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      }
    }
    toast(`Couldn't save: ${(lastErr as Error)?.message ?? 'unknown error'}`, 'err')
    const refreshed = await refresh()
    if (!refreshed) {
      setState({ recipes: before })
      writeCache(before, state.lastSync ?? Date.now())
    }
  }

  chain = chain.then(run, run).finally(() => {
    const pending = Math.max(0, state.pending - 1)
    setState({ pending, saving: pending > 0 })
  })
  return chain
}

export function upsertRecipe(recipe: Recipe, files: FileChange[] = [], isNew = false): Promise<void> {
  const updated = { ...recipe, updatedAt: new Date().toISOString() }
  return commit({
    message: `${isNew ? 'Add' : 'Update'} recipe: ${recipe.title || 'Untitled'}`,
    files,
    mutate: (recipes) => {
      const idx = recipes.findIndex((r) => r.id === updated.id)
      if (idx === -1) return [...recipes, updated]
      // Keep any cook-log entries the other phone may have added since this edit began.
      const merged = { ...updated, cookLog: mergeCookLogs(recipes[idx].cookLog, updated.cookLog) }
      return recipes.map((r) => (r.id === merged.id ? merged : r))
    },
  })
}

function mergeCookLogs(server: Recipe['cookLog'], local: Recipe['cookLog']) {
  const ids = new Set(local.map((c) => c.id))
  const extra = server.filter((c) => !ids.has(c.id))
  return [...local, ...extra].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function deleteRecipe(recipe: Recipe): Promise<void> {
  const files: FileChange[] = recipe.photos.flatMap((p) => [
    { path: p, content: null },
    { path: p.replace(/\.jpg$/, '-t.jpg'), content: null },
  ])
  return commit({
    message: `Delete recipe: ${recipe.title || 'Untitled'}`,
    files,
    mutate: (recipes) => recipes.filter((r) => r.id !== recipe.id),
  })
}

export function logCook(recipeId: string, entry: Recipe['cookLog'][number]): Promise<void> {
  const recipe = state.recipes.find((r) => r.id === recipeId)
  if (recipe?.wantToCook) toast('Moved from the want-to-cook list into the book')
  return commit({
    message: `Cooked: ${recipe?.title ?? ''}`,
    files: [],
    mutate: (recipes) =>
      recipes.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              wantToCook: false,
              cookLog: [entry, ...r.cookLog.filter((c) => c.id !== entry.id)].sort((a, b) => (a.date < b.date ? 1 : -1)),
            }
          : r,
      ),
  })
}

export function setWantToCook(recipeId: string, want: boolean): Promise<void> {
  const title = state.recipes.find((r) => r.id === recipeId)?.title ?? ''
  return commit({
    message: `${want ? 'Want to cook' : 'Remove from want-to-cook'}: ${title}`,
    files: [],
    mutate: (recipes) => recipes.map((r) => (r.id === recipeId ? { ...r, wantToCook: want } : r)),
  })
}

export function removeCook(recipeId: string, entryId: string): Promise<void> {
  const title = state.recipes.find((r) => r.id === recipeId)?.title ?? ''
  return commit({
    message: `Remove cook entry: ${title}`,
    files: [],
    mutate: (recipes) => recipes.map((r) => (r.id === recipeId ? { ...r, cookLog: r.cookLog.filter((c) => c.id !== entryId) } : r)),
  })
}

export function init() {
  applyTheme(state.theme)
  void refresh()
  // Refresh when the app comes back to the foreground (the other phone may have cooked something).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !state.saving) void refresh()
  })
}
