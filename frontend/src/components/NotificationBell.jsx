import { useState, useEffect, useRef } from 'react'
import { useNotifications } from '../context/NotificationContext'
import { Link } from 'react-router-dom'

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadNotifications = notifications.filter(n => !n.isRead).slice(0, 10)
  const recentNotifications = notifications.slice(0, 10)

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order':
        return '🛒'
      case 'order_confirmed':
        return '✅'
      case 'order_completed':
        return '🎉'
      case 'order_cancelled':
        return '❌'
      case 'new_product':
        return '🆕'
      case 'price_drop':
        return '💰'
      case 'new_review':
        return '⭐'
      case 'new_message':
        return '💬'
      default:
        return '🔔'
    }
  }

  const getNotificationLink = (notification) => {
    if (notification.data?.url) {
      return notification.data.url
    }
    switch (notification.type) {
      case 'new_order':
      case 'order_confirmed':
      case 'order_completed':
      case 'order_cancelled':
        return '/orders'
      case 'new_product':
        return notification.data?.productId ? `/products/${notification.data.productId}` : '/products'
      case 'price_drop':
        return notification.data?.productId ? `/products/${notification.data.productId}` : '/wishlists'
      case 'new_message':
        return '/messages'
      default:
        return '/dashboard'
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xl">🔔</span>
        <span className="text-sm font-medium">Notifications</span>
        {unreadCount > 0 && (
          <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {unreadNotifications.length > 0 ? (
                unreadNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to={getNotificationLink(notification)}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id)
                      }
                      setIsOpen(false)
                    }}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start">
                      <span className="text-2xl mr-3">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </Link>
                ))
              ) : (
                recentNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to={getNotificationLink(notification)}
                    onClick={() => setIsOpen(false)}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start">
                      <span className="text-2xl mr-3">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          <div className="p-3 border-t border-gray-200 text-center">
            <Link
              to="/notifications/preferences"
              onClick={() => setIsOpen(false)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Notification Preferences
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell

