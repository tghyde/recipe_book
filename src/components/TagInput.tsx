import { useState } from 'react'
import { Icon } from './Icons'
import { normalizeTag } from '../util'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}

export function TagInput({ value, onChange, suggestions }: Props) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const t = normalizeTag(raw)
    if (!t) return
    if (!value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  const remove = (t: string) => onChange(value.filter((x) => x !== t))

  const q = normalizeTag(draft)
  const shown = suggestions.filter((s) => !value.includes(s) && (!q || s.includes(q))).slice(0, 12)

  return (
    <div>
      <div className="taginput" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
        {value.map((t) => (
          <span className="chip chip-x" key={t}>
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => remove(t)}>
              <Icon.Close />
            </button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={value.length ? '' : 'weeknight, soup, mum’s…'}
          autoCapitalize="none"
          enterKeyHint="done"
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',')) add(v.slice(0, -1))
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              remove(value[value.length - 1])
            }
          }}
          onBlur={() => draft && add(draft)}
        />
      </div>
      {shown.length > 0 && (
        <div className="suggestions">
          {shown.map((s) => (
            <button type="button" className="chip" key={s} onClick={() => add(s)}>
              <Icon.Plus /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
