import type { ReactNode } from 'react'
import { Icon } from './Icons'
import { back } from '../router'
import { useStore } from '../store'

interface Props {
  title?: string
  right?: ReactNode
  backTo?: string
}

export function TopBar({ title, right, backTo }: Props) {
  const { saving } = useStore()
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <button className="icon-btn" aria-label="Back" onClick={() => back(backTo)}>
          <Icon.Back />
        </button>
        <div className="topbar-title">{title}</div>
        {saving && <span className="saving">Saving</span>}
        {right}
      </div>
    </header>
  )
}
