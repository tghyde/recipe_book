import { useMemo } from 'react'
import { Icon } from '../components/Icons'
import { RecipeCard } from '../components/RecipeCard'
import { APP_TITLE } from '../config'
import { href } from '../router'
import { allTags, filterRecipes } from '../search'
import { setState, useStore } from '../store'
import type { SortKey } from '../types'
import { lastCooked, relativeDays } from '../util'

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'cooked', label: 'Recently cooked' },
  { key: 'newest', label: 'Newest' },
  { key: 'alpha', label: 'A to Z' },
  { key: 'neglected', label: 'Haven’t made in a while' },
]

export function Home() {
  const { recipes, loaded, refreshing, error, token, query, activeTags, sort } = useStore()
  const tags = useMemo(() => allTags(recipes), [recipes])
  const shown = useMemo(() => filterRecipes(recipes, query, activeTags, sort), [recipes, query, activeTags, sort])

  const latest = useMemo(() => {
    let best: { title: string; date: string } | null = null
    for (const r of recipes) {
      const d = lastCooked(r)
      if (d && (!best || d > best.date)) best = { title: r.title, date: d }
    }
    return best
  }, [recipes])

  const toggleTag = (t: string) =>
    setState({ activeTags: activeTags.includes(t) ? activeTags.filter((x) => x !== t) : [...activeTags, t] })

  const filtering = query.trim() !== '' || activeTags.length > 0

  return (
    <>
      <div className="container">
        <header className="masthead">
          <div>
            <h1>{APP_TITLE}</h1>
            <p className="sub">
              {!loaded
                ? 'Loading…'
                : recipes.length === 0
                  ? 'Nothing in the book yet.'
                  : `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}` +
                    (latest ? ` · last cooked ${latest.title}, ${relativeDays(latest.date)}` : '')}
              {refreshing && loaded ? ' · updating' : ''}
            </p>
          </div>
          <div className="masthead-actions">
            <a className="icon-btn" href={href.settings} aria-label="Settings">
              <Icon.Settings />
            </a>
            <a className="btn btn-primary" href={href.new}>
              <Icon.Plus /> New recipe
            </a>
          </div>
          <div className="masthead-mobile">
            <a className="icon-btn" href={href.settings} aria-label="Settings">
              <Icon.Settings />
            </a>
          </div>
        </header>
        {error && recipes.length === 0 && (
          <div className="notice">
            <span>{error}</span>
            <a href={href.settings}>Settings</a>
          </div>
        )}
        {!token && loaded && !error && (
          <div className="notice">
            <span>Read-only until a GitHub token is added.</span>
            <a href={href.settings}>Add it</a>
          </div>
        )}
      </div>

      <div className="toolbar">
        <div className="container">
          <div className="search">
            <label className="search-input">
              <Icon.Search />
              <input
                type="search"
                placeholder="Search recipes, ingredients…"
                value={query}
                onChange={(e) => setState({ query: e.target.value })}
                enterKeyHint="search"
              />
              {query && (
                <button className="clear-btn" aria-label="Clear search" onClick={() => setState({ query: '' })}>
                  <Icon.Close />
                </button>
              )}
            </label>
            <select className="select" value={sort} onChange={(e) => setState({ sort: e.target.value as SortKey })} aria-label="Sort">
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {tags.length > 0 && (
            <div className="tagrow">
              {activeTags.length > 0 && (
                <button className="chip" onClick={() => setState({ activeTags: [] })} aria-label="Clear tags">
                  <Icon.Close />
                </button>
              )}
              {tags.map(({ tag, count }) => (
                <button key={tag} className={`chip${activeTags.includes(tag) ? ' active' : ''}`} onClick={() => toggleTag(tag)}>
                  {tag} <span className="count">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="container">
        <div className="grid">
          {shown.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
          {loaded && shown.length === 0 && (
            <div className="empty">
              {filtering ? (
                <>
                  <h2>Nothing matches that</h2>
                  <p>Try a different word, or clear the tags.</p>
                  <button className="btn btn-secondary" onClick={() => setState({ query: '', activeTags: [] })}>
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <h2>The book is empty</h2>
                  <p>Add the first thing you’ve cooked.</p>
                  <a className="btn btn-primary" href={href.new}>
                    <Icon.Plus /> New recipe
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <a className="fab" href={href.new} aria-label="New recipe">
        <Icon.Plus />
      </a>
    </>
  )
}
