import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import FavoriteButton from '../components/FavoriteButton'

const Products = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalProducts, setTotalProducts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    state: '',
    minPrice: '',
    maxPrice: '',
    search: '',
    isOrganic: '',
    minRating: '',
    sortBy: 'newest'
  })
  
  // Debounce search input
  const [searchInput, setSearchInput] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }))
      setCurrentPage(1) // Reset to first page on new search
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.city, filters.state, filters.minPrice, filters.maxPrice, filters.search, filters.isOrganic, filters.minRating, filters.sortBy, currentPage])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      // Add all filters
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== '') {
          params.append(key, filters[key])
        }
      })
      
      // Add pagination
      params.append('page', currentPage.toString())
      params.append('limit', '20')

      const res = await axios.get(`/api/products?${params.toString()}`)
      console.log('Products API response:', res.data)
      
      if (res.data.success && res.data.products) {
        setProducts(res.data.products)
        setTotalProducts(res.data.total || 0)
        setCurrentPage(res.data.page || 1)
        setTotalPages(res.data.totalPages || 1)
      } else if (Array.isArray(res.data.products)) {
        setProducts(res.data.products)
      } else {
        setProducts([])
      }
      setError('')
    } catch (error) {
      console.error('Error fetching products:', error)
      console.error('Error response:', error.response?.data)
      setProducts([])
      setError(error.response?.data?.message || 'Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    })
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value)
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      city: '',
      state: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      isOrganic: '',
      minRating: '',
      sortBy: 'newest'
    })
    setSearchInput('')
    setCurrentPage(1)
  }

  const removeFilter = (filterName) => {
    setFilters({
      ...filters,
      [filterName]: ''
    })
    if (filterName === 'search') {
      setSearchInput('')
    }
    setCurrentPage(1)
  }

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.category) count++
    if (filters.city) count++
    if (filters.state) count++
    if (filters.minPrice) count++
    if (filters.maxPrice) count++
    if (filters.isOrganic) count++
    if (filters.minRating) count++
    if (filters.search) count++
    return count
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Browse Products</h1>
        <div className="flex items-center space-x-4">
          {totalProducts > 0 && (
            <span className="text-gray-600">
              {totalProducts} {totalProducts === 1 ? 'product' : 'products'} found
            </span>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
          >
            <span className="mr-2">🔍</span>
            Filters {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={() => {
              setError('')
              fetchProducts()
            }}
            className="ml-4 text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products by name, description..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="w-48">
            <select
              name="sortBy"
              value={filters.sortBy}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="newest">Newest First</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popularity">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFiltersCount() > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            {filters.category && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
                Category: {filters.category}
                <button onClick={() => removeFilter('category')} className="ml-2 text-green-600 hover:text-green-800">×</button>
              </span>
            )}
            {filters.city && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
                City: {filters.city}
                <button onClick={() => removeFilter('city')} className="ml-2 text-blue-600 hover:text-blue-800">×</button>
              </span>
            )}
            {filters.state && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
                State: {filters.state}
                <button onClick={() => removeFilter('state')} className="ml-2 text-blue-600 hover:text-blue-800">×</button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center">
                Price: ${filters.minPrice || '0'} - ${filters.maxPrice || '∞'}
                <button onClick={() => { removeFilter('minPrice'); removeFilter('maxPrice'); }} className="ml-2 text-purple-600 hover:text-purple-800">×</button>
              </span>
            )}
            {filters.isOrganic && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
                Organic Only
                <button onClick={() => removeFilter('isOrganic')} className="ml-2 text-green-600 hover:text-green-800">×</button>
              </span>
            )}
            {filters.minRating && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center">
                Rating: {filters.minRating}+ ⭐
                <button onClick={() => removeFilter('minRating')} className="ml-2 text-yellow-600 hover:text-yellow-800">×</button>
              </span>
            )}
            {filters.search && (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm flex items-center">
                Search: "{filters.search}"
                <button onClick={() => removeFilter('search')} className="ml-2 text-gray-600 hover:text-gray-800">×</button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm hover:bg-red-200"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Categories</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                placeholder="Enter city"
                value={filters.city}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                placeholder="Enter state"
                value={filters.state}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
              <select
                name="minRating"
                value={filters.minRating}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
                <option value="1">1+ Star</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price ($)</label>
              <input
                type="number"
                name="minPrice"
                placeholder="0"
                min="0"
                step="0.01"
                value={filters.minPrice}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price ($)</label>
              <input
                type="number"
                name="maxPrice"
                placeholder="1000"
                min="0"
                step="0.01"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
              <select
                name="isOrganic"
                value={filters.isOrganic}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Products</option>
                <option value="true">Organic Only</option>
                <option value="false">Non-Organic</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">No products found</p>
          {getActiveFiltersCount() > 0 && (
            <>
              <p className="text-gray-400 text-sm mb-4">Try adjusting your filters</p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Clear All Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              if (!product || !product.id) {
                console.warn('Invalid product:', product)
                return null
              }
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow relative"
                >
                  <Link to={`/products/${product.id}`}>
                    {product.images && Array.isArray(product.images) && product.images.length > 0 && (
                      <img
                        src={`http://localhost:5000${product.images[0]}`}
                        alt={product.name || 'Product'}
                        className="w-full h-48 object-cover rounded-t-lg"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    )}
                  </Link>
                  <div className="absolute top-2 right-2 z-10">
                    <FavoriteButton productId={product.id} />
                  </div>
                  <div className="p-4">
                    <Link to={`/products/${product.id}`}>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name || 'Unnamed Product'}</h3>
                    </Link>
                    <Link
                      to={`/farmer/${product.farmerId}`}
                      className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
                    >
                      {product.farmer?.name || 'Farmer'}
                    </Link>
                    <p className="text-green-600 font-bold text-lg mb-2">
                      ${product.price || 0} / {product.unit || 'unit'}
                    </p>
                  {product.farmLocation && (product.farmLocation.city || product.farmLocation.state) && (
                    <p className="text-gray-600 text-sm mb-2">
                      {[product.farmLocation.city, product.farmLocation.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm mb-2">
                    Available: {product.quantity} {product.unit}
                  </p>
                  {product.averageRating && parseFloat(product.averageRating) > 0 && (
                    <div className="flex items-center mt-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-sm ${
                              star <= Math.round(parseFloat(product.averageRating))
                                ? 'text-yellow-500'
                                : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-600 text-sm ml-2">
                        {parseFloat(product.averageRating).toFixed(1)} ({product.totalReviews || 0} {product.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  )}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
            <span className="text-gray-600 text-sm ml-4">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          )}
        </>
      )}
    </div>
  )
}

export default Products

