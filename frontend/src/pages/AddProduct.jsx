import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const AddProduct = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    category: 'vegetables',
    description: '',
    price: '',
    quantity: '',
    unit: 'kg',
    harvestDate: '',
    qualityNotes: '',
    isOrganic: false,
    farmLocation: {
      address: '',
      city: '',
      state: '',
      zipCode: ''
    }
  })
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.startsWith('farmLocation.')) {
      const field = name.split('.')[1]
      setFormData({
        ...formData,
        farmLocation: {
          ...formData.farmLocation,
          [field]: value
        }
      })
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      })
    }
  }

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError('Product name is required')
        setLoading(false)
        return
      }
      if (!formData.description.trim()) {
        setError('Description is required')
        setLoading(false)
        return
      }
      if (!formData.harvestDate) {
        setError('Harvest date is required')
        setLoading(false)
        return
      }

      const data = new FormData()
      
      // Append all form fields
      data.append('name', formData.name)
      data.append('category', formData.category)
      data.append('description', formData.description)
      data.append('price', formData.price)
      data.append('quantity', formData.quantity)
      data.append('unit', formData.unit)
      data.append('harvestDate', formData.harvestDate)
      if (formData.qualityNotes) {
        data.append('qualityNotes', formData.qualityNotes)
      }
      data.append('isOrganic', formData.isOrganic ? 'true' : 'false')
      
      // Append farm location as JSON string
      if (formData.farmLocation && Object.keys(formData.farmLocation).some(key => formData.farmLocation[key])) {
        data.append('farmLocation', JSON.stringify(formData.farmLocation))
      }
      
      // Append images
      images.forEach((image) => {
        data.append('images', image)
      })

      console.log('Submitting product data:', {
        name: formData.name,
        category: formData.category,
        price: formData.price,
        quantity: formData.quantity,
        imagesCount: images.length
      })

      const response = await axios.post('/api/products', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.success) {
        console.log('Product created successfully:', response.data.product)
        // Show success message and redirect with full page reload to ensure fresh data
        alert('Product added successfully!')
        window.location.href = '/dashboard'
      } else {
        setError(response.data.message || 'Failed to create product. Please try again.')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(e => e.message).join(', ')
        setError(errorMessages)
      } else {
        setError(error.response?.data?.message || error.response?.data?.error || 'Failed to create product. Please check all fields and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Product</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="vegetables">Vegetables</option>
              <option value="fruits">Fruits</option>
              <option value="grains">Grains</option>
              <option value="dairy">Dairy</option>
              <option value="poultry">Poultry</option>
              <option value="herbs">Herbs</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Harvest Date *
            </label>
            <input
              type="date"
              name="harvestDate"
              required
              min={new Date().toISOString().split('T')[0]}
              value={formData.harvestDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Cannot select past dates</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            name="description"
            required
            rows="4"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <input
              type="number"
              name="price"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              required
              min="0"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit *
            </label>
            <select
              name="unit"
              required
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
              <option value="piece">piece</option>
              <option value="dozen">dozen</option>
              <option value="bunch">bunch</option>
              <option value="bag">bag</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quality Notes
          </label>
          <textarea
            name="qualityNotes"
            rows="3"
            value={formData.qualityNotes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isOrganic"
              checked={formData.isOrganic}
              onChange={handleChange}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="ml-2 text-sm text-gray-700">Organic Product</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Farm Location
          </label>
          <div className="space-y-2">
            <input
              type="text"
              name="farmLocation.address"
              placeholder="Address"
              value={formData.farmLocation.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                name="farmLocation.city"
                placeholder="City"
                value={formData.farmLocation.city}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="text"
                name="farmLocation.state"
                placeholder="State"
                value={formData.farmLocation.state}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <input
              type="text"
              name="farmLocation.zipCode"
              placeholder="Zip Code"
              value={formData.farmLocation.zipCode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Images (up to 5)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddProduct

