import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const Wishlists = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { token } = useParams()
  const [isSharedView, setIsSharedView] = useState(false)
  const [sharedWishlist, setSharedWishlist] = useState(null)
  const [wishlists, setWishlists] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWishlist, setSelectedWishlist] = useState(null)
  const [priceAlerts, setPriceAlerts] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWishlistName, setNewWishlistName] = useState('')
  const [newWishlistDescription, setNewWishlistDescription] = useState('')
  const [newWishlistPublic, setNewWishlistPublic] = useState(false)

  useEffect(() => {
    if (token) {
      // Shared wishlist view
      setIsSharedView(true)
      fetchSharedWishlist(token)
    } else if (user) {
      // User's own wishlists
      fetchWishlists()
    } else {
      navigate('/login')
    }
  }, [user, token])

  const fetchSharedWishlist = async (shareToken) => {
    try {
      const res = await axios.get(`/api/wishlists/share/${shareToken}`)
      if (res.data.success) {
        setSharedWishlist(res.data.wishlist)
      }
    } catch (error) {
      console.error('Error fetching shared wishlist:', error)
      alert('Shared wishlist not found or is no longer available')
    } finally {
      setLoading(false)
    }
  }

  const fetchWishlists = async () => {
    try {
      const res = await axios.get('/api/wishlists')
      setWishlists(res.data.wishlists || [])
      if (res.data.wishlists && res.data.wishlists.length > 0 && !selectedWishlist) {
        setSelectedWishlist(res.data.wishlists[0].id)
      }
    } catch (error) {
      console.error('Error fetching wishlists:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPriceAlerts = async (wishlistId) => {
    try {
      const res = await axios.get(`/api/wishlists/${wishlistId}/price-alerts`)
      setPriceAlerts(res.data.alerts || [])
    } catch (error) {
      console.error('Error fetching price alerts:', error)
    }
  }

  useEffect(() => {
    if (selectedWishlist) {
      fetchPriceAlerts(selectedWishlist)
    }
  }, [selectedWishlist])

  const handleCreateWishlist = async () => {
    try {
      const res = await axios.post('/api/wishlists', {
        name: newWishlistName || 'My Wishlist',
        description: newWishlistDescription,
        isPublic: newWishlistPublic
      })
      if (res.data.success) {
        setShowCreateModal(false)
        setNewWishlistName('')
        setNewWishlistDescription('')
        setNewWishlistPublic(false)
        fetchWishlists()
      }
    } catch (error) {
      console.error('Error creating wishlist:', error)
      alert(error.response?.data?.message || 'Failed to create wishlist')
    }
  }

  const handleDeleteWishlist = async (wishlistId) => {
    if (!window.confirm('Are you sure you want to delete this wishlist?')) {
      return
    }
    try {
      const res = await axios.delete(`/api/wishlists/${wishlistId}`)
      if (res.data.success) {
        fetchWishlists()
        if (selectedWishlist === wishlistId) {
          setSelectedWishlist(null)
        }
      }
    } catch (error) {
      console.error('Error deleting wishlist:', error)
      alert(error.response?.data?.message || 'Failed to delete wishlist')
    }
  }

  const handleRemoveItem = async (wishlistId, itemId) => {
    try {
      const res = await axios.delete(`/api/wishlists/${wishlistId}/items/${itemId}`)
      if (res.data.success) {
        fetchWishlists()
      }
    } catch (error) {
      console.error('Error removing item:', error)
      alert(error.response?.data?.message || 'Failed to remove item')
    }
  }

  const handleShareWishlist = async (wishlist) => {
    const shareUrl = `${window.location.origin}/wishlists/share/${wishlist.shareToken}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard!')
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Share link copied to clipboard!')
    }
  }

  const currentWishlist = isSharedView ? sharedWishlist : wishlists.find(w => w.id === selectedWishlist)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  // Shared wishlist view
  if (isSharedView && sharedWishlist) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{sharedWishlist.name}</h1>
          {sharedWishlist.description && (
            <p className="text-gray-600 mt-2">{sharedWishlist.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Shared by {sharedWishlist.user?.name}
          </p>
        </div>

        {sharedWishlist.items && sharedWishlist.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedWishlist.items.map((item) => {
              const product = item.product
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <Link to={`/products/${product?.id}`}>
                    {product?.images && product.images.length > 0 && (
                      <img
                        src={`http://localhost:5000${product.images[0]}`}
                        alt={product?.name}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    )}
                  </Link>
                  <Link to={`/products/${product?.id}`}>
                    <h3 className="font-semibold text-gray-900 mb-1">{product?.name}</h3>
                  </Link>
                  <p className="text-gray-900 font-semibold">${item.currentPrice || product?.price}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">This wishlist is empty</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Wishlists</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          + Create Wishlist
        </button>
      </div>

      {/* Price Alerts Banner */}
      {priceAlerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">💰 Price Drop Alerts!</h3>
          <div className="space-y-2">
            {priceAlerts.map((alert, index) => (
              <div key={index} className="text-yellow-700">
                <strong>{alert.item.product?.name}</strong> - Price dropped by ${alert.priceDrop.toFixed(2)} ({alert.percentage}% off!)
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Wishlists Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Wishlists</h2>
            <div className="space-y-2">
              {wishlists.map((wishlist) => (
                <div
                  key={wishlist.id}
                  className={`p-3 rounded-md cursor-pointer ${
                    selectedWishlist === wishlist.id
                      ? 'bg-green-100 border-2 border-green-600'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedWishlist(wishlist.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{wishlist.name}</h3>
                      <p className="text-sm text-gray-500">
                        {wishlist.items?.length || 0} items
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWishlist(wishlist.id)
                      }}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wishlist Items */}
        <div className="lg:col-span-3">
          {currentWishlist ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentWishlist.name}</h2>
                  {currentWishlist.description && (
                    <p className="text-gray-600 mt-1">{currentWishlist.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleShareWishlist(currentWishlist)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    🔗 Share
                  </button>
                </div>
              </div>

              {currentWishlist.items && currentWishlist.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentWishlist.items.map((item) => {
                    const product = item.product
                    const priceDrop = item.addedAtPrice && item.currentPrice
                      ? parseFloat(item.addedAtPrice) - parseFloat(item.currentPrice)
                      : 0
                    const hasPriceDrop = priceDrop > 0

                    return (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <Link to={`/products/${product?.id}`}>
                          {product?.images && product.images.length > 0 && (
                            <img
                              src={`http://localhost:5000${product.images[0]}`}
                              alt={product?.name}
                              className="w-full h-32 object-cover rounded-md mb-2"
                            />
                          )}
                        </Link>
                        <Link to={`/products/${product?.id}`}>
                          <h3 className="font-semibold text-gray-900 mb-1">{product?.name}</h3>
                        </Link>
                        <div className="mb-2">
                          {hasPriceDrop ? (
                            <div>
                              <span className="text-red-600 font-bold">${item.currentPrice}</span>
                              <span className="text-gray-400 line-through ml-2">${item.addedAtPrice}</span>
                              <span className="text-green-600 ml-2">-${priceDrop.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-900 font-semibold">${item.currentPrice || product?.price}</span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-sm text-gray-600 mb-2">{item.notes}</p>
                        )}
                        <div className="flex justify-between items-center mt-2">
                          <button
                            onClick={() => handleRemoveItem(currentWishlist.id, item.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                          <Link
                            to={`/orders/request/${product?.id}`}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Order Now
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">This wishlist is empty</p>
                  <Link
                    to="/products"
                    className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Browse Products
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg mb-4">No wishlist selected</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create Your First Wishlist
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Wishlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Wishlist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newWishlistName}
                  onChange={(e) => setNewWishlistName(e.target.value)}
                  placeholder="My Wishlist"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newWishlistDescription}
                  onChange={(e) => setNewWishlistDescription(e.target.value)}
                  placeholder="Optional description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newWishlistPublic}
                    onChange={(e) => setNewWishlistPublic(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Make this wishlist public</span>
                </label>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateWishlist}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewWishlistName('')
                    setNewWishlistDescription('')
                    setNewWishlistPublic(false)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Wishlists

