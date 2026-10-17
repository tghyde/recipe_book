import { useMemo, useState } from 'react'
import { photoSources } from '../images'

interface Props {
  path: string
  thumb?: boolean
  alt?: string
  eager?: boolean
  /** Shown if no source loads (e.g. a serif initial). */
  fallback?: string
}

/** Tries a locally cached blob, then the deployed site, then the raw repo file. */
export function Photo({ path, thumb = false, alt = '', eager = false, fallback }: Props) {
  const sources = useMemo(() => photoSources(path, thumb), [path, thumb])
  const [i, setI] = useState(0)
  if (i >= sources.length) return <div className="photo-missing">{fallback ?? ''}</div>
  return (
    <img
      key={sources[i]}
      src={sources[i]}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setI((n) => n + 1)}
    />
  )
}
