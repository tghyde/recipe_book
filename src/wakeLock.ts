import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (t: 'release', cb: () => void) => void }

export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

/** Keeps the screen on while `active`, re-acquiring the lock whenever the app returns to the foreground. */
export function useWakeLock(): { active: boolean; toggle: () => void; supported: boolean } {
  const [active, setActive] = useState(false)
  const sentinel = useRef<WakeLockSentinelLike | null>(null)

  const acquire = useCallback(async () => {
    if (!wakeLockSupported) return
    try {
      const nav = navigator as Navigator & { wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }
      sentinel.current = await nav.wakeLock.request('screen')
      sentinel.current.addEventListener('release', () => {
        sentinel.current = null
      })
    } catch {
      setActive(false)
    }
  }, [])

  useEffect(() => {
    if (!active) {
      void sentinel.current?.release()
      sentinel.current = null
      return
    }
    void acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !sentinel.current) void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel.current?.release()
      sentinel.current = null
    }
  }, [active, acquire])

  return { active, toggle: () => setActive((a) => !a), supported: wakeLockSupported }
}
