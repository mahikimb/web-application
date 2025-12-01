import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import axios from 'axios'

const Navbar = ({ onToggleSidebar = () => {} }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      // Poll for unread count every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [user])

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/api/notifications/unread-count', {
        timeout: 2000, // 2 second timeout to fail fast
        validateStatus: () => true // Don't throw on any status code
      })
      if (res.data && res.data.success) {
        setUnreadCount(res.data.unreadCount || 0)
      } else {
        setUnreadCount(0)
      }
    } catch (error) {
      // Silently handle all errors - backend might not be running
      // Vite proxy errors (ECONNREFUSED) are expected when backend is offline
      // These will show in Vite console but won't break the app
      setUnreadCount(0)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-green-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            {user && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="sm:hidden p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Toggle navigation menu"
              >
                ⋮
              </button>
            )}
            <Link to="/" className="text-xl font-bold hover:text-green-200">
              🌾 Farm Marketplace
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm font-semibold shadow-md transition-colors duration-200 flex items-center gap-2"
                  >
                    <span>⚙️</span>
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                >
                  {user.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-green-700 rounded-md text-sm font-medium hover:bg-green-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-green-700 rounded-md text-sm font-medium hover:bg-green-800"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

