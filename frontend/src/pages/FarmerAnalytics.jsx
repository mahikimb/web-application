import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
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

const FarmerAnalytics = () => {
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

      const res = await axios.get(`/api/analytics/farmer?${params.toString()}`)
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Farmer Analytics</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg mb-4">No analytics data available for the selected period.</p>
          <p className="text-gray-400 text-sm">
            Analytics will appear once you have completed orders with successful payments.
          </p>
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-2">To see analytics data:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Create and list products</li>
              <li>• Wait for buyers to place orders</li>
              <li>• Confirm orders and receive payments</li>
              <li>• Complete orders</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Revenue Chart Data
  const revenueByDate = analytics.revenue?.revenueByDate || []
  const revenueChartData = {
    labels: revenueByDate.length > 0 
      ? revenueByDate.map(item => new Date(item.date).toLocaleDateString())
      : ['No data'],
    datasets: [
      {
        label: 'Revenue ($)',
        data: revenueByDate.length > 0
          ? revenueByDate.map(item => parseFloat(item.revenue))
          : [0],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      }
    ]
  }

  // Order Trends Chart Data
  const orderTrends = analytics.orderTrends || []
  const orderTrendsData = {
    labels: orderTrends.length > 0 
      ? [...new Set(orderTrends.map(item => new Date(item.date).toLocaleDateString()))]
      : ['No data'],
    datasets: [
      {
        label: 'Completed',
        data: orderTrends.length > 0
          ? orderTrends.filter(item => item.status === 'completed').map(item => item.count)
          : [0],
        backgroundColor: 'rgba(34, 197, 94, 0.6)'
      },
      {
        label: 'Pending',
        data: orderTrends.length > 0
          ? orderTrends.filter(item => item.status === 'pending').map(item => item.count)
          : [0],
        backgroundColor: 'rgba(234, 179, 8, 0.6)'
      },
      {
        label: 'Confirmed',
        data: orderTrends.length > 0
          ? orderTrends.filter(item => item.status === 'confirmed').map(item => item.count)
          : [0],
        backgroundColor: 'rgba(59, 130, 246, 0.6)'
      }
    ]
  }

  // Revenue by Category Chart Data
  const byCategory = analytics.revenue?.byCategory || []
  const categoryChartData = {
    labels: byCategory.length > 0
      ? byCategory.map(item => item.category)
      : ['No data'],
    datasets: [
      {
        label: 'Revenue by Category',
        data: byCategory.length > 0
          ? byCategory.map(item => parseFloat(item.revenue))
          : [0],
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
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
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
          <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">${analytics.revenue.totalRevenue}</p>
          <p className="text-xs text-gray-500 mt-1">All-time: ${analytics.revenue.allTimeRevenue}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Total Orders</p>
          <p className="text-3xl font-bold text-blue-600">{analytics.sales.totalOrders}</p>
          <p className="text-xs text-gray-500 mt-1">All-time: {analytics.sales.allTimeOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Completed Orders</p>
          <p className="text-3xl font-bold text-green-600">{analytics.sales.completedOrders}</p>
          <p className="text-xs text-gray-500 mt-1">Pending: {analytics.sales.pendingOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Order Value</p>
          <p className="text-3xl font-bold text-purple-600">${analytics.revenue.avgOrderValue}</p>
          <p className="text-xs text-gray-500 mt-1">Paid orders: {analytics.revenue.totalPaidOrders}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-64">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Trends</h2>
          <div className="h-64">
            <Bar data={orderTrendsData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Revenue by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue by Category</h2>
          <div className="h-64">
            <Doughnut data={categoryChartData} options={chartOptions} />
          </div>
        </div>

        {/* Popular Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Products</h2>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {(analytics.popularProducts || []).length > 0 ? (
              (analytics.popularProducts || []).map((item, index) => (
                <div key={item.product.id} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    {item.product.images && item.product.images.length > 0 && (
                      <img
                        src={`http://localhost:5000${item.product.images[0]}`}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-500">{item.product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${item.totalRevenue}</p>
                    <p className="text-xs text-gray-500">{item.orderCount} orders</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No products sold yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue by Category</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.revenue.byCategory.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                    ${item.revenue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.orders}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default FarmerAnalytics

