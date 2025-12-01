import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import FavoriteButton from '../components/FavoriteButton'

const ProductDetails = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [checkingFollow, setCheckingFollow] = useState(true)

  useEffect(() => {
    fetchProduct()
    fetchReviews()
    if (user && product?.farmer?.id) {
      checkFollowStatus()
    }
  }, [id, user, product?.farmer?.id])

  const checkFollowStatus = async () => {
    if (!user || !product?.farmer?.id) {
      setCheckingFollow(false)
      return
    }
    try {
      const res = await axios.get(`/api/follows/check/${product.farmer.id}`)
      setIsFollowing(res.data.isFollowing)
    } catch (error) {
      console.error('Error checking follow status:', error)
    } finally {
      setCheckingFollow(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      if (isFollowing) {
        await axios.delete(`/api/follows/${product.farmer.id}`)
        setIsFollowing(false)
        alert('Unfollowed farmer')
      } else {
        await axios.post(`/api/follows/${product.farmer.id}`)
        setIsFollowing(true)
        alert('Now following farmer! You\'ll be notified of new products.')
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      alert(error.response?.data?.message || 'Failed to update follow status')
    }
  }

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`/api/products/${id}`)
      setProduct(res.data.product)
    } catch (error) {
      console.error('Error fetching product:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`/api/reviews/product/${id}`)
      setReviews(res.data.reviews)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleRequestOrder = () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'buyer') {
      alert('Only buyers can place orders')
      return
    }
    navigate(`/orders/request/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Product not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/products" className="text-green-600 hover:text-green-700 mb-4 inline-block">
        ← Back to Products
      </Link>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2">
            {product.images && product.images.length > 0 ? (
              <img
                src={`http://localhost:5000${product.images[0]}`}
                alt={product.name}
                className="w-full h-96 object-cover"
              />
            ) : (
              <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>
          <div className="md:w-1/2 p-8">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <FavoriteButton productId={product.id} />
            </div>
            <div className="mb-4">
              <span className="text-2xl font-bold text-green-600">
                ${product.price} / {product.unit}
              </span>
            </div>
            <div className="mb-4">
              <p className="text-gray-600">
                <strong>Category:</strong> {product.category}
              </p>
              <p className="text-gray-600">
                <strong>Available:</strong> {product.quantity} {product.unit}
              </p>
              <p className="text-gray-600">
                <strong>Location:</strong> {product.farmLocation?.city}, {product.farmLocation?.state}
              </p>
              <p className="text-gray-600">
                <strong>Harvest Date:</strong> {new Date(product.harvestDate).toLocaleDateString()}
              </p>
              {product.isOrganic && (
                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  Organic
                </span>
              )}
            </div>
            {product.averageRating && parseFloat(product.averageRating) > 0 && (
              <div className="mb-4">
                <div className="flex items-center">
                  <span className="text-yellow-500 text-2xl">★</span>
                  <span className="text-gray-600 ml-2">
                    {parseFloat(product.averageRating).toFixed(1)} ({product.totalReviews || 0} reviews)
                  </span>
                </div>
              </div>
            )}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{product.description}</p>
            </div>
            {product.qualityNotes && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Quality Notes</h3>
                <p className="text-gray-600">{product.qualityNotes}</p>
              </div>
            )}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Farmer</h3>
              <Link
                to={`/farmer/${product.farmer?.id}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {product.farmer?.name}
              </Link>
              <p className="text-gray-600">{product.farmer?.email}</p>
              <p className="text-gray-600">{product.farmer?.phone}</p>
              <div className="flex gap-2 mt-2">
                <Link
                  to={`/farmer/${product.farmer?.id}`}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  View Profile
                </Link>
                {user?.role === 'buyer' && !checkingFollow && (
                  <button
                    onClick={handleFollowToggle}
                    className={`px-4 py-2 rounded-md font-medium text-sm ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                )}
              </div>
            </div>
            {user?.role === 'buyer' && product.status === 'active' && (
              <>
                <button
                  onClick={handleRequestOrder}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold mb-2"
                >
                  Request Order
                </button>
                <button
                  onClick={() => navigate(`/messages?userId=${product.farmer?.id}&productId=${product.id}`)}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  💬 Message Farmer
                </button>
              </>
            )}
            {user?.role === 'farmer' && product.farmer?.id === user.id && (
              <Link
                to={`/products/edit/${product.id}`}
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold text-center"
              >
                Edit Product
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          {product.averageRating && parseFloat(product.averageRating) > 0 && (
            <div className="flex items-center">
              <div className="flex items-center mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-2xl ${
                      star <= Math.round(parseFloat(product.averageRating))
                        ? 'text-yellow-500'
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-lg font-semibold text-gray-700">
                {parseFloat(product.averageRating).toFixed(1)} out of 5
              </span>
              <span className="ml-2 text-gray-500">
                ({product.totalReviews || 0} {product.totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>
        
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg mb-2">No reviews yet</p>
            <p className="text-gray-400 text-sm">Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <div className="flex items-center mr-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-lg ${
                            star <= review.rating ? 'text-yellow-500' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{review.buyer?.name || 'Anonymous'}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                {review.comment ? (
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                ) : (
                  <p className="text-gray-400 italic">No comment provided</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductDetails

