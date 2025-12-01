import { createContext, useState, useEffect, useContext } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/auth/me')
      if (res.data.success && res.data.user) {
        setUser(res.data.user)
      } else {
        throw new Error('Invalid user data')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('token')
      setToken(null)
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, phone, password) => {
    try {
      console.log('Attempting login with:', { email, phone, hasPassword: !!password })
      const res = await axios.post('/api/auth/login', { email, phone, password })
      console.log('Login response:', res.data)
      
      if (res.data.success && res.data.token && res.data.user) {
        const { token: newToken, user: userData } = res.data
        localStorage.setItem('token', newToken)
        setToken(newToken)
        setUser(userData)
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        return { success: true }
      } else {
        console.error('Invalid login response structure:', res.data)
        return {
          success: false,
          message: res.data.message || 'Invalid response from server'
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      if (error.response) {
        // Server responded with error
        return {
          success: false,
          message: error.response.data?.message || error.response.data?.error || `Login failed: ${error.response.status} ${error.response.statusText}`
        }
      } else if (error.request) {
        // Request made but no response
        return {
          success: false,
          message: 'Unable to connect to server. Please check if the backend is running.'
        }
      } else {
        // Something else happened
        return {
          success: false,
          message: error.message || 'Login failed'
        }
      }
    }
  }

  const register = async (userData) => {
    try {
      const res = await axios.post('/api/auth/register', userData)
      const { token: newToken, user: newUser } = res.data
      localStorage.setItem('token', newToken)
      setToken(newToken)
      setUser(newUser)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    fetchUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

