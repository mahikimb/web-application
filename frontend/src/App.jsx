import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import PrivateRoute from './components/PrivateRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetails from './pages/ProductDetails'
import AddProduct from './pages/AddProduct'
import EditProduct from './pages/EditProduct'
import Orders from './pages/Orders'
import OrderRequest from './pages/OrderRequest'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import Messages from './pages/Messages'
import Wishlists from './pages/Wishlists'
import NotificationPreferences from './pages/NotificationPreferences'
import FarmerProfile from './pages/FarmerProfile'
import FarmerAnalytics from './pages/FarmerAnalytics'
import BuyerAnalytics from './pages/BuyerAnalytics'
import DeliveryAddresses from './pages/DeliveryAddresses'
import { useAuth } from './context/AuthContext'

// Component to route to correct analytics page based on user role
const AnalyticsRouter = () => {
  const { user } = useAuth()
  return user?.role === 'farmer' ? <FarmerAnalytics /> : <BuyerAnalytics />
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

const AppContent = () => {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Close sidebar when user logs out
    if (!user) {
      setSidebarOpen(false)
    }
  }, [user])

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  const handleCloseSidebar = () => setSidebarOpen(false)
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar onToggleSidebar={handleToggleSidebar} />
        {user && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={handleCloseSidebar}
          />
        )}
        <div className={user ? 'sm:ml-64' : ''}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/products" 
              element={
                <PrivateRoute>
                  <Products />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/products/:id" 
              element={
                <PrivateRoute>
                  <ProductDetails />
                </PrivateRoute>
              } 
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/products/add"
              element={
                <PrivateRoute allowedRoles={['farmer', 'admin']}>
                  <AddProduct />
                </PrivateRoute>
              }
            />
            <Route
              path="/products/edit/:id"
              element={
                <PrivateRoute allowedRoles={['farmer', 'admin']}>
                  <EditProduct />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <PrivateRoute>
                  <Orders />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders/request/:productId"
              element={
                <PrivateRoute allowedRoles={['buyer']}>
                  <OrderRequest />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              }
            />
            <Route
              path="/wishlists"
              element={
                <PrivateRoute allowedRoles={['buyer']}>
                  <Wishlists />
                </PrivateRoute>
              }
            />
            <Route
              path="/wishlists/share/:token"
              element={<Wishlists />}
            />
            <Route
              path="/notifications/preferences"
              element={
                <PrivateRoute>
                  <NotificationPreferences />
                </PrivateRoute>
              }
            />
            <Route
              path="/farmer/:id"
              element={<FarmerProfile />}
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute>
                  <AnalyticsRouter />
                </PrivateRoute>
              }
            />
            <Route
              path="/delivery-addresses"
              element={
                <PrivateRoute>
                  <DeliveryAddresses />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App

