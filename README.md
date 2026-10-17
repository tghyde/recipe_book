# When you forget what you've cooked before

A tiny recipe book for two people. It is a static site on GitHub Pages at
**https://tghyde.github.io/recipe_book/**. The recipes and photos live in this repository, and the
app commits to it directly through the GitHub API, so there is no server and nothing to pay for.

- `data/recipes.json` — every recipe, including its cook history
- `photos/<recipe id>/<n>.jpg` and `<n>-t.jpg` — photos (resized in the browser before upload) and thumbnails
- `src/` — the app (Vite + React + TypeScript)

## One-time setup: make a token

Both phones use the same token. It only needs to be made once.

1. On GitHub go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   and choose **Generate new token**.
2. Name it something like `recipe book` and pick the longest expiration offered.
3. Under **Repository access** choose **Only select repositories** and pick `recipe_book`.
4. Under **Permissions → Repository permissions** set **Contents** to **Read and write**.
   (Metadata becomes read-only automatically; nothing else is needed.)
5. Generate it and copy the token. It starts with `github_pat_`. GitHub shows it only once, so keep it
   somewhere safe until both phones have it.

## Setup on each iPhone

1. Open https://tghyde.github.io/recipe_book/ in Safari.
2. Tap **Share → Add to Home Screen**. It gets its own icon and opens full screen.
3. Open it from the icon, tap the settings icon (top right), paste the token, and tap **Save and test**.
   The token stays on that phone only; it is never sent anywhere except to GitHub.

That's it. Without a token the app still opens and shows everything, it just can't save.

## How saving works

Every save becomes one commit on `main`. Photos are shrunk on the phone to about 200 KB before upload.
If you both save at the same moment, the second save re-fetches and re-applies itself on top, so
nothing is lost. Each commit also triggers a ~40 second redeploy of the site; you don't have to wait
for it, new photos load straight from the repo in the meantime.

If a save fails (no signal, token expired), the app says so and puts things back the way they were.

## Developing

```bash
npm install
npm run dev
```

Pushes to `main` deploy automatically via GitHub Actions.
