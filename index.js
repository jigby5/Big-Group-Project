// Load environment variables from .env file into memory
// Allows you to use process.env
require('dotenv').config();

const express = require("express");

//Needed for the session variable - Stored on the server to hold data
const session = require("express-session");

// Allows you to read the body of incoming HTTP requests and makes that data available on req.body
let bodyParser = require("body-parser");

let path = require("path");

// defines app (the whole page) as an express object
let app = express();

// Use EJS for the web pages - requires a views folder and all files are .ejs
app.set("view engine", "ejs");

// process.env.PORT is when you deploy and 3000 is for test
const port = process.env.PORT || 3000;

// provides session security 
app.use(
    session(
        {
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
        }
    )
); 

const knex = require("knex")({
    client: "pg",
    connection: {
        host : process.env.RDS_HOSTNAME || "localhost",
        user : process.env.RDS_USERNAME || "postgres",
        password : process.env.RDS_PASSWORD || "admin",
        database : process.env.RDS_DB_NAME || "project3",
        port : process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
}); // defines the connection to the PostgreSQL database that I setup the project table on

// tells the express object how to read form data through a request (req)
app.use(express.urlencoded({extended: true}));
app.use(express.json()); // for parsing JSON in API requests

// tells where to find the linked styles sheet and other assets
app.use(express.static(path.join(__dirname, 'public')))

app.listen(port, () => {
    console.log("The server is listening 😎");
});

const bcrypt = require('bcrypt');

// Authentication middleware to protect routes
const requireAuth = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Manager/Admin middleware to protect manager routes
const requireManager = (req, res, next) => {
    if (req.session.isLoggedIn && req.session.level === 'M') {
        next();
    } else {
        res.status(403).send('Access denied. Manager privileges required.');
    }
};

// Manager-only middleware (excludes admins from user role management)
const requireManagerOnly = (req, res, next) => {
    if (req.session.isLoggedIn && req.session.level === 'M' && req.session.roleid === 2) {
        next();
    } else {
        res.status(403).send('Access denied. This page is only accessible to Managers.');
    }
};

app.post("/login", (req, res) => {
    let sName = req.body.username;
    let sPassword = req.body.password; // This is the plaintext password the user submitted

    // 1. Fetch only the user data needed for authentication and session
    knex.select("password", "level", "roleid")
    .from('users')
    .where("username", sName)
    .first() // Use .first() since username should be unique, retrieving a single user or null
    .then(user => {
      // 2. Check if a user was found at all
      if (!user) {
        // No user with that username exists
        return res.render("login", { error_message: "Invalid username or password" });
      }

      // 3. Compare the plaintext password against the stored hash
      // The stored hash is in user.password
      bcrypt.compare(sPassword, user.password, (err, isMatch) => {
        if (err) {
          // Handle bcrypt error (e.g., hash is malformed)
          console.error("Bcrypt comparison error:", err);
          return res.render("login", { error_message: "An internal authentication error occurred." });
        }

        // 4. Check if the passwords matched
        if (isMatch) {
          // Passwords match! Authentication successful.
          const sLevel = user.level;
          req.session.isLoggedIn = true;
          req.session.username = sName;
          req.session.level = sLevel; // Set the level for manager checks
          req.session.roleid = user.roleid; // Store roleid to distinguish manager from admin

          res.redirect("/dashboard");
        } else {
          // Passwords do NOT match.
          // Note: It's best practice to give a generic error message
          // so attackers can't tell if the username or password was wrong.
          res.render("login", { error_message: "Invalid username or password" });
        }
      });
    })
    .catch(err => {
      console.error("Database or general login error:", err);
      // In case of a database connectivity issue or other unexpected error
      res.render("login", { error_message: "Could not process login request." });
    });
});

app.get("/", (req, res) => { // get request that is run on start (which is what the "/" does)
    res.render("index", {
        isLoggedIn: req.session.isLoggedIn || false,
        username: req.session.username || null,
        userLevel: req.session.level || null,
        userRoleId: req.session.roleid || null
    });
});

app.get("/login", (req, res) => { // get request that is run with any a tags to login.ejs
    res.render("login", { error_message: null });
});

app.get("/register", (req, res) => { // get request that is run with any a tags to register.ejs
    res.render("register")
});

const saltRounds = 10; // tells bcrypt how complicated to make the encryption.

app.post("/register", (req, res) => {
    // 1. Extract all required fields from the request body
    const { username, password, email, level, phone } = req.body; 

    // Basic validation
    if (!username || !password || !email || !level || !phone) {
        return res.status(400).render("register", { 
            error_message: "Please fill in all required fields." 
        });
    }

    // 2. Hash the plaintext password before database insertion
    // Use an error-first callback pattern
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.status(500).render("register", { 
                error_message: "Server error during registration. Please try again." 
            });
        }

        // 3. Create the data object using the HASHED password
        const newUser = {
            username: username,
            // Store the HASHED password (must be VARCHAR(60) or TEXT in DB)
            password: hashedPassword, 
            email: email,
            level: level, 
            phone: phone 
        };

        // 4. Insert the user into the database using Knex
        knex("users")
            .insert(newUser)
            .then(async (result) => {
                // Success: Get the new user's ID and add default pinned resources
                console.log(`New user successfully registered: ${username}`);

                // Get the newly created user's ID
                const newlyCreatedUser = await knex('users')
                    .select('userid')
                    .where('username', username)
                    .first();

                if (newlyCreatedUser) {
                    // Get the 988 Suicide & Crisis Lifeline resource ID
                    const crisisResource = await knex('resources')
                        .select('resourceid')
                        .where('resourcename', '988 Suicide & Crisis Lifeline')
                        .first();

                    if (crisisResource) {
                        // Pin the crisis hotline by default for the new user
                        await knex('user_resource').insert({
                            userid: newlyCreatedUser.userid,
                            resourceid: crisisResource.resourceid,
                            numviewed: 0,
                            favoritestatus: true,
                            rating: null
                        });
                    }
                }

                res.redirect("/login");
            })
            .catch((dbErr) => {
                // Handle common database errors (e.g., unique constraint violation)
                console.error("Error inserting user:", dbErr.message);

                let errorMessage = "Registration failed. That username or email may already be taken.";

                // Render the form again with the error message
                res.status(500).render("register", { error_message: errorMessage });
            });
    });
});

// Dashboard route - protected by authentication
app.get("/dashboard", requireAuth, async (req, res) => {
    try {
        const username = req.session.username;

        // Get user ID
        const user = await knex('users')
            .select('userid')
            .where('username', username)
            .first();

        if (!user) {
            return res.redirect('/login');
        }

        // Get all vetted resources with categories
        const allResources = await knex('resources')
            .select(
                'resources.*',
                'categories.categoryname',
                'categories.categorydescription'
            )
            .leftJoin('categories', 'resources.categoryid', 'categories.categoryid')
            .where('resources.isvetted', true)
            .orderBy('categories.categoryid')
            .orderBy('resources.resourcename');

        // Get user's custom resources
        const customResources = await knex('resources')
            .select('resources.*')
            .where('resources.submittedby_userid', user.userid)
            .orderBy('resources.resourcename');

        // Get user's pinned resources
        const pinnedResourceIds = await knex('user_resource')
            .select('resourceid')
            .where('userid', user.userid)
            .where('favoritestatus', true);

        const pinnedIds = new Set(pinnedResourceIds.map(r => r.resourceid));

        // Separate pinned and unpinned resources
        const pinnedResources = allResources.filter(r => pinnedIds.has(r.resourceid));
        const unpinnedResources = allResources.filter(r => !pinnedIds.has(r.resourceid));

        // Group resources by category
        const categories = {};
        allResources.forEach(resource => {
            const catName = resource.categoryname || 'Uncategorized';
            if (!categories[catName]) {
                categories[catName] = [];
            }
            categories[catName].push({
                ...resource,
                isPinned: pinnedIds.has(resource.resourceid)
            });
        });

        res.render("dashboard", {
            username: username,
            userLevel: req.session.level,
            userRoleId: req.session.roleid,
            pinnedResources: pinnedResources,
            customResources: customResources,
            allResources: allResources,
            categories: categories,
            pinnedIds: Array.from(pinnedIds)
        });
    } catch (err) {
        console.error("Error loading dashboard:", err);
        res.status(500).send("Error loading dashboard");
    }
});

// API endpoint to toggle pin status
app.post("/api/toggle-pin", requireAuth, async (req, res) => {
    try {
        const username = req.session.username;
        const { resourceId } = req.body;

        if (!resourceId) {
            return res.status(400).json({ error: "Resource ID is required" });
        }

        // Get user ID
        const user = await knex('users')
            .select('userid')
            .where('username', username)
            .first();

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // Check if user_resource entry exists
        const existingEntry = await knex('user_resource')
            .where('userid', user.userid)
            .where('resourceid', resourceId)
            .first();

        if (existingEntry) {
            // Toggle the favorite status
            await knex('user_resource')
                .where('userid', user.userid)
                .where('resourceid', resourceId)
                .update({ favoritestatus: !existingEntry.favoritestatus });

            res.json({
                success: true,
                isPinned: !existingEntry.favoritestatus
            });
        } else {
            // Create new entry with pinned status
            await knex('user_resource').insert({
                userid: user.userid,
                resourceid: resourceId,
                numviewed: 0,
                favoritestatus: true,
                rating: null
            });

            res.json({
                success: true,
                isPinned: true
            });
        }
    } catch (err) {
        console.error("Error toggling pin:", err);
        res.status(500).json({ error: "Failed to toggle pin" });
    }
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        }
        res.redirect("/");
    });
});

// Profile page - view and edit user info
app.get("/profile", requireAuth, async (req, res) => {
    try {
        const username = req.session.username;

        // Get user info
        const user = await knex('users')
            .select('userid', 'username', 'email', 'phone', 'level')
            .where('username', username)
            .first();

        if (!user) {
            return res.redirect('/login');
        }

        res.render("profile", {
            username: username,
            user: user,
            success_message: null,
            error_message: null
        });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Error loading profile");
    }
});

// Update profile
app.post("/profile", requireAuth, async (req, res) => {
    try {
        const username = req.session.username;
        const { email, phone } = req.body;

        // Validate inputs
        if (!email || !phone) {
            const user = await knex('users')
                .select('userid', 'username', 'email', 'phone', 'level')
                .where('username', username)
                .first();

            return res.render("profile", {
                username: username,
                user: user,
                success_message: null,
                error_message: "Please fill in all fields."
            });
        }

        // Update user info
        await knex('users')
            .where('username', username)
            .update({
                email: email,
                phone: phone
            });

        // Get updated user info
        const user = await knex('users')
            .select('userid', 'username', 'email', 'phone', 'level')
            .where('username', username)
            .first();

        res.render("profile", {
            username: username,
            user: user,
            success_message: "Profile updated successfully!",
            error_message: null
        });
    } catch (err) {
        console.error("Error updating profile:", err);

        const user = await knex('users')
            .select('userid', 'username', 'email', 'phone', 'level')
            .where('username', username)
            .first();

        res.render("profile", {
            username: username,
            user: user,
            success_message: null,
            error_message: "Failed to update profile. Please try again."
        });
    }
});

// Add custom resource
app.post("/api/add-resource", requireAuth, async (req, res) => {
    try {
        const username = req.session.username;
        const { resourceName, resourceUrl, resourceDesc } = req.body;

        // Validate inputs
        if (!resourceName || !resourceUrl) {
            return res.status(400).json({
                error: "Resource name and URL are required"
            });
        }

        // Get user ID
        const user = await knex('users')
            .select('userid')
            .where('username', username)
            .first();

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // Insert the custom resource
        const [newResource] = await knex('resources')
            .insert({
                resourcename: resourceName,
                resourceurl: resourceUrl,
                resourcedesc: resourceDesc || 'Custom resource added by user',
                submittedby_userid: user.userid,
                isvetted: false,
                categoryid: null,
                resourcephone: null
            })
            .returning('resourceid');

        // Automatically pin the new resource
        await knex('user_resource').insert({
            userid: user.userid,
            resourceid: newResource.resourceid || newResource,
            numviewed: 0,
            favoritestatus: true,
            rating: null
        });

        res.json({
            success: true,
            message: "Resource added and pinned successfully!",
            resourceId: newResource.resourceid || newResource
        });
    } catch (err) {
        console.error("Error adding resource:", err);
        res.status(500).json({ error: "Failed to add resource" });
    }
});

// Delete custom resource
app.post("/api/delete-resource", requireAuth, async (req, res) => {
    try {
        const username = req.session.username;
        const { resourceId } = req.body;

        if (!resourceId) {
            return res.status(400).json({ error: "Resource ID is required" });
        }

        // Get user ID
        const user = await knex('users')
            .select('userid')
            .where('username', username)
            .first();

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // Check if resource was submitted by this user
        const resource = await knex('resources')
            .where('resourceid', resourceId)
            .where('submittedby_userid', user.userid)
            .first();

        if (!resource) {
            return res.status(403).json({
                error: "You can only delete resources you created"
            });
        }

        // Delete the resource
        await knex('resources')
            .where('resourceid', resourceId)
            .delete();

        res.json({
            success: true,
            message: "Resource deleted successfully!"
        });
    } catch (err) {
        console.error("Error deleting resource:", err);
        res.status(500).json({ error: "Failed to delete resource" });
    }
});

// Edit custom resource
app.post("/api/edit-resource", requireAuth, async (req, res) => {
    try {
        const username = req.session.username;
        const { resourceId, resourceName, resourceUrl, resourceDesc } = req.body;

        if (!resourceId || !resourceName || !resourceUrl) {
            return res.status(400).json({
                error: "Resource ID, name, and URL are required"
            });
        }

        // Get user ID
        const user = await knex('users')
            .select('userid')
            .where('username', username)
            .first();

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // Check if resource was submitted by this user
        const resource = await knex('resources')
            .where('resourceid', resourceId)
            .where('submittedby_userid', user.userid)
            .first();

        if (!resource) {
            return res.status(403).json({
                error: "You can only edit resources you created"
            });
        }

        // Update the resource
        await knex('resources')
            .where('resourceid', resourceId)
            .update({
                resourcename: resourceName,
                resourceurl: resourceUrl,
                resourcedesc: resourceDesc || `Custom resource: ${resourceName}`
            });

        res.json({
            success: true,
            message: "Resource updated successfully!"
        });
    } catch (err) {
        console.error("Error editing resource:", err);
        res.status(500).json({ error: "Failed to edit resource" });
    }
});

// ========================================
// ADMIN ROUTES
// ========================================

// Admin page - Edit vetted resources on main page
app.get("/admin", requireManager, async (req, res) => {
    try {
        const username = req.session.username;

        // Get all vetted resources
        const vettedResources = await knex('resources')
            .leftJoin('categories', 'resources.categoryid', 'categories.categoryid')
            .select(
                'resources.*',
                'categories.categoryname'
            )
            .where('resources.isvetted', true)
            .orderBy('resources.resourceid');

        res.render("admin", {
            username,
            vettedResources,
            userLevel: req.session.level,
            userRoleId: req.session.roleid,
            success_message: req.session.success_message || null,
            error_message: req.session.error_message || null
        });

        delete req.session.success_message;
        delete req.session.error_message;
    } catch (err) {
        console.error("Error loading admin page:", err);
        res.status(500).send("Error loading admin page");
    }
});

// Admin API - Edit vetted resource
app.post("/api/admin/edit-resource", requireManager, async (req, res) => {
    try {
        const { resourceId, resourceName, resourceUrl, resourcePhone, resourceDesc, categoryId } = req.body;

        await knex('resources')
            .where('resourceid', resourceId)
            .where('isvetted', true)
            .update({
                resourcename: resourceName,
                resourceurl: resourceUrl || null,
                resourcephone: resourcePhone || null,
                resourcedesc: resourceDesc,
                categoryid: categoryId
            });

        res.json({
            success: true,
            message: "Resource updated successfully!"
        });
    } catch (err) {
        console.error("Error editing vetted resource:", err);
        res.status(500).json({ error: "Failed to edit resource" });
    }
});

// Admin API - Delete vetted resource
app.post("/api/admin/delete-resource", requireManager, async (req, res) => {
    try {
        const { resourceId } = req.body;

        await knex('resources')
            .where('resourceid', resourceId)
            .where('isvetted', true)
            .del();

        res.json({
            success: true,
            message: "Resource deleted successfully!"
        });
    } catch (err) {
        console.error("Error deleting vetted resource:", err);
        res.status(500).json({ error: "Failed to delete resource" });
    }
});

// Admin API - Add new vetted resource
app.post("/api/admin/add-resource", requireManager, async (req, res) => {
    try {
        const { resourceName, resourceUrl, resourcePhone, resourceDesc, categoryId } = req.body;

        await knex('resources').insert({
            resourcename: resourceName,
            resourceurl: resourceUrl || null,
            resourcephone: resourcePhone || null,
            resourcedesc: resourceDesc,
            categoryid: categoryId,
            isvetted: true,
            submittedby_userid: null
        });

        res.json({
            success: true,
            message: "Resource added successfully!"
        });
    } catch (err) {
        console.error("Error adding vetted resource:", err);
        res.status(500).json({ error: "Failed to add resource" });
    }
});

// ========================================
// MANAGER ROUTES
// ========================================

// Manager page - Manage user roles
app.get("/manager", requireManagerOnly, async (req, res) => {
    try {
        const username = req.session.username;

        // Get all users with their roles
        const users = await knex('users')
            .leftJoin('roles', 'users.roleid', 'roles.roleid')
            .select(
                'users.userid',
                'users.username',
                'users.email',
                'users.level',
                'users.phone',
                'roles.rolename'
            )
            .orderBy('users.userid');

        // Get all roles
        const roles = await knex('roles').select('*');

        res.render("manager", {
            username,
            users,
            roles,
            userLevel: req.session.level,
            userRoleId: req.session.roleid,
            success_message: req.session.success_message || null,
            error_message: req.session.error_message || null
        });

        delete req.session.success_message;
        delete req.session.error_message;
    } catch (err) {
        console.error("Error loading manager page:", err);
        res.status(500).send("Error loading manager page");
    }
});

// Manager API - Update user role
app.post("/api/manager/update-role", requireManagerOnly, async (req, res) => {
    try {
        const { userId, level, roleId } = req.body;

        await knex('users')
            .where('userid', userId)
            .update({
                level: level,
                roleid: roleId
            });

        res.json({
            success: true,
            message: "User role updated successfully!"
        });
    } catch (err) {
        console.error("Error updating user role:", err);
        res.status(500).json({ error: "Failed to update user role" });
    }
});