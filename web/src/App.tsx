import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Memberships from './pages/Memberships'
import Benefits from './pages/Benefits'
import Recommendations from './pages/Recommendations'

function App() {
  const location = useLocation()
  
  const isActive = (path: string) => {
    return location.pathname === path
      ? 'bg-indigo-700 text-white'
      : 'text-gray-300 hover:bg-indigo-600 hover:text-white'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-white text-2xl font-bold">Vogo</h1>
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/memberships"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/memberships')}`}
                >
                  Memberships
                </Link>
                <Link
                  to="/benefits"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/benefits')}`}
                >
                  Benefits
                </Link>
                <Link
                  to="/recommendations"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/recommendations')}`}
                >
                  Recommendations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/benefits" element={<Benefits />} />
          <Route path="/recommendations" element={<Recommendations />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

