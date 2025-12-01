import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Home = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            🌾 Farm Marketplace
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Connect directly with local farmers. Buy fresh, organic produce straight from the source.
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Supporting local agriculture, one order at a time.
          </p>
          
          {!user ? (
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-50 font-semibold text-lg shadow-lg border-2 border-green-600"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <div className="flex justify-center space-x-4">
              <Link
                to="/products"
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg"
              >
                Browse Products
              </Link>
              <Link
                to="/dashboard"
                className="px-8 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-50 font-semibold text-lg shadow-lg border-2 border-green-600"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose Farm Marketplace?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Fresh & Organic</h3>
            <p className="text-gray-600">
              Get the freshest produce directly from local farms. Many farmers offer organic options.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Direct Connection</h3>
            <p className="text-gray-600">
              Connect directly with farmers. No middlemen, better prices, and support local agriculture.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Trusted Reviews</h3>
            <p className="text-gray-600">
              Read reviews from other buyers and rate your experience after each order.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sign Up</h3>
              <p className="text-gray-600 text-sm">Create an account as a farmer or buyer</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Browse or List</h3>
              <p className="text-gray-600 text-sm">Farmers list products, buyers browse and search</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Place Order</h3>
              <p className="text-gray-600 text-sm">Buyers request orders, farmers confirm</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">4</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Complete & Review</h3>
              <p className="text-gray-600 text-sm">Complete the order and leave a review</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="bg-green-600 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-green-100 mb-8">
              Join our community of farmers and buyers today!
            </p>
            <Link
              to="/register"
              className="inline-block px-8 py-3 bg-white text-green-600 rounded-lg hover:bg-gray-100 font-semibold text-lg shadow-lg"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home

