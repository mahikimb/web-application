import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

const Dashboard = () => {
  const { user } = useAuth()
  const location = useLocation()
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    completedOrders: 0,
    totalProducts: 0
  })
  const [myProducts, setMyProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      if (user?.role === 'farmer') {
        console.log('Dashboard - Fetching stats for farmer:', user.id)
        
        const [productsRes, ordersRes] = await Promise.all([
          axios.get('/api/products/farmer/my-products'),
          axios.get('/api/orders')
        ])
        
        console.log('Dashboard - Products response:', productsRes.data)
        console.log('Dashboard - Orders response:', ordersRes.data)
        
        if (!productsRes.data.success) {
          console.error('Dashboard - Products API returned success: false')
          setError('Failed to fetch products. Please try again.')
          return
        }
        
        if (!ordersRes.data.success) {
          console.error('Dashboard - Orders API returned success: false')
          setError('Failed to fetch orders. Please try again.')
          return
        }
        
        const productsCount = productsRes.data.count || productsRes.data.products?.length || 0
        const productsList = Array.isArray(productsRes.data.products) ? productsRes.data.products : []
        
        const orders = Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders : []
        const pendingOrders = orders.filter(o => o.status === 'pending').length
        const totalOrders = ordersRes.data.total || ordersRes.data.count || orders.length
        
        console.log('Dashboard - Setting stats:', {
          products: productsCount,
          orders: totalOrders,
          pendingOrders,
          productsListLength: productsList.length,
          ordersLength: orders.length
        })
        
        setStats({
          products: productsCount,
          orders: totalOrders,
          pendingOrders
        })
        setMyProducts(productsList)
        setError('') // Clear any previous errors
      } else if (user?.role === 'buyer') {
        const [ordersRes, productsRes] = await Promise.all([
          axios.get('/api/orders'),
          axios.get('/api/products')
        ])
        
        console.log('Dashboard - Buyer Orders response:', ordersRes.data)
        console.log('Dashboard - Buyer Products response:', productsRes.data)
        
        if (!ordersRes.data.success || !productsRes.data.success) {
          console.error('Dashboard - API returned success: false')
          setError('Failed to fetch dashboard data. Please try again.')
          return
        }
        
        const orders = Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders : []
        const confirmedOrders = orders.filter(o => o.status === 'confirmed').length
        const completedOrders = orders.filter(o => o.status === 'completed').length
        const pendingOrders = orders.filter(o => o.status === 'pending').length
        const totalOrders = ordersRes.data.total || ordersRes.data.count || orders.length
        const totalProducts = productsRes.data.total || productsRes.data.count || (productsRes.data.products?.length || 0)
        
        console.log('Dashboard - Buyer stats:', {
          orders: totalOrders,
          pendingOrders,
          confirmedOrders,
          completedOrders,
          totalProducts,
          ordersLength: orders.length
        })
        
        setStats({
          orders: totalOrders,
          pendingOrders,
          confirmedOrders,
          completedOrders,
          totalProducts
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      console.error('Error response:', error.response?.data)
      setError(error.response?.data?.message || 'Failed to fetch dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      console.log('Dashboard - useEffect triggered, user:', user.id, user.role)
      setLoading(true)
      fetchStats()
    }
  }, [user, location.pathname, fetchStats])

  // Refresh when location state changes (e.g., after adding product)
  useEffect(() => {
    if (user && location.state?.refresh) {
      console.log('Dashboard - Refresh triggered from location state')
      setLoading(true)
      fetchStats()
    }
  }, [location.state, user, fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome, {user?.name}!
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {user?.role === 'farmer' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">My Products</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.products}</p>
              <Link
                to="/products/add"
                className="text-green-600 hover:text-green-700 text-sm mt-4 inline-block"
              >
                Add Product →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.orders}</p>
              <Link
                to="/orders"
                className="text-blue-600 hover:text-blue-700 text-sm mt-4 inline-block"
              >
                View Orders →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">Pending Orders</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingOrders}</p>
              <Link
                to="/orders"
                className="text-yellow-600 hover:text-yellow-700 text-sm mt-4 inline-block"
              >
                Review Orders →
              </Link>
            </div>
          </div>

          {/* My Products List */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Products</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setLoading(true)
                    fetchStats()
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : '🔄 Refresh'}
                </button>
                <Link
                  to="/products/add"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  + Add New Product
                </Link>
              </div>
            </div>
            {myProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You haven't added any products yet.</p>
                <Link
                  to="/products/add"
                  className="inline-block px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Your First Product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myProducts.slice(0, 6).map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {product.images && product.images.length > 0 && (
                      <img
                        src={`http://localhost:5000${product.images[0]}`}
                        alt={product.name}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                      <p className="text-green-600 font-bold mb-1">
                        ${product.price} / {product.unit}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Quantity: {product.quantity} {product.unit}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' :
                          product.status === 'sold_out' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          product.isApproved ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Link
                          to={`/products/${product.id}`}
                          className="flex-1 text-center px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                        >
                          View
                        </Link>
                        <Link
                          to={`/products/edit/${product.id}`}
                          className="flex-1 text-center px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {myProducts.length > 6 && (
              <div className="mt-4 text-center">
                <Link
                  to="/products"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  View All Products →
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {user?.role === 'buyer' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalProducts}</p>
              <Link
                to="/products"
                className="text-green-600 hover:text-green-700 text-sm mt-4 inline-block"
              >
                Browse Products →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">My Orders</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.orders}</p>
              <Link
                to="/orders"
                className="text-blue-600 hover:text-blue-700 text-sm mt-4 inline-block"
              >
                View Orders →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">Pending Orders</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingOrders}</p>
              <Link
                to="/orders"
                className="text-yellow-600 hover:text-yellow-700 text-sm mt-4 inline-block"
              >
                Track Orders →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">Confirmed Orders</h3>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.confirmedOrders}</p>
              <Link
                to="/orders"
                className="text-indigo-600 hover:text-indigo-700 text-sm mt-4 inline-block"
              >
                View Orders →
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700">Completed Orders</h3>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.completedOrders}</p>
              <Link
                to="/orders"
                className="text-emerald-600 hover:text-emerald-700 text-sm mt-4 inline-block"
              >
                View Orders →
              </Link>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/products"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <h3 className="font-medium text-gray-900">Browse Products</h3>
            <p className="text-sm text-gray-500 mt-1">Explore fresh produce</p>
          </Link>
          <Link
            to="/orders"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <h3 className="font-medium text-gray-900">View Orders</h3>
            <p className="text-sm text-gray-500 mt-1">Manage your orders</p>
          </Link>
          <Link
            to="/profile"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <h3 className="font-medium text-gray-900">Edit Profile</h3>
            <p className="text-sm text-gray-500 mt-1">Update your information</p>
          </Link>
          {user?.role === 'farmer' && (
            <Link
              to="/products/add"
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-900">Add Product</h3>
              <p className="text-sm text-gray-500 mt-1">List new produce</p>
            </Link>
          )}
          <Link
            to="/analytics"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <h3 className="font-medium text-gray-900">📊 Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">
              {user?.role === 'farmer' ? 'View sales analytics' : 'View purchase analytics'}
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard


