import { useEffect } from 'react'
import { Toast } from './components/Toast'
import { Edit } from './pages/Edit'
import { Home } from './pages/Home'
import { Recipe } from './pages/Recipe'
import { Settings } from './pages/Settings'
import { useRoute } from './router'

export default function App() {
  const route = useRoute()
  const key = JSON.stringify(route)

  useEffect(() => {
    if (route.name !== 'home') window.scrollTo(0, 0)
  }, [key, route.name])

  let page
  switch (route.name) {
    case 'recipe':
      page = <Recipe id={route.id} />
      break
    case 'edit':
      page = <Edit id={route.id} />
      break
    case 'new':
      page = <Edit />
      break
    case 'settings':
      page = <Settings />
      break
    default:
      page = <Home />
  }

  return (
    <>
      {page}
      <Toast />
    </>
  )
}
