import type { ReactNode } from 'react'
import { Icon } from './Icons'
import { href, navigate } from '../router'
import { useStore } from '../store'

interface Props {
  title?: string
  right?: ReactNode
  /** Where the back arrow goes. Always a fixed place, never browser history, so toggling edit/view can't stack up. */
  backTo?: string
}

export function TopBar({ title, right, backTo }: Props) {
  const { saving } = useStore()
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <button className="icon-btn" aria-label="Back" onClick={() => navigate(backTo ?? href.home)}>
          <Icon.Back />
        </button>
        <div className="topbar-title">{title}</div>
        {saving && <span className="saving">Saving</span>}
        {right}
      </div>
    </header>
  )
}
