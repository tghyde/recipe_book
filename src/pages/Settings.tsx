import { useState } from 'react'
import { Icon } from '../components/Icons'
import { TopBar } from '../components/TopBar'
import { REPO_NAME, REPO_OWNER } from '../config'
import { checkAccess } from '../github'
import { applyTheme, refresh, saveToken, toast, useStore, type Theme } from '../store'
import { wakeLockSupported } from '../wakeLock'

const THEMES: Array<{ key: Theme; label: string }> = [
  { key: 'auto', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
]

export function Settings() {
  const { token, theme, lastSync, recipes, refreshing } = useStore()
  const [draft, setDraft] = useState(token ?? '')
  const [testing, setTesting] = useState(false)
  const standalone = window.matchMedia('(display-mode: standalone)').matches

  const save = async () => {
    saveToken(draft)
    if (!draft.trim()) {
      toast('Token removed')
      return
    }
    setTesting(true)
    try {
      const { canWrite } = await checkAccess()
      toast(canWrite ? 'Connected. Saving is on.' : 'Token works but cannot write to the repo.', canWrite ? 'ok' : 'err')
      void refresh()
    } catch (e) {
      toast((e as Error).message, 'err')
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <TopBar title="Settings" backTo="#/" />
      <div className="container">
        <h1 className="page-title">Settings</h1>

        <section className="panel">
          <h2>GitHub token</h2>
          <p>
            Recipes are saved straight into the <code>{REPO_OWNER}/{REPO_NAME}</code> repository. Paste a fine-grained personal access token with
            read and write access to that repo’s contents. It stays on this device only.
          </p>
          <input
            className="input"
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            placeholder="github_pat_…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row">
            <button className="btn btn-primary" onClick={() => void save()} disabled={testing || draft === (token ?? '')}>
              <Icon.Check /> {testing ? 'Checking…' : 'Save and test'}
            </button>
            {token && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setDraft('')
                  saveToken('')
                  toast('Token removed')
                }}
              >
                Remove
              </button>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Status</h2>
          <div className="kv">
            <span>Saving</span>
            <span>
              <i className={`dot ${token ? 'ok' : 'bad'}`} />
              {token ? 'On' : 'Read-only (no token)'}
            </span>
          </div>
          <div className="kv">
            <span>Recipes</span>
            <span>{recipes.length}</span>
          </div>
          <div className="kv">
            <span>Last synced</span>
            <span>{lastSync ? new Date(lastSync).toLocaleString() : 'Never'}</span>
          </div>
          <div className="kv">
            <span>Keep screen on</span>
            <span>{wakeLockSupported ? 'Supported' : 'Not supported in this browser'}</span>
          </div>
          <div className="row">
            <button className="btn btn-secondary" onClick={() => void refresh()} disabled={refreshing}>
              <Icon.Refresh /> {refreshing ? 'Refreshing…' : 'Refresh now'}
            </button>
            <a className="btn btn-ghost" href={`https://github.com/${REPO_OWNER}/${REPO_NAME}`} target="_blank" rel="noreferrer">
              <Icon.Link /> Open repo
            </a>
          </div>
        </section>

        <section className="panel">
          <h2>Appearance</h2>
          <p>Auto follows your phone’s light and dark setting.</p>
          <div className="segmented">
            {THEMES.map((t) => (
              <button key={t.key} className={theme === t.key ? 'on' : ''} onClick={() => applyTheme(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {!standalone && (
          <section className="panel">
            <h2>Put it on the home screen</h2>
            <p>It works best as an app with its own icon, and stays signed in that way.</p>
            <ol>
              <li>Open this page in Safari.</li>
              <li>Tap the Share button.</li>
              <li>Choose “Add to Home Screen”.</li>
              <li>Open it from the icon and paste the token again there.</li>
            </ol>
          </section>
        )}
      </div>
    </>
  )
}
