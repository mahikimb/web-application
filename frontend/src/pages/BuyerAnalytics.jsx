import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const BuyerAnalytics = () => {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)

      const res = await axios.get(`/api/analytics/buyer?${params.toString()}`)
      console.log('Analytics response:', res.data)
      if (res.data.success && res.data.analytics) {
        setAnalytics(res.data.analytics)
      } else {
        console.error('Analytics response missing data:', res.data)
        setAnalytics(null)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      console.error('Error response:', error.response?.data)
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Buyer Analytics</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg mb-4">No analytics data available for the selected period.</p>
          <p className="text-gray-400 text-sm">
            Analytics will appear once you have completed orders with successful payments.
          </p>
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-2">To see analytics data:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Browse and order products from farmers</li>
              <li>• Complete payment for your orders</li>
              <li>• Wait for farmers to complete your orders</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Spending Chart Data
  const spendingByDate = analytics.spending?.spendingByDate || []
  const spendingChartData = {
    labels: spendingByDate.length > 0
      ? spendingByDate.map(item => new Date(item.date).toLocaleDateString())
      : ['No data'],
    datasets: [
      {
        label: 'Spending ($)',
        data: spendingByDate.length > 0
          ? spendingByDate.map(item => parseFloat(item.spent))
          : [0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  }

  // Favorite Categories Chart Data
  const categoryChartData = {
    labels: analytics.favoriteCategories.map(item => item.category),
    datasets: [
      {
        label: 'Spending by Category',
        data: analytics.favoriteCategories.map(item => parseFloat(item.totalSpent)),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ]
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Analytics</h1>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total Spent</p>
          <p className="text-3xl font-bold text-blue-600">${analytics.spending.totalSpent}</p>
          <p className="text-xs text-gray-500 mt-1">All-time: ${analytics.spending.allTimeSpent}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total Orders</p>
          <p className="text-3xl font-bold text-green-600">{analytics.purchases.totalOrders}</p>
          <p className="text-xs text-gray-500 mt-1">All-time: {analytics.purchases.allTimeOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Completed Orders</p>
          <p className="text-3xl font-bold text-purple-600">{analytics.purchases.completedOrders}</p>
          <p className="text-xs text-gray-500 mt-1">Paid: {analytics.purchases.paidOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Order Value</p>
          <p className="text-3xl font-bold text-yellow-600">${analytics.spending.avgOrderValue}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Spending Trend</h2>
          <div className="h-64">
            <Line data={spendingChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Favorite Categories</h2>
          <div className="h-64">
            <Doughnut data={categoryChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Favorite Categories Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Category Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Spent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Orders
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(analytics.favoriteCategories || []).length > 0 ? (
                  (analytics.favoriteCategories || []).map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-semibold">
                        ${item.totalSpent}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.orderCount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                      No category data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Farmers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Farmers</h2>
          <div className="space-y-4">
            {(analytics.topFarmers || []).length > 0 ? (
              (analytics.topFarmers || []).map((item, index) => (
                <div key={item.farmer.id} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <Link
                        to={`/farmer/${item.farmer.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {item.farmer.name}
                      </Link>
                      <p className="text-sm text-gray-500">{item.orderCount} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">${item.totalSpent}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No farmer data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Purchases</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Farmer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(analytics.recentPurchases || []).length > 0 ? (
                (analytics.recentPurchases || []).map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {purchase.product.images && purchase.product.images.length > 0 && (
                          <img
                            src={`http://localhost:5000${purchase.product.images[0]}`}
                            alt={purchase.product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <Link
                          to={`/products/${purchase.product.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {purchase.product.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/farmer/${purchase.farmer.id}`}
                        className="text-sm text-gray-900 hover:text-blue-600"
                      >
                        {purchase.farmer.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {purchase.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${purchase.totalPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                        purchase.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No purchases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default BuyerAnalytics

