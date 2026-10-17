import { useStore } from '../store'

export function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div className={`toast ${toast.kind}`} key={toast.id} role="status">
      {toast.text}
    </div>
  )
}
