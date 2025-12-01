import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import ChatWindow from '../components/ChatWindow'

const Messages = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchConversations()
    fetchUnreadCount()
    // Poll for new messages every 30 seconds
    const interval = setInterval(() => {
      fetchConversations()
      fetchUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Handle URL parameters for pre-selecting conversation
  useEffect(() => {
    const userId = searchParams.get('userId')
    const orderId = searchParams.get('orderId')
    const productId = searchParams.get('productId')

    if (userId) {
      // Wait for conversations to load first
      if (conversations.length > 0 || !loading) {
        // First check if conversation exists in the list
        const conversation = conversations.find(c => String(c.userId) === String(userId))
        if (conversation) {
          setSelectedConversation(conversation)
        } else {
          // Create a new conversation object if it doesn't exist
          fetchUserAndCreateConversation(userId, orderId, productId)
        }
      }
    }
  }, [searchParams, conversations, loading])

  const fetchConversations = async () => {
    try {
      const res = await axios.get('/api/messages/conversations')
      if (res.data.success) {
        setConversations(res.data.conversations)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/api/messages/unread-count')
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
    // Refresh conversations to update unread count
    fetchConversations()
    fetchUnreadCount()
  }

  const handleMessageSent = () => {
    fetchConversations()
    fetchUnreadCount()
  }

  const fetchUserAndCreateConversation = async (userId, orderId, productId) => {
    try {
      console.log('Fetching user for conversation:', userId, orderId, productId)
      const res = await axios.get(`/api/users/${userId}`)
      if (res.data.success) {
        const otherUser = res.data.user
        console.log('User fetched:', otherUser)
        
        // Fetch order and product details if provided
        let order = null
        let product = null
        
        if (orderId) {
          try {
            const orderRes = await axios.get(`/api/orders/${orderId}`)
            if (orderRes.data.success) {
              order = orderRes.data.order
              console.log('Order fetched:', order)
            }
          } catch (err) {
            console.error('Error fetching order:', err)
          }
        }
        
        if (productId) {
          try {
            const productRes = await axios.get(`/api/products/${productId}`)
            if (productRes.data.success) {
              product = productRes.data.product
              console.log('Product fetched:', product)
            }
          } catch (err) {
            console.error('Error fetching product:', err)
          }
        }
        
        const newConversation = {
          userId: String(otherUser.id),
          userName: otherUser.name,
          userEmail: otherUser.email,
          orderId: orderId || null,
          productId: productId || null,
          order: order,
          product: product,
          unreadCount: 0,
          lastMessage: {
            message: 'Start a new conversation',
            createdAt: new Date()
          }
        }
        
        console.log('Setting conversation:', newConversation)
        setSelectedConversation(newConversation)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      console.error('Error response:', error.response?.data)
      alert('Failed to load user information. Please try again.')
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Messages</h1>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Conversations
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No conversations yet</p>
                  <p className="text-sm mt-2">Start a conversation from an order or product page</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.userId}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      selectedConversation?.userId === conv.userId ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="font-semibold text-gray-900">{conv.userName}</h3>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.order && (
                          <p className="text-xs text-gray-500 mt-1">
                            Order: {conv.order.status}
                          </p>
                        )}
                        {conv.product && (
                          <p className="text-xs text-gray-500 mt-1">
                            Product: {conv.product.name}
                          </p>
                        )}
                        {conv.lastMessage && (
                          <>
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {conv.lastMessage.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(conv.lastMessage.createdAt).toLocaleString()}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col h-full">
            {selectedConversation && selectedConversation.userId ? (
              <ChatWindow
                key={selectedConversation.userId}
                conversation={selectedConversation}
                onMessageSent={handleMessageSent}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">Select a conversation to start messaging</p>
                  <p className="text-sm">Or start a new conversation from an order or product page</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Messages

