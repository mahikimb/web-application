import { useEffect, useState } from 'react'
import axios from 'axios'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [reviews, setReviews] = useState([])
  const [activeTab, setActiveTab] = useState('stats')
  const [loading, setLoading] = useState(true)
  
  // User management states
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'buyer'
  })
  const [userFormErrors, setUserFormErrors] = useState({})

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts()
    } else if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'reviews') {
      fetchReviews()
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats')
      setStats(res.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/admin/products')
      setProducts(res.data.products)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users')
      setUsers(res.data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchReviews = async () => {
    try {
      const res = await axios.get('/api/admin/reviews')
      setReviews(res.data.reviews)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleApproveProduct = async (productId) => {
    try {
      await axios.put(`/api/admin/products/${productId}/approve`)
      fetchProducts()
      fetchStats()
    } catch (error) {
      alert('Failed to approve product')
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await axios.delete(`/api/admin/products/${productId}`)
      fetchProducts()
      fetchStats()
    } catch (error) {
      alert('Failed to delete product')
    }
  }

  const handleApproveReview = async (reviewId) => {
    try {
      await axios.put(`/api/admin/reviews/${reviewId}/approve`)
      fetchReviews()
    } catch (error) {
      alert('Failed to approve review')
    }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      await axios.delete(`/api/admin/reviews/${reviewId}`)
      fetchReviews()
    } catch (error) {
      alert('Failed to delete review')
    }
  }

  // User management functions
  const handleOpenUserForm = (user = null) => {
    if (user) {
      setEditingUser(user)
      setUserFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: user.role || 'buyer'
      })
    } else {
      setEditingUser(null)
      setUserFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'buyer'
      })
    }
    setUserFormErrors({})
    setShowUserForm(true)
  }

  const handleCloseUserForm = () => {
    setShowUserForm(false)
    setEditingUser(null)
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'buyer'
    })
    setUserFormErrors({})
  }

  const handleUserFormChange = (e) => {
    const { name, value } = e.target
    setUserFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (userFormErrors[name]) {
      setUserFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateUserForm = () => {
    const errors = {}
    
    if (!userFormData.name.trim()) {
      errors.name = 'Name is required'
    }
    
    if (!userFormData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email)) {
      errors.email = 'Please enter a valid email'
    }
    
    if (!userFormData.phone.trim()) {
      errors.phone = 'Phone is required'
    }
    
    if (!editingUser && !userFormData.password) {
      errors.password = 'Password is required'
    } else if (userFormData.password && userFormData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    if (!['farmer', 'buyer', 'admin'].includes(userFormData.role)) {
      errors.role = 'Invalid role'
    }
    
    setUserFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    if (!validateUserForm()) return
    
    try {
      const res = await axios.post('/api/admin/users', userFormData)
      alert('User created successfully!')
      handleCloseUserForm()
      fetchUsers()
      fetchStats()
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to create user'
      alert(message)
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    
    if (!validateUserForm()) return
    
    try {
      const updateData = { ...userFormData }
      // Don't send password if it's empty (not being changed)
      if (!updateData.password) {
        delete updateData.password
      }
      
      const res = await axios.put(`/api/admin/users/${editingUser.id}`, updateData)
      alert('User updated successfully!')
      handleCloseUserForm()
      fetchUsers()
      fetchStats()
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to update user'
      alert(message)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    
    try {
      await axios.delete(`/api/admin/users/${userId}`)
      alert('User deleted successfully!')
      fetchUsers()
      fetchStats()
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete user'
      alert(message)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return
    
    try {
      await axios.put(`/api/admin/users/${userId}`, { role: newRole })
      alert('User role updated successfully!')
      fetchUsers()
      fetchStats()
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update user role'
      alert(message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="mb-6 flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'stats'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'products'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Products ({stats?.pendingProducts || 0} pending)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'users'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Users ({stats?.totalUsers || 0})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'reviews'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Reviews
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalUsers}</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.totalFarmers} Farmers, {stats.totalBuyers} Buyers
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalProducts}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.pendingProducts} Pending</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalOrders}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.pendingOrders} Pending</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Reviews</h3>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.totalReviews}</p>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {products.length === 0 ? (
            <p className="text-gray-500">No products found</p>
          ) : (
            products.map((product) => (
              <div key={product.id || product._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    <p className="text-gray-600">Category: {product.category}</p>
                    <p className="text-gray-600">Farmer: {product.farmer?.name}</p>
                    <p className="text-gray-600">Status: {product.status}</p>
                    <p className={`text-sm ${product.isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
                      {product.isApproved ? 'Approved' : 'Pending Approval'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {!product.isApproved && (
                      <button
                        onClick={() => handleApproveProduct(product.id || product._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProduct(product.id || product._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">User Management</h2>
            <button
              onClick={() => handleOpenUserForm()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Add New User
            </button>
          </div>

          {users.length === 0 ? (
            <p className="text-gray-500">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id || user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id || user._id, e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="buyer">Buyer</option>
                          <option value="farmer">Farmer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleOpenUserForm(user)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id || user._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-gray-500">No reviews found</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id || review._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-yellow-500">★</span>
                      <span className="ml-2 font-semibold">{review.rating}/5</span>
                    </div>
                    <p className="text-gray-600">Buyer: {review.buyer?.name}</p>
                    <p className="text-gray-600">Product: {review.product?.name}</p>
                    {review.comment && <p className="text-gray-700 mt-2">{review.comment}</p>}
                    <p className={`text-sm mt-2 ${review.isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
                      {review.isApproved ? 'Approved' : 'Pending Approval'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {!review.isApproved && (
                      <button
                        onClick={() => handleApproveReview(review.id || review._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReview(review.id || review._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={handleCloseUserForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={userFormData.name}
                      onChange={handleUserFormChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        userFormErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {userFormErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{userFormErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={userFormData.email}
                      onChange={handleUserFormChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        userFormErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {userFormErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{userFormErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={userFormData.phone}
                      onChange={handleUserFormChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        userFormErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {userFormErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{userFormErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {!editingUser && '*'}
                      {editingUser && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={userFormData.password}
                      onChange={handleUserFormChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        userFormErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required={!editingUser}
                    />
                    {userFormErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{userFormErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      name="role"
                      value={userFormData.role}
                      onChange={handleUserFormChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        userFormErrors.role ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="buyer">Buyer</option>
                      <option value="farmer">Farmer</option>
                      <option value="admin">Admin</option>
                    </select>
                    {userFormErrors.role && (
                      <p className="mt-1 text-sm text-red-600">{userFormErrors.role}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseUserForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
