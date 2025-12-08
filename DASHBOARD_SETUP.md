# Dashboard Setup Instructions

This guide will help you set up the personalized dashboard feature with all mental health resources.

## Features

- **Personalized Dashboard**: Each user gets their own dashboard after login
- **Pinned Resources**: Users can pin important resources to the top of their dashboard
- **Default Pinned Resource**: New users automatically have the 988 Suicide & Crisis Lifeline pinned
- **All Resources Available**: Access to all 20 mental health resources organized by category:
  - Crisis Hotlines (4 resources)
  - Therapy & Counseling (4 resources)
  - Support Groups (4 resources)
  - Education (4 resources)
  - Wellness Tools (4 resources)

## Database Setup

### Step 1: Populate Resources Database

Run the SQL script to populate your database with all resources and categories:

```bash
psql -U postgres -d project3 -f populate_resources.sql
```

Or if using a different database setup:

```bash
psql -h localhost -U your_username -d project3 -f populate_resources.sql
```

This script will:
1. Insert 5 resource categories
2. Insert 20 vetted mental health resources
3. Use `ON CONFLICT DO NOTHING` to avoid duplicates if run multiple times

### Step 2: Verify the Data

Check that resources were inserted correctly:

```sql
-- Check categories
SELECT * FROM categories;

-- Check resources
SELECT r.resourcename, c.categoryname
FROM resources r
JOIN categories c ON r.categoryid = c.categoryid
ORDER BY c.categoryid, r.resourcename;

-- Should see 5 categories and 20 resources
```

## How to Use

### For Users

1. **Register a New Account**: Go to `/register` and create an account
   - The 988 Suicide & Crisis Lifeline will be automatically pinned to your dashboard

2. **Login**: After registration, login at `/login`
   - You'll be redirected to your personalized dashboard at `/dashboard`

3. **Pin Resources**:
   - Click the pin icon (📌) on any resource to pin it to the top
   - Pinned resources appear in the highlighted "Pinned Resources" section
   - Click the pin again to unpin

4. **Browse All Resources**:
   - All resources are organized by category below the pinned section
   - Click "Call", "Text", or "Visit Site" to access each resource

5. **Logout**: Click "Logout" in the navigation to end your session

### For Developers

The implementation includes:

**Backend (`index.js`):**
- `requireAuth` middleware - Protects dashboard route
- `/dashboard` route - Loads user's pinned and all resources
- `/api/toggle-pin` route - Toggles pin status for a resource
- `/logout` route - Destroys session
- Auto-pins 988 hotline for new users during registration

**Frontend (`views/dashboard.ejs`):**
- Responsive dashboard layout
- Pinned resources section at the top (highlighted in yellow)
- All resources organized by category
- Interactive pin/unpin buttons
- Emergency banner with 988 crisis line
- User greeting and navigation

**Database Tables Used:**
- `users` - User accounts
- `resources` - All mental health resources
- `categories` - Resource categories
- `user_resource` - Stores user's pinned resources (via `favoritestatus` field)

## API Endpoints

### GET /dashboard
- **Protected**: Requires authentication
- **Returns**: Dashboard page with user's pinned and all resources
- **Session Required**: `req.session.isLoggedIn` must be true

### POST /api/toggle-pin
- **Protected**: Requires authentication
- **Body**: `{ "resourceId": 123 }`
- **Returns**: `{ "success": true, "isPinned": true/false }`
- **Action**: Toggles the `favoritestatus` in `user_resource` table

### GET /logout
- **Action**: Destroys session and redirects to home page

## Testing the Dashboard

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Register a new user:**
   - Go to `http://localhost:3000/register`
   - Fill in all required fields
   - Submit the form

3. **Login:**
   - You'll be redirected to `/login`
   - Enter your credentials
   - You should be redirected to `/dashboard`

4. **Test pinning:**
   - You should see the 988 Suicide & Crisis Lifeline already pinned
   - Try pinning other resources by clicking their pin icons
   - The page will reload and show your pinned resources at the top

5. **Test logout:**
   - Click "Logout" in the navigation
   - Try accessing `/dashboard` - you should be redirected to login

## Troubleshooting

### Resources not showing on dashboard
- Make sure you ran `populate_resources.sql`
- Check that `isvetted = true` for all resources
- Verify the database connection in `index.js`

### Can't pin resources
- Check browser console for JavaScript errors
- Verify `/api/toggle-pin` endpoint is working
- Make sure `express.json()` middleware is enabled

### Session issues / redirects to login
- Check that `express-session` is configured correctly
- Verify `SESSION_SECRET` is set in `.env`
- Make sure cookies are enabled in your browser

### 988 hotline not auto-pinned for new users
- Verify the resource name in database matches exactly: "988 Suicide & Crisis Lifeline"
- Check console logs during registration for errors
- Query `user_resource` table to see if the entry was created

## Future Enhancements

Potential features to add:
- Search/filter resources by keyword
- View count tracking (already in `user_resource.numviewed`)
- Resource ratings (already in `user_resource.rating`)
- User notes on resources
- Share resources with other users
- Admin panel to manage resources
- Email reminders for saved resources
- Mobile app version

## Database Schema Reference

```sql
-- Categories
CREATE TABLE categories (
    categoryid SERIAL PRIMARY KEY,
    categoryname VARCHAR(100),
    categorydescription TEXT
);

-- Resources
CREATE TABLE resources (
    resourceid SERIAL PRIMARY KEY,
    resourcename VARCHAR(200),
    resourceurl VARCHAR(500),
    resourcephone VARCHAR(50),
    resourcedesc TEXT,
    categoryid INTEGER REFERENCES categories(categoryid),
    submittedby_userid INTEGER REFERENCES users(userid),
    isvetted BOOLEAN DEFAULT false
);

-- User-Resource relationship
CREATE TABLE user_resource (
    userid INTEGER REFERENCES users(userid),
    resourceid INTEGER REFERENCES resources(resourceid),
    numviewed INTEGER DEFAULT 0,
    favoritestatus BOOLEAN DEFAULT false,
    rating INTEGER,
    PRIMARY KEY (userid, resourceid)
);
```

---

**Need Help?**
If you encounter any issues, check:
1. Database connection settings in `index.js`
2. Console logs for error messages
3. Browser developer console for frontend errors
4. PostgreSQL logs for database errors
