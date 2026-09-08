import { createBrowserRouter } from 'react-router-dom';
import { Home } from './Home';
import { NotFound } from './NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '*',
    Component: NotFound,
  },
]);
