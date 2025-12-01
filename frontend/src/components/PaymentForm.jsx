import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import axios from 'axios'

// Initialize Stripe - Use Vite env variable format
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QJxXx...')

const PaymentFormContent = ({ orderId, orderTotal, onSuccess, onCancel }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        setLoading(true)
        const res = await axios.post('/api/payments/create-intent', { orderId })
        if (res.data.success) {
          setClientSecret(res.data.clientSecret)
        } else {
          setError(res.data.message || 'Failed to initialize payment')
        }
      } catch (err) {
        console.error('Error creating payment intent:', err)
        setError(err.response?.data?.message || 'Failed to initialize payment')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      createPaymentIntent()
    }
  }, [orderId])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please wait...')
      return
    }

    setProcessing(true)
    setError('')

    const cardElement = elements.getElement(CardElement)

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              // You can add billing details here if needed
            }
          }
        }
      )

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
        setProcessing(false)
        return
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        try {
          const res = await axios.post('/api/payments/confirm', {
            paymentIntentId: paymentIntent.id,
            orderId
          })

          if (res.data.success) {
            onSuccess(res.data.order)
          } else {
            setError(res.data.message || 'Failed to confirm payment')
          }
        } catch (err) {
          console.error('Error confirming payment:', err)
          setError(err.response?.data?.message || 'Failed to confirm payment')
        }
      } else {
        setError(`Payment status: ${paymentIntent.status}`)
      }
    } catch (err) {
      console.error('Error processing payment:', err)
      setError('An error occurred while processing your payment')
    } finally {
      setProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#9e2146'
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600">Initializing payment...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div className="border border-gray-300 rounded-md p-3 bg-white">
            <CardElement options={cardElementOptions} />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Total Amount:</span>
          <span className="text-2xl font-bold text-green-600">${orderTotal}</span>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing || !clientSecret}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : `Pay $${orderTotal}`}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Your payment is secure and encrypted. We use Stripe to process payments.
      </p>
    </form>
  )
}

const PaymentForm = ({ orderId, orderTotal, onSuccess, onCancel }) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent
        orderId={orderId}
        orderTotal={orderTotal}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}

export default PaymentForm

