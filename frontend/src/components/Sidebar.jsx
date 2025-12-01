import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const Sidebar = ({ isOpen = true, onClose = () => {} }) => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return null
  }

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    if (path === '/products') {
      // Active for /products but not for /products/add or /products/edit
      return location.pathname === '/products' || 
             (location.pathname.startsWith('/products/') && 
              !location.pathname.startsWith('/products/add') && 
              !location.pathname.startsWith('/products/edit'))
    }
    return location.pathname.startsWith(path)
  }

  const navItems = [
    {
      path: '/products',
      label: 'Products',
      icon: '🛒',
      show: true
    },
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
      show: true
    },
    {
      path: '/orders',
      label: 'Orders',
      icon: '📦',
      show: true
    },
    {
      path: '/messages',
      label: 'Messages',
      icon: '💬',
      show: true
    },
    {
      path: '/wishlists',
      label: 'Wishlists',
      icon: '❤️',
      show: user.role === 'buyer'
    },
    {
      path: '/delivery-addresses',
      label: 'Delivery Addresses',
      icon: '📍',
      show: user.role === 'buyer'
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: '📈',
      show: true
    }
  ]

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity sm:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg border-r border-gray-200 z-50 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } sm:translate-x-0`}
      >
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          if (!item.show) return null
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-green-100 text-green-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
        
        {/* Notification Bell */}
        <div className="pt-4 border-t border-gray-200 mt-4">
          <NotificationBell />
        </div>

        {/* Additional Links for Farmers */}
        {user.role === 'farmer' && (
          <Link
            to="/products/add"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === '/products/add'
                ? 'bg-green-100 text-green-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">➕</span>
            <span className="text-sm font-medium">Add Product</span>
          </Link>
        )}

        {/* Admin Link */}
        {user.role === 'admin' && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === '/admin'
                ? 'bg-green-100 text-green-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">⚙️</span>
            <span className="text-sm font-medium">Admin</span>
          </Link>
        )}
      </nav>
      </div>
    </>
  )
}

export default Sidebar

