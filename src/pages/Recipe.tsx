import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icons'
import { Photo } from '../components/Photo'
import { Sheet } from '../components/Sheet'
import { TopBar } from '../components/TopBar'
import { href, navigate } from '../router'
import { logCook, removeCook, setState, useStore } from '../store'
import type { Recipe as RecipeT } from '../types'
import { formatDate, lastCooked, relativeDays, todayISO, uid } from '../util'
import { useWakeLock } from '../wakeLock'

export function Recipe({ id }: { id: string }) {
  const { recipes, loaded, token } = useStore()
  const recipe = recipes.find((r) => r.id === id)
  const wake = useWakeLock()
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [cookOpen, setCookOpen] = useState(false)
  const closeCook = useCallback(() => setCookOpen(false), [])

  if (!recipe) {
    return (
      <>
        <TopBar />
        <div className="container empty">
          <h2>{loaded ? 'Recipe not found' : 'Loading…'}</h2>
          {loaded && <p>It may have been deleted on the other phone.</p>}
        </div>
      </>
    )
  }

  const last = lastCooked(recipe)
  const times = recipe.cookLog.length
  const toggleIngredient = (i: number) =>
    setChecked((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  const goToTag = (t: string) => {
    setState({ activeTags: [t], query: '' })
    navigate(href.home)
  }

  const removeEntry = (entryId: string) => {
    if (confirm('Remove this entry from the cook history?')) void removeCook(recipe.id, entryId)
  }

  return (
    <>
      <TopBar
        title={recipe.title}
        backTo={href.home}
        right={
          <a className="icon-btn" href={href.edit(recipe.id)} aria-label="Edit">
            <Icon.Edit />
          </a>
        }
      />
      <div className="container">
        {recipe.photos.length > 0 && <Gallery photos={recipe.photos} />}

        <div className="recipe-head">
          {recipe.tags.length > 0 && (
            <div className="tags">
              {recipe.tags.map((t) => (
                <button className="tag" key={t} onClick={() => goToTag(t)}>
                  {t}
                </button>
              ))}
            </div>
          )}
          <h1>{recipe.title}</h1>
          {recipe.description && <p className="desc">{recipe.description}</p>}
          <p className="stat">
            {last ? (
              <>
                Cooked <b>{times === 1 ? 'once' : `${times} times`}</b>, last <b>{relativeDays(last)}</b>
              </>
            ) : (
              <>Not cooked yet, as far as the book knows.</>
            )}
          </p>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => setCookOpen(true)} disabled={!token}>
            <Icon.Pot /> I cooked this
          </button>
          {wake.supported && (
            <button className={`btn btn-secondary btn-toggle${wake.active ? ' on' : ''}`} onClick={wake.toggle} aria-pressed={wake.active}>
              <Icon.Sun /> {wake.active ? 'Screen staying on' : 'Keep screen on'}
            </button>
          )}
        </div>

        <div className="cols">
          <aside>
            {recipe.ingredients.length > 0 && (
              <section className="section">
                <h2 className="section-title">Ingredients</h2>
                <ul className="ingredients">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className={checked.has(i) ? 'done' : ''} onClick={() => toggleIngredient(i)}>
                      <span className="box">
                        <Icon.Check />
                      </span>
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
          <div>
            {recipe.steps.length > 0 && (
              <section className="section">
                <h2 className="section-title">Method</h2>
                <ol className="steps">
                  {recipe.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </section>
            )}
            {recipe.notes && (
              <section className="section">
                <h2 className="section-title">Notes</h2>
                <div className="notes">{recipe.notes}</div>
              </section>
            )}
            {recipe.source && (
              <section className="section">
                <h2 className="section-title">Source</h2>
                {/^https?:\/\//.test(recipe.source) ? (
                  <a className="source" href={recipe.source} target="_blank" rel="noreferrer">
                    <Icon.Link /> {recipe.sourceTitle?.trim() || recipe.source.replace(/^https?:\/\/(www\.)?/, '').split('?')[0]}
                  </a>
                ) : (
                  <p className="prose">{recipe.sourceTitle?.trim() ? `${recipe.sourceTitle} · ${recipe.source}` : recipe.source}</p>
                )}
              </section>
            )}
            <section className="section">
              <h2 className="section-title">Cook history</h2>
              {recipe.cookLog.length === 0 ? (
                <p className="muted">Nothing logged yet. Tap “I cooked this” after dinner.</p>
              ) : (
                <ul className="cooklog">
                  {recipe.cookLog.map((c) => (
                    <li key={c.id}>
                      <div>
                        <div className="when">
                          {formatDate(c.date)}
                          <span className="ago">{relativeDays(c.date)}</span>
                        </div>
                        {c.note && <div className="note">{c.note}</div>}
                      </div>
                      {token && (
                        <button className="remove" aria-label="Remove entry" onClick={() => removeEntry(c.id)}>
                          <Icon.Trash />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {cookOpen && <CookSheet recipe={recipe} onClose={closeCook} />}
    </>
  )
}

function Gallery({ photos }: { photos: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="hero">
      <div className="gallery" ref={ref}>
        {photos.map((p, i) => (
          <div key={p}>
            <Photo path={p} eager={i === 0} alt="" />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="gallery-dots">
          {photos.map((p, i) => (
            <span key={p} className={i === index ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  )
}

function CookSheet({ recipe, onClose }: { recipe: RecipeT; onClose: () => void }) {
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const save = () => {
    void logCook(recipe.id, { id: uid(), date, note: note.trim() || undefined })
    onClose()
  }
  return (
    <Sheet onClose={onClose}>
      <h2>Cooked {recipe.title}</h2>
      <p className="sub">Add it to the history so future you remembers.</p>
      <div className="field">
        <label htmlFor="cook-date">When</label>
        <input id="cook-date" className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cook-note">Note (optional)</label>
        <textarea id="cook-note" placeholder="Too salty, less next time…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      </div>
      <div className="row">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={!date}>
          <Icon.Check /> Log it
        </button>
      </div>
    </Sheet>
  )
}
