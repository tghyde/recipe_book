import { useMemo, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ConfirmButton } from '../components/ConfirmButton'
import { Icon } from '../components/Icons'
import { Photo } from '../components/Photo'
import { TagInput } from '../components/TagInput'
import { TopBar } from '../components/TopBar'
import type { FileChange } from '../github'
import { preparePhoto, rememberLocalPhoto } from '../images'
import { href, navigate } from '../router'
import { allTags } from '../search'
import { deleteRecipe, toast, upsertRecipe, useStore } from '../store'
import type { Recipe } from '../types'
import { emptyRecipe, splitLines, thumbPath, uid } from '../util'

type PhotoItem = { kind: 'existing'; path: string } | { kind: 'new'; key: string; full: Blob; thumb: Blob; preview: string }

export function Edit({ id, want = false }: { id?: string; want?: boolean }) {
  const { recipes, loaded, token } = useStore()
  const existing = id ? recipes.find((r) => r.id === id) : undefined
  if (id && !existing) {
    return (
      <>
        <TopBar />
        <div className="container empty">
          <h2>{loaded ? 'Recipe not found' : 'Loading…'}</h2>
        </div>
      </>
    )
  }
  return <EditForm key={existing?.id ?? 'new'} existing={existing} recipes={recipes} canSave={Boolean(token)} presetWant={want} />
}

function EditForm({ existing, recipes, canSave, presetWant }: { existing?: Recipe; recipes: Recipe[]; canSave: boolean; presetWant: boolean }) {
  const isNew = !existing
  const base = useMemo(() => existing ?? emptyRecipe(), [existing])
  const [title, setTitle] = useState(base.title)
  const [description, setDescription] = useState(base.description)
  const [ingredients, setIngredients] = useState(base.ingredients.join('\n'))
  const [steps, setSteps] = useState(base.steps.join('\n'))
  const [notes, setNotes] = useState(base.notes)
  const [source, setSource] = useState(base.source)
  const [sourceTitle, setSourceTitle] = useState(base.sourceTitle ?? '')
  const [tags, setTags] = useState<string[]>(base.tags)
  const [wantToCook, setWantToCook] = useState(existing ? Boolean(existing.wantToCook) : presetWant)
  const [photos, setPhotos] = useState<PhotoItem[]>(base.photos.map((path) => ({ kind: 'existing', path })))
  const [busy, setBusy] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  /**
   * Drag a tile to reorder. Mouse: grab anywhere on the tile. Touch: grab the grip in the corner,
   * so the page still scrolls when you swipe over the photos. The list reorders live as the
   * pointer passes over other tiles.
   */
  const startDrag = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    const target = e.target as HTMLElement
    if (target.closest('.remove')) return
    if (e.pointerType !== 'mouse' && !target.closest('.grip')) return
    e.preventDefault()
    const el = e.currentTarget
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      /* capture is a nicety; the window listeners below do the work */
    }
    let from = index
    setDragIndex(from)
    const onMove = (ev: PointerEvent) => {
      const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.photo-tile[data-index]')
      if (!hit) return
      const to = Number(hit.dataset.index)
      if (Number.isNaN(to) || to === from) return
      // React may run this updater later, so copy the indices now rather than reading `from` then.
      const moveFrom = from
      setPhotos((p) => {
        const next = [...p]
        const [item] = next.splice(moveFrom, 1)
        next.splice(to, 0, item)
        return next
      })
      from = to
      setDragIndex(to)
    }
    const onEnd = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      setDragIndex(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }
  const [preparing, setPreparing] = useState(0)
  const suggestions = useMemo(() => allTags(recipes).map((t) => t.tag), [recipes])

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setPreparing((n) => n + files.length)
    for (const file of files) {
      try {
        const { full, thumb } = await preparePhoto(file)
        setPhotos((p) => [...p, { kind: 'new', key: uid(), full, thumb, preview: URL.createObjectURL(thumb) }])
      } catch (err) {
        toast((err as Error).message, 'err')
      } finally {
        setPreparing((n) => n - 1)
      }
    }
  }

  const removePhoto = (item: PhotoItem) =>
    setPhotos((p) => p.filter((x) => x !== item))

  const save = async () => {
    if (!title.trim()) {
      toast('Give it a title first.', 'err')
      return
    }
    setBusy(true)
    const files: FileChange[] = []
    const keptPaths: string[] = []
    for (const item of photos) {
      if (item.kind === 'existing') {
        keptPaths.push(item.path)
      } else {
        const path = `photos/${base.id}/${item.key}.jpg`
        files.push({ path, content: item.full }, { path: thumbPath(path), content: item.thumb })
        rememberLocalPhoto(path, item.full)
        rememberLocalPhoto(thumbPath(path), item.thumb)
        keptPaths.push(path)
      }
    }
    for (const old of base.photos) {
      if (!keptPaths.includes(old)) files.push({ path: old, content: null }, { path: thumbPath(old), content: null })
    }
    const recipe: Recipe = {
      ...base,
      title: title.trim(),
      description: description.trim(),
      ingredients: splitLines(ingredients),
      steps: splitLines(steps),
      notes: notes.trim(),
      source: source.trim(),
      sourceTitle: sourceTitle.trim() || undefined,
      tags,
      photos: keptPaths,
      wantToCook,
    }
    void upsertRecipe(recipe, files, isNew)
    navigate(href.recipe(recipe.id))
  }

  const remove = () => {
    if (!existing) return
    void deleteRecipe(existing)
    navigate(href.home)
  }

  return (
    <>
      <TopBar title={isNew ? 'New recipe' : `Editing ${base.title}`} backTo={isNew ? href.home : href.recipe(base.id)} />
      <div className="container">
        {!canSave && (
          <div className="notice">
            <span>You can’t save until a GitHub token is added.</span>
            <a href={href.settings}>Settings</a>
          </div>
        )}
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <div className="field">
            <label htmlFor="f-title">Title</label>
            <input id="f-title" className="input title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lemon chicken" autoFocus={isNew} />
          </div>

          <div className="field">
            <span className="label">Photos</span>
            <div className="photo-grid">
              {photos.map((item, index) => (
                <div
                  className={`photo-tile${dragIndex === index ? ' dragging' : ''}`}
                  key={item.kind === 'existing' ? item.path : item.key}
                  data-index={index}
                  onPointerDown={(e) => startDrag(e, index)}
                >
                  {item.kind === 'existing' ? <Photo path={item.path} thumb alt="" /> : <img src={item.preview} alt="" draggable={false} />}
                  {index === 0 && <span className="cover-label">Cover</span>}
                  <span className="grip" aria-hidden="true">
                    <Icon.Grip />
                  </span>
                  <button type="button" className="remove" aria-label="Remove photo" onClick={() => removePhoto(item)}>
                    <Icon.Close />
                  </button>
                </div>
              ))}
              <label className="photo-add">
                <Icon.Camera />
                {preparing > 0 ? 'Preparing…' : 'Add photo'}
                <input type="file" accept="image/*" multiple onChange={(e) => void onPick(e)} />
              </label>
            </div>
            {photos.length > 1 && <div className="hint">Drag to reorder. The first photo is the cover. On a phone, drag by the dotted handle.</div>}
          </div>

          <label className="check-row">
            <input type="checkbox" checked={wantToCook} onChange={(e) => setWantToCook(e.target.checked)} />
            <span>
              <b>On the want-to-cook list</b>
              <small>Kept apart from the book until the first time you log a cook.</small>
            </span>
          </label>

          <div className="field">
            <span className="label">Tags</span>
            <TagInput value={tags} onChange={setTags} suggestions={suggestions} />
          </div>

          <div className="field">
            <label htmlFor="f-desc">Description</label>
            <textarea id="f-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it is, where it came from, why it’s good…" rows={3} />
          </div>

          <div className="field">
            <label htmlFor="f-ing">Ingredients</label>
            <textarea id="f-ing" value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={'2 chicken thighs\n1 lemon\nA lot of garlic'} rows={6} />
            <div className="hint">One per line.</div>
          </div>

          <div className="field">
            <label htmlFor="f-steps">Method</label>
            <textarea id="f-steps" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={'Brown the chicken.\nAdd everything else.\nSimmer until it looks right.'} rows={8} />
            <div className="hint">One step per line. They get numbered automatically.</div>
          </div>

          <div className="field">
            <label htmlFor="f-notes">Notes</label>
            <textarea id="f-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tweaks, substitutions, things to remember next time…" rows={4} />
          </div>

          <div className="field">
            <label htmlFor="f-source">Source</label>
            <input id="f-source" className="input" type="text" inputMode="url" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste a link, or “Nana’s handwritten card”" />
            <input
              className="input"
              type="text"
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              placeholder="Shown as… (e.g. “NYT Cooking: one-pot chicken meatballs”)"
              style={{ marginTop: 8 }}
            />
            <div className="hint">If you give a label, it appears instead of the raw link.</div>
          </div>

          {!isNew && (
            <div>
              <ConfirmButton className="btn btn-danger" question="Delete it and its photos? This can’t be undone." confirmLabel="Delete" onConfirm={remove} disabled={!canSave}>
                <Icon.Trash /> Delete recipe
              </ConfirmButton>
            </div>
          )}
        </form>
      </div>
      <div className="savebar">
        <a className="btn btn-secondary" href={isNew ? href.home : href.recipe(base.id)}>
          Cancel
        </a>
        <button className="btn btn-primary" onClick={() => void save()} disabled={!canSave || busy || preparing > 0}>
          <Icon.Check /> {isNew ? 'Add to the book' : 'Save changes'}
        </button>
      </div>
    </>
  )
}
