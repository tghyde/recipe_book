import { useRef, useState } from 'react'
import { Icon } from './Icons'
import { normalizeTag } from '../util'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}

export function TagInput({ value, onChange, suggestions }: Props) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // Set when a suggestion is pressed, so the input's blur doesn't turn the half-typed text into a tag.
  const pickingSuggestion = useRef(false)

  const add = (raw: string) => {
    const t = normalizeTag(raw)
    setDraft('')
    if (!t) return
    if (!value.includes(t)) onChange([...value, t])
  }
  const remove = (t: string) => onChange(value.filter((x) => x !== t))

  const q = normalizeTag(draft)
  const shown = suggestions.filter((s) => !value.includes(s) && (!q || s.includes(q))).slice(0, 12)

  return (
    <div>
      <div className="taginput" onClick={() => inputRef.current?.focus()}>
        {value.map((t) => (
          <span className="chip chip-x" key={t}>
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => remove(t)}>
              <Icon.Close />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
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
          onBlur={() => {
            if (pickingSuggestion.current) return
            if (draft) add(draft)
          }}
        />
      </div>
      {shown.length > 0 && (
        <div className="suggestions">
          {shown.map((s) => (
            <button
              type="button"
              className="chip"
              key={s}
              onPointerDown={() => {
                pickingSuggestion.current = true
              }}
              onClick={() => {
                pickingSuggestion.current = false
                add(s)
                inputRef.current?.focus()
              }}
            >
              <Icon.Plus /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
