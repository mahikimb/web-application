import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const OrderRequest = () => {
  const { productId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [deliveryCost, setDeliveryCost] = useState(0)
  const [deliveryBreakdown, setDeliveryBreakdown] = useState(null)
  const [calculatingCost, setCalculatingCost] = useState(false)
  const [deliveryError, setDeliveryError] = useState('')
  const [formData, setFormData] = useState({
    quantity: 1,
    deliveryAddress: {
      address: '',
      city: '',
      state: '',
      zipCode: ''
    },
    scheduledDeliveryDate: '',
    contactPhone: '',
    notes: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetchProduct()
    fetchSavedAddresses()
    if (user?.phone) {
      setFormData(prev => ({
        ...prev,
        contactPhone: user.phone
      }))
    }
  }, [productId, user])

  useEffect(() => {
    if (formData.quantity > 0 && product && (formData.deliveryAddress.city || selectedAddressId)) {
      calculateDeliveryCost()
    }
  }, [formData.quantity, formData.deliveryAddress, selectedAddressId, product])

  const fetchSavedAddresses = async () => {
    try {
      const res = await axios.get('/api/delivery/addresses')
      if (res.data.success) {
        setSavedAddresses(res.data.addresses)
        const defaultAddress = res.data.addresses.find(addr => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          setFormData(prev => ({
            ...prev,
            deliveryAddress: {
              address: defaultAddress.address,
              city: defaultAddress.city,
              state: defaultAddress.state,
              zipCode: defaultAddress.zipCode
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching saved addresses:', error)
    }
  }

  const calculateDeliveryCost = async () => {
    if (!product || !formData.deliveryAddress.city) return

    try {
      setCalculatingCost(true)
      const addressToUse = useNewAddress 
        ? formData.deliveryAddress 
        : savedAddresses.find(addr => addr.id === selectedAddressId)

      if (!addressToUse || !addressToUse.city) {
        setCalculatingCost(false)
        return
      }

      const res = await axios.post('/api/delivery/calculate-cost', {
        productId,
        quantity: formData.quantity,
        deliveryAddress: addressToUse
      })

      if (res.data.success) {
        setDeliveryCost(parseFloat(res.data.cost.deliveryCost))
        setDeliveryBreakdown({
          distance: parseFloat(res.data.cost.distance),
          weight: res.data.cost.weight,
          currency: res.data.cost.currency || 'USD'
        })
        setDeliveryError('')
      }
    } catch (error) {
      console.error('Error calculating delivery cost:', error)
      setDeliveryCost(0)
      setDeliveryBreakdown(null)
      const msg = error.response?.data?.message || 'Failed to calculate delivery cost'
      setDeliveryError(msg)
    } finally {
      setCalculatingCost(false)
    }
  }

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`/api/products/${productId}`)
      setProduct(res.data.product)
    } catch (error) {
      setError('Failed to load product')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('deliveryAddress.')) {
      const field = name.split('.')[1]
      setFormData({
        ...formData,
        deliveryAddress: {
          ...formData.deliveryAddress,
          [field]: value
        }
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId)
    setUseNewAddress(false)
    const address = savedAddresses.find(addr => addr.id === addressId)
    if (address) {
      setFormData(prev => ({
        ...prev,
        deliveryAddress: {
          address: address.address,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode
        }
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.quantity > product.quantity) {
      setError(`Maximum available quantity is ${product.quantity}`)
      return
    }

    if (formData.quantity < 1) {
      setError('Quantity must be at least 1')
      return
    }

    setLoading(true)

    try {
      const orderData = {
        productId,
        quantity: formData.quantity,
        deliveryAddress: formData.deliveryAddress,
        contactPhone: formData.contactPhone,
        notes: formData.notes,
        deliveryCost: deliveryCost,
        scheduledDeliveryDate: formData.scheduledDeliveryDate || null
      }

      if (selectedAddressId && !useNewAddress) {
        orderData.deliveryAddressId = selectedAddressId
      }

      await axios.post('/api/orders', orderData)
      navigate('/orders')
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create order request')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
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

  const totalPrice = (product.price * formData.quantity) + deliveryCost

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Request Order</h1>

      {/* Product Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Details</h2>
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {product.images && product.images.length > 0 && (
            <img
              src={`http://localhost:5000${product.images[0]}`}
              alt={product.name}
              className="w-24 h-24 object-cover rounded"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-gray-600">${product.price} / {product.unit}</p>
            <p className="text-gray-600">Available: {product.quantity} {product.unit}</p>
            <p className="text-gray-600">Farmer: {product.farmer?.name}</p>
          </div>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            name="quantity"
            required
            min="1"
            max={product.quantity}
            value={formData.quantity}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Maximum: {product.quantity} {product.unit}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded">
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Unit Price:</span>
            <span className="font-semibold">${product.price}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Quantity:</span>
            <span className="font-semibold">{formData.quantity} {product.unit}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Subtotal:</span>
            <span className="font-semibold">${(product.price * formData.quantity).toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-700">Delivery Cost:</span>
            <span className="font-semibold">
              {calculatingCost ? 'Calculating...' : `$${deliveryCost.toFixed(2)}`}
            </span>
          </div>
          {deliveryBreakdown && (
            <div className="text-sm text-gray-600 mb-2">
              <p>Est. Distance: {deliveryBreakdown.distance} miles</p>
              <p>Est. Weight: {deliveryBreakdown.weight} lbs</p>
            </div>
          )}
          {deliveryError && (
            <div className="mb-2 text-sm text-red-600">
              {deliveryError}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={calculateDeliveryCost}
              disabled={calculatingCost}
              className="text-sm px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {calculatingCost ? 'Recalculating...' : 'Recalculate Delivery Cost'}
            </button>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span className="text-gray-900">Total Price:</span>
            <span className="text-green-600">${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Phone *
          </label>
          <input
            type="tel"
            name="contactPhone"
            required
            value={formData.contactPhone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Delivery Address
            </label>
            <Link
              to="/delivery-addresses"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage Addresses
            </Link>
          </div>

          {savedAddresses.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="addressType"
                    checked={!useNewAddress}
                    onChange={() => setUseNewAddress(false)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Use saved address</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="addressType"
                    checked={useNewAddress}
                    onChange={() => setUseNewAddress(true)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">New address</span>
                </label>
              </div>

              {!useNewAddress && (
                <select
                  value={selectedAddressId || ''}
                  onChange={(e) => handleAddressSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select an address</option>
                  {savedAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label} - {address.address}, {address.city}, {address.state}
                      {address.isDefault && ' (Default)'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {(useNewAddress || savedAddresses.length === 0) && (
            <div className="space-y-2">
              <input
                type="text"
                name="deliveryAddress.address"
                placeholder="Street Address"
                required={useNewAddress || savedAddresses.length === 0}
                value={formData.deliveryAddress.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  name="deliveryAddress.city"
                  placeholder="City"
                  required={useNewAddress || savedAddresses.length === 0}
                  value={formData.deliveryAddress.city}
                  onChange={handleChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
                <input
                  type="text"
                  name="deliveryAddress.state"
                  placeholder="State"
                  required={useNewAddress || savedAddresses.length === 0}
                  value={formData.deliveryAddress.state}
                  onChange={handleChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <input
                type="text"
                name="deliveryAddress.zipCode"
                placeholder="Zip Code"
                required={useNewAddress || savedAddresses.length === 0}
                value={formData.deliveryAddress.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled Delivery Date (Optional)
          </label>
          <input
            type="date"
            name="scheduledDeliveryDate"
            value={formData.scheduledDeliveryDate}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Select a preferred delivery date (farmer will confirm)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            name="notes"
            rows="4"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any special instructions or requests..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 font-semibold"
          >
            {loading ? 'Submitting...' : 'Submit Order Request'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/products/${productId}`)}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default OrderRequest

