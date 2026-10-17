import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'recipe'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'new' }
  | { name: 'settings' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '')
  const [a, b] = path.split('/')
  if (a === 'r' && b) return { name: 'recipe', id: decodeURIComponent(b) }
  if (a === 'edit' && b) return { name: 'edit', id: decodeURIComponent(b) }
  if (a === 'new') return { name: 'new' }
  if (a === 'settings') return { name: 'settings' }
  return { name: 'home' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(path: string) {
  location.hash = path
}

export function back(fallback = '#/') {
  if (history.length > 1) history.back()
  else navigate(fallback)
}

export const href = {
  home: '#/',
  recipe: (id: string) => `#/r/${encodeURIComponent(id)}`,
  edit: (id: string) => `#/edit/${encodeURIComponent(id)}`,
  new: '#/new',
  settings: '#/settings',
}
