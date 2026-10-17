import { API_BASE, BRANCH, DATA_PATH, PAGES_BASE, RAW_BASE } from './config'
import type { RecipeFile } from './types'

export class GitHubError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
export class ConflictError extends Error {}

const TOKEN_KEY = 'rb:token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

async function api<T>(path: string, init: RequestInit = {}, accept = 'application/vnd.github+json'): Promise<T> {
  const token = getToken()
  if (!token) throw new GitHubError(401, 'No GitHub token saved. Add one in Settings.')
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.message || ''
    } catch {
      /* no body */
    }
    if (res.status === 401) throw new GitHubError(401, 'GitHub rejected the token. Check it in Settings.')
    if (res.status === 403) throw new GitHubError(403, detail || 'GitHub refused the request (permissions or rate limit).')
    if (res.status === 404) throw new GitHubError(404, 'Repository not found, or the token cannot see it.')
    if (res.status === 409 || res.status === 422) throw new ConflictError(detail || 'Conflict')
    throw new GitHubError(res.status, detail || `GitHub error ${res.status}`)
  }
  if (accept.includes('raw')) return (await res.text()) as unknown as T
  return (await res.json()) as T
}

/** Checks that the token can see the repo and has push access. */
export async function checkAccess(): Promise<{ canWrite: boolean }> {
  const repo = await api<{ permissions?: { push?: boolean } }>('')
  return { canWrite: Boolean(repo.permissions?.push) }
}

/** Reads recipes.json. With a token it comes from the API (always fresh); without, from the raw CDN, then the deployed site. */
export async function fetchRecipeFile(): Promise<RecipeFile> {
  let text: string
  if (getToken()) {
    text = await api<string>(`/contents/${DATA_PATH}?ref=${BRANCH}&t=${Date.now()}`, {}, 'application/vnd.github.raw+json')
  } else {
    let res = await fetch(`${RAW_BASE}${DATA_PATH}?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null)
    if (!res || !res.ok) res = await fetch(`${PAGES_BASE}${DATA_PATH}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new GitHubError(res.status, 'Could not load recipes.')
    text = await res.text()
  }
  const parsed = JSON.parse(text) as Partial<RecipeFile>
  return { version: 1, recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [] }
}

export type FileChange = { path: string; content: Blob | string } | { path: string; content: null }

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const url = reader.result as string
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Writes several files as ONE commit on the branch using the git data API.
 * Throws ConflictError if someone else committed in between (the ref update is fast-forward only).
 */
export async function commitFiles(message: string, changes: FileChange[]): Promise<string> {
  const ref = await api<{ object: { sha: string } }>(`/git/ref/heads/${BRANCH}`)
  const headSha = ref.object.sha
  const head = await api<{ tree: { sha: string } }>(`/git/commits/${headSha}`)

  const tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string | null }> = []
  for (const change of changes) {
    if (change.content === null) {
      tree.push({ path: change.path, mode: '100644', type: 'blob', sha: null })
      continue
    }
    const body =
      typeof change.content === 'string'
        ? { content: change.content, encoding: 'utf-8' }
        : { content: await blobToBase64(change.content), encoding: 'base64' }
    const blob = await api<{ sha: string }>('/git/blobs', { method: 'POST', body: JSON.stringify(body) })
    tree.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha })
  }

  const newTree = await api<{ sha: string }>('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.tree.sha, tree }),
  })
  const commit = await api<{ sha: string }>('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] }),
  })
  await api(`/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  })
  return commit.sha
}
