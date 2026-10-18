import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  /** The normal button. Clicking it arms the confirmation instead of acting. */
  children: ReactNode
  className?: string
  ariaLabel?: string
  question?: string
  confirmLabel?: string
  onConfirm: () => void
  disabled?: boolean
}

/** A button that asks "Sure?" inline, with confirm and cancel, instead of a browser dialog. Disarms itself after a few seconds. */
export function ConfirmButton({ children, className, ariaLabel, question = 'Sure?', confirmLabel = 'Remove', onConfirm, disabled }: Props) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 6000)
    return () => window.clearTimeout(t)
  }, [armed])

  if (!armed) {
    return (
      <button type="button" className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => setArmed(true)}>
        {children}
      </button>
    )
  }
  return (
    <span className="confirm-inline" role="group">
      <span className="confirm-q">{question}</span>
      <button
        type="button"
        className="btn btn-sm btn-danger-solid"
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setArmed(false)}>
        Keep
      </button>
    </span>
  )
}
