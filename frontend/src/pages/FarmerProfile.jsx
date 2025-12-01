import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import FavoriteButton from '../components/FavoriteButton'

const FarmerProfile = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    fetchFarmerProfile()
  }, [id])

  const fetchFarmerProfile = async () => {
    try {
      const res = await axios.get(`/api/users/farmer/${id}/profile`)
      if (res.data.success) {
        setFarmer(res.data.farmer)
        setIsFollowing(res.data.farmer.isFollowing || false)
      }
    } catch (error) {
      console.error('Error fetching farmer profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      setFollowing(true)
      if (isFollowing) {
        await axios.delete(`/api/follows/${id}`)
        setIsFollowing(false)
        setFarmer(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            totalFollowers: prev.stats.totalFollowers - 1
          }
        }))
      } else {
        await axios.post(`/api/follows/${id}`)
        setIsFollowing(true)
        setFarmer(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            totalFollowers: prev.stats.totalFollowers + 1
          }
        }))
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      alert(error.response?.data?.message || 'Failed to update follow status')
    } finally {
      setFollowing(false)
    }
  }

  const getVerificationBadge = (badge) => {
    switch (badge) {
      case 'verified':
        return { text: '✓ Verified Farmer', color: 'bg-blue-100 text-blue-800' }
      case 'premium':
        return { text: '⭐ Premium Farmer', color: 'bg-yellow-100 text-yellow-800' }
      case 'organic_certified':
        return { text: '🌱 Organic Certified', color: 'bg-green-100 text-green-800' }
      default:
        return null
    }
  }

  const getLocationMapUrl = (location) => {
    if (!location || !location.city || !location.state) return null
    const address = `${location.city}, ${location.state}`
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6d_s6H4cT0J0i0U&q=${encodeURIComponent(address)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!farmer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Farmer not found</p>
      </div>
    )
  }

  const verificationBadge = getVerificationBadge(farmer.verificationBadge)
  const mapUrl = getLocationMapUrl(farmer.profile?.farmLocation)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{farmer.name}</h1>
              {farmer.isVerified && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✓ Verified
                </span>
              )}
              {verificationBadge && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${verificationBadge.color}`}>
                  {verificationBadge.text}
                </span>
              )}
            </div>
            {farmer.profile?.farmLocation && (
              <p className="text-gray-600 mb-2">
                📍 {farmer.profile.farmLocation.city}, {farmer.profile.farmLocation.state}
              </p>
            )}
            <p className="text-gray-500 text-sm">
              Member since {new Date(farmer.createdAt).toLocaleDateString()}
            </p>
          </div>
          {user && user.role === 'buyer' && (
            <button
              onClick={handleFollowToggle}
              disabled={following}
              className={`mt-4 md:mt-0 px-6 py-2 rounded-md font-medium ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {following ? '...' : isFollowing ? '✓ Following' : '+ Follow Farmer'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{farmer.stats?.totalProducts || 0}</p>
          <p className="text-sm text-gray-600">Products</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{farmer.stats?.totalOrders || 0}</p>
          <p className="text-sm text-gray-600">Orders</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-2xl font-bold text-yellow-600">
              {farmer.stats?.averageRating || '0.0'}
            </span>
            <span className="text-yellow-500">★</span>
          </div>
          <p className="text-sm text-gray-600">{farmer.stats?.totalReviews || 0} Reviews</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{farmer.stats?.totalFollowers || 0}</p>
          <p className="text-sm text-gray-600">Followers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Bio and Story */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio Section */}
          {farmer.bio && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{farmer.bio}</p>
            </div>
          )}

          {/* Farm Story Section */}
          {farmer.farmStory && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Farm Story</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{farmer.farmStory}</p>
            </div>
          )}

          {/* Location Map */}
          {farmer.profile?.farmLocation && (farmer.profile.farmLocation.city || farmer.profile.farmLocation.state) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Farm Location</h2>
              {farmer.profile.farmLocation.address && (
                <p className="mb-4 text-gray-600">
                  {farmer.profile.farmLocation.address}
                </p>
              )}
              <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${farmer.profile.farmLocation.city || ''}, ${farmer.profile.farmLocation.state || ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View on Google Maps
                </a>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {farmer.profile.farmLocation.city}, {farmer.profile.farmLocation.state}
                {farmer.profile.farmLocation.zipCode && ` ${farmer.profile.farmLocation.zipCode}`}
              </p>
            </div>
          )}

          {/* Products Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Products ({farmer.products?.length || 0})</h2>
            </div>
            {farmer.products && farmer.products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {farmer.products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative"
                  >
                    <div className="absolute top-2 right-2 z-10">
                      <FavoriteButton productId={product.id} />
                    </div>
                    {product.images && product.images.length > 0 && (
                      <img
                        src={`http://localhost:5000${product.images[0]}`}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-green-600 font-bold">${product.price} / {product.unit}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Available: {product.quantity} {product.unit}
                    </p>
                    {product.averageRating && parseFloat(product.averageRating) > 0 && (
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm text-gray-600 ml-1">
                          {parseFloat(product.averageRating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No products available</p>
            )}
          </div>
        </div>

        {/* Right Column - Reviews */}
        <div className="space-y-6">
          {/* Recent Reviews */}
          {farmer.recentReviews && farmer.recentReviews.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Reviews</h2>
              <div className="space-y-4">
                {farmer.recentReviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{review.buyer?.name || 'Anonymous'}</p>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-sm ${
                              star <= review.rating ? 'text-yellow-500' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 mb-1">{review.comment}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {review.product?.name} • {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact</h2>
            <div className="space-y-2">
              <p className="text-gray-600">
                <strong>Email:</strong> {farmer.email}
              </p>
              <p className="text-gray-600">
                <strong>Phone:</strong> {farmer.phone}
              </p>
              {user && (
                <button
                  onClick={() => navigate(`/messages?userId=${farmer.id}`)}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  💬 Send Message
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FarmerProfile

