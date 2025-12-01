-- Manual fix for harvest_date column issue
-- Run these commands in your PostgreSQL database

-- Step 1: Make the column nullable (if it exists and is NOT NULL)
ALTER TABLE products ALTER COLUMN harvest_date DROP NOT NULL;

-- Step 2: Update all null values to current date
UPDATE products SET harvest_date = CURRENT_DATE WHERE harvest_date IS NULL;

-- Step 3: Make it NOT NULL again
ALTER TABLE products ALTER COLUMN harvest_date SET NOT NULL;

