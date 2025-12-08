# Database Setup Fix

## Problem
The registration isn't working because the database tables either:
1. Don't exist yet, OR
2. Use different column names than the code expects

## Solution - Run These Commands in Order

### Option 1: Using psql Command Line

Open your terminal/command prompt and run these commands:

```bash
# Step 1: Connect to PostgreSQL and create database (if it doesn't exist)
psql -U postgres
CREATE DATABASE project3;
\q

# Step 2: Run the schema setup script
psql -U postgres -d project3 -f setup_database.sql

# Step 3: Populate with resources
psql -U postgres -d project3 -f populate_resources.sql
```

### Option 2: Using pgAdmin GUI

1. Open **pgAdmin**
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → **Create** → **Database**
   - Database name: `project3`
   - Click **Save**

4. Click on the `project3` database
5. Click **Tools** → **Query Tool**
6. Open the file `setup_database.sql` in a text editor
7. Copy all the SQL code
8. Paste it into the Query Tool
9. Click the **Execute/Run** button (⚡ or F5)

10. After that succeeds, do the same for `populate_resources.sql`:
    - Open `populate_resources.sql` in a text editor
    - Copy all the SQL code
    - Paste into Query Tool
    - Click Execute

### Step 3: Verify the Setup

Run this query in pgAdmin or psql to verify everything was created:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- categories
-- resources
-- roles
-- user_resource
-- users

-- Check column names in users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users';

-- Should see: userid (not id), username, password, email, level, phone, roleid
```

## Quick Test After Setup

1. **Restart your server** (if it's running):
   - Press `Ctrl+C` in the terminal where the server is running
   - Run `npm start` again

2. **Try to register a new user**:
   - Go to `http://localhost:3000/register`
   - Fill in all fields:
     - Username: `testuser`
     - Password: `password123`
     - Email: `test@example.com`
     - Level: `U` (for regular user)
     - Phone: `1234567890`
   - Click **Register**

3. **If successful**:
   - You'll be redirected to the login page
   - Login with your username and password
   - You'll be redirected to your dashboard
   - The 988 Suicide & Crisis Lifeline should already be pinned!

## Troubleshooting

### Error: "relation 'users' does not exist"
**Solution**: Run `setup_database.sql` first

### Error: "column 'userid' does not exist"
**Solution**: Your users table has `id` instead of `userid`. You need to either:
- Drop and recreate the table using `setup_database.sql`, OR
- Rename the column:
  ```sql
  ALTER TABLE users RENAME COLUMN id TO userid;
  ```

### Error: "relation 'categories' does not exist"
**Solution**: Run `setup_database.sql` - it creates all required tables

### Error: "relation 'resources' does not exist"
**Solution**: Run `setup_database.sql` first, then `populate_resources.sql`

### Error: "relation 'user_resource' does not exist"
**Solution**: Run `setup_database.sql`

### Server won't start
**Solution**:
1. Check your `.env` file has the correct password: `Provomission2022!`
2. Make sure PostgreSQL is running
3. Make sure database `project3` exists

### Can't connect to database
**Solution**: Verify your `.env` file:
```env
RDS_HOSTNAME=localhost
RDS_USERNAME=postgres
RDS_PASSWORD=Provomission2022!
RDS_DB_NAME=project3
RDS_PORT=5432
```

## What Each File Does

- **setup_database.sql** - Creates all tables with correct column names
- **populate_resources.sql** - Adds 20 mental health resources to the database
- **index.js** - Your Express server with all routes
- **.env** - Database credentials (already configured with your password)

## Next Steps After Database Setup

Once registration works:
1. Create a few test user accounts
2. Login and test the dashboard
3. Try pinning and unpinning resources
4. Test the logout functionality
5. Add more resources through the database if needed
