import { Link } from 'react-router-dom'

/**
 * 404 Not Found Page
 */
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-5xl font-bold text-slate-900 mb-4">404</h1>
      <p className="text-xl text-slate-600 mb-8">Page not found</p>
      <Link 
        to="/"
        className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        Go back home
      </Link>
    </div>
  )
}

export default NotFound
