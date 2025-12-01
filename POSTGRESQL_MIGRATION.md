# PostgreSQL Migration Guide

The backend has been migrated from MongoDB to PostgreSQL using Sequelize ORM.

## Setup Instructions

1. **Install PostgreSQL dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Create a PostgreSQL database:**
   ```sql
   CREATE DATABASE marketplace;
   ```

3. **Update `.env` file:**
   ```env
   PORT=5000
   DB_NAME=marketplace
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

4. **Run the server:**
   The models will automatically sync and create tables on first run.

## Key Changes

- **Models**: Converted from Mongoose to Sequelize
- **Queries**: Changed from MongoDB query syntax to Sequelize
- **IDs**: Changed from `_id` to `id` (UUID)
- **Relationships**: Defined using Sequelize associations

## Remaining Route Updates Needed

The following route files still need to be updated:
- `backend/routes/orders.js`
- `backend/routes/reviews.js`
- `backend/routes/users.js`
- `backend/routes/admin.js`

These will be updated in the next steps.

