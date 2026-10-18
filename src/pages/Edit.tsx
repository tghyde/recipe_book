import { useMemo, useState, type ChangeEvent } from 'react'
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

export function Edit({ id }: { id?: string }) {
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
  return <EditForm key={existing?.id ?? 'new'} existing={existing} recipes={recipes} canSave={Boolean(token)} />
}

function EditForm({ existing, recipes, canSave }: { existing?: Recipe; recipes: Recipe[]; canSave: boolean }) {
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
  const [photos, setPhotos] = useState<PhotoItem[]>(base.photos.map((path) => ({ kind: 'existing', path })))
  const [busy, setBusy] = useState(false)
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
    }
    void upsertRecipe(recipe, files, isNew)
    navigate(href.recipe(recipe.id))
  }

  const remove = () => {
    if (!existing) return
    if (!confirm(`Delete “${existing.title}” and its photos? This can’t be undone.`)) return
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
              {photos.map((item) => (
                <div className="photo-tile" key={item.kind === 'existing' ? item.path : item.key}>
                  {item.kind === 'existing' ? <Photo path={item.path} thumb alt="" /> : <img src={item.preview} alt="" />}
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
          </div>

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
              <button type="button" className="btn btn-danger" onClick={remove} disabled={!canSave}>
                <Icon.Trash /> Delete recipe
              </button>
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
