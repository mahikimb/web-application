import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const NotificationPreferences = () => {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const res = await axios.get('/api/notifications/preferences')
      if (res.data.success) {
        setPreferences(res.data.preferences)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await axios.put('/api/notifications/preferences', preferences)
      if (res.data.success) {
        alert('Preferences saved successfully!')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!preferences) {
    return <div>Error loading preferences</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Notification Preferences</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Orders</label>
              <p className="text-sm text-gray-500">Get notified when you receive a new order</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailNewOrder}
              onChange={(e) => handleChange('emailNewOrder', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Order Confirmed</label>
              <p className="text-sm text-gray-500">Get notified when your order is confirmed</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailOrderConfirmed}
              onChange={(e) => handleChange('emailOrderConfirmed', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Order Completed</label>
              <p className="text-sm text-gray-500">Get notified when your order is completed</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailOrderCompleted}
              onChange={(e) => handleChange('emailOrderCompleted', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Order Cancelled</label>
              <p className="text-sm text-gray-500">Get notified when your order is cancelled</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailOrderCancelled}
              onChange={(e) => handleChange('emailOrderCancelled', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Products from Followed Farmers</label>
              <p className="text-sm text-gray-500">Get notified when followed farmers add new products</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailNewProduct}
              onChange={(e) => handleChange('emailNewProduct', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Price Drops</label>
              <p className="text-sm text-gray-500">Get notified when prices drop on your wishlist items</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailPriceDrop}
              onChange={(e) => handleChange('emailPriceDrop', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Reviews</label>
              <p className="text-sm text-gray-500">Get notified when you receive a new review</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailNewReview}
              onChange={(e) => handleChange('emailNewReview', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Messages</label>
              <p className="text-sm text-gray-500">Get notified when you receive a new message</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailNewMessage}
              onChange={(e) => handleChange('emailNewMessage', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4 mt-8">Push Notifications (In-App)</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Orders</label>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushNewOrder}
              onChange={(e) => handleChange('pushNewOrder', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Order Updates</label>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushOrderConfirmed && preferences.pushOrderCompleted && preferences.pushOrderCancelled}
              onChange={(e) => {
                handleChange('pushOrderConfirmed', e.target.checked)
                handleChange('pushOrderCompleted', e.target.checked)
                handleChange('pushOrderCancelled', e.target.checked)
              }}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Products</label>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushNewProduct}
              onChange={(e) => handleChange('pushNewProduct', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Price Drops</label>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushPriceDrop}
              onChange={(e) => handleChange('pushPriceDrop', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Reviews</label>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushNewReview}
              onChange={(e) => handleChange('pushNewReview', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">New Messages</label>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushNewMessage}
              onChange={(e) => handleChange('pushNewMessage', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationPreferences

