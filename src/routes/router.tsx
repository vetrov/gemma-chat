import { createBrowserRouter } from 'react-router-dom'
import { HomeRoute } from './home/HomeRoute'
import { NotFoundRoute } from './not-found/NotFoundRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeRoute />,
  },
  {
    path: '*',
    element: <NotFoundRoute />,
  },
])
