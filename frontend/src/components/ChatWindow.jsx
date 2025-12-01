import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const ChatWindow = ({ conversation, onMessageSent }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      fetchMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [conversation?.userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    if (!conversation?.userId) {
      console.log('No conversation userId, skipping fetch')
      setLoading(false)
      return
    }

    try {
      console.log('Fetching messages for userId:', conversation.userId)
      const res = await axios.get(`/api/messages/conversation/${conversation.userId}`)
      if (res.data.success) {
        console.log('Messages fetched:', res.data.messages?.length || 0)
        setMessages(res.data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      console.error('Error response:', error.response?.data)
      // If it's a 404 or no messages, set empty array
      if (error.response?.status === 404) {
        console.log('No messages found, starting new conversation')
      }
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !conversation?.userId) {
      console.log('Cannot send message:', { hasMessage: !!newMessage.trim(), sending, hasUserId: !!conversation?.userId })
      return
    }

    setSending(true)
    try {
      const messageData = {
        receiverId: String(conversation.userId),
        message: newMessage.trim(),
        subject: conversation.order ? `Re: Order ${conversation.order.id}` : null,
        orderId: conversation.orderId || null,
        productId: conversation.productId || null
      }

      console.log('Sending message:', messageData)
      const res = await axios.post('/api/messages', messageData)
      if (res.data.success) {
        console.log('Message sent successfully:', res.data.message)
        setMessages([...messages, res.data.message])
        setNewMessage('')
        if (onMessageSent) {
          onMessageSent()
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      console.error('Error response:', error.response?.data)
      alert(error.response?.data?.message || error.response?.data?.error || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (!conversation || !conversation.userId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No conversation selected</p>
          <p className="text-sm">Select a conversation from the list to start messaging</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{conversation.userName}</h3>
            {conversation.order && (
              <p className="text-sm text-gray-500">
                Order: {conversation.order.status}
              </p>
            )}
            {conversation.product && (
              <p className="text-sm text-gray-500">
                Product: {conversation.product.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderId === user.id
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {msg.sender?.name}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-green-100' : 'text-gray-400'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatWindow

