# Farm Marketplace - Connect Farmers & Buyers

A full-stack web application that directly connects farmers with buyers, enabling farmers to list their produce and buyers to search, filter, and place orders.

## Features

### User Authentication
- Email/Phone login
- Password reset functionality
- Role-based access (Farmer, Buyer, Admin)

### Farmer Module
- Profile management with farm details
- Add/Edit/Delete product listings
- Upload product images (up to 5 per product)
- View and manage order requests
- Accept/Decline/Complete orders

### Product Listings
- Product details: Name, Category, Price, Quantity, Images
- Farm location and harvest date
- Quality notes and organic certification
- Search and filter by category, location, price range
- Product approval system (Admin)

### Order Request System
- Buyers can request orders from farmers
- Order status tracking: Pending → Confirmed → Completed
- Delivery address and contact information
- Order cancellation (Buyer/Farmer)

### Ratings & Reviews
- Buyers can rate farmers after order completion
- Product and farmer reviews
- Review approval system (Admin)

### Admin Dashboard
- User management
- Product approval
- Review moderation
- Statistics and analytics

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- bcryptjs for password hashing

### Frontend
- React 18
- React Router v6
- Axios for API calls
- Tailwind CSS for styling
- Vite as build tool

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/marketplace
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

4. Create uploads directory:
```bash
mkdir -p uploads/products
```

5. Start the server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Project Structure

```
marketplace/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── uploads/         # Uploaded images
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── App.jsx      # Main app component
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Farmer)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/farmer/my-products` - Get farmer's products

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order request (Buyer)
- `PUT /api/orders/:id/confirm` - Confirm order (Farmer)
- `PUT /api/orders/:id/decline` - Decline order (Farmer)
- `PUT /api/orders/:id/complete` - Complete order (Farmer)
- `PUT /api/orders/:id/cancel` - Cancel order (Buyer)

### Reviews
- `POST /api/reviews` - Create review (Buyer)
- `GET /api/reviews/product/:productId` - Get product reviews
- `GET /api/reviews/farmer/:farmerId` - Get farmer reviews

### Admin
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/products` - Get all products
- `PUT /api/admin/products/:id/approve` - Approve product
- `GET /api/admin/reviews` - Get all reviews
- `PUT /api/admin/reviews/:id/approve` - Approve review

## Usage

1. **Register/Login**: Create an account as a Farmer or Buyer
2. **Farmers**: 
   - Complete your profile with farm details
   - Add products with images and details
   - Manage incoming order requests
3. **Buyers**:
   - Browse and search products
   - Filter by category, location, price
   - Place order requests
   - Leave reviews after order completion
4. **Admin**:
   - Approve products and reviews
   - Manage users and content

## Notes

- Product images are stored in `backend/uploads/products/`
- Make sure MongoDB is running before starting the backend
- For production, update CORS settings and use environment variables
- Email functionality for password reset needs to be configured with nodemailer

## License

ISC

