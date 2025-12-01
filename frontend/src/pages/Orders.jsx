import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import ReviewForm from '../components/ReviewForm'
import PaymentForm from '../components/PaymentForm'

const Orders = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [reviewingOrder, setReviewingOrder] = useState(null)
  const [payingOrder, setPayingOrder] = useState(null)
  const [trackingOrder, setTrackingOrder] = useState(null)
  const [trackingData, setTrackingData] = useState(null)
  const [updatingTracking, setUpdatingTracking] = useState(null)
  const [trackingFormData, setTrackingFormData] = useState({
    deliveryStatus: '',
    trackingNumber: '',
    deliveryService: '',
    scheduledDeliveryDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Advanced filters
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const handleMessageOrder = async (order) => {
    try {
      const otherUserId = user?.role === 'farmer' ? order.buyerId : order.farmerId
      navigate(`/messages?userId=${otherUserId}&orderId=${order.id}`)
    } catch (error) {
      console.error('Error navigating to messages:', error)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [filter, searchTerm, startDate, endDate, sortBy, page])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)
      if (searchTerm) params.append('search', searchTerm)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('sortBy', sortBy)
      params.append('page', page)
      params.append('limit', 10)

      const res = await axios.get(`/api/orders?${params.toString()}`)
      setOrders(res.data.orders || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.totalPages || 1)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId, action) => {
    try {
      const response = await axios.put(`/api/orders/${orderId}/${action}`)
      if (response.data.success) {
        alert(`Order ${action === 'confirm' ? 'accepted' : action === 'decline' ? 'declined' : action} successfully!`)
        fetchOrders()
      } else {
        alert(response.data.message || 'Failed to update order')
      }
    } catch (error) {
      console.error('Error updating order:', error)
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to update order. Please try again.')
    }
  }

  const handleReorder = async (order) => {
    try {
      const response = await axios.post(`/api/orders/${order.id}/reorder`)
      if (response.data.success) {
        alert('Order placed successfully!')
        fetchOrders()
      } else {
        alert(response.data.message || 'Failed to reorder')
      }
    } catch (error) {
      console.error('Error reordering:', error)
      alert(error.response?.data?.message || 'Failed to reorder. Please try again.')
    }
  }

  const fetchTracking = async (orderId) => {
    try {
      const response = await axios.get(`/api/delivery/tracking/${orderId}`)
      if (response.data.success) {
        setTrackingData(response.data.tracking)
        setTrackingOrder(orderId)
        // Pre-fill form if farmer is viewing
        if (user?.role === 'farmer' || user?.role === 'admin') {
          setTrackingFormData({
            deliveryStatus: response.data.tracking.deliveryStatus || 'pending',
            trackingNumber: response.data.tracking.trackingNumber || '',
            deliveryService: response.data.tracking.deliveryService || '',
            scheduledDeliveryDate: response.data.tracking.scheduledDeliveryDate 
              ? new Date(response.data.tracking.scheduledDeliveryDate).toISOString().split('T')[0]
              : ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching tracking:', error)
      alert('Failed to load tracking information')
    }
  }

  const handleUpdateTracking = async (orderId) => {
    try {
      const response = await axios.put(`/api/delivery/tracking/${orderId}`, trackingFormData)
      if (response.data.success) {
        alert('Delivery tracking updated successfully!')
        fetchTracking(orderId) // Refresh tracking data
        setUpdatingTracking(null)
        fetchOrders() // Refresh orders list
      }
    } catch (error) {
      console.error('Error updating tracking:', error)
      alert(error.response?.data?.message || 'Failed to update delivery tracking')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'succeeded':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const handlePaymentSuccess = (order) => {
    alert('Payment successful! Your order has been paid.')
    setPayingOrder(null)
    fetchOrders()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setSortBy('newest')
    setPage(1)
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                placeholder="Product, buyer, farmer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="status">By Status</option>
                <option value="price">By Price</option>
              </select>
            </div>
          </div>
          {(searchTerm || startDate || endDate || sortBy !== 'newest') && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex space-x-4 border-b">
        <button
          onClick={() => {
            setFilter('all')
            setPage(1)
          }}
          className={`px-4 py-2 font-medium ${
            filter === 'all'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({total})
        </button>
        <button
          onClick={() => {
            setFilter('pending')
            setPage(1)
          }}
          className={`px-4 py-2 font-medium ${
            filter === 'pending'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => {
            setFilter('confirmed')
            setPage(1)
          }}
          className={`px-4 py-2 font-medium ${
            filter === 'confirmed'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Confirmed
        </button>
        <button
          onClick={() => {
            setFilter('completed')
            setPage(1)
          }}
          className={`px-4 py-2 font-medium ${
            filter === 'completed'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Completed
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No orders found</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {order.product?.name}
                    </h3>
                    <p className="text-gray-600">
                      {user?.role === 'farmer' ? `Buyer: ${order.buyer?.name}` : `Farmer: ${order.farmer?.name}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      Order Date: {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    {order.estimatedDeliveryDate && (
                      <p className="text-sm text-blue-600 mt-1">
                        📅 Estimated Delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                      </p>
                    )}
                    {order.actualDeliveryDate && (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ Delivered: {new Date(order.actualDeliveryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    {order.paymentStatus && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                        Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="font-semibold">{order.quantity} {order.product?.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit Price</p>
                    <p className="font-semibold">${order.unitPrice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Price</p>
                    <p className="font-semibold text-green-600">${order.totalPrice}</p>
                  </div>
                </div>

                {order.deliveryAddress && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Delivery Address</p>
                    <p className="text-gray-900">
                      {order.deliveryAddress.address}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                    </p>
                  </div>
                )}

                {order.deliveryCost > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Delivery Cost</p>
                    <p className="text-gray-900 font-semibold">${parseFloat(order.deliveryCost).toFixed(2)}</p>
                  </div>
                )}

                {order.scheduledDeliveryDate && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Scheduled Delivery Date</p>
                    <p className="text-gray-900">{new Date(order.scheduledDeliveryDate).toLocaleDateString()}</p>
                  </div>
                )}

                {order.deliveryStatus && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Delivery Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.deliveryStatus === 'in_transit' || order.deliveryStatus === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                      order.deliveryStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.deliveryStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                )}

                {order.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-gray-900">{order.notes}</p>
                  </div>
                )}

                {order.farmerNotes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Farmer Notes</p>
                    <p className="text-gray-900">{order.farmerNotes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {user?.role === 'farmer' && order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(order.id, 'confirm')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusChange(order.id, 'decline')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {user?.role === 'farmer' && order.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'complete')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {user?.role === 'buyer' && order.status === 'confirmed' && order.paymentStatus !== 'succeeded' && (
                    <button
                      onClick={() => setPayingOrder(order.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      💳 Pay Now
                    </button>
                  )}
                  {order.paymentStatus === 'succeeded' && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await axios.get(`/api/receipts/${order.id}`, {
                            responseType: 'blob',
                            headers: { 'Accept': 'application/pdf' }
                          });
                          const url = window.URL.createObjectURL(new Blob([response.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `receipt-${order.id.substring(0, 8)}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Error downloading receipt:', error);
                          alert(error.response?.data?.message || 'Failed to download receipt.');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      📄 Download Receipt
                    </button>
                  )}
                  {user?.role === 'buyer' && ['pending', 'confirmed'].includes(order.status) && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'cancel')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Cancel Order
                    </button>
                  )}
                  {order.status === 'completed' && user?.role === 'buyer' && !reviewingOrder && (
                    <button
                      onClick={() => setReviewingOrder(order.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      ⭐ Rate Your Experience
                    </button>
                  )}
                  {user?.role === 'buyer' && order.status === 'completed' && (
                    <button
                      onClick={() => handleReorder(order)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      🔄 Reorder
                    </button>
                  )}
                  <button
                    onClick={() => fetchTracking(order.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    📦 Track Order
                  </button>
                  <button
                    onClick={() => handleMessageOrder(order)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    💬 Message
                  </button>
                  <Link
                    to={`/products/${order.product?.id}`}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    View Product
                  </Link>
                </div>

                {/* Tracking Modal */}
                {trackingOrder === order.id && trackingData && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Delivery Tracking</h4>
                      <div className="flex gap-2">
                        {(user?.role === 'farmer' || user?.role === 'admin') && (
                          <button
                            onClick={() => {
                              setUpdatingTracking(updatingTracking === order.id ? null : order.id)
                              if (updatingTracking !== order.id) {
                                setTrackingFormData({
                                  deliveryStatus: trackingData.deliveryStatus || 'pending',
                                  trackingNumber: trackingData.trackingNumber || '',
                                  deliveryService: trackingData.deliveryService || '',
                                  scheduledDeliveryDate: trackingData.scheduledDeliveryDate 
                                    ? new Date(trackingData.scheduledDeliveryDate).toISOString().split('T')[0]
                                    : ''
                                })
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                          >
                            {updatingTracking === order.id ? 'Cancel Edit' : '✏️ Update Tracking'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setTrackingOrder(null)
                            setTrackingData(null)
                            setUpdatingTracking(null)
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Update Tracking Form (Farmer/Admin) */}
                    {updatingTracking === order.id && (user?.role === 'farmer' || user?.role === 'admin') && (
                      <div className="mb-6 bg-white p-4 rounded-lg border border-blue-200">
                        <h5 className="font-semibold text-gray-900 mb-4">Update Delivery Tracking</h5>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Delivery Status *
                            </label>
                            <select
                              value={trackingFormData.deliveryStatus}
                              onChange={(e) => setTrackingFormData({ ...trackingFormData, deliveryStatus: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="in_transit">In Transit</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tracking Number
                            </label>
                            <input
                              type="text"
                              value={trackingFormData.trackingNumber}
                              onChange={(e) => setTrackingFormData({ ...trackingFormData, trackingNumber: e.target.value })}
                              placeholder="Enter tracking number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Delivery Service
                            </label>
                            <input
                              type="text"
                              value={trackingFormData.deliveryService}
                              onChange={(e) => setTrackingFormData({ ...trackingFormData, deliveryService: e.target.value })}
                              placeholder="e.g., FedEx, UPS, USPS, Local Delivery"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Scheduled Delivery Date
                            </label>
                            <input
                              type="date"
                              value={trackingFormData.scheduledDeliveryDate}
                              onChange={(e) => setTrackingFormData({ ...trackingFormData, scheduledDeliveryDate: e.target.value })}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <button
                            onClick={() => handleUpdateTracking(order.id)}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Update Tracking
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-6 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivery Status:</span>
                        <span className={`font-semibold ${
                          trackingData.deliveryStatus === 'delivered' ? 'text-green-600' :
                          trackingData.deliveryStatus === 'in_transit' || trackingData.deliveryStatus === 'out_for_delivery' ? 'text-blue-600' :
                          trackingData.deliveryStatus === 'failed' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {trackingData.deliveryStatus?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      {trackingData.trackingNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tracking Number:</span>
                          <span className="font-mono text-sm">{trackingData.trackingNumber}</span>
                        </div>
                      )}
                      {trackingData.deliveryService && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery Service:</span>
                          <span className="font-semibold">{trackingData.deliveryService}</span>
                        </div>
                      )}
                      {trackingData.scheduledDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scheduled Date:</span>
                          <span>{new Date(trackingData.scheduledDeliveryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {trackingData.estimatedDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated Date:</span>
                          <span>{new Date(trackingData.estimatedDeliveryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {trackingData.actualDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivered On:</span>
                          <span className="text-green-600 font-semibold">
                            {new Date(trackingData.actualDeliveryDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {trackingData.deliveryCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery Cost:</span>
                          <span className="font-semibold">${parseFloat(trackingData.deliveryCost).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {trackingData.deliveryAddress && (
                      <div className="mb-6 p-4 bg-white rounded">
                        <h5 className="font-semibold text-gray-900 mb-2">Delivery Address</h5>
                        <p className="text-sm text-gray-700">
                          {trackingData.deliveryAddress.address}<br />
                          {trackingData.deliveryAddress.city}, {trackingData.deliveryAddress.state} {trackingData.deliveryAddress.zipCode}
                        </p>
                      </div>
                    )}

                    {trackingData.statusHistory && trackingData.statusHistory.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-4">Status History</h5>
                        <div className="space-y-4">
                          {trackingData.statusHistory.map((entry, index) => (
                            <div key={index} className="flex items-start">
                              <div className={`w-4 h-4 rounded-full mr-4 mt-1 ${
                                index === trackingData.statusHistory.length - 1 ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                              <div className="flex-1">
                                <p className={`font-medium ${
                                  index === trackingData.statusHistory.length - 1 ? 'text-green-600' : 'text-gray-700'
                                }`}>
                                  {entry.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                </p>
                                <p className="text-sm text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>
                                {entry.notes && <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {payingOrder === order.id && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment</h4>
                    <PaymentForm
                      orderId={order.id}
                      orderTotal={parseFloat(order.totalPrice)}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => setPayingOrder(null)}
                    />
                  </div>
                )}
                {reviewingOrder === order.id && (
                  <div className="mt-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Review Guidelines</h4>
                      <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                        <li>Rate your experience with the product quality</li>
                        <li>Share details about delivery and communication</li>
                        <li>Help other buyers make informed decisions</li>
                      </ul>
                    </div>
                    <ReviewForm
                      orderId={order.id}
                      productId={order.product?.id}
                      onSuccess={() => {
                        setReviewingOrder(null)
                        fetchOrders()
                        alert('Thank you for your review!')
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Orders
