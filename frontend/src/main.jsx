import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { store } from './stores/store.js'
import Home from './pages/Home.jsx'
import Subjects from './pages/Subjects.jsx'
import AuthenticateLayout from './components/AuthenticateLayout.jsx'
import SingleSubject from './pages/singleSubject.jsx'
import AddNotes from './pages/AddNotes.jsx'
import Unitpage from './pages/UnitPage.jsx'
import StorageSync from './pages/StorageSync.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthenticateLayout />,
    children: [
      { index: true,       element: <Home /> },
      { path: 'add',       element: <AddNotes /> },
      { path: 'subjects',  element: <Subjects /> },
      { path: 'storage',   element: <StorageSync /> },
      {path:"subjects/:name" ,element:<SingleSubject/>},
      {path:"unit" ,element:<Unitpage/>},
      { path: 'login',     element: <div /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>,
)
