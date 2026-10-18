import { useMemo } from 'react'
import { Icon } from '../components/Icons'
import { RecipeCard } from '../components/RecipeCard'
import { APP_TITLE } from '../config'
import { href } from '../router'
import { allTags, filterRecipes } from '../search'
import { setState, useStore } from '../store'
import type { SortKey, View } from '../types'
import { lastCooked, relativeDays } from '../util'

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'cooked', label: 'Recently cooked' },
  { key: 'newest', label: 'Newest' },
  { key: 'alpha', label: 'A to Z' },
  { key: 'neglected', label: 'Haven’t made in a while' },
]

export function Home() {
  const { recipes: all, loaded, refreshing, error, token, query, activeTags, sort, view } = useStore()
  const book = useMemo(() => all.filter((r) => !r.wantToCook), [all])
  const wanted = useMemo(() => all.filter((r) => r.wantToCook), [all])
  const recipes = view === 'want' ? wanted : book
  const tags = useMemo(() => allTags(recipes), [recipes])
  const shown = useMemo(() => filterRecipes(recipes, query, activeTags, sort), [recipes, query, activeTags, sort])
  // How many results the search would find on the other list, so nothing feels lost.
  const elsewhere = useMemo(
    () => (query.trim() || activeTags.length ? filterRecipes(view === 'want' ? book : wanted, query, activeTags, sort).length : 0),
    [view, book, wanted, query, activeTags, sort],
  )
  const switchView = (v: View) => setState({ view: v, activeTags: [] })

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
                : book.length === 0
                  ? 'Nothing in the book yet.'
                  : `${book.length} ${book.length === 1 ? 'recipe' : 'recipes'}` +
                    (latest ? ` · last cooked ${latest.title}, ${relativeDays(latest.date)}` : '')}
              {refreshing && loaded ? ' · updating' : ''}
            </p>
          </div>
          <div className="masthead-actions">
            <a className="icon-btn" href={href.settings} aria-label="Settings">
              <Icon.Settings />
            </a>
            <a className="btn btn-primary" href={view === 'want' ? href.newWant : href.new}>
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
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={view === 'book'} className={view === 'book' ? 'on' : ''} onClick={() => switchView('book')}>
              The book
            </button>
            <button role="tab" aria-selected={view === 'want'} className={view === 'want' ? 'on' : ''} onClick={() => switchView('want')}>
              Want to cook{wanted.length > 0 && <span className="count">{wanted.length}</span>}
            </button>
          </div>
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
          {loaded && elsewhere > 0 && (
            <button className="elsewhere" onClick={() => switchView(view === 'want' ? 'book' : 'want')}>
              {elsewhere} more {elsewhere === 1 ? 'match' : 'matches'} {view === 'want' ? 'in the book' : 'on the want-to-cook list'}
            </button>
          )}
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
              ) : view === 'want' ? (
                <>
                  <h2>Nothing on the list</h2>
                  <p>Save something you’d like to try. It moves into the book the first time you log a cook.</p>
                  <a className="btn btn-primary" href={href.newWant}>
                    <Icon.Plus /> Add one to try
                  </a>
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

      <a className="fab" href={view === 'want' ? href.newWant : href.new} aria-label="New recipe">
        <Icon.Plus />
      </a>
    </>
  )
}
