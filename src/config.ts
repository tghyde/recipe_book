export const REPO_OWNER = 'tghyde'
export const REPO_NAME = 'recipe_book'
export const BRANCH = 'main'
export const DATA_PATH = 'data/recipes.json'
export const APP_TITLE = "When you forget what you've cooked before"
export const SHORT_TITLE = 'Cooked before'

/** Where the deployed site lives, e.g. "/recipe_book/". */
export const PAGES_BASE = import.meta.env.BASE_URL
/** Files straight from the repo, available seconds after a commit (before Pages rebuilds). */
export const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/`
export const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
