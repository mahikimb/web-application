# Stripe Payment Integration Setup Guide

## Overview
The marketplace now includes Stripe payment integration, allowing buyers to pay for confirmed orders securely.

## Setup Instructions

### 1. Get Stripe API Keys

1. Sign up for a Stripe account at https://stripe.com
2. Go to the Stripe Dashboard → Developers → API keys
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)
4. Copy your **Secret key** (starts with `sk_test_` for test mode)

### 2. Configure Backend Environment Variables

Add to `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Note:** For webhook setup, see section 4 below.

### 3. Configure Frontend Environment Variables

Create or update `frontend/.env`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

**Important:** After adding environment variables, restart both frontend and backend servers.

### 4. Webhook Setup (For Production)

Webhooks allow Stripe to notify your server about payment status changes.

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`) and add it to `backend/.env` as `STRIPE_WEBHOOK_SECRET`

**For production:**
- Go to Stripe Dashboard → Developers → Webhooks
- Add endpoint: `https://yourdomain.com/api/payments/webhook`
- Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy the webhook signing secret

### 5. Test Payment Flow

1. **Create a test order:**
   - As a buyer, browse products and create an order
   - Farmer confirms the order

2. **Make a payment:**
   - As a buyer, go to Orders page
   - Click "Pay Now" on a confirmed order
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC (e.g., 123)
   - Any ZIP code (e.g., 12345)

3. **Verify payment:**
   - Payment status should update to "succeeded"
   - Order should show payment confirmation

## Features

- ✅ Secure payment processing with Stripe
- ✅ Payment status tracking (pending, processing, succeeded, failed, refunded)
- ✅ Payment form with Stripe Elements
- ✅ Webhook support for automatic payment status updates
- ✅ Payment history in order details
- ✅ Only buyers can pay for their confirmed orders

## Payment Flow

1. Buyer creates an order → Order status: `pending`
2. Farmer confirms order → Order status: `confirmed`, Payment status: `pending`
3. Buyer clicks "Pay Now" → Payment form appears
4. Buyer enters card details → Payment intent created
5. Payment processed → Payment status: `succeeded`
6. Order can be completed by farmer

## Troubleshooting

### Payment form not showing
- Check that `VITE_STRIPE_PUBLISHABLE_KEY` is set in `frontend/.env`
- Restart frontend server after adding env variable

### Payment fails
- Check backend logs for errors
- Verify `STRIPE_SECRET_KEY` is set correctly
- Ensure you're using test keys in development

### Webhook not working
- Verify webhook secret is correct
- Check that webhook endpoint is accessible
- Use Stripe CLI for local testing

## Security Notes

- Never commit `.env` files to version control
- Use test keys for development
- Switch to live keys only in production
- Keep webhook secrets secure
- Stripe handles all sensitive card data (PCI compliant)

