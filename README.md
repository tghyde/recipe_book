# When you forget what you've cooked before

A tiny recipe book for two people. It is a static site on GitHub Pages; the recipes and photos
live in this repository and the app commits to it directly through the GitHub API.

- `data/recipes.json` — every recipe, including its cook history
- `photos/<recipe id>/<n>.jpg` and `<n>-t.jpg` — photos (resized in the browser before upload) and thumbnails
- `src/` — the app (Vite + React + TypeScript)

## Setup on a phone

1. Open the site in Safari, Share → Add to Home Screen.
2. Open it from the icon, go to Settings, paste a GitHub fine-grained personal access token
   with **Contents: read and write** on this repo only.

## Developing

```bash
npm install
npm run dev
```

Pushes to `main` deploy automatically via GitHub Actions.
