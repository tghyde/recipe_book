import type { Recipe } from '../types'
import { lastCooked, relativeDays } from '../util'
import { href } from '../router'
import { Photo } from './Photo'

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const last = lastCooked(recipe)
  const times = recipe.cookLog.length
  const initial = (recipe.title.trim()[0] ?? '?').toUpperCase()
  return (
    <a className="card" href={href.recipe(recipe.id)}>
      <div className="card-photo">
        {recipe.photos[0] ? (
          <Photo path={recipe.photos[0]} thumb alt="" fallback={initial} />
        ) : (
          <div className="photo-missing">{initial}</div>
        )}
      </div>
      <div className="card-body">
        <h3>{recipe.title || 'Untitled'}</h3>
        {last ? (
          <div className="meta">
            Cooked {times === 1 ? 'once' : `${times}×`} · {relativeDays(last)}
          </div>
        ) : (
          <div className="meta never">Not cooked yet</div>
        )}
        {recipe.tags.length > 0 && (
          <div className="tags">
            {recipe.tags.slice(0, 2).map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
            {recipe.tags.length > 2 && <span className="tag more">+{recipe.tags.length - 2}</span>}
          </div>
        )}
      </div>
    </a>
  )
}
