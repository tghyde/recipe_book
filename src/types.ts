export interface CookEntry {
  id: string
  /** Local calendar date, YYYY-MM-DD */
  date: string
  note?: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  ingredients: string[]
  steps: string[]
  notes: string
  tags: string[]
  /** Repo-relative paths like "photos/<id>/<n>.jpg". Thumbnail is "<n>-t.jpg". */
  photos: string[]
  /** A URL or plain text such as "Nana's handwritten card". */
  source: string
  /** Optional label shown in place of the URL, e.g. "NYT Cooking: one-pot chicken meatballs". */
  sourceTitle?: string
  createdAt: string
  updatedAt: string
  cookLog: CookEntry[]
}

export interface RecipeFile {
  version: 1
  recipes: Recipe[]
}

export type SortKey = 'cooked' | 'newest' | 'alpha' | 'neglected'
